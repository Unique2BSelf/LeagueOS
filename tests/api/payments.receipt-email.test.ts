import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
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
    prismaMock.registration.findUnique.mockResolvedValueOnce({
      id: 'reg-1',
      userId: 'user-1',
      seasonId: 'season-1',
      amount: 150,
      paid: false,
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
      metadata: { registrationId: 'reg-1' },
    } as any);

    expect(prismaMock.registration.update).toHaveBeenCalledWith({
      where: { id: 'reg-1' },
      data: {
        paid: true,
        paymentId: 'cs_test_123',
        status: 'APPROVED',
      },
    });

    expect(queueAndSendEmailMock).toHaveBeenCalledWith(expect.objectContaining({
      toEmail: 'alex@example.com',
      relatedRegistrationId: 'reg-1',
      templateType: 'PAYMENT_RECEIPT',
    }));
  });
});
