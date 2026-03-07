import { prisma } from '@/lib/prisma';

export async function syncDisciplinaryStateForUser(userId: string) {
  const [pendingFineEntries, activeSuspension, unpaidActions] = await Promise.all([
    prisma.ledger.findMany({
      where: {
        userId,
        type: 'FINE',
        status: 'PENDING',
      },
      select: {
        id: true,
        amount: true,
        description: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        suspensionEndDate: true,
      },
    }),
    prisma.disciplinaryAction.findMany({
      where: {
        userId,
        status: 'APPROVED',
        isReleased: false,
      },
      select: {
        id: true,
        fineLedgerId: true,
        fineAmount: true,
        cardType: true,
        isReleased: true,
      },
    }),
  ]);

  const now = new Date();
  const hasSuspension = !!activeSuspension?.suspensionEndDate && activeSuspension.suspensionEndDate > now;
  const hasPendingFines = pendingFineEntries.length > 0;
  const shouldBeLocked = hasSuspension || hasPendingFines || unpaidActions.some((action) => action.fineAmount <= 0 && !action.isReleased);

  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: !shouldBeLocked,
      lockReason: shouldBeLocked
        ? hasPendingFines
          ? 'Unpaid disciplinary fine'
          : hasSuspension
            ? 'Active suspension'
            : 'Pending disciplinary release'
        : null,
    },
  });

  if (!hasPendingFines) {
    await prisma.disciplinaryAction.updateMany({
      where: {
        userId,
        status: 'APPROVED',
        isReleased: false,
        OR: [
          { fineLedgerId: null },
          { fineLedgerId: { not: null } },
        ],
      },
      data: {
        isPaid: true,
        isReleased: !hasSuspension,
      },
    });
  }
}

export async function syncDisciplinaryActionByLedger(ledgerId: string) {
  const ledger = await prisma.ledger.findUnique({
    where: { id: ledgerId },
    select: {
      id: true,
      userId: true,
      status: true,
      type: true,
    },
  });

  if (!ledger || ledger.type !== 'FINE') {
    return null;
  }

  const paid = ledger.status === 'PAID' || ledger.status === 'COMPLETED';

  await prisma.disciplinaryAction.updateMany({
    where: { fineLedgerId: ledger.id },
    data: {
      isPaid: paid,
      isReleased: paid,
    },
  });

  await syncDisciplinaryStateForUser(ledger.userId);
  return ledger;
}
