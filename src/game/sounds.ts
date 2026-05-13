// Placeholder sound system using Web Audio API
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration: number, volume = 0.1) {
  if (!audioCtx) return;
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
  gain.connect(audioCtx.destination);
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
  setTimeout(() => playTone(660, 0.2, 'square', 0.12), 160);
}

export function playCapture() {
  playTone(300, 0.1, 'sawtooth', 0.1);
  playTone(150, 0.15, 'triangle', 0.08);
}

export function playPromotion() {
  playTone(523, 0.12, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.12, 'sine', 0.12), 120);
  setTimeout(() => playTone(784, 0.2, 'sine', 0.15), 240);
}

export function playGameOver() {
  playTone(523, 0.2, 'sine', 0.15);
  setTimeout(() => playTone(659, 0.2, 'sine', 0.15), 200);
  setTimeout(() => playTone(784, 0.3, 'sine', 0.2), 400);
  setTimeout(() => playTone(1047, 0.4, 'sine', 0.2), 600);
}
