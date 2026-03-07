import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { queueAndSendEmail, renderPaymentReceiptEmail } from '@/lib/email';
import { syncDisciplinaryActionByLedger } from '@/lib/discipline';

export async function finalizeStripeCheckoutSession(session: Stripe.Checkout.Session) {
  const registrationId = session.metadata?.registrationId;
  const ledgerEntryId = session.metadata?.ledgerEntryId;

  if (ledgerEntryId) {
    const ledgerEntry = await prisma.ledger.findUnique({
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

    if (!ledgerEntry) {
      throw new Error('Ledger entry not found');
    }

    if (session.payment_status !== 'paid') {
      throw new Error('Checkout session is not paid');
    }

    if (ledgerEntry.status !== 'PAID') {
      await prisma.ledger.update({
        where: { id: ledgerEntry.id },
        data: {
          status: 'PAID',
        },
      });
    }

    await syncDisciplinaryActionByLedger(ledgerEntry.id);

    await queueAndSendEmail({
      toEmail: ledgerEntry.user.email,
      toName: ledgerEntry.user.fullName,
      subject: 'Disciplinary fine payment received',
      htmlBody: `<p>We received your payment of $${Number(ledgerEntry.amount).toFixed(2)} for your league disciplinary fine.</p>`,
      textBody: `We received your payment of $${Number(ledgerEntry.amount).toFixed(2)} for your league disciplinary fine.`,
      templateType: 'PAYMENT_RECEIPT',
      metadata: {
        stripeSessionId: session.id,
        ledgerEntryId: ledgerEntry.id,
        amount: ledgerEntry.amount,
      },
    });

    return ledgerEntry;
  }

  if (!registrationId) {
    throw new Error('Missing registration or ledger metadata');
  }

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      season: true,
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
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

  const registrationForm = await prisma.registrationForm.findUnique({
    where: { seasonId: registration.seasonId },
  });

  const receipt = renderPaymentReceiptEmail({
    playerName: registration.user.fullName,
    seasonName: registration.season.name,
    amount: registration.amount,
    paidAt: new Date(),
    registrationId: registration.id,
    thankYouSubject: registrationForm?.paymentThankYouSubject,
    thankYouBody: registrationForm?.paymentThankYouBody,
  });

  await queueAndSendEmail({
    toEmail: registration.user.email,
    toName: registration.user.fullName,
    subject: receipt.subject,
    htmlBody: receipt.htmlBody,
    textBody: receipt.textBody,
    templateType: 'PAYMENT_RECEIPT',
    relatedRegistrationId: registration.id,
    relatedSeasonId: registration.seasonId,
    metadata: {
      stripeSessionId: session.id,
      amount: registration.amount,
    },
  });

  return registration;
}
