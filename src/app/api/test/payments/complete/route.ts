import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { finalizeStripeCheckoutSession } from '@/lib/payments';

function isE2EEnabled() {
  return process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true';
}

export async function POST(request: NextRequest) {
  if (!isE2EEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const paymentId = typeof body.paymentId === 'string' ? body.paymentId : '';

  if (!paymentId) {
    return NextResponse.json({ error: 'paymentId required' }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment || !payment.stripeSessionId) {
    return NextResponse.json({ error: 'Payment or Stripe session not found' }, { status: 404 });
  }

  const finalized = await finalizeStripeCheckoutSession({
    id: payment.stripeSessionId,
    payment_status: 'paid',
    payment_intent: payment.stripePaymentIntentId || `pi_test_${payment.id.replace(/-/g, '').slice(0, 18)}`,
    metadata: {
      paymentId: payment.id,
      userId: payment.userId,
      ...(payment.registrationId ? { registrationId: payment.registrationId } : {}),
      ...(payment.ledgerEntryId ? { ledgerEntryId: payment.ledgerEntryId } : {}),
      ...(payment.transactionType === 'INSURANCE' ? { paymentKind: 'INSURANCE', provider: 'LEAGUE_PROVIDED' } : {}),
    },
  } as any);

  return NextResponse.json({
    success: true,
    paymentId: payment.id,
    stripeSessionId: payment.stripeSessionId,
    finalized,
  });
}
