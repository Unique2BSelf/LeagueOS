import { NextRequest, NextResponse } from 'next/server';

/**
 * 1099-NEC Engine per PRD:
 * - Track Ledger where type = REF_PAYOUT && year = currentYear
 * - Nightly cron: if SUM(amount) >= 2000 → flag user
 * - Jan 1: generate PDF (Copy B for ref, Copy A for league)
 * - TaxIdEncrypted decrypted only during PDF generation (server-side)
 * - Store PDFs in MinIO/S3 with signed download URLs
 */

// Mock ledger data - in production, query from Prisma
const mockLedger: Array<{
  id: string;
  userId: string;
  amount: number;
  type: string;
  year: number;
  description?: string;
  createdAt: Date;
}> = [
  { id: '1', userId: 'ref-1', amount: 75, type: 'REF_PAYOUT', year: 2026, description: 'Match #101', createdAt: new Date('2026-01-15') },
  { id: '2', userId: 'ref-1', amount: 75, type: 'REF_PAYOUT', year: 2026, description: 'Match #102', createdAt: new Date('2026-01-22') },
  { id: '3', userId: 'ref-1', amount: 60, type: 'REF_PAYOUT', year: 2026, description: 'Match #103', createdAt: new Date('2026-02-01') },
  { id: '4', userId: 'ref-1', amount: 90, type: 'REF_PAYOUT', year: 2026, description: 'Match #104', createdAt: new Date('2026-02-15') },
  { id: '5', userId: 'ref-1', amount: 75, type: 'REF_PAYOUT', year: 2026, description: 'Match #105', createdAt: new Date('2026-02-22') },
  { id: '6', userId: 'ref-1', amount: 75, type: 'REF_PAYOUT', year: 2026, description: 'Match #106', createdAt: new Date('2026-03-01') },
  { id: '7', userId: 'ref-1', amount: 2500, type: 'REF_PAYOUT', year: 2025, description: 'Season total', createdAt: new Date('2025-12-15') },
];

const mockUsers: Record<string, any> = {
  'ref-1': {
    id: 'ref-1',
    fullName: 'John Smith',
    email: 'john.referee@email.com',
    taxIdEncrypted: 'aGVsbG9fd29ybGRfZW5jcnlwdGVk', // "hello_world_encrypted" base64
    address: '123 Soccer Ave, City, ST 12345',
  },
  'ref-2': {
    id: 'ref-2',
    fullName: 'Jane Doe',
    email: 'jane.referee@email.com',
    taxIdEncrypted: 'c2VjcmV0X3RheF9pZA==', // "secret_tax_id" base64
    address: '456 Ref Road, Town, ST 67890',
  },
};

// Threshold for 1099-NEC
const THRESHOLD = 2000;

function decryptTaxId(encrypted: string): string {
  // In production: AES-256 decryption with server-side key
  // This is a placeholder - real implementation would use crypto module
  return `***-**-${encrypted.slice(-4)}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const year = searchParams.get('year') || new Date().getFullYear().toString();
  const format = searchParams.get('format') || 'json';
  
  if (!userId) {
    // Return all refs with payout totals for the year
    const yearNum = parseInt(year);
    const payoutsByRef = mockLedger
      .filter(l => l.type === 'REF_PAYOUT' && l.year === yearNum)
      .reduce((acc, l) => {
        if (!acc[l.userId]) acc[l.userId] = 0;
        acc[l.userId] += l.amount;
        return acc;
      }, {} as Record<string, number>);
    
    const refsWithTotals = Object.entries(payoutsByRef).map(([refId, total]) => ({
      userId: refId,
      totalPayout: total,
      eligibleFor1099: total >= THRESHOLD,
      THRESHOLD,
    }));
    
    return NextResponse.json({
      year,
      refs: refsWithTotals,
      generatedAt: new Date().toISOString(),
    });
  }
  
  const user = mockUsers[userId];
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  const yearNum = parseInt(year);
  const userPayouts = mockLedger.filter(
    l => l.userId === userId && l.type === 'REF_PAYOUT' && l.year === yearNum
  );
  
  const totalPayout = userPayouts.reduce((sum, l) => sum + l.amount, 0);
  
  if (format === 'pdf') {
    // In production: Generate actual PDF with PDFKit
    // For now, return metadata needed for PDF generation
    const taxId = decryptTaxId(user.taxIdEncrypted);
    
    return NextResponse.json({
      message: 'PDF generation endpoint - would use PDFKit in production',
      pdfData: {
        formType: '1099-NEC',
        taxYear: year,
        // Payer info
        payer: {
          name: 'Pathfinder Adult Soccer League',
          address: 'PO Box 123, City, ST 12345',
          ein: 'XX-XXXXXXX',
        },
        // Recipient info
        recipient: {
          name: user.fullName,
          address: user.address,
          tin: taxId,
          email: user.email,
        },
        // Amount
        nonemployeeCompensation: totalPayout,
        // Flags
        isCorrection: false,
        // Copy info
        copy: 'B', // Copy B - to be sent to recipient
      },
    });
  }
  
  return NextResponse.json({
    userId,
    year,
    payouts: userPayouts,
    totalPayout,
    eligibleFor1099: totalPayout >= THRESHOLD,
    threshold: THRESHOLD,
    taxIdLast4: decryptTaxId(user.taxIdEncrypted).slice(-4),
    generatedAt: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, year, action } = body;
    
    if (!userId || !year) {
      return NextResponse.json(
        { error: 'userId and year are required' },
        { status: 400 }
      );
    }
    
    const user = mockUsers[userId];
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (action === 'generate') {
      // Generate PDF - in production, use PDFKit or similar
      return NextResponse.json({
        success: true,
        message: '1099-NEC PDF generated successfully',
        downloadUrl: `/api/taxes/1099/download?userId=${userId}&year=${year}`,
        generatedAt: new Date().toISOString(),
      });
    }
    
    if (action === 'mark-sent') {
      // Mark 1099 as sent to recipient
      return NextResponse.json({
        success: true,
        message: '1099-NEC marked as sent',
        sentAt: new Date().toISOString(),
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
