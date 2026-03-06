import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/users/[id] - Get single user details
// PATCH /api/users/[id] - Update user
// DELETE /api/users/[id] - Soft/hard delete user

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        teams: {
          include: {
            team: {
              include: {
                season: true,
                division: true,
              },
            },
          },
        },
        registrations: {
          include: {
            season: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        insurancePolicies: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        ledgers: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        backgroundChecks: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            teams: true,
            registrations: true,
            ledgers: true,
            disciplinary: true,
          },
        },
      },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get activity log data
    const activityLog = [
      { type: 'created', date: user.createdAt, description: 'Account created' },
      ...user.registrations.map(r => ({
        type: 'registration',
        date: r.createdAt,
        description: `Registered for ${r.season.name}`,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return NextResponse.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.taxIdEncrypted, // Using taxIdEncrypted as phone for demo
      role: user.role,
      photoUrl: user.photoUrl,
      isInsured: user.isInsured,
      insuranceExpiry: user.insuranceExpiry,
      eloRating: user.eloRating,
      isGoalie: user.isGoalie,
      skillSpeed: user.skillSpeed,
      skillTechnical: user.skillTechnical,
      skillStamina: user.skillStamina,
      skillTeamwork: user.skillTeamwork,
      skillDefense: user.skillDefense,
      skillAttack: user.skillAttack,
      isFreeAgent: user.isFreeAgent,
      freeAgentSeasonId: user.freeAgentSeasonId,
      isActive: user.isActive,
      hideFromDirectory: user.hideFromDirectory,
      createdAt: user.createdAt,
      // Team memberships
      teams: user.teams.map(t => ({
        teamId: t.teamId,
        teamName: t.team.name,
        division: t.team.division.name,
        season: t.team.season.name,
        status: t.status,
        joinedAt: t.joinedAt,
      })),
      // Registration history
      registrations: user.registrations.map(r => ({
        id: r.id,
        seasonId: r.seasonId,
        seasonName: r.season.name,
        status: r.status,
        paid: r.paid,
        amount: r.amount,
        insuranceStatus: r.insuranceStatus,
        createdAt: r.createdAt,
      })),
      // Insurance policies
      insurancePolicies: user.insurancePolicies.map(p => ({
        id: p.id,
        provider: p.provider,
        policyNumber: p.policyNumber,
        startDate: p.startDate,
        endDate: p.endDate,
        cost: p.cost,
        status: p.status,
      })),
      // Payments/Ledger
      payments: user.ledgers.map(l => ({
        id: l.id,
        amount: l.amount,
        type: l.type,
        status: l.status,
        description: l.description,
        year: l.year,
        createdAt: l.createdAt,
      })),
      // Background check
      backgroundChecks: user.backgroundChecks.map(b => ({
        id: b.id,
        provider: b.provider,
        status: b.status,
        resultUrl: b.resultUrl,
        expiresAt: b.expiresAt,
        createdAt: b.createdAt,
      })),
      // Counts
      stats: {
        totalTeams: user._count.teams,
        totalRegistrations: user._count.registrations,
        totalTransactions: user._count.ledgers,
        totalDisciplinary: user._count.disciplinary,
      },
      activityLog: activityLog.slice(0, 20),
    });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      role,
      teamId,
      isInsured,
      isActive,
      hideFromDirectory,
    } = body;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });
    
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Build update data
    const updateData: any = {};
    
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (phone !== undefined) updateData.taxIdEncrypted = phone; // Using taxIdEncrypted as phone
    if (role !== undefined) updateData.role = role;
    if (isInsured !== undefined) updateData.isInsured = isInsured;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (hideFromDirectory !== undefined) updateData.hideFromDirectory = hideFromDirectory;
    
    // Handle team assignment
    if (teamId !== undefined) {
      if (teamId === null) {
        // Remove team assignment - delete all teamPlayer records
        await prisma.teamPlayer.deleteMany({
          where: { userId: id },
        });
      } else {
        // Add or update team assignment
        await prisma.teamPlayer.upsert({
          where: {
            userId_teamId: {
              userId: id,
              teamId,
            },
          },
          update: { status: 'ACTIVE' },
          create: {
            userId: id,
            teamId,
            status: 'ACTIVE',
          },
        });
      }
    }
    
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });
    
    return NextResponse.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isInsured: user.isInsured,
      isActive: user.isActive,
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const hard = searchParams.get('hard') === 'true';
  
  try {
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });
    
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (hard) {
      // Hard delete - remove all related data
      await prisma.$transaction([
        prisma.teamPlayer.deleteMany({ where: { userId: id } }),
        prisma.ledger.deleteMany({ where: { userId: id } }),
        prisma.sub.deleteMany({ where: { playerId: id } }),
        prisma.disciplinaryAction.deleteMany({ where: { userId: id } }),
        prisma.backgroundCheck.deleteMany({ where: { userId: id } }),
        prisma.volunteerShift.deleteMany({ where: { userId: id } }),
        prisma.registration.deleteMany({ where: { userId: id } }),
        prisma.insurancePolicy.deleteMany({ where: { userId: id } }),
        prisma.order.deleteMany({ where: { userId: id } }),
        prisma.message.deleteMany({ where: { userId: id } }),
        prisma.user.delete({ where: { id } }),
      ]);
    } else {
      // Soft delete - just mark as inactive
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
