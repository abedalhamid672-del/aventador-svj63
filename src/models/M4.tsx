/*
Model: "Classic M4" by Mateusz Woliński
https://sketchfab.com/3d-models/classic-m4-a747ebdbb3d941ecb09b459c62865a75
License: CC-BY-4.0. Generated with gltfjsx from public/models/m4.glb (see scripts/optimize-models.mjs), then cleaned.
The optimizer normalises it to 1 unit long, centred, barrel along +Z.
*/
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { useEffect, useMemo, useRef } from 'react';
import { Color, MeshStandardMaterial, type Group, type Mesh, type Texture } from 'three';
import type { GLTF } from 'three-stdlib';
import { useIsTouch, useReducedMotion } from '../hooks/useMediaQuery';
import { rig } from '../scene/rig';

export const M4_URL = '/models/m4.glb';

const PARTS = ['Receiver', 'Sling', 'Scope'] as const;
type Part = (typeof PARTS)[number];

type GLTFResult = GLTF & {
  nodes: Record<Part, Mesh>;
  materials: Record<'material' | 'sling' | 'scope', MeshStandardMaterial>;
};

/** Pointer response, radians / metres at full deflection (pointer = ±1). */
const YAW = 0.35;
const PITCH = 0.2;
const PARALLAX_X = 0.4;
const PARALLAX_Y = 0.25;
/**
 * Two damping stages in series (frame-rate independent, maath): the raw pointer is smoothed first,
 * then rotation and parallax chase that smoothed pointer. The result is a second-order glide with
 * no corners, even when mouse events arrive unevenly. Higher = heavier.
 */
const POINTER_SMOOTH = 0.12;
const ROTATION_SMOOTH = 0.32;
const POSITION_SMOOTH = 0.45;

/**
 * Dark gunmetal with a red fresnel rim. The rim is added to emissive radiance in the shader, so
 * the silhouette catches red from any angle without a real light.
 */
function createGunmetal(normalMap: Texture | null): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    color: '#121214',
    metalness: 0.9,
    roughness: 0.35,
    normalMap,
    envMapIntensity: 0.55,
  });
  const rimColor = { value: new Color('#e10600') };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = rimColor;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float rim = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0);
        totalEmissiveRadiance += uRimColor * rim * 0.3;`,
      );
  };
  material.customProgramCacheKey = () => 'gunmetal-rim';
  return material;
}

interface M4Props {
  /** Overall length in metres. */
  readonly length?: number;
}

/** Background rifle: follows the cursor on both axes with weighty, jitter-free damping. */
export function M4({ length = 9 }: M4Props) {
  const { nodes, materials } = useGLTF(M4_URL) as unknown as GLTFResult;
  const follow = useRef<Group>(null);
  const smoothed = useRef({ x: 0, y: 0 });
  const reducedMotion = useReducedMotion();
  const isTouch = useIsTouch();

  const gunmetal = useMemo(
    () => ({
      Receiver: createGunmetal(materials.material.normalMap),
      Sling: createGunmetal(materials.sling.normalMap),
      Scope: createGunmetal(materials.scope.normalMap),
    }),
    [materials],
  );
  useEffect(() => () => Object.values(gunmetal).forEach((m) => m.dispose()), [gunmetal]);

  useFrame((state, delta) => {
    const g = follow.current;
    if (!g || reducedMotion) return;
    const t = state.clock.elapsedTime;
    // Touch has no hover: a slow Lissajous sway stands in for the cursor.
    const rawX = isTouch ? Math.sin(t * 0.35) * 0.5 : state.pointer.x;
    const rawY = isTouch ? Math.sin(t * 0.27) * 0.3 : state.pointer.y;
    easing.damp(smoothed.current, 'x', rawX, POINTER_SMOOTH, delta);
    easing.damp(smoothed.current, 'y', rawY, POINTER_SMOOTH, delta);
    const { x, y } = smoothed.current;
    easing.dampE(g.rotation, [-y * PITCH, x * YAW + rig.m4ScrollYaw, 0], ROTATION_SMOOTH, delta);
    easing.damp3(g.position, [x * PARALLAX_X, y * PARALLAX_Y + Math.sin(t * 0.6) * 0.05, 0], POSITION_SMOOTH, delta);
  });

  return (
    <group ref={follow}>
      {/* Base pose: side-on, muzzle pointing screen-left, nose slightly raised. */}
      <group rotation={[0, -Math.PI / 2, 0.1]} scale={length} dispose={null}>
        {PARTS.map((part) => (
          <mesh
            key={part}
            name={part}
            geometry={nodes[part].geometry}
            material={gunmetal[part]}
            position={nodes[part].position}
            scale={nodes[part].scale}
          />
        ))}
      </group>
    </group>
  );
}

useGLTF.preload(M4_URL);
