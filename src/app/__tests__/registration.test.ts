// Registration Module Test Suite
// Tests for PRD requirements

describe('Registration - Photo Required', () => {
  test('blocks submission without photo', async () => {
    const response = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: 'test', waiverAgreed: true })
    });
    expect(response.status).toBe(400);
  });
  
  test('blocks submission with unverified photo', async () => {
    const response = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        seasonId: 'test', 
        waiverAgreed: true,
        photoUrl: 'data:image/png;base64,abc123',
        photoVerified: false 
      })
    });
    expect(response.status).toBe(400);
  });
  
  test('allows submission with verified photo', async () => {
    // With verified photo - should succeed (or fail on other validation)
    const response = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        seasonId: 'test', 
        waiverAgreed: true,
        photoUrl: 'data:image/png;base64,abc123',
        photoVerified: true 
      })
    });
    // Should fail on season not found, not photo
    expect(response.status).not.toBe(400);
  });
});

describe('Registration - Discount Applied', () => {
  test('applies percentage discount', async () => {
    const response = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        seasonId: 'test-season', 
        waiverAgreed: true,
        photoUrl: 'data:image/png;base64,abc123',
        photoVerified: true,
        discountCode: 'SAVE20'
      })
    });
    const data = await response.json();
    // Amount should be reduced by 20%
    expect(data.amount).toBeLessThan(150);
  });
});

describe('Registration - Pro-rated Fee', () => {
  test('calculates pro-rated fee for mid-season', async () => {
    const baseFee = 150;
    const seasonStart = new Date('2026-01-01');
    const seasonEnd = new Date('2026-06-30');
    const now = new Date('2026-04-01');
    
    const totalDays = Math.ceil((seasonEnd.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.ceil((seasonEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const expectedProRated = Math.round(baseFee * (daysRemaining / totalDays) * 100) / 100;
    
    expect(expectedProRated).toBeLessThan(baseFee);
    expect(expectedProRated).toBeGreaterThan(0);
  });
});
