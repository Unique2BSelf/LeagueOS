'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useSessionUser } from '@/hooks/use-session-user';

type FileCategory =
  | 'ALL'
  | 'RULES'
  | 'FIELD_MAP'
  | 'WAIVER'
  | 'CERTIFICATION'
  | 'BACKGROUND_CHECK'
  | 'FUNDRAISING_FORM'
  | 'TEAM_ASSET'
  | 'REPORT'
  | 'PHOTO'
  | 'OTHER';

type FileVisibility = 'OWNER' | 'TEAM' | 'REF_ONLY' | 'LEAGUE' | 'PUBLIC' | 'ADMIN_ONLY';

interface StoredFile {
  id: string;
  displayName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sizeLabel: string;
  category: Exclude<FileCategory, 'ALL'>;
  visibility: FileVisibility;
  description: string | null;
  teamId: string | null;
  seasonId: string | null;
  subjectUserId: string | null;
  createdAt: string;
  uploadedBy: {
    id: string;
    fullName: string;
    role: string;
  };
  downloadUrl: string;
}

const categoryOptions: { value: FileCategory; label: string }[] = [
  { value: 'ALL', label: 'All categories' },
  { value: 'RULES', label: 'Rules' },
  { value: 'FIELD_MAP', label: 'Field Maps' },
  { value: 'WAIVER', label: 'Waivers' },
  { value: 'CERTIFICATION', label: 'Certifications' },
  { value: 'BACKGROUND_CHECK', label: 'Background Checks' },
  { value: 'FUNDRAISING_FORM', label: 'Fundraising Forms' },
  { value: 'TEAM_ASSET', label: 'Team Assets' },
  { value: 'REPORT', label: 'Reports' },
  { value: 'PHOTO', label: 'Photos' },
  { value: 'OTHER', label: 'Other' },
];

const uploadCategoryOptions = categoryOptions.filter((option) => option.value !== 'ALL');

const visibilityOptions: { value: FileVisibility; label: string; description: string }[] = [
  { value: 'OWNER', label: 'Private', description: 'Only you and admins can access it.' },
  { value: 'TEAM', label: 'Team', description: 'Visible to approved team members.' },
  { value: 'REF_ONLY', label: 'Refs', description: 'Visible to referees and admins.' },
  { value: 'LEAGUE', label: 'League', description: 'Visible to authenticated league users.' },
  { value: 'PUBLIC', label: 'Public', description: 'Publicly accessible by signed link.' },
];

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return <FileImage className="h-8 w-8 text-cyan-300" />;
  }

  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return <FileSpreadsheet className="h-8 w-8 text-emerald-300" />;
  }

  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('text')) {
    return <FileText className="h-8 w-8 text-amber-300" />;
  }

  return <File className="h-8 w-8 text-white/60" />;
}

function formatCategoryLabel(category: string): string {
  return category
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function FilesPage() {
  const { user, loading: sessionLoading } = useSessionUser();
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<FileCategory>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formState, setFormState] = useState({
    displayName: '',
    description: '',
    category: 'WAIVER' as Exclude<FileCategory, 'ALL'>,
    visibility: 'OWNER' as FileVisibility,
    teamId: '',
    seasonId: '',
    subjectUserId: '',
  });

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesCategory = category === 'ALL' || file.category === category;
      const needle = search.trim().toLowerCase();
      const matchesSearch =
        !needle ||
        file.displayName.toLowerCase().includes(needle) ||
        file.originalName.toLowerCase().includes(needle) ||
        (file.description || '').toLowerCase().includes(needle);

      return matchesCategory && matchesSearch;
    });
  }, [category, files, search]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'ALL') {
        params.set('category', category);
      }
      if (search.trim()) {
        params.set('search', search.trim());
      }

      const response = await fetch(`/api/files${params.toString() ? `?${params.toString()}` : ''}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load files');
      }

      setFiles(Array.isArray(data.files) ? data.files : []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    void loadFiles();
  }, [user]);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Choose a file before uploading');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('file', selectedFile);
      payload.append('displayName', formState.displayName);
      payload.append('description', formState.description);
      payload.append('category', formState.category);
      payload.append('visibility', formState.visibility);

      if (formState.teamId.trim()) {
        payload.append('teamId', formState.teamId.trim());
      }
      if (formState.seasonId.trim()) {
        payload.append('seasonId', formState.seasonId.trim());
      }
      if (formState.subjectUserId.trim()) {
        payload.append('subjectUserId', formState.subjectUserId.trim());
      }

      const response = await fetch('/api/files', {
        method: 'POST',
        body: payload,
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload file');
      }

      setFiles((current) => [data.file, ...current]);
      setSelectedFile(null);
      setFormState({
        displayName: '',
        description: '',
        category: 'WAIVER',
        visibility: 'OWNER',
        teamId: '',
        seasonId: '',
        subjectUserId: '',
      });

      const input = document.getElementById('file-upload') as HTMLInputElement | null;
      if (input) {
        input.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    setDeletingId(fileId);
    setError('');

    try {
      const response = await fetch(`/api/files?id=${encodeURIComponent(fileId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete file');
      }

      setFiles((current) => current.filter((file) => file.id !== fileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-white">Please log in to manage files</p>
          <Link href="/login?redirect=/dashboard/files" className="btn-primary">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="glass-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">League Documents</h1>
            <p className="mt-1 text-white/55">
              Private storage for waivers, certifications, field maps, reports, and league resources.
            </p>
          </div>
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            Signed downloads expire automatically. Files are served from private storage, not public assets.
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-card border border-red-500/40 p-4 text-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card p-6">
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by file name, description, or category"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white outline-none ring-0 placeholder:text-white/30"
              />
            </div>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as FileCategory)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4 flex items-center justify-between text-sm text-white/45">
            <span>{filteredFiles.length} file(s)</span>
            <button onClick={() => void loadFiles()} className="text-cyan-300 hover:text-cyan-200">
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {filteredFiles.map((file) => (
              <div key={file.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      {getFileIcon(file.mimeType)}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{file.displayName}</p>
                      <p className="text-sm text-white/45">
                        {file.sizeLabel} · {formatCategoryLabel(file.category)} · {new Date(file.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        Uploaded by {file.uploadedBy.fullName} ({file.uploadedBy.role})
                      </p>
                      {file.description && (
                        <p className="mt-2 text-sm text-white/55">{file.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="lg:ml-auto lg:text-right">
                    <div className="mb-3 flex flex-wrap gap-2 lg:justify-end">
                      <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
                        {formatCategoryLabel(file.category)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                        {formatCategoryLabel(file.visibility)}
                      </span>
                      {file.visibility !== 'PUBLIC' && (
                        <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                          <span className="inline-flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Signed
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <a
                        href={file.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                      {(user.role === 'ADMIN' || user.role === 'MODERATOR' || user.id === file.uploadedBy.id) && (
                        <button
                          onClick={() => void handleDelete(file.id)}
                          disabled={deletingId === file.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                        >
                          {deletingId === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredFiles.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 py-16 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-white/20" />
              <p className="text-lg font-medium text-white">No matching files</p>
              <p className="mt-2 text-sm text-white/45">
                Upload waivers, certifications, team assets, field maps, and reports from the panel on the right.
              </p>
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-white">Upload Document</h2>
            <p className="mt-1 text-sm text-white/50">
              Common use cases: ref certifications, waiver PDFs, background-check documents, field maps, and team jersey assets.
            </p>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-white/65">File</label>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.xlsx,.xls,.doc,.docx,.zip"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-3 file:py-2 file:text-sm file:font-medium file:text-black"
              />
              <p className="mt-2 text-xs text-white/35">PDF, images, spreadsheets, docs, text, and zip files up to 15 MB.</p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/65">Display name</label>
              <input
                type="text"
                value={formState.displayName}
                onChange={(event) => setFormState((current) => ({ ...current, displayName: event.target.value }))}
                placeholder="Leave blank to use the original file name"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/65">Description</label>
              <textarea
                value={formState.description}
                onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                placeholder="Optional context for admins, refs, captains, or players"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/65">Category</label>
                <select
                  value={formState.category}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, category: event.target.value as Exclude<FileCategory, 'ALL'> }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                >
                  {uploadCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/65">Visibility</label>
                <select
                  value={formState.visibility}
                  onChange={(event) => setFormState((current) => ({ ...current, visibility: event.target.value as FileVisibility }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                >
                  {visibilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-white/35">
                  {visibilityOptions.find((option) => option.value === formState.visibility)?.description}
                </p>
              </div>
            </div>

            {formState.visibility === 'TEAM' && (
              <div>
                <label className="mb-2 block text-sm text-white/65">Team ID</label>
                <input
                  type="text"
                  value={formState.teamId}
                  onChange={(event) => setFormState((current) => ({ ...current, teamId: event.target.value }))}
                  placeholder="Required for team-visible assets"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30"
                />
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/65">Season ID</label>
                <input
                  type="text"
                  value={formState.seasonId}
                  onChange={(event) => setFormState((current) => ({ ...current, seasonId: event.target.value }))}
                  placeholder="Optional season association"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/65">Subject User ID</label>
                <input
                  type="text"
                  value={formState.subjectUserId}
                  onChange={(event) => setFormState((current) => ({ ...current, subjectUserId: event.target.value }))}
                  placeholder="Optional owner for private docs"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload file
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
