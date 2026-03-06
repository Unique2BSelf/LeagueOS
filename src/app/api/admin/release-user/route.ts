import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/admin/release-user - Release a locked user
export async function POST(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-user-id');
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { userId } = await request.json();

    // Unlock the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        lockReason: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error releasing user:', error);
    return NextResponse.json({ error: 'Failed to release' }, { status: 500 });
  }
}
