import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { useRef } from 'react';
import { Fog, MathUtils, PerspectiveCamera, Spherical, Vector3 } from 'three';
import { rig } from './rig';

/** Seconds to cover ~most of the distance to a new keyframe. Weighty, never laggy. */
const SMOOTH_TIME = 0.55;
/** Orbit follows the drag a little faster than scroll flights, so it feels held. */
const ORBIT_SMOOTH = 0.3;
/** Fog band relative to the subject distance (metres behind the look-at point). */
const FOG_START = 3;
const FOG_END = 22;
/** Polar limits (from straight down the Y axis): never overhead, never under the floor. */
const MIN_POLAR = 0.32;
const MAX_POLAR = 1.48;
/** Keyframes are authored for this aspect; narrower viewports pull the camera back. */
const AUTHORED_ASPECT = 1.3;
/** Extra distance per unit of aspect below the authored one (portrait phone ≈ 2× distance). */
const PULLBACK_PER_ASPECT = 1.2;

/** Portrait and square screens see less width, so the camera backs off along its own line. */
export const distanceScale = (aspect: number): number =>
  aspect >= AUTHORED_ASPECT ? 1 : 1 + (AUTHORED_ASPECT - aspect) * PULLBACK_PER_ASPECT;

/**
 * Damps the real camera toward the rig targets every frame. Scroll never touches the camera
 * directly; it only moves `rig`, so fast scrolling still produces a smooth, frame-rate
 * independent glide.
 */
export function CameraRig() {
  const desired = useRef(new Vector3());
  const shift = useRef({ value: 0 });
  const orbit = useRef({ azimuth: 0, elevation: 0 });
  const spherical = useRef(new Spherical());

  // Negative priority: runs before every other useFrame, so view-anchored layers read
  // this frame's camera, not last frame's.
  useFrame((state, delta) => {
    const camera = state.camera;
    if (!(camera instanceof PerspectiveCamera)) return;

    // A hotspot close-up overrides the scroll keyframe until it is released.
    const { focus } = rig;
    const position = focus.active ? focus.position : rig.position;
    const target = focus.active ? focus.target : rig.target;
    const fov = focus.active ? focus.fov : rig.fov;

    const scale = distanceScale(camera.aspect);
    desired.current.copy(position).sub(target).multiplyScalar(scale);

    // Showroom orbit rides on top of the keyframe and eases back to zero when disabled, so the
    // scroll mapping is untouched outside the showroom.
    const orbitOn = rig.orbit.enabled && !focus.active;
    easing.damp(orbit.current, 'azimuth', orbitOn ? rig.orbit.azimuth : 0, ORBIT_SMOOTH, delta);
    easing.damp(orbit.current, 'elevation', orbitOn ? rig.orbit.elevation : 0, ORBIT_SMOOTH, delta);
    if (Math.abs(orbit.current.azimuth) > 1e-4 || Math.abs(orbit.current.elevation) > 1e-4) {
      spherical.current.setFromVector3(desired.current);
      spherical.current.theta += orbit.current.azimuth;
      spherical.current.phi = MathUtils.clamp(spherical.current.phi - orbit.current.elevation, MIN_POLAR, MAX_POLAR);
      desired.current.setFromSpherical(spherical.current);
    }
    desired.current.add(target);
    easing.damp3(camera.position, desired.current, SMOOTH_TIME, delta);
    easing.damp3(rig.currentTarget, target, SMOOTH_TIME, delta);
    camera.lookAt(rig.currentTarget);

    // Fog begins just behind the subject at any distance, so it greys the far M4 layer but never
    // the car, even in the overhead and phone-pulled-back framings.
    const fog = state.scene.fog;
    if (fog instanceof Fog) {
      const subject = camera.position.distanceTo(rig.currentTarget);
      fog.near = subject + FOG_START;
      fog.far = subject + FOG_END;
    }

    if (Math.abs(camera.fov - fov) > 0.001) {
      easing.damp(camera, 'fov', fov, SMOOTH_TIME, delta);
      camera.updateProjectionMatrix();
    }

    // Off-centre framing via a projection offset: the car slides aside without the camera
    // turning, so perspective stays honest. Portrait stacks copy instead, and close-ups centre.
    const targetShift = camera.aspect < 1 || focus.active ? 0 : rig.viewShift;
    easing.damp(shift.current, 'value', targetShift, SMOOTH_TIME, delta);
    const { width, height } = state.size;
    if (Math.abs(shift.current.value) > 1e-4) {
      camera.setViewOffset(width, height, -shift.current.value * width, 0, width, height);
    } else if (camera.view?.enabled) {
      camera.clearViewOffset();
    }
  }, -1);

  return null;
}
