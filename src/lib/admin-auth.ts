import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export type AdminActor = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

export async function getAdminActor(request: NextRequest): Promise<AdminActor | null> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return null;
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });

  if (!actor || actor.role !== 'ADMIN') {
    return null;
  }

  return actor;
}
