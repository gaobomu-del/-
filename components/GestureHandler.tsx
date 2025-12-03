import React, { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

interface GestureHandlerProps {
  onGestureUpdate: (data: { isOpen: boolean; x: number; y: number; detected: boolean }) => void;
}

const GestureHandler: React.FC<GestureHandlerProps> = ({ onGestureUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const lastVideoTimeRef = useRef(-1);
  const requestRef = useRef<number>(0);
  const landmarkerRef = useRef<HandLandmarker | null>(null);

  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        setLoaded(true);
        startCamera();
      } catch (error) {
        console.error("Failed to load MediaPipe:", error);
      }
    };

    initMediaPipe();

    return () => {
      cancelAnimationFrame(requestRef.current);
      landmarkerRef.current?.close();
    };
  }, []);

  const startCamera = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener('loadeddata', predict);
    } catch (err) {
      console.error("Camera denied or not found", err);
    }
  };

  const predict = () => {
    if (!videoRef.current || !landmarkerRef.current) return;

    if (videoRef.current.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      
      const results = landmarkerRef.current.detectForVideo(videoRef.current, performance.now());
      
      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        
        // Logic: 
        // 1. Calculate Hand Center (for camera rotation)
        // 2. Calculate "Openness" (Distance between Thumb Tip and Index Tip)
        
        const wrist = landmarks[0];
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];

        // Simple center approximation
        const centerX = (thumbTip.x + pinkyTip.x) / 2;
        const centerY = (thumbTip.y + wrist.y) / 2;
        
        // Map 0..1 to -1..1
        const normalizedX = (centerX - 0.5) * 2; 
        const normalizedY = (centerY - 0.5) * 2;

        // Openness detection: Are fingertips far from wrist?
        // A simple "Open Palm" vs "Fist" check.
        // Measure average distance of fingertips to wrist
        const tips = [indexTip, middleTip, ringTip, pinkyTip];
        const avgDist = tips.reduce((acc, tip) => {
           const d = Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2));
           return acc + d;
        }, 0) / 4;

        // Heuristic threshold for "Open Hand"
        const isOpen = avgDist > 0.3; 

        onGestureUpdate({
          isOpen,
          x: -normalizedX, // Mirror effect fix
          y: -normalizedY,
          detected: true
        });

      } else {
        onGestureUpdate({ isOpen: false, x: 0, y: 0, detected: false });
      }
    }
    
    requestRef.current = requestAnimationFrame(predict);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 overflow-hidden rounded-lg border-2 border-yellow-500/50 shadow-[0_0_20px_rgba(255,215,0,0.3)] bg-black">
      {/* Hidden processing video but we show it small for user feedback */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`w-32 h-24 object-cover transform -scale-x-100 opacity-80 ${loaded ? 'block' : 'hidden'}`}
      />
      {!loaded && <div className="w-32 h-24 flex items-center justify-center text-yellow-500 text-xs">Loading AI...</div>}
      <div className="absolute bottom-0 w-full bg-black/70 text-[10px] text-center text-yellow-200 py-1 font-serif">
        GESTURE LINK
      </div>
    </div>
  );
};

export default GestureHandler;
