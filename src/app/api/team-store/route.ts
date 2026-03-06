import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Get team store products
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');
  
  if (!teamId) {
    return NextResponse.json({ error: 'teamId required' }, { status: 400 });
  }
  
  // Mock team store products - in real app, query by teamId
  const teamProducts = [
    {
      id: `prod-${teamId}-1`,
      teamId,
      name: `${teamId} Team Jersey`,
      description: 'Official team jersey with custom printing',
      price: 55.00,
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      colors: ['Home', 'Away'],
      imageUrl: null,
      isActive: true,
      royaltyPercent: 10,
    },
    {
      id: `prod-${teamId}-2`,
      teamId,
      name: `${teamId} Training Shirt`,
      description: 'Training bib with team logo',
      price: 25.00,
      sizes: ['One Size'],
      colors: ['Multi'],
      imageUrl: null,
      isActive: true,
      royaltyPercent: 15,
    },
    {
      id: `prod-${teamId}-3`,
      teamId,
      name: `${teamId} Scarf`,
      description: 'Team scarf with embroidered logo',
      price: 20.00,
      sizes: ['One Size'],
      colors: ['Team Colors'],
      imageUrl: null,
      isActive: true,
      royaltyPercent: 20,
    },
  ];
  
  return NextResponse.json(teamProducts);
}

// Create team store product (admin only)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { teamId, name, description, price, sizes, colors, royaltyPercent } = body;
  
  const product = {
    id: `prod-${teamId}-${Date.now()}`,
    teamId,
    name,
    description,
    price,
    sizes,
    colors,
    royaltyPercent: royaltyPercent || 10,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  
  return NextResponse.json(product, { status: 201 });
}

// Update team store product
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { productId, ...updates } = body;
  
  return NextResponse.json({ 
    success: true, 
    productId, 
    updated: updates 
  });
}
