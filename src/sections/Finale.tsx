import { EDITION } from '../data/specs';
import { SplitWords } from '../components/SplitWords';
import { bodyClass, headingClass, Section } from './Section';

export function Finale() {
  return (
    <>
      <Section id="finale" height="h-[200svh]" side="bottom">
        <h2 id="finale-title" className={headingClass}>
          <SplitWords text={`Limited to ${EDITION.units} units.`} />
        </h2>
        <p data-fade className={bodyClass}>
          The {EDITION.name}, built in {EDITION.units} examples for the year Lamborghini was founded.
        </p>
        <a
          data-fade
          data-magnetic
          href="#"
          // Placeholder until a real enquiry target exists: stay put instead of jumping to the top.
          onClick={(e) => e.preventDefault()}
          className="mt-8 inline-flex items-center gap-3 border border-[var(--hairline-red)] px-6 py-3 font-mono text-sm tracking-wide text-white uppercase transition-colors duration-300 hover:border-red hover:bg-red"
        >
          Enquire
        </a>
      </Section>
      <footer className="relative border-t border-[var(--hairline)] bg-black px-6 py-10 text-sm leading-relaxed text-smoke md:px-[6vw]">
        <p>Concept study. Not affiliated with, endorsed by or connected to Automobili Lamborghini S.p.A.</p>
        <p className="mt-2">
          3D models (CC BY 4.0): &ldquo;2020 Lamborghini Aventador SVJ 63 Roadster&rdquo; by{' '}
          <a className="underline underline-offset-4 hover:text-white" href="https://sketchfab.com/ddiaz-design">
            Ddiaz Design
          </a>
          ; &ldquo;Classic M4&rdquo; by{' '}
          <a className="underline underline-offset-4 hover:text-white" href="https://sketchfab.com/jeandiz">
            Mateusz Woliński
          </a>
          . Both modified (optimised, recoloured, trademark artwork removed).
        </p>
        <p className="mt-2">
          Nordschleife outline from{' '}
          <a className="underline underline-offset-4 hover:text-white" href="https://www.openstreetmap.org/copyright">
            © OpenStreetMap contributors
          </a>{' '}
          (ODbL).
        </p>
      </footer>
    </>
  );
}
