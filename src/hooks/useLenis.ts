import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useEffect } from 'react';
import { useExperience } from '../app/store';
import { rig } from '../scene/rig';

gsap.registerPlugin(ScrollTrigger);

/** Lenis velocity (px per frame) that maps to full-strength scroll effects. */
const VELOCITY_FOR_FULL_EFFECT = 45;
/** Per-tick decay so the velocity settles to zero once scrolling stops. */
const VELOCITY_DECAY = 0.88;
/** Skew on big type at full scroll speed, degrees. */
const MAX_SKEW_DEG = 3;

let instance: Lenis | null = null;
/** The running Lenis instance, for programmatic scrolling (nav links). Null under reduced motion. */
export const getLenis = (): Lenis | null => instance;

/**
 * Smooth scrolling driven by GSAP's ticker, so Lenis, ScrollTrigger and every scrubbed tween
 * advance in the same frame and never drift apart. Reduced motion keeps native scrolling;
 * ScrollTrigger still works on top of it.
 */
export function useLenis(enabled: boolean): void {
  useEffect(() => {
    // Big type leans into fast scrolls: one CSS variable, written only when it moves.
    const root = document.documentElement;
    let skew = 0;
    const decay = () => {
      rig.scrollVelocity *= VELOCITY_DECAY;
      const next = skew + (rig.scrollVelocity * MAX_SKEW_DEG - skew) * 0.12;
      if (Math.abs(next - skew) > 0.002) {
        skew = Math.abs(next) < 0.002 ? 0 : next;
        root.style.setProperty('--scroll-skew', skew.toFixed(3));
      }
    };
    gsap.ticker.add(decay);

    if (!enabled) {
      return () => gsap.ticker.remove(decay);
    }

    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
    instance = lenis;
    if (import.meta.env.DEV) Object.assign(window, { __lenis: lenis });
    lenis.on('scroll', (l: Lenis) => {
      ScrollTrigger.update();
      rig.scrollVelocity = gsap.utils.clamp(-1, 1, l.velocity / VELOCITY_FOR_FULL_EFFECT);
    });
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    // Lenis already smooths; GSAP's lag smoothing would fight it after a long frame.
    gsap.ticker.lagSmoothing(0);

    // Hold the page still until the loader's reveal has played.
    if (!useExperience.getState().introDone) lenis.stop();
    const unsubscribe = useExperience.subscribe((s) => {
      if (s.introDone && lenis.isStopped) lenis.start();
    });

    return () => {
      unsubscribe();
      gsap.ticker.remove(raf);
      gsap.ticker.remove(decay);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      instance = null;
    };
  }, [enabled]);
}
