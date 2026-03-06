import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mock Stripe integration for demo purposes
// In production, install: npm install stripe
// Then import: import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });

export interface PaymentRecord {
  id: string
  registrationId: string
  userId: string
  seasonId: string
  amount: number
  method: 'CARD' | 'CASH' | 'VENMO' | 'APPLE_PAY'
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  stripePaymentId?: string
  venmoHandle?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  processedAt?: Date
  refundedAt?: Date
}

const paymentsDb: Map<string, PaymentRecord> = new Map();

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { registrationId, method = 'CARD' } = await request.json();

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { season: true },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (registration.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (registration.paid) {
      return NextResponse.json({ error: 'Already paid' }, { status: 400 });
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
      clientSecret: normalizedMethod === 'CARD' || normalizedMethod === 'APPLE_PAY' ? `${paymentId}_secret_mock` : undefined,
      method: normalizedMethod,
      message: normalizedMethod === 'CARD' || normalizedMethod === 'APPLE_PAY'
        ? 'Demo mode: payment would be processed via Stripe'
        : `Payment method: ${normalizedMethod}. Awaiting admin confirmation.`,
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get('registrationId');
    const seasonId = searchParams.get('seasonId');
    const status = searchParams.get('status');

    let payments: PaymentRecord[] = Array.from(paymentsDb.values());

    if (!isAdmin) {
      payments = payments.filter((p) => p.userId === userId);
    }

    if (registrationId) {
      payments = payments.filter((p) => p.registrationId === registrationId);
    }
    if (seasonId) {
      payments = payments.filter((p) => p.seasonId === seasonId);
    }
    if (status) {
      payments = payments.filter((p) => p.status === status);
    }

    if (isAdmin) {
      const enrichedPayments = await Promise.all(
        payments.map(async (payment) => {
          const registration = await prisma.registration.findUnique({
            where: { id: payment.registrationId },
            include: { user: { select: { id: true, fullName: true, email: true } }, season: true },
          });

          return {
            ...payment,
            registration: registration ? {
              userName: registration.user.fullName,
              userEmail: registration.user.email,
              seasonName: registration.season.name,
            } : null,
          };
        })
      );

      return NextResponse.json(enrichedPayments);
    }

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actor = await prisma.user.findUnique({ where: { id: userId } });
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId, action, notes } = await request.json();
    const payment = paymentsDb.get(paymentId);

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const isAdmin = actor.role === 'ADMIN' || actor.role === 'MODERATOR';
    const isOwner = payment.userId === userId;

    if (!isAdmin && !(isOwner && action === 'confirm')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'confirm') {
      payment.status = 'COMPLETED';
      payment.processedAt = new Date();

      await prisma.registration.update({
        where: { id: payment.registrationId },
        data: {
          paid: true,
          paymentId: payment.stripePaymentId || paymentId,
          status: 'APPROVED',
        },
      });
    } else if (action === 'fail') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      }
      payment.status = 'FAILED';
      payment.notes = notes;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    payment.updatedAt = new Date();
    paymentsDb.set(paymentId, payment);

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { paymentId, reason } = await request.json();
    const payment = paymentsDb.get(paymentId);

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Can only refund completed payments' }, { status: 400 });
    }

    payment.status = 'REFUNDED';
    payment.refundedAt = new Date();
    payment.notes = reason;
    payment.updatedAt = new Date();
    paymentsDb.set(paymentId, payment);

    await prisma.registration.update({
      where: { id: payment.registrationId },
      data: { paid: false, paymentId: null, status: 'PENDING' },
    });

    return NextResponse.json({
      success: true,
      message: 'Refund processed (mock)',
      payment,
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 });
  }
}

export async function POST_MANUAL(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { registrationId, method, amount, venmoHandle, notes } = await request.json();
    const registration = await prisma.registration.findUnique({ where: { id: registrationId } });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (registration.paid) {
      return NextResponse.json({ error: 'Registration already paid' }, { status: 400 });
    }

    const paymentId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const payment: PaymentRecord = {
      id: paymentId,
      registrationId,
      userId: registration.userId,
      seasonId: registration.seasonId,
      amount: amount || registration.amount,
      method: method as 'CASH' | 'VENMO',
      status: 'COMPLETED',
      venmoHandle,
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      processedAt: new Date(),
    };

    paymentsDb.set(paymentId, payment);

    await prisma.registration.update({
      where: { id: registrationId },
      data: {
        paid: true,
        paymentId,
        status: 'APPROVED',
      },
    });

    return NextResponse.json({
      success: true,
      payment,
      message: `Manual ${method} payment recorded`,
    });
  } catch (error) {
    console.error('Error recording manual payment:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}

