import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, useRef } from 'react';
import { SplitWords } from '../components/SplitWords';
import { RING_TRACK } from '../data/ringTrack';
import { NURBURGRING } from '../data/specs';
import { useReducedMotion } from '../hooks/useMediaQuery';
import { bodyClass, headingClass, Section } from './Section';

gsap.registerPlugin(ScrollTrigger);

/** m:ss.cc, matching how lap times are written. */
function formatLap(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const seconds = (ms % 60_000) / 1000;
  return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
}

/**
 * The Nordschleife draws itself as the section scrolls, a red marker riding the drawing head,
 * while the lap timer runs to the record on the same progress. Both rewind when scrolling back.
 */
export function Ring() {
  const section = useRef<HTMLElement>(null);
  const path = useRef<SVGPathElement>(null);
  const marker = useRef<SVGCircleElement>(null);
  const timer = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const sectionEl = section.current;
    const pathEl = path.current;
    const markerEl = marker.current;
    const timerEl = timer.current;
    if (!sectionEl || !pathEl || !markerEl || !timerEl || reducedMotion) return;

    const length = pathEl.getTotalLength();
    const render = (progress: number) => {
      pathEl.style.strokeDashoffset = String(length * (1 - progress));
      const head = pathEl.getPointAtLength(length * progress);
      markerEl.setAttribute('cx', head.x.toFixed(1));
      markerEl.setAttribute('cy', head.y.toFixed(1));
      timerEl.textContent = formatLap(NURBURGRING.lapMs * progress);
    };
    pathEl.style.strokeDasharray = String(length);
    render(0);

    // Starts once the camera has arrived overhead, finishes as the section's hold ends.
    const trigger = ScrollTrigger.create({
      trigger: sectionEl,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => render(self.progress),
    });
    return () => {
      trigger.kill();
      pathEl.style.strokeDasharray = '';
      pathEl.style.strokeDashoffset = '';
      timerEl.textContent = NURBURGRING.lapTime;
    };
  }, [reducedMotion]);

  const art = (
    <svg
      viewBox={RING_TRACK.viewBox}
      aria-hidden="true"
      className="pointer-events-none absolute top-[12vh] left-1/2 w-[86vw] -translate-x-1/2 md:top-1/2 md:right-[5vw] md:left-auto md:w-[min(42vw,52rem)] md:translate-x-0 md:-translate-y-1/2"
    >
      <path d={RING_TRACK.d} fill="none" stroke="rgb(242 242 242 / 0.08)" strokeWidth="2.5" strokeLinejoin="round" />
      <path ref={path} d={RING_TRACK.d} fill="none" stroke="var(--red)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <circle ref={marker} r="7" fill="var(--red-glow)" />
    </svg>
  );

  return (
    <Section id="ring" height="h-[260svh]" side="left" art={art} sectionRef={section}>
      <h2 id="ring-title" className={headingClass}>
        <SplitWords text="Nürburgring Nordschleife" />
      </h2>
      <p data-fade className="mt-6 font-mono text-[clamp(2.5rem,6vw,5rem)] leading-none text-white tabular">
        <span className="sr-only">Lap time {NURBURGRING.lapTime}</span>
        <span ref={timer} aria-hidden="true">
          {NURBURGRING.lapTime}
        </span>
      </p>
      <p data-fade className={bodyClass}>
        {NURBURGRING.lengthKm} km of the Green Hell. The lap that made the SVJ name, set by the Aventador SVJ coupé in 2018.
      </p>
      <p data-fade className="mt-4 text-xs text-smoke">Track outline © OpenStreetMap contributors</p>
    </Section>
  );
}
