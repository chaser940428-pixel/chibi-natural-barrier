import { describe, expect, it } from 'vitest';
import { createInitialState, getLegalMoves, isInCheck, makeMove, undoMove } from './engine';
import type { GameState, PieceType, Side } from './types';

function position(): GameState {
  const state = createInitialState();
  state.board = Array.from({ length: 10 }, () => Array.from({ length: 8 }, () => ({ piece: null })));
  put(state, 0, 0, 'commander', 'red');
  put(state, 9, 7, 'commander', 'black');
  return state;
}

function put(state: GameState, row: number, col: number, type: PieceType, side: Side) {
  state.board[row][col].piece = { type, side, hasMoved: true };
}

describe('game rules', () => {
  it('starts with 32 pieces on an 8 by 10 board and allows the infantry double step', () => {
    const state = createInitialState();
    expect(state.board).toHaveLength(10);
    expect(state.board.every(row => row.length === 8)).toBe(true);
    expect(state.board.flat().filter(cell => cell.piece)).toHaveLength(32);
    expect(getLegalMoves(state.board, { row: 1, col: 0 })).toEqual([
      { row: 2, col: 0 }, { row: 3, col: 0 },
    ]);
  });

  it.each(['red', 'black'] as const)('records a %s hero leap over either side', side => {
    for (const screenSide of ['red', 'black'] as const) {
      const state = position();
      state.currentTurn = side;
      put(state, 4, 2, 'hero', side);
      put(state, 4, 3, 'infantry', screenSide);
      put(state, 4, 4, 'cavalry', side === 'red' ? 'black' : 'red');
      expect(getLegalMoves(state.board, { row: 4, col: 2 })).toContainEqual({ row: 4, col: 4 });
      const next = makeMove(state, { row: 4, col: 2 }, { row: 4, col: 4 });
      expect(next.moveHistory.at(-1)?.stateTags).toContain('躍擊');
      expect(state.board[4][2].piece?.type).toBe('hero');
    }
  });

  it('does not call an unobstructed two-square capture a leap', () => {
    const state = position();
    put(state, 4, 2, 'hero', 'red');
    put(state, 6, 4, 'cavalry', 'black');
    const next = makeMove(state, { row: 4, col: 2 }, { row: 6, col: 4 });
    expect(next.moveHistory.at(-1)?.stateTags).not.toContain('躍擊');
  });

  it('forbids a hero from jumping to an empty square', () => {
    const state = position();
    put(state, 4, 2, 'hero', 'red');
    put(state, 4, 3, 'infantry', 'red');
    expect(getLegalMoves(state.board, { row: 4, col: 2 })).not.toContainEqual({ row: 4, col: 4 });
  });

  it('restores the board, capture lists and repetition history when undoing a capture', () => {
    const state = position();
    put(state, 4, 2, 'hero', 'red');
    put(state, 4, 3, 'infantry', 'red');
    put(state, 4, 4, 'cavalry', 'black');
    const next = makeMove(state, { row: 4, col: 2 }, { row: 4, col: 4 });
    expect(next.capturedBlack).toHaveLength(1);
    const restored = undoMove(next)!;
    expect(restored.board).toEqual(state.board);
    expect(restored.capturedBlack).toEqual([]);
    expect(restored.moveHistory).toEqual([]);
    expect(restored.positionHashes).toEqual(state.positionHashes);
  });

  it('permanently unlocks infantry lateral movement at the enemy river line', () => {
    const state = position();
    put(state, 4, 2, 'infantry', 'red');
    const next = makeMove(state, { row: 4, col: 2 }, { row: 5, col: 2 });
    expect(next.board[5][2].piece?.horizontalUnlocked).toBe(true);
    expect(next.moveHistory.at(-1)?.stateTags).toContain('橫江');
    expect(getLegalMoves(next.board, { row: 5, col: 2 })).toContainEqual({ row: 5, col: 1 });
  });

  it('promotes infantry on the enemy baseline', () => {
    const state = position();
    put(state, 8, 2, 'infantry', 'red');
    const next = makeMove(state, { row: 8, col: 2 }, { row: 9, col: 2 });
    expect(next.board[9][2].piece?.type).toBe('hero');
    expect(next.moveHistory.at(-1)?.stateTags).toContain('晉位: [ 豪 ]');
  });

  it('treats stalemate as a loss for the side with no legal moves', () => {
    const state = position();
    put(state, 7, 6, 'strategist', 'red');
    put(state, 8, 5, 'strategist', 'red');
    put(state, 1, 2, 'cavalry', 'red');
    expect(isInCheck(state.board, 'black')).toBe(false);
    const next = makeMove(state, { row: 1, col: 2 }, { row: 3, col: 3 });
    expect(next.gameOver).toBe('red');
    expect(next.moveHistory.at(-1)?.threatTag).toBe('困斃');
  });

  it('recognizes checkmate without capturing the commander', () => {
    const state = position();
    put(state, 7, 6, 'strategist', 'red');
    put(state, 7, 5, 'strategist', 'red');
    expect(getLegalMoves(state.board, { row: 7, col: 5 })).toContainEqual({ row: 8, col: 6 });
    const next = makeMove(state, { row: 7, col: 5 }, { row: 8, col: 6 });
    expect(next.gameOver).toBe('red');
    expect(next.moveHistory.at(-1)?.threatTag).toBe('絕殺');
    expect(next.board[9][7].piece?.type).toBe('commander');
  });

  it('draws when only commanders remain', () => {
    const state = position();
    const next = makeMove(state, { row: 0, col: 0 }, { row: 0, col: 1 });
    expect(next.gameOver).toBe('draw');
    expect(next.moveHistory.at(-1)?.threatTag).toBe('死局');
  });

  it('draws on the third occurrence of the same position', () => {
    let state = createInitialState();
    const cycle = [
      [{ row: 0, col: 1 }, { row: 2, col: 2 }],
      [{ row: 9, col: 1 }, { row: 7, col: 2 }],
      [{ row: 2, col: 2 }, { row: 0, col: 1 }],
      [{ row: 7, col: 2 }, { row: 9, col: 1 }],
    ];
    for (let round = 0; round < 2; round++) {
      for (const [from, to] of cycle) {
        expect(getLegalMoves(state.board, from)).toContainEqual(to);
        state = makeMove(state, from, to);
      }
    }
    expect(state.gameOver).toBe('draw');
    expect(state.moveHistory.at(-1)?.threatTag).toBe('重複');
  });
});
