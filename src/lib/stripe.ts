import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil',
  });

  return stripeClient;
}

export function getRequestOrigin(request: Request): string {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('host');

  if (forwardedProto && host) {
    return `${forwardedProto}://${host}`;
  }

  const url = new URL(request.url);
  return url.origin;
}

