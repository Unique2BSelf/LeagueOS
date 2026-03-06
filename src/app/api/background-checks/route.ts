import { NextRequest, NextResponse } from 'next/server';

/**
 * Background Check API per PRD:
 * - POST /api/background-checks/initiate → Starts check via API
 * - GET /api/background-checks/status → Get check status
 * - Block ref job board access until CLEAR
 */

interface BackgroundCheck {
  id: string;
  userId: string;
  provider: string;
  status: 'PENDING' | 'CLEAR' | 'FAIL' | 'EXPIRED';
  resultUrl?: string;
  expiresAt?: string;
  createdAt: string;
}

// In-memory storage
const checks: Map<string, BackgroundCheck> = new Map();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    // Return all checks
    return NextResponse.json({
      checks: Array.from(checks.values()),
    });
  }
  
  // Get user's latest check
  const userChecks = Array.from(checks.values())
    .filter(c => c.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  if (userChecks.length === 0) {
    return NextResponse.json({
      status: 'NOT_INITIATED',
      message: 'No background check on file',
    });
  }
  
  const latest = userChecks[0];
  const isExpired = latest.expiresAt && new Date(latest.expiresAt) < new Date();
  
  return NextResponse.json({
    ...latest,
    isExpired: isExpired || latest.status === 'EXPIRED',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, provider = 'Checkr' } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId required' },
        { status: 400 }
      );
    }
    
    if (action === 'initiate') {
      // Create new background check
      const check: BackgroundCheck = {
        id: 'bg-' + Date.now(),
        userId,
        provider,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      };
      
      checks.set(check.id, check);
      
      // Simulate async verification process
      // In production: call Checkr/Sterling API
      
      return NextResponse.json({
        success: true,
        check,
        message: 'Background check initiated. This usually takes 1-2 business days.',
      });
    }
    
    if (action === 'verify') {
      // Simulate verification result (for demo)
      const userChecks = Array.from(checks.values())
        .filter(c => c.userId === userId);
      
      if (userChecks.length === 0) {
        return NextResponse.json(
          { error: 'No background check found. Initiate one first.' },
          { status: 404 }
        );
      }
      
      const check = userChecks[0];
      
      // Simulate random result (90% pass rate)
      const passed = Math.random() > 0.1;
      
      check.status = passed ? 'CLEAR' : 'FAIL';
      
      return NextResponse.json({
        success: true,
        check,
        message: passed 
          ? 'Background check CLEARED'
          : 'Background check FAILED. Please contact support.',
      });
    }
    
    if (action === 'simulate-clear') {
      // For demo: immediately clear a check
      const userChecks = Array.from(checks.values())
        .filter(c => c.userId === userId);
      
      if (userChecks.length > 0) {
        userChecks[0].status = 'CLEAR';
        return NextResponse.json({ success: true, check: userChecks[0] });
      }
      
      // Create a cleared check
      const check: BackgroundCheck = {
        id: 'bg-' + Date.now(),
        userId,
        provider,
        status: 'CLEAR',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };
      checks.set(check.id, check);
      
      return NextResponse.json({ success: true, check });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use: initiate, verify, or simulate-clear' },
      { status: 400 }
    );
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Check if user can access ref jobs
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { userId, checkAccess = true } = body;
  
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }
  
  const userChecks = Array.from(checks.values())
    .filter(c => c.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  if (userChecks.length === 0) {
    return NextResponse.json({
      canAccessRefJobs: false,
      reason: 'No background check on file',
    });
  }
  
  const latest = userChecks[0];
  const isClear = latest.status === 'CLEAR';
  const isNotExpired = !latest.expiresAt || new Date(latest.expiresAt) > new Date();
  
  if (checkAccess) {
    return NextResponse.json({
      canAccessRefJobs: isClear && isNotExpired,
      status: latest.status,
      expiresAt: latest.expiresAt,
      isExpired: !isNotExpired,
    });
  }
  
  return NextResponse.json({
    check: latest,
    canAccessRefJobs: isClear && isNotExpired,
  });
}
