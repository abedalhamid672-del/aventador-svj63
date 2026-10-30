import { SplitWords } from '../components/SplitWords';
import { bodyClass, headingClass, Section } from './Section';

export function Aero() {
  return (
    <Section id="aero" height="h-[220svh]" side="bottom">
      <h2 id="aero-title" className={headingClass}>
        <SplitWords text="ALA 2.0" />
      </h2>
      <p data-fade className={bodyClass}>
        Aerodinamica Lamborghini Attiva. Flaps in the front splitter and the rear wing open and close in milliseconds,
        trading drag for downforce and shifting load side to side through a corner.
      </p>
    </Section>
  );
}
