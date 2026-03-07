import Stripe from 'stripe';
import { PaymentMethod, PaymentStatus, TransactionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { queueAndSendEmail, renderPaymentReceiptEmail } from '@/lib/email';
import { syncDisciplinaryActionByLedger } from '@/lib/discipline';
import { resolveRegistrationStatus } from '@/lib/registrations';
import { activateAnnualInsuranceForUser } from '@/lib/insurance';

export type DurablePayment = {
  id: string;
  userId: string;
  registrationId?: string | null;
  ledgerEntryId?: string | null;
  seasonId?: string | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionType: TransactionType;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  providerReference?: string | null;
  venmoHandle?: string | null;
  notes?: string | null;
  processedAt?: Date | null;
  refundedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function createPaymentRecord(input: {
  userId: string;
  registrationId?: string | null;
  ledgerEntryId?: string | null;
  seasonId?: string | null;
  amount: number;
  method: PaymentMethod;
  status?: PaymentStatus;
  transactionType: TransactionType;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  providerReference?: string | null;
  venmoHandle?: string | null;
  notes?: string | null;
  processedAt?: Date | null;
  refundedAt?: Date | null;
}) {
  return prisma.payment.create({
    data: {
      userId: input.userId,
      registrationId: input.registrationId || null,
      ledgerEntryId: input.ledgerEntryId || null,
      seasonId: input.seasonId || null,
      amount: input.amount,
      method: input.method,
      status: input.status || PaymentStatus.PENDING,
      transactionType: input.transactionType,
      stripeSessionId: input.stripeSessionId || null,
      stripePaymentIntentId: input.stripePaymentIntentId || null,
      providerReference: input.providerReference || null,
      venmoHandle: input.venmoHandle || null,
      notes: input.notes || null,
      processedAt: input.processedAt || null,
      refundedAt: input.refundedAt || null,
    },
  });
}

export async function findPaymentByStripeSessionId(stripeSessionId: string) {
  return prisma.payment.findUnique({
    where: { stripeSessionId },
  });
}

async function markRegistrationPaid(payment: { id: string; registrationId: string; amount: number; userId: string }, providerPaymentId: string) {
  const registration = await prisma.registration.findUnique({
    where: { id: payment.registrationId },
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

  const activeInsurance = await prisma.insurancePolicy.findFirst({
    where: {
      userId: registration.userId,
      status: 'ACTIVE',
      endDate: { gt: new Date() },
    },
    orderBy: { endDate: 'desc' },
  });

  const insuranceStatus = activeInsurance
    ? (activeInsurance.endDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'EXPIRING_SOON' : 'VALID')
    : 'REQUIRED';

  const nextStatus = resolveRegistrationStatus({
    paid: true,
    insuranceStatus,
    currentStatus: registration.status,
  });

  if (!registration.paid) {
    await prisma.registration.update({
      where: { id: registration.id },
      data: {
        paid: true,
        paymentId: providerPaymentId,
        status: nextStatus,
        insuranceStatus,
        insurancePurchasedAt: activeInsurance ? activeInsurance.startDate : registration.insurancePurchasedAt,
      },
    });

    await prisma.ledger.create({
      data: {
        userId: registration.userId,
        amount: registration.amount,
        type: 'REGISTRATION',
        status: 'COMPLETED',
        year: new Date().getFullYear(),
        description: `Payment received for ${registration.season.name}`,
      },
    });
  }

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
      paymentId: payment.id,
      providerPaymentId,
      amount: registration.amount,
    },
  });

  return registration;
}

async function markFinePaid(payment: { id: string; ledgerEntryId: string; amount: number }, providerPaymentId: string) {
  const ledgerEntry = await prisma.ledger.findUnique({
    where: { id: payment.ledgerEntryId },
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

  if (ledgerEntry.status !== 'PAID' && ledgerEntry.status !== 'COMPLETED') {
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
      paymentId: payment.id,
      providerPaymentId,
      ledgerEntryId: ledgerEntry.id,
      amount: ledgerEntry.amount,
    },
  });

  return ledgerEntry;
}

async function markInsurancePaid(payment: { id: string; userId: string; amount: number; notes?: string | null; ledgerEntryId?: string | null }, providerPaymentId: string, provider?: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: payment.userId },
    select: {
      fullName: true,
      email: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const policy = await activateAnnualInsuranceForUser({
    userId: payment.userId,
    provider: provider || 'LEAGUE_PROVIDED',
    cost: payment.amount,
    stripePaymentId: providerPaymentId,
  });

  let ledgerEntryId = payment.ledgerEntryId || null;

  if (!ledgerEntryId) {
    const ledger = await prisma.ledger.create({
      data: {
        userId: payment.userId,
        amount: payment.amount,
        type: 'INSURANCE',
        status: 'COMPLETED',
        year: new Date().getFullYear(),
        description: 'Annual insurance payment received',
      },
    });

    ledgerEntryId = ledger.id;

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        ledgerEntryId,
      },
    });

    await queueAndSendEmail({
      toEmail: user.email,
      toName: user.fullName,
      subject: 'Annual insurance payment received',
      htmlBody: `<p>We received your annual insurance payment of $${payment.amount.toFixed(2)}. Coverage is active through ${policy.endDate.toLocaleDateString()}.</p>`,
      textBody: `We received your annual insurance payment of $${payment.amount.toFixed(2)}. Coverage is active through ${policy.endDate.toLocaleDateString()}.`,
      templateType: 'PAYMENT_RECEIPT',
      metadata: {
        paymentId: payment.id,
        providerPaymentId,
        policyId: policy.id,
        ledgerEntryId,
        amount: payment.amount,
      },
    });
  }

  return policy;
}

export async function finalizeStripeCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') {
    throw new Error('Checkout session is not paid');
  }

  const paymentId = session.metadata?.paymentId;
  const payment = paymentId
    ? await prisma.payment.findUnique({ where: { id: paymentId } })
    : await findPaymentByStripeSessionId(session.id);

  if (!payment) {
    throw new Error('Payment record not found');
  }

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id || null;

  if (payment.status !== PaymentStatus.COMPLETED) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        providerReference: paymentIntentId || session.id,
        processedAt: new Date(),
      },
    });
  }

  if (payment.transactionType === TransactionType.INSURANCE || payment.notes === 'ANNUAL_INSURANCE' || session.metadata?.paymentKind === 'INSURANCE') {
    return markInsurancePaid(
      { id: payment.id, userId: payment.userId, amount: payment.amount, notes: payment.notes, ledgerEntryId: payment.ledgerEntryId },
      paymentIntentId || session.id,
      session.metadata?.provider || null,
    );
  }

  if (payment.registrationId) {
    return markRegistrationPaid({ id: payment.id, registrationId: payment.registrationId, amount: payment.amount, userId: payment.userId }, paymentIntentId || session.id);
  }

  if (payment.ledgerEntryId) {
    return markFinePaid({ id: payment.id, ledgerEntryId: payment.ledgerEntryId, amount: payment.amount }, paymentIntentId || session.id);
  }

  throw new Error('Payment is not linked to a supported target');
}

export async function refundStoredPayment(paymentId: string, reason?: string | null) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status !== PaymentStatus.COMPLETED) {
    throw new Error('Can only refund completed payments');
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.REFUNDED,
      refundedAt: new Date(),
      notes: reason || payment.notes,
    },
  });

  if (payment.registrationId) {
    await prisma.registration.update({
      where: { id: payment.registrationId },
      data: { paid: false, paymentId: null, status: 'PENDING' },
    });
  }

  await prisma.ledger.create({
    data: {
      userId: payment.userId,
      amount: -Math.abs(payment.amount),
      type: 'REFUND',
      status: 'COMPLETED',
      year: new Date().getFullYear(),
      description: reason || 'Payment refund',
    },
  });

  return updated;
}
