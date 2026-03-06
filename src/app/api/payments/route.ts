import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mock Stripe integration for demo purposes
// In production, install: npm install stripe
// Then import: import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });

/*
 * STRIPE CONFIGURATION (for production):
 * 
 * 1. Install Stripe: npm install stripe
 * 2. Add to .env.local:
 *    STRIPE_SECRET_KEY=sk_test_...
 *    STRIPE_PUBLISHABLE_KEY=pk_test_...
 *    STRIPE_WEBHOOK_SECRET=whsec_...
 * 
 * 3. In production mode, replace mock functions below with real Stripe SDK calls:
 *    - stripe.paymentIntents.create() for payments
 *    - stripe.refunds.create() for refunds
 *    - stripe.paymentIntents.retrieve() to verify payment status
 */

export interface PaymentRecord {
  id: string
  registrationId: string
  userId: string
  seasonId: string
  amount: number
  method: 'CARD' | 'CASH' | 'VENMO'
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  stripePaymentId?: string
  venmoHandle?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  processedAt?: Date
  refundedAt?: Date
}

// In-memory store for demo (use database in production)
const paymentsDb: Map<string, PaymentRecord> = new Map();

// POST /api/payments - Create payment intent/checkout session
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { registrationId, method = 'CARD' } = await request.json();

    // Get registration
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { season: true },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (registration.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (registration.paid) {
      return NextResponse.json({ error: 'Already paid' }, { status: 400 });
    }

    // For demo: create mock payment record
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // In production with real Stripe:
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: Math.round(registration.amount * 100), // cents
    //   currency: 'usd',
    //   metadata: { registrationId, userId },
    //   automatic_payment_methods: { enabled: true },
    // });

    const payment: PaymentRecord = {
      id: paymentId,
      registrationId,
      userId,
      seasonId: registration.seasonId,
      amount: registration.amount,
      method: method as 'CARD' | 'CASH' | 'VENMO',
      status: 'PENDING',
      stripePaymentId: method === 'CARD' ? `pi_mock_${Date.now()}` : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    paymentsDb.set(paymentId, payment);

    // Return mock client secret for Stripe Elements
    return NextResponse.json({
      paymentId,
      amount: registration.amount,
      clientSecret: method === 'CARD' ? `${paymentId}_secret_mock` : undefined,
      method,
      message: method === 'CARD' 
        ? 'Demo mode: payment would be processed via Stripe' 
        : `Payment method: ${method}. Awaiting admin confirmation.`,
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}

// GET /api/payments - List payments (admin) or user's payments
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get('registrationId');
    const seasonId = searchParams.get('seasonId');
    const status = searchParams.get('status');

    let payments: PaymentRecord[] = Array.from(paymentsDb.values());

    // Filter based on user role
    if (!isAdmin) {
      payments = payments.filter(p => p.userId === userId);
    }

    // Apply additional filters
    if (registrationId) {
      payments = payments.filter(p => p.registrationId === registrationId);
    }
    if (seasonId) {
      payments = payments.filter(p => p.seasonId === seasonId);
    }
    if (status) {
      payments = payments.filter(p => p.status === status);
    }

    // Enrich with registration/season data for admin view
    if (isAdmin) {
      const enrichedPayments = await Promise.all(
        payments.map(async (p) => {
          const registration = await prisma.registration.findUnique({
            where: { id: p.registrationId },
            include: { user: { select: { id: true, fullName: true, email: true } }, season: true },
          });
          return { ...p, registration: registration ? {
            userName: registration.user.fullName,
            userEmail: registration.user.email,
            seasonName: registration.season.name,
          } : null };
        })
      );
      return NextResponse.json(enrichedPayments);
    }

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

// POST /api/payments/confirm - Confirm payment (for cash/Venmo or mock Stripe)
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { paymentId, action, notes } = await request.json();
    const payment = paymentsDb.get(paymentId);

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (action === 'confirm') {
      payment.status = 'COMPLETED';
      payment.processedAt = new Date();
      
      // Update registration as paid
      await prisma.registration.update({
        where: { id: payment.registrationId },
        data: { 
          paid: true, 
          paymentId: payment.stripePaymentId || paymentId,
          status: 'APPROVED',
        },
      });
    } else if (action === 'fail') {
      payment.status = 'FAILED';
      payment.notes = notes;
    }

    payment.updatedAt = new Date();
    paymentsDb.set(paymentId, payment);

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
  }
}

// POST /api/payments/refund - Process refund
export async function PATCH(request: NextRequest) {
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

    const { paymentId, reason } = await request.json();
    const payment = paymentsDb.get(paymentId);

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Can only refund completed payments' }, { status: 400 });
    }

    // In production with real Stripe:
    // await stripe.refunds.create({
    //   payment_intent: payment.stripePaymentId,
    //   reason: 'requested_by_customer',
    // });

    // Update payment record
    payment.status = 'REFUNDED';
    payment.refundedAt = new Date();
    payment.notes = reason;
    payment.updatedAt = new Date();
    paymentsDb.set(paymentId, payment);

    // Update registration as unpaid
    await prisma.registration.update({
      where: { id: payment.registrationId },
      data: { paid: false, paymentId: null },
    });

    return NextResponse.json({
      success: true,
      message: 'Refund processed (mock)',
      payment,
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 });
  }
}

// POST /api/payments/manual - Record manual payment (admin)
export async function POST_MANUAL(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { registrationId, method, amount, venmoHandle, notes } = await request.json();

    // Verify registration exists
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (registration.paid) {
      return NextResponse.json({ error: 'Registration already paid' }, { status: 400 });
    }

    // Create manual payment record
    const paymentId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const payment: PaymentRecord = {
      id: paymentId,
      registrationId,
      userId: registration.userId,
      seasonId: registration.seasonId,
      amount: amount || registration.amount,
      method: method as 'CASH' | 'VENMO',
      status: 'COMPLETED',
      venmoHandle,
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      processedAt: new Date(),
    };

    paymentsDb.set(paymentId, payment);

    // Update registration
    await prisma.registration.update({
      where: { id: registrationId },
      data: { 
        paid: true, 
        paymentId,
        status: 'APPROVED',
      },
    });

    return NextResponse.json({
      success: true,
      payment,
      message: `Manual ${method} payment recorded`,
    });
  } catch (error) {
    console.error('Error recording manual payment:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
