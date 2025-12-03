import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface OrnamentProps {
  progress: number; // 0 to 1
  type: 'ball' | 'gift';
  count: number;
  colorPalette: string[];
}

const Ornaments: React.FC<OrnamentProps> = ({ progress, type, count, colorPalette }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = new THREE.Object3D();

  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const treeHeight = 12;
      const maxRadius = 5.5; // Slightly outside foliage

      // Formed Position
      const y = Math.random() * treeHeight;
      const rAtY = ((treeHeight - y) / treeHeight) * maxRadius;
      const angle = Math.random() * Math.PI * 2;
      
      // We want ornaments on the SURFACE mostly
      const r = rAtY * (0.8 + Math.random() * 0.3);
      
      const formX = r * Math.cos(angle);
      const formY = y - (treeHeight / 3);
      const formZ = r * Math.sin(angle);

      // Chaos Position
      const chaosRadius = 10 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      const chaosX = chaosRadius * Math.sin(phi) * Math.cos(theta);
      const chaosY = chaosRadius * Math.sin(phi) * Math.sin(theta);
      const chaosZ = chaosRadius * Math.cos(phi);

      const scale = 0.3 + Math.random() * 0.4;
      const rotSpeed = (Math.random() - 0.5) * 2;
      const rotAxis = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();

      // Pick random color
      const color = new THREE.Color(colorPalette[Math.floor(Math.random() * colorPalette.length)]);

      return {
        formPos: new THREE.Vector3(formX, formY, formZ),
        chaosPos: new THREE.Vector3(chaosX, chaosY, chaosZ),
        scale,
        rotSpeed,
        rotAxis,
        color,
        randomOffset: Math.random() * 100
      };
    });
  }, [count, type, colorPalette]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    data.forEach((d, i) => {
      meshRef.current!.setColorAt(i, d.color);
    });
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [data]);

  useFrame((state) => {
    if (!meshRef.current) return;

    const t = state.clock.getElapsedTime();
    const lerpFactor = progress; // Use linear or ease externally

    data.forEach((d, i) => {
      const currentPos = new THREE.Vector3().lerpVectors(d.formPos, d.chaosPos, lerpFactor);
      
      // Add floating noise
      currentPos.y += Math.sin(t * 1.0 + d.randomOffset) * 0.1;
      
      tempObj.position.copy(currentPos);
      
      // Rotation logic
      if (lerpFactor > 0.5) {
          // Spin wildly in chaos
          tempObj.rotateOnAxis(d.rotAxis, d.rotSpeed * 0.1);
      } else {
          // Slow refined spin in tree form
          tempObj.rotation.set(0, t * 0.2 + d.randomOffset, 0);
      }
      
      tempObj.scale.setScalar(d.scale);
      tempObj.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObj.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const geometry = type === 'ball' 
    ? new THREE.SphereGeometry(1, 16, 16) 
    : new THREE.BoxGeometry(1.2, 1.2, 1.2);

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]} castShadow receiveShadow>
      <meshStandardMaterial 
        roughness={0.2} 
        metalness={0.9} 
        envMapIntensity={1.5}
      />
    </instancedMesh>
  );
};

export default Ornaments;
