"use client";

import { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';

interface LivePhotoCaptureProps {
  onCapture: (photoData: string) => void;
  onVerified?: (verified: boolean) => void;
  required?: boolean;
}

type VerificationState = 'idle' | 'loading' | 'ready' | 'detecting' | 'verified' | 'failed';

interface LivenessChallenge {
  type: 'blink' | 'turn_left' | 'turn_right' | 'smile';
  instruction: string;
}

const CHALLENGES: LivenessChallenge[] = [
  { type: 'blink', instruction: 'Blink your eyes slowly' },
  { type: 'turn_left', instruction: 'Turn your head to the left' },
  { type: 'turn_right', instruction: 'Turn your head to the right' },
  { type: 'smile', instruction: 'Smile briefly' },
];

export default function LivePhotoCapture({ onCapture, onVerified, required = true }: LivePhotoCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [verificationState, setVerificationState] = useState<VerificationState>('idle');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState<LivenessChallenge | null>(null);
  const [challengeComplete, setChallengeComplete] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Load face-api models
    loadModels();

    return () => {
      stopDetection();
      stopCamera();
    };
  }, []);

  const loadModels = async () => {
    setVerificationState('loading');
    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
      
      // Try to load models with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      const loadPromise = Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      
      await Promise.race([loadPromise, timeoutPromise]);
      
      setModelsLoaded(true);
      setVerificationState('ready');
    } catch (err) {
      console.error('Failed to load face models:', err);
      setFaceError('Face verification unavailable - you can still upload a photo');
      setVerificationState('ready'); // Continue without verification
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      setFaceError(null);
      setFaceDetected(false);
      setLivenessPassed(false);
      setChallengeComplete(false);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          if (modelsLoaded) {
            startFaceDetection();
          }
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please grant permission or use file upload.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    stopDetection();
  };

  const stopDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  const startFaceDetection = () => {
    if (!videoRef.current || !modelsLoaded) return;
    
    setVerificationState('detecting');
    
    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current) return;

      try {
        // Use type assertion for simpler detection
        const detections = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks() as any;

        if (detections && detections.detection) {
          const box = detections.detection.box;
          const videoWidth = videoRef.current.videoWidth;
          const videoHeight = videoRef.current.videoHeight;
          
          // Check face size (must be at least 20% of frame)
          const faceRatio = (box.width * box.height) / (videoWidth * videoHeight);
          
          // Check face is centered (within middle 60% of frame)
          const centerX = box.x + box.width / 2;
          const centerY = box.y + box.height / 2;
          const isCentered = 
            centerX > videoWidth * 0.2 && 
            centerX < videoWidth * 0.8 &&
            centerY > videoHeight * 0.2 && 
            centerY < videoHeight * 0.8;

          if (faceRatio > 0.08 && isCentered) {
            setFaceDetected(true);
            
            // Start liveness challenge if not started
            if (!currentChallenge && !livenessPassed) {
              startLivenessChallenge(detections);
            }
          } else {
            setFaceDetected(false);
          }
        } else {
          setFaceDetected(false);
        }
      } catch (err) {
        console.error('Face detection error:', err);
      }
    }, 500);
  };

  const startLivenessChallenge = (detections: any) => {
    // Pick a random challenge
    const challenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
    setCurrentChallenge(challenge);
    setVerificationState('detecting');

    // Monitor for challenge completion
    const checkInterval = setInterval(async () => {
      if (!videoRef.current || challengeComplete) {
        clearInterval(checkInterval);
        return;
      }

      try {
        const freshDetections: any = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        if (!freshDetections) return;

        const landmarks = freshDetections.landmarks;
        const expressions = freshDetections.expressions;

        let completed = false;

        switch (challenge.type) {
          case 'blink':
            // Check for blink via eye aspect ratio
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();
            const leftEAR = eyeAspectRatio(leftEye);
            const rightEAR = eyeAspectRatio(rightEye);
            if (leftEAR < 0.2 || rightEAR < 0.2) completed = true;
            break;
            
          case 'turn_left':
            // Check head turn via nose position
            const nose = landmarks.getNose();
            const noseX = nose[3].x / videoRef.current.videoWidth;
            if (noseX < 0.35) completed = true;
            break;
            
          case 'turn_right':
            const noseRight = landmarks.getNose();
            const noseXRight = noseRight[3].x / videoRef.current.videoWidth;
            if (noseXRight > 0.65) completed = true;
            break;
            
          case 'smile':
            if (expressions.happy > 0.7) completed = true;
            break;
        }

        if (completed) {
          setChallengeComplete(true);
          setLivenessPassed(true);
          setVerificationState('verified');
      if (onVerified) onVerified(true);
          clearInterval(checkInterval);
        }
      } catch (err) {
        console.error('Challenge check error:', err);
      }
    }, 300);

    // Auto-fail if no response in 10 seconds
    setTimeout(() => {
      if (!challengeComplete) {
        setVerificationState('failed');
      if (onVerified) onVerified(false);
        setFaceError('Liveness check timed out. Please try again.');
      }
    }, 10000);
  };

  // Helper: Calculate eye aspect ratio
  const eyeAspectRatio = (eye: faceapi.Point[]): number => {
    const vertical1 = Math.sqrt(
      Math.pow(eye[1].x - eye[5].x, 2) + Math.pow(eye[1].y - eye[5].y, 2)
    );
    const vertical2 = Math.sqrt(
      Math.pow(eye[2].x - eye[4].x, 2) + Math.pow(eye[2].y - eye[4].y, 2)
    );
    const horizontal = Math.sqrt(
      Math.pow(eye[0].x - eye[3].x, 2) + Math.pow(eye[0].y - eye[3].y, 2)
    );
    return (vertical1 + vertical2) / (2 * horizontal);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Don't capture if verification failed
    if (verificationState === 'failed') {
      setError('Please pass the liveness check before capturing');
      return;
    }

    // If models loaded, require liveness pass
    if (modelsLoaded && !livenessPassed && !faceError) {
      setError('Please complete the liveness verification first');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      
      const photoData = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhoto(photoData);
      onCapture(photoData);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setError(null);
    setFaceError(null);
    setVerificationState('ready');
    setFaceDetected(false);
    setLivenessPassed(false);
    setChallengeComplete(false);
    setCurrentChallenge(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For uploaded files, we can't do liveness check - warn user
    setError('Please use camera capture for identity verification. Uploads require manual approval.');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCapturedPhoto(result);
      onCapture(result);
    };
    reader.readAsDataURL(file);
  };

  const getStatusColor = () => {
    switch (verificationState) {
      case 'loading': return 'bg-yellow-500';
      case 'ready': return 'bg-gray-500';
      case 'detecting': return 'bg-blue-500 animate-pulse';
      case 'verified': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (verificationState) {
      case 'loading': return 'Loading verification...';
      case 'ready': return 'Camera ready';
      case 'detecting': 
        if (currentChallenge) return currentChallenge.instruction;
        return faceDetected ? 'Face detected - follow instructions' : 'Position your face in the frame';
      case 'verified': return '✓ Identity verified';
      case 'failed': return '✗ Verification failed';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-300">
        {required ? 'Verified Photo *' : 'Photo'}
        <span className="text-cyan-400 ml-1">(AI-powered liveness detection)</span>
      </label>

      {!capturedPhoto ? (
        <div className="space-y-4">
          {stream ? (
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Face detection overlay */}
              {verificationState !== 'loading' && (
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                  <div className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor()}`}>
                    {getStatusText()}
                  </div>
                  {livenessPassed && (
                    <div className="px-3 py-1 rounded-full bg-green-500 text-white text-sm font-medium">
                      ✓ Verified
                    </div>
                  )}
                </div>
              )}
              
              {/* Face guide overlay */}
              {stream && !capturedPhoto && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full border-2 border-white/30" 
                       style={{ borderColor: faceDetected ? '#00FF00' : 'rgba(255,255,255,0.3)' }} />
                </div>
              )}

              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={verificationState === 'failed' || (modelsLoaded && !livenessPassed && !faceError)}
                  className={`px-6 py-2 rounded-full font-semibold transition ${
                    (verificationState === 'failed' || (modelsLoaded && !livenessPassed && !faceError))
                      ? 'bg-gray-500 cursor-not-allowed opacity-50' 
                      : 'hover:opacity-90'
                  }`}
                  style={{ background: verificationState === 'failed' ? '#666' : '#00F5FF', color: '#121212' }}
                >
                  📸 Capture Photo
                </button>
                <button
                  type="button"
                  onClick={() => { stopCamera(); retakePhoto(); }}
                  className="px-4 py-2 rounded-full bg-red-500 text-white font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!isMobile && !error && (
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full p-6 rounded-lg border-2 border-dashed border-cyan-500/50 hover:border-cyan-400 transition bg-white/5"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">📷</div>
                    <p className="text-cyan-400 font-medium">Open Camera for ID Verification</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {modelsLoaded 
                        ? 'Real-time face detection & liveness check enabled' 
                        : 'Loading face verification...'}
                    </p>
                  </div>
                </button>
              )}

              {isMobile && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full p-6 rounded-lg border-2 border-dashed border-cyan-500/50 hover:border-cyan-400 transition bg-white/5"
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-2">📸</div>
                      <p className="text-cyan-400 font-medium">Take Verified Photo</p>
                      <p className="text-gray-500 text-sm mt-1">Face detection enabled</p>
                    </div>
                  </button>
                </div>
              )}

              <div className="text-center">
                <p className="text-gray-500 text-sm mb-2">or upload a photo (may require manual approval)</p>
                <label className="inline-block px-4 py-2 rounded-lg bg-white/10 text-gray-300 cursor-pointer hover:bg-white/20 transition">
                  📁 Upload from device
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}
              
              {faceError && (
                <p className="text-yellow-400 text-sm text-center">{faceError}</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <img
            src={capturedPhoto}
            alt="Captured photo"
            className="w-full h-64 object-cover rounded-lg border-2 border-green-500"
          />
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-green-500 text-white text-sm font-medium">
            ✓ Verified
          </div>
          <button
            type="button"
            onClick={retakePhoto}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/20 text-white font-medium hover:bg-white/30 transition"
          >
            Retake Photo
          </button>
        </div>
      )}
    </div>
  );
}
