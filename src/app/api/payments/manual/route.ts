import { PaymentMethod, PaymentStatus, TransactionType } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPaymentRecord } from '@/lib/payments';

function normalizeManualMethod(value: unknown): PaymentMethod {
  const candidate = typeof value === 'string' ? value.toUpperCase() : 'CASH';
  if (candidate in PaymentMethod) {
    return PaymentMethod[candidate as keyof typeof PaymentMethod];
  }
  return PaymentMethod.OTHER;
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { registrationId, amount, paymentMethod, notes, venmoHandle } = await request.json();
    if (!registrationId || !amount || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { season: true },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (registration.paid) {
      return NextResponse.json({ error: 'Registration already paid' }, { status: 400 });
    }

    const normalizedMethod = normalizeManualMethod(paymentMethod);
    const payment = await createPaymentRecord({
      userId: registration.userId,
      registrationId,
      seasonId: registration.seasonId,
      amount: Number(amount),
      method: normalizedMethod,
      status: PaymentStatus.COMPLETED,
      transactionType: TransactionType.REGISTRATION,
      providerReference: `manual:${normalizedMethod}`,
      venmoHandle: venmoHandle || null,
      notes: notes || null,
      processedAt: new Date(),
    });

    await prisma.registration.update({
      where: { id: registrationId },
      data: {
        paid: true,
        paymentId: payment.id,
        status: 'APPROVED',
      },
    });

    await prisma.ledger.create({
      data: {
        userId: registration.userId,
        amount: Number(amount),
        type: 'REGISTRATION',
        status: 'COMPLETED',
        year: new Date().getFullYear(),
        description: `Manual ${normalizedMethod} payment for ${registration.season.name}${notes ? ` - ${notes}` : ''}${venmoHandle ? ` (${venmoHandle})` : ''}`,
      },
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        registrationId,
        amount: Number(amount),
        method: normalizedMethod,
        notes,
        venmoHandle,
        status: 'COMPLETED',
      },
      message: `Manual ${normalizedMethod} payment recorded`,
    });
  } catch (error) {
    console.error('Error recording manual payment:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
