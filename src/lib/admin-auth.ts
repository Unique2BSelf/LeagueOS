import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export type AdminActor = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

export async function getAdminActor(request: NextRequest): Promise<AdminActor | null> {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return null;
  }

  const actor = await prisma.user.findUnique({
    where: { id: userId },
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
