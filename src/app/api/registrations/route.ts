import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Calculate pro-rated fee
function calculateProRatedFee(baseFee: number, seasonStart: Date, seasonEnd: Date | null): number {
  if (!seasonEnd) return baseFee;
  
  const now = new Date();
  const totalDays = Math.ceil((seasonEnd.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.ceil((seasonEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining <= 0) return 0;
  
  const percentRemaining = daysRemaining / totalDays;
  return Math.round(baseFee * percentRemaining * 100) / 100;
}

// GET /api/registrations - List user's registrations
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const registrations = await prisma.registration.findMany({
      where: { userId },
      include: {
        season: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(registrations);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
  }
}

// POST /api/registrations - Create new season registration
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { seasonId, waiverAgreed, discountCode, photoVerified } = await request.json();

    // Get client's IP address for waiver signing
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown';

    // Get registration form config to check if waiver is required
    const registrationForm = await prisma.registrationForm.findUnique({
      where: { seasonId },
    });

    // Check if waiver is required
    if (registrationForm?.requireWaiver && !waiverAgreed) {
      return NextResponse.json({ error: 'Waiver acceptance is required' }, { status: 400 });
    }

    // Get current active insurance policy
    const insurance = await prisma.insurancePolicy.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gt: new Date() },
      },
      orderBy: { endDate: 'desc' },
    });

    // Get season and calculate fee based on tiered pricing
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        pricingTiers: {
          where: { isActive: true },
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    // Calculate fee based on current date and pricing tiers
    const now = new Date();
    let baseAmount = season.pricingTiers.find(
      (tier) => now >= tier.startDate && now <= tier.endDate
    )?.amount || season.pricingTiers[season.pricingTiers.length - 1]?.amount || 150;

    // Apply pro-rating for mid-season registrations
    const proRatedAmount = calculateProRatedFee(baseAmount, season.startDate, season.endDate);
    let amount = proRatedAmount;

    // Add note if mid-season
    const totalDays = season.endDate 
      ? Math.ceil((season.endDate.getTime() - season.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const daysRemaining = season.endDate
      ? Math.ceil((season.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const isMidSeason = totalDays > 0 && daysRemaining < totalDays * 0.5;

    // Determine insurance status
    let insuranceStatus = 'VALID';
    if (!insurance) {
      insuranceStatus = 'REQUIRED'; // Hard gate - insurance required
      amount += 50; // Add insurance cost
    } else if (insurance.endDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
      insuranceStatus = 'EXPIRING_SOON'; // Flag for renewal soon
    }

    // Check for existing registration
    const existing = await prisma.registration.findUnique({
      where: {
        userId_seasonId: { userId, seasonId },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Already registered for this season' }, { status: 400 });
    }

    const registration = await prisma.registration.create({
      data: {
        userId,
        seasonId,
        amount,
        insuranceStatus,
        status: 'PENDING',
        // Waiver acceptance
        waiverSignedAt: waiverAgreed ? new Date() : null,
        waiverIpAddress: waiverAgreed ? ipAddress : null,
      },
    });

    // Auto-approve if insurance is valid (no payment needed for now - Stripe stub)
    if (insuranceStatus === 'VALID') {
      await prisma.registration.update({
        where: { id: registration.id },
        data: { status: 'APPROVED', paid: true },
      });
    }

    return NextResponse.json(registration);
  } catch (error) {
    console.error('Error creating registration:', error);
    return NextResponse.json({ error: 'Failed to create registration' }, { status: 500 });
  }
}
