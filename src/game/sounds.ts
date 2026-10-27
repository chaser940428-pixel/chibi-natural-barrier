// Local CC0 sound assets. See public/sounds/CREDITS.md.
const clips = {
  move: { file: 'move.wav', volume: 0.45 },
  water: { file: 'water.wav', volume: 0.35 },
  capture: { file: 'capture.wav', volume: 0.5 },
  check: { file: 'check.wav', volume: 0.3 },
  promotion: { file: 'promotion.wav', volume: 0.35 },
  victory: { file: 'victory.wav', volume: 0.4 },
  defeat: { file: 'defeat.wav', volume: 0.35 },
  draw: { file: 'draw.wav', volume: 0.35 },
} as const;
type Clip = keyof typeof clips;
export type GameOverSound = 'victory' | 'defeat' | 'draw';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
const buffers = new Map<Clip, Promise<AudioBuffer>>();
const activeSources = new Set<AudioBufferSourceNode>();
let playbackGeneration = 0;
const MUTE_KEY = 'chibi-sound-muted';
let muted = false;
try {
  muted = typeof window !== 'undefined' && window.localStorage.getItem(MUTE_KEY) === 'true';
} catch { /* Storage may be disabled. Keep the in-memory preference. */ }

export function isSoundMuted() {
  return muted;
}

function loadClip(clip: Clip): Promise<AudioBuffer> {
  const cached = buffers.get(clip);
  if (cached) return cached;
  const context = audioCtx;
  if (!context) return Promise.reject(new Error('Audio is unavailable'));
  const pending = fetch(`${import.meta.env.BASE_URL}sounds/${clips[clip].file}`)
    .then(response => {
      if (!response.ok) throw new Error(`Unable to load ${clip}`);
      return response.arrayBuffer();
    })
    .then(data => context.decodeAudioData(data))
    .catch(error => {
      buffers.delete(clip); // Retry on a later interaction after a transient failure.
      throw error;
    });
  buffers.set(clip, pending);
  return pending;
}

/** Call from a user gesture; preload while the title screen is transitioning. */
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
    for (const clip of Object.keys(clips) as Clip[]) void loadClip(clip).catch(() => {});
  } catch { /* An unavailable audio device must not prevent play. */ }
}

export function stopAllSounds() {
  playbackGeneration++;
  for (const source of activeSources) source.stop();
  activeSources.clear();
}

export function setSoundMuted(next: boolean) {
  muted = next;
  try {
    window.localStorage.setItem(MUTE_KEY, String(next));
  } catch { /* Storage may be disabled. */ }
  if (masterGain && audioCtx) masterGain.gain.setValueAtTime(next ? 0 : 1, audioCtx.currentTime);
  if (next) stopAllSounds();
  else unlockAudio();
}

function playClip(clip: Clip) {
  if (muted) return;
  unlockAudio();
  if (!audioCtx || !masterGain) return;
  const context = audioCtx;
  const output = masterGain;
  const generation = playbackGeneration;
  void loadClip(clip).then(buffer => {
    // A clip finishing its download after mute/reset must not play late.
    if (muted || generation !== playbackGeneration || context.state === 'closed') return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = clips[clip].volume;
    source.connect(gain);
    gain.connect(output);
    activeSources.add(source);
    source.onended = () => {
      activeSources.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start();
  }).catch(() => { /* Missing/blocked audio must not interrupt the game. */ });
}

export function playWoodImpact() { playClip('move'); }
export function playWaterSplash() { playClip('water'); }
export function playCheckAlert() { playClip('check'); }
export function playCapture() { playClip('capture'); }
export function playPromotion() { playClip('promotion'); }
export function playGameOver(outcome: GameOverSound = 'victory') {
  stopAllSounds();
  playClip(outcome);
}
