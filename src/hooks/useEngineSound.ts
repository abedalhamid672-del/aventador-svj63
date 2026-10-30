import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';
import { useExperience } from '../app/store';
import { EngineSound } from '../audio/engineSound';
import { ENGINE } from '../data/specs';
import { rig } from '../scene/rig';

/** Extra rpm at full scroll speed. */
const SCROLL_RPM = 5200;

/**
 * Plays the synthesised V12 while the visitor has sound on. The AudioContext is created on the
 * first toggle (a user gesture, as browsers require) and suspended whenever sound is off or the
 * tab is hidden. Revs follow scroll speed, and climb with the speedometer through Performance.
 */
export function useEngineSound(): void {
  const soundOn = useExperience((s) => s.soundOn);
  const engine = useRef<EngineSound | null>(null);

  useEffect(() => {
    if (!soundOn) {
      engine.current?.stop();
      return;
    }
    engine.current ??= new EngineSound();
    const sound = engine.current;
    void sound.start();

    const rpm = { value: ENGINE.idleRpm };
    const tick = () => {
      const { activeSection } = useExperience.getState();
      const cruising = ENGINE.idleRpm + Math.abs(rig.scrollVelocity) * SCROLL_RPM;
      const pulling = activeSection === 'performance' ? 1500 + rig.performanceProgress * (ENGINE.redlineRpm - 1500) : 0;
      const target = Math.min(ENGINE.redlineRpm, Math.max(cruising, pulling));
      rpm.value += (target - rpm.value) * 0.1;
      sound.setRpm(rpm.value);
    };
    gsap.ticker.add(tick);

    const onVisibility = () => (document.hidden ? sound.suspend() : sound.resume());
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      gsap.ticker.remove(tick);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [soundOn]);
}
