import { SplitWords } from '../components/SplitWords';
import { bodyClass, headingClass, Section } from './Section';

export function Identity() {
  return (
    <Section id="identity" height="h-[220svh]" side="left">
      <h2 id="identity-title" className={headingClass}>
        <SplitWords text="Superveloce Jota" />
      </h2>
      <p data-fade className={bodyClass}>
        SV for Superveloce. J for Jota, the name Lamborghini reserves for its most extreme, track-bred cars. The SVJ 63
        takes the roof off and keeps every bit of it.
      </p>
    </Section>
  );
}
