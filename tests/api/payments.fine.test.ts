import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  payment: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  ledger: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const queueAndSendEmailMock = vi.fn();
const syncDisciplinaryActionByLedgerMock = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/discipline', () => ({
  syncDisciplinaryActionByLedger: syncDisciplinaryActionByLedgerMock,
}));
vi.mock('@/lib/email', () => ({
  queueAndSendEmail: queueAndSendEmailMock,
  renderPaymentReceiptEmail: vi.fn(),
}));

describe('finalizeStripeCheckoutSession fine payments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks a fine ledger paid and syncs disciplinary release state', async () => {
    prismaMock.payment.findUnique.mockResolvedValueOnce({
      id: 'payment-1',
      userId: 'player-1',
      registrationId: null,
      ledgerEntryId: 'ledger-1',
      amount: 50,
      status: 'PENDING',
    });
    prismaMock.payment.update.mockResolvedValueOnce({});
    prismaMock.ledger.findUnique.mockResolvedValueOnce({
      id: 'ledger-1',
      amount: 50,
      status: 'PENDING',
      user: {
        fullName: 'Player One',
        email: 'player@example.com',
      },
    });
    prismaMock.ledger.update.mockResolvedValueOnce({});
    queueAndSendEmailMock.mockResolvedValueOnce({ id: 'mail-1' });

    const { finalizeStripeCheckoutSession } = await import('@/lib/payments');
    const finalized = await finalizeStripeCheckoutSession({
      id: 'cs_fine_123',
      payment_status: 'paid',
      payment_intent: 'pi_fine_123',
      metadata: { paymentId: 'payment-1', ledgerEntryId: 'ledger-1' },
    } as any);

    expect(finalized.id).toBe('ledger-1');
    expect(prismaMock.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: expect.objectContaining({
        status: 'COMPLETED',
        stripeSessionId: 'cs_fine_123',
        stripePaymentIntentId: 'pi_fine_123',
      }),
    });
    expect(prismaMock.ledger.update).toHaveBeenCalledWith({
      where: { id: 'ledger-1' },
      data: { status: 'PAID' },
    });
    expect(syncDisciplinaryActionByLedgerMock).toHaveBeenCalledWith('ledger-1');
    expect(queueAndSendEmailMock).toHaveBeenCalledWith(expect.objectContaining({
      toEmail: 'player@example.com',
      metadata: expect.objectContaining({
        ledgerEntryId: 'ledger-1',
      }),
    }));
  });
});
