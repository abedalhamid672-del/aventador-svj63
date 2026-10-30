import { useProgress } from '@react-three/drei';
import { gsap } from 'gsap';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useExperience } from '../app/store';
import { ENGINE } from '../data/specs';
import { useReducedMotion } from '../hooks/useMediaQuery';

/** Tachometer: 0–9,000 rpm over a 270° sweep, redline from the engine's power peak. */
const TACH_MAX = 9000;
const SWEEP_DEG = 270;
const START_DEG = -135;
const TICKS = Array.from({ length: TACH_MAX / 500 + 1 }, (_, i) => i * 500);

const polar = (deg: number, r: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [100 + r * Math.cos(rad), 100 + r * Math.sin(rad)] as const;
};
const angleFor = (rpm: number) => START_DEG + (rpm / TACH_MAX) * SWEEP_DEG;

/**
 * 00 · Loader. The needle follows real asset loading up to 8,500 rpm, swings into the redline,
 * the screen cuts to black, and a red band of light sweeps across, uncovering the car behind it.
 * Scrolling is held until the reveal has finished.
 */
export function Loader() {
  const { progress, active } = useProgress();
  const finishIntro = useExperience((s) => s.finishIntro);
  const sceneFailed = useExperience((s) => s.sceneFailed);
  const sceneReady = useExperience((s) => s.sceneReady);
  const reducedMotion = useReducedMotion();
  const [gone, setGone] = useState(false);
  const cover = useRef<HTMLDivElement>(null);
  const gauge = useRef<HTMLDivElement>(null);
  const band = useRef<HTMLDivElement>(null);
  const needle = useRef<SVGGElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const tach = useRef({ rpm: 0 });
  const revealed = useRef(false);

  const render = () => {
    const { rpm } = tach.current;
    if (needle.current) needle.current.style.transform = `rotate(${angleFor(rpm)}deg)`;
    if (readout.current) readout.current.textContent = Math.round(rpm).toLocaleString('en-US');
  };

  // Hold the page at the top while loading (Lenis is also stopped until the intro finishes).
  useLayoutEffect(() => {
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, []);

  // The needle chases load progress.
  useEffect(() => {
    if (revealed.current) return;
    gsap.to(tach.current, { rpm: (progress / 100) * ENGINE.redlineRpm, duration: 0.6, ease: 'power2.out', overwrite: true, onUpdate: render });
  }, [progress]);

  // No 3D (no WebGL or a failed download): skip the show and let the content read.
  useEffect(() => {
    if (!sceneFailed || revealed.current) return;
    revealed.current = true;
    gsap.to(cover.current, {
      autoAlpha: 0,
      duration: 0.4,
      onComplete: () => {
        document.documentElement.style.overflow = '';
        finishIntro();
        setGone(true);
      },
    });
  }, [sceneFailed, finishIntro]);

  // Everything loaded: redline, cut to black, light sweep.
  useEffect(() => {
    if (revealed.current || active || progress < 100 || !sceneReady) return;
    revealed.current = true;
    const done = () => {
      document.documentElement.style.overflow = '';
      finishIntro();
      setGone(true);
    };

    if (reducedMotion) {
      gsap.to(cover.current, { autoAlpha: 0, duration: 0.6, delay: 0.3, onComplete: done });
      return;
    }

    gsap
      .timeline({ onComplete: done })
      .to(tach.current, { rpm: ENGINE.redlineRpm + 250, duration: 0.45, ease: 'power3.in', overwrite: true, onUpdate: render })
      .to(tach.current, { rpm: ENGINE.redlineRpm, duration: 0.18, ease: 'power2.out', onUpdate: render })
      .set(gauge.current, { autoAlpha: 0 }, '+=0.2') // hard cut to black
      .fromTo(band.current, { xPercent: -100, autoAlpha: 1 }, { xPercent: 100, duration: 1.25, ease: 'power2.inOut' }, '+=0.35')
      .fromTo(cover.current, { clipPath: 'inset(0 0 0 0%)' }, { clipPath: 'inset(0 0 0 100%)', duration: 1.25, ease: 'power2.inOut' }, '<')
      .to(band.current, { autoAlpha: 0, duration: 0.3 }, '>-0.2');
  }, [active, progress, sceneReady, reducedMotion, finishIntro]);

  if (gone) return null;

  return (
    <div className="fixed inset-0 z-50" role="progressbar" aria-label="Loading the 3D scene" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
      <div ref={cover} className="absolute inset-0 grid place-items-center bg-black">
        <div ref={gauge} className="w-[min(70vw,22rem)]">
          <svg viewBox="0 0 200 200" aria-hidden="true" className="w-full">
            {TICKS.map((rpm) => {
              const major = rpm % 1000 === 0;
              const [ax, ay] = polar(angleFor(rpm), major ? 76 : 82);
              const [bx, by] = polar(angleFor(rpm), 88);
              return (
                <line key={rpm} x1={ax} y1={ay} x2={bx} y2={by} stroke={rpm >= ENGINE.redlineRpm ? 'var(--red)' : 'var(--smoke)'} strokeWidth={major ? 1.8 : 1} />
              );
            })}
            {TICKS.filter((rpm) => rpm % 1000 === 0).map((rpm) => {
              const [x, y] = polar(angleFor(rpm), 64);
              return (
                <text key={rpm} x={x} y={y + 3} textAnchor="middle" className="fill-smoke font-mono" fontSize="9">
                  {rpm / 1000}
                </text>
              );
            })}
            <g ref={needle} style={{ transformOrigin: '100px 100px', transform: `rotate(${START_DEG}deg)` }}>
              <line x1="100" y1="110" x2="100" y2="20" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" />
            </g>
            <circle cx="100" cy="100" r="4.5" fill="var(--red)" />
          </svg>
          <p className="-mt-6 text-center font-mono text-white tabular">
            <span ref={readout} className="text-3xl">
              0
            </span>
            <span className="ml-2 text-xs text-smoke">RPM</span>
          </p>
        </div>
      </div>
      {/* The light sweep: a soft red band riding the reveal edge, over both the cover and the car. */}
      <div
        ref={band}
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-y-0 left-0 w-full"
        style={{ background: 'linear-gradient(90deg, transparent 0%, transparent 70%, rgb(225 6 0 / 0.55) 96%, rgb(255 42 31 / 0.9) 100%)' }}
      />
    </div>
  );
}
