import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/ledger - List ledger entries
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const where: any = { userId };
    if (type) where.type = type;
    if (status) where.status = status;

    const entries = await prisma.ledger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching ledger:', error);
    return NextResponse.json({ error: 'Failed to fetch ledger' }, { status: 500 });
  }
}

// POST /api/ledger - Create ledger entry (admin only)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const admin = await prisma.user.findUnique({ where: { id: userId } });
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { playerId, type, amount, description, matchId } = await request.json();

    // Create ledger entry
    const entry = await prisma.ledger.create({
      data: {
        user: { connect: { id: playerId } },
        type,
        amount: parseFloat(amount),
        description,
        matchId,
        status: 'PENDING',
        year: new Date().getFullYear(),
      },
    });

    // If this is a FINE and amount > 0, lock the player
    if (type === 'FINE' && parseFloat(amount) > 0) {
      await prisma.user.update({
        where: { id: playerId },
        data: {
          isActive: false,
          lockReason: description || 'Unpaid fine',
        },
      });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error creating ledger entry:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}

// PATCH /api/ledger - Update entry (e.g., mark as paid)
export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entryId, status, releasePlayer } = await request.json();

    const entry = await prisma.ledger.update({
      where: { id: entryId },
      data: { status },
    });

    // If marked as PAID and releasePlayer is true, unlock the player
    if (status === 'PAID' && releasePlayer) {
      await prisma.user.update({
        where: { id: entry.userId },
        data: {
          isActive: true,
          lockReason: null,
        },
      });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error updating ledger entry:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}
