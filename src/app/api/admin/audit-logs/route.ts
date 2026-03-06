import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminActor } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const actorUserId = searchParams.get('actorUserId');
    const actionType = searchParams.get('actionType');
    const entityType = searchParams.get('entityType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: Record<string, unknown> = {};
    if (actorUserId) where.actorUserId = actorUserId;
    if (actionType) where.actionType = actionType;
    if (entityType) where.entityType = entityType;
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        actorUserId: log.actorUserId,
        actorEmail: log.actorEmail,
        actionType: log.actionType,
        entityType: log.entityType,
        entityId: log.entityId,
        before: log.before,
        after: log.after,
        notes: log.notes,
        createdAt: log.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
