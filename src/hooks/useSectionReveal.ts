import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, type RefObject } from 'react';
import { useReducedMotion } from './useMediaQuery';

gsap.registerPlugin(ScrollTrigger);

/** Formats a counting value with the target's decimals and thousands separators. */
export const formatCount = (value: number, decimals: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * Animates a counter element ([data-count], optional [data-decimals]) from zero to its target.
 * The element is rendered with its final value, so the number is correct without JavaScript.
 */
export function countTo(el: HTMLElement, duration = 1.4): gsap.core.Tween {
  const target = Number(el.dataset.count);
  const decimals = Number(el.dataset.decimals ?? 0);
  const state = { value: 0 };
  el.textContent = formatCount(0, decimals);
  return gsap.to(state, {
    value: target,
    duration,
    ease: 'power3.out',
    onUpdate: () => {
      el.textContent = formatCount(state.value, decimals);
    },
  });
}

/**
 * One reveal per section, played when its copy arrives and reversed when scrolling back past it:
 * masked words slide up ([data-word]), supporting lines rise in ([data-fade]) and numbers count
 * up ([data-count]). Reduced motion leaves everything static and fully visible.
 */
export function useSectionReveal(section: RefObject<HTMLElement>): void {
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const root = section.current;
    if (!root || reducedMotion) return;

    const ctx = gsap.context(() => {
      const words = root.querySelectorAll('[data-word]');
      const fades = root.querySelectorAll('[data-fade]');
      const counters = root.querySelectorAll<HTMLElement>('[data-count]:not([data-count-manual])');

      const tl = gsap.timeline({ paused: true });
      if (words.length) {
        tl.fromTo(words, { yPercent: 115 }, { yPercent: 0, duration: 1.05, ease: 'expo.out', stagger: 0.045 }, 0);
      }
      // Opacity only (not visibility): hidden-until-revealed controls must stay keyboard-focusable.
      if (fades.length) {
        tl.fromTo(fades, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.09 }, 0.25);
      }
      counters.forEach((el) => tl.add(countTo(el), 0.35));

      ScrollTrigger.create({
        trigger: root,
        start: 'top 35%',
        onEnter: () => tl.play(),
        onLeaveBack: () => tl.reverse(),
      });

      // Tabbing into a section before it has scrolled into place reveals it at once.
      const onFocus = () => tl.play();
      root.addEventListener('focusin', onFocus);
      return () => root.removeEventListener('focusin', onFocus);
    }, root);

    return () => ctx.revert();
  }, [section, reducedMotion]);
}
