import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminActor } from '@/lib/admin-auth';
import { createAuditLog } from '@/lib/audit';

// GET /api/admin/registrations - List all registrations for admin (with filters)
export async function GET(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // PENDING, APPROVED, REJECTED
    const seasonId = searchParams.get('seasonId');

    const where: any = {};
    if (status) where.status = status;
    if (seasonId) where.seasonId = seasonId;

    const registrations = await prisma.registration.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            photoUrl: true,
            isInsured: true,
          },
        },
        season: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(registrations);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
  }
}

// PATCH /api/admin/registrations - Approve or reject registrations
export async function PATCH(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { registrationIds, action, rejectionReason } = body; // action: 'APPROVE' | 'REJECT'

    if (!registrationIds || !action) {
      return NextResponse.json({ error: 'registrationIds and action required' }, { status: 400 });
    }

    if (action === 'REJECT' && !rejectionReason) {
      return NextResponse.json({ error: 'rejectionReason required for rejection' }, { status: 400 });
    }

    const existingRegistrations = await prisma.registration.findMany({
      where: {
        id: { in: registrationIds },
      },
      include: {
        user: { select: { email: true, fullName: true } },
        season: { select: { name: true } },
      },
    });

    const updateData = action === 'APPROVE'
      ? { status: 'APPROVED', rejectionReason: null }
      : { status: 'REJECTED', rejectionReason };

    const results = await Promise.all(
      registrationIds.map((id: string) =>
        prisma.registration.update({
          where: { id },
          data: updateData,
          include: {
            user: { select: { email: true, fullName: true } },
            season: { select: { name: true } },
          },
        })
      )
    );

    // Send mock emails for each registration
    for (const reg of results) {
      const mockEmail = {
        to: reg.user.email,
        subject: action === 'APPROVE' 
          ? `Registration Approved - ${reg.season.name}` 
          : `Registration Not Approved - ${reg.season.name}`,
        body: action === 'APPROVE'
          ? `Hi ${reg.user.fullName},\n\nYour registration for ${reg.season.name} has been approved! You can now access your team features.\n\nThank you,\nLeague OS`
          : `Hi ${reg.user.fullName},\n\nUnfortunately, your registration for ${reg.season.name} was not approved.\n\nReason: ${rejectionReason}\n\nPlease contact support if you have questions.\n\nThank you,\nLeague OS`,
      };
      console.log('[MOCK EMAIL SENT]', mockEmail);

      const before = existingRegistrations.find((existing) => existing.id === reg.id);
      await createAuditLog({
        actor,
        actionType: action === 'APPROVE' ? 'APPROVE' : 'REJECT',
        entityType: 'REGISTRATION',
        entityId: reg.id,
        before: before
          ? {
              status: before.status,
              rejectionReason: before.rejectionReason,
              paid: before.paid,
            }
          : null,
        after: {
          status: reg.status,
          rejectionReason: reg.rejectionReason,
          paid: reg.paid,
        },
        notes: action === 'REJECT' ? rejectionReason : null,
      });
    }

    return NextResponse.json({ success: true, updated: results.length });
  } catch (error) {
    console.error('Error updating registrations:', error);
    return NextResponse.json({ error: 'Failed to update registrations' }, { status: 500 });
  }
}
