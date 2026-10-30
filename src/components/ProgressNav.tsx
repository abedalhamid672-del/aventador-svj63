import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, useRef, type MouseEvent } from 'react';
import { useExperience } from '../app/store';
import { SECTION_IDS, SECTION_LABELS, type SectionId } from '../data/cameraKeyframes';
import { getLenis } from '../hooks/useLenis';

gsap.registerPlugin(ScrollTrigger);

const pad = (n: number) => String(n).padStart(2, '0');

/** Smooth-scrolls to a section's top (Lenis when running, native otherwise). */
export function scrollToSection(id: SectionId): void {
  const el = document.querySelector<HTMLElement>(`[data-section="${id}"]`);
  if (!el) return;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(el, { duration: 2.2 });
  else el.scrollIntoView();
}

/** Authored level-meter icon; the bars move only while sound is on. */
function SoundBars({ on }: { readonly on: boolean }) {
  return (
    <svg viewBox="0 0 14 12" aria-hidden="true" className={`sound-bars h-3 w-3.5 ${on ? 'is-on' : ''}`}>
      {[0, 4, 8, 12].map((x) => (
        <rect key={x} x={x} y="0" width="2" height="12" fill={on ? 'var(--red)' : 'currentColor'} />
      ))}
    </svg>
  );
}

/**
 * Minimal sticky nav: the name in type, a thin red progress line across the top of the frame, the
 * current section's index and name, the sound toggle and a jump to the configurator. The line is
 * written straight to the DOM from scroll; React only re-renders when the section changes.
 */
export function ProgressNav() {
  const activeSection = useExperience((s) => s.activeSection);
  const soundOn = useExperience((s) => s.soundOn);
  const toggleSound = useExperience((s) => s.toggleSound);
  const bar = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        if (bar.current) bar.current.style.transform = `scaleX(${self.progress.toFixed(4)})`;
      },
    });
    return () => trigger.kill();
  }, []);

  const go = (id: SectionId) => (e: MouseEvent) => {
    e.preventDefault();
    scrollToSection(id);
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30">
      <div ref={bar} className="h-px origin-left bg-red" style={{ transform: 'scaleX(0)' }} />
      <nav aria-label="Primary" className="flex items-center justify-between px-6 py-5 md:px-[6vw]">
        <a
          href="#top"
          data-magnetic
          onClick={go('hero')}
          className="pointer-events-auto -my-2 py-2 font-display text-sm font-extrabold tracking-[-0.02em] text-white"
        >
          SVJ 63
        </a>
        <div className="flex items-center gap-6">
          <p className="font-mono text-[11px] tracking-wide text-smoke uppercase">
            <span className="text-white tabular">{pad(SECTION_IDS.indexOf(activeSection) + 1)}</span>
            <span className="mx-1.5">/</span>
            <span className="tabular">{pad(SECTION_IDS.length)}</span>
            <span className="ml-3 hidden sm:inline">{SECTION_LABELS[activeSection]}</span>
          </p>
          <button
            type="button"
            data-magnetic
            aria-pressed={soundOn}
            onClick={toggleSound}
            title="Synthesised V12 engine sound"
            className="pointer-events-auto -my-2 flex items-center gap-2 py-2.5 font-mono text-[11px] tracking-wide text-smoke uppercase transition-colors duration-300 hover:text-white"
          >
            <SoundBars on={soundOn} />
            <span className="sr-only sm:not-sr-only">Sound {soundOn ? 'on' : 'off'}</span>
            <span className="sr-only">(synthesised engine)</span>
          </button>
          <a
            href="#showroom"
            data-magnetic
            onClick={go('showroom')}
            className="pointer-events-auto border border-[var(--hairline-red)] px-3 py-1.5 font-mono text-[11px] tracking-wide text-white uppercase transition-colors duration-300 hover:border-red hover:bg-red"
          >
            Configure
          </a>
        </div>
      </nav>
    </header>
  );
}
