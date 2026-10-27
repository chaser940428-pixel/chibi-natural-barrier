// Synthesized effects: no recordings or external sound assets.
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
const activeSources = new Set<AudioScheduledSourceNode>();
const MUTE_KEY = 'chibi-sound-muted';
let muted = false;
try {
  muted = typeof window !== 'undefined' && window.localStorage.getItem(MUTE_KEY) === 'true';
} catch { /* Storage may be disabled. Keep the in-memory preference. */ }

export function isSoundMuted() {
  return muted;
}

/** Call from a user gesture so browsers can enable audio before the AI moves. */
export function unlockAudio() {
  if (muted || typeof window === 'undefined') return;
  try {
    if (!audioCtx) {
      const Context = window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      audioCtx = new Context();
      masterGain = audioCtx.createGain();
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume().catch(() => {});
  } catch { /* An unavailable audio device must not prevent play. */ }
}

export function setSoundMuted(next: boolean) {
  muted = next;
  try {
    window.localStorage.setItem(MUTE_KEY, String(next));
  } catch { /* Storage may be disabled. */ }
  if (masterGain && audioCtx) masterGain.gain.setValueAtTime(next ? 0 : 1, audioCtx.currentTime);
  if (next) {
    for (const source of activeSources) source.stop();
    activeSources.clear();
  } else {
    unlockAudio();
  }
}

function track(source: AudioScheduledSourceNode) {
  activeSources.add(source);
  source.onended = () => {
    activeSources.delete(source);
    source.disconnect();
  };
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15, delay = 0) {
  if (muted) return;
  unlockAudio();
  if (!audioCtx || !masterGain) return;
  const start = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  track(osc);
  osc.start(start);
  osc.stop(start + duration);
}

function playNoise(duration: number, volume = 0.1) {
  if (muted) return;
  unlockAudio();
  if (!audioCtx || !masterGain) return;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(masterGain);
  track(source);
  source.start();
}

export function playWoodImpact() {
  playTone(200, 0.12, 'square', 0.12);
  playTone(120, 0.08, 'triangle', 0.08);
}

export function playWaterSplash() {
  playNoise(0.3, 0.08);
  playTone(400, 0.15, 'sine', 0.05);
}

export function playCheckAlert() {
  playTone(880, 0.15, 'square', 0.15);
  playTone(660, 0.2, 'square', 0.12, 0.16);
}

export function playCapture() {
  playTone(300, 0.1, 'sawtooth', 0.1);
  playTone(150, 0.15, 'triangle', 0.08);
}

export function playPromotion() {
  playTone(523, 0.12, 'sine', 0.12);
  playTone(659, 0.12, 'sine', 0.12, 0.12);
  playTone(784, 0.2, 'sine', 0.15, 0.24);
}

export function playGameOver() {
  playTone(523, 0.2, 'sine', 0.15);
  playTone(659, 0.2, 'sine', 0.15, 0.2);
  playTone(784, 0.3, 'sine', 0.2, 0.4);
  playTone(1047, 0.4, 'sine', 0.2, 0.6);
}
