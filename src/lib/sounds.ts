let audioContext: AudioContext | null = null;
let masterNode: AudioNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let sounding: { env: GainNode; source: AudioBufferSourceNode } | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
}

function master(ac: AudioContext) {
  if (masterNode) return masterNode;
  const limiter = ac.createDynamicsCompressor();
  limiter.threshold.value = -24;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.08;

  const trim = ac.createGain();
  trim.gain.value = 0.55;
  limiter.connect(trim).connect(ac.destination);

  masterNode = limiter;
  return masterNode;
}

function noise(ac: AudioContext) {
  if (noiseBuffer) return noiseBuffer;
  const length = Math.floor(ac.sampleRate * 0.25);
  noiseBuffer = ac.createBuffer(1, length, ac.sampleRate);
  const samples = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) samples[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

function stopCurrentBrush(at: number) {
  if (!sounding) return;
  const { env, source } = sounding;
  env.gain.cancelScheduledValues(at);
  env.gain.setValueAtTime(env.gain.value, at);
  env.gain.linearRampToValueAtTime(0.0001, at + 0.015);
  source.stop(at + 0.02);
  sounding = null;
}

function brush(ac: AudioContext, at: number, hz: number, gain: number, seconds: number) {
  stopCurrentBrush(at);

  const source = ac.createBufferSource();
  source.buffer = noise(ac);
  source.playbackRate.value = 0.9 + Math.random() * 0.2;

  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = hz;
  filter.Q.value = 0.9;

  const env = ac.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(gain, at + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, at + seconds);

  source.connect(filter).connect(env).connect(master(ac));
  source.start(at);
  source.stop(at + seconds + 0.02);

  sounding = { env, source };
  source.onended = () => {
    if (sounding?.source === source) sounding = null;
  };
}

function thump(ac: AudioContext, at: number, hz: number, gain: number) {
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(hz, at);
  osc.frequency.exponentialRampToValueAtTime(hz * 0.6, at + 0.09);

  const env = ac.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(gain, at + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);

  osc.connect(env).connect(master(ac));
  osc.start(at);
  osc.stop(at + 0.14);
}

const spinePitch = (index: number) => 900 + ((index * 137) % 9) * 110;

export function bookPull(index: number) {
  const ac = audio();
  if (!ac) return;

  const now = ac.currentTime;
  brush(ac, now, spinePitch(index) * 0.8, 0.09, 0.14);
  thump(ac, now + 0.03, 150 - (index % 4) * 10, 0.12);
}

export function winChime() {
  const ac = audio();
  if (!ac) return;

  const now = ac.currentTime;
  const notes = [
    [523.25, 0, 0.05],
    [783.99, 0.14, 0.045],
  ] as const;

  for (const [hz, offset, gain] of notes) {
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = hz;

    const env = ac.createGain();
    env.gain.setValueAtTime(0, now + offset);
    env.gain.linearRampToValueAtTime(gain, now + offset + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.5);

    osc.connect(env).connect(master(ac));
    osc.start(now + offset);
    osc.stop(now + offset + 0.55);
  }

  brush(ac, now + 0.02, 1400, 0.03, 0.12);
}
