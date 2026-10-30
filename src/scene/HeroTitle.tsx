import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { PerspectiveCamera, type Group, type Mesh } from 'three';
import unboundedUrl from '@fontsource/unbounded/files/unbounded-latin-800-normal.woff?url';
import { rig } from './rig';

/** Troika's synced mesh exposes layout bounds after each text sync, and per-mesh fill opacity. */
interface TroikaText extends Mesh {
  textRenderInfo?: { blockBounds: [number, number, number, number] };
  fillOpacity: number;
}

interface HeroTitleProps {
  /** Metres behind the car's look-at point; must clear the car's far end (~2.5 m). */
  readonly depth: number;
}

const BIG_LETTERS = ['S', 'V', 'J'] as const;

/** Share of the visible width each line spans. */
const LINE_WIDTH = 0.92;
/** The whole two-line stack may use at most this share of the visible height… */
const MAX_STACK_HEIGHT = 0.5;
/** …and its top sits this far below the top edge. */
const TOP_MARGIN = 0.07;
/** Unbounded's cap height as a fraction of its em. */
const CAP_HEIGHT = 0.72;
const GAP_EM = 0.18;
/** Tracking between the split letters, in em (matches the -0.04em of the set line). */
const TRACKING_EM = -0.04;
/** How far the outer letters travel at full split, as a share of the visible width. */
const SPLIT_SPREAD = 0.42;

const widthOf = (t: TroikaText | null) => {
  const b = t?.textRenderInfo?.blockBounds;
  return b ? b[2] - b[0] : null;
};

/**
 * "AVENTADOR / SVJ" set in WebGL so it sits between the M4 and the car: the car's roofline
 * overlaps the base of "SVJ". Both lines are fitted to the viewport width every frame, so the
 * composition holds at any aspect ratio. As the hero scrolls away (`rig.heroSplit`), S and J fly
 * apart, V sinks behind the car and AVENTADOR lifts out of frame. Aria-hidden art: the semantic
 * <h1> lives in the DOM.
 */
export function HeroTitle({ depth }: HeroTitleProps) {
  const group = useRef<Group>(null);
  const top = useRef<TroikaText>(null);
  const letters = useRef<(TroikaText | null)[]>([]);

  useFrame(({ camera }) => {
    const g = group.current;
    const topText = top.current;
    if (!g || !topText || !(camera instanceof PerspectiveCamera)) return;

    const topWidth = widthOf(topText);
    const letterWidths = BIG_LETTERS.map((_, i) => widthOf(letters.current[i] ?? null));
    if (topWidth === null || letterWidths.some((w) => w === null)) return;
    const widths = letterWidths as number[];

    const split = rig.heroSplit;
    g.visible = split < 0.999;
    if (!g.visible) return;

    const distance = camera.position.distanceTo(rig.currentTarget) + depth;
    const viewH = 2 * distance * Math.tan((camera.fov * Math.PI) / 360);
    const viewW = viewH * camera.aspect;

    // Fit both lines to the width, then shrink them together if the stack is too tall
    // (wide screens), so the composition never crops.
    const wordWidth = widths.reduce((a, b) => a + b, 0) + TRACKING_EM * (widths.length - 1);
    let bigScale = (viewW * LINE_WIDTH) / wordWidth;
    let topScale = (viewW * LINE_WIDTH) / topWidth;
    const stack = (bigScale + topScale) * CAP_HEIGHT + bigScale * GAP_EM;
    const fit = Math.min(1, (viewH * MAX_STACK_HEIGHT) / stack);
    bigScale *= fit;
    topScale *= fit;
    // Group origin is the view centre, so the frame's top edge is at +viewH / 2.
    const baseline = viewH * (0.5 - TOP_MARGIN) - stack * fit;

    let cursor = (-wordWidth * bigScale) / 2;
    const fade = 1 - Math.min(1, split * 1.25);

    letters.current.forEach((letter, i) => {
      if (!letter) return;
      const w = (widths[i] ?? 0) * bigScale;
      const outward = i - 1; // S: -1, V: 0, J: +1
      letter.scale.setScalar(bigScale);
      letter.position.x = cursor + w / 2 + outward * split * viewW * SPLIT_SPREAD;
      letter.position.y = baseline + (outward === 0 ? -split * viewH * 0.35 : split * viewH * 0.04);
      letter.fillOpacity = fade;
      cursor += w + TRACKING_EM * bigScale;
    });

    topText.scale.setScalar(topScale);
    topText.position.y = baseline + bigScale * (CAP_HEIGHT + GAP_EM) + split * viewH * 0.45;
    topText.fillOpacity = fade;
  });

  return (
    <group ref={group} visible={false}>
      <Text ref={top} font={unboundedUrl} fontSize={1} letterSpacing={-0.04} anchorX="center" anchorY="bottom-baseline">
        AVENTADOR
        <meshBasicMaterial color="#f2f2f2" toneMapped={false} fog={false} transparent />
      </Text>
      {BIG_LETTERS.map((char, i) => (
        <Text
          key={char}
          ref={(t: TroikaText | null) => {
            letters.current[i] = t;
          }}
          font={unboundedUrl}
          fontSize={1}
          anchorX="center"
          anchorY="bottom-baseline"
        >
          {char}
          <meshBasicMaterial color="#f2f2f2" toneMapped={false} fog={false} transparent />
        </Text>
      ))}
    </group>
  );
}
