import { Vector3 } from 'three';

export enum AppState {
  FORMED = 'FORMED', // The tree is a cone
  CHAOS = 'CHAOS',   // The tree is exploded
}

export interface HandGestureData {
  isOpen: boolean;    // True = Chaos, False = Formed
  handPosition: { x: number; y: number }; // Normalized -1 to 1
  detected: boolean;
}

export interface ParticleData {
  chaosPos: Vector3;
  targetPos: Vector3;
  color: string;
  size: number;
}

// Shader uniforms
export interface TreeUniforms {
  uTime: { value: number };
  uProgress: { value: number }; // 0 = Formed, 1 = Chaos
}
