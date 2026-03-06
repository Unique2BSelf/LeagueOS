import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const DEFAULT_TTL_MS = 1000 * 60;
const DEFAULT_SECRET = 'league-os-dev-secret-change-me';

export interface DigitalIdPayload {
  sub: string;
  iat: number;
  exp: number;
  jti: string;
}

export interface DigitalIdStatus {
  id: string;
  fullName: string;
  role: string;
  photoUrl: string | null;
  backgroundCheckStatus: string;
  isInsured: boolean;
  insuranceExpiry: string | null;
  isActive: boolean;
  isSuspended: boolean;
  hasUnpaidFines: boolean;
  unpaidFineAmount: number;
  lockReason: string | null;
  valid: boolean;
  reason: string | null;
}

function getSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || DEFAULT_SECRET;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(encodedPayload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
}

export function issueDigitalIdToken(userId: string, ttlMs = DEFAULT_TTL_MS): { token: string; expiresAt: number } {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + ttlMs;
  const payload: DigitalIdPayload = {
    sub: userId,
    iat: issuedAt,
    exp: expiresAt,
    jti: crypto.randomUUID(),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt,
  };
}

export function verifyDigitalIdToken(token: string): DigitalIdPayload | null {
  const [encodedPayload, providedSignature] = token.split('.');

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  if (
    expectedSignature.length !== providedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as DigitalIdPayload;
    if (!payload.sub || !payload.exp || payload.exp <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function getDigitalIdStatus(userId: string): Promise<DigitalIdStatus | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      role: true,
      photoUrl: true,
      isActive: true,
      backgroundCheckStatus: true,
      lockReason: true,
      suspensionEndDate: true,
    },
  });

  if (!user) {
    return null;
  }

  const unpaidFines = await prisma.ledger.findMany({
    where: { userId, status: 'PENDING', type: 'FINE' },
    select: { amount: true },
  });
  const unpaidFineAmount = unpaidFines.reduce((sum, fine) => sum + Number(fine.amount), 0);

  const insurance = await prisma.insurancePolicy.findFirst({
    where: { userId, status: 'ACTIVE', endDate: { gt: new Date() } },
    orderBy: { endDate: 'desc' },
  });

  const isSuspended = !!(user.suspensionEndDate && user.suspensionEndDate > new Date());
  const hasUnpaidFines = unpaidFineAmount > 0;
  const isInsured = !!insurance;
  const valid = user.isActive && !isSuspended && !hasUnpaidFines && isInsured;

  const reason =
    user.lockReason ||
    (hasUnpaidFines
      ? `Unpaid fine: $${unpaidFineAmount.toFixed(2)}`
      : !isInsured
        ? 'Insurance expired or missing'
        : isSuspended
          ? 'Suspension active'
          : !user.isActive
            ? 'Account inactive'
            : null);

  return {
    id: user.id,
    fullName: user.fullName,
    role: user.role,
    photoUrl: user.photoUrl,
    backgroundCheckStatus: user.backgroundCheckStatus || 'PENDING',
    isInsured,
    insuranceExpiry: insurance?.endDate?.toISOString() || null,
    isActive: user.isActive,
    isSuspended,
    hasUnpaidFines,
    unpaidFineAmount,
    lockReason: user.lockReason,
    valid,
    reason,
  };
}
