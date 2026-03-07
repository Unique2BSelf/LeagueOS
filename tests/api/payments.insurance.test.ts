import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  payment: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  insurancePolicy: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  registration: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  ledger: {
    create: vi.fn(),
  },
};

const queueAndSendEmailMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/discipline', () => ({
  syncDisciplinaryActionByLedger: vi.fn(),
}));
vi.mock('@/lib/email', () => ({
  queueAndSendEmail: queueAndSendEmailMock,
  renderPaymentReceiptEmail: vi.fn(),
}));

describe('finalizeStripeCheckoutSession insurance payments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates active insurance after paid checkout and promotes paid registrations', async () => {
    prismaMock.payment.findUnique.mockResolvedValueOnce({
      id: 'payment-1',
      userId: 'player-1',
      registrationId: null,
      ledgerEntryId: null,
      amount: 50,
      status: 'PENDING',
      transactionType: 'INSURANCE',
      notes: 'ANNUAL_INSURANCE',
    });
    prismaMock.payment.update.mockResolvedValueOnce({});
    prismaMock.user.findUnique.mockResolvedValueOnce({
      fullName: 'Player One',
      email: 'player@example.com',
    });
    prismaMock.insurancePolicy.findFirst.mockResolvedValueOnce(null);
    prismaMock.insurancePolicy.create.mockImplementationOnce(async ({ data }) => ({
      id: 'policy-1',
      ...data,
    }));
    prismaMock.user.update.mockResolvedValueOnce({});
    prismaMock.registration.findMany.mockResolvedValueOnce([
      { id: 'reg-1', paid: true, status: 'PENDING' },
    ]);
    prismaMock.registration.update.mockResolvedValueOnce({});
    prismaMock.ledger.create.mockResolvedValueOnce({});
    queueAndSendEmailMock.mockResolvedValueOnce({ id: 'email-1' });

    const { finalizeStripeCheckoutSession } = await import('@/lib/payments');
    const policy = await finalizeStripeCheckoutSession({
      id: 'cs_ins_123',
      payment_status: 'paid',
      payment_intent: 'pi_ins_123',
      metadata: { paymentId: 'payment-1', paymentKind: 'INSURANCE', provider: 'LEAGUE_PROVIDED' },
    } as any);

    expect(policy.id).toBe('policy-1');
    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: expect.objectContaining({
        status: 'COMPLETED',
        stripeSessionId: 'cs_ins_123',
        stripePaymentIntentId: 'pi_ins_123',
      }),
    });
    expect(prismaMock.insurancePolicy.create).toHaveBeenCalled();
    expect(prismaMock.registration.update).toHaveBeenCalledWith({
      where: { id: 'reg-1' },
      data: expect.objectContaining({
        insuranceStatus: 'VALID',
        status: 'APPROVED',
      }),
    });
    expect(prismaMock.ledger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'player-1',
        type: 'INSURANCE',
      }),
    });
    expect(queueAndSendEmailMock).toHaveBeenCalledWith(expect.objectContaining({
      toEmail: 'player@example.com',
      metadata: expect.objectContaining({
        policyId: 'policy-1',
      }),
    }));
  });
});
