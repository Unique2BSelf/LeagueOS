"use client";

import { useState, useRef, useEffect } from 'react';

interface LivePhotoCaptureProps {
  onCapture: (photoData: string) => void;
  onVerified?: (verified: boolean) => void;
  required?: boolean;
}

export default function LivePhotoCapture({ onCapture, onVerified, required = true }: LivePhotoCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startCamera = async () => {
    if (!mounted) return;
    
    try {
      setError(null);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions.');
      } else {
        setError('Failed to access camera: ' + err.message);
      }
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    if (video.readyState !== 4) {
      setError('Video not ready. Please wait.');
      return;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Failed to capture photo');
      return;
    }
    
    ctx.drawImage(video, 0, 0);
    const photoData = canvas.toDataURL('image/jpeg', 0.85);
    
    stopCamera();
    setCapturedPhoto(photoData);
    onCapture(photoData);
    onVerified?.(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const photoData = event.target?.result as string;
      setCapturedPhoto(photoData);
      onCapture(photoData);
      onVerified?.(true);
    };
    reader.readAsDataURL(file);
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setError(null);
  };

  if (!mounted) {
    return <div className="p-6 text-center text-gray-400">Loading camera...</div>;
  }

  return (
    <div className="w-full">
      {capturedPhoto ? (
        <div className="relative">
          <img src={capturedPhoto} alt="Captured" className="w-full h-64 object-cover rounded-lg border-2 border-green-500" />
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-green-500 text-white text-sm font-medium">
            ✓ Photo Captured
          </div>
          <button type="button" onClick={retakePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/20 text-white">
            Retake Photo
          </button>
        </div>
      ) : stream ? (
        <div className="relative rounded-lg overflow-hidden bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-64 object-cover" />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <button 
              type="button" 
              onClick={capturePhoto} 
              className="px-8 py-3 rounded-full font-semibold"
              style={{ background: '#00F5FF', color: '#121212' }}
            >
              📸 Capture Photo
            </button>
            <button type="button" onClick={() => { stopCamera(); retakePhoto(); }} className="px-4 py-3 rounded-full bg-red-500 text-white">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button type="button" onClick={startCamera} className="w-full p-6 rounded-lg border-2 border-dashed border-cyan-500/50 hover:border-cyan-400 bg-white/5">
            <div className="text-center">
              <div className="text-4xl mb-2">📷</div>
              <p className="text-cyan-400 font-medium">Open Camera for Photo</p>
              <p className="text-gray-500 text-sm mt-1">Take a photo of yourself</p>
            </div>
          </button>
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-2">or upload a photo</p>
            <label className="inline-block px-4 py-2 rounded-lg bg-white/10 text-gray-300 cursor-pointer">
              📁 Upload from device
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      )}
      {error && <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg"><p className="text-red-400 text-sm text-center">{error}</p></div>}
    </div>
  );
}
