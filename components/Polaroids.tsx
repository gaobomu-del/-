import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const Photo = ({ url, position, rotation, progress, randomOffset }: any) => {
  const meshRef = useRef<THREE.Group>(null);
  const texture = useTexture(url);
  
  // Base positions
  const formedPos = new THREE.Vector3(...position);
  // Calculate a random chaos position far away
  const chaosPos = useMemo(() => {
    const r = 20 + Math.random() * 10;
    const theta = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 20;
    return new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Interpolate position
    const currPos = new THREE.Vector3().lerpVectors(formedPos, chaosPos, progress);
    
    // Add float
    const t = state.clock.elapsedTime;
    currPos.y += Math.sin(t + randomOffset) * 0.2;

    meshRef.current.position.copy(currPos);
    
    // Interpolate rotation: Neat on tree, crazy in chaos
    const targetRot = new THREE.Euler(
        rotation[0] + Math.sin(t) * 0.1,
        rotation[1] + Math.cos(t) * 0.1,
        rotation[2]
    );
    
    const chaosRot = new THREE.Euler(
        t * 0.5 + randomOffset,
        t * 0.3,
        t * 0.2
    );

    meshRef.current.rotation.x = THREE.MathUtils.lerp(targetRot.x, chaosRot.x, progress);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(targetRot.y, chaosRot.y, progress);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(targetRot.z, chaosRot.z, progress);
  });

  return (
    <group ref={meshRef}>
      {/* Paper Frame */}
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[2.2, 2.6, 0.05]} />
        <meshStandardMaterial color="#fff" roughness={0.6} />
      </mesh>
      {/* Image */}
      <mesh position={[0, 0.2, 0.03]}>
        <planeGeometry args={[1.8, 1.8]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      {/* Gold Clip/Tape visual */}
      <mesh position={[0, 1.2, 0.04]}>
        <boxGeometry args={[0.3, 0.1, 0.05]} />
        <meshStandardMaterial color="gold" metalness={1} roughness={0.1} />
      </mesh>
    </group>
  );
};

const Polaroids = ({ progress }: { progress: number }) => {
  const photos = useMemo(() => {
    const items = [];
    const count = 12;
    const treeHeight = 10;
    const maxRadius = 4.5;
    
    for (let i = 0; i < count; i++) {
       // Spiral distribution
       const y = (i / count) * treeHeight - (treeHeight/3);
       const r = ((treeHeight/3 + y + 4) / treeHeight) * maxRadius * 1.1; // Slightly further out
       const angle = i * 1.5;
       
       const x = r * Math.cos(angle);
       const z = r * Math.sin(angle);
       
       items.push({
         url: `https://picsum.photos/200/200?random=${i}`,
         position: [x, y, z],
         rotation: [0, -angle + Math.PI/2, 0], // Face outward
         randomOffset: Math.random() * 100
       });
    }
    return items;
  }, []);

  return (
    <group>
      {photos.map((p, i) => (
        <Photo key={i} {...p} progress={progress} />
      ))}
    </group>
  );
};

export default Polaroids;
