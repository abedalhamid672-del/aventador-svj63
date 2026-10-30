import { Environment, Lightformer } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { useRef } from 'react';
import type { SpotLight } from 'three';
import { rig } from './rig';

const RED = '#e10600';
/** Full-strength intensities; the Finale's studio-light channel scales them down. */
const RIM_INTENSITY = 60;
const KEY_INTENSITY = 45;

/**
 * Dark studio. The environment map is baked once (frames=1) from Lightformers, so reflections
 * cost nothing per frame: a soft top key, two hard red strips raking the flanks, and a thin
 * white strip in front that draws one sharp highlight along the bodywork. The Finale dims the
 * whole room (env intensity and real lights) so the car drives out of the light.
 */
export function Lighting() {
  const rimLeft = useRef<SpotLight>(null);
  const rimRight = useRef<SpotLight>(null);
  const key = useRef<SpotLight>(null);
  const level = useRef({ value: 1 });

  useFrame(({ scene }, delta) => {
    easing.damp(level.current, 'value', rig.studioLight, 0.4, delta);
    const l = level.current.value;
    scene.environmentIntensity = 0.3 + 0.7 * l;
    if (rimLeft.current) rimLeft.current.intensity = RIM_INTENSITY * l;
    if (rimRight.current) rimRight.current.intensity = RIM_INTENSITY * l;
    if (key.current) key.current.intensity = KEY_INTENSITY * l * l;
  });

  return (
    <>
      <Environment resolution={256} frames={1} background={false}>
        <color attach="background" args={['#030303']} />
        {/* Top key: a long softbox above the car. */}
        <Lightformer form="rect" intensity={1.6} color="#f2f2f2" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[3, 10, 1]} />
        {/* Red rim strips, left and right, low and long. */}
        <Lightformer form="rect" intensity={6} color={RED} position={[-6, 0.9, 0]} rotation-y={Math.PI / 2} scale={[14, 0.5, 1]} />
        <Lightformer form="rect" intensity={6} color={RED} position={[6, 0.9, 0]} rotation-y={-Math.PI / 2} scale={[14, 0.5, 1]} />
        {/* Thin white strip ahead: the one hard highlight line on the paint. */}
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 2.2, 7]} scale={[12, 0.12, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#ffffff" position={[0, 1.5, -8]} rotation-y={Math.PI} scale={[8, 1, 1]} />
      </Environment>

      {/* Real lights add the specular rim the env map alone cannot (it has no position). */}
      <spotLight ref={rimLeft} position={[-5, 1.4, -2.5]} angle={0.6} penumbra={1} intensity={RIM_INTENSITY} color={RED} distance={14} decay={1.6} />
      <spotLight ref={rimRight} position={[5, 1.4, -2.5]} angle={0.6} penumbra={1} intensity={RIM_INTENSITY} color={RED} distance={14} decay={1.6} />
      <spotLight ref={key} position={[0, 7, 1]} angle={0.55} penumbra={0.9} intensity={KEY_INTENSITY} color="#f2f2f2" distance={14} decay={1.4} />
      <ambientLight intensity={0.04} />
    </>
  );
}
