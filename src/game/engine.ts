import { Board, Cell, GameState, MoveRecord, Piece, Position, Side, getPieceChar, getColLabel, getRowLabel } from './types';

// --- 初始化邏輯 ---

function createPiece(type: Piece['type'], side: Side): Piece {
  return { type, side, hasMoved: false };
}

export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: 10 }, () =>
    Array.from({ length: 8 }, (): Cell => ({ piece: null }))
  );

  // Row 1 (index 0) - Red: 火 突 督 都 謀 督 突 火
  const redBack: Piece['type'][] = ['siege', 'cavalry', 'navy', 'commander', 'strategist', 'navy', 'cavalry', 'siege'];
  redBack.forEach((type, col) => {
    board[0][col].piece = createPiece(type, 'red');
  });

  // Row 2 (index 1) - Red infantry
  for (let col = 0; col < 8; col++) {
    board[1][col].piece = createPiece('infantry', 'red');
  }

  // Row 9 (index 8) - Black infantry
  for (let col = 0; col < 8; col++) {
    board[8][col].piece = createPiece('infantry', 'black');
  }

  // Row 10 (index 9) - Black: 霹 豹 尉 祭 丞 尉 豹 霹
  const blackBack: Piece['type'][] = ['siege', 'cavalry', 'navy', 'strategist', 'commander', 'navy', 'cavalry', 'siege'];
  blackBack.forEach((type, col) => {
    board[9][col].piece = createPiece(type, 'black');
  });

  return board;
}

// 【修正①】三次重複 hash：移除 hasMoved，只保留影響合法步的狀態（horizontalUnlocked）。
// hasMoved 只影響部曲首步雙格移動，納入 hash 會導致同一局面因棋子走過而產生不同 hash，
// 使重複局面無法被正確識別。
function hashBoard(board: Board, turn: Side): string {
  let h = turn;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c].piece;
      if (p) h += `${r}${c}${p.type}${p.side}${p.horizontalUnlocked ? 1 : 0}`;
    }
  }
  return h;
}

export function createInitialState(): GameState {
  const board = createInitialBoard();
  return {
    board,
    currentTurn: 'red',
    selectedPos: null,
    legalMoves: [],
    capturedRed: [],
    capturedBlack: [],
    gameOver: null,
    message: '紅方先行',
    inCheck: null,
    moveHistory: [],
    boardHistory: [],
    positionHashes: [hashBoard(board, 'red')], // 初始局面計為第 1 次出現
  };
}

// --- 輔助判定邏輯 ---

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row <= 9 && col >= 0 && col <= 7;
}

function isInTrench(row: number): boolean {
  return row >= 3 && row <= 6;
}

function forwardDir(side: Side): number {
  return side === 'red' ? 1 : -1;
}

export function cloneBoard(board: Board): Board {
  return board.map(row => row.map(cell => ({
    piece: cell.piece ? { ...cell.piece } : null,
  })));
}

function kingsAreFacing(board: Board): boolean {
  let redKingPos: Position | null = null;
  let blackKingPos: Position | null = null;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c].piece;
      if (!p) continue;
      if (p.type === 'commander' && p.side === 'red') redKingPos = { row: r, col: c };
      if (p.type === 'commander' && p.side === 'black') blackKingPos = { row: r, col: c };
    }
  }

  if (!redKingPos || !blackKingPos) return false;
  if (redKingPos.col !== blackKingPos.col) return false;

  const minR = Math.min(redKingPos.row, blackKingPos.row);
  const maxR = Math.max(redKingPos.row, blackKingPos.row);
  for (let r = minR + 1; r < maxR; r++) {
    if (board[r][redKingPos.col].piece) return false;
  }
  return true;
}

function findKing(board: Board, side: Side): Position | null {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c].piece;
      if (p && p.type === 'commander' && p.side === side) return { row: r, col: c };
    }
  }
  return null;
}

function isUnderAttack(board: Board, pos: Position, byOpponent: Side): boolean {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c].piece;
      if (!p || p.side !== byOpponent) continue;
      const rawMoves = getRawMoves(board, { row: r, col: c }, p, true);
      if (rawMoves.some(m => m.row === pos.row && m.col === pos.col)) return true;
    }
  }
  return false;
}

// --- 移動規則引擎 ---

function getRawMoves(board: Board, pos: Position, piece: Piece, captureOnly = false): Position[] {
  const { type, side } = piece;
  const candidates: Position[] = [];

  switch (type) {
    case 'commander': {
      const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
      for (const [dr, dc] of dirs) {
        const nr = pos.row + dr;
        const nc = pos.col + dc;
        if (!inBounds(nr, nc)) continue;
        if (isInTrench(nr)) continue;
        const target = board[nr][nc].piece;
        if (!target || target.side !== side) candidates.push({ row: nr, col: nc });
      }
      break;
    }
    case 'strategist': {
      const dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
      for (const [dr, dc] of dirs) {
        const nr = pos.row + dr;
        const nc = pos.col + dc;
        if (!inBounds(nr, nc)) continue;
        const target = board[nr][nc].piece;
        if (!target || target.side !== side) candidates.push({ row: nr, col: nc });
      }
      break;
    }
    case 'siege': {
      const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
      if (!captureOnly) {
        for (const [dr, dc] of dirs) {
          const nr = pos.row + dr;
          const nc = pos.col + dc;
          if (!inBounds(nr, nc)) continue;
          const target = board[nr][nc].piece;
          if (!target) candidates.push({ row: nr, col: nc });
        }
      }
      for (const [dr, dc] of dirs) {
        let screenFound = false;
        for (let s = 1; ; s++) {
          const nr = pos.row + dr * s;
          const nc = pos.col + dc * s;
          if (!inBounds(nr, nc)) break;
          const target = board[nr][nc].piece;
          if (!screenFound) {
            if (target) screenFound = true;
          } else {
            if (target) {
              if (target.side !== side) candidates.push({ row: nr, col: nc });
              break;
            }
          }
        }
      }
      break;
    }
    case 'cavalry': {
      const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [dr, dc] of offsets) {
        const nr = pos.row + dr;
        const nc = pos.col + dc;
        if (!inBounds(nr, nc)) continue;
        const target = board[nr][nc].piece;
        if (!target || target.side !== side) candidates.push({ row: nr, col: nc });
      }
      break;
    }
    case 'navy': {
      if (isInTrench(pos.row)) {
        const dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
        for (const [dr, dc] of dirs) {
          for (let s = 1; s <= 2; s++) {
            const nr = pos.row + dr * s;
            const nc = pos.col + dc * s;
            if (!inBounds(nr, nc)) break;
            const target = board[nr][nc].piece;
            if (target) {
              if (target.side !== side) candidates.push({ row: nr, col: nc });
              break;
            }
            candidates.push({ row: nr, col: nc });
          }
        }
      } else {
        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
        for (const [dr, dc] of dirs) {
          const nr = pos.row + dr;
          const nc = pos.col + dc;
          if (!inBounds(nr, nc)) continue;
          const target = board[nr][nc].piece;
          if (!target || target.side !== side) candidates.push({ row: nr, col: nc });
        }
      }
      break;
    }
    case 'infantry': {
      const fwd = forwardDir(side);
      const isUnlocked = piece.horizontalUnlocked ||
        (side === 'red' && pos.row >= 5) ||
        (side === 'black' && pos.row <= 4);

      if (!captureOnly) {
        const fwdR = pos.row + fwd;
        if (inBounds(fwdR, pos.col) && !board[fwdR][pos.col].piece) {
          candidates.push({ row: fwdR, col: pos.col });
          if (!piece.hasMoved) {
            const fwdR2 = pos.row + fwd * 2;
            if (inBounds(fwdR2, pos.col) && !board[fwdR2][pos.col].piece) {
              candidates.push({ row: fwdR2, col: pos.col });
            }
          }
        }
      }

      for (const dc of [-1, 1]) {
        const nr = pos.row + fwd;
        const nc = pos.col + dc;
        if (inBounds(nr, nc)) {
          const target = board[nr][nc].piece;
          if (target && target.side !== side) candidates.push({ row: nr, col: nc });
        }
      }

      if (isUnlocked && !captureOnly) {
        for (const dc of [-1, 1]) {
          const nc = pos.col + dc;
          if (inBounds(pos.row, nc)) {
            const target = board[pos.row][nc].piece;
            if (!target) candidates.push({ row: pos.row, col: nc });
          }
        }
      }
      break;
    }
    case 'hero': {
      const dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
      for (const [dr, dc] of dirs) {
        const nr1 = pos.row + dr;
        const nc1 = pos.col + dc;
        if (!inBounds(nr1, nc1)) continue;
        const t1 = board[nr1][nc1].piece;
        if (!t1) {
          candidates.push({ row: nr1, col: nc1 });
        } else if (t1.side !== side) {
          candidates.push({ row: nr1, col: nc1 });
        }
        const nr2 = pos.row + dr * 2;
        const nc2 = pos.col + dc * 2;
        if (!inBounds(nr2, nc2)) continue;
        const t2 = board[nr2][nc2].piece;
        if (!t1) {
          if (!t2 || t2.side !== side) candidates.push({ row: nr2, col: nc2 });
        } else {
          if (t2 && t2.side !== side) candidates.push({ row: nr2, col: nc2 });
        }
      }
      break;
    }
  }

  return candidates;
}

export function getLegalMoves(board: Board, pos: Position): Position[] {
  const piece = board[pos.row][pos.col].piece;
  if (!piece) return [];

  const candidates = getRawMoves(board, pos, piece);

  return candidates.filter(target => {
    const testBoard = cloneBoard(board);
    testBoard[target.row][target.col].piece = { ...piece, hasMoved: true };
    testBoard[pos.row][pos.col].piece = null;
    if (kingsAreFacing(testBoard)) return false;
    const kingPos = findKing(testBoard, piece.side);
    if (!kingPos) return false;
    const opponent: Side = piece.side === 'red' ? 'black' : 'red';
    if (isUnderAttack(testBoard, kingPos, opponent)) return false;
    return true;
  });
}

export function isInCheck(board: Board, side: Side): boolean {
  const kingPos = findKing(board, side);
  if (!kingPos) return false;
  const opponent: Side = side === 'red' ? 'black' : 'red';
  return isUnderAttack(board, kingPos, opponent);
}

function hasAnyLegalMoves(board: Board, side: Side): boolean {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c].piece;
      if (!p || p.side !== side) continue;
      const moves = getLegalMoves(board, { row: r, col: c });
      if (moves.length > 0) return true;
    }
  }
  return false;
}

function findSiegePivot(board: Board, from: Position, to: Position): { coord: string; friendly: boolean } | null {
  const dr = Math.sign(to.row - from.row);
  const dc = Math.sign(to.col - from.col);
  if (dr !== 0 && dc !== 0) return null;

  const piece = board[from.row][from.col].piece;
  if (!piece) return null;

  for (let s = 1; ; s++) {
    const r = from.row + dr * s;
    const c = from.col + dc * s;
    if (r === to.row && c === to.col) break;
    const p = board[r][c].piece;
    if (p) {
      const coord = `${getColLabel(c)}${getRowLabel(r)}`;
      return { coord, friendly: p.side === piece.side };
    }
  }
  return null;
}

// 【修正②】死局判定：
// 規則定義死局為雙方皆無法達成將死條件，實作為以下兩種情況：
//   (a) 雙方各剩統帥（共 2 枚棋子）
//   (b) 一方統帥 + 單攻械，對方僅統帥——攻械無法單獨逼死統帥
function isDeadPosition(board: Board): boolean {
  const allPieces: Piece[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c].piece;
      if (p) allPieces.push(p);
    }
  }

  // (a) 僅剩雙方統帥
  if (allPieces.length === 2) return true;

  // (b) 統帥 + 單攻械 vs 統帥（共 3 枚棋子）
  if (allPieces.length === 3) {
    const commanders = allPieces.filter(p => p.type === 'commander');
    const sieges = allPieces.filter(p => p.type === 'siege');
    if (commanders.length === 2 && sieges.length === 1) return true;
  }

  return false;
}

// --- 核心行棋與勝負判定 ---

export function makeMove(state: GameState, from: Position, to: Position): GameState {
  if (!from || !to) return state;
  const board = cloneBoard(state.board);
  const movingPiece = board[from.row][from.col].piece;
  if (!movingPiece) return state;
  const piece = { ...movingPiece };
  const captured = board[to.row][to.col].piece;

  const capturedRed = [...state.capturedRed];
  const capturedBlack = [...state.capturedBlack];

  if (captured) {
    if (captured.side === 'red') capturedRed.push(captured);
    else capturedBlack.push(captured);
  }

  const pieceCharBefore = getPieceChar(piece, from.row);
  const stateTags: string[] = [];
  let pivotTag: string | undefined;

  piece.hasMoved = true;

  // 1. 部曲橫江與晉位邏輯
  if (piece.type === 'infantry') {
    if (!piece.horizontalUnlocked) {
      const shouldUnlock =
        (piece.side === 'red' && to.row >= 5) ||
        (piece.side === 'black' && to.row <= 4);
      if (shouldUnlock) {
        piece.horizontalUnlocked = true;
        stateTags.push('橫江');
      }
    }
    if ((piece.side === 'red' && to.row === 9) || (piece.side === 'black' && to.row === 0)) {
      piece.type = 'hero';
      const newChar = getPieceChar(piece, to.row);
      stateTags.push(`晉位: [ ${newChar} ]`);
    }
  }

  // 2. 舟師啟航與登岸邏輯（戰記標示變形後字，與部曲晉位同式）
  if (piece.type === 'navy') {
    if (isInTrench(to.row) && !isInTrench(from.row)) {
      const shipChar = getPieceChar(piece, to.row);
      stateTags.push(`啟航: [ ${shipChar} ]`);
    } else if (!isInTrench(to.row) && isInTrench(from.row)) {
      const shoreChar = getPieceChar(piece, to.row);
      stateTags.push(`登岸: [ ${shoreChar} ]`);
    }
  }

  // 3. 攻械砲架記錄
  if (piece.type === 'siege' && captured) {
    const pivot = findSiegePivot(state.board, from, to);
    if (pivot) {
      pivotTag = pivot.friendly ? `架: ${pivot.coord}` : `借: ${pivot.coord}`;
    }
  }

  const pieceCharAfter = getPieceChar(piece, to.row);
  board[to.row][to.col].piece = piece;
  board[from.row][from.col].piece = null;

  const nextTurn: Side = state.currentTurn === 'red' ? 'black' : 'red';
  const check = isInCheck(board, nextTurn);
  const hasMovesLeft = hasAnyLegalMoves(board, nextTurn);

  // 4. 【修正①】三次重複判定：hash 不含 hasMoved，正確識別重複局面
  const newHash = hashBoard(board, nextTurn);
  const newHashes = [...state.positionHashes, newHash];
  const repCount = newHashes.filter(h => h === newHash).length;

  let gameOver: GameState['gameOver'] = null;
  let message = '';
  let threatTag: string | undefined;

  // 5. 勝負判定核心邏輯（順序重要：絕殺/困斃優先於死局與重複）
  if (check && !hasMovesLeft) {
    // 絕殺：發動攻擊方獲勝
    gameOver = state.currentTurn;
    message = state.currentTurn === 'red' ? '孫劉聯軍獲勝，天下三分！' : '曹操軍獲勝，一統江山！';
    threatTag = '絕殺';
  } else if (!check && !hasMovesLeft) {
    // 困斃：欠行方判負，發動圍困方獲勝
    gameOver = state.currentTurn;
    message = state.currentTurn === 'red' ? '黑方困斃，紅方獲勝！' : '紅方困斃，黑方獲勝！';
    threatTag = '困斃';
  } else if (isDeadPosition(board)) {
    // 【修正②】死局判和（含攻械 vs 統帥情況）
    gameOver = 'draw';
    message = '兵力殆盡，平議和局';
    threatTag = '死局';
  } else if (repCount >= 3) {
    // 三次重複判和
    gameOver = 'draw';
    message = '循環僵持，和局！';
    threatTag = '重複';
  } else if (check) {
    message = `將軍！ ${nextTurn === 'red' ? '紅方' : '黑方'} 處於危險之中！`;
    threatTag = '將軍';
  } else {
    message = `${nextTurn === 'red' ? '紅方' : '黑方'} 行棋`;
  }

  const turnNum = Math.floor(state.moveHistory.length / 2) + 1;
  const moveRecord: MoveRecord = {
    turnNumber: turnNum,
    side: state.currentTurn,
    pieceCharBefore,
    pieceCharAfter,
    from,
    to,
    captured: captured ? getPieceChar(captured, to.row) : undefined,
    capturedSide: captured ? captured.side : undefined,
    threatTag,
    pivotTag,
    stateTags,
  };

  return {
    board,
    currentTurn: nextTurn,
    selectedPos: null,
    legalMoves: [],
    capturedRed,
    capturedBlack,
    gameOver,
    message,
    inCheck: check ? nextTurn : null,
    moveHistory: [...state.moveHistory, moveRecord],
    boardHistory: [...state.boardHistory, state.board],
    positionHashes: newHashes,
  };
}

// 【修正③】悔棋俘獲列表 pop 方向修正：
// 被吃的棋是由 state.currentTurn（行棋方）吃掉的，
// 所以要從行棋方的俘獲列表 pop，而非 prevTurn。
//
// 【對戰電腦悔棋】vsAI = true 時連退兩步（AI 的步 + 玩家的步），
// 讓局面回到玩家可重新選擇的狀態。
// 若歷史只剩一步（玩家尚未讓 AI 走），則只退那一步。
function undoOnce(state: GameState): GameState | null {
  if (state.boardHistory.length === 0) return null;
  const prevBoard = state.boardHistory[state.boardHistory.length - 1];
  const prevHistory = state.moveHistory.slice(0, -1);
  const prevBoardHistory = state.boardHistory.slice(0, -1);
  const prevTurn: Side = state.currentTurn === 'red' ? 'black' : 'red';

  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  const capturedRed = [...state.capturedRed];
  const capturedBlack = [...state.capturedBlack];
  if (lastMove?.captured) {
    // state.currentTurn 是悔棋前的「下一手」，prevTurn 才是剛才行棋方
    // 行棋方（prevTurn）吃掉對方的棋，所以從對方的俘獲列表 pop
    if (prevTurn === 'red') {
      // 紅方剛才行棋，吃的是黑方的棋，從 capturedBlack pop
      capturedBlack.pop();
    } else {
      // 黑方剛才行棋，吃的是紅方的棋，從 capturedRed pop
      capturedRed.pop();
    }
  }

  const check = isInCheck(prevBoard, prevTurn);

  return {
    board: prevBoard,
    currentTurn: prevTurn,
    selectedPos: null,
    legalMoves: [],
    capturedRed,
    capturedBlack,
    gameOver: null,
    message: check
      ? `將軍！ ${prevTurn === 'red' ? '紅方' : '黑方'} 處於危險之中！`
      : `${prevTurn === 'red' ? '紅方' : '黑方'} 行棋`,
    inCheck: check ? prevTurn : null,
    moveHistory: prevHistory,
    boardHistory: prevBoardHistory,
    positionHashes: state.positionHashes.slice(0, -1),
  };
}

export function undoMove(state: GameState, vsAI = false): GameState | null {
  if (vsAI) {
    // 對戰電腦：先退掉 AI 那步，再退掉玩家那步
    // 若歷史只有一步（玩家還沒讓 AI 走），直接退那一步即可
    const afterUndoAI = undoOnce(state);
    if (!afterUndoAI) return null;
    if (afterUndoAI.boardHistory.length === 0) return afterUndoAI; // 只剩玩家第一步，退完就好
    return undoOnce(afterUndoAI);
  }
  return undoOnce(state);
}