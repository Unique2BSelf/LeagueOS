import { NextRequest, NextResponse } from 'next/server';

/**
 * Volunteer Shifts API per PRD:
 * - GET /api/volunteers/shifts → List shifts for user/event
 * - POST /api/volunteers/shifts → Sign up for shift
 * - Track hours for recognition/tax purposes
 */

interface VolunteerShift {
  id: string;
  userId?: string;
  userName?: string;
  eventId: string;
  eventName: string;
  role: 'ID_CHECKER' | 'SETUP' | 'TEAR_DOWN' | 'SCOREKEEPER' | 'CONCESSIONS' | 'FIELD_MONITOR';
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  status: 'OPEN' | 'ASSIGNED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

// In-memory storage
const shifts: Map<string, VolunteerShift> = new Map();

// Seed some sample shifts
const sampleShifts: VolunteerShift[] = [
  { id: 'vs-1', eventId: 'match-1', eventName: 'FC United vs City Kickers', role: 'ID_CHECKER', date: '2026-03-08', startTime: '09:00', endTime: '11:00', hours: 2, status: 'ASSIGNED', createdAt: new Date().toISOString() },
  { id: 'vs-2', eventId: 'match-1', eventName: 'FC United vs City Kickers', role: 'SETUP', date: '2026-03-08', startTime: '08:00', endTime: '10:00', hours: 2, status: 'OPEN', createdAt: new Date().toISOString() },
  { id: 'vs-3', eventId: 'match-2', eventName: 'Riverside FC vs Thunder FC', role: 'SCOREKEEPER', date: '2026-03-15', startTime: '11:00', endTime: '13:00', hours: 2, status: 'OPEN', createdAt: new Date().toISOString() },
  { id: 'vs-4', eventId: 'event-1', eventName: 'Spring Tournament', role: 'CONCESSIONS', date: '2026-03-22', startTime: '08:00', endTime: '16:00', hours: 8, status: 'OPEN', createdAt: new Date().toISOString() },
];

sampleShifts.forEach(s => shifts.set(s.id, s));

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const eventId = searchParams.get('eventId');
  const status = searchParams.get('status');
  
  let result = Array.from(shifts.values());
  
  if (userId) {
    result = result.filter(s => s.userId === userId);
  }
  
  if (eventId) {
    result = result.filter(s => s.eventId === eventId);
  }
  
  if (status) {
    result = result.filter(s => s.status === status);
  }
  
  // Group by status for dashboard
  const grouped = {
    open: result.filter(s => s.status === 'OPEN'),
    assigned: result.filter(s => s.status === 'ASSIGNED'),
    confirmed: result.filter(s => s.status === 'CONFIRMED'),
    completed: result.filter(s => s.status === 'COMPLETED'),
  };
  
  // Calculate total hours
  const totalHours = result
    .filter(s => s.status === 'COMPLETED')
    .reduce((sum, s) => sum + s.hours, 0);
  
  return NextResponse.json({
    shifts: result,
    grouped,
    totalHours,
    count: result.length,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName, eventId, eventName, role, date, startTime, endTime, action } = body;
    
    if (action === 'signup') {
      if (!userId || !eventId || !role || !date) {
        return NextResponse.json(
          { error: 'userId, eventId, role, and date required' },
          { status: 400 }
        );
      }
      
      const hours = endTime && startTime 
        ? (parseInt(endTime.split(':')[0]) - parseInt(startTime.split(':')[0]))
        : 2;
      
      const shift: VolunteerShift = {
        id: 'vs-' + Date.now(),
        userId,
        userName: userName || 'Volunteer',
        eventId,
        eventName: eventName || 'Volunteer Event',
        role,
        date,
        startTime: startTime || '09:00',
        endTime: endTime || '11:00',
        hours,
        status: 'ASSIGNED',
        createdAt: new Date().toISOString(),
      };
      
      shifts.set(shift.id, shift);
      
      return NextResponse.json({
        success: true,
        shift,
        message: `Successfully signed up for ${role} shift`,
      });
    }
    
    if (action === 'cancel') {
      const { shiftId } = body;
      
      if (!shiftId) {
        return NextResponse.json({ error: 'shiftId required' }, { status: 400 });
      }
      
      const shift = shifts.get(shiftId);
      if (!shift) {
        return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
      }
      
      shift.status = 'CANCELLED';
      
      return NextResponse.json({
        success: true,
        shift,
        message: 'Shift cancelled',
      });
    }
    
    if (action === 'complete') {
      const { shiftId } = body;
      
      if (!shiftId) {
        return NextResponse.json({ error: 'shiftId required' }, { status: 400 });
      }
      
      const shift = shifts.get(shiftId);
      if (!shift) {
        return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
      }
      
      shift.status = 'COMPLETED';
      
      return NextResponse.json({
        success: true,
        shift,
        message: 'Shift marked as completed',
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use: signup, cancel, complete' },
      { status: 400 }
    );
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get available volunteer roles
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'roles') {
    return NextResponse.json({
      roles: [
        { id: 'ID_CHECKER', name: 'ID Checker', description: 'Verify player IDs at check-in', hoursPerShift: 2 },
        { id: 'SETUP', name: 'Field Setup', description: 'Set up goals, flags, equipment', hoursPerShift: 2 },
        { id: 'TEAR_DOWN', name: 'Field Tear Down', description: 'Put away equipment after games', hoursPerShift: 1 },
        { id: 'SCOREKEEPER', name: 'Scorekeeper', description: 'Keep official match scores', hoursPerShift: 2 },
        { id: 'CONCESSIONS', name: 'Concessions', description: 'Manage food and beverage stand', hoursPerShift: 4 },
        { id: 'FIELD_MONITOR', name: 'Field Monitor', description: 'Patrol fields, report issues', hoursPerShift: 2 },
      ],
    });
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
