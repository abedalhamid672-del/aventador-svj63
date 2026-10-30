/**
 * Every figure shown on the site. Each entry names its official source so it can be re-checked.
 * The 3D model is the SVJ 63 Roadster, so Roadster figures lead; the Nürburgring lap was set
 * by the SVJ coupé and is presented as lineage.
 */

export type SpecSource = 'svj-roadster-press-2019' | 'svj-roadster-history' | 'svj-coupe-history';

export interface Spec {
  readonly id: string;
  readonly label: string;
  /** Numeric part, used by count-up animations. */
  readonly value: number;
  /** Decimal places to keep while counting. */
  readonly decimals: number;
  readonly unit: string;
  /** Rendered before the number, e.g. ">" for "> 350". */
  readonly prefix?: string;
  /** Extra qualifier shown after the unit, e.g. "@ 8,500 rpm". */
  readonly qualifier?: string;
  readonly source: SpecSource;
}

export const SOURCES: Readonly<Record<SpecSource, { readonly title: string; readonly url: string }>> = {
  'svj-roadster-press-2019': {
    title: 'Automobili Lamborghini press release: Aventador SVJ Roadster, Geneva 2019',
    url: 'https://media.lamborghini.com/english/models/automobili-lamborghini-launches-the-aventador-svj-roadster--at-geneva-motor-show-2019--exclusive-ope/s/347a6f41-bcd0-44f5-89b5-ba72eb9ecd4f',
  },
  'svj-roadster-history': {
    title: 'Lamborghini.com: Aventador SVJ Roadster',
    url: 'https://www.lamborghini.com/en-en/history/aventador-svj-roadster',
  },
  'svj-coupe-history': {
    title: 'Lamborghini.com: Aventador SVJ',
    url: 'https://www.lamborghini.com/en-en/history/aventador-svj',
  },
};

export const ENGINE = {
  layout: 'V12, naturally aspirated',
  displacementCc: 6498,
  displacementLabel: '6.5 L',
  redlineRpm: 8500,
  /** Rough idle speed used for the engine-glow pulse rhythm. Not a published figure. */
  idleRpm: 1000,
} as const;

export const SPECS = {
  power: { id: 'power', label: 'Power', value: 770, decimals: 0, unit: 'CV', qualifier: '@ 8,500 rpm', source: 'svj-roadster-press-2019' },
  torque: { id: 'torque', label: 'Torque', value: 720, decimals: 0, unit: 'Nm', qualifier: '@ 6,750 rpm', source: 'svj-roadster-press-2019' },
  zeroTo100: { id: 'zeroTo100', label: '0–100 km/h', value: 2.9, decimals: 1, unit: 's', source: 'svj-roadster-press-2019' },
  zeroTo200: { id: 'zeroTo200', label: '0–200 km/h', value: 8.8, decimals: 1, unit: 's', source: 'svj-roadster-press-2019' },
  topSpeed: { id: 'topSpeed', label: 'Top speed', value: 350, decimals: 0, unit: 'km/h', prefix: '>', source: 'svj-roadster-history' },
  dryWeight: { id: 'dryWeight', label: 'Dry weight', value: 1575, decimals: 0, unit: 'kg', source: 'svj-roadster-press-2019' },
} as const satisfies Readonly<Record<string, Spec>>;

export const EDITION = {
  name: 'Aventador SVJ 63 Roadster',
  /** The "63" edition marks Lamborghini's founding year, 1963. */
  units: 63,
  /** Total SVJ Roadster production, all versions. */
  roadsterUnits: 800,
  source: 'svj-roadster-history',
} as const satisfies { readonly source: SpecSource } & Record<string, unknown>;

export const NURBURGRING = {
  /** Set by the Aventador SVJ coupé in 2018: production-car Nordschleife record at the time. */
  car: 'Aventador SVJ coupé',
  lapTime: '6:44.97',
  lapMs: 6 * 60_000 + 44_970,
  lengthKm: 20.6,
  source: 'svj-coupe-history',
} as const satisfies { readonly source: SpecSource } & Record<string, unknown>;
