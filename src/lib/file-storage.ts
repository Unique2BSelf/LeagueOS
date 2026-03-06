import { createHmac, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

const DEFAULT_STORAGE_ROOT = path.join(process.cwd(), 'storage', 'private');
const DEFAULT_SIGNED_URL_TTL_MS = 1000 * 60 * 15;
const DEFAULT_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const MIME_EXTENSION_MAP: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
};

const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_EXTENSION_MAP));

function getStorageSecret(): string {
  return process.env.FILE_URL_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'league-os-file-secret-change-me';
}

export function getStorageRoot(): string {
  return process.env.FILE_STORAGE_ROOT || DEFAULT_STORAGE_ROOT;
}

export function getMaxUploadBytes(): number {
  const configured = Number(process.env.MAX_UPLOAD_BYTES || DEFAULT_MAX_UPLOAD_BYTES);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_UPLOAD_BYTES;
}

export async function ensureStorageRoot(): Promise<void> {
  await fs.mkdir(getStorageRoot(), { recursive: true });
}

export function sanitizeDisplayName(value: string): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function getFileExtension(originalName: string, mimeType: string): string {
  const fromName = path.extname(originalName || '').toLowerCase();
  if (fromName) {
    return fromName;
  }

  return MIME_EXTENSION_MAP[mimeType] || '';
}

export function validateUpload(file: File): string | null {
  if (!file || typeof file.arrayBuffer !== 'function') {
    return 'A file is required';
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return 'Unsupported file type';
  }

  if (file.size <= 0) {
    return 'Empty files are not allowed';
  }

  if (file.size > getMaxUploadBytes()) {
    return `File exceeds ${Math.round(getMaxUploadBytes() / (1024 * 1024))} MB limit`;
  }

  return null;
}

export async function writeUploadedFile(file: File): Promise<{ storageKey: string; absolutePath: string }> {
  await ensureStorageRoot();

  const extension = getFileExtension(file.name, file.type);
  const now = new Date();
  const folder = path.join(
    getStorageRoot(),
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, '0')
  );

  await fs.mkdir(folder, { recursive: true });

  const storageKey = path.posix.join(
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    `${randomUUID()}${extension}`
  );

  const absolutePath = path.join(getStorageRoot(), storageKey.replace(/\//g, path.sep));
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  return { storageKey, absolutePath };
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  const absolutePath = getStoredFilePath(storageKey);

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') {
      throw error;
    }
  }
}

export function getStoredFilePath(storageKey: string): string {
  return path.join(getStorageRoot(), storageKey.replace(/\//g, path.sep));
}

export async function readStoredFile(storageKey: string): Promise<Buffer> {
  return fs.readFile(getStoredFilePath(storageKey));
}

export function createSignedDownloadToken(fileId: string, expiresAt = Date.now() + DEFAULT_SIGNED_URL_TTL_MS): string {
  const payload = `${fileId}|${expiresAt}`;
  const signature = createHmac('sha256', getStorageSecret()).update(payload).digest('hex');
  return `${expiresAt}.${signature}`;
}

export function verifySignedDownloadToken(fileId: string, token: string | null | undefined): boolean {
  if (!token) {
    return false;
  }

  const [expiresAtRaw, signature] = token.split('.');
  const expiresAt = Number(expiresAtRaw);

  if (!signature || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  const payload = `${fileId}|${expiresAt}`;
  const expectedSignature = createHmac('sha256', getStorageSecret()).update(payload).digest('hex');
  return expectedSignature === signature;
}

export function getDownloadUrl(fileId: string): string {
  return `/api/files/${fileId}/download?token=${createSignedDownloadToken(fileId)}`;
}

export function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = sizeBytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
