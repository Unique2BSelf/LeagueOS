import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { id: userId } });
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  try {
    const refs = await prisma.user.findMany({ where: { role: 'REF' }, select: { id: true, fullName: true, email: true, isActive: true, backgroundCheckStatus: true } });
    const refStats = await Promise.all(refs.map(async (ref) => {
      const matches = await prisma.match.count({ where: { refId: ref.id, status: 'FINAL' } });
      const ratings = await prisma.refRating.findMany({ where: { refId: ref.id } });
      const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : null;
      return { ...ref, totalMatches: matches, averageRating: avgRating?.toFixed(1) || 'N/A', ratingCount: ratings.length };
    }));
    return NextResponse.json(refStats);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { refId, rating, comments } = await request.json();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'CAPTAIN') return NextResponse.json({ error: 'Captains only' }, { status: 403 });

    const newRating = await prisma.refRating.create({
      data: { refId, raterId: userId, rating, comments },
    });
    return NextResponse.json({ success: true, rating: newRating });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to rate' }, { status: 500 });
  }
}
