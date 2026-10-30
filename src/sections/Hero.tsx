import { EDITION } from '../data/specs';

/** The visible title is drawn in WebGL behind the car; this section carries its real-text twin. */
export function Hero() {
  return (
    <section id="top" data-section="hero" aria-labelledby="hero-title" className="relative h-[150svh]">
      <div className="sticky top-0 h-svh">
        <h1 id="hero-title" className="sr-only">
          Lamborghini Aventador SVJ 63 Roadster
        </h1>
        <p className="absolute bottom-6 left-6 max-w-[34ch] font-mono text-[11px] leading-relaxed tracking-wide text-smoke uppercase md:left-[6vw]">
          Concept study · not affiliated with Automobili Lamborghini S.p.A.
        </p>
        {/* The edition, set small against the giant name: the car is one of 63. */}
        <p className="absolute right-6 bottom-6 text-right font-mono text-[11px] leading-relaxed tracking-wide uppercase md:right-[6vw]">
          <span className="block font-display text-[clamp(1rem,1.6vw,1.5rem)] font-extrabold tracking-[-0.02em] text-white normal-case">
            63 Roadster
          </span>
          <span className="text-smoke">{EDITION.units} examples · 770 CV</span>
        </p>
      </div>
    </section>
  );
}
