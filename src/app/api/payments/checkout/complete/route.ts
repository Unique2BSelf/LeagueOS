import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripeClient } from '@/lib/stripe';

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
      include: { season: true },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (registration.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (registration.paid) {
      return NextResponse.json({
        success: true,
        registrationId: registration.id,
        paymentId: registration.paymentId,
        status: registration.status,
      });
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Checkout session is not paid' }, { status: 400 });
    }

    await prisma.registration.update({
      where: { id: registration.id },
      data: {
        paid: true,
        paymentId: session.id,
        status: 'APPROVED',
      },
    });

    await recordRegistrationLedger(
      registration.userId,
      registration.amount,
      `Stripe Checkout payment for ${registration.season.name}`
    );

    return NextResponse.json({
      success: true,
      registrationId: registration.id,
      paymentId: session.id,
      status: 'APPROVED',
    });
  } catch (error) {
    console.error('Error completing Stripe checkout:', error);
    return NextResponse.json({ error: 'Failed to complete checkout' }, { status: 500 });
  }
}
