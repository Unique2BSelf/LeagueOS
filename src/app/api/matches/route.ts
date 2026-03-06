import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const matches = await prisma.match.findMany({});
  return NextResponse.json(matches);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { homeTeamId, awayTeamId, fieldId, scheduledAt } = body;
  
  const match = await prisma.match.create({
    data: { homeTeamId, awayTeamId, fieldId, scheduledAt: new Date(scheduledAt), status: 'SCHEDULED', seasonId: 'season-1' }
  });
  
  return NextResponse.json(match, { status: 201 });
}
