import { NextRequest, NextResponse } from 'next/server';
import { PaymentMethod, PaymentStatus, TransactionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createPaymentRecord, refundStoredPayment } from '@/lib/payments';
import { getRequestOrigin, getStripeClient } from '@/lib/stripe';

export const runtime = 'nodejs';

async function getActor(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

async function findRegistrationWithSeason(registrationId: string) {
  return prisma.registration.findUnique({
    where: { id: registrationId },
    include: { season: true, user: { select: { fullName: true, email: true } } },
  });
}

async function findFineLedger(ledgerEntryId: string) {
  return prisma.ledger.findUnique({
    where: { id: ledgerEntryId },
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  });
}

function normalizeMethod(value: unknown): PaymentMethod {
  const candidate = typeof value === 'string' ? value.toUpperCase() : 'CARD';
  if (candidate in PaymentMethod) {
    return PaymentMethod[candidate as keyof typeof PaymentMethod];
  }
  return PaymentMethod.CARD;
}

function serializePayment(payment: any) {
  return {
    id: payment.id,
    registrationId: payment.registrationId,
    ledgerEntryId: payment.ledgerEntryId,
    userId: payment.userId,
    seasonId: payment.seasonId,
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    notes: payment.notes,
    venmoHandle: payment.venmoHandle,
    stripeSessionId: payment.stripeSessionId,
    stripePaymentIntentId: payment.stripePaymentIntentId,
    processedAt: payment.processedAt,
    refundedAt: payment.refundedAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    registration: payment.registration ? {
      id: payment.registration.id,
      seasonName: payment.registration.season?.name,
      userName: payment.registration.user?.fullName,
      userEmail: payment.registration.user?.email,
    } : undefined,
    ledgerEntry: payment.ledgerEntry ? {
      id: payment.ledgerEntry.id,
      description: payment.ledgerEntry.description,
      status: payment.ledgerEntry.status,
    } : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { registrationId, ledgerEntryId, method = 'CARD' } = await request.json();
    const registration = registrationId ? await findRegistrationWithSeason(registrationId) : null;
    const fineLedger = ledgerEntryId ? await findFineLedger(ledgerEntryId) : null;

    if (!registration && !fineLedger) {
      return NextResponse.json({ error: 'registrationId or ledgerEntryId is required' }, { status: 400 });
    }

    if (registration) {
      if (registration.userId !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      if (registration.paid) return NextResponse.json({ error: 'Already paid' }, { status: 400 });
    }

    if (fineLedger) {
      if (fineLedger.userId !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      if (fineLedger.type !== 'FINE') return NextResponse.json({ error: 'Only fine ledger entries can be paid here' }, { status: 400 });
      if (fineLedger.status === 'PAID' || fineLedger.status === 'COMPLETED') {
        return NextResponse.json({ error: 'Fine already paid' }, { status: 400 });
      }
    }

    const normalizedMethod = normalizeMethod(method);
    const amount = registration ? registration.amount : Number(fineLedger!.amount);
    const targetTransactionType = registration ? TransactionType.REGISTRATION : TransactionType.FINE;

    if (normalizedMethod === PaymentMethod.CARD || normalizedMethod === PaymentMethod.APPLE_PAY) {
      const stripe = getStripeClient();
      const origin = getRequestOrigin(request);
      const description = registration
        ? `${registration.season.name} Registration`
        : 'League disciplinary fine';
      const customerEmail = registration ? registration.user.email : fineLedger!.user.email;

      const pendingPayment = await createPaymentRecord({
        userId,
        registrationId: registration?.id,
        ledgerEntryId: fineLedger?.id,
        seasonId: registration?.seasonId || null,
        amount,
        method: normalizedMethod,
        transactionType: targetTransactionType,
      });

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${origin}/dashboard/payments?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard/payments?payment=cancelled`,
        customer_email: customerEmail,
        metadata: {
          paymentId: pendingPayment.id,
          ...(registration ? {
            registrationId: registration.id,
            seasonId: registration.seasonId,
          } : {
            ledgerEntryId: fineLedger!.id,
            paymentKind: 'FINE',
          }),
          userId,
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: Math.round(amount * 100),
              product_data: {
                name: description,
                description: registration
                  ? `League OS registration for ${registration.user.fullName}`
                  : `Disciplinary fine for ${fineLedger!.user.fullName}`,
              },
            },
          },
        ],
      });

      const updated = await prisma.payment.update({
        where: { id: pendingPayment.id },
        data: {
          stripeSessionId: checkoutSession.id,
          providerReference: checkoutSession.id,
        },
      });

      return NextResponse.json({
        paymentId: updated.id,
        amount,
        checkoutUrl: checkoutSession.url,
        stripeSessionId: checkoutSession.id,
        method: normalizedMethod,
        message: 'Stripe Checkout session created',
      });
    }

    const payment = await createPaymentRecord({
      userId,
      registrationId: registration?.id,
      ledgerEntryId: fineLedger?.id,
      seasonId: registration?.seasonId || null,
      amount,
      method: normalizedMethod,
      transactionType: targetTransactionType,
      status: PaymentStatus.PENDING,
    });

    return NextResponse.json({
      paymentId: payment.id,
      amount,
      method: normalizedMethod,
      message: `Payment method ${normalizedMethod} awaiting admin confirmation.`,
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

    const payments = await prisma.payment.findMany({
      where: {
        ...(isAdmin ? {} : { userId }),
        ...(registrationId ? { registrationId } : {}),
        ...(seasonId ? { seasonId } : {}),
        ...(status && status in PaymentStatus ? { status: PaymentStatus[status as keyof typeof PaymentStatus] } : {}),
      },
      include: {
        registration: {
          include: {
            season: true,
            user: { select: { fullName: true, email: true } },
          },
        },
        ledgerEntry: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(payments.map(serializePayment));
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
    if (actor.role !== 'ADMIN' && actor.role !== 'MODERATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { paymentId, action, notes } = await request.json();
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    if (action === 'confirm') {
      const updated = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          processedAt: new Date(),
          notes: notes || payment.notes,
        },
        include: {
          registration: { include: { season: true, user: { select: { fullName: true, email: true } } } },
          ledgerEntry: true,
        },
      });

      if (updated.registrationId && updated.registration && !updated.registration.paid) {
        await prisma.registration.update({
          where: { id: updated.registrationId },
          data: {
            paid: true,
            paymentId: updated.id,
            status: 'APPROVED',
          },
        });

        await prisma.ledger.create({
          data: {
            userId: updated.userId,
            amount: updated.amount,
            type: 'REGISTRATION',
            status: 'COMPLETED',
            year: new Date().getFullYear(),
            description: `Registration payment for ${updated.registration.season.name} via ${updated.method}`,
          },
        });
      }

      if (updated.ledgerEntryId) {
        await prisma.ledger.update({
          where: { id: updated.ledgerEntryId },
          data: { status: 'PAID' },
        });
      }

      return NextResponse.json(serializePayment(updated));
    }

    if (action === 'fail') {
      const updated = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.FAILED,
          notes: notes || payment.notes,
        },
      });
      return NextResponse.json(serializePayment(updated));
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
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
    const payment = await refundStoredPayment(paymentId, reason);
    return NextResponse.json({ success: true, payment: serializePayment(payment) });
  } catch (error) {
    console.error('Error processing refund:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process refund' }, { status: 500 });
  }
}
