import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminActor } from '@/lib/admin-auth';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      include: {
        fields: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getAdminActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const address = typeof body?.address === 'string' ? body.address.trim() : '';
    const latitude = body?.latitude === '' || body?.latitude === null || body?.latitude === undefined ? null : Number(body.latitude);
    const longitude = body?.longitude === '' || body?.longitude === null || body?.longitude === undefined ? null : Number(body.longitude);

    if (!name || !address) {
      return NextResponse.json({ error: 'name and address are required' }, { status: 400 });
    }

    const created = await prisma.location.create({
      data: {
        name,
        address,
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null,
      },
      include: {
        fields: true,
      },
    });

    await createAuditLog({
      actor,
      actionType: 'CREATE',
      entityType: 'LOCATION',
      entityId: created.id,
      after: {
        name: created.name,
        address: created.address,
        latitude: created.latitude,
        longitude: created.longitude,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating location:', error);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
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

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const nextName = typeof body?.name === 'string' ? body.name.trim() : existing.name;
    const nextAddress = typeof body?.address === 'string' ? body.address.trim() : existing.address;
    const nextLatitude = body?.latitude === '' ? null : body?.latitude === undefined ? existing.latitude : Number(body.latitude);
    const nextLongitude = body?.longitude === '' ? null : body?.longitude === undefined ? existing.longitude : Number(body.longitude);

    const updated = await prisma.location.update({
      where: { id },
      data: {
        name: nextName,
        address: nextAddress,
        latitude: Number.isFinite(nextLatitude) ? nextLatitude : null,
        longitude: Number.isFinite(nextLongitude) ? nextLongitude : null,
      },
      include: {
        fields: true,
      },
    });

    await createAuditLog({
      actor,
      actionType: 'UPDATE',
      entityType: 'LOCATION',
      entityId: updated.id,
      before: {
        name: existing.name,
        address: existing.address,
        latitude: existing.latitude,
        longitude: existing.longitude,
      },
      after: {
        name: updated.name,
        address: updated.address,
        latitude: updated.latitude,
        longitude: updated.longitude,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
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

    const existing = await prisma.location.findUnique({
      where: { id },
      include: { fields: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    if (existing.fields.length > 0) {
      return NextResponse.json({ error: 'Delete fields first before deleting a location' }, { status: 409 });
    }

    await prisma.location.delete({ where: { id } });

    await createAuditLog({
      actor,
      actionType: 'DELETE',
      entityType: 'LOCATION',
      entityId: id,
      before: {
        name: existing.name,
        address: existing.address,
        latitude: existing.latitude,
        longitude: existing.longitude,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}
