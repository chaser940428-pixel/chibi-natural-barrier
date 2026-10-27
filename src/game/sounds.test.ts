import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sources: { buffer?: { id: string }; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
const resume = vi.fn(() => Promise.resolve());
const createContext = vi.fn();
const decode = vi.fn(async (data: ArrayBuffer) => ({ id: new TextDecoder().decode(data) }));
const request = vi.fn();

class FakeAudioContext {
  state = 'suspended';
  destination = {};
  currentTime = 0;
  resume = resume;
  decodeAudioData = decode;
  constructor() { createContext(); }
  createGain() {
    return { gain: { setValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
  }
  createBufferSource() {
    const source = { buffer: undefined, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    sources.push(source);
    return source;
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  sources.length = 0;
  localStorage.clear();
  request.mockImplementation(async (url: string) => ({
    ok: true, arrayBuffer: async () => new TextEncoder().encode(url).buffer,
  }));
  vi.stubGlobal('fetch', request);
  vi.stubGlobal('AudioContext', FakeAudioContext);
});
afterEach(() => vi.unstubAllGlobals());

describe('licensed audio assets', () => {
  it('ships eight short, nonempty PCM WAV files with no clipping', () => {
    for (const clip of ['move', 'water', 'capture', 'check', 'promotion', 'victory', 'defeat', 'draw']) {
      const data = readFileSync(resolve('public', 'sounds', `${clip}.wav`));
      expect(data.toString('ascii', 0, 4)).toBe('RIFF');
      expect(data.toString('ascii', 8, 12)).toBe('WAVE');
      expect(data.readUInt16LE(20)).toBe(1); // PCM
      expect(data.readUInt16LE(22)).toBe(1); // mono
      expect(data.readUInt32LE(24)).toBe(22050);
      expect(data.readUInt16LE(34)).toBe(16);
      const length = data.readUInt32LE(40);
      expect(length).toBeGreaterThan(2000);
      expect(length).toBeLessThan(22050 * 2 * 3);
      let peak = 0;
      for (let i = 44; i < data.length; i += 2) peak = Math.max(peak, Math.abs(data.readInt16LE(i)));
      expect(peak).toBeGreaterThan(1000);
      expect(peak).toBeLessThan(32767);
    }
  });
});

describe('sample sound controls', () => {
  it('loads and decodes each clip once after activation, using the deployment base URL', async () => {
    const sounds = await import('./sounds');
    expect(createContext).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
    sounds.unlockAudio();
    await vi.waitFor(() => expect(decode).toHaveBeenCalledTimes(8));
    expect(resume).toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}sounds/move.wav`);
    sounds.playWoodImpact();
    sounds.playWoodImpact();
    await vi.waitFor(() => expect(sources).toHaveLength(2));
    expect(request).toHaveBeenCalledTimes(8);
    expect(sources[0].buffer?.id).toContain('move.wav');
  });

  it('stops active sound immediately on mute and remembers the setting', async () => {
    const sounds = await import('./sounds');
    sounds.playGameOver();
    await vi.waitFor(() => expect(sources).toHaveLength(1));
    sounds.setSoundMuted(true);
    expect(sources[0].stop).toHaveBeenCalledOnce();
    sounds.playCapture();
    expect(sources).toHaveLength(1);
    expect(localStorage.getItem('chibi-sound-muted')).toBe('true');
    vi.resetModules();
    expect((await import('./sounds')).isSoundMuted()).toBe(true);
  });

  it.each(['mute', 'reset'] as const)('never plays an in-flight download after %s', async action => {
    let finish: (value: { ok: boolean; arrayBuffer: () => Promise<ArrayBuffer> }) => void;
    const response = new Promise(resolve => { finish = resolve; });
    request.mockReturnValue(response);
    const sounds = await import('./sounds');
    sounds.playWoodImpact();
    if (action === 'mute') {
      sounds.setSoundMuted(true);
      sounds.setSoundMuted(false);
    } else sounds.stopAllSounds();
    finish!({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
    await vi.waitFor(() => expect(decode).toHaveBeenCalledTimes(8));
    expect(sources).toHaveLength(0);
  });

  it('uses distinct clips for victory, defeat and draw', async () => {
    const sounds = await import('./sounds');
    for (const result of ['victory', 'defeat', 'draw'] as const) {
      sounds.playGameOver(result);
      await vi.waitFor(() => expect(sources.at(-1)?.buffer?.id).toContain(`${result}.wav`));
    }
    expect(sources[0].stop).toHaveBeenCalledOnce();
  });

  it('handles download failures and retries instead of interrupting play', async () => {
    request.mockResolvedValue({ ok: false });
    const sounds = await import('./sounds');
    sounds.playWoodImpact();
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(8));
    await new Promise(resolve => setTimeout(resolve, 0));
    request.mockImplementation(async (url: string) => ({
      ok: true, arrayBuffer: async () => new TextEncoder().encode(url).buffer,
    }));
    sounds.playWoodImpact();
    await vi.waitFor(() => expect(sources).toHaveLength(1));
  });

  it('does not prevent play in browsers without Web Audio', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const sounds = await import('./sounds');
    expect(() => {
      sounds.unlockAudio();
      sounds.playWaterSplash();
      sounds.playGameOver();
    }).not.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});
