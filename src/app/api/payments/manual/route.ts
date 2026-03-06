import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/payments/manual - Record manual payment
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { registrationId, userId: playerId, amount, paymentMethod, notes } = await request.json();

    if (!registrationId || !amount || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update registration as paid
    const registration = await prisma.registration.update({
      where: { id: registrationId },
      data: { paid: true },
    });

    // Note: Transaction model not implemented yet
    // In production, would record to payments table

    return NextResponse.json({ success: true, registration });
  } catch (error) {
    console.error('Error recording manual payment:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
