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

    if (!registrationId) {
      return NextResponse.json({ error: 'Missing registration metadata' }, { status: 400 });
    }

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (registration.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const finalized = await finalizeStripeCheckoutSession(session);

    return NextResponse.json({
      success: true,
      registrationId: finalized.id,
      paymentId: session.id,
      status: 'APPROVED',
    });
  } catch (error) {
    console.error('Error completing Stripe checkout:', error);
    return NextResponse.json({ error: 'Failed to complete checkout' }, { status: 500 });
  }
}

