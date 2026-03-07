import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  payment: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  insurancePolicy: {
    findFirst: vi.fn(),
  },
  registration: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  ledger: {
    create: vi.fn(),
  },
  registrationForm: {
    findUnique: vi.fn(),
  },
};

const queueAndSendEmailMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/discipline', () => ({
  syncDisciplinaryActionByLedger: vi.fn(),
}));
vi.mock('@/lib/email', () => ({
  queueAndSendEmail: queueAndSendEmailMock,
  renderPaymentReceiptEmail: vi.fn(({ seasonName, amount, registrationId }) => ({
    subject: `Registration receipt for ${seasonName}`,
    htmlBody: `<p>${registrationId}</p>`,
    textBody: `Amount ${amount}`,
  })),
}));

describe('finalizeStripeCheckoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks the registration paid and queues a receipt email', async () => {
    prismaMock.payment.findUnique.mockResolvedValueOnce({
      id: 'payment-1',
      userId: 'user-1',
      registrationId: 'reg-1',
      ledgerEntryId: null,
      amount: 150,
      status: 'PENDING',
    });
    prismaMock.payment.update.mockResolvedValueOnce({});
    prismaMock.insurancePolicy.findFirst.mockResolvedValueOnce({
      id: 'policy-1',
      startDate: new Date('2026-03-01T00:00:00.000Z'),
      endDate: new Date('2027-03-01T00:00:00.000Z'),
    });
    prismaMock.registration.findUnique.mockResolvedValueOnce({
      id: 'reg-1',
      userId: 'user-1',
      seasonId: 'season-1',
      amount: 150,
      paid: false,
      status: 'PENDING',
      insurancePurchasedAt: null,
      season: { name: 'Spring 2026' },
      user: { fullName: 'Alex Example', email: 'alex@example.com' },
    });
    prismaMock.registration.update.mockResolvedValueOnce({});
    prismaMock.ledger.create.mockResolvedValueOnce({});
    prismaMock.registrationForm.findUnique.mockResolvedValueOnce({
      paymentThankYouSubject: 'Thanks for joining',
      paymentThankYouBody: 'Welcome to the season.',
    });
    queueAndSendEmailMock.mockResolvedValueOnce({ id: 'mail-1', status: 'SENT' });

    const { finalizeStripeCheckoutSession } = await import('@/lib/payments');
    await finalizeStripeCheckoutSession({
      id: 'cs_test_123',
      payment_status: 'paid',
      payment_intent: 'pi_test_123',
      metadata: { paymentId: 'payment-1', registrationId: 'reg-1' },
    } as any);

    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: expect.objectContaining({
        status: 'COMPLETED',
        stripeSessionId: 'cs_test_123',
        stripePaymentIntentId: 'pi_test_123',
      }),
    });
    expect(prismaMock.registration.update).toHaveBeenCalledWith({
      where: { id: 'reg-1' },
      data: {
        paid: true,
        paymentId: 'pi_test_123',
        status: 'APPROVED',
        insuranceStatus: 'VALID',
        insurancePurchasedAt: new Date('2026-03-01T00:00:00.000Z'),
      },
    });

    expect(queueAndSendEmailMock).toHaveBeenCalledWith(expect.objectContaining({
      toEmail: 'alex@example.com',
      relatedRegistrationId: 'reg-1',
      templateType: 'PAYMENT_RECEIPT',
    }));
  });

  it('keeps a paid registration pending when insurance is still required', async () => {
    prismaMock.payment.findUnique.mockResolvedValueOnce({
      id: 'payment-2',
      userId: 'user-2',
      registrationId: 'reg-2',
      ledgerEntryId: null,
      amount: 200,
      status: 'PENDING',
    });
    prismaMock.payment.update.mockResolvedValueOnce({});
    prismaMock.insurancePolicy.findFirst.mockResolvedValueOnce(null);
    prismaMock.registration.findUnique.mockResolvedValueOnce({
      id: 'reg-2',
      userId: 'user-2',
      seasonId: 'season-2',
      amount: 200,
      paid: false,
      status: 'PENDING',
      insurancePurchasedAt: null,
      season: { name: 'Summer 2026' },
      user: { fullName: 'Jamie Example', email: 'jamie@example.com' },
    });
    prismaMock.registration.update.mockResolvedValueOnce({});
    prismaMock.ledger.create.mockResolvedValueOnce({});
    prismaMock.registrationForm.findUnique.mockResolvedValueOnce(null);
    queueAndSendEmailMock.mockResolvedValueOnce({ id: 'mail-2', status: 'SENT' });

    const { finalizeStripeCheckoutSession } = await import('@/lib/payments');
    await finalizeStripeCheckoutSession({
      id: 'cs_test_456',
      payment_status: 'paid',
      payment_intent: 'pi_test_456',
      metadata: { paymentId: 'payment-2', registrationId: 'reg-2' },
    } as any);

    expect(prismaMock.registration.update).toHaveBeenCalledWith({
      where: { id: 'reg-2' },
      data: {
        paid: true,
        paymentId: 'pi_test_456',
        status: 'PENDING',
        insuranceStatus: 'REQUIRED',
        insurancePurchasedAt: null,
      },
    });
  });
});
