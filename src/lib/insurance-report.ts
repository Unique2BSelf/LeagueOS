import { prisma } from '@/lib/prisma';

export type InsuranceReportFilters = {
  seasonId?: string | null;
  status?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export type InsuranceReportRow = {
  registrationId: string;
  seasonId: string;
  seasonName: string;
  playerId: string;
  playerName: string;
  email: string;
  registrationStatus: string;
  paid: boolean;
  amount: number;
  registeredAt: string;
  insuranceStatus: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'MISSING';
  insuranceEffectiveDate: string | null;
  insuranceExpiry: string | null;
  insuranceProvider: string | null;
};

export async function buildInsuranceComplianceReport(filters: InsuranceReportFilters) {
  const where: Record<string, unknown> = {};

  if (filters.seasonId) {
    where.seasonId = filters.seasonId;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
  }

  const registrations = await prisma.registration.findMany({
    where,
    include: {
      season: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          insurancePolicies: {
            where: {
              status: 'ACTIVE',
            },
            orderBy: {
              endDate: 'desc',
            },
            take: 1,
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const now = new Date();

  const rows: InsuranceReportRow[] = registrations.map((registration) => {
    const policy = registration.user.insurancePolicies[0] || null;
    let insuranceStatus: InsuranceReportRow['insuranceStatus'] = 'MISSING';

    if (policy) {
      if (policy.endDate <= now) {
        insuranceStatus = 'EXPIRED';
      } else {
        const daysRemaining = Math.ceil((policy.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        insuranceStatus = daysRemaining <= 30 ? 'EXPIRING' : 'ACTIVE';
      }
    }

    return {
      registrationId: registration.id,
      seasonId: registration.season.id,
      seasonName: registration.season.name,
      playerId: registration.user.id,
      playerName: registration.user.fullName,
      email: registration.user.email,
      registrationStatus: registration.status,
      paid: registration.paid,
      amount: registration.amount,
      registeredAt: registration.createdAt.toISOString(),
      insuranceStatus,
      insuranceEffectiveDate: policy?.startDate.toISOString() || null,
      insuranceExpiry: policy?.endDate.toISOString() || null,
      insuranceProvider: policy?.provider || null,
    };
  });

  const filteredRows = filters.status
    ? rows.filter((row) => {
        switch (filters.status) {
          case 'paid':
            return row.paid;
          case 'unpaid':
            return !row.paid;
          case 'active':
            return row.insuranceStatus === 'ACTIVE';
          case 'expiring':
            return row.insuranceStatus === 'EXPIRING';
          case 'expired':
            return row.insuranceStatus === 'EXPIRED';
          case 'missing':
            return row.insuranceStatus === 'MISSING';
          default:
            return true;
        }
      })
    : rows;

  const summary = {
    totalRows: filteredRows.length,
    paidCount: filteredRows.filter((row) => row.paid).length,
    unpaidCount: filteredRows.filter((row) => !row.paid).length,
    activeInsuranceCount: filteredRows.filter((row) => row.insuranceStatus === 'ACTIVE').length,
    expiringInsuranceCount: filteredRows.filter((row) => row.insuranceStatus === 'EXPIRING').length,
    expiredInsuranceCount: filteredRows.filter((row) => row.insuranceStatus === 'EXPIRED').length,
    missingInsuranceCount: filteredRows.filter((row) => row.insuranceStatus === 'MISSING').length,
  };

  return {
    rows: filteredRows,
    summary,
    filters: {
      seasonId: filters.seasonId || null,
      status: filters.status || null,
      dateFrom: filters.dateFrom || null,
      dateTo: filters.dateTo || null,
    },
  };
}

export function convertInsuranceReportToCsv(rows: InsuranceReportRow[]) {
  const headers = [
    'Season',
    'Player Name',
    'Email',
    'Registration Status',
    'Paid',
    'Amount',
    'Registered At',
    'Insurance Status',
    'Insurance Effective Date',
    'Insurance Expiry',
    'Insurance Provider',
  ];

  const escape = (value: string | number | boolean | null) => {
    const normalized = value === null ? '' : String(value);
    return `"${normalized.replace(/"/g, '""')}"`;
  };

  const dataRows = rows.map((row) => [
    row.seasonName,
    row.playerName,
    row.email,
    row.registrationStatus,
    row.paid ? 'Yes' : 'No',
    row.amount,
    row.registeredAt,
    row.insuranceStatus,
    row.insuranceEffectiveDate,
    row.insuranceExpiry,
    row.insuranceProvider,
  ]);

  return [headers, ...dataRows]
    .map((row) => row.map(escape).join(','))
    .join('\n');
}
