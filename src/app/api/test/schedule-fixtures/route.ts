import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

function isE2EEnabled() {
  return process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true';
}

async function ensureUser(email: string, fullName: string, role: 'ADMIN' | 'CAPTAIN' | 'PLAYER') {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { fullName, role },
    });
  }

  return prisma.user.create({
    data: {
      email,
      fullName,
      role,
      password: await hashPassword('Password123!'),
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isE2EEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : `${Date.now()}`;
  const dateSeed = typeof body.dateSeed === 'string' ? body.dateSeed : null;
  const baseDate = dateSeed ? new Date(`${dateSeed}T12:00:00Z`) : new Date();
  const dates = [1, 8, 15].map((offset) => {
    const next = new Date(baseDate);
    next.setUTCDate(baseDate.getUTCDate() + offset);
    return next.toISOString().split('T')[0];
  });

  const season = await prisma.season.create({
    data: {
      name: `E2E Schedule ${label}`,
      startDate: new Date(`${dates[0]}T00:00:00Z`),
      endDate: new Date(`${dates[2]}T23:59:59Z`),
      minRosterSize: 8,
      maxRosterSize: 16,
      subQuota: 10,
    },
  });

  const division = await prisma.division.create({
    data: {
      name: `Premier ${label}`,
      level: 1,
      seasonId: season.id,
    },
  });

  const location = await prisma.location.create({
    data: {
      name: `E2E Complex ${label}`,
      address: '100 Test Pitch Way',
    },
  });

  const fields = await Promise.all([
    prisma.field.create({
      data: {
        locationId: location.id,
        name: `Field A ${label}`,
        qualityScore: 5,
        hasLights: true,
      },
    }),
    prisma.field.create({
      data: {
        locationId: location.id,
        name: `Field B ${label}`,
        qualityScore: 4,
        hasLights: true,
      },
    }),
  ]);

  const captains = await Promise.all([
    ensureUser(`captain-a-${label}@leagueos.local`, `Captain A ${label}`, 'CAPTAIN'),
    ensureUser(`captain-b-${label}@leagueos.local`, `Captain B ${label}`, 'CAPTAIN'),
    ensureUser(`captain-c-${label}@leagueos.local`, `Captain C ${label}`, 'CAPTAIN'),
    ensureUser(`captain-d-${label}@leagueos.local`, `Captain D ${label}`, 'CAPTAIN'),
  ]);

  const teamNames = [
    `Atlas FC ${label}`,
    `Borealis SC ${label}`,
    `Comet United ${label}`,
    `Drift City ${label}`,
  ];

  const teams = [];
  for (let index = 0; index < teamNames.length; index += 1) {
    const team = await prisma.team.create({
      data: {
        name: teamNames[index],
        captainId: captains[index].id,
        divisionId: division.id,
        seasonId: season.id,
        primaryColor: ['#FF0000', '#0000FF', '#00AA00', '#FF6600'][index],
        secondaryColor: '#FFFFFF',
        escrowTarget: 2000,
        approvalStatus: 'APPROVED',
        isConfirmed: true,
      },
    });

    await prisma.teamPlayer.create({
      data: {
        teamId: team.id,
        userId: captains[index].id,
        status: 'APPROVED',
      },
    });

    teams.push(team);
  }

  return NextResponse.json({
    seasonId: season.id,
    seasonName: season.name,
    divisionId: division.id,
    fieldIds: fields.map((field) => field.id),
    teamIds: teams.map((team) => team.id),
    teamNames,
    dates,
  });
}
