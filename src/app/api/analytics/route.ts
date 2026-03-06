import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Track an analytics event
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { eventType, userId, teamId, matchId, metadata } = body;
  
  const event = await prisma.analyticsEvent.create({
    data: { eventType, userId, teamId, matchId, metadata },
  });
  
  return NextResponse.json(event, { status: 201 });
}

// Get analytics data
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const period = searchParams.get('period') || '30'; // days
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));
  
  let data;
  
  if (type === 'overview') {
    // Get event counts by type
    const eventCounts = await prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      where: { createdAt: { gte: startDate } },
    });
    
    // Get unique users
    const allEvents = await prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: startDate } },
    });
    
    const uniqueUsers = new Set(allEvents.map(e => e.userId).filter(Boolean)).size;
    const uniqueTeams = new Set(allEvents.map(e => e.teamId).filter(Boolean)).size;
    
    data = {
      eventCounts: eventCounts.map(e => ({ type: e.eventType, count: 0 })),
      uniqueUsers,
      uniqueTeams,
      totalEvents: allEvents.length,
    };
  } else if (type === 'attendance') {
    // Mock attendance data for heatmap
    const attendance = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
    
    for (const day of days) {
      for (const hour of hours) {
        attendance.push({
          day,
          hour,
          count: Math.floor(Math.random() * 50) + 10, // Mock data
        });
      }
    }
    data = attendance;
  } else if (type === 'retention') {
    // Mock retention data
    data = [
      { month: 'Jan', retention: 100 },
      { month: 'Feb', retention: 92 },
      { month: 'Mar', retention: 88 },
      { month: 'Apr', retention: 85 },
      { month: 'May', retention: 82 },
      { month: 'Jun', retention: 79 },
    ];
  } else if (type === 'revenue') {
    // Mock revenue breakdown
    data = [
      { category: 'Registration', amount: 45000 },
      { category: 'Sponsorships', amount: 25000 },
      { category: 'Donations', amount: 8000 },
      { category: 'Merchandise', amount: 12000 },
      { category: 'Fines', amount: 2500 },
    ];
  } else {
    // Default: get recent events
    const events = await prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    data = events;
  }
  
  return NextResponse.json(data);
}
