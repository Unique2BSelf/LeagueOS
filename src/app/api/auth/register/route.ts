import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildSessionResponse, toPublicUser } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export async function POST(req: Request) {
  try {
    const {
      fullName,
      email,
      password,
      photoUrl,
      role,
      skillSpeed,
      skillTechnical,
      skillStamina,
      skillTeamwork,
      skillDefense,
      skillAttack,
      isGoalie,
      isFreeAgent,
      freeAgentSeasonId,
    } = await req.json();

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!photoUrl) {
      return NextResponse.json({ error: 'Photo is required for registration' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        fullName,
        email: normalizedEmail,
        password: await hashPassword(password),
        photoUrl,
        role: role || 'PLAYER',
        isInsured: false,
        eloRating: 1200,
        isGoalie: Boolean(isGoalie),
        isActive: true,
        hideFromDirectory: false,
        skillSpeed: Math.min(5, Math.max(1, skillSpeed || 3)),
        skillTechnical: Math.min(5, Math.max(1, skillTechnical || 3)),
        skillStamina: Math.min(5, Math.max(1, skillStamina || 3)),
        skillTeamwork: Math.min(5, Math.max(1, skillTeamwork || 3)),
        skillDefense: Math.min(5, Math.max(1, skillDefense || 3)),
        skillAttack: Math.min(5, Math.max(1, skillAttack || 3)),
        isFreeAgent: Boolean(isFreeAgent),
        freeAgentSeasonId,
      },
    });

    return buildSessionResponse(toPublicUser(user), { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

