import { NextRequest, NextResponse } from 'next/server';

/**
 * Referee Job Board API per PRD:
 * - Self-select games from job board
 * - Background check gate (must be CLEAR to claim)
 * - Certification requirement check
 * - Payout tracking
 */

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

// Mock available games
const jobs: RefJob[] = [
  { id: 'job-1', matchId: 'match-101', homeTeam: 'Thunder FC', awayTeam: 'Velocity SC', scheduledAt: '2026-03-07T10:00:00Z', field: 'Field 1', division: 'Premier', divisionLevel: 1, pay: 75, status: 'OPEN' },
  { id: 'job-2', matchId: 'match-102', homeTeam: 'Apex United', awayTeam: 'Phoenix FC', scheduledAt: '2026-03-07T10:00:00Z', field: 'Field 2', division: 'Premier', divisionLevel: 1, pay: 75, status: 'OPEN' },
  { id: 'job-3', matchId: 'match-103', homeTeam: 'Eagle Rangers', awayTeam: 'Wolf Pack', scheduledAt: '2026-03-07T12:00:00Z', field: 'Field 3', division: 'Competitive', divisionLevel: 2, pay: 60, status: 'OPEN' },
  { id: 'job-4', matchId: 'match-104', homeTeam: 'Titan FC', awayTeam: 'Blaze SC', scheduledAt: '2026-03-07T12:00:00Z', field: 'Field 1', division: 'Premier', divisionLevel: 1, pay: 75, status: 'OPEN' },
  { id: 'job-5', matchId: 'match-105', homeTeam: 'Hawk City', awayTeam: 'Panther FC', scheduledAt: '2026-03-08T10:00:00Z', field: 'Field 2', division: 'Competitive', divisionLevel: 2, pay: 60, status: 'OPEN' },
  { id: 'job-6', matchId: 'match-106', homeTeam: 'Storm Riders', awayTeam: 'Night Hawks', scheduledAt: '2026-03-08T12:00:00Z', field: 'Field 1', division: 'Recreational', divisionLevel: 3, pay: 50, status: 'OPEN' },
];

// Mock referee data
interface RefProfile {
  userId: string;
  backgroundCheckStatus: 'CLEAR' | 'PENDING' | 'FAIL' | 'EXPIRED';
  backgroundCheckExpiresAt?: string;
  certificationUploaded: boolean;
  certificationExpiry?: string;
  totalPayouts: number;
  gamesWorked: number;
}

const refProfiles: Record<string, RefProfile> = {
  'ref-1': { 
    userId: 'ref-1', 
    backgroundCheckStatus: 'CLEAR', 
    backgroundCheckExpiresAt: '2027-01-01T00:00:00Z',
    certificationUploaded: true, 
    certificationExpiry: '2026-12-31T00:00:00Z',
    totalPayouts: 2500,
    gamesWorked: 32,
  },
  'ref-pending': { 
    userId: 'ref-pending', 
    backgroundCheckStatus: 'PENDING',
    certificationUploaded: true,
    totalPayouts: 0,
    gamesWorked: 0,
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'OPEN';
  const refId = searchParams.get('refId');
  const date = searchParams.get('date');
  
  let filteredJobs = [...jobs];
  
  // Filter by status
  if (status !== 'all') {
    filteredJobs = filteredJobs.filter(j => j.status === status);
  }
  
  // Filter by date
  if (date) {
    filteredJobs = filteredJobs.filter(j => j.scheduledAt.startsWith(date));
  }
  
  // If refId provided, include their profile info
  let refProfile = null;
  if (refId && refProfiles[refId]) {
    refProfile = refProfiles[refId];
  }
  
  // Get stats
  const stats = {
    openJobs: jobs.filter(j => j.status === 'OPEN').length,
    claimedJobs: jobs.filter(j => j.status === 'CLAIMED').length,
    totalPayAvailable: jobs.filter(j => j.status === 'OPEN').reduce((sum, j) => sum + j.pay, 0),
  };
  
  return NextResponse.json({
    jobs: filteredJobs,
    stats,
    refProfile,
    requirements: {
      backgroundCheck: 'Required - must be CLEAR',
      certification: 'Required - upload certification to claim games',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, refId, action } = body;
    
    if (!jobId || !refId) {
      return NextResponse.json(
        { error: 'jobId and refId are required' },
        { status: 400 }
      );
    }
    
    // Get ref profile
    const profile = refProfiles[refId];
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Ref profile not found' },
        { status: 404 }
      );
    }
    
    if (action === 'claim') {
      // Check requirements per PRD
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
      
      // Find and claim job
      const job = jobs.find(j => j.id === jobId);
      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }
      
      if (job.status !== 'OPEN') {
        return NextResponse.json(
          { error: 'Job is no longer available' },
          { status: 409 }
        );
      }
      
      // Claim the job
      job.status = 'CLAIMED';
      job.claimedBy = refId;
      job.claimedAt = new Date().toISOString();
      
      return NextResponse.json({
        success: true,
        job,
        message: `Successfully claimed ${job.homeTeam} vs ${job.awayTeam}`,
      });
    }
    
    if (action === 'release') {
      const job = jobs.find(j => j.id === jobId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      
      if (job.claimedBy !== refId) {
        return NextResponse.json(
          { error: 'You did not claim this job' },
          { status: 403 }
        );
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get ref stats
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { refId } = body;
  
  if (!refId) {
    return NextResponse.json({ error: 'refId required' }, { status: 400 });
  }
  
  const profile = refProfiles[refId];
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }
  
  // Get jobs claimed by this ref
  const myJobs = jobs.filter(j => j.claimedBy === refId);
  
  // Calculate earnings
  const pendingPayout = myJobs
    .filter(j => j.status === 'CLAIMED')
    .reduce((sum, j) => sum + j.pay, 0);
  
  const completedPayout = myJobs
    .filter(j => j.status === 'COMPLETED')
    .reduce((sum, j) => sum + j.pay, 0);
  
  return NextResponse.json({
    profile,
    myJobs,
    earnings: {
      pending: pendingPayout,
      completed: completedPayout,
      total: profile.totalPayouts,
    },
  });
}
