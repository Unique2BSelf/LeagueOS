import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildSessionResponse, clearSessionCookie, type PublicUser } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

function isE2EEnabled() {
  return process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true';
}

export async function POST(request: NextRequest) {
  if (!isE2EEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.toLowerCase() : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName : 'E2E User';
  const role = typeof body.role === 'string' ? body.role : 'PLAYER';

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: await hashPassword('Password123!'),
        role,
        photoUrl: null,
      },
    });
  } else if (user.role !== role) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role, fullName },
    });
  }

  const publicUser: PublicUser = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    photoUrl: user.photoUrl,
  };

  return buildSessionResponse(publicUser);
}

export async function DELETE() {
  if (!isE2EEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
