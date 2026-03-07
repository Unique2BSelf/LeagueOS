import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRefActor, getRefMatchRate, getRefProfile } from '@/lib/referees';

export const runtime = 'nodejs';

function getDivisionLabel(level?: number | null) {
  if (level === 1) return 'Premier';
  if (level === 2) return 'Competitive';
  return 'Recreational';
}

type RefJobMatch = {
  id: string;
  scheduledAt: Date;
  status: string;
  refId: string | null;
  fieldId: string;
  homeTeam: { name: string; division: { level: number } | null };
  awayTeam: { name: string; division: { level: number } | null };
};

async function getFieldLabelMap(fieldIds: string[]) {
  const uniqueIds = [...new Set(fieldIds)];
  if (uniqueIds.length === 0) {
    return new Map<string, string>();
  }

  const fields = await prisma.field.findMany({
    where: { id: { in: uniqueIds } },
    include: { location: true },
  });

  return new Map(fields.map((field) => [
    field.id,
    field.location ? `${field.location.name} · ${field.name}` : field.name,
  ]));
}

function serializeJob(match: RefJobMatch, actorId: string, fieldLabel: string) {
  const divisionLevel = match.homeTeam.division?.level ?? match.awayTeam.division?.level ?? 3;

  return {
    id: match.id,
    matchId: match.id,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    scheduledAt: match.scheduledAt.toISOString(),
    field: fieldLabel,
    division: getDivisionLabel(divisionLevel),
    divisionLevel,
    pay: getRefMatchRate(divisionLevel),
    status: match.status === 'FINAL' ? 'COMPLETED' : match.refId === actorId ? 'CLAIMED' : 'OPEN',
    claimedBy: match.refId || undefined,
  } as const;
}

export async function GET(request: NextRequest) {
  try {
    const actor = await getRefActor(request);
    if (!actor || !actor.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const now = new Date();

    const matches = await prisma.match.findMany({
      where: {
        OR: [
          {
            status: 'SCHEDULED',
            scheduledAt: { gte: now },
            refId: null,
          },
          {
            refId: actor.id,
            status: { in: ['SCHEDULED', 'FINAL'] },
          },
        ],
      },
      include: {
        homeTeam: { include: { division: true } },
        awayTeam: { include: { division: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 50,
    });

    const fieldLabelMap = await getFieldLabelMap(matches.map((match) => match.fieldId));
    const jobs = matches.map((match) => serializeJob(match, actor.id, fieldLabelMap.get(match.fieldId) || 'Field TBD'));
    const filteredJobs = status === 'all' ? jobs : jobs.filter((job) => job.status === status);

    return NextResponse.json({
      jobs: filteredJobs,
      stats: {
        openJobs: jobs.filter((job) => job.status === 'OPEN').length,
        claimedJobs: jobs.filter((job) => job.status === 'CLAIMED').length,
        totalPayAvailable: jobs.filter((job) => job.status === 'OPEN').reduce((sum, job) => sum + job.pay, 0),
      },
      refProfile: await getRefProfile(actor.id),
      requirements: {
        backgroundCheck: 'Required - must be CLEAR',
        certification: 'Required - active certification upload on file',
      },
    });
  } catch (error) {
    console.error('Ref jobs GET error:', error);
    return NextResponse.json({ error: 'Failed to load job board' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getRefActor(request);
    if (!actor || !actor.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const jobId = typeof body.jobId === 'string' ? body.jobId : '';
    const action = typeof body.action === 'string' ? body.action : '';

    if (!jobId || !action) {
      return NextResponse.json({ error: 'jobId and action are required' }, { status: 400 });
    }

    const profile = await getRefProfile(actor.id);
    const match = await prisma.match.findUnique({
      where: { id: jobId },
      include: {
        homeTeam: { include: { division: true } },
        awayTeam: { include: { division: true } },
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (action === 'claim') {
      if (match.status !== 'SCHEDULED' || match.refId) {
        return NextResponse.json({ error: 'Job is no longer available' }, { status: 409 });
      }

      if (profile.backgroundCheckStatus !== 'CLEAR') {
        return NextResponse.json({
          error: 'Background check must be CLEAR to claim games',
          code: 'BACKGROUND_CHECK_REQUIRED',
          currentStatus: profile.backgroundCheckStatus,
        }, { status: 403 });
      }

      if (!profile.certificationUploaded) {
        return NextResponse.json({
          error: 'Certification must be uploaded to claim games',
          code: 'CERTIFICATION_REQUIRED',
        }, { status: 403 });
      }

      const updated = await prisma.match.update({
        where: { id: jobId },
        data: { refId: actor.id },
        include: {
          homeTeam: { include: { division: true } },
          awayTeam: { include: { division: true } },
        },
      });
      const fieldLabelMap = await getFieldLabelMap([updated.fieldId]);

      return NextResponse.json({
        success: true,
        job: serializeJob(updated, actor.id, fieldLabelMap.get(updated.fieldId) || 'Field TBD'),
        message: `Successfully claimed ${updated.homeTeam.name} vs ${updated.awayTeam.name}`,
      });
    }

    if (action === 'release') {
      if (match.refId !== actor.id && !['ADMIN', 'MODERATOR'].includes(actor.role)) {
        return NextResponse.json({ error: 'You did not claim this job' }, { status: 403 });
      }

      if (match.status === 'FINAL') {
        return NextResponse.json({ error: 'Completed matches cannot be released' }, { status: 409 });
      }

      const updated = await prisma.match.update({
        where: { id: jobId },
        data: { refId: null },
        include: {
          homeTeam: { include: { division: true } },
          awayTeam: { include: { division: true } },
        },
      });
      const fieldLabelMap = await getFieldLabelMap([updated.fieldId]);

      return NextResponse.json({
        success: true,
        job: serializeJob(updated, actor.id, fieldLabelMap.get(updated.fieldId) || 'Field TBD'),
        message: 'Job released back to pool',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Ref jobs POST error:', error);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}
