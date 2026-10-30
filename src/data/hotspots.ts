/**
 * Hotspots pinned to the car. Anchors are car-space metres, measured from the model with
 * tools/measure-anchors.mjs and lifted a few centimetres off the surface (so the bodywork at the
 * pin never hides it). Each sits on the side of the car its section's camera actually sees:
 * Identity looks at the right flank (−X), Aero at the left (+X), Engine from above and behind.
 * Facts come from Lamborghini's SVJ Roadster press release (Geneva, 2019) unless noted.
 */
import type { SectionId } from './cameraKeyframes';
import { ENGINE, SPECS } from './specs';

export type HotspotId = 'brakes' | 'roof' | 'engine' | 'wing' | 'splitter';

type Vec3 = readonly [number, number, number];

export interface Hotspot {
  readonly id: HotspotId;
  readonly section: SectionId;
  readonly label: string;
  readonly value: string;
  readonly description: string;
  /** Pin position on the car, car space. */
  readonly anchor: Vec3;
  /** Close-up: camera offset from the anchor (car space) and field of view. */
  readonly focus: { readonly offset: Vec3; readonly fov: number };
}

export const HOTSPOTS: readonly Hotspot[] = [
  {
    id: 'brakes',
    section: 'identity',
    label: 'Carbon-ceramic brakes',
    value: '400 / 380 mm',
    description: 'Carbon-ceramic discs, 400 mm at the front with six-piston calipers and 380 mm at the rear with four.',
    anchor: [-1.04, 0.36, 1.26],
    focus: { offset: [-1.5, 0.25, 0.9], fov: 30 },
  },
  {
    id: 'roof',
    section: 'identity',
    label: 'Roof',
    value: 'Carbon fibre',
    description: 'Two carbon-fibre panels that release by hand and stow under the front bonnet.',
    anchor: [-0.55, 1.17, 0.3],
    focus: { offset: [-1.6, 1.4, 1.6], fov: 32 },
  },
  {
    id: 'engine',
    section: 'engine',
    label: `${ENGINE.displacementLabel} V12`,
    value: `${SPECS.power.value} CV`,
    description: `Naturally aspirated and mid-mounted: ${SPECS.power.value} CV at 8,500 rpm and ${SPECS.torque.value} Nm at 6,750 rpm.`,
    anchor: [0, 1.08, -1.24],
    focus: { offset: [0.9, 1.5, -1.5], fov: 34 },
  },
  {
    id: 'wing',
    section: 'aero',
    label: 'ALA 2.0 rear wing',
    value: '+40% downforce',
    description: 'Active aero vectoring through the wing shifts load side to side. Total downforce is 40% higher than the Aventador SV Roadster.',
    anchor: [0.6, 1.07, -2.3],
    focus: { offset: [1.8, 0.9, -1.6], fov: 32 },
  },
  {
    id: 'splitter',
    section: 'aero',
    label: 'Front splitter',
    value: 'Active flaps',
    description: 'Flaps in the splitter open to cut drag on the straights and close for maximum downforce under braking.',
    anchor: [0.45, 0.18, 2.4],
    focus: { offset: [1.4, 0.35, 1.6], fov: 30 },
  },
];
