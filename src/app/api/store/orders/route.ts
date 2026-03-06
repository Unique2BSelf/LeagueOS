import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const orderId = searchParams.get('id');
  
  if (orderId) {
    const order = await prisma.order.findUnique({ 
      where: { id: orderId },
      include: { items: true }
    });
    return NextResponse.json(order);
  }
  
  const where: any = {};
  if (userId) where.userId = userId;
  
  const orders = await prisma.order.findMany({ 
    where,
    include: { items: true },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, items, shippingAddress } = body;
  
  // Calculate total
  let total = 0;
  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (product) {
      total += product.basePrice * item.quantity;
    }
  }
  
  // Create order with items
  const order = await prisma.order.create({
    data: {
      userId,
      total,
      shippingAddress,
      items: {
        create: items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          priceAtPurchase: item.price,
        })),
      },
    },
    include: { items: true },
  });
  
  return NextResponse.json(order, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { orderId, status, trackingNumber } = body;
  
  const updateData: any = {};
  if (status) updateData.status = status;
  if (trackingNumber) updateData.trackingNumber = trackingNumber;
  
  const order = await prisma.order.update({
    where: { id: orderId },
    data: updateData,
  });
  
  return NextResponse.json(order);
}
