import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect } from 'react';
import { useExperience } from '../app/store';
import { KEYFRAMES, SECTION_IDS, type SectionId } from '../data/cameraKeyframes';
import { applyChannels, rig, toChannels } from '../scene/rig';

gsap.registerPlugin(ScrollTrigger);

const sectionEl = (id: SectionId): HTMLElement | null => document.querySelector(`[data-section="${id}"]`);

/**
 * Builds the scroll → rig mapping. Each section owns the transition *into* it: while its top
 * travels from the bottom of the viewport to the top, a scrubbed tween interpolates every rig
 * channel from the previous keyframe to this one. The ranges never overlap, so any scroll
 * position maps to exactly one state and scrolling up rewinds frame-for-frame.
 *
 * Camera triggers refresh after pins (lower refreshPriority), so pinned sections such as
 * Performance have already inserted their spacing when these positions are measured.
 */
export function useScrollTimeline(reducedMotion: boolean): void {
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const channels = toChannels(KEYFRAMES.hero);
      applyChannels(channels);
      const write = () => applyChannels(channels);

      SECTION_IDS.forEach((id, index) => {
        const el = sectionEl(id);
        if (!el) return;

        // Active section = the last one whose top has crossed mid-screen. Only start positions are
        // used: they include pin spacing, whereas a pinned section's own end (or an endTrigger
        // after a pin) is measured without it.
        const previous = SECTION_IDS[index - 1];
        const setActive = useExperience.getState().setActiveSection;
        ScrollTrigger.create({
          trigger: el,
          start: 'top center',
          refreshPriority: -1,
          onEnter: () => setActive(id),
          onLeaveBack: () => setActive(previous ?? id),
        });

        if (!previous) return;
        const from = toChannels(KEYFRAMES[previous]);
        const to = toChannels(KEYFRAMES[id]);

        if (reducedMotion) {
          // No scrubbed flight: cut to the section's framing; CameraRig's damping softens it.
          ScrollTrigger.create({
            trigger: el,
            start: 'top center',
            refreshPriority: -1,
            onEnter: () => applyChannels(to),
            onLeaveBack: () => applyChannels(from),
          });
          return;
        }

        gsap.fromTo(channels, from, {
          ...to,
          ease: 'power1.inOut',
          immediateRender: false,
          overwrite: false,
          onUpdate: write,
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'top top', scrub: true, refreshPriority: -1 },
        });
      });

      // Hero title splits apart as the hero scrolls away (reduced motion: it simply fades with it).
      const hero = sectionEl('hero');
      if (hero) {
        gsap.fromTo(
          rig,
          { heroSplit: 0 },
          {
            heroSplit: 1,
            ease: reducedMotion ? 'none' : 'power2.in',
            immediateRender: false,
            scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 40%', scrub: true, refreshPriority: -1 },
          },
        );
      }
    });

    // Webfonts change line heights, and therefore section offsets.
    void document.fonts.ready.then(() => ScrollTrigger.refresh());

    return () => ctx.revert();
  }, [reducedMotion]);
}
