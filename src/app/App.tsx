import { Cursor } from '../components/Cursor';
import { HOTSPOT_LAYER_ID } from '../components/Hotspots';
import { Loader } from '../components/Loader';
import { ProgressNav } from '../components/ProgressNav';
import { useEngineSound } from '../hooks/useEngineSound';
import { useLenis } from '../hooks/useLenis';
import { useReducedMotion } from '../hooks/useMediaQuery';
import { useScrollTimeline } from '../hooks/useScrollTimeline';
import { Stage } from '../scene/Stage';
import { Aero } from '../sections/Aero';
import { Engine } from '../sections/Engine';
import { Finale } from '../sections/Finale';
import { Hero } from '../sections/Hero';
import { Identity } from '../sections/Identity';
import { Performance } from '../sections/Performance';
import { Ring } from '../sections/Ring';
import { Showroom } from '../sections/Showroom';

/**
 * One fixed canvas behind the document; the sections scroll over it and drive the rig.
 * Child effects (the Performance pin) run before this component's scroll timeline, so pins exist
 * before camera triggers are measured.
 */
export function App() {
  const reducedMotion = useReducedMotion();
  useLenis(!reducedMotion);
  useScrollTimeline(reducedMotion);
  useEngineSound();

  return (
    <>
      <a
        href="#main"
        className="sr-only fixed top-4 left-4 z-[70] border border-red bg-black px-4 py-2 font-mono text-xs tracking-wide text-white uppercase focus:not-sr-only"
      >
        Skip to content
      </a>
      <Stage />
      <ProgressNav />
      <main id="main" tabIndex={-1} className="relative outline-none">
        <Hero />
        <Identity />
        <Engine />
        <Aero />
        <Performance />
        <Ring />
        <Showroom />
        <Finale />
      </main>
      {/* 3D hotspot pins render here, above the page, so they stay clickable over the sections. */}
      <div id={HOTSPOT_LAYER_ID} className="pointer-events-none fixed inset-0 z-20" />
      <Loader />
      <Cursor />
    </>
  );
}
