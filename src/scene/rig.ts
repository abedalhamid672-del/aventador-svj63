import { Vector3 } from 'three';
import { KEYFRAMES, type CameraKeyframe } from '../data/cameraKeyframes';

/**
 * Plain mutable "rig state". The scroll timeline writes the targets; components read them in
 * useFrame and damp toward them. Nothing here triggers a React render.
 */
export interface RigState {
  /** Where the camera wants to be (landscape framing; CameraRig adapts it to the aspect). */
  readonly position: Vector3;
  /** What the camera wants to look at. */
  readonly target: Vector3;
  fov: number;
  /** The damped look-at point the camera actually uses this frame (written by CameraRig). */
  readonly currentTarget: Vector3;
  /** Car yaw when parked, radians. */
  carYaw: number;
  /** 0–1: how much of the hero turntable spin is applied on top of `carYaw`. */
  turntable: number;
  /** Turntable spin speed, rad/s. */
  turntableSpeed: number;
  /** Car travel along its own forward axis, metres. */
  carOffsetZ: number;
  /** Screen-space car placement, -0.5 … 0.5 of the viewport width. */
  viewShift: number;
  /** Extra M4 yaw added per section, radians. */
  m4ScrollYaw: number;
  /** 0–1: red glow over the engine bay (Engine section). */
  engineGlow: number;
  /** 0–1: airflow streamlines over the body (Aero section). */
  aeroFlow: number;
  /** 0–1: headlights from the scroll timeline (Finale). */
  headlights: number;
  /** 0–1: studio light level from the scroll timeline (Finale dims it). */
  studioLight: number;
  /** Showroom free orbit, added on top of the keyframe (radians). Ignored unless enabled. */
  readonly orbit: { enabled: boolean; azimuth: number; elevation: number };
  /** Hotspot close-up: when active, CameraRig frames this instead of the scroll keyframe. */
  readonly focus: { active: boolean; readonly position: Vector3; readonly target: Vector3; fov: number };
  /** 0–1: hero title splitting apart as the hero scrolls away. */
  heroSplit: number;
  /** 0–1 through the pinned Performance section. */
  performanceProgress: number;
  /** Signed scroll velocity, normalised roughly to [-1, 1]. Drives chromatic aberration. */
  scrollVelocity: number;
}

const hero = KEYFRAMES.hero;

export const rig: RigState = {
  position: new Vector3(...hero.position),
  target: new Vector3(...hero.target),
  fov: hero.fov,
  currentTarget: new Vector3(...hero.target),
  carYaw: hero.carYaw,
  turntable: hero.turntable,
  turntableSpeed: 0.06,
  carOffsetZ: hero.carOffsetZ,
  viewShift: hero.viewShift,
  m4ScrollYaw: hero.m4Yaw,
  engineGlow: hero.engineGlow,
  aeroFlow: hero.aeroFlow,
  headlights: hero.headlights,
  studioLight: hero.studioLight,
  orbit: { enabled: false, azimuth: 0, elevation: 0 },
  focus: { active: false, position: new Vector3(), target: new Vector3(), fov: hero.fov },
  heroSplit: 0,
  performanceProgress: 0,
  scrollVelocity: 0,
};

/** Flat numeric form of a keyframe, so GSAP can tween every channel in one tween. */
export type RigChannels = Record<
  | 'px' | 'py' | 'pz' | 'tx' | 'ty' | 'tz' | 'fov' | 'carYaw' | 'viewShift' | 'm4Yaw' | 'carOffsetZ' | 'turntable'
  | 'engineGlow' | 'aeroFlow' | 'headlights' | 'studioLight',
  number
>;

export function toChannels(k: CameraKeyframe): RigChannels {
  return {
    px: k.position[0], py: k.position[1], pz: k.position[2],
    tx: k.target[0], ty: k.target[1], tz: k.target[2],
    fov: k.fov, carYaw: k.carYaw, viewShift: k.viewShift, m4Yaw: k.m4Yaw, carOffsetZ: k.carOffsetZ, turntable: k.turntable,
    engineGlow: k.engineGlow, aeroFlow: k.aeroFlow, headlights: k.headlights, studioLight: k.studioLight,
  };
}

export function applyChannels(c: RigChannels): void {
  rig.position.set(c.px, c.py, c.pz);
  rig.target.set(c.tx, c.ty, c.tz);
  rig.fov = c.fov;
  rig.carYaw = c.carYaw;
  rig.viewShift = c.viewShift;
  rig.m4ScrollYaw = c.m4Yaw;
  rig.carOffsetZ = c.carOffsetZ;
  rig.turntable = c.turntable;
  rig.engineGlow = c.engineGlow;
  rig.aeroFlow = c.aeroFlow;
  rig.headlights = c.headlights;
  rig.studioLight = c.studioLight;
}
