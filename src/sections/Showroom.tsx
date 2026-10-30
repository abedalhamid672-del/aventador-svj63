import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { useExperience } from '../app/store';
import { SplitWords } from '../components/SplitWords';
import { PAINTS, type Paint } from '../data/paints';
import { rig } from '../scene/rig';
import { headingClass, Section } from './Section';

/** Radians of orbit per pixel dragged. */
const AZIMUTH_PER_PX = 0.008;
const ELEVATION_PER_PX = 0.005;
/** Elevation range on top of the keyframe (CameraRig also clamps above the floor). */
const ELEVATION_RANGE = [-0.35, 0.55] as const;
/** Radians per arrow-key press. */
const KEY_STEP = 0.18;

const clampElevation = (v: number) => Math.min(ELEVATION_RANGE[1], Math.max(ELEVATION_RANGE[0], v));

function Swatch({ paint }: { readonly paint: Paint }) {
  const active = useExperience((s) => s.paint === paint.id);
  const setPaint = useExperience((s) => s.setPaint);
  return (
    <button
      type="button"
      data-magnetic
      aria-pressed={active}
      onClick={() => setPaint(paint.id)}
      className={`group flex items-center gap-3 border px-3 py-2.5 text-left transition-colors duration-300 ${
        active ? 'border-red bg-black/60' : 'border-[var(--hairline)] bg-black/40 hover:border-[var(--hairline-red)]'
      }`}
    >
      <span
        aria-hidden="true"
        className="size-5 shrink-0 rounded-full border border-white/20"
        style={{ background: `radial-gradient(circle at 35% 30%, rgb(255 255 255 / ${paint.finish === 'matte' ? 0.08 : 0.35}), ${paint.color} 55%)` }}
      />
      <span className="text-sm text-white">{paint.name}</span>
      <span className="font-mono text-[10px] tracking-wide text-smoke uppercase">{paint.finish}</span>
    </button>
  );
}

/**
 * 07 · Showroom. Arriving here unlocks free interaction: drag anywhere in the frame (or use the
 * arrow keys on the viewer) to orbit, pick a paint, switch the headlights on. Orbit sits on top of
 * the scroll keyframe and is reset on leaving, so the scroll story stays reversible.
 */
export function Showroom() {
  const active = useExperience((s) => s.activeSection === 'showroom' && s.introDone);
  const headlightsOn = useExperience((s) => s.headlightsOn);
  const toggleHeadlights = useExperience((s) => s.toggleHeadlights);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    rig.orbit.enabled = active;
    if (!active) {
      rig.orbit.azimuth = 0;
      rig.orbit.elevation = 0;
    }
  }, [active]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!active || e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    rig.orbit.azimuth -= (e.clientX - d.x) * AZIMUTH_PER_PX;
    // Touch keeps vertical swipes for scrolling (touch-action: pan-y); only mice tilt the view.
    if (e.pointerType === 'mouse') rig.orbit.elevation = clampElevation(rig.orbit.elevation + (e.clientY - d.y) * ELEVATION_PER_PX);
    drag.current = { ...d, x: e.clientX, y: e.clientY };
  };
  const endDrag = () => {
    drag.current = null;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const steps: Partial<Record<string, () => void>> = {
      ArrowLeft: () => (rig.orbit.azimuth += KEY_STEP),
      ArrowRight: () => (rig.orbit.azimuth -= KEY_STEP),
      ArrowUp: () => (rig.orbit.elevation = clampElevation(rig.orbit.elevation + KEY_STEP)),
      ArrowDown: () => (rig.orbit.elevation = clampElevation(rig.orbit.elevation - KEY_STEP)),
    };
    const step = steps[e.key];
    if (!active || !step) return;
    e.preventDefault();
    step();
  };

  const viewer = (
    <div
      role="group"
      // The car itself sets the DRAG hint (3D hover); the surface must not mask it as a link.
      data-cursor="none"
      aria-roledescription="3D viewer"
      aria-label="Aventador SVJ 63 Roadster. Drag, or use the arrow keys, to orbit the car."
      tabIndex={active ? 0 : -1}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      className={`absolute inset-0 touch-pan-y select-none focus-visible:outline-offset-[-8px] ${active ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
    />
  );

  return (
    <Section id="showroom" height="h-[170svh]" side="bottom" art={viewer}>
      <h2 id="showroom-title" className={headingClass}>
        <SplitWords text="Showroom" />
      </h2>
      <p data-fade className="mt-5 font-mono text-[11px] tracking-wide text-smoke uppercase">
        <span className="[@media(hover:none)]:hidden">Drag to orbit · arrow keys on the viewer</span>
        <span className="hidden [@media(hover:none)]:inline">Swipe sideways to orbit</span>
      </p>
      <fieldset data-fade className="mt-6">
        <legend className="sr-only">Paint</legend>
        <div className="flex flex-wrap gap-2">
          {Object.values(PAINTS).map((paint) => (
            <Swatch key={paint.id} paint={paint} />
          ))}
        </div>
      </fieldset>
      <div data-fade className="mt-4">
        <button
          type="button"
          data-magnetic
          aria-pressed={headlightsOn}
          onClick={toggleHeadlights}
          className={`border px-4 py-2.5 font-mono text-[11px] tracking-wide uppercase transition-colors duration-300 ${
            headlightsOn ? 'border-white bg-white text-black' : 'border-[var(--hairline)] bg-black/40 text-white hover:border-[var(--hairline-red)]'
          }`}
        >
          Headlights {headlightsOn ? 'on' : 'off'}
        </button>
      </div>
    </Section>
  );
}
