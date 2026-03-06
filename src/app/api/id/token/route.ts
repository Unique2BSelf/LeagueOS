import { NextRequest, NextResponse } from 'next/server';
import { issueDigitalIdToken } from '@/lib/digital-id';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { token, expiresAt } = issueDigitalIdToken(userId);

  return NextResponse.json({
    token,
    expiresAt,
    refreshInMs: Math.max(0, expiresAt - Date.now()),
  });
}
