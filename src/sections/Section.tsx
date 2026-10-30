import { useRef, type ReactNode, type RefObject } from 'react';
import { useSectionReveal } from '../hooks/useSectionReveal';
import type { SectionId } from '../data/cameraKeyframes';

type Side = 'left' | 'right' | 'bottom';

interface SectionProps {
  readonly id: SectionId;
  /** Tailwind height class: how much scroll the section holds (the camera flies in over the first 100svh). */
  readonly height: string;
  /** Which side of the frame the camera keeps free for copy on landscape screens. */
  readonly side: Side;
  readonly children: ReactNode;
  /** Full-frame art drawn inside the pinned viewport, behind the copy (e.g. the track map). */
  readonly art?: ReactNode;
  /** Exposes the section element to the parent for its own scroll-driven effects. */
  readonly sectionRef?: RefObject<HTMLElement>;
}

const SIDE_CLASSES: Readonly<Record<Side, string>> = {
  left: 'md:items-center md:justify-start',
  right: 'md:items-center md:justify-end',
  bottom: 'md:items-end md:justify-center',
};

/**
 * A scroll section whose copy stays pinned in view (sticky) while the camera holds the shot.
 * On portrait screens copy always sits at the bottom over a scrim, below the reframed car.
 */
export function Section({ id, height, side, children, art, sectionRef }: SectionProps) {
  const ownRef = useRef<HTMLElement>(null);
  const ref = sectionRef ?? ownRef;
  useSectionReveal(ref);

  return (
    <section ref={ref} data-section={id} aria-labelledby={`${id}-title`} className={`relative ${height}`}>
      <div className={`sticky top-0 flex h-svh items-end justify-start px-6 pb-10 md:px-[6vw] md:pb-[8vh] ${SIDE_CLASSES[side]}`}>
        {art}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black via-black/70 to-transparent md:hidden" />
        <div className="relative max-w-[min(34rem,100%)]">{children}</div>
      </div>
    </section>
  );
}

export const headingClass =
  'scroll-skew font-display font-extrabold uppercase leading-[0.95] tracking-[-0.04em] text-white text-balance text-[clamp(2.25rem,5.2vw,5.5rem)]';

export const bodyClass = 'mt-5 max-w-[44ch] text-pretty text-[clamp(1rem,1.05vw,1.125rem)] leading-relaxed text-white/80';
