import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/registration-form - Get form config for a season
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 });
    }

    const form = await prisma.registrationForm.findUnique({
      where: { seasonId },
    });

    if (!form) {
      // Return default form config
      return NextResponse.json({
        seasonId,
        isEnabled: true,
        requireInsurance: true,
        baseFee: 150.00,
        earlyBirdFee: null,
        lateFee: null,
        paymentThankYouSubject: '',
        paymentThankYouBody: '',
        customFields: [],
      });
    }

    return NextResponse.json(form);
  } catch (error) {
    console.error('Error fetching registration form:', error);
    return NextResponse.json({ error: 'Failed to fetch registration form' }, { status: 500 });
  }
}

// POST /api/registration-form - Save form config
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const data = await request.json();
    const { seasonId, ...formData } = data;

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 });
    }

    // Upsert the registration form
    const form = await prisma.registrationForm.upsert({
      where: { seasonId },
      update: {
        ...formData,
        customFields: formData.customFields || [],
      },
      create: {
        seasonId,
        ...formData,
        customFields: formData.customFields || [],
      },
    });

    // Also update/create pricing tiers based on form config
    if (formData.earlyBirdFee || formData.lateFee) {
      // Clear existing pricing tiers and create new ones
      await prisma.pricingTier.deleteMany({ where: { seasonId } });

      const tiers = [];
      const season = await prisma.season.findUnique({ where: { id: seasonId } });

      if (formData.earlyBirdFee && season) {
        const earlyBirdEnd = new Date(season.startDate);
        earlyBirdEnd.setDate(earlyBirdEnd.getDate() - 14); // 2 weeks before season

        tiers.push({
          seasonId,
          name: 'Early Bird',
          startDate: season.startDate,
          endDate: earlyBirdEnd,
          amount: formData.earlyBirdFee,
          isActive: true,
        });
      }

      // Regular tier
      if (season) {
        const regularEnd = new Date(season.startDate);
        regularEnd.setDate(regularEnd.getDate() + 30); // First month of season

        tiers.push({
          seasonId,
          name: 'Regular',
          startDate: season.startDate,
          endDate: regularEnd,
          amount: formData.baseFee,
          isActive: true,
        });
      }

      // Late tier
      if (formData.lateFee && season) {
        tiers.push({
          seasonId,
          name: 'Late',
          startDate: new Date(season.startDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          endDate: season.endDate || new Date(season.startDate.getTime() + 120 * 24 * 60 * 60 * 1000),
          amount: formData.lateFee,
          isActive: true,
        });
      }

      if (tiers.length > 0) {
        await prisma.pricingTier.createMany({ data: tiers });
      }
    }

    return NextResponse.json(form);
  } catch (error) {
    console.error('Error saving registration form:', error);
    return NextResponse.json({ error: 'Failed to save registration form' }, { status: 500 });
  }
}
