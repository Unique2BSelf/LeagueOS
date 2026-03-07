import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function calculateProRatedFee(baseFee: number, seasonStart: Date, seasonEnd: Date | null): number {
  if (!seasonEnd) return baseFee;

  const now = new Date();
  const totalDays = Math.ceil((seasonEnd.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.ceil((seasonEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0 || totalDays <= 0) return 0;

  const percentRemaining = daysRemaining / totalDays;
  return Math.round(baseFee * percentRemaining * 100) / 100;
}

async function applyDiscountCode(seasonId: string, code: string | null | undefined, baseAmount: number) {
  if (!code) {
    return { amount: baseAmount, discountCodeId: null as string | null, discountAmount: 0 };
  }

  const normalizedCode = String(code).trim().toUpperCase();
  if (!normalizedCode) {
    return { amount: baseAmount, discountCodeId: null as string | null, discountAmount: 0 };
  }

  const discount = await prisma.discountCode.findUnique({ where: { code: normalizedCode } });
  if (!discount || !discount.isActive) {
    throw new Error('Invalid discount code');
  }

  if (discount.seasonId && discount.seasonId !== seasonId) {
    throw new Error('Discount code is not valid for this season');
  }

  if (discount.expiresAt && discount.expiresAt < new Date()) {
    throw new Error('Discount code has expired');
  }

  if (discount.maxUses !== null && discount.currentUses >= discount.maxUses) {
    throw new Error('Discount code has reached its usage limit');
  }

  const discountAmount = discount.discountType === 'PERCENTAGE'
    ? Math.round(baseAmount * (discount.discountValue / 100) * 100) / 100
    : Math.min(baseAmount, discount.discountValue);

  return {
    amount: Math.max(0, Math.round((baseAmount - discountAmount) * 100) / 100),
    discountCodeId: discount.id,
    discountAmount,
  };
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const registrations = await prisma.registration.findMany({
      where: { userId },
      include: { season: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(registrations);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { seasonId, waiverAgreed, discountCode } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

    const existing = await prisma.registration.findUnique({
      where: { userId_seasonId: { userId, seasonId } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Already registered for this season' }, { status: 400 });
    }

    const registrationForm = await prisma.registrationForm.findUnique({ where: { seasonId } });
    if (registrationForm?.requireWaiver && !waiverAgreed) {
      return NextResponse.json({ error: 'Waiver acceptance is required' }, { status: 400 });
    }

    const insurance = await prisma.insurancePolicy.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gt: new Date() },
      },
      orderBy: { endDate: 'desc' },
    });

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

    if (registrationForm?.requireInsurance !== false && !insurance) {
      return NextResponse.json({
        error: 'Active annual insurance is required before you can register for a season',
        code: 'INSURANCE_REQUIRED',
      }, { status: 400 });
    }

    const now = new Date();
    const activeTierAmount = season.pricingTiers.find((tier) => now >= tier.startDate && now <= tier.endDate)?.amount;
    const fallbackTierAmount = season.pricingTiers[season.pricingTiers.length - 1]?.amount || registrationForm?.baseFee || 150;
    const baseAmount = activeTierAmount || fallbackTierAmount;

    let amount = calculateProRatedFee(baseAmount, season.startDate, season.endDate);
    const discount = await applyDiscountCode(seasonId, discountCode, amount);
    amount = discount.amount;

    let insuranceStatus = 'VALID';
    if (!insurance) {
      insuranceStatus = 'REQUIRED';
    } else if (insurance.endDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
      insuranceStatus = 'EXPIRING_SOON';
    }

    const registration = await prisma.registration.create({
      data: {
        userId,
        seasonId,
        amount,
        insuranceStatus,
        status: amount <= 0 ? 'APPROVED' : 'PENDING',
        paid: amount <= 0,
        paymentId: amount <= 0 ? 'NO_PAYMENT_REQUIRED' : null,
        waiverSignedAt: waiverAgreed ? new Date() : null,
        waiverIpAddress: waiverAgreed ? ipAddress : null,
      },
      include: { season: true },
    });

    if (discount.discountCodeId) {
      await prisma.discountCode.update({
        where: { id: discount.discountCodeId },
        data: { currentUses: { increment: 1 } },
      });
    }

    if (amount <= 0) {
      await prisma.ledger.create({
        data: {
          userId,
          amount: 0,
          type: 'REGISTRATION',
          status: 'COMPLETED',
          year: new Date().getFullYear(),
          description: `Registration completed for ${season.name}${discount.discountAmount ? ` with discount ${discountCode}` : ''}`,
        },
      });
    }

    return NextResponse.json({
      ...registration,
      discountAmount: discount.discountAmount,
    });
  } catch (error) {
    console.error('Error creating registration:', error);
    const message = error instanceof Error ? error.message : 'Failed to create registration';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
