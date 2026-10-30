/*
Model: "2020 Lamborghini Aventador SVJ 63 Roadster" by Ddiaz Design
https://sketchfab.com/3d-models/2020-lamborghini-aventador-svj-63-roadster-3a1191226c534574bf00f491d0deea0d
License: CC-BY-4.0. Generated with gltfjsx from public/models/svj.glb (see scripts/optimize-models.mjs), then cleaned.
*/
import { ContactShadows, useGLTF } from '@react-three/drei';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import { easing } from 'maath';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  Color,
  MeshPhysicalMaterial,
  Object3D,
  type BufferGeometry,
  type Group,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type PointLight,
  type SpotLight,
} from 'three';
import { acceleratedRaycast, CENTER, computeBoundsTree } from 'three-mesh-bvh';
import type { GLTF } from 'three-stdlib';
import { useExperience } from '../app/store';
import { CarBodyContext } from '../components/Hotspots';
import { ENGINE } from '../data/specs';
import { PAINTS } from '../data/paints';
import { useReducedMotion } from '../hooks/useMediaQuery';
import { rig } from '../scene/rig';

export const MODEL_URL = '/models/svj.glb';

/** Opaque body meshes, merged per material by the optimizer. These also occlude hotspot pins. */
const BODY_PARTS = [
  'Paint', 'PaintDecal', 'PaintBlack', 'PaintBlack2', 'AccentRed', 'AccentRed2', 'Carbon', 'Carbon2',
  'Coloured', 'Base', 'Badge', 'Engine', 'Interior', 'SeatBelt', 'Lights', 'Grille1', 'Grille2',
  'Grille3', 'Grille4', 'LicensePlate', 'ManufacturerPlate',
] as const;
/** See-through parts: rendered outside the occluder group, so glass never hides a pin. */
const GLASS_PARTS = ['Window', 'Taillights', 'Indicators'] as const;
type BodyPart = (typeof BODY_PARTS)[number] | (typeof GLASS_PARTS)[number];

export const CORNERS = ['FL', 'FR', 'RL', 'RR'] as const;
export type Corner = (typeof CORNERS)[number];
const WHEEL_PARTS = ['Rim', 'Tyre', 'Carbon'] as const;
type WheelMesh = `Wheel_${Corner}_${(typeof WHEEL_PARTS)[number]}`;
type CaliperMesh = `Caliper_${Corner}_Body`;

type MaterialName = Exclude<BodyPart, 'AccentRed2' | 'Carbon2' | 'PaintBlack2'> | 'Rim' | 'Tyre' | 'WheelCarbon' | 'Caliper';

type GLTFResult = GLTF & {
  nodes: Record<BodyPart | WheelMesh | CaliperMesh, Mesh> & Record<`Wheel_${Corner}` | `Caliper_${Corner}`, Object3D>;
  materials: Record<MaterialName, MeshStandardMaterial>;
};

/** Rolling radius per corner, metres (255/30 R20 front, 355/25 R21 rear; measured from the model). */
const WHEEL_RADIUS: Readonly<Record<Corner, number>> = { FL: 0.332, FR: 0.332, RL: 0.357, RR: 0.357 };

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Engine-bay glow: a slow throb derived from idle speed (idle/600 ≈ 1.7 Hz) rather than the
 * real firing frequency, which would strobe. */
const ENGINE_PULSE_HZ = ENGINE.idleRpm / 600;
const ENGINE_GLOW = new Color('#ff2a1f');

/** Headlights: car-space z beyond which the shared Lights material may glow (front lamps only). */
const HEADLIGHT_FRONT_Z = 1.0;
const HEADLIGHT_COLOR = new Color('#fff4e6');

/**
 * Head- and taillight housings share one material, so the glow is masked in the shader: only
 * fragments in the front of the car, and only the bright LED shapes of the texture, emit.
 */
function patchHeadlights(material: MeshStandardMaterial, frontZLocal: number) {
  const uniforms = { uHeadlight: { value: 0 }, uFrontZ: { value: frontZLocal }, uHeadColor: { value: HEADLIGHT_COLOR } };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying float vLocalZ;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLocalZ = position.z;`);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vLocalZ;
        uniform float uHeadlight;
        uniform float uFrontZ;
        uniform vec3 uHeadColor;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float led = smoothstep(0.5, 0.85, dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)));
        totalEmissiveRadiance += uHeadColor * uHeadlight * 5.0 * led * step(uFrontZ, vLocalZ);`,
      );
  };
  material.customProgramCacheKey = () => 'svj-headlights';
  return uniforms;
}

/**
 * Raycasts (hotspot occlusion, showroom hover) use a BVH. Building it for 214k triangles in one go
 * blocks the main thread for most of a second, so it is built one mesh per idle callback with the
 * cheap CENTER split; nothing needs it until the visitor reaches the Identity section.
 */
function buildBvhWhenIdle(root: Object3D): () => void {
  const meshes: Mesh[] = [];
  root.traverse((o) => {
    if ((o as Mesh).isMesh) meshes.push(o as Mesh);
  });
  const idle = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => window.setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 }), 50));
  const cancel = window.cancelIdleCallback ?? window.clearTimeout;
  let handle = 0;
  const next = () => {
    const mesh = meshes.shift();
    if (!mesh) return;
    const geometry = mesh.geometry as BufferGeometry & { boundsTree?: unknown };
    if (!geometry.boundsTree) computeBoundsTree.call(geometry, { strategy: CENTER, maxLeafTris: 16 });
    mesh.raycast = acceleratedRaycast;
    handle = idle(next, { timeout: 2000 });
  };
  handle = idle(next, { timeout: 2000 });
  return () => cancel(handle);
}

/** Taillight lenses glow past the bloom threshold; nothing else on the car does. */
const TAILLIGHT_GLOW = new Color('#ff1a0d');
const TAILLIGHT_INTENSITY = 3.2;

/** Copies the optimizer's quantization transform (position + scale) from a loaded node. */
const transformOf = (node: Object3D) => ({ position: node.position, scale: node.scale, rotation: node.rotation });

const withoutVertexColors = new WeakMap<Material, Material>();
/**
 * Most meshes carry baked vertex colours (AO, lamp tints) and the shared materials enable them.
 * The livery kit meshes have no colour attribute, and WebGL reads a missing attribute as black,
 * so those get a cached variant with vertex colours off.
 */
function fitMaterial(material: Material, geometry: BufferGeometry): Material {
  if (!material.vertexColors || geometry.hasAttribute('color')) return material;
  let variant = withoutVertexColors.get(material);
  if (!variant) {
    variant = material.clone();
    variant.vertexColors = false;
    withoutVertexColors.set(material, variant);
  }
  return variant;
}

function usePaintMaterial(): MeshPhysicalMaterial {
  const paint = useMemo(() => {
    const initial = PAINTS[useExperience.getState().paint];
    return new MeshPhysicalMaterial({
      color: initial.color,
      metalness: initial.metalness,
      roughness: initial.roughness,
      clearcoat: initial.clearcoat,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.2,
    });
  }, []);
  useEffect(() => () => paint.dispose(), [paint]);

  // Lerp toward the selected paint: colour, gloss and coat move together.
  const target = useRef({ color: paint.color.clone(), metalness: paint.metalness, roughness: paint.roughness, clearcoat: paint.clearcoat });
  useEffect(
    () =>
      useExperience.subscribe((s) => {
        const p = PAINTS[s.paint];
        target.current.color.set(p.color);
        Object.assign(target.current, { metalness: p.metalness, roughness: p.roughness, clearcoat: p.clearcoat });
      }),
    [],
  );
  useFrame((_, delta) => {
    const t = target.current;
    easing.dampC(paint.color, t.color, 0.45, delta);
    easing.damp(paint, 'metalness', t.metalness, 0.45, delta);
    easing.damp(paint, 'roughness', t.roughness, 0.45, delta);
    easing.damp(paint, 'clearcoat', t.clearcoat, 0.45, delta);
  });

  return paint;
}

type SVJProps = ThreeElements['group'] & {
  /** Rendered inside the car's drive group: anything here turns and travels with the car. */
  readonly children?: ReactNode;
};

export function SVJ({ children, ...props }: SVJProps) {
  const { nodes, materials } = useGLTF(MODEL_URL) as unknown as GLTFResult;
  const reducedMotion = useReducedMotion();
  const paint = usePaintMaterial();
  const turntable = useRef<Group>(null);
  const drive = useRef<Group>(null);
  const body = useRef<Group>(null);
  const engineLight = useRef<PointLight>(null);
  const headSpot = useRef<SpotLight>(null);
  const headSpotTarget = useMemo(() => new Object3D(), []);
  const headlight = useRef({ value: 0 });
  const headlightsOn = useExperience((s) => s.headlightsOn);
  const sceneReady = useExperience((s) => s.sceneReady);
  // Hover handlers make R3F raycast the car on every pointer move, so they exist only where used.
  const inShowroom = useExperience((s) => s.activeSection === 'showroom');

  useEffect(() => (body.current ? buildBvhWhenIdle(body.current) : undefined), []);
  const idleYaw = useRef(0);
  const wheels = useRef<Partial<Record<Corner, Group>>>({});

  // The GLTF materials are cached and shared; these edits are idempotent.
  useMemo(() => {
    const tail = materials.Taillights;
    tail.emissive.copy(TAILLIGHT_GLOW);
    tail.emissiveIntensity = TAILLIGHT_INTENSITY;
    tail.opacity = 0.92;
    tail.toneMapped = false;
    materials.Window.depthWrite = false;
    materials.Window.envMapIntensity = 1.4;
    materials.Engine.emissive.copy(ENGINE_GLOW);
    materials.Engine.emissiveIntensity = 0;
  }, [materials]);

  // Front-lamp mask threshold, converted from car space into the mesh's quantized local space.
  const headlightUniforms = useMemo(() => {
    const node = nodes.Lights;
    return patchHeadlights(materials.Lights, (HEADLIGHT_FRONT_Z - node.position.z) / node.scale.z);
  }, [materials, nodes]);

  const materialFor = (part: BodyPart) => {
    if (part === 'Paint') return paint;
    if (part === 'AccentRed2') return materials.AccentRed;
    if (part === 'Carbon2') return materials.Carbon;
    if (part === 'PaintBlack2') return materials.PaintBlack;
    return materials[part];
  };
  const wheelMaterial = { Rim: materials.Rim, Tyre: materials.Tyre, Carbon: materials.WheelCarbon } as const;

  useFrame(({ clock }, delta) => {
    // Engine bay: a double-beat throb, scaled by the section's glow channel.
    const beat = Math.sin(clock.elapsedTime * Math.PI * 2 * ENGINE_PULSE_HZ);
    const throb = rig.engineGlow * (0.55 + 0.45 * Math.max(0, beat) ** 3);
    if (engineLight.current) engineLight.current.intensity = throb * 14;
    materials.Engine.emissiveIntensity = throb * 0.35;

    // Headlights: on in the Finale, or from the configurator toggle.
    easing.damp(headlight.current, 'value', Math.max(rig.headlights, headlightsOn ? 1 : 0), 0.25, delta);
    headlightUniforms.uHeadlight.value = headlight.current.value;
    if (headSpot.current) headSpot.current.intensity = headlight.current.value * 11;

    // The idle spin only advances while fully on the turntable. During the hand-off it is frozen,
    // so yaw is a pure function of scroll position and scrolling back rewinds it exactly.
    if (!reducedMotion && rig.turntable >= 0.999) {
      idleYaw.current = wrapAngle(idleYaw.current + rig.turntableSpeed * delta);
    }
    const yaw = rig.carYaw + idleYaw.current * rig.turntable;
    if (turntable.current) easing.dampAngle(turntable.current.rotation, 'y', yaw, 0.35, delta);

    // Travel and wheel spin share one source, so the tyres roll without slipping, both ways.
    if (drive.current) drive.current.position.z = rig.carOffsetZ;
    for (const corner of CORNERS) {
      const wheel = wheels.current[corner];
      if (wheel) wheel.rotation.x = rig.carOffsetZ / WHEEL_RADIUS[corner];
    }
  });

  return (
    <group {...props} dispose={null}>
      <group ref={turntable}>
        <group ref={drive}>
          <CarBodyContext.Provider value={body}>
            <group
              ref={body}
              // In the showroom the cursor announces that the car can be dragged.
              onPointerOver={inShowroom ? () => useExperience.getState().setCursorHint('drag') : undefined}
              onPointerOut={inShowroom ? () => useExperience.getState().setCursorHint('none') : undefined}
            >
              {BODY_PARTS.map((part) => (
                <mesh
                  key={part}
                  name={part}
                  geometry={nodes[part].geometry}
                  material={fitMaterial(materialFor(part), nodes[part].geometry)}
                  {...transformOf(nodes[part])}
                />
              ))}

              {CORNERS.map((corner) => (
                <group key={corner}>
                  <group
                    name={`Wheel_${corner}`}
                    position={nodes[`Wheel_${corner}`].position}
                    ref={(g) => {
                      if (g) wheels.current[corner] = g;
                    }}
                  >
                    {WHEEL_PARTS.map((part) => {
                      const node = nodes[`Wheel_${corner}_${part}`];
                      return <mesh key={part} name={node.name} geometry={node.geometry} material={wheelMaterial[part]} {...transformOf(node)} />;
                    })}
                  </group>
                  <group name={`Caliper_${corner}`} position={nodes[`Caliper_${corner}`].position}>
                    <mesh geometry={nodes[`Caliper_${corner}_Body`].geometry} material={materials.Caliper} {...transformOf(nodes[`Caliper_${corner}_Body`])} />
                  </group>
                </group>
              ))}
            </group>
            {GLASS_PARTS.map((part) => (
              <mesh
                key={part}
                name={part}
                geometry={nodes[part].geometry}
                material={fitMaterial(materialFor(part), nodes[part].geometry)}
                {...transformOf(nodes[part])}
              />
            ))}

            {/* Aimed long, so the beam pools ahead of the car rather than under the closing copy. */}
            <primitive object={headSpotTarget} position={[0, 0, 16]} />
            <spotLight
              ref={headSpot}
              position={[0, 0.55, 2.3]}
              target={headSpotTarget}
              angle={0.42}
              penumbra={0.9}
              intensity={0}
              distance={14}
              decay={1.5}
              color={HEADLIGHT_COLOR}
            />
            <pointLight ref={engineLight} position={[0, 1.45, -1.25]} color={ENGINE_GLOW} intensity={0} distance={3.2} decay={2} />
            {children}
          </CarBodyContext.Provider>

          {/* Baked once, after the reveal (so it sees the car), and parented to it so it turns and
              travels with the car for free. */}
          {sceneReady && <ContactShadows frames={1} position-y={0.002} scale={[3.2, 6.2]} far={1.4} blur={2.2} opacity={0.9} resolution={512} color="#000000" />}
        </group>
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
