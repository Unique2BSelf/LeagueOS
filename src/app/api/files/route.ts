import { FileCategory, FileVisibility } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  deleteStoredFile,
  formatBytes,
  getDownloadUrl,
  sanitizeDisplayName,
  validateUpload,
  writeUploadedFile,
} from '@/lib/file-storage';

export const runtime = 'nodejs';

const ADMIN_ROLES = new Set(['ADMIN', 'MODERATOR']);
const TEAM_UPLOAD_ROLES = new Set(['ADMIN', 'MODERATOR', 'CAPTAIN']);
const REF_UPLOAD_ROLES = new Set(['ADMIN', 'MODERATOR', 'REF']);

type AccessibleUser = {
  userId: string;
  userRole: string;
  teamIds: string[];
};

function isAdmin(userRole: string): boolean {
  return ADMIN_ROLES.has(userRole);
}

async function getAccessibleUser(request: NextRequest): Promise<AccessibleUser | null> {
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
  viewer: AccessibleUser | null
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

function canDeleteFile(
  file: {
    uploadedById: string;
    teamId: string | null;
  },
  viewer: AccessibleUser
): boolean {
  if (isAdmin(viewer.userRole)) {
    return true;
  }

  if (file.uploadedById === viewer.userId) {
    return true;
  }

  if (viewer.userRole === 'CAPTAIN' && file.teamId && viewer.teamIds.includes(file.teamId)) {
    return true;
  }

  return false;
}

function canUploadCategory(
  category: FileCategory,
  visibility: FileVisibility,
  viewer: AccessibleUser
): boolean {
  if (isAdmin(viewer.userRole)) {
    return true;
  }

  if (visibility === FileVisibility.ADMIN_ONLY || visibility === FileVisibility.PUBLIC || visibility === FileVisibility.LEAGUE) {
    return false;
  }

  if (category === FileCategory.TEAM_ASSET) {
    return TEAM_UPLOAD_ROLES.has(viewer.userRole);
  }

  if (category === FileCategory.CERTIFICATION) {
    return REF_UPLOAD_ROLES.has(viewer.userRole);
  }

  if (category === FileCategory.BACKGROUND_CHECK) {
    return viewer.userRole === 'REF' || viewer.userRole === 'PLAYER' || viewer.userRole === 'CAPTAIN';
  }

  return visibility === FileVisibility.OWNER;
}

function serializeFile(
  file: {
    id: string;
    displayName: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    category: FileCategory;
    visibility: FileVisibility;
    description: string | null;
    teamId: string | null;
    seasonId: string | null;
    subjectUserId: string | null;
    createdAt: Date;
    uploadedBy: { id: string; fullName: string; role: string };
  }
) {
  return {
    id: file.id,
    displayName: file.displayName,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    sizeLabel: formatBytes(file.sizeBytes),
    category: file.category,
    visibility: file.visibility,
    description: file.description,
    teamId: file.teamId,
    seasonId: file.seasonId,
    subjectUserId: file.subjectUserId,
    createdAt: file.createdAt.toISOString(),
    uploadedBy: file.uploadedBy,
    downloadUrl: getDownloadUrl(file.id),
  };
}

export async function GET(request: NextRequest) {
  try {
    const viewer = await getAccessibleUser(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const category = searchParams.get('category');

    const files = await prisma.storedFile.findMany({
      where: {
        isArchived: false,
        ...(category && category !== 'ALL' ? { category: category as FileCategory } : {}),
        ...(search
          ? {
              OR: [
                { displayName: { contains: search, mode: 'insensitive' } },
                { originalName: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
      take: 200,
    });

    const accessibleFiles = files.filter((file) => canAccessFile(file, viewer)).map(serializeFile);
    return NextResponse.json({ files: accessibleFiles });
  } catch (error) {
    console.error('Files GET error:', error);
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const viewer = await getAccessibleUser(request);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File upload is required' }, { status: 400 });
    }

    const validationError = validateUpload(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const categoryRaw = String(formData.get('category') || FileCategory.OTHER).toUpperCase();
    const visibilityRaw = String(formData.get('visibility') || FileVisibility.OWNER).toUpperCase();
    const category = Object.values(FileCategory).includes(categoryRaw as FileCategory)
      ? (categoryRaw as FileCategory)
      : FileCategory.OTHER;
    const visibility = Object.values(FileVisibility).includes(visibilityRaw as FileVisibility)
      ? (visibilityRaw as FileVisibility)
      : FileVisibility.OWNER;

    if (!canUploadCategory(category, visibility, viewer)) {
      return NextResponse.json({ error: 'You cannot upload that file type or visibility level' }, { status: 403 });
    }

    const teamIdRaw = String(formData.get('teamId') || '').trim();
    const teamId = teamIdRaw || null;
    const seasonId = String(formData.get('seasonId') || '').trim() || null;
    const subjectUserId = String(formData.get('subjectUserId') || '').trim() || null;
    const description = sanitizeDisplayName(String(formData.get('description') || '')) || null;
    const explicitDisplayName = sanitizeDisplayName(String(formData.get('displayName') || ''));
    const displayName = explicitDisplayName || sanitizeDisplayName(file.name) || file.name;

    if (visibility === FileVisibility.TEAM && !teamId) {
      return NextResponse.json({ error: 'teamId is required for team files' }, { status: 400 });
    }

    if (teamId && !isAdmin(viewer.userRole) && !viewer.teamIds.includes(teamId)) {
      return NextResponse.json({ error: 'You are not a member of that team' }, { status: 403 });
    }

    const savedFile = await writeUploadedFile(file);

    const createdFile = await prisma.storedFile.create({
      data: {
        displayName,
        originalName: file.name,
        storageKey: savedFile.storageKey,
        mimeType: file.type,
        sizeBytes: file.size,
        category,
        visibility,
        description,
        uploadedById: viewer.userId,
        teamId,
        seasonId,
        subjectUserId,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ file: serializeFile(createdFile) }, { status: 201 });
  } catch (error) {
    console.error('Files POST error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const viewer = await getAccessibleUser(request);
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    if (!fileId) {
      return NextResponse.json({ error: 'File id is required' }, { status: 400 });
    }

    const existing = await prisma.storedFile.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        storageKey: true,
        uploadedById: true,
        teamId: true,
        isArchived: true,
      },
    });

    if (!existing || existing.isArchived) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (!canDeleteFile(existing, viewer)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.storedFile.update({
      where: { id: fileId },
      data: { isArchived: true },
    });
    await deleteStoredFile(existing.storageKey);

    return NextResponse.json({ success: true, fileId });
  } catch (error) {
    console.error('Files DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
