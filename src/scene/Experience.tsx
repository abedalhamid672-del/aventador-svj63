import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Suspense, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Texture, type Group, type Material, type Mesh } from 'three';
import { IS_COARSE_POINTER, useExperience } from '../app/store';
import { Hotspots } from '../components/Hotspots';
import { Airflow } from './Airflow';
import { M4 } from '../models/M4';
import { SVJ } from '../models/SVJ';
import { CameraRig } from './CameraRig';
import { Effects } from './Effects';
import { Floor } from './Floor';
import { HeroTitle } from './HeroTitle';
import { Lighting } from './Lighting';
import { ViewAnchor } from './ViewAnchor';

const BACKGROUND = '#050505';
/** Dev switch: `?fx=0` renders without post-processing, for isolating render issues. */
const EFFECTS_ON = !(import.meta.env.DEV && new URLSearchParams(location.search).get('fx') === '0');

/**
 * Background tabs throttle requestAnimationFrame to ~1 fps, which reads as a slow GPU.
 * Quality only changes on evidence gathered while the page is actually visible.
 */
const whenVisible = (apply: () => void) => () => {
  if (document.visibilityState === 'visible') apply();
};

/**
 * Keeps freshly loaded content hidden behind the loader while its textures upload one per frame,
 * so no single frame pays for all of them. The loader waits for this before its reveal.
 */
function WarmUp({ children }: { readonly children: ReactNode }) {
  const group = useRef<Group>(null);
  const gl = useThree((state) => state.gl);
  const ready = useExperience((s) => s.sceneReady);

  useLayoutEffect(() => {
    const g = group.current;
    if (!g) return;
    let cancelled = false;
    let frame = 0;

    // Upload textures one per frame while hidden, so the reveal frame does not pay for all of them.
    const uploadTextures = () =>
      new Promise<void>((resolve) => {
        const textures = new Set<Texture>();
        g.traverse((o) => {
          const material = (o as Mesh).material as Material | Material[] | undefined;
          for (const m of Array.isArray(material) ? material : material ? [material] : []) {
            for (const value of Object.values(m)) if (value instanceof Texture) textures.add(value);
          }
        });
        const queue = [...textures];
        const step = () => {
          const texture = queue.shift();
          if (!texture || cancelled) return resolve();
          gl.initTexture(texture);
          frame = requestAnimationFrame(step);
        };
        step();
      });

    const done = () => {
      if (!cancelled) useExperience.getState().markSceneReady();
    };
    uploadTextures().then(done, done);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [gl]);

  return (
    <group ref={group} visible={ready}>
      {children}
    </group>
  );
}

/**
 * Scene graph by depth: [far] M4 → title → studio floor and lights → [front] SVJ.
 * The M4 and title are view-anchored, so they stay behind the car from every camera angle.
 */
export function Experience() {
  const setQuality = useExperience((s) => s.setQuality);

  return (
    <>
      <color attach="background" args={[BACKGROUND]} />
      {/* Fog only reaches the far layer: CameraRig keeps it starting just behind the car. */}
      <fog attach="fog" args={[BACKGROUND, 11, 30]} />

      <PerformanceMonitor
        onDecline={whenVisible(() => setQuality('low'))}
        onIncline={whenVisible(() => !IS_COARSE_POINTER && setQuality('high'))}
        onFallback={whenVisible(() => setQuality('low'))}
        flipflops={3}
      >
        <AdaptiveDpr pixelated={false} />
      </PerformanceMonitor>

      <CameraRig />
      <Lighting />

      <Suspense fallback={null}>
        <WarmUp>
          {/* Upper right, muzzle running out of frame: depth and attitude without competing. */}
          <ViewAnchor depth={7} offset={[4.2, 2.6]}>
            <M4 length={10} />
          </ViewAnchor>
          <ViewAnchor depth={3.4}>
            <HeroTitle depth={3.4} />
          </ViewAnchor>
          <SVJ>
            <Hotspots />
            <Airflow />
          </SVJ>
          <Floor />
        </WarmUp>
      </Suspense>

      {EFFECTS_ON && <Effects />}
    </>
  );
}
