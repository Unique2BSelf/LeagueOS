import { NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'leagueos_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const DEFAULT_SECRET = 'league-os-dev-secret-change-me';

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  photoUrl: string | null;
}

export interface SessionPayload {
  userId: string;
  role: string;
  expiresAt: number;
}

function getSessionSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || DEFAULT_SECRET;
}

async function importSigningKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function signValue(value: string): Promise<string> {
  const key = await importSigningKey();
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return toHex(new Uint8Array(signature));
}

export function getSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const unsigned = [encodeURIComponent(payload.userId), encodeURIComponent(payload.role), String(payload.expiresAt)].join('|');
  const signature = await signValue(unsigned);
  return `${unsigned}|${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  const parts = token.split('|');
  if (parts.length !== 4) {
    return null;
  }

  const [encodedUserId, encodedRole, expiresAtRaw, providedSignature] = parts;
  const unsigned = [encodedUserId, encodedRole, expiresAtRaw].join('|');
  const expectedSignature = await signValue(unsigned);

  if (expectedSignature !== providedSignature) {
    return null;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }

  return {
    userId: decodeURIComponent(encodedUserId),
    role: decodeURIComponent(encodedRole),
    expiresAt,
  };
}

export async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });
}

export async function buildSessionResponse(user: PublicUser, init?: ResponseInit): Promise<NextResponse> {
  const expiresAt = getSessionExpiry();
  const token = await createSessionToken({ userId: user.id, role: user.role, expiresAt: expiresAt.getTime() });
  const response = NextResponse.json(user, init);
  setSessionCookie(response, token, expiresAt);
  return response;
}

export function toPublicUser(user: { id: string; fullName: string; email: string; role: string; photoUrl: string | null }): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    photoUrl: user.photoUrl,
  };
}
