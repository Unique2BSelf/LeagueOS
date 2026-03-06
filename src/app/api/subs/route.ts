import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');
  
  const subs = await prisma.sub.findMany({
    where: matchId ? { matchId } : undefined
  });
  
  return NextResponse.json(subs);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { matchId, playerId } = body;
  
  const sub = await prisma.sub.create({
    data: { matchId, playerId }
  });
  
  return NextResponse.json(sub, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, approved } = body;
  
  const sub = await prisma.sub.update({
    where: { id },
    data: { approved }
  });
  
  return NextResponse.json(sub);
}
