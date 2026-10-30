/**
 * A synthesised V12, built from Web Audio nodes (no recording is used or implied).
 *
 * A four-stroke V12 fires 6 times per crank revolution, so the firing frequency is rpm / 60 × 6
 * (100 Hz at a 1,000 rpm idle). The voice is a sawtooth at that frequency plus a sub-octave,
 * band-passed noise for intake rasp, a soft-clip waveshaper for grit, a low-pass that opens with
 * revs, and a crank-rate tremolo that gives the idle its burble.
 */

const FIRINGS_PER_REV = 6;
const MASTER_VOLUME = 0.22;
const SMOOTHING = 0.06; // seconds, setTargetAtTime time constant

function softClipCurve(amount: number): Float32Array {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export class EngineSound {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly firing: OscillatorNode;
  private readonly sub: OscillatorNode;
  private readonly tremolo: OscillatorNode;
  private readonly tremoloDepth: GainNode;
  private readonly lowpass: BiquadFilterNode;
  private readonly rasp: BiquadFilterNode;

  constructor() {
    const ctx = new AudioContext();
    this.ctx = ctx;

    this.master = new GainNode(ctx, { gain: 0 });
    this.lowpass = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 600, Q: 0.9 });
    const shaper = new WaveShaperNode(ctx, { curve: softClipCurve(2.4), oversample: '2x' });
    // Tremolo: a gain node whose gain is wobbled at crank frequency.
    const body = new GainNode(ctx, { gain: 0.75 });
    this.tremoloDepth = new GainNode(ctx, { gain: 0.25 });
    this.tremolo = new OscillatorNode(ctx, { type: 'sine', frequency: 1000 / 60 });
    this.tremolo.connect(this.tremoloDepth).connect(body.gain);

    this.firing = new OscillatorNode(ctx, { type: 'sawtooth', frequency: 100 });
    this.sub = new OscillatorNode(ctx, { type: 'triangle', frequency: 50 });
    const firingGain = new GainNode(ctx, { gain: 0.5 });
    const subGain = new GainNode(ctx, { gain: 0.55 });
    this.firing.connect(firingGain).connect(shaper);
    this.sub.connect(subGain).connect(shaper);

    const noise = new AudioBufferSourceNode(ctx, { buffer: noiseBuffer(ctx), loop: true });
    this.rasp = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 300, Q: 0.8 });
    const raspGain = new GainNode(ctx, { gain: 0.12 });
    noise.connect(this.rasp).connect(raspGain).connect(shaper);

    shaper.connect(body).connect(this.lowpass).connect(this.master).connect(ctx.destination);

    for (const source of [this.firing, this.sub, this.tremolo, noise]) source.start();
  }

  /** Follows engine speed; frequencies glide rather than step. */
  setRpm(rpm: number): void {
    const t = this.ctx.currentTime;
    const firing = (rpm / 60) * FIRINGS_PER_REV;
    this.firing.frequency.setTargetAtTime(firing, t, SMOOTHING);
    this.sub.frequency.setTargetAtTime(firing / 2, t, SMOOTHING);
    this.tremolo.frequency.setTargetAtTime(rpm / 60, t, SMOOTHING);
    // The burble fades as revs rise; the filter and rasp open up.
    this.tremoloDepth.gain.setTargetAtTime(Math.max(0.04, 0.25 - rpm / 40000), t, SMOOTHING);
    this.lowpass.frequency.setTargetAtTime(450 + rpm * 0.32, t, SMOOTHING);
    this.rasp.frequency.setTargetAtTime(firing * 3, t, SMOOTHING);
  }

  async start(): Promise<void> {
    await this.ctx.resume();
    this.master.gain.setTargetAtTime(MASTER_VOLUME, this.ctx.currentTime, 0.25);
  }

  /** Fades out, then suspends the context so it costs nothing while off. */
  stop(): void {
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    window.setTimeout(() => {
      if (this.master.gain.value < 0.01) void this.ctx.suspend();
    }, 900);
  }

  suspend(): void {
    void this.ctx.suspend();
  }

  resume(): void {
    void this.ctx.resume();
  }
}
