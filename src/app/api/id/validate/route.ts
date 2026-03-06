import { NextRequest, NextResponse } from 'next/server';
import { getDigitalIdStatus, verifyDigitalIdToken } from '@/lib/digital-id';

const ALLOWED_ROLES = new Set(['ADMIN', 'MODERATOR', 'REF']);

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');

  if (!userId || !role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token.trim() : '';

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const payload = verifyDigitalIdToken(token);
  if (!payload) {
    return NextResponse.json({ valid: false, error: 'Invalid or expired ID token' }, { status: 400 });
  }

  const status = await getDigitalIdStatus(payload.sub);
  if (!status) {
    return NextResponse.json({ valid: false, error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    valid: status.valid,
    checkedAt: new Date().toISOString(),
    expiresAt: new Date(payload.exp).toISOString(),
    player: status,
  });
}
