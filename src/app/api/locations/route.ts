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
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : '';
    const parkingInfo = typeof body?.parkingInfo === 'string' ? body.parkingInfo.trim() : '';
    const restroomInfo = typeof body?.restroomInfo === 'string' ? body.restroomInfo.trim() : '';
    const contactName = typeof body?.contactName === 'string' ? body.contactName.trim() : '';
    const contactEmail = typeof body?.contactEmail === 'string' ? body.contactEmail.trim() : '';
    const contactPhone = typeof body?.contactPhone === 'string' ? body.contactPhone.trim() : '';

    if (!name || !address) {
      return NextResponse.json({ error: 'name and address are required' }, { status: 400 });
    }

    const created = await prisma.location.create({
      data: {
        name,
        address,
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null,
        notes: notes || null,
        parkingInfo: parkingInfo || null,
        restroomInfo: restroomInfo || null,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
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
        notes: created.notes,
        parkingInfo: created.parkingInfo,
        restroomInfo: created.restroomInfo,
        contactName: created.contactName,
        contactEmail: created.contactEmail,
        contactPhone: created.contactPhone,
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
    const nextNotes = typeof body?.notes === 'string' ? body.notes.trim() : existing.notes;
    const nextParkingInfo = typeof body?.parkingInfo === 'string' ? body.parkingInfo.trim() : existing.parkingInfo;
    const nextRestroomInfo = typeof body?.restroomInfo === 'string' ? body.restroomInfo.trim() : existing.restroomInfo;
    const nextContactName = typeof body?.contactName === 'string' ? body.contactName.trim() : existing.contactName;
    const nextContactEmail = typeof body?.contactEmail === 'string' ? body.contactEmail.trim() : existing.contactEmail;
    const nextContactPhone = typeof body?.contactPhone === 'string' ? body.contactPhone.trim() : existing.contactPhone;

    const updated = await prisma.location.update({
      where: { id },
      data: {
        name: nextName,
        address: nextAddress,
        latitude: Number.isFinite(nextLatitude) ? nextLatitude : null,
        longitude: Number.isFinite(nextLongitude) ? nextLongitude : null,
        notes: nextNotes || null,
        parkingInfo: nextParkingInfo || null,
        restroomInfo: nextRestroomInfo || null,
        contactName: nextContactName || null,
        contactEmail: nextContactEmail || null,
        contactPhone: nextContactPhone || null,
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
        notes: existing.notes,
        parkingInfo: existing.parkingInfo,
        restroomInfo: existing.restroomInfo,
        contactName: existing.contactName,
        contactEmail: existing.contactEmail,
        contactPhone: existing.contactPhone,
      },
      after: {
        name: updated.name,
        address: updated.address,
        latitude: updated.latitude,
        longitude: updated.longitude,
        notes: updated.notes,
        parkingInfo: updated.parkingInfo,
        restroomInfo: updated.restroomInfo,
        contactName: updated.contactName,
        contactEmail: updated.contactEmail,
        contactPhone: updated.contactPhone,
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
        notes: existing.notes,
        parkingInfo: existing.parkingInfo,
        restroomInfo: existing.restroomInfo,
        contactName: existing.contactName,
        contactEmail: existing.contactEmail,
        contactPhone: existing.contactPhone,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}
