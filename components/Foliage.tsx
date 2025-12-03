import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeUniforms } from '../types';

const foliageVertexShader = `
  uniform float uTime;
  uniform float uProgress;
  
  attribute vec3 aChaosPos;
  attribute float aRandom;
  
  varying vec3 vColor;
  varying float vAlpha;

  // Gold colors
  const vec3 cGold = vec3(1.0, 0.84, 0.0);
  const vec3 cEmerald = vec3(0.0, 0.4, 0.2);
  const vec3 cDarkGreen = vec3(0.01, 0.2, 0.1);

  void main() {
    // Current "Formed" position is the attribute 'position' (cone)
    // Target "Chaos" position is 'aChaosPos'
    
    // Non-linear interpolation for dramatic effect
    float t = smoothstep(0.0, 1.0, uProgress);
    
    // Add some noise movement when in chaos mode
    vec3 chaosMovement = aChaosPos + vec3(
      sin(uTime * 0.5 + aRandom * 10.0) * 0.5,
      cos(uTime * 0.3 + aRandom * 20.0) * 0.5,
      sin(uTime * 0.7 + aRandom * 30.0) * 0.5
    );

    vec3 finalPos = mix(position, chaosMovement, t);

    // Dynamic sizing
    float size = mix(0.15, 0.3, aRandom);
    
    // Color mixing based on height and randomness
    float heightFactor = (position.y + 5.0) / 15.0; // Normalize approx height
    vec3 baseColor = mix(cDarkGreen, cEmerald, heightFactor + aRandom * 0.2);
    
    // Add Gold highlights
    if (aRandom > 0.9) {
      baseColor = cGold;
      size *= 1.5;
    }

    vColor = baseColor;
    
    // Sparkle effect
    float sparkle = abs(sin(uTime * 2.0 + aRandom * 100.0));
    vColor += vec3(sparkle * 0.2);

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = size * (300.0 / -mvPosition.z);
    
    vAlpha = 1.0;
  }
`;

const foliageFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Circular particle
    vec2 circCoord = 2.0 * gl_PointCoord - 1.0;
    if (dot(circCoord, circCoord) > 1.0) {
      discard;
    }
    
    // Soft edge
    float alpha = 1.0 - smoothstep(0.8, 1.0, length(circCoord));
    
    gl_FragColor = vec4(vColor, alpha);
  }
`;

interface FoliageProps {
  progress: number;
}

const Foliage: React.FC<FoliageProps> = ({ progress }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, chaosPositions, randoms, count } = useMemo(() => {
    const count = 15000;
    const positions = new Float32Array(count * 3);
    const chaosPositions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);

    const treeHeight = 14;
    const maxRadius = 5;

    for (let i = 0; i < count; i++) {
      // 1. Formed Position (Cone)
      // Height from 0 to treeHeight
      // Density higher at bottom? No, simpler to be uniform or use rejection sampling
      const y = Math.random() * treeHeight; 
      const radiusAtY = ((treeHeight - y) / treeHeight) * maxRadius;
      
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radiusAtY; // Uniform disk distribution at slice Y
      
      const x = r * Math.cos(angle);
      const z = r * Math.sin(angle);
      
      // Shift y down to center tree roughly
      positions[i * 3] = x;
      positions[i * 3 + 1] = y - (treeHeight / 3); 
      positions[i * 3 + 2] = z;

      // 2. Chaos Position (Sphere explosion)
      const chaosRadius = 15 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      chaosPositions[i * 3] = chaosRadius * Math.sin(phi) * Math.cos(theta);
      chaosPositions[i * 3 + 1] = chaosRadius * Math.sin(phi) * Math.sin(theta);
      chaosPositions[i * 3 + 2] = chaosRadius * Math.cos(phi);

      randoms[i] = Math.random();
    }
    return { positions, chaosPositions, randoms, count };
  }, []);

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      // Smooth interpolation handled in parent, but we pass it to shader
      shaderRef.current.uniforms.uProgress.value = progress;
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 }
  }), []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aChaosPos"
          count={count}
          array={chaosPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={count}
          array={randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        vertexShader={foliageVertexShader}
        fragmentShader={foliageFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default Foliage;
