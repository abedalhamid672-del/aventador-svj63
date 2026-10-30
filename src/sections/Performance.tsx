import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { SplitWords } from '../components/SplitWords';
import { SPECS, type Spec } from '../data/specs';
import { useReducedMotion } from '../hooks/useMediaQuery';
import { countTo } from '../hooks/useSectionReveal';
import { rig } from '../scene/rig';
import { headingClass } from './Section';
import { formatValue, type SpecKey } from './SpecList';

gsap.registerPlugin(ScrollTrigger);

const PANELS: readonly SpecKey[] = ['zeroTo100', 'zeroTo200', 'topSpeed', 'dryWeight'];

/** Speedometer geometry: a 240° sweep from 0 to 360 km/h. */
const GAUGE_MAX_KMH = 360;
const SWEEP_DEG = 240;
const START_DEG = -120;
const TICKS = Array.from({ length: GAUGE_MAX_KMH / 30 + 1 }, (_, i) => i * 30);

const polar = (deg: number, r: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [100 + r * Math.cos(rad), 100 + r * Math.sin(rad)] as const;
};

/** Decorative gauge; the real figures live in the panels as text. */
function Speedometer({ needle, readout }: { readonly needle: RefObject<SVGGElement>; readonly readout: RefObject<HTMLSpanElement> }) {
  const [x0, y0] = polar(START_DEG, 84);
  const [x1, y1] = polar(START_DEG + SWEEP_DEG, 84);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute top-20 right-6 w-[clamp(8.5rem,16vw,15rem)] md:top-auto md:right-[6vw] md:bottom-[8vh]">
      <svg viewBox="0 0 200 200" className="w-full">
        <path d={`M${x0} ${y0} A84 84 0 1 1 ${x1} ${y1}`} fill="none" stroke="var(--hairline)" strokeWidth="1.5" />
        {TICKS.map((kmh) => {
          const deg = START_DEG + (kmh / GAUGE_MAX_KMH) * SWEEP_DEG;
          const major = kmh % 60 === 0;
          const [ax, ay] = polar(deg, major ? 72 : 77);
          const [bx, by] = polar(deg, 84);
          return <line key={kmh} x1={ax} y1={ay} x2={bx} y2={by} stroke={kmh >= 330 ? 'var(--red)' : 'var(--smoke)'} strokeWidth={major ? 1.6 : 1} />;
        })}
        <g ref={needle} style={{ transformOrigin: '100px 100px', transform: `rotate(${START_DEG}deg)` }}>
          <line x1="100" y1="108" x2="100" y2="26" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="100" r="4" fill="var(--red)" />
      </svg>
      <p className="-mt-[22%] text-center font-mono text-white tabular">
        <span ref={readout} className="text-[clamp(1.25rem,2.2vw,2rem)]">
          0
        </span>
        <span className="ml-1 text-xs text-smoke">km/h</span>
      </p>
    </div>
  );
}

/**
 * Pinned horizontal scroll: vertical scrolling drives a track of four stat panels sideways while
 * the camera holds its lowest, widest shot. Each figure counts up as its panel slides in, and the
 * speedometer needle follows the pin's progress. Under reduced motion the panels simply stack.
 */
export function Performance() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const needle = useRef<SVGGElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const sectionEl = section.current;
    const trackEl = track.current;
    if (reducedMotion || !sectionEl || !trackEl) return;

    const ctx = gsap.context(() => {
      const distance = () => trackEl.scrollWidth - window.innerWidth;
      const slide = gsap.to(trackEl, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: sectionEl,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            rig.performanceProgress = self.progress;
          },
        },
      });

      // Heading words rise as the section pins.
      const words = sectionEl.querySelectorAll('[data-word]');
      const intro = gsap.fromTo(words, { yPercent: 115 }, { yPercent: 0, duration: 1.05, ease: 'expo.out', stagger: 0.05, paused: true });
      ScrollTrigger.create({ trigger: sectionEl, start: 'top 35%', onEnter: () => intro.play(), onLeaveBack: () => intro.reverse() });

      // Each figure counts up as its panel crosses into view on the horizontal track.
      sectionEl.querySelectorAll<HTMLElement>('[data-panel]').forEach((panel) => {
        const counter = panel.querySelector<HTMLElement>('[data-count]');
        if (!counter) return;
        const count = countTo(counter, 1.2).pause(0);
        ScrollTrigger.create({
          trigger: panel,
          containerAnimation: slide,
          start: 'left 75%',
          onEnter: () => count.play(),
          onLeaveBack: () => count.reverse(),
        });
      });
    }, sectionEl);

    // Needle and readout read the rig directly: no React state per frame.
    const shown = { kmh: 0 };
    const tick = () => {
      const target = Math.min(GAUGE_MAX_KMH, rig.performanceProgress * 352);
      shown.kmh += (target - shown.kmh) * 0.12;
      if (needle.current) needle.current.style.transform = `rotate(${START_DEG + (shown.kmh / GAUGE_MAX_KMH) * SWEEP_DEG}deg)`;
      if (readout.current) readout.current.textContent = String(Math.round(shown.kmh));
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      ctx.revert();
    };
  }, [reducedMotion]);

  return (
    <section
      ref={section}
      data-section="performance"
      aria-labelledby="performance-title"
      className={`relative ${reducedMotion ? '' : 'h-svh overflow-hidden'}`}
    >
      <div ref={track} className={reducedMotion ? 'flex flex-col' : 'flex h-full w-max'}>
        <div className="flex h-svh w-screen shrink-0 items-end px-6 pb-10 md:items-center md:px-[6vw] md:pb-0">
          <h2 id="performance-title" className={`${headingClass} max-w-[10ch]`}>
            <SplitWords text="Performance" />
          </h2>
        </div>
        {PANELS.map((key) => {
          const spec: Spec = SPECS[key];
          return (
            <div key={key} data-panel className="flex h-svh w-screen shrink-0 items-end px-6 pb-10 md:w-[70vw] md:items-start md:px-[6vw] md:pt-[15vh] md:pb-0">
              <p className="border-t border-[var(--hairline-red)] pt-4">
                <span className="block text-sm text-smoke">{spec.label}</span>
                <span className="mt-2 block font-mono text-[clamp(3rem,9vw,8rem)] leading-none text-white tabular">
                  {spec.prefix && `${spec.prefix} `}
                  <span data-count={spec.value} data-decimals={spec.decimals}>
                    {formatValue({ ...spec, prefix: undefined })}
                  </span>
                  <span className="ml-3 text-[0.3em] text-smoke">{spec.unit}</span>
                </span>
              </p>
            </div>
          );
        })}
      </div>
      {!reducedMotion && <Speedometer needle={needle} readout={readout} />}
    </section>
  );
}
