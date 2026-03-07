import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminActor } from '@/lib/admin-auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    const fields = await prisma.field.findMany({
      where: locationId ? { locationId } : undefined,
      include: {
        location: true,
      },
      orderBy: [{ location: { name: 'asc' } }, { name: 'asc' }],
    });

    return NextResponse.json(fields);
  } catch (error) {
    console.error('Error fetching fields:', error);
    return NextResponse.json({ error: 'Failed to fetch fields' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const locationId = typeof body?.locationId === 'string' ? body.locationId : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const qualityScore = Number(body?.qualityScore);
    const hasLights = Boolean(body?.hasLights);
    const surfaceType = typeof body?.surfaceType === 'string' ? body.surfaceType.trim() : '';
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : '';

    if (!locationId || !name || !Number.isInteger(qualityScore)) {
      return NextResponse.json({ error: 'locationId, name, and integer qualityScore are required' }, { status: 400 });
    }

    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const created = await prisma.field.create({
      data: {
        locationId,
        name,
        qualityScore,
        hasLights,
        surfaceType: surfaceType || null,
        notes: notes || null,
      },
      include: {
        location: true,
      },
    });

    await createAuditLog({
      actor,
      actionType: 'CREATE',
      entityType: 'FIELD',
      entityId: created.id,
      after: {
        locationId: created.locationId,
        locationName: created.location.name,
        name: created.name,
        qualityScore: created.qualityScore,
        hasLights: created.hasLights,
        surfaceType: created.surfaceType,
        notes: created.notes,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating field:', error);
    return NextResponse.json({ error: 'Failed to create field' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await prisma.field.findUnique({
      where: { id },
      include: { location: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    const nextName = typeof body?.name === 'string' ? body.name.trim() : existing.name;
    const nextQualityScore = body?.qualityScore === undefined ? existing.qualityScore : Number(body.qualityScore);
    const nextHasLights = body?.hasLights === undefined ? existing.hasLights : Boolean(body.hasLights);
    const nextSurfaceType = typeof body?.surfaceType === 'string' ? body.surfaceType.trim() : existing.surfaceType;
    const nextNotes = typeof body?.notes === 'string' ? body.notes.trim() : existing.notes;

    const updated = await prisma.field.update({
      where: { id },
      data: {
        name: nextName,
        qualityScore: Number.isInteger(nextQualityScore) ? nextQualityScore : existing.qualityScore,
        hasLights: nextHasLights,
        surfaceType: nextSurfaceType || null,
        notes: nextNotes || null,
      },
      include: { location: true },
    });

    await createAuditLog({
      actor,
      actionType: 'UPDATE',
      entityType: 'FIELD',
      entityId: updated.id,
      before: {
        locationId: existing.locationId,
        locationName: existing.location.name,
        name: existing.name,
        qualityScore: existing.qualityScore,
        hasLights: existing.hasLights,
        surfaceType: existing.surfaceType,
        notes: existing.notes,
      },
      after: {
        locationId: updated.locationId,
        locationName: updated.location.name,
        name: updated.name,
        qualityScore: updated.qualityScore,
        hasLights: updated.hasLights,
        surfaceType: updated.surfaceType,
        notes: updated.notes,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating field:', error);
    return NextResponse.json({ error: 'Failed to update field' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await prisma.field.findUnique({
      where: { id },
      include: { location: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    const scheduledMatches = await prisma.match.count({ where: { fieldId: id } });
    if (scheduledMatches > 0) {
      return NextResponse.json({ error: 'Cannot delete a field that has scheduled matches' }, { status: 409 });
    }

    await prisma.field.delete({ where: { id } });

    await createAuditLog({
      actor,
      actionType: 'DELETE',
      entityType: 'FIELD',
      entityId: id,
      before: {
        locationId: existing.locationId,
        locationName: existing.location.name,
        name: existing.name,
        qualityScore: existing.qualityScore,
        hasLights: existing.hasLights,
        surfaceType: existing.surfaceType,
        notes: existing.notes,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting field:', error);
    return NextResponse.json({ error: 'Failed to delete field' }, { status: 500 });
  }
}
