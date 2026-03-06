import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Simple hash function for demo purposes
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

export async function POST(req: Request) {
  try {
    const { 
      fullName, 
      email, 
      password, 
      photoUrl, 
      role,
      // Skill matrix fields (1-5)
      skillSpeed,
      skillTechnical,
      skillStamina,
      skillTeamwork,
      skillDefense,
      skillAttack,
      isGoalie,
      isFreeAgent,
      freeAgentSeasonId,
    } = await req.json()

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Photo is required for registration (PRD requirement)
    if (!photoUrl) {
      return NextResponse.json(
        { error: 'Photo is required for registration' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase()

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    const hashedPassword = simpleHash(password)

    const user = await prisma.user.create({
      data: {
        fullName,
        email: normalizedEmail,
        password: hashedPassword,
        photoUrl,
        role: role || 'PLAYER',
        isInsured: false,
        eloRating: 1200,
        isGoalie: isGoalie || false,
        isActive: true,
        hideFromDirectory: false,
        // Skill Matrix (1-5, default to 3)
        skillSpeed: Math.min(5, Math.max(1, skillSpeed || 3)),
        skillTechnical: Math.min(5, Math.max(1, skillTechnical || 3)),
        skillStamina: Math.min(5, Math.max(1, skillStamina || 3)),
        skillTeamwork: Math.min(5, Math.max(1, skillTeamwork || 3)),
        skillDefense: Math.min(5, Math.max(1, skillDefense || 3)),
        skillAttack: Math.min(5, Math.max(1, skillAttack || 3)),
        // Free agent status
        isFreeAgent: isFreeAgent || false,
        freeAgentSeasonId,
      },
    })

    return NextResponse.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
