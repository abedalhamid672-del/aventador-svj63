import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  Float32BufferAttribute,
  ShaderMaterial,
  TubeGeometry,
  Vector3,
  type Mesh,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useReducedMotion } from '../hooks/useMediaQuery';
import { rig } from './rig';

/**
 * Upper body profile in car space (z forward, y up), measured from the model: nose, bonnet,
 * windscreen, open cockpit, engine cover, ALA wing, wake. Streamlines ride above it.
 */
const PROFILE: readonly (readonly [number, number])[] = [
  [3.6, 0.42], [2.55, 0.5], [1.7, 0.84], [0.85, 0.98], [0.25, 1.16], [-0.35, 1.18],
  [-1.2, 1.12], [-2.25, 1.2], [-3.4, 1.06], [-4.4, 0.98],
];
const LINES = 14;
const TUBE_RADIUS = 0.0045;

const vertexShader = /* glsl */ `
  attribute float aPhase;
  varying float vU;
  varying float vPhase;
  void main() {
    vU = uv.x;
    vPhase = aPhase;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// A bright head with a fading tail travels front to back; values above 1 feed the bloom pass.
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying float vU;
  varying float vPhase;
  void main() {
    float s = fract(vU * 1.6 - uTime * 0.42 + vPhase);
    float streak = pow(s, 7.0);
    float ends = smoothstep(0.0, 0.08, vU) * smoothstep(1.0, 0.86, vU);
    float alpha = (0.07 + streak) * ends * uOpacity;
    gl_FragColor = vec4(uColor * (0.6 + 2.6 * streak), alpha);
  }
`;

function buildGeometry() {
  const tubes = Array.from({ length: LINES }, (_, i) => {
    const t = i / (LINES - 1);
    const x = (t - 0.5) * 1.5; // across the car's width
    const lift = 0.05 + Math.abs(t - 0.5) * 0.16 + (i % 3) * 0.06; // higher toward the flanks
    const curve = new CatmullRomCurve3(PROFILE.map(([z, y]) => new Vector3(x * (1 - Math.abs(z) * 0.06), y + lift, z)));
    const tube = new TubeGeometry(curve, 160, TUBE_RADIUS, 5, false);
    const phase = new Float32Array(tube.attributes.position!.count).fill((i * 0.37) % 1);
    tube.setAttribute('aPhase', new Float32BufferAttribute(phase, 1));
    return tube;
  });
  const merged = mergeGeometries(tubes);
  tubes.forEach((g) => g.dispose());
  return merged;
}

/** Red airflow over the body for the Aero section; one draw call for every line. */
export function Airflow() {
  const mesh = useRef<Mesh>(null);
  const reducedMotion = useReducedMotion();
  const opacity = useRef({ value: 0 });
  const geometry = useMemo(buildGeometry, []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new Color('#ff2a1f') } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry?.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    easing.damp(opacity.current, 'value', rig.aeroFlow, 0.3, delta);
    const uniforms = material.uniforms as { uTime: { value: number }; uOpacity: { value: number } };
    uniforms.uOpacity.value = opacity.current.value;
    if (!reducedMotion) uniforms.uTime.value += delta;
    if (mesh.current) mesh.current.visible = opacity.current.value > 0.01;
  });

  if (!geometry) return null;
  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} visible={false} />;
}
