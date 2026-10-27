import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GameBoard } from './GameBoard';
import * as sounds from '@/game/sounds';

vi.mock('@/game/sounds', () => ({
  isSoundMuted: () => false,
  setSoundMuted: vi.fn(),
  playWoodImpact: vi.fn(),
  playWaterSplash: vi.fn(),
  playCheckAlert: vi.fn(),
  playCapture: vi.fn(),
  playPromotion: vi.fn(),
  playGameOver: vi.fn(),
  stopAllSounds: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe('board interactions', () => {
  it('renders 80 interactive squares and never replays a move sound on undo', () => {
    const { container } = render(<GameBoard options={{ mode: 'pvp' }} />);
    const cells = container.querySelectorAll('.board-rows .cursor-pointer');
    expect(cells).toHaveLength(80);
    fireEvent.click(cells[64]); // A2, red infantry
    fireEvent.click(cells[56]); // A3, land
    expect(sounds.playWoodImpact).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '悔棋' }));
    expect(sounds.playWoodImpact).toHaveBeenCalledTimes(1);
    expect(screen.getByText('靜候軍令')).toBeInTheDocument();
  });

  it('exposes the mute state and updates the sound system', () => {
    render(<GameBoard options={{ mode: 'pvp' }} />);
    const button = screen.getByRole('button', { name: '靜音' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveTextContent('音效已關');
    expect(sounds.setSoundMuted).toHaveBeenLastCalledWith(true);
    fireEvent.click(button);
    expect(sounds.setSoundMuted).toHaveBeenLastCalledWith(false);
  });

  it('plays the ending sound even if the first player surrenders before moving', () => {
    render(<GameBoard options={{ mode: 'pvp' }} />);
    fireEvent.click(screen.getByRole('button', { name: '投誠' }));
    fireEvent.click(screen.getByRole('button', { name: '解甲投誠' }));
    expect(sounds.playGameOver).toHaveBeenCalledTimes(1);
    expect(sounds.playWoodImpact).not.toHaveBeenCalled();
    expect(sounds.playGameOver).toHaveBeenCalledWith('victory');
  });

  it('uses the defeat cue when a human player surrenders in PvE', () => {
    render(<GameBoard options={{ mode: 'pve', humanSide: 'red', aiDifficulty: 'easy' }} />);
    fireEvent.click(screen.getByRole('button', { name: '投誠' }));
    fireEvent.click(screen.getByRole('button', { name: '解甲投誠' }));
    expect(sounds.playGameOver).toHaveBeenCalledWith('defeat');
  });

  it('stops active or pending sounds when resetting or leaving the board', () => {
    const { unmount } = render(<GameBoard options={{ mode: 'pvp' }} />);
    fireEvent.click(screen.getByRole('button', { name: '重整' }));
    expect(sounds.stopAllSounds).toHaveBeenCalledOnce();
    unmount();
    expect(sounds.stopAllSounds).toHaveBeenCalledTimes(2);
  });
});
