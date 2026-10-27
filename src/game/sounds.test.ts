import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const sources: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
const resume = vi.fn(() => Promise.resolve());
const createContext = vi.fn();

class FakeAudioContext {
  state = 'suspended';
  currentTime = 10;
  sampleRate = 1000;
  destination = {};
  resume = resume;
  constructor() { createContext(); }
  createGain() {
    return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
  }
  createOscillator() {
    const source = { frequency: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    sources.push(source);
    return source;
  }
  createBufferSource() { return this.createOscillator(); }
  createBuffer(_channels: number, size: number) { return { getChannelData: () => new Float32Array(size) }; }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  sources.length = 0;
  localStorage.clear();
  vi.stubGlobal('AudioContext', FakeAudioContext);
});

afterEach(() => vi.unstubAllGlobals());

describe('synthesized sound controls', () => {
  it('waits for activation before creating the audio context and resumes suspended audio', async () => {
    const sounds = await import('./sounds');
    expect(createContext).not.toHaveBeenCalled();
    sounds.unlockAudio();
    expect(createContext).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalled();
  });

  it('stops active and scheduled notes immediately on mute and remembers the setting', async () => {
    const sounds = await import('./sounds');
    sounds.playGameOver();
    expect(sources).toHaveLength(4);
    expect(sources[3].start).toHaveBeenCalledWith(10.6);
    sounds.setSoundMuted(true);
    for (const source of sources) expect(source.stop).toHaveBeenCalledTimes(2);
    sounds.playCapture();
    sounds.playWaterSplash();
    expect(sources).toHaveLength(4);
    expect(localStorage.getItem('chibi-sound-muted')).toBe('true');
    vi.resetModules();
    expect((await import('./sounds')).isSoundMuted()).toBe(true);
  });

  it('can enable sound again without replaying scheduled notes', async () => {
    const sounds = await import('./sounds');
    sounds.setSoundMuted(true);
    sounds.playPromotion();
    expect(sources).toHaveLength(0);
    sounds.setSoundMuted(false);
    sounds.playWoodImpact();
    expect(sources).toHaveLength(2);
    expect(sounds.isSoundMuted()).toBe(false);
  });

  it('does not prevent play in browsers without Web Audio', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const sounds = await import('./sounds');
    expect(() => {
      sounds.unlockAudio();
      sounds.playWaterSplash();
      sounds.playGameOver();
    }).not.toThrow();
  });
});
