import { gsap } from 'gsap';
import { easing } from 'maath';
import { useEffect, useRef, useState } from 'react';
import { useExperience } from '../app/store';
import { useMediaQuery, useReducedMotion } from '../hooks/useMediaQuery';

type Hint = 'none' | 'link' | 'view' | 'drag';

const LABELS: Readonly<Record<Hint, string>> = { none: '', link: '', view: 'View', drag: 'Drag' };
const RING_SCALE: Readonly<Record<Hint, number>> = { none: 1, link: 1.6, view: 2.4, drag: 2.6 };

/**
 * Smooth times (seconds) for critically damped springs (maath, frame-rate independent). Springs
 * carry velocity, so the ring eases into motion instead of jumping when a burst of mouse input
 * lands, and settles without overshoot.
 */
const DOT_SMOOTH = 0.035;
const RING_SMOOTH = 0.12;
const MAGNET_SMOOTH = 0.16;
/** How far a magnetic element leans toward the pointer (share of the offset from its centre). */
const MAGNET_PULL = 0.32;

interface Magnet {
  readonly el: HTMLElement;
  /** Resting centre, measured once on entry (so the lean never feeds back into the target). */
  cx: number;
  cy: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
}


/**
 * Custom cursor for fine pointers: a red dot that tracks almost exactly and a ring that trails with
 * weight. The ring grows and labels itself over hotspots (VIEW, from data-cursor) and over the car
 * in the showroom (DRAG, from 3D hover). Elements marked data-magnetic lean toward the pointer.
 * Everything moves in one frame loop on critically damped springs; pointer events only record
 * coordinates. Touch keeps native behaviour; reduced motion removes trail and magnetism.
 */
export function Cursor() {
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  const reducedMotion = useReducedMotion();
  const hint3d = useExperience((s) => s.cursorHint);
  const [domHint, setDomHint] = useState<Hint>('none');
  const [visible, setVisible] = useState(false);
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dotEl = dot.current;
    const ringEl = ring.current;
    if (!finePointer || !dotEl || !ringEl) return;
    const root = document.documentElement;
    root.classList.add('has-custom-cursor');

    const pointer = { x: 0, y: 0, seen: false };
    const dotPos = { x: 0, y: 0 };
    const ringPos = { x: 0, y: 0 };
    const magnets = new Map<HTMLElement, Magnet>();
    let active: Magnet | null = null;
    let shown = false;

    const show = (next: boolean) => {
      if (next !== shown) setVisible((shown = next));
    };

    /** Reads what is under the pointer: the hover label and the magnetic element, if any. */
    const inspect = (target: Element | null) => {
      const labelled = target?.closest<HTMLElement>('[data-cursor]');
      const interactive = target?.closest('a, button, [tabindex="0"]');
      setDomHint(labelled ? (labelled.dataset.cursor as Hint) : interactive ? 'link' : 'none');

      const el = reducedMotion ? null : (target?.closest<HTMLElement>('[data-magnetic]') ?? null);
      if (el === active?.el) return;
      if (active) active.tx = active.ty = 0; // release: it eases home in the loop
      if (!el) {
        active = null;
        return;
      }
      const existing = magnets.get(el);
      const r = el.getBoundingClientRect();
      const m: Magnet = existing ?? { el, cx: 0, cy: 0, x: 0, y: 0, tx: 0, ty: 0 };
      // Remove the current lean from the measurement to get the true resting centre.
      m.cx = r.left + r.width / 2 - m.x;
      m.cy = r.top + r.height / 2 - m.y;
      magnets.set(el, m);
      active = m;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (!pointer.seen) {
        // First sighting: place everything under the pointer instead of flying in from a corner.
        pointer.seen = true;
        Object.assign(dotPos, { x: e.clientX, y: e.clientY });
        Object.assign(ringPos, { x: e.clientX, y: e.clientY });
      }
      show(true);
      inspect(e.target instanceof Element ? e.target : null);
    };
    const onLeave = () => {
      show(false);
      inspect(null);
    };
    // Content scrolls under a still pointer: refresh the label and drop a magnet left behind.
    const onScroll = () => {
      if (pointer.seen) inspect(document.elementFromPoint(pointer.x, pointer.y));
    };

    const tick = (_time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 64) / 1000;
      if (reducedMotion) {
        dotPos.x = ringPos.x = pointer.x;
        dotPos.y = ringPos.y = pointer.y;
      } else {
        easing.damp(dotPos, 'x', pointer.x, DOT_SMOOTH, dt);
        easing.damp(dotPos, 'y', pointer.y, DOT_SMOOTH, dt);
        easing.damp(ringPos, 'x', pointer.x, RING_SMOOTH, dt);
        easing.damp(ringPos, 'y', pointer.y, RING_SMOOTH, dt);
      }
      dotEl.style.transform = `translate3d(${dotPos.x}px, ${dotPos.y}px, 0)`;
      ringEl.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;

      if (active) {
        active.tx = (pointer.x - active.cx) * MAGNET_PULL;
        active.ty = (pointer.y - active.cy) * MAGNET_PULL;
      }
      for (const m of magnets.values()) {
        easing.damp(m, 'x', m.tx, MAGNET_SMOOTH, dt);
        easing.damp(m, 'y', m.ty, MAGNET_SMOOTH, dt);
        const settled = m !== active && Math.abs(m.x) < 0.05 && Math.abs(m.y) < 0.05;
        m.el.style.translate = settled ? '' : `${m.x.toFixed(2)}px ${m.y.toFixed(2)}px`;
        if (settled) magnets.delete(m.el);
      }
    };

    gsap.ticker.add(tick);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    root.addEventListener('pointerleave', onLeave);
    return () => {
      gsap.ticker.remove(tick);
      root.classList.remove('has-custom-cursor');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      root.removeEventListener('pointerleave', onLeave);
      for (const m of magnets.values()) m.el.style.translate = '';
    };
  }, [finePointer, reducedMotion]);

  if (!finePointer) return null;
  const hint: Hint = domHint !== 'none' ? domHint : hint3d;

  return (
    <div aria-hidden="true" className={`pointer-events-none fixed inset-0 z-[60] transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div ref={ring} className="absolute top-0 left-0 will-change-transform">
        <div
          className="grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[var(--hairline-red)] transition-[scale,background-color,border-color] duration-500 ease-[var(--ease-out-expo)]"
          style={{
            // As a string: React 18 would append "px" to a bare number for this property.
            scale: String(RING_SCALE[hint]),
            backgroundColor: hint === 'view' || hint === 'drag' ? 'rgb(5 5 5 / 0.55)' : 'transparent',
            borderColor: hint === 'none' ? undefined : 'var(--red)',
          }}
        >
          <span className="font-mono text-[5px] tracking-[0.12em] text-white uppercase">{LABELS[hint]}</span>
        </div>
      </div>
      <div ref={dot} className="absolute top-0 left-0 will-change-transform">
        <div className="size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red" />
      </div>
    </div>
  );
}
