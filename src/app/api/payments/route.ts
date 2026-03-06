import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface PaymentRecord {
  id: string;
  registrationId: string;
  userId: string;
  seasonId: string;
  amount: number;
  method: 'CARD' | 'CASH' | 'VENMO' | 'APPLE_PAY';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  stripePaymentId?: string;
  venmoHandle?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  refundedAt?: Date;
}

const paymentsDb: Map<string, PaymentRecord> = new Map();

async function getActor(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

async function recordRegistrationLedger(userId: string, amount: number, description: string) {
  await prisma.ledger.create({
    data: {
      userId,
      amount,
      type: 'REGISTRATION',
      status: 'COMPLETED',
      year: new Date().getFullYear(),
      description,
    },
  });
}

async function findRegistrationWithSeason(registrationId: string) {
  return prisma.registration.findUnique({
    where: { id: registrationId },
    include: { season: true, user: { select: { fullName: true, email: true } } },
  });
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { registrationId, method = 'CARD' } = await request.json();
    const registration = await findRegistrationWithSeason(registrationId);

    if (!registration) return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    if (registration.userId !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (registration.paid) return NextResponse.json({ error: 'Already paid' }, { status: 400 });

    const existingPending = Array.from(paymentsDb.values()).find((payment) => payment.registrationId === registrationId && payment.status === 'PENDING');
    if (existingPending) {
      return NextResponse.json({
        paymentId: existingPending.id,
        amount: existingPending.amount,
        clientSecret: existingPending.stripePaymentId ? `${existingPending.id}_secret_mock` : undefined,
        method: existingPending.method,
        message: 'Existing payment intent reused',
      });
    }

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const normalizedMethod = method as PaymentRecord['method'];
    const payment: PaymentRecord = {
      id: paymentId,
      registrationId,
      userId,
      seasonId: registration.seasonId,
      amount: registration.amount,
      method: normalizedMethod,
      status: 'PENDING',
      stripePaymentId: normalizedMethod === 'CARD' || normalizedMethod === 'APPLE_PAY' ? `pi_mock_${Date.now()}` : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    paymentsDb.set(paymentId, payment);

    return NextResponse.json({
      paymentId,
      amount: registration.amount,
      clientSecret: payment.stripePaymentId ? `${paymentId}_secret_mock` : undefined,
      method: normalizedMethod,
      message: payment.stripePaymentId ? 'Demo mode: payment would be processed via Stripe' : `Payment method ${normalizedMethod} awaiting admin confirmation.`,
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const actor = await getActor(userId);
    const isAdmin = actor?.role === 'ADMIN' || actor?.role === 'MODERATOR';
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get('registrationId');
    const seasonId = searchParams.get('seasonId');
    const status = searchParams.get('status');

    let payments: any[] = Array.from(paymentsDb.values());
    if (!isAdmin) payments = payments.filter((payment) => payment.userId === userId);
    if (registrationId) payments = payments.filter((payment) => payment.registrationId === registrationId);
    if (seasonId) payments = payments.filter((payment) => payment.seasonId === seasonId);
    if (status) payments = payments.filter((payment) => payment.status === status);

    const completedRegistrations = await prisma.registration.findMany({
      where: isAdmin
        ? { ...(registrationId ? { id: registrationId } : {}), ...(seasonId ? { seasonId } : {}), paid: true }
        : { userId, ...(registrationId ? { id: registrationId } : {}), ...(seasonId ? { seasonId } : {}), paid: true },
      include: { season: true, user: { select: { fullName: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    const persisted = completedRegistrations.map((registration) => ({
      id: registration.paymentId || `registration_${registration.id}`,
      registrationId: registration.id,
      userId: registration.userId,
      seasonId: registration.seasonId,
      amount: registration.amount,
      method: 'CARD',
      status: 'COMPLETED',
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt,
      processedAt: registration.updatedAt,
      registration: {
        userName: registration.user.fullName,
        userEmail: registration.user.email,
        seasonName: registration.season.name,
      },
    }));

    const merged = [...payments, ...persisted.filter((item) => !payments.some((payment) => payment.registrationId === item.registrationId && payment.status === item.status))]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json(merged);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const actor = await getActor(userId);
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { paymentId, action, notes } = await request.json();
    const payment = paymentsDb.get(paymentId);
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const isAdmin = actor.role === 'ADMIN' || actor.role === 'MODERATOR';
    const isOwner = payment.userId === userId;
    if (!isAdmin && !(isOwner && action === 'confirm')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'confirm') {
      payment.status = 'COMPLETED';
      payment.processedAt = new Date();
      payment.updatedAt = new Date();
      paymentsDb.set(paymentId, payment);

      const registration = await findRegistrationWithSeason(payment.registrationId);
      if (!registration) return NextResponse.json({ error: 'Registration not found' }, { status: 404 });

      await prisma.registration.update({
        where: { id: payment.registrationId },
        data: {
          paid: true,
          paymentId: payment.stripePaymentId || paymentId,
          status: 'APPROVED',
        },
      });

      await recordRegistrationLedger(payment.userId, payment.amount, `Registration payment for ${registration.season.name} via ${payment.method}`);
    } else if (action === 'fail') {
      if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      payment.status = 'FAILED';
      payment.notes = notes;
      payment.updatedAt = new Date();
      paymentsDb.set(paymentId, payment);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await getActor(userId);
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { paymentId, reason } = await request.json();
    const payment = paymentsDb.get(paymentId);
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.status !== 'COMPLETED') return NextResponse.json({ error: 'Can only refund completed payments' }, { status: 400 });

    payment.status = 'REFUNDED';
    payment.refundedAt = new Date();
    payment.notes = reason;
    payment.updatedAt = new Date();
    paymentsDb.set(paymentId, payment);

    await prisma.registration.update({
      where: { id: payment.registrationId },
      data: { paid: false, paymentId: null, status: 'PENDING' },
    });

    await prisma.ledger.create({
      data: {
        userId: payment.userId,
        amount: -Math.abs(payment.amount),
        type: 'REFUND',
        status: 'COMPLETED',
        year: new Date().getFullYear(),
        description: reason || 'Registration refund',
      },
    });

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error('Error processing refund:', error);
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 });
  }
}
