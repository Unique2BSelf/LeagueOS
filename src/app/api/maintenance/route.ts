import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

async function getActor(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      fullName: true,
      role: true,
      isActive: true,
    },
  });
}

function canManage(role: string) {
  return role === 'ADMIN' || role === 'MODERATOR';
}

async function serializeLog(log: any) {
  return {
    id: log.id,
    fieldId: log.fieldId,
    fieldName: log.field.name,
    locationName: log.field.location?.name || null,
    issue: log.issue,
    status: log.status,
    priority: log.priority,
    notes: log.notes,
    reportedBy: log.reportedBy,
    resolvedAt: log.resolvedAt?.toISOString() || null,
    createdAt: log.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActor(request);
  if (!actor || !actor.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fieldId = searchParams.get('fieldId');
  const status = searchParams.get('status');

  const logs = await prisma.maintenanceLog.findMany({
    where: {
      ...(fieldId ? { fieldId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      field: {
        include: {
          location: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const serialized = await Promise.all(logs.map(serializeLog));
  const stats = {
    open: serialized.filter((log) => log.status === 'OPEN').length,
    inProgress: serialized.filter((log) => log.status === 'IN_PROGRESS').length,
    resolved: serialized.filter((log) => log.status === 'RESOLVED').length,
    urgent: serialized.filter((log) => log.priority === 'URGENT' && log.status !== 'RESOLVED').length,
  };

  const byField = serialized.reduce((acc, log) => {
    if (!acc[log.fieldId]) {
      acc[log.fieldId] = [];
    }
    acc[log.fieldId].push(log);
    return acc;
  }, {} as Record<string, typeof serialized>);

  return NextResponse.json({
    logs: serialized,
    stats,
    byField,
    count: serialized.length,
  });
}

export async function POST(request: NextRequest) {
  const actor = await getActor(request);
  if (!actor || !actor.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = typeof body.action === 'string' ? body.action : '';

    if (action === 'log') {
      const fieldId = typeof body.fieldId === 'string' ? body.fieldId : '';
      const issue = typeof body.issue === 'string' ? body.issue.trim() : '';
      const priority = typeof body.priority === 'string' ? body.priority.toUpperCase() : 'MEDIUM';
      const notes = typeof body.notes === 'string' ? body.notes.trim() : null;

      if (!fieldId || !issue) {
        return NextResponse.json({ error: 'fieldId and issue required' }, { status: 400 });
      }

      const created = await prisma.maintenanceLog.create({
        data: {
          fieldId,
          issue,
          priority,
          status: 'OPEN',
          notes,
          reportedBy: actor.fullName,
        },
        include: {
          field: {
            include: {
              location: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        log: await serializeLog(created),
        message: 'Maintenance issue logged',
      }, { status: 201 });
    }

    if (action === 'update' || action === 'resolve') {
      if (!canManage(actor.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const logId = typeof body.logId === 'string' ? body.logId : '';
      if (!logId) {
        return NextResponse.json({ error: 'logId required' }, { status: 400 });
      }

      const nextStatus = action === 'resolve'
        ? 'RESOLVED'
        : (typeof body.status === 'string' ? body.status.toUpperCase() : '');
      if (!nextStatus) {
        return NextResponse.json({ error: 'status required' }, { status: 400 });
      }

      const updated = await prisma.maintenanceLog.update({
        where: { id: logId },
        data: {
          status: nextStatus,
          notes: typeof body.notes === 'string' ? body.notes.trim() : undefined,
          priority: typeof body.priority === 'string' ? body.priority.toUpperCase() : undefined,
          resolvedAt: nextStatus === 'RESOLVED' ? new Date() : null,
        },
        include: {
          field: {
            include: {
              location: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        log: await serializeLog(updated),
        message: nextStatus === 'RESOLVED' ? 'Issue resolved' : 'Log updated',
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use: log, update, resolve' }, { status: 400 });
  } catch (error) {
    console.error('Maintenance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const actor = await getActor(request);
  if (!actor || !actor.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get('action') !== 'fields') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const fields = await prisma.field.findMany({
    include: {
      location: true,
      maintenance: {
        where: {
          status: { not: 'RESOLVED' },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [
      { location: { name: 'asc' } },
      { name: 'asc' },
    ],
  });

  return NextResponse.json({
    fields: fields.map((field) => ({
      id: field.id,
      name: field.name,
      location: field.location.name,
      status: field.maintenance.length > 0 ? 'MAINTENANCE' : 'OPEN',
    })),
  });
}
