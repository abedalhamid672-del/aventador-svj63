/**
 * Configurator paints. Names are real Lamborghini colours; Lamborghini publishes no colour codes,
 * so the values are visual approximations tuned under the studio lighting, not official swatches.
 */

export type PaintId = 'grigio-telesto' | 'rosso-mars' | 'nero-nemesis';

export interface Paint {
  readonly id: PaintId;
  readonly name: string;
  readonly finish: 'gloss' | 'matte';
  readonly color: string;
  readonly metalness: number;
  readonly roughness: number;
  readonly clearcoat: number;
}

export const PAINTS: Readonly<Record<PaintId, Paint>> = {
  'grigio-telesto': {
    id: 'grigio-telesto',
    name: 'Grigio Telesto',
    finish: 'gloss',
    color: '#3e4246',
    metalness: 0.55,
    roughness: 0.32,
    clearcoat: 1,
  },
  'rosso-mars': {
    id: 'rosso-mars',
    name: 'Rosso Mars',
    finish: 'gloss',
    color: '#7d0605',
    metalness: 0.45,
    roughness: 0.28,
    clearcoat: 1,
  },
  'nero-nemesis': {
    id: 'nero-nemesis',
    name: 'Nero Nemesis',
    finish: 'matte',
    color: '#0b0b0c',
    metalness: 0.35,
    roughness: 0.62,
    clearcoat: 0.1,
  },
};

/** Matches the model's own livery, so the first frame is the car as delivered. */
export const DEFAULT_PAINT: PaintId = 'grigio-telesto';
