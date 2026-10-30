/**
 * One keyframe per section. The scroll timeline interpolates between consecutive keyframes as each
 * section enters the viewport; CameraRig damps the real camera toward the result.
 *
 * Car space: metres, Y up, the car faces +Z, +X is its left side. Wheelbase 2.70 m, length 4.94 m.
 * Positions are authored for a landscape viewport; CameraRig pulls the camera back on narrow
 * aspects, so portrait framing needs no second set of numbers.
 */

export const SECTION_IDS = ['hero', 'identity', 'engine', 'aero', 'performance', 'ring', 'showroom', 'finale'] as const;
export type SectionId = (typeof SECTION_IDS)[number];

type Vec3 = readonly [number, number, number];

export interface CameraKeyframe {
  readonly position: Vec3;
  readonly target: Vec3;
  /** Vertical field of view, degrees. */
  readonly fov: number;
  /** Car yaw, radians. */
  readonly carYaw: number;
  /** Where the car sits on screen: -0.5 (left) … 0.5 (right). Landscape only, so copy has room. */
  readonly viewShift: number;
  /** Extra M4 yaw for this section, radians: keeps the background alive while reading. */
  readonly m4Yaw: number;
  /** Forward travel along the car's own axis, metres. Wheels roll to match. */
  readonly carOffsetZ: number;
  /** 1 lets the hero turntable run; 0 parks the car at `carYaw`. */
  readonly turntable: number;
  /** 0–1: red glow pulsing over the engine bay. */
  readonly engineGlow: number;
  /** 0–1: airflow streamlines over the body. */
  readonly aeroFlow: number;
  /** 0–1: headlights on (the configurator toggle can also switch them on). */
  readonly headlights: number;
  /** 0–1: studio key and rim light level. */
  readonly studioLight: number;
}

export const KEYFRAMES: Readonly<Record<SectionId, CameraKeyframe>> = {
  // Low front three-quarter; the name stands behind the car.
  hero: { position: [4.6, 1.05, 6.4], target: [0, 0.8, 0], fov: 30, carYaw: 0, viewShift: 0, m4Yaw: 0, carOffsetZ: 0, turntable: 1, engineGlow: 0, aeroFlow: 0, headlights: 0, studioLight: 1 },
  // Dolly in low to the other front three-quarter; car to the right, manifesto on the left.
  identity: { position: [-3.6, 0.55, 4.4], target: [0, 0.55, 0.4], fov: 32, carYaw: 0, viewShift: 0.18, m4Yaw: 0.25, carOffsetZ: 0, turntable: 0, engineGlow: 0, aeroFlow: 0, headlights: 0, studioLight: 1 },
  // Up and over the rear deck, looking down at the engine cover.
  engine: { position: [1.4, 2.7, -4.7], target: [0, 0.9, -1.0], fov: 34, carYaw: 0, viewShift: -0.16, m4Yaw: -0.3, carOffsetZ: 0, turntable: 0, engineGlow: 1, aeroFlow: 0, headlights: 0, studioLight: 1 },
  // Pure side profile: the airflow section reads left to right over the body.
  aero: { position: [7.8, 0.85, -0.15], target: [0, 0.6, -0.15], fov: 30, carYaw: 0, viewShift: 0, m4Yaw: 0.4, carOffsetZ: 0, turntable: 0, engineGlow: 0, aeroFlow: 1, headlights: 0, studioLight: 1 },
  // Ground level, nose-on and wide: the most aggressive angle, held through the horizontal stats.
  performance: { position: [2.0, 0.32, 6.0], target: [0, 0.52, 0], fov: 36, carYaw: 0.35, viewShift: 0.14, m4Yaw: -0.2, carOffsetZ: 0, turntable: 0, engineGlow: 0, aeroFlow: 0, headlights: 0, studioLight: 1 },
  // High and overhead: the car becomes a mark on the map while the track draws.
  ring: { position: [0.01, 24, 6.5], target: [0, 0, 0], fov: 30, carYaw: -0.6, viewShift: 0.24, m4Yaw: 0.6, carOffsetZ: 0, turntable: 0, engineGlow: 0, aeroFlow: 0, headlights: 0, studioLight: 1 },
  // Neutral three-quarter, the starting point for free orbit.
  // Aimed below the car so it rides in the upper frame, clear of the copy beneath.
  showroom: { position: [5.4, 1.9, 5.6], target: [0, 0.05, 0], fov: 32, carYaw: 0, viewShift: 0, m4Yaw: 0, carOffsetZ: 0, turntable: 0, engineGlow: 0, aeroFlow: 0, headlights: 0, studioLight: 1 },
  // Head-on and low; the room dims, headlights come on and the car rolls forward out of the light.
  finale: { position: [0, 0.8, 8.6], target: [0, -0.15, 0], fov: 28, carYaw: 0, viewShift: 0, m4Yaw: -0.15, carOffsetZ: 1.4, turntable: 0, engineGlow: 0, aeroFlow: 0, headlights: 1, studioLight: 0.4 },
};

/** Human names for the progress nav and screen readers. */
export const SECTION_LABELS: Readonly<Record<SectionId, string>> = {
  hero: 'Aventador SVJ',
  identity: 'Superveloce Jota',
  engine: 'V12',
  aero: 'Aerodinamica',
  performance: 'Performance',
  ring: 'Nürburgring',
  showroom: 'Showroom',
  finale: 'Limited',
};
