import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/users/me - Get current user with lock status
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        photoUrl: true,
        role: true,
        isActive: true,
        insuranceExpiry: true,
        backgroundCheckStatus: true,
        lockReason: true,
        suspensionEndDate: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check unpaid fines
    const unpaidFines = await prisma.ledger.findMany({
      where: { userId, status: 'PENDING', type: 'FINE' },
      select: { amount: true }
    });
    const unpaidFineAmount = unpaidFines.reduce((sum, f) => sum + Number(f.amount), 0);
    
    // Check insurance
    const insurance = await prisma.insurancePolicy.findFirst({
      where: { userId, status: 'ACTIVE', endDate: { gt: new Date() } }
    });
    
    // Check if suspended
    const isSuspended = user.suspensionEndDate && new Date(user.suspensionEndDate) > new Date();

    return NextResponse.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      photoUrl: user.photoUrl,
      role: user.role,
      isInsured: !!insurance,
      insuranceExpiry: insurance?.endDate?.toISOString(),
      isActive: user.isActive,
      hasUnpaidFines: unpaidFineAmount > 0,
      unpaidFineAmount,
      backgroundCheckStatus: user.backgroundCheckStatus || 'PENDING',
      lockReason: user.lockReason,
      isSuspended,
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}
