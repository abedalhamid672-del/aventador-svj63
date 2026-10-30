import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import { Vector3, type Group, type Object3D } from 'three';
import { useExperience } from '../app/store';
import { HOTSPOTS, type Hotspot, type HotspotId } from '../data/hotspots';
import { getLenis } from '../hooks/useLenis';
import { rig } from '../scene/rig';

/** The car's mesh group: hotspots raycast against it to hide pins behind the bodywork. */
export const CarBodyContext = createContext<RefObject<Object3D> | null>(null);

/** DOM layer above the page (rendered by App) so pins stay clickable over the scrolling sections. */
export const HOTSPOT_LAYER_ID = 'hotspot-layer';

/** Pins right of this (normalised device x) open their card to the left, away from the edge. */
const FLIP_NDC_X = 0.3;
const projected = new Vector3();

/** Scroll speed (normalised) that releases a close-up. */
const RELEASE_VELOCITY = 0.15;

interface PinProps {
  readonly hotspot: Hotspot;
  readonly visible: boolean;
  readonly focused: boolean;
  /** Position within its section, for the staggered fade. */
  readonly order: number;
  readonly portal: MutableRefObject<HTMLElement>;
  readonly onAnchor: (id: HotspotId, group: Group | null) => void;
}

function HotspotPin({ hotspot, visible, focused, order, portal, onAnchor }: PinProps) {
  const body = useContext(CarBodyContext);
  const [occluded, setOccluded] = useState(false);
  const shown = visible && (!occluded || focused);
  const setFocused = useExperience((s) => s.setFocusedHotspot);
  const cardId = `hotspot-${hotspot.id}`;
  const anchor = useRef<Group | null>(null);
  const [flipped, setFlipped] = useState(false);

  // Cheap per-frame projection; React only re-renders when the pin crosses the flip line.
  useFrame(({ camera }) => {
    if (!visible || !anchor.current) return;
    const ndcX = anchor.current.getWorldPosition(projected).project(camera).x;
    const next = ndcX > FLIP_NDC_X;
    if (next !== flipped) setFlipped(next);
  });

  return (
    <group
      ref={(g) => {
        anchor.current = g;
        onAnchor(hotspot.id, g);
      }}
      position={hotspot.anchor}
    >
      <Html
        portal={portal}
        zIndexRange={[40, 30]}
        occlude={visible && body ? [body] : undefined}
        onOcclude={setOccluded}
        style={{ pointerEvents: 'none' }}
      >
        <div
          data-hotspot
          aria-hidden={!shown}
          className={`hotspot ${shown ? 'is-shown' : ''} ${focused ? 'is-focused' : ''} ${flipped ? 'is-flipped' : ''}`}
          style={{ transitionDelay: shown ? `${120 + order * 110}ms` : '0ms' }}
        >
          <button
            type="button"
            className="hotspot-dot"
            tabIndex={shown ? 0 : -1}
            aria-expanded={focused}
            aria-controls={cardId}
            aria-label={`${hotspot.label}: ${hotspot.value}`}
            data-cursor="view"
            onClick={() => setFocused(focused ? null : hotspot.id)}
          />
          <span className="hotspot-leader" aria-hidden="true" />
          <div id={cardId} className="hotspot-card">
            <p className="text-[13px] text-smoke">{hotspot.label}</p>
            <p className="mt-1 font-mono text-lg text-white tabular">{hotspot.value}</p>
            <p className="hotspot-description">
              <span>{hotspot.description}</span>
            </p>
          </div>
        </div>
      </Html>
    </group>
  );
}

/**
 * Data-driven pins for the active section. Rendered inside the car's drive group, so they turn and
 * travel with it. Clicking one hands the camera a close-up; Esc, clicking elsewhere, scrolling or
 * changing section releases it.
 */
export function Hotspots() {
  const activeSection = useExperience((s) => s.activeSection);
  const focusedId = useExperience((s) => s.focusedHotspot);
  const setFocused = useExperience((s) => s.setFocusedHotspot);
  const anchors = useRef(new Map<HotspotId, Group>());
  const portal = useMemo<MutableRefObject<HTMLElement>>(() => ({ current: document.getElementById(HOTSPOT_LAYER_ID) as HTMLElement }), []);

  // Hand the camera the close-up, expressed in world space at the moment of the click.
  useEffect(() => {
    // Page copy steps back while a close-up owns the frame.
    document.documentElement.toggleAttribute('data-hotspot-focus', focusedId !== null);
    const hotspot = HOTSPOTS.find((h) => h.id === focusedId);
    const anchor = focusedId ? anchors.current.get(focusedId) : undefined;
    if (!hotspot || !anchor?.parent) {
      rig.focus.active = false;
      return;
    }
    anchor.getWorldPosition(rig.focus.target);
    const [ax, ay, az] = hotspot.anchor;
    const [ox, oy, oz] = hotspot.focus.offset;
    rig.focus.position.copy(anchor.parent.localToWorld(new Vector3(ax + ox, ay + oy, az + oz)));
    rig.focus.fov = hotspot.focus.fov;
    rig.focus.active = true;
  }, [focusedId]);

  // Release on Esc, a click outside any pin, or a deliberate scroll.
  useEffect(() => {
    if (!focusedId) return;
    const release = () => setFocused(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && release();
    const onPointer = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('[data-hotspot]')) release();
    };
    const lenis = getLenis();
    const onScroll = () => Math.abs(rig.scrollVelocity) > RELEASE_VELOCITY && release();
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    lenis?.on('scroll', onScroll);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
      lenis?.off('scroll', onScroll);
    };
  }, [focusedId, setFocused]);

  const onAnchor = (id: HotspotId, group: Group | null) => {
    if (group) anchors.current.set(id, group);
    else anchors.current.delete(id);
  };

  return (
    <>
      {HOTSPOTS.map((hotspot) => {
        const visible = hotspot.section === activeSection;
        const order = HOTSPOTS.filter((h) => h.section === hotspot.section).indexOf(hotspot);
        return (
          <HotspotPin
            key={hotspot.id}
            hotspot={hotspot}
            visible={visible}
            focused={focusedId === hotspot.id}
            order={order}
            portal={portal}
            onAnchor={onAnchor}
          />
        );
      })}
    </>
  );
}
