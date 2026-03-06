import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

function isE2EEnabled() {
  return process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true';
}

async function ensureUser(email: string, fullName: string, role: 'PLAYER' | 'CAPTAIN' | 'ADMIN') {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { fullName, role, isInsured: true, insuranceExpiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) },
    });
  }

  return prisma.user.create({
    data: {
      email,
      fullName,
      role,
      password: await hashPassword('Password123!'),
      isInsured: true,
      insuranceExpiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isE2EEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const label = typeof body.label === 'string' ? body.label : `${Date.now()}`;
  const requesterEmail = typeof body.requesterEmail === 'string' ? body.requesterEmail : '';
  const claimantEmail = typeof body.claimantEmail === 'string' ? body.claimantEmail : '';

  if (!requesterEmail || !claimantEmail) {
    return NextResponse.json({ error: 'requesterEmail and claimantEmail are required' }, { status: 400 });
  }

  const season = await prisma.season.create({
    data: {
      name: `E2E Player Flow ${label}`,
      startDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
      minRosterSize: 8,
      maxRosterSize: 16,
      subQuota: 10,
    },
  });

  const division = await prisma.division.create({
    data: {
      name: `Division ${label}`,
      level: 2,
      seasonId: season.id,
    },
  });

  const location = await prisma.location.create({
    data: {
      name: `Player Flow Park ${label}`,
      address: '42 Fixture Lane',
    },
  });

  const field = await prisma.field.create({
    data: {
      locationId: location.id,
      name: `Match Field ${label}`,
      qualityScore: 4,
      hasLights: true,
    },
  });

  const [captainA, captainB, captainC, requester, claimant] = await Promise.all([
    ensureUser(`captain-a-${label}@leagueos.local`, `Captain A ${label}`, 'CAPTAIN'),
    ensureUser(`captain-b-${label}@leagueos.local`, `Captain B ${label}`, 'CAPTAIN'),
    ensureUser(`captain-c-${label}@leagueos.local`, `Captain C ${label}`, 'CAPTAIN'),
    ensureUser(requesterEmail, `Requester ${label}`, 'PLAYER'),
    ensureUser(claimantEmail, `Claimant ${label}`, 'PLAYER'),
  ]);

  const [teamA, teamB, teamC] = await Promise.all([
    prisma.team.create({
      data: {
        name: `Requester FC ${label}`,
        captainId: captainA.id,
        divisionId: division.id,
        seasonId: season.id,
        primaryColor: '#FF0000',
        secondaryColor: '#FFFFFF',
        escrowTarget: 2000,
        approvalStatus: 'APPROVED',
        isConfirmed: true,
      },
    }),
    prisma.team.create({
      data: {
        name: `Claimant FC ${label}`,
        captainId: captainB.id,
        divisionId: division.id,
        seasonId: season.id,
        primaryColor: '#0000FF',
        secondaryColor: '#FFFFFF',
        escrowTarget: 2000,
        approvalStatus: 'APPROVED',
        isConfirmed: true,
      },
    }),
    prisma.team.create({
      data: {
        name: `Opponent FC ${label}`,
        captainId: captainC.id,
        divisionId: division.id,
        seasonId: season.id,
        primaryColor: '#00AA00',
        secondaryColor: '#FFFFFF',
        escrowTarget: 2000,
        approvalStatus: 'APPROVED',
        isConfirmed: true,
      },
    }),
  ]);

  await prisma.teamPlayer.createMany({
    data: [
      { userId: captainA.id, teamId: teamA.id, status: 'APPROVED' },
      { userId: requester.id, teamId: teamA.id, status: 'APPROVED' },
      { userId: captainB.id, teamId: teamB.id, status: 'APPROVED' },
      { userId: claimant.id, teamId: teamB.id, status: 'APPROVED' },
      { userId: captainC.id, teamId: teamC.id, status: 'APPROVED' },
    ],
  });

  const match = await prisma.match.create({
    data: {
      scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      fieldId: field.id,
      homeTeamId: teamA.id,
      awayTeamId: teamC.id,
      seasonId: season.id,
      status: 'SCHEDULED',
      matchType: 'REGULAR',
      gameLengthMinutes: 60,
    },
  });

  return NextResponse.json({
    seasonId: season.id,
    matchId: match.id,
    requesterTeamName: teamA.name,
    claimantTeamName: teamB.name,
    opponentTeamName: teamC.name,
  });
}

