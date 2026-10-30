import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { IS_COARSE_POINTER, useExperience } from '../app/store';
import { KEYFRAMES } from '../data/cameraKeyframes';
import { rig } from './rig';
import { Experience } from './Experience';
import { SceneBoundary } from './SceneBoundary';

/** True when the browser can create a WebGL2 or WebGL context at all. */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * The single fixed, full-screen canvas behind the DOM. Pointer events are sourced from <body>
 * so the 3D layer (the M4 especially) reacts to the cursor while HTML scrolls above it.
 * Without WebGL, or if the scene fails, it renders nothing and the page reads as text.
 */
export function Stage() {
  const failScene = useExperience((s) => s.failScene);
  const [supported] = useState(hasWebGL);

  useEffect(() => {
    if (!supported) failScene();
  }, [supported, failScene]);

  if (!supported) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-0" aria-hidden="true">
      <SceneBoundary onError={failScene}>
        <Canvas
          eventSource={document.body}
          eventPrefix="client"
          dpr={IS_COARSE_POINTER ? [1, 1.5] : [1, 1.75]}
          camera={{ position: [...KEYFRAMES.hero.position], fov: KEYFRAMES.hero.fov, near: 0.1, far: 60 }}
          gl={{
            antialias: false, // MSAA happens in the effect composer instead
            powerPreference: 'high-performance',
            toneMapping: ACESFilmicToneMapping,
            outputColorSpace: SRGBColorSpace,
          }}
          onCreated={(state) => {
            // Reading each program's info log on first use forces a synchronous wait on the GPU
            // driver (very slow with Direct3D's shader compiler). Diagnostics stay on in dev only.
            state.gl.debug.checkShaderErrors = import.meta.env.DEV;
            // Dev-only handle for inspecting the scene from the browser console.
            if (import.meta.env.DEV) Object.assign(window, { __r3f: state, __store: useExperience, __rig: rig });
          }}
        >
          <Experience />
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
