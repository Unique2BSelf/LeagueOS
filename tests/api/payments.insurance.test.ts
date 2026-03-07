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

  it('does not create duplicate ledger rows or emails when insurance finalization is retried', async () => {
    prismaMock.payment.findUnique.mockResolvedValueOnce({
      id: 'payment-2',
      userId: 'player-2',
      registrationId: null,
      ledgerEntryId: 'ledger-2',
      amount: 50,
      status: 'COMPLETED',
      transactionType: 'INSURANCE',
      notes: 'ANNUAL_INSURANCE',
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      fullName: 'Player Two',
      email: 'player2@example.com',
    });
    prismaMock.insurancePolicy.findFirst.mockResolvedValueOnce({
      id: 'policy-2',
      userId: 'player-2',
      provider: 'LEAGUE_PROVIDED',
      startDate: new Date('2026-03-07T00:00:00.000Z'),
      endDate: new Date('2027-03-07T00:00:00.000Z'),
      cost: 50,
      status: 'ACTIVE',
      stripePaymentId: 'pi_ins_456',
    });
    prismaMock.user.update.mockResolvedValueOnce({});
    prismaMock.registration.findMany.mockResolvedValueOnce([]);

    const { finalizeStripeCheckoutSession } = await import('@/lib/payments');
    const policy = await finalizeStripeCheckoutSession({
      id: 'cs_ins_456',
      payment_status: 'paid',
      payment_intent: 'pi_ins_456',
      metadata: { paymentId: 'payment-2', paymentKind: 'INSURANCE', provider: 'LEAGUE_PROVIDED' },
    } as any);

    expect(policy.id).toBe('policy-2');
    expect(prismaMock.ledger.create).not.toHaveBeenCalled();
    expect(queueAndSendEmailMock).not.toHaveBeenCalled();
  });
});
