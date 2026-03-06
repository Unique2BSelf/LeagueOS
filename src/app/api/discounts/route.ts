import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/discounts - Validate a discount code
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const seasonId = searchParams.get('seasonId');

    if (!code) {
      return NextResponse.json({ error: 'Code required' }, { status: 400 });
    }

    const discount = await prisma.discountCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!discount) {
      return NextResponse.json({ valid: false, error: 'Invalid code' }, { status: 404 });
    }

    // Check if active
    if (!discount.isActive) {
      return NextResponse.json({ valid: false, error: 'Code is no longer active' });
    }

    // Check expiration
    if (discount.expiresAt && new Date() > discount.expiresAt) {
      return NextResponse.json({ valid: false, error: 'Code has expired' });
    }

    // Check max uses
    if (discount.maxUses && discount.currentUses >= discount.maxUses) {
      return NextResponse.json({ valid: false, error: 'Code usage limit reached' });
    }

    // Check season applicability
    if (discount.seasonId && seasonId && discount.seasonId !== seasonId) {
      return NextResponse.json({ valid: false, error: 'Code not valid for this season' });
    }

    return NextResponse.json({
      valid: true,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      description: discount.description,
    });
  } catch (error) {
    console.error('Error validating discount:', error);
    return NextResponse.json({ error: 'Failed to validate discount' }, { status: 500 });
  }
}

// POST /api/discounts - Create a discount code (admin)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { code, discountType, discountValue, maxUses, expiresAt, description, seasonId } = await request.json();

    if (!code || !discountType || !discountValue) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const discount = await prisma.discountCode.create({
      data: {
        code: code.toUpperCase(),
        discountType,
        discountValue,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        description,
        seasonId,
      },
    });

    return NextResponse.json(discount);
  } catch (error) {
    console.error('Error creating discount:', error);
    return NextResponse.json({ error: 'Failed to create discount' }, { status: 500 });
  }
}

// DELETE /api/discounts - Deactivate a discount code (admin)
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await prisma.discountCode.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating discount:', error);
    return NextResponse.json({ error: 'Failed to deactivate discount' }, { status: 500 });
  }
}
