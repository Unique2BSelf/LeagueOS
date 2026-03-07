import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripeClient } from '@/lib/stripe';
import { finalizeStripeCheckoutSession } from '@/lib/payments';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const registrationId = session.metadata?.registrationId;
    const ledgerEntryId = session.metadata?.ledgerEntryId;
    const paymentKind = session.metadata?.paymentKind;

    if (!registrationId && !ledgerEntryId && paymentKind !== 'INSURANCE') {
      return NextResponse.json({ error: 'Missing payment metadata' }, { status: 400 });
    }

    if (registrationId) {
      const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
      });

      if (!registration) {
        return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
      }

      if (registration.userId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (ledgerEntryId) {
      const ledgerEntry = await prisma.ledger.findUnique({
        where: { id: ledgerEntryId },
      });

      if (!ledgerEntry) {
        return NextResponse.json({ error: 'Ledger entry not found' }, { status: 404 });
      }

      if (ledgerEntry.userId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (paymentKind === 'INSURANCE') {
      const paymentId = session.metadata?.paymentId;
      if (!paymentId) {
        return NextResponse.json({ error: 'Missing insurance payment id' }, { status: 400 });
      }

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      if (payment.userId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const finalized = await finalizeStripeCheckoutSession(session) as any;

    return NextResponse.json({
      success: true,
      registrationId: registrationId || null,
      ledgerEntryId: ledgerEntryId || null,
      paymentId: session.id,
      status: paymentKind === 'INSURANCE' ? 'INSURED' : registrationId ? 'APPROVED' : 'PAID',
      finalized,
    });
  } catch (error) {
    console.error('Error completing Stripe checkout:', error);
    return NextResponse.json({ error: 'Failed to complete checkout' }, { status: 500 });
  }
}

