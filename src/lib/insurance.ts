import { prisma } from '@/lib/prisma';
import { resolveRegistrationStatus } from '@/lib/registrations';

export function resolveInsuranceStatus(endDate: Date) {
  return endDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'EXPIRING_SOON' : 'VALID';
}

export async function syncRegistrationsForActiveInsurance(userId: string, startDate: Date, endDate: Date) {
  const insuranceStatus = resolveInsuranceStatus(endDate);
  const registrations = await prisma.registration.findMany({
    where: {
      userId,
      status: { not: 'REJECTED' },
    },
    select: {
      id: true,
      paid: true,
      status: true,
    },
  });

  await Promise.all(registrations.map((registration) => (
    prisma.registration.update({
      where: { id: registration.id },
      data: {
        insuranceStatus,
        insurancePurchasedAt: startDate,
        status: resolveRegistrationStatus({
          paid: registration.paid,
          insuranceStatus,
          currentStatus: registration.status,
        }),
      },
    })
  )));
}

export async function activateAnnualInsuranceForUser(input: {
  userId: string;
  provider?: string | null;
  cost?: number | null;
  stripePaymentId?: string | null;
}) {
  const existing = await prisma.insurancePolicy.findFirst({
    where: {
      userId: input.userId,
      status: 'ACTIVE',
      endDate: { gt: new Date() },
    },
    orderBy: { endDate: 'desc' },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: input.userId },
      data: {
        isInsured: true,
        insuranceExpiry: existing.endDate,
      },
    });

    await syncRegistrationsForActiveInsurance(input.userId, existing.startDate, existing.endDate);
    return existing;
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 365);

  const policy = await prisma.insurancePolicy.create({
    data: {
      userId: input.userId,
      provider: input.provider || 'LEAGUE_PROVIDED',
      startDate,
      endDate,
      cost: input.cost ?? 50,
      status: 'ACTIVE',
      stripePaymentId: input.stripePaymentId || null,
    },
  });

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      isInsured: true,
      insuranceExpiry: endDate,
    },
  });

  await syncRegistrationsForActiveInsurance(input.userId, startDate, endDate);
  return policy;
}
