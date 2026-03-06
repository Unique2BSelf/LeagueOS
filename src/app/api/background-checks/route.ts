import { FileCategory, FileVisibility } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDownloadUrl, validateUpload, writeUploadedFile } from '@/lib/file-storage';

export const runtime = 'nodejs';

const ADMIN_ROLES = new Set(['ADMIN', 'MODERATOR']);

function isAdmin(role: string): boolean {
  return ADMIN_ROLES.has(role);
}

function getActor(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role') || 'PLAYER';
  return userId ? { userId, userRole } : null;
}

async function createStoredSupportFile(options: {
  file: File;
  category: FileCategory;
  uploadedById: string;
  subjectUserId: string;
  description?: string;
}) {
  const saved = await writeUploadedFile(options.file);
  return prisma.storedFile.create({
    data: {
      displayName: options.file.name,
      originalName: options.file.name,
      storageKey: saved.storageKey,
      mimeType: options.file.type,
      sizeBytes: options.file.size,
      category: options.category,
      visibility: FileVisibility.OWNER,
      description: options.description || null,
      uploadedById: options.uploadedById,
      subjectUserId: options.subjectUserId,
    },
  });
}

async function getLatestBackgroundCheck(userId: string) {
  return prisma.backgroundCheck.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

async function serializeBackgroundCheck(check: {
  id: string;
  provider: string;
  status: string;
  documentFileId: string | null;
  notes: string | null;
  resultUrl: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}) {
  let document = null;

  if (check.documentFileId) {
    const storedFile = await prisma.storedFile.findUnique({
      where: { id: check.documentFileId },
      select: {
        id: true,
        displayName: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
      },
    });

    if (storedFile) {
      document = {
        ...storedFile,
        downloadUrl: getDownloadUrl(storedFile.id),
      };
    }
  }

  return {
    id: check.id,
    provider: check.provider,
    status: check.status,
    notes: check.notes,
    resultUrl: check.resultUrl,
    expiresAt: check.expiresAt?.toISOString() || null,
    createdAt: check.createdAt.toISOString(),
    document,
  };
}

export async function GET(request: NextRequest) {
  try {
    const actor = getActor(request);
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    const targetUserId = requestedUserId || actor?.userId;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (requestedUserId && requestedUserId !== actor?.userId && !isAdmin(actor?.userRole || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const latest = await getLatestBackgroundCheck(targetUserId);
    if (!latest) {
      return NextResponse.json({
        status: 'NOT_INITIATED',
        message: 'No background check on file',
        document: null,
      });
    }

    return NextResponse.json(await serializeBackgroundCheck(latest));
  } catch (error) {
    console.error('Background checks GET error:', error);
    return NextResponse.json({ error: 'Failed to load background check' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = getActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const provider = String(formData.get('provider') || 'Checkr').trim() || 'Checkr';
    const notes = String(formData.get('notes') || '').trim() || null;
    const file = formData.get('file');
    const subjectUserId = String(formData.get('userId') || actor.userId).trim() || actor.userId;

    if (subjectUserId !== actor.userId && !isAdmin(actor.userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A document upload is required' }, { status: 400 });
    }

    const validationError = validateUpload(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const storedFile = await createStoredSupportFile({
      file,
      category: FileCategory.BACKGROUND_CHECK,
      uploadedById: actor.userId,
      subjectUserId,
      description: `Background check document for ${provider}`,
    });

    const created = await prisma.backgroundCheck.create({
      data: {
        userId: subjectUserId,
        provider,
        status: 'PENDING',
        documentFileId: storedFile.id,
        notes,
      },
    });

    if (subjectUserId === actor.userId) {
      await prisma.user.update({
        where: { id: subjectUserId },
        data: { backgroundCheckStatus: 'PENDING' },
      });
    }

    return NextResponse.json({
      success: true,
      check: await serializeBackgroundCheck(created),
      message: 'Background check submitted for review.',
    }, { status: 201 });
  } catch (error) {
    console.error('Background checks POST error:', error);
    return NextResponse.json({ error: 'Failed to submit background check' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = getActor(request);
    if (!actor || !isAdmin(actor.userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: actor ? 403 : 401 });
    }

    const body = await request.json();
    const checkId = String(body?.checkId || '').trim();
    const status = String(body?.status || '').trim().toUpperCase();
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : undefined;
    const expiresAt = typeof body?.expiresAt === 'string' && body.expiresAt ? new Date(body.expiresAt) : null;

    if (!checkId || !['PENDING', 'CLEAR', 'FAIL', 'EXPIRED'].includes(status)) {
      return NextResponse.json({ error: 'checkId and a valid status are required' }, { status: 400 });
    }

    const updated = await prisma.backgroundCheck.update({
      where: { id: checkId },
      data: {
        status,
        notes: notes ?? undefined,
        expiresAt: status === 'CLEAR' ? expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : expiresAt,
      },
    });

    await prisma.user.update({
      where: { id: updated.userId },
      data: { backgroundCheckStatus: status },
    });

    return NextResponse.json({
      success: true,
      check: await serializeBackgroundCheck(updated),
    });
  } catch (error) {
    console.error('Background checks PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update background check' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const actor = getActor(request);
    const body = await request.json();
    const requestedUserId = String(body?.userId || actor?.userId || '').trim();

    if (!requestedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (requestedUserId !== actor?.userId && !isAdmin(actor?.userRole || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const latest = await getLatestBackgroundCheck(requestedUserId);
    const isClear = Boolean(latest && latest.status === 'CLEAR' && (!latest.expiresAt || latest.expiresAt > new Date()));

    return NextResponse.json({
      canAccessRefJobs: isClear,
      status: latest?.status || 'NOT_INITIATED',
      expiresAt: latest?.expiresAt?.toISOString() || null,
      documentFileId: latest?.documentFileId || null,
    });
  } catch (error) {
    console.error('Background checks PUT error:', error);
    return NextResponse.json({ error: 'Failed to check background status' }, { status: 500 });
  }
}
