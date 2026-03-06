import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminActor } from '@/lib/admin-auth';
import { createAuditLog } from '@/lib/audit';
import { queueAndSendEmail } from '@/lib/email';

async function resolveRecipients(input: {
  audienceType: string;
  seasonId?: string | null;
  divisionId?: string | null;
  teamId?: string | null;
}) {
  switch (input.audienceType) {
    case 'ALL_PLAYERS':
      return prisma.user.findMany({
        where: { role: 'PLAYER', isActive: true },
        select: { id: true, fullName: true, email: true },
      });
    case 'REFEREES':
      return prisma.user.findMany({
        where: { role: 'REF', isActive: true },
        select: { id: true, fullName: true, email: true },
      });
    case 'SEASON':
      if (!input.seasonId) throw new Error('seasonId is required');
      return prisma.user.findMany({
        where: {
          registrations: {
            some: { seasonId: input.seasonId },
          },
        },
        select: { id: true, fullName: true, email: true },
      });
    case 'DIVISION':
      if (!input.divisionId) throw new Error('divisionId is required');
      return prisma.user.findMany({
        where: {
          teams: {
            some: {
              status: 'APPROVED',
              team: { divisionId: input.divisionId },
            },
          },
        },
        select: { id: true, fullName: true, email: true },
      });
    case 'TEAM':
      if (!input.teamId) throw new Error('teamId is required');
      return prisma.user.findMany({
        where: {
          teams: {
            some: {
              teamId: input.teamId,
              status: 'APPROVED',
            },
          },
        },
        select: { id: true, fullName: true, email: true },
      });
    default:
      throw new Error('Unsupported audience type');
  }
}

export async function GET(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const [emails, seasons, divisions, teams] = await Promise.all([
      prisma.outboundEmail.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.season.findMany({
        where: { isArchived: false },
        orderBy: { startDate: 'desc' },
        select: { id: true, name: true },
      }),
      prisma.division.findMany({
        orderBy: [{ season: { startDate: 'desc' } }, { level: 'asc' }],
        include: { season: { select: { name: true } } },
      }),
      prisma.team.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, division: { select: { name: true } } },
      }),
    ]);

    return NextResponse.json({
      recentEmails: emails,
      options: {
        seasons,
        divisions: divisions.map((division) => ({
          id: division.id,
          name: division.name,
          seasonName: division.season.name,
        })),
        teams: teams.map((team) => ({
          id: team.id,
          name: team.name,
          divisionName: team.division?.name || 'Open',
        })),
      },
    });
  } catch (error) {
    console.error('Communications GET error:', error);
    return NextResponse.json({ error: 'Failed to load communications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { audienceType, seasonId, divisionId, teamId, subject, message } = body;

    if (!audienceType || !subject || !message) {
      return NextResponse.json({ error: 'audienceType, subject, and message are required' }, { status: 400 });
    }

    const recipients = await resolveRecipients({ audienceType, seasonId, divisionId, teamId });
    const deduped = Array.from(new Map(recipients.map((recipient) => [recipient.email, recipient])).values());

    const results = [];
    for (const recipient of deduped) {
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
          <p>Hi ${recipient.fullName},</p>
          <p>${String(message).replace(/\n/g, '<br />')}</p>
        </div>
      `.trim();

      const email = await queueAndSendEmail({
        toEmail: recipient.email,
        toName: recipient.fullName,
        subject,
        htmlBody,
        textBody: `Hi ${recipient.fullName},\n\n${message}`,
        templateType: 'ADMIN_BROADCAST',
        audienceType,
        sentByUserId: actor.id,
        relatedSeasonId: seasonId || null,
        relatedTeamId: teamId || null,
        relatedDivisionId: divisionId || null,
        metadata: {
          recipientUserId: recipient.id,
        },
      });
      results.push(email);
    }

    await createAuditLog({
      actor,
      actionType: 'SEND',
      entityType: 'COMMUNICATION',
      entityId: `audience:${audienceType}`,
      after: {
        audienceType,
        recipientCount: results.length,
        seasonId: seasonId || null,
        divisionId: divisionId || null,
        teamId: teamId || null,
        subject,
      },
    });

    return NextResponse.json({
      success: true,
      recipientCount: results.length,
      sentCount: results.filter((item) => item.status === 'SENT').length,
      skippedCount: results.filter((item) => item.status === 'SKIPPED').length,
      failedCount: results.filter((item) => item.status === 'FAILED').length,
    });
  } catch (error) {
    console.error('Communications POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send communication';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
