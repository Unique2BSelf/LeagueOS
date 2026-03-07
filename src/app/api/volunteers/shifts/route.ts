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

async function serializeShift(shift: any) {
  return {
    id: shift.id,
    userId: shift.userId,
    userName: shift.user?.fullName || null,
    eventId: shift.eventId,
    eventName: shift.eventName || 'Volunteer Event',
    role: shift.role,
    date: shift.date?.toISOString().slice(0, 10) || null,
    startTime: shift.startTime,
    endTime: shift.endTime,
    hours: shift.hours ?? 0,
    status: shift.status,
    notes: shift.notes,
    createdAt: shift.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const actor = await getActor(request);
  if (!actor || !actor.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const eventId = searchParams.get('eventId');
  const status = searchParams.get('status');

  if (userId && userId !== actor.id && !canManage(actor.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const shifts = await prisma.volunteerShift.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(eventId ? { eventId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      user: {
        select: {
          fullName: true,
        },
      },
    },
    orderBy: [
      { date: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  const serialized = await Promise.all(shifts.map(serializeShift));
  const grouped = {
    open: serialized.filter((shift) => shift.status === 'OPEN'),
    assigned: serialized.filter((shift) => shift.status === 'ASSIGNED'),
    confirmed: serialized.filter((shift) => shift.status === 'CONFIRMED'),
    completed: serialized.filter((shift) => shift.status === 'COMPLETED'),
  };

  const totalHours = serialized
    .filter((shift) => shift.status === 'COMPLETED')
    .reduce((sum, shift) => sum + (shift.hours || 0), 0);

  return NextResponse.json({
    shifts: serialized,
    grouped,
    totalHours,
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

    if (action === 'signup') {
      const shiftId = typeof body.shiftId === 'string' ? body.shiftId : '';

      if (shiftId) {
        const existing = await prisma.volunteerShift.findUnique({ where: { id: shiftId } });
        if (!existing) {
          return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
        }
        if (existing.userId && existing.userId !== actor.id) {
          return NextResponse.json({ error: 'Shift is already assigned' }, { status: 409 });
        }

        const updated = await prisma.volunteerShift.update({
          where: { id: shiftId },
          data: {
            userId: actor.id,
            status: 'ASSIGNED',
          },
          include: {
            user: { select: { fullName: true } },
          },
        });

        return NextResponse.json({
          success: true,
          shift: await serializeShift(updated),
          message: `Successfully signed up for ${updated.role} shift`,
        });
      }

      const eventId = typeof body.eventId === 'string' ? body.eventId : '';
      const role = typeof body.role === 'string' ? body.role : '';
      const date = typeof body.date === 'string' && body.date ? new Date(body.date) : null;
      const hours = typeof body.hours === 'number' ? body.hours : null;

      if (!eventId || !role || !date) {
        return NextResponse.json({ error: 'eventId, role, and date required' }, { status: 400 });
      }

      const created = await prisma.volunteerShift.create({
        data: {
          userId: actor.id,
          eventId,
          eventName: typeof body.eventName === 'string' ? body.eventName : null,
          role,
          date,
          startTime: typeof body.startTime === 'string' ? body.startTime : null,
          endTime: typeof body.endTime === 'string' ? body.endTime : null,
          hours,
          status: 'ASSIGNED',
          notes: typeof body.notes === 'string' ? body.notes : null,
        },
        include: {
          user: { select: { fullName: true } },
        },
      });

      return NextResponse.json({
        success: true,
        shift: await serializeShift(created),
        message: `Successfully signed up for ${created.role} shift`,
      }, { status: 201 });
    }

    if (action === 'cancel' || action === 'complete' || action === 'confirm') {
      const shiftId = typeof body.shiftId === 'string' ? body.shiftId : '';
      if (!shiftId) {
        return NextResponse.json({ error: 'shiftId required' }, { status: 400 });
      }

      const existing = await prisma.volunteerShift.findUnique({ where: { id: shiftId } });
      if (!existing) {
        return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
      }

      const isOwner = existing.userId === actor.id;
      if (!isOwner && !canManage(actor.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const nextStatus = action === 'cancel' ? 'CANCELLED' : action === 'complete' ? 'COMPLETED' : 'CONFIRMED';
      const updated = await prisma.volunteerShift.update({
        where: { id: shiftId },
        data: { status: nextStatus },
        include: {
          user: { select: { fullName: true } },
        },
      });

      return NextResponse.json({
        success: true,
        shift: await serializeShift(updated),
        message: action === 'cancel' ? 'Shift cancelled' : action === 'complete' ? 'Shift marked as completed' : 'Shift confirmed',
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use: signup, cancel, complete, confirm' }, { status: 400 });
  } catch (error) {
    console.error('Volunteer shifts API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const actor = await getActor(request);
  if (!actor || !actor.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get('action') !== 'roles') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({
    roles: [
      { id: 'ID_CHECKER', name: 'ID Checker', description: 'Verify player IDs at check-in', hoursPerShift: 2 },
      { id: 'SETUP', name: 'Field Setup', description: 'Set up goals, flags, equipment', hoursPerShift: 2 },
      { id: 'TEAR_DOWN', name: 'Field Tear Down', description: 'Put away equipment after games', hoursPerShift: 1 },
      { id: 'SCOREKEEPER', name: 'Scorekeeper', description: 'Keep official match scores', hoursPerShift: 2 },
      { id: 'CONCESSIONS', name: 'Concessions', description: 'Manage food and beverage stand', hoursPerShift: 4 },
      { id: 'FIELD_MONITOR', name: 'Field Monitor', description: 'Patrol fields, report issues', hoursPerShift: 2 },
    ],
  });
}
