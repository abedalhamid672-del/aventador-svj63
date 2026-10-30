import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import { Vector3, type Group } from 'three';
import { rig } from './rig';

interface ViewAnchorProps {
  /** Metres behind the camera's look-at point, along the view direction. */
  readonly depth: number;
  /** Offset in screen-aligned metres at that depth: [right, up]. */
  readonly offset?: readonly [number, number];
  readonly children: ReactNode;
}

const forward = new Vector3();

/**
 * Keeps its children at a fixed depth behind whatever the camera is looking at, aligned to the
 * screen. Background layers (the M4, the hero title) stay "behind the car" from every camera
 * angle instead of being visible only from the front.
 */
export function ViewAnchor({ depth, offset = [0, 0], children }: ViewAnchorProps) {
  const group = useRef<Group>(null);

  useFrame(({ camera }) => {
    const g = group.current;
    if (!g) return;
    camera.getWorldDirection(forward);
    const distance = camera.position.distanceTo(rig.currentTarget) + depth;
    g.quaternion.copy(camera.quaternion);
    g.position.copy(camera.position).addScaledVector(forward, distance);
    // Quaternion is screen-aligned, so local X/Y are screen right/up.
    g.translateX(offset[0]);
    g.translateY(offset[1]);
  });

  return <group ref={group}>{children}</group>;
}
