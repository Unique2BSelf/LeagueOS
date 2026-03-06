import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/users - List all users with pagination, search, filter by role
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  
  const skip = (page - 1) * limit;
  
  // Build where clause
  const where: any = {};
  
  if (role && role !== 'ALL') {
    where.role = role;
  }
  
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          teams: {
            include: {
              team: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);
    
    // Get role counts for stats
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });
    
    const stats = {
      total,
      admins: roleCounts.find(r => r.role === 'ADMIN')?._count || 0,
      captains: roleCounts.find(r => r.role === 'CAPTAIN')?._count || 0,
      players: roleCounts.find(r => r.role === 'PLAYER')?._count || 0,
      refs: roleCounts.find(r => r.role === 'REF')?._count || 0,
    };
    
    return NextResponse.json({
      users: users.map(u => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        photoUrl: u.photoUrl,
        isInsured: u.isInsured,
        insuranceExpiry: u.insuranceExpiry,
        eloRating: u.eloRating,
        isGoalie: u.isGoalie,
        isActive: u.isActive,
        hideFromDirectory: u.hideFromDirectory,
        createdAt: u.createdAt,
        teams: u.teams.map(t => ({
          teamId: t.teamId,
          teamName: t.team.name,
          status: t.status,
        })),
      })),
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
