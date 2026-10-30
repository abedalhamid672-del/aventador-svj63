import { useFrame } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useRef } from 'react';
import { Vector2 } from 'three';
import { useExperience } from '../app/store';
import { rig } from './rig';

/** Aberration at rest vs. at full scroll speed (UV offset). */
const CA_REST = 0.00025;
const CA_MAX = 0.0028;

export function Effects() {
  const quality = useExperience((s) => s.quality);
  // The effect's uniform holds this exact Vector2, so mutating it updates the shader.
  const offset = useRef(new Vector2(CA_REST, CA_REST));

  useFrame(() => {
    const amount = CA_REST + Math.min(1, Math.abs(rig.scrollVelocity)) * (CA_MAX - CA_REST);
    offset.current.set(amount, amount * 0.6);
  });

  return (
    <EffectComposer multisampling={quality === 'high' ? 2 : 0} enableNormalPass={false}>
      {/* Threshold above 1: only emissive parts pushed past white (taillights, accents) bloom. */}
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.9} radius={0.7} />
      <Vignette offset={0.28} darkness={0.82} />
      {/* High tier only: aberration and grain are polish a phone GPU should not pay for. */}
      {quality === 'high' ? <ChromaticAberration offset={offset.current} radialModulation modulationOffset={0.3} /> : <></>}
      {quality === 'high' ? <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.35} /> : <></>}
    </EffectComposer>
  );
}
