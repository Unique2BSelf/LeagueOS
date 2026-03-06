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

async function serializeCertification(certification: {
  id: string;
  fileId: string;
  certificationType: string;
  status: string;
  expiresAt: Date | null;
  notes: string | null;
  createdAt: Date;
}) {
  const storedFile = await prisma.storedFile.findUnique({
    where: { id: certification.fileId },
    select: {
      id: true,
      displayName: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
    },
  });

  return {
    id: certification.id,
    certificationType: certification.certificationType,
    status: certification.status,
    expiresAt: certification.expiresAt?.toISOString() || null,
    notes: certification.notes,
    createdAt: certification.createdAt.toISOString(),
    file: storedFile
      ? {
          ...storedFile,
          downloadUrl: getDownloadUrl(storedFile.id),
        }
      : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const actor = getActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = String(searchParams.get('userId') || actor.userId);
    if (requestedUserId !== actor.userId && !isAdmin(actor.userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const certifications = await prisma.officialCertification.findMany({
      where: { userId: requestedUserId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      certifications: await Promise.all(certifications.map(serializeCertification)),
    });
  } catch (error) {
    console.error('Certifications GET error:', error);
    return NextResponse.json({ error: 'Failed to load certifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = getActor(request);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const certificationType = String(formData.get('certificationType') || 'USSF').trim() || 'USSF';
    const notes = String(formData.get('notes') || '').trim() || null;
    const subjectUserId = String(formData.get('userId') || actor.userId).trim() || actor.userId;
    const expiresAtRaw = String(formData.get('expiresAt') || '').trim();
    const file = formData.get('file');

    if (subjectUserId !== actor.userId && !isAdmin(actor.userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A certification file is required' }, { status: 400 });
    }

    const validationError = validateUpload(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const saved = await writeUploadedFile(file);
    const storedFile = await prisma.storedFile.create({
      data: {
        displayName: file.name,
        originalName: file.name,
        storageKey: saved.storageKey,
        mimeType: file.type,
        sizeBytes: file.size,
        category: FileCategory.CERTIFICATION,
        visibility: FileVisibility.OWNER,
        description: `Ref certification: ${certificationType}`,
        uploadedById: actor.userId,
        subjectUserId,
      },
    });

    const created = await prisma.officialCertification.create({
      data: {
        userId: subjectUserId,
        fileId: storedFile.id,
        certificationType,
        status: 'ACTIVE',
        expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      certification: await serializeCertification(created),
    }, { status: 201 });
  } catch (error) {
    console.error('Certifications POST error:', error);
    return NextResponse.json({ error: 'Failed to upload certification' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = getActor(request);
    if (!actor || !isAdmin(actor.userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: actor ? 403 : 401 });
    }

    const body = await request.json();
    const certificationId = String(body?.certificationId || '').trim();
    const status = String(body?.status || '').trim().toUpperCase();
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : undefined;
    const expiresAt = typeof body?.expiresAt === 'string' && body.expiresAt ? new Date(body.expiresAt) : undefined;

    if (!certificationId || !status) {
      return NextResponse.json({ error: 'certificationId and status are required' }, { status: 400 });
    }

    const updated = await prisma.officialCertification.update({
      where: { id: certificationId },
      data: {
        status,
        notes,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      certification: await serializeCertification(updated),
    });
  } catch (error) {
    console.error('Certifications PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update certification' }, { status: 500 });
  }
}
