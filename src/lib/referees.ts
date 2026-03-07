import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { NextRequest } from 'next/server';

const EARNING_RATES_BY_DIVISION_LEVEL: Record<number, number> = {
  1: 75,
  2: 60,
  3: 45,
};

export async function getRefActor(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
    },
  });
}

export function getRefMatchRate(divisionLevel?: number | null) {
  return EARNING_RATES_BY_DIVISION_LEVEL[divisionLevel || 3] || 45;
}

export async function getRefProfile(userId: string) {
  const [latestBackgroundCheck, latestCertification, payoutStats] = await Promise.all([
    prisma.backgroundCheck.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.officialCertification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ledger.aggregate({
      where: { userId, type: 'REF_PAYOUT', status: 'COMPLETED' },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const certificationUploaded = Boolean(
    latestCertification &&
      latestCertification.status === 'ACTIVE' &&
      (!latestCertification.expiresAt || latestCertification.expiresAt > new Date())
  );

  return {
    userId,
    backgroundCheckStatus: latestBackgroundCheck?.status || 'NOT_INITIATED',
    backgroundCheckExpiresAt: latestBackgroundCheck?.expiresAt?.toISOString() || null,
    certificationUploaded,
    certificationExpiry: latestCertification?.expiresAt?.toISOString() || null,
    certificationType: latestCertification?.certificationType || null,
    totalPayouts: Number(payoutStats._sum.amount || 0),
    gamesWorked: payoutStats._count.id || 0,
  };
}
