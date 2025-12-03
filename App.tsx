import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, ContactShadows, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

import Foliage from './components/Foliage';
import Ornaments from './components/Ornaments';
import Polaroids from './components/Polaroids';
import GestureHandler from './components/GestureHandler';
import { HandGestureData } from './types';

// Camera Rig to smooth out hand movements
const CameraRig = ({ targetX, targetY }: { targetX: number, targetY: number }) => {
  const { camera } = useThree();
  const vec = new THREE.Vector3();

  useFrame((state) => {
    // Look at center
    // Base position
    const baseX = 0;
    const BaseY = 2;
    const BaseZ = 18;

    // Interpolate camera position based on hand input
    // targetX/Y are between -1 and 1
    const x = THREE.MathUtils.lerp(camera.position.x, baseX + targetX * 10, 0.05);
    const y = THREE.MathUtils.lerp(camera.position.y, BaseY + targetY * 5, 0.05);
    
    camera.position.set(x, y, BaseZ);
    camera.lookAt(0, 3, 0);
  });
  return null;
}

const SceneContent = ({ progress, handX, handY }: { progress: number, handX: number, handY: number }) => {
    return (
        <>
            <CameraRig targetX={handX} targetY={handY} />
            <Environment preset="lobby" />
            
            <ambientLight intensity={0.2} color="#002211" />
            <pointLight position={[10, 10, 10]} intensity={1} color="#ffdd00" />
            <pointLight position={[-10, 5, -10]} intensity={0.5} color="#ffffff" />
            <spotLight 
              position={[0, 20, 0]} 
              angle={0.3} 
              penumbra={1} 
              intensity={2} 
              castShadow 
              color="#ffaa00"
            />

            <group position={[0, 0, 0]}>
                <Foliage progress={progress} />
                <Ornaments 
                    progress={progress} 
                    type="ball" 
                    count={200} 
                    colorPalette={['#FFD700', '#C0C0C0', '#D4AF37', '#B8860B']} // Golds
                />
                 <Ornaments 
                    progress={progress} 
                    type="gift" 
                    count={50} 
                    colorPalette={['#800000', '#004225', '#FFFFFF']} // Red, Green, White boxes
                />
                <Polaroids progress={progress} />
            </group>

            <ContactShadows opacity={0.6} scale={40} blur={2} far={10} resolution={256} color="#000000" />
            
            {/* Background elements */}
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        </>
    );
};

const App: React.FC = () => {
  const [gestureData, setGestureData] = useState<HandGestureData>({
    isOpen: false,
    handPosition: { x: 0, y: 0 },
    detected: false
  });

  // Smooth progress for animation
  const progressRef = useRef(0);
  // We use a dummy state to force re-renders for the Canvas components if needed, 
  // but better to pass refs or useFrame inside components. 
  // However, for the high-level 'progress' prop, we can animate a value or use state.
  // Using state for React update loop to pass down prop.
  const [animProgress, setAnimProgress] = useState(0);

  // Animation Loop outside canvas for prop update
  // In a real app we might use 'useSpring' but let's stick to RAF for simplicity with the logic provided
  React.useEffect(() => {
      let raf: number;
      const loop = () => {
          const target = gestureData.isOpen ? 1 : 0;
          // Lerp
          progressRef.current += (target - progressRef.current) * 0.05;
          setAnimProgress(progressRef.current);
          raf = requestAnimationFrame(loop);
      }
      loop();
      return () => cancelAnimationFrame(raf);
  }, [gestureData.isOpen]);


  const handleGestureUpdate = (data: { isOpen: boolean; x: number; y: number; detected: boolean }) => {
    setGestureData({
        isOpen: data.isOpen,
        handPosition: { x: data.x, y: data.y },
        detected: data.detected
    });
  };

  return (
    <div className="w-full h-full bg-black relative selection:bg-yellow-500 selection:text-black">
      
      {/* 3D Scene */}
      <Canvas shadows camera={{ position: [0, 4, 18], fov: 45 }} gl={{ antialias: false }}>
        <SceneContent 
            progress={animProgress} 
            handX={gestureData.detected ? gestureData.handPosition.x : 0} 
            handY={gestureData.detected ? gestureData.handPosition.y : 0} 
        />
        <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={0.8} mipmapBlur intensity={1.5} radius={0.6} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>

      {/* Gesture Controller (Webcam) */}
      <GestureHandler onGestureUpdate={handleGestureUpdate} />

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-8 pointer-events-none flex flex-col justify-between h-full">
        {/* Header */}
        <div className="flex flex-col items-center">
            <h1 className="font-serif text-5xl md:text-7xl text-transparent bg-clip-text bg-gradient-to-b from-[#FFD700] to-[#B8860B] drop-shadow-[0_2px_10px_rgba(255,215,0,0.5)] tracking-widest uppercase">
                The Grand Tree
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent mt-4 opacity-80"></div>
            <p className="font-sans text-yellow-100/60 mt-2 tracking-[0.3em] text-xs">
                INTERACTIVE LUXURY EXPERIENCE
            </p>
        </div>

        {/* Status */}
        <div className="flex justify-between items-end w-full">
             <div className="text-left">
                <p className="text-yellow-500/80 font-mono text-xs mb-1">SYSTEM STATUS</p>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${gestureData.detected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-white font-serif italic">
                        {gestureData.detected ? "AI Controller Active" : "Waiting for Camera..."}
                    </span>
                </div>
            </div>

            <div className="text-right">
                <p className="text-yellow-500/80 font-mono text-xs mb-1">MODE</p>
                <div className={`text-2xl font-serif transition-colors duration-500 ${gestureData.isOpen ? 'text-red-400' : 'text-emerald-400'}`}>
                    {gestureData.isOpen ? "CHAOS UNLEASHED" : "FORMED PERFECTION"}
                </div>
            </div>
        </div>
      </div>

      {/* Instructions Overlay */}
      {!gestureData.detected && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/40">
           <div className="border border-yellow-500/30 bg-black/80 backdrop-blur-md p-6 rounded text-center max-w-md">
               <h3 className="text-yellow-500 font-serif text-xl mb-2">Initialize Experience</h3>
               <p className="text-gray-300 text-sm mb-4">Please allow camera access to interact.</p>
               <ul className="text-left text-xs text-gray-400 space-y-2 font-mono">
                   <li>1. Show hand to camera</li>
                   <li>2. Open Palm = Explode Tree</li>
                   <li>3. Closed Fist = Reform Tree</li>
                   <li>4. Move Hand = Rotate View</li>
               </ul>
           </div>
        </div>
      )}
      
      {/* Decorative Border */}
      <div className="absolute inset-4 border border-[#FFD700]/20 pointer-events-none z-10 rounded-2xl"></div>
      <div className="absolute inset-5 border border-[#FFD700]/10 pointer-events-none z-10 rounded-xl"></div>

    </div>
  );
};

export default App;
