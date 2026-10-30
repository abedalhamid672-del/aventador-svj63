import { ENGINE } from '../data/specs';
import { SplitWords } from '../components/SplitWords';
import { bodyClass, headingClass, Section } from './Section';
import { SpecList } from './SpecList';

export function Engine() {
  return (
    <Section id="engine" height="h-[220svh]" side="right">
      <h2 id="engine-title" className={headingClass}>
        <SplitWords text={`${ENGINE.displacementLabel} V12`} />
      </h2>
      <p data-fade className={bodyClass}>
        {ENGINE.displacementCc.toLocaleString('en-US')} cc, naturally aspirated, mounted behind the cabin and revving
        to {ENGINE.redlineRpm.toLocaleString('en-US')} rpm.
      </p>
      <SpecList keys={['power', 'torque']} />
    </Section>
  );
}
