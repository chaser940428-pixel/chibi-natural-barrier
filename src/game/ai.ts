import { Board, Piece, Position, Side, GameState, AiDifficulty } from './types';
import { getLegalMoves, makeMove, isInCheck } from './engine';

// ── 棋子基礎價值 ──────────────────────────────────────────────
const PIECE_VALUE: Record<Piece['type'], number> = {
  commander: 100000,
  strategist: 900,
  navy: 500,
  cavalry: 550,
  siege: 480,
  infantry: 200,
  hero: 750,
};

const NAVY_IN_TRENCH_BONUS = 250;

function posBonus(type: Piece['type'], row: number, col: number, side: Side): number {
  const fwdRow = side === 'red' ? row : 9 - row;
  const centerColDist = Math.abs(col - 3.5);

  switch (type) {
    case 'infantry':
    case 'hero':
      return fwdRow * 15 + (3 - Math.min(centerColDist, 3)) * 8;
    case 'cavalry':
      return (3 - Math.min(centerColDist, 3)) * 12;
    case 'navy':
      return fwdRow * 8;
    case 'siege':
      return Math.min(fwdRow, 4) * 10;
    case 'strategist':
      return (3 - Math.min(centerColDist, 3)) * 10;
    default:
      return 0;
  }
}

function evaluate(board: Board, side: Side): number {
  const opponent: Side = side === 'red' ? 'black' : 'red';
  let score = 0;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c].piece;
      if (!p) continue;

      const inTrench = r >= 3 && r <= 6;
      let val = PIECE_VALUE[p.type];
      if (p.type === 'navy' && inTrench) val += NAVY_IN_TRENCH_BONUS;
      val += posBonus(p.type, r, c, p.side);

      if (p.side === side) score += val;
      else score -= val;
    }
  }

  if (isInCheck(board, opponent)) score += 80;
  if (isInCheck(board, side)) score -= 80;

  return score;
}

function captureSortKey(board: Board, m: { from: Position; to: Position }): number {
  const victim = board[m.to.row][m.to.col].piece;
  const attacker = board[m.from.row][m.from.col].piece;
  if (!victim || !attacker) return 0;
  const v = PIECE_VALUE[victim.type];
  const a = PIECE_VALUE[attacker.type];
  return v * 100 - a;
}

function sortMovesForSearch(board: Board, moves: { from: Position; to: Position }[]): { from: Position; to: Position }[] {
  return [...moves].sort((a, b) => captureSortKey(board, b) - captureSortKey(board, a));
}

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiSide: Side,
): number {
  const board = state.board;

  if (depth === 0) return evaluate(board, aiSide);

  const currentSide: Side = maximizing ? aiSide : (aiSide === 'red' ? 'black' : 'red');
  const moves = sortMovesForSearch(board, getAllMoves(board, currentSide));

  if (moves.length === 0) {
    return maximizing ? -90000 : 90000;
  }

  if (maximizing) {
    let best = -Infinity;
    for (const { from, to } of moves) {
      const next = makeMove(state, from, to);
      if (next.gameOver) {
        if (next.gameOver === aiSide) return 100000 + depth * 100;
        if (next.gameOver === 'draw') {
          best = Math.max(best, 0);
          continue;
        }
        return -100000;
      }
      const val = minimax(next, depth - 1, alpha, beta, false, aiSide);
      best = Math.max(best, val);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const { from, to } of moves) {
      const next = makeMove(state, from, to);
      if (next.gameOver) {
        if (next.gameOver === aiSide) return 100000 + depth * 100;
        if (next.gameOver === 'draw') {
          best = Math.min(best, 0);
          continue;
        }
        return -100000;
      }
      const val = minimax(next, depth - 1, alpha, beta, true, aiSide);
      best = Math.min(best, val);
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getAllMoves(board: Board, side: Side): { from: Position; to: Position }[] {
  const result: { from: Position; to: Position }[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c].piece;
      if (!p || p.side !== side) continue;
      const from: Position = { row: r, col: c };
      const targets = getLegalMoves(board, from);
      for (const to of targets) result.push({ from, to });
    }
  }
  return result;
}

function greedyScore(state: GameState, from: Position, to: Position, aiSide: Side): number {
  const next = makeMove(state, from, to);
  return evaluate(next.board, aiSide);
}

/** 棘手：淺層 minimax（約 3 層），搭配吃子排序剪枝，維持流暢。 */
const HARD_SEARCH_DEPTH = 2;

export function getAiMove(
  state: GameState,
  difficulty: AiDifficulty,
): { from: Position; to: Position } | null {
  const aiSide = state.currentTurn;
  const moves = getAllMoves(state.board, aiSide);
  if (moves.length === 0) return null;

  switch (difficulty) {
    case 'easy': {
      return moves[Math.floor(Math.random() * moves.length)];
    }

    case 'medium': {
      const scored = moves.map(m => ({
        ...m,
        score: greedyScore(state, m.from, m.to, aiSide) + Math.random() * 30,
      }));
      scored.sort((a, b) => b.score - a.score);
      const topK = scored.slice(0, Math.min(3, scored.length));
      return topK[Math.floor(Math.random() * topK.length)];
    }

    case 'hard': {
      const ordered = sortMovesForSearch(state.board, moves);
      let bestMove = ordered[0];
      let bestScore = -Infinity;
      for (const move of ordered) {
        const next = makeMove(state, move.from, move.to);
        if (next.gameOver === aiSide) return move;
        const score = minimax(next, HARD_SEARCH_DEPTH, -Infinity, Infinity, false, aiSide);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      return bestMove;
    }
  }
}
