import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

export async function finalizeStripeCheckoutSession(session: Stripe.Checkout.Session) {
  const registrationId = session.metadata?.registrationId;
  if (!registrationId) {
    throw new Error('Missing registration metadata');
  }

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { season: true },
  });

  if (!registration) {
    throw new Error('Registration not found');
  }

  if (registration.paid) {
    return registration;
  }

  if (session.payment_status !== 'paid') {
    throw new Error('Checkout session is not paid');
  }

  await prisma.registration.update({
    where: { id: registration.id },
    data: {
      paid: true,
      paymentId: session.id,
      status: 'APPROVED',
    },
  });

  await prisma.ledger.create({
    data: {
      userId: registration.userId,
      amount: registration.amount,
      type: 'REGISTRATION',
      status: 'COMPLETED',
      year: new Date().getFullYear(),
      description: `Stripe Checkout payment for ${registration.season.name}`,
    },
  });

  return registration;
}
