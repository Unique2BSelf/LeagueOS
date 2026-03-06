import { AuditActionType, AuditEntityType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { AdminActor } from '@/lib/admin-auth';

type AuditPayload = {
  actor: AdminActor;
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  notes?: string | null;
};

export async function createAuditLog(payload: AuditPayload) {
  return prisma.auditLog.create({
    data: {
      actorUserId: payload.actor.id,
      actorEmail: payload.actor.email,
      actionType: payload.actionType,
      entityType: payload.entityType,
      entityId: payload.entityId,
      before: payload.before ?? undefined,
      after: payload.after ?? undefined,
      notes: payload.notes ?? null,
    },
  });
}
