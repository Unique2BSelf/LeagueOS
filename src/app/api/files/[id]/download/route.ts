import { FileVisibility } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readStoredFile, verifySignedDownloadToken } from '@/lib/file-storage';

export const runtime = 'nodejs';

const ADMIN_ROLES = new Set(['ADMIN', 'MODERATOR']);

function isAdmin(userRole: string): boolean {
  return ADMIN_ROLES.has(userRole);
}

async function getViewer(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return null;
  }

  const userRole = request.headers.get('x-user-role') || 'PLAYER';
  const memberships = await prisma.teamPlayer.findMany({
    where: { userId, status: 'APPROVED' },
    select: { teamId: true },
  });

  return {
    userId,
    userRole,
    teamIds: memberships.map((membership) => membership.teamId),
  };
}

function canAccessFile(
  file: {
    visibility: FileVisibility;
    uploadedById: string;
    subjectUserId: string | null;
    teamId: string | null;
  },
  viewer: Awaited<ReturnType<typeof getViewer>>
): boolean {
  if (file.visibility === FileVisibility.PUBLIC) {
    return true;
  }

  if (!viewer) {
    return false;
  }

  if (isAdmin(viewer.userRole)) {
    return true;
  }

  if (file.visibility === FileVisibility.LEAGUE) {
    return true;
  }

  if (file.visibility === FileVisibility.REF_ONLY) {
    return viewer.userRole === 'REF';
  }

  if (file.visibility === FileVisibility.OWNER) {
    return file.uploadedById === viewer.userId || file.subjectUserId === viewer.userId;
  }

  if (file.visibility === FileVisibility.TEAM) {
    return Boolean(file.teamId && viewer.teamIds.includes(file.teamId));
  }

  return false;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const token = request.nextUrl.searchParams.get('token');

    const file = await prisma.storedFile.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        originalName: true,
        mimeType: true,
        storageKey: true,
        visibility: true,
        uploadedById: true,
        subjectUserId: true,
        teamId: true,
        isArchived: true,
      },
    });

    if (!file || file.isArchived) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const hasValidToken = verifySignedDownloadToken(id, token);
    if (!hasValidToken) {
      const viewer = await getViewer(request);
      if (!canAccessFile(file, viewer)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: viewer ? 403 : 401 });
      }
    }

    const buffer = await readStoredFile(file.storageKey);
    const response = new NextResponse(new Uint8Array(buffer));
    response.headers.set('Content-Type', file.mimeType || 'application/octet-stream');
    response.headers.set(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.originalName || file.displayName)}"`
    );
    response.headers.set('Cache-Control', 'private, max-age=300');
    return response;
  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}
