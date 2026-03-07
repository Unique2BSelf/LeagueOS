import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { syncDisciplinaryStateForUser } from '@/lib/discipline';

async function getActor(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
    },
  });
}

function canReport(role: string) {
  return role === 'REF' || role === 'ADMIN' || role === 'MODERATOR';
}

function canReview(role: string) {
  return role === 'ADMIN' || role === 'MODERATOR';
}

export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor || !actor.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    if (canReview(actor.role)) {
      const actions = await prisma.disciplinaryAction.findMany({
        where,
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
          match: {
            include: {
              homeTeam: { select: { name: true } },
              awayTeam: { select: { name: true } },
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { createdAt: 'desc' },
        ],
      });

      return NextResponse.json(actions.map((action) => ({
        ...action,
        userName: action.user.fullName,
        userEmail: action.user.email,
        matchName: action.match ? `${action.match.homeTeam.name} vs ${action.match.awayTeam.name}` : null,
      })));
    }

    if (actor.role === 'REF') {
      const actions = await prisma.disciplinaryAction.findMany({
        where: {
          ...where,
          reportedById: actor.id,
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(actions);
    }

    const actions = await prisma.disciplinaryAction.findMany({
      where: {
        ...where,
        userId: actor.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(actions);
  } catch (error) {
    console.error('Error fetching disciplinary actions:', error);
    return NextResponse.json({ error: 'Failed to fetch disciplinary actions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor || !actor.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canReport(actor.role)) {
      return NextResponse.json({ error: 'Only referees, moderators, or admins can report discipline' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const userId = typeof body?.userId === 'string' ? body.userId : '';
    const matchId = typeof body?.matchId === 'string' ? body.matchId : null;
    const cardType = typeof body?.cardType === 'string' ? body.cardType : '';
    const fineAmount = Number(body?.fineAmount ?? 0);
    const suspensionGames = Number(body?.suspensionGames ?? 0);
    const reportNotes = typeof body?.reportNotes === 'string' ? body.reportNotes.trim() : null;
    const source = typeof body?.source === 'string' ? body.source : matchId ? 'MATCH_REPORT' : 'MANUAL';

    if (!userId || !cardType) {
      return NextResponse.json({ error: 'userId and cardType are required' }, { status: 400 });
    }

    const player = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const action = await prisma.disciplinaryAction.create({
      data: {
        userId,
        matchId,
        cardType,
        fineAmount,
        suspensionGames,
        reportNotes,
        source,
        reportedById: actor.id,
      },
    });

    await createAuditLog({
      actor,
      actionType: 'CREATE',
      entityType: 'USER',
      entityId: userId,
      after: {
        disciplinaryActionId: action.id,
        cardType,
        fineAmount,
        suspensionGames,
        source,
      },
      notes: `Disciplinary report created for ${player.fullName}`,
    });

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error('Error creating disciplinary action:', error);
    return NextResponse.json({ error: 'Failed to create disciplinary action' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor || !actor.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canReview(actor.role)) {
      return NextResponse.json({ error: 'Moderator or admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const actionId = typeof body?.actionId === 'string' ? body.actionId : '';
    const actionType = typeof body?.action === 'string' ? body.action : '';
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : null;

    if (!actionId || !['APPROVE', 'REJECT', 'RELEASE'].includes(actionType)) {
      return NextResponse.json({ error: 'actionId and valid action are required' }, { status: 400 });
    }

    const disciplinary = await prisma.disciplinaryAction.findUnique({
      where: { id: actionId },
    });

    if (!disciplinary) {
      return NextResponse.json({ error: 'Disciplinary action not found' }, { status: 404 });
    }

    if (actionType === 'APPROVE') {
      let fineLedgerId = disciplinary.fineLedgerId;

      if (!fineLedgerId && disciplinary.fineAmount > 0) {
        const ledgerEntry = await prisma.ledger.create({
          data: {
            userId: disciplinary.userId,
            amount: disciplinary.fineAmount,
            type: 'FINE',
            status: 'PENDING',
            year: new Date().getFullYear(),
            description: notes || `${disciplinary.cardType} disciplinary fine`,
            matchId: disciplinary.matchId,
          },
        });
        fineLedgerId = ledgerEntry.id;
      }

      const updated = await prisma.disciplinaryAction.update({
        where: { id: actionId },
        data: {
          status: 'APPROVED',
          reviewedById: actor.id,
          reviewedAt: new Date(),
          notes,
          fineLedgerId,
          isPaid: disciplinary.fineAmount <= 0,
          isReleased: disciplinary.fineAmount <= 0,
        },
      });

      await syncDisciplinaryStateForUser(disciplinary.userId);

      await createAuditLog({
        actor,
        actionType: 'APPROVE',
        entityType: 'USER',
        entityId: disciplinary.userId,
        before: {
          disciplinaryActionId: disciplinary.id,
          status: disciplinary.status,
          fineLedgerId: disciplinary.fineLedgerId,
        },
        after: {
          disciplinaryActionId: updated.id,
          status: updated.status,
          fineLedgerId: updated.fineLedgerId,
        },
        notes: notes || 'Disciplinary action approved',
      });

      return NextResponse.json(updated);
    }

    if (actionType === 'REJECT') {
      const updated = await prisma.disciplinaryAction.update({
        where: { id: actionId },
        data: {
          status: 'REJECTED',
          reviewedById: actor.id,
          reviewedAt: new Date(),
          notes,
        },
      });

      await createAuditLog({
        actor,
        actionType: 'REJECT',
        entityType: 'USER',
        entityId: disciplinary.userId,
        before: {
          disciplinaryActionId: disciplinary.id,
          status: disciplinary.status,
        },
        after: {
          disciplinaryActionId: updated.id,
          status: updated.status,
        },
        notes: notes || 'Disciplinary action rejected',
      });

      return NextResponse.json(updated);
    }

    if (!disciplinary.isPaid && disciplinary.fineAmount > 0) {
      return NextResponse.json({ error: 'Fine must be paid before release' }, { status: 409 });
    }

    const updated = await prisma.disciplinaryAction.update({
      where: { id: actionId },
      data: {
        isReleased: true,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        notes,
      },
    });

    await syncDisciplinaryStateForUser(disciplinary.userId);

    await createAuditLog({
      actor,
      actionType: 'UPDATE',
      entityType: 'USER',
      entityId: disciplinary.userId,
      before: {
        disciplinaryActionId: disciplinary.id,
        isReleased: disciplinary.isReleased,
      },
      after: {
        disciplinaryActionId: updated.id,
        isReleased: updated.isReleased,
      },
      notes: notes || 'Disciplinary action manually released',
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating disciplinary action:', error);
    return NextResponse.json({ error: 'Failed to update disciplinary action' }, { status: 500 });
  }
}
