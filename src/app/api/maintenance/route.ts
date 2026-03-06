import { NextRequest, NextResponse } from 'next/server';

/**
 * Maintenance Logs API per PRD:
 * - GET /api/maintenance → List issues
 * - POST /api/maintenance/log → Create issue for field
 * - Track field status
 */

interface MaintenanceLog {
  id: string;
  fieldId: string;
  fieldName: string;
  issue: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  notes?: string;
  reportedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

// In-memory storage
const logs: Map<string, MaintenanceLog> = new Map();

// Seed sample logs
const sampleLogs: MaintenanceLog[] = [
  { id: 'ml-1', fieldId: 'field-1', fieldName: 'Main Field', issue: 'Patch of dead grass near penalty box', status: 'OPEN', priority: 'MEDIUM', createdAt: new Date().toISOString() },
  { id: 'ml-2', fieldId: 'field-2', fieldName: 'North Field', issue: 'Broken goal net', status: 'RESOLVED', priority: 'LOW', resolvedAt: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'ml-3', fieldId: 'field-1', fieldName: 'Main Field', issue: 'Flooding in corner after rain', status: 'OPEN', priority: 'HIGH', createdAt: new Date().toISOString() },
];

sampleLogs.forEach(l => logs.set(l.id, l));

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fieldId = searchParams.get('fieldId');
  const status = searchParams.get('status');
  
  let result = Array.from(logs.values());
  
  if (fieldId) {
    result = result.filter(l => l.fieldId === fieldId);
  }
  
  if (status) {
    result = result.filter(l => l.status === status);
  }
  
  // Get stats
  const stats = {
    open: result.filter(l => l.status === 'OPEN').length,
    inProgress: result.filter(l => l.status === 'IN_PROGRESS').length,
    resolved: result.filter(l => l.status === 'RESOLVED').length,
    urgent: result.filter(l => l.priority === 'URGENT' && l.status !== 'RESOLVED').length,
  };
  
  // Group by field
  const byField = result.reduce((acc, log) => {
    if (!acc[log.fieldId]) acc[log.fieldId] = [];
    acc[log.fieldId].push(log);
    return acc;
  }, {} as Record<string, MaintenanceLog[]>);
  
  return NextResponse.json({
    logs: result,
    stats,
    byField,
    count: result.length,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fieldId, fieldName, issue, priority = 'MEDIUM', reportedBy, action } = body;
    
    if (action === 'log') {
      if (!fieldId || !issue) {
        return NextResponse.json(
          { error: 'fieldId and issue required' },
          { status: 400 }
        );
      }
      
      const log: MaintenanceLog = {
        id: 'ml-' + Date.now(),
        fieldId,
        fieldName: fieldName || 'Unknown Field',
        issue,
        status: 'OPEN',
        priority,
        reportedBy,
        notes: body.notes,
        createdAt: new Date().toISOString(),
      };
      
      logs.set(log.id, log);
      
      return NextResponse.json({
        success: true,
        log,
        message: 'Maintenance issue logged',
      });
    }
    
    if (action === 'update') {
      const { logId, status, notes } = body;
      
      if (!logId) {
        return NextResponse.json({ error: 'logId required' }, { status: 400 });
      }
      
      const log = logs.get(logId);
      if (!log) {
        return NextResponse.json({ error: 'Log not found' }, { status: 404 });
      }
      
      if (status) {
        log.status = status;
        if (status === 'RESOLVED') {
          log.resolvedAt = new Date().toISOString();
        }
      }
      
      if (notes) {
        log.notes = notes;
      }
      
      return NextResponse.json({
        success: true,
        log,
        message: 'Log updated',
      });
    }
    
    if (action === 'resolve') {
      const { logId } = body;
      
      if (!logId) {
        return NextResponse.json({ error: 'logId required' }, { status: 400 });
      }
      
      const log = logs.get(logId);
      if (!log) {
        return NextResponse.json({ error: 'Log not found' }, { status: 404 });
      }
      
      log.status = 'RESOLVED';
      log.resolvedAt = new Date().toISOString();
      
      return NextResponse.json({
        success: true,
        log,
        message: 'Issue resolved',
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use: log, update, resolve' },
      { status: 400 }
    );
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get available fields for maintenance
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'fields') {
    return NextResponse.json({
      fields: [
        { id: 'field-1', name: 'Main Field', location: 'Sports Complex A', status: 'OPEN' },
        { id: 'field-2', name: 'North Field', location: 'Sports Complex A', status: 'OPEN' },
        { id: 'field-3', name: 'East Field', location: 'Sports Complex B', status: 'MAINTENANCE' },
        { id: 'field-4', name: 'West Field', location: 'Sports Complex B', status: 'OPEN' },
      ],
    });
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
