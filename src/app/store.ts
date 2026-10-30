import { create } from 'zustand';
import type { SectionId } from '../data/cameraKeyframes';
import type { HotspotId } from '../data/hotspots';
import { DEFAULT_PAINT, type PaintId } from '../data/paints';

/** `high` adds the floor reflection and MSAA; `low` keeps contact shadows and bloom only. */
export type Quality = 'high' | 'low';

/** Phones and tablets start (and stay) on the low tier: no reflection, MSAA, aberration or grain. */
export const IS_COARSE_POINTER = typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;

/** What the custom cursor says when it is over something in the 3D scene. */
export type CursorHint = 'none' | 'drag';

interface ExperienceState {
  readonly quality: Quality;
  readonly paint: PaintId;
  readonly headlightsOn: boolean;
  /** The section whose middle is crossing the viewport centre. Changes a handful of times per page. */
  readonly activeSection: SectionId;
  /** The hotspot the camera is framing, if any. */
  readonly focusedHotspot: HotspotId | null;
  /** False until the loader's reveal has finished; scrolling is held until then. */
  readonly introDone: boolean;
  /** Models loaded and every shader compiled (off the main thread): the scene can be revealed. */
  readonly sceneReady: boolean;
  /** The 3D scene could not start (no WebGL, or a model failed to load). Content still reads. */
  readonly sceneFailed: boolean;
  /** Synthesised engine sound; off until the visitor turns it on. */
  readonly soundOn: boolean;
  /** Set by 3D hover (the car in the showroom); DOM elements use data-cursor instead. */
  readonly cursorHint: CursorHint;
  setQuality: (quality: Quality) => void;
  setPaint: (paint: PaintId) => void;
  toggleHeadlights: () => void;
  setActiveSection: (section: SectionId) => void;
  setFocusedHotspot: (id: HotspotId | null) => void;
  finishIntro: () => void;
  failScene: () => void;
  markSceneReady: () => void;
  toggleSound: () => void;
  setCursorHint: (hint: CursorHint) => void;
}

/**
 * Discrete UI state only. Anything that changes every frame (camera, scroll progress,
 * wheel speed) lives in the mutable `rig` object instead, so scrolling never re-renders React.
 */
export const useExperience = create<ExperienceState>()((set) => ({
  quality: IS_COARSE_POINTER ? 'low' : 'high',
  paint: DEFAULT_PAINT,
  headlightsOn: false,
  activeSection: 'hero',
  focusedHotspot: null,
  introDone: false,
  setQuality: (quality) => set({ quality }),
  setPaint: (paint) => set({ paint }),
  toggleHeadlights: () => set((s) => ({ headlightsOn: !s.headlightsOn })),
  // Changing section always releases a hotspot close-up.
  setActiveSection: (activeSection) =>
    set((s) => (s.activeSection === activeSection ? s : { activeSection, focusedHotspot: null })),
  setFocusedHotspot: (focusedHotspot) => set({ focusedHotspot }),
  finishIntro: () => set({ introDone: true }),
  sceneReady: false,
  markSceneReady: () => set({ sceneReady: true }),
  sceneFailed: false,
  failScene: () => set({ sceneFailed: true }),
  soundOn: false,
  cursorHint: 'none',
  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
  setCursorHint: (cursorHint) => set((s) => (s.cursorHint === cursorHint ? s : { cursorHint })),
}));
