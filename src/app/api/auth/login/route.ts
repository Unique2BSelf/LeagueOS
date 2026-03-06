import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildSessionResponse, toPublicUser } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return Response.json({ error: 'Email and password required' }, { status: 400 });
  }

  const normalizedEmail = String(email).toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const passwordCheck = await verifyPassword(password, user.password);
  if (!passwordCheck.valid) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  if (passwordCheck.needsUpgrade) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(password) },
    });
  }

  return buildSessionResponse(toPublicUser(user));
}

