export type Side = 'red' | 'black';

/** 電腦對戰難度 */
export type AiDifficulty = 'easy' | 'medium' | 'hard';

export type GameStartOptions =
  | { mode: 'pvp' }
  | { mode: 'pve'; humanSide: Side; aiDifficulty: AiDifficulty };

export type PieceType =
  | 'commander'    // 都 / 丞
  | 'strategist'   // 謀 / 祭
  | 'navy'         // 督 / 尉 → 舸/艨 in trench
  | 'cavalry'      // 突 / 豹
  | 'siege'        // 火 / 霹 (cannon-style capture)
  | 'infantry'     // 丹 / 青
  | 'hero';        // 豪 / 梟 (promoted infantry)

export interface Piece {
  type: PieceType;
  side: Side;
  hasMoved: boolean;
  horizontalUnlocked?: boolean;
}

export interface Position {
  col: number; // 0-7 (A-H)
  row: number; // 0-9 (Row 1-10, 0=Row1=Red bottom)
}

export interface Cell {
  piece: Piece | null;
}

export type Board = Cell[][];

export interface MoveRecord {
  turnNumber: number;
  side: Side;
  pieceCharBefore: string;
  pieceCharAfter: string;
  from: Position;
  to: Position;
  captured?: string;
  capturedSide?: Side;
  special?: string;
  /** Chinese state tags like 橫江, 晉位, 啟航, 登岸, 躍擊 */
  stateTags: string[];
  /** Chinese threat tags: 將軍 or 絕殺 */
  threatTag?: string;
  /** Pivot coordinate for siege cannon capture (架/借) */
  pivotTag?: string;
}

export interface GameState {
  board: Board;
  currentTurn: Side;
  selectedPos: Position | null;
  legalMoves: Position[];
  capturedRed: Piece[];
  capturedBlack: Piece[];
  gameOver: 'red' | 'black' | 'draw' | null;
  message: string;
  inCheck: Side | null;
  moveHistory: MoveRecord[];
  boardHistory: Board[];
  positionHashes: string[];
}

export function getPieceChar(piece: Piece, row: number): string {
  const { type, side } = piece;
  switch (type) {
    case 'commander': return side === 'red' ? '都' : '丞';
    case 'strategist': return side === 'red' ? '謀' : '祭';
    case 'navy':
      if (row >= 3 && row <= 6) {
        return side === 'red' ? '舸' : '艨';
      }
      return side === 'red' ? '督' : '尉';
    case 'cavalry': return side === 'red' ? '突' : '豹';
    case 'siege': return side === 'red' ? '火' : '霹';
    case 'infantry': return side === 'red' ? '丹' : '青';
    case 'hero': return side === 'red' ? '豪' : '梟';
    default: return '?';
  }
}

export function getColLabel(col: number): string {
  return String.fromCharCode(65 + col);
}

export function getRowLabel(row: number): string {
  return String(row + 1);
}
