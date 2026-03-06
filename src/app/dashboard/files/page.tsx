'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FolderOpen, Upload, File, FileText, Image, Download, Trash2, Share2, Search, Grid, List } from 'lucide-react'

interface FileItem {
  id: string
  name: string
  type: 'document' | 'image' | 'spreadsheet' | 'pdf' | 'other'
  size: string
  uploadedAt: string
  uploadedBy: string
  url: string
}

const mockFiles: FileItem[] = [
  { id: '1', name: 'League Rules 2026.pdf', type: 'pdf', size: '2.4 MB', uploadedAt: '2026-01-15', uploadedBy: 'Admin', url: '#' },
  { id: '2', name: 'Field Map - Sports Complex A.pdf', type: 'pdf', size: '1.8 MB', uploadedAt: '2026-01-10', uploadedBy: 'Admin', url: '#' },
  { id: '3', name: 'Roster Template.xlsx', type: 'spreadsheet', size: '45 KB', uploadedAt: '2026-02-01', uploadedBy: 'Captain', url: '#' },
  { id: '4', name: 'Spring Schedule.xlsx', type: 'spreadsheet', size: '120 KB', uploadedAt: '2026-02-15', uploadedBy: 'Admin', url: '#' },
  { id: '5', name: 'Team Photos.zip', type: 'image', size: '15 MB', uploadedAt: '2026-02-20', uploadedBy: 'Admin', url: '#' },
  { id: '6', name: 'Insurance Waiver Form.pdf', type: 'pdf', size: '340 KB', uploadedAt: '2026-01-05', uploadedBy: 'Admin', url: '#' },
]

export default function FilesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState<FileItem[]>(mockFiles)
  const [view, setView] = useState<'grid' | 'list'>('list')
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('league_user')
    if (stored) {
      setUser(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-400" />
      case 'spreadsheet': return <FileText className="w-8 h-8 text-green-400" />
      case 'image': return <Image className="w-8 h-8 text-purple-400" />
      default: return <File className="w-8 h-8 text-gray-400" />
    }
  }

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleUpload = () => {
    setUploading(true)
    setTimeout(() => setUploading(false), 2000)
  }

  const deleteFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id))
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Please log in to manage files</p>
          <Link href="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">League Files</h1>
            <p className="text-white/50">Documents, schedules, maps, and resources</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary flex items-center gap-2"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Upload
            </button>
          </div>
        </div>

        {/* Search & View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            />
          </div>
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded ${view === 'list' ? 'bg-cyan-500 text-black' : 'text-white/50'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded ${view === 'grid' ? 'bg-cyan-500 text-black' : 'text-white/50'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Files */}
        {view === 'list' ? (
          <div className="space-y-2">
            {filteredFiles.map((file) => (
              <div key={file.id} className="glass-card p-3 flex items-center gap-4 hover:bg-white/5">
                {getFileIcon(file.type)}
                <div className="flex-1">
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-white/40 text-xs">
                    {file.size} • {file.uploadedAt} • by {file.uploadedBy}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 hover:bg-white/10 rounded">
                    <Download className="w-4 h-4 text-white/50" />
                  </button>
                  <button className="p-2 hover:bg-white/10 rounded">
                    <Share2 className="w-4 h-4 text-white/50" />
                  </button>
                  <button 
                    onClick={() => deleteFile(file.id)}
                    className="p-2 hover:bg-white/10 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <div key={file.id} className="glass-card p-4 text-center hover:bg-white/5">
                <div className="flex justify-center mb-3">
                  {getFileIcon(file.type)}
                </div>
                <p className="text-white text-sm font-medium truncate">{file.name}</p>
                <p className="text-white/40 text-xs">{file.size}</p>
              </div>
            ))}
          </div>
        )}

        {filteredFiles.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No files found</p>
          </div>
        )}
      </div>
    </div>
  )
}
