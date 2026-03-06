'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Camera, CheckCircle, XCircle, AlertTriangle, Shield, CreditCard, Loader2, User, Clock, QrCode } from 'lucide-react'

interface PlayerData {
  userId: string
  token: string
  timestamp: number
}

interface PlayerInfo {
  id: string
  fullName: string
  email: string
  photoUrl: string | null
  role: string
  isInsured: boolean
  insuranceExpiry: string | null
  isActive: boolean
  hasUnpaidFines: boolean
  unpaidFineAmount: number
  backgroundCheckStatus: string
  lockReason: string | null
}

export default function ScanIDPage() {
  const [user, setUser] = useState<any>(null)
  const [scanning, setScanning] = useState(false)
  const [scannedPlayer, setScannedPlayer] = useState<PlayerInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanHistory, setScanHistory] = useState<PlayerInfo[]>([])
  const [manualCode, setManualCode] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scannerRef = useRef<any>(null)

  useEffect(() => {
    const stored = localStorage.getItem('league_user')
    if (stored) setUser(JSON.parse(stored))
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  const startScanning = async () => {
    setError(null)
    
    // Check for HTTPS or localhost
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    
    if (!isSecure) {
      setError('Camera requires HTTPS. Use the app locally or access via HTTPS.')
      return
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera not supported in this browser. Use Manual Entry.')
      return
    }

    setScanning(true)
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      
      // Use BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
        scannerRef.current = setInterval(async () => {
          if (videoRef.current) {
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) {
                handleQRCode(barcodes[0].rawValue)
              }
            } catch {}
          }
        }, 200)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to access camera. Use Manual Entry.')
      setScanning(false)
    }
  }

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (scannerRef.current) {
      clearInterval(scannerRef.current)
      scannerRef.current = null
    }
    setScanning(false)
  }

  const handleQRCode = async (qrData: string) => {
    stopScanning()
    try {
      const data: PlayerData = JSON.parse(qrData)
      const age = Date.now() - data.timestamp
      if (age > 65000) {
        setError('QR code expired. Player needs to refresh their code.')
        return
      }
      await verifyPlayer(data.userId)
    } catch {
      setError('Invalid QR code format')
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      handleQRCode(manualCode.trim())
    }
  }

  const verifyPlayer = async (userId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${userId}`)
      if (!res.ok) throw new Error('Player not found')
      const playerData = await res.json()
      setScannedPlayer(playerData)
      setScanHistory(prev => [playerData, ...prev.slice(0, 9)])
    } catch (err: any) {
      setError(err.message || 'Failed to verify player')
    }
    setLoading(false)
  }

  const manualLookup = async () => {
    const email = prompt('Enter player email:')
    if (email) {
      setLoading(true)
      try {
        const res = await fetch(`/api/users?email=${encodeURIComponent(email)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.id) {
            setScannedPlayer(data)
            setScanHistory(prev => [data, ...prev.slice(0, 9)])
          } else {
            setError('Player not found')
          }
        }
      } catch { setError('Lookup failed') }
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Please log in to scan IDs</p>
          <Link href="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    )
  }

  const isLocked = scannedPlayer && (!scannedPlayer.isActive || scannedPlayer.hasUnpaidFines || !scannedPlayer.isInsured)

  return (
    <div className="max-w-md mx-auto">
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">ID Scanner</h1>
            <p className="text-white/50 text-sm">Scan player QR codes for verification</p>
          </div>
          <Link href="/dashboard" className="text-cyan-400 hover:underline text-sm">Back</Link>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="glass-card p-4 mb-4 border-2 border-red-500/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Camera View */}
      {scanning && (
        <div className="glass-card p-4 mb-4">
          <div className="relative aspect-square bg-black rounded-lg overflow-hidden mb-4">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-cyan-400 rounded-lg">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-lg"></div>
              </div>
            </div>
          </div>
          <button onClick={stopScanning} className="btn-secondary w-full">Cancel</button>
        </div>
      )}

      {/* Scanned Player */}
      {scannedPlayer && !loading && (
        <div className={`glass-card p-6 mb-4 ${isLocked ? 'status-locked' : 'status-active'}`}>
          {isLocked && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2">
              <XCircle className="text-red-400" />
              <span className="text-red-400 font-semibold">LOCKED</span>
            </div>
          )}
          
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-16 h-16 rounded-full overflow-hidden border-2 ${!isLocked ? 'border-green-400' : 'border-red-500'}`}>
              {scannedPlayer.photoUrl ? (
                <img src={scannedPlayer.photoUrl} alt={scannedPlayer.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <User className="text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">{scannedPlayer.fullName}</h2>
              <p className="text-white/60 text-sm">{scannedPlayer.role}</p>
              {isLocked && <p className="text-red-400 text-sm mt-1">{scannedPlayer.lockReason || 'Account locked'}</p>}
            </div>
            {!isLocked && <CheckCircle className="text-green-400 w-8 h-8" />}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-white/5 rounded">
              <div className="flex items-center gap-2">
                <Shield size={16} className={scannedPlayer.isInsured ? 'text-green-400' : 'text-red-400'} />
                <span className="text-white/70">Insurance</span>
              </div>
              <span className={scannedPlayer.isInsured ? 'text-green-400' : 'text-red-400'}>
                {scannedPlayer.isInsured ? 'Valid' : 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white/5 rounded">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className={scannedPlayer.backgroundCheckStatus === 'CLEAR' ? 'text-green-400' : 'text-yellow-400'} />
                <span className="text-white/70">Background</span>
              </div>
              <span className={scannedPlayer.backgroundCheckStatus === 'CLEAR' ? 'text-green-400' : 'text-yellow-400'}>
                {scannedPlayer.backgroundCheckStatus || 'Pending'}
              </span>
            </div>
            {scannedPlayer.hasUnpaidFines && (
              <div className="flex items-center justify-between p-2 bg-red-500/20 rounded">
                <span className="text-red-400">Unpaid Fines</span>
                <span className="text-red-400 font-bold">${scannedPlayer.unpaidFineAmount}</span>
              </div>
            )}
          </div>

          <button onClick={() => setScannedPlayer(null)} className="btn-secondary w-full mt-4">Scan Another</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-white/60">Verifying player...</p>
        </div>
      )}

      {/* Action Buttons */}
      {!scanning && !scannedPlayer && !loading && (
        <div className="glass-card p-4">
          <button onClick={startScanning} className="btn-primary w-full flex items-center justify-center gap-2 mb-3">
            <Camera className="w-5 h-5" />Start Scanning
          </button>
          <button onClick={manualLookup} className="btn-secondary w-full flex items-center justify-center gap-2 mb-3">
            <User className="w-5 h-5" />Manual Lookup
          </button>
          
          {/* Manual Code Entry */}
          <form onSubmit={handleManualSubmit} className="mt-3 pt-3 border-t border-white/10">
            <p className="text-white/50 text-xs mb-2 text-center">Or enter QR code manually:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder='{"userId":"xxx","token":"yyy",...}'
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
              <button type="submit" className="btn-primary px-3">
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <div className="glass-card p-4 mt-4">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Clock className="w-4 h-4" />Recent Scans</h3>
          <div className="space-y-2">
            {scanHistory.map((player, idx) => {
              const locked = !player.isActive || player.hasUnpaidFines || !player.isInsured
              return (
                <div key={idx} onClick={() => setScannedPlayer(player)} className="flex items-center gap-3 p-2 bg-white/5 rounded cursor-pointer hover:bg-white/10">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700">
                    {player.photoUrl ? <img src={player.photoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-gray-400" /></div>}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{player.fullName}</p>
                    <p className="text-white/40 text-xs">{player.role}</p>
                  </div>
                  {locked ? <XCircle className="text-red-400 w-5 h-5" /> : <CheckCircle className="text-green-400 w-5 h-5" />}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
