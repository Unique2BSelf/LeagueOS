import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

interface RefJob {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  scheduledAt: string;
  field: string;
  division: string;
  divisionLevel: number;
  pay: number;
  status: 'OPEN' | 'CLAIMED' | 'COMPLETED';
  claimedBy?: string;
  claimedAt?: string;
}

const jobs: RefJob[] = [
  { id: 'job-1', matchId: 'match-101', homeTeam: 'Thunder FC', awayTeam: 'Velocity SC', scheduledAt: '2026-03-07T10:00:00Z', field: 'Field 1', division: 'Premier', divisionLevel: 1, pay: 75, status: 'OPEN' },
  { id: 'job-2', matchId: 'match-102', homeTeam: 'Apex United', awayTeam: 'Phoenix FC', scheduledAt: '2026-03-07T10:00:00Z', field: 'Field 2', division: 'Premier', divisionLevel: 1, pay: 75, status: 'OPEN' },
  { id: 'job-3', matchId: 'match-103', homeTeam: 'Eagle Rangers', awayTeam: 'Wolf Pack', scheduledAt: '2026-03-07T12:00:00Z', field: 'Field 3', division: 'Competitive', divisionLevel: 2, pay: 60, status: 'OPEN' },
  { id: 'job-4', matchId: 'match-104', homeTeam: 'Titan FC', awayTeam: 'Blaze SC', scheduledAt: '2026-03-07T12:00:00Z', field: 'Field 1', division: 'Premier', divisionLevel: 1, pay: 75, status: 'OPEN' },
  { id: 'job-5', matchId: 'match-105', homeTeam: 'Hawk City', awayTeam: 'Panther FC', scheduledAt: '2026-03-08T10:00:00Z', field: 'Field 2', division: 'Competitive', divisionLevel: 2, pay: 60, status: 'OPEN' },
  { id: 'job-6', matchId: 'match-106', homeTeam: 'Storm Riders', awayTeam: 'Night Hawks', scheduledAt: '2026-03-08T12:00:00Z', field: 'Field 1', division: 'Recreational', divisionLevel: 3, pay: 50, status: 'OPEN' },
];

function getActor(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role') || 'PLAYER';
  return userId ? { userId, userRole } : null;
}

async function getRefProfile(userId: string) {
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

export async function GET(request: NextRequest) {
  try {
    const actor = getActor(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'OPEN';
    const date = searchParams.get('date');

    let filteredJobs = [...jobs];
    if (status !== 'all') {
      filteredJobs = filteredJobs.filter((job) => job.status === status);
    }
    if (date) {
      filteredJobs = filteredJobs.filter((job) => job.scheduledAt.startsWith(date));
    }

    const stats = {
      openJobs: jobs.filter((job) => job.status === 'OPEN').length,
      claimedJobs: jobs.filter((job) => job.status === 'CLAIMED').length,
      totalPayAvailable: jobs.filter((job) => job.status === 'OPEN').reduce((sum, job) => sum + job.pay, 0),
    };

    return NextResponse.json({
      jobs: filteredJobs,
      stats,
      refProfile: actor ? await getRefProfile(actor.userId) : null,
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
    const actor = getActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, action } = body;
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const profile = await getRefProfile(actor.userId);

    if (action === 'claim') {
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

      const job = jobs.find((entry) => entry.id === jobId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      if (job.status !== 'OPEN') {
        return NextResponse.json({ error: 'Job is no longer available' }, { status: 409 });
      }

      job.status = 'CLAIMED';
      job.claimedBy = actor.userId;
      job.claimedAt = new Date().toISOString();

      return NextResponse.json({
        success: true,
        job,
        message: `Successfully claimed ${job.homeTeam} vs ${job.awayTeam}`,
      });
    }

    if (action === 'release') {
      const job = jobs.find((entry) => entry.id === jobId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      if (job.claimedBy !== actor.userId && !['ADMIN', 'MODERATOR'].includes(actor.userRole)) {
        return NextResponse.json({ error: 'You did not claim this job' }, { status: 403 });
      }

      job.status = 'OPEN';
      job.claimedBy = undefined;
      job.claimedAt = undefined;

      return NextResponse.json({
        success: true,
        job,
        message: 'Job released back to pool',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Ref jobs POST error:', error);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const actor = getActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getRefProfile(actor.userId);
    const myJobs = jobs.filter((job) => job.claimedBy === actor.userId);
    const pendingPayout = myJobs.filter((job) => job.status === 'CLAIMED').reduce((sum, job) => sum + job.pay, 0);
    const completedPayout = myJobs.filter((job) => job.status === 'COMPLETED').reduce((sum, job) => sum + job.pay, 0);

    return NextResponse.json({
      profile,
      myJobs,
      earnings: {
        pending: pendingPayout,
        completed: completedPayout,
        total: profile.totalPayouts,
      },
    });
  } catch (error) {
    console.error('Ref jobs PUT error:', error);
    return NextResponse.json({ error: 'Failed to load ref stats' }, { status: 500 });
  }
}
