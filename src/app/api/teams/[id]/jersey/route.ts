import { NextRequest, NextResponse } from 'next/server';
import { FileCategory, FileVisibility } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { deleteStoredFile, getDownloadUrl, validateUpload, writeUploadedFile } from '@/lib/file-storage';

async function getActor(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      isActive: true,
    },
  });
}

async function loadTeam(teamId: string) {
  return prisma.team.findUnique({
    where: { id: teamId },
    include: {
      season: { select: { id: true, name: true } },
      division: { select: { id: true, name: true } },
    },
  });
}

async function getLatestJerseyFile(teamId: string) {
  return prisma.storedFile.findFirst({
    where: {
      teamId,
      category: FileCategory.TEAM_ASSET,
      mimeType: { startsWith: 'image/' },
      description: 'TEAM_JERSEY',
      isArchived: false,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const file = await getLatestJerseyFile(id);
    if (!file) {
      return NextResponse.json({ error: 'Jersey image not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: file.id,
      displayName: file.displayName,
      downloadUrl: getDownloadUrl(file.id),
      teamId: file.teamId,
      createdAt: file.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Error loading team jersey:', error);
    return NextResponse.json({ error: 'Failed to load jersey image' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await getActor(request);
    if (!actor || !actor.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const team = await loadTeam(id);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (actor.role !== 'ADMIN' && team.captainId !== actor.id) {
      return NextResponse.json({ error: 'Only the captain or an admin can update the jersey image' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image upload is required' }, { status: 400 });
    }

    const validationError = validateUpload(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are supported for jersey photos' }, { status: 400 });
    }

    const previous = await getLatestJerseyFile(id);
    const savedFile = await writeUploadedFile(file);

    const created = await prisma.storedFile.create({
      data: {
        displayName: `${team.name} jersey`,
        originalName: file.name,
        storageKey: savedFile.storageKey,
        mimeType: file.type,
        sizeBytes: file.size,
        category: FileCategory.TEAM_ASSET,
        visibility: FileVisibility.PUBLIC,
        description: 'TEAM_JERSEY',
        uploadedById: actor.id,
        teamId: team.id,
        seasonId: team.seasonId,
      },
    });

    await prisma.team.update({
      where: { id: team.id },
      data: {
        jerseyPhotoUrl: `/api/teams/${team.id}/jersey`,
      },
    });

    if (previous) {
      await prisma.storedFile.update({
        where: { id: previous.id },
        data: { isArchived: true },
      });
      await deleteStoredFile(previous.storageKey);
    }

    await createAuditLog({
      actor,
      actionType: 'UPDATE',
      entityType: 'TEAM',
      entityId: team.id,
      before: {
        previousJerseyFileId: previous?.id ?? null,
      },
      after: {
        jerseyFileId: created.id,
        seasonId: team.seasonId,
        seasonName: team.season.name,
        divisionId: team.divisionId,
        divisionName: team.division.name,
      },
      notes: 'Updated team jersey image',
    });

    return NextResponse.json({
      id: created.id,
      downloadUrl: getDownloadUrl(created.id),
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading team jersey:', error);
    return NextResponse.json({ error: 'Failed to upload jersey image' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await getActor(request);
    if (!actor || !actor.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const team = await loadTeam(id);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (actor.role !== 'ADMIN' && team.captainId !== actor.id) {
      return NextResponse.json({ error: 'Only the captain or an admin can remove the jersey image' }, { status: 403 });
    }

    const existing = await getLatestJerseyFile(id);
    if (!existing) {
      return NextResponse.json({ error: 'Jersey image not found' }, { status: 404 });
    }

    await prisma.storedFile.update({
      where: { id: existing.id },
      data: { isArchived: true },
    });
    await deleteStoredFile(existing.storageKey);
    await prisma.team.update({
      where: { id: team.id },
      data: { jerseyPhotoUrl: null },
    });

    await createAuditLog({
      actor,
      actionType: 'DELETE',
      entityType: 'TEAM',
      entityId: team.id,
      before: {
        jerseyFileId: existing.id,
      },
      notes: 'Removed team jersey image',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team jersey:', error);
    return NextResponse.json({ error: 'Failed to delete jersey image' }, { status: 500 });
  }
}
