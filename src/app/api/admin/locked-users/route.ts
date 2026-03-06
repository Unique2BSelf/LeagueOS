import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/locked-users - Get all locked users
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { id: userId } });
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    // Get users where isActive = false
    const lockedUsers = await prisma.user.findMany({
      where: { isActive: false },
      select: {
        id: true,
        fullName: true,
        email: true,
        lockReason: true,
        createdAt: true,
      },
    });

    // Get unpaid amounts for each
    const usersWithFines = await Promise.all(
      lockedUsers.map(async (user) => {
        const fines = await prisma.ledger.aggregate({
          where: { userId: user.id, status: 'PENDING', type: 'FINE' },
          _sum: { amount: true },
        });
        return {
          ...user,
          unpaidAmount: fines._sum.amount || 0,
        };
      })
    );

    return NextResponse.json(usersWithFines);
  } catch (error) {
    console.error('Error fetching locked users:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
