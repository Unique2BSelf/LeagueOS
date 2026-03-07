import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentMethod, TransactionType } from '@prisma/client';
import { getRequestOrigin, getStripeClient } from '@/lib/stripe';
import { activateAnnualInsuranceForUser } from '@/lib/insurance';
import { createPaymentRecord } from '@/lib/payments';

export const runtime = 'nodejs';

// GET /api/insurance - Get user's current insurance status
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all insurance policies for user
    const policies = await prisma.insurancePolicy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Get active policy
    const activePolicy = policies.find(p => p.status === 'ACTIVE' && p.endDate > new Date());
    
    // Calculate days until expiry
    let daysUntilExpiry = null;
    let isExpired = false;
    let isExpiringSoon = false; // Within 30 days
    
    if (activePolicy) {
      const now = new Date();
      const daysRemaining = Math.ceil((activePolicy.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      daysUntilExpiry = daysRemaining;
      isExpired = daysRemaining < 0;
      isExpiringSoon = daysRemaining > 0 && daysRemaining <= 30;
    }

    return NextResponse.json({
      hasActiveInsurance: !!activePolicy && !isExpired,
      activePolicy,
      daysUntilExpiry,
      isExpired,
      isExpiringSoon,
      policyHistory: policies,
    });
  } catch (error) {
    console.error('Error fetching insurance:', error);
    return NextResponse.json({ error: 'Failed to fetch insurance' }, { status: 500 });
  }
}

// POST /api/insurance - Start insurance checkout
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { provider = 'LEAGUE_PROVIDED', cost = 50.00, method = 'CARD' } = await request.json();

    // Check for existing active policy
    const existing = await prisma.insurancePolicy.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gt: new Date() },
      },
    });

    if (existing) {
      return NextResponse.json({ 
        error: 'Active policy already exists',
        policy: existing,
        expiresAt: existing.endDate,
      }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const payment = await createPaymentRecord({
      userId,
      amount: cost,
      method: method === 'APPLE_PAY' ? PaymentMethod.APPLE_PAY : PaymentMethod.CARD,
      transactionType: TransactionType.INSURANCE,
      notes: 'ANNUAL_INSURANCE',
    });

    const stripe = getStripeClient();
    const origin = getRequestOrigin(request);
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${origin}/dashboard/insurance-status?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/insurance-status?payment=cancelled`,
      customer_email: user.email,
      metadata: {
        paymentId: payment.id,
        paymentKind: 'INSURANCE',
        userId,
        provider,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(Number(cost) * 100),
            product_data: {
              name: 'Annual League Insurance',
              description: `365-day annual insurance coverage for ${user.fullName}`,
            },
          },
        },
      ],
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripeSessionId: checkoutSession.id,
        providerReference: checkoutSession.id,
      },
    });

    return NextResponse.json({
      paymentId: payment.id,
      amount: Number(cost),
      checkoutUrl: checkoutSession.url,
      stripeSessionId: checkoutSession.id,
      message: 'Stripe Checkout session created for annual insurance.',
    });
  } catch (error) {
    console.error('Error purchasing insurance:', error);
    return NextResponse.json({ error: 'Failed to purchase insurance' }, { status: 500 });
  }
}

// PATCH /api/insurance - Renew/extend insurance
export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, policyId } = await request.json();

    if (action === 'renew') {
      // Find existing policy
      const existing = await prisma.insurancePolicy.findUnique({
        where: { id: policyId },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
      }
      const renewed = await activateAnnualInsuranceForUser({
        userId,
        provider: existing.provider,
        cost: existing.cost,
      });

      return NextResponse.json({
        policy: renewed,
        message: 'Insurance renewed for another 365 days.',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating insurance:', error);
    return NextResponse.json({ error: 'Failed to update insurance' }, { status: 500 });
  }
}
