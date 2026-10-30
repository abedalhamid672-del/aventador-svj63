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
        <p>
          Created by Engineer{' '}
          <a
            className="underline underline-offset-4 hover:text-white"
            href="https://github.com/abedalhamid672-del"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abdel Hamid Al-Khatib
          </a>
          ; WhatsApp number:{' '}
          <a
            className="underline underline-offset-4 hover:text-white"
            href="https://wa.me/972597183082"
            target="_blank"
            rel="noopener noreferrer"
          >
            +972597183082
          </a>
        </p>
        <p className="mt-2">
          <a
            className="underline underline-offset-4 hover:text-white"
            href="https://github.com/abedalhamid672-del"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub: abedalhamid672-del
          </a>
        </p>
      </footer>
    </>
  );
}
