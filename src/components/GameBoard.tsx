import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, Position, getColLabel, getRowLabel, getPieceChar, Side, GameStartOptions, AiDifficulty } from '@/game/types';
import { createInitialState, getLegalMoves, makeMove, undoMove } from '@/game/engine';
import { getAiMove } from '@/game/ai';
import { GamePiece } from '@/components/GamePiece';
import { MoveHistory } from '@/components/MoveHistory';
import { playWoodImpact, playWaterSplash, playCheckAlert, playCapture, playPromotion, playGameOver } from '@/game/sounds';
import { RotateCcw, Undo2, Flag, ArrowLeft } from 'lucide-react';
import { BingshuDialog } from '@/components/BingshuDialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function posEquals(a: Position, b: Position) {
  return a.row === b.row && a.col === b.col;
}

function getRegionBandStyle(row: number): { bg: string; label: string } {
  if (row >= 0 && row <= 2) return { bg: 'bg-amber-800/20', label: '陸地' };
  if (row >= 7 && row <= 9) return { bg: 'bg-amber-800/20', label: '陸地' };
  if (row === 3 || row === 6) return { bg: 'bg-sky-500/30', label: '岸線' };
  if (row === 4 || row === 5) return { bg: 'bg-blue-700/40', label: '江線' };
  return { bg: '', label: '' };
}

/** AI 算出走法後暫停，方便玩家看清局面 */
const AI_MOVE_PAUSE_MS = 600;

const AI_THINKING_RED = [
  '都督凝望江霧，思索火攻…',
  '孔明搖扇，細看敵艦陣腳…',
  '周郎按劍，點閱江東舟師…',
  '聯軍諸將低語，沙盤上指畫未定…',
];

const AI_THINKING_BLACK = [
  '丞相扶劍，遠眺南岸煙塵…',
  '程昱低語，獻上渡江之策…',
  '曹軍旌旗獵獵，傳令未定…',
  '北軍幕僚執圖，細數天塹虛實…',
];

const AI_POISED_RED = '火勢在胸，此手將出…';
const AI_POISED_BLACK = '軍令將下，且看北軍應變…';

function pickAiLine(lines: string[]) {
  return lines[Math.floor(Math.random() * lines.length)];
}

const difficultyLabel: Record<AiDifficulty, string> = {
  easy: '隨手',
  medium: '謹慎',
  hard: '嚴陣',
};

interface GameBoardProps {
  options: GameStartOptions;
  onBackToMenu?: () => void;
}

export function GameBoard({ options, onBackToMenu }: GameBoardProps) {
  const isPve = options.mode === 'pve';
  const humanSide: Side = options.mode === 'pve' ? options.humanSide : 'red';
  const aiDifficulty: AiDifficulty = options.mode === 'pve' ? options.aiDifficulty : 'medium';

  const [state, setState] = useState<GameState>(createInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [showVictory, setShowVictory] = useState(false);
  const [showSurrender, setShowSurrender] = useState(false);
  const [promotedCell, setPromotedCell] = useState<Position | null>(null);
  /** 電腦回合時覆寫訊息欄：思考中 / 已定手、即將落子 */
  const [aiHud, setAiHud] = useState<null | { text: string; phase: 'thinking' | 'poised' }>(null);

  useEffect(() => {
    if (state.moveHistory.length === 0) return;
    const last = state.moveHistory[state.moveHistory.length - 1];
    if (!last) return;

    if (state.gameOver) {
      playGameOver();
    } else if (last.threatTag === '將軍') {
      playCheckAlert();
    }

    if (last.stateTags.some(tag => tag.includes('晉位'))) {
      playPromotion();
      setPromotedCell(last.to);
      setTimeout(() => setPromotedCell(null), 800);
    }

    if (last.captured) {
      playCapture();
    } else if (last.to.row >= 3 && last.to.row <= 6) {
      playWaterSplash();
    } else {
      playWoodImpact();
    }
  }, [state.moveHistory.length, state.gameOver]);

  useEffect(() => {
    if (state.gameOver) setShowVictory(true);
  }, [state.gameOver]);

  useEffect(() => {
    if (!isPve || state.gameOver) return;
    const aiSide: Side = humanSide === 'red' ? 'black' : 'red';
    if (state.currentTurn !== aiSide) return;

    let cancelled = false;
    const timeoutIds: number[] = [];

    setAiHud({
      text: aiSide === 'red' ? pickAiLine(AI_THINKING_RED) : pickAiLine(AI_THINKING_BLACK),
      phase: 'thinking',
    });

    timeoutIds.push(
      window.setTimeout(() => {
        if (cancelled) return;
        const snap = stateRef.current;
        if (snap.gameOver || snap.currentTurn !== aiSide) {
          setAiHud(null);
          return;
        }
        const move = getAiMove(snap, aiDifficulty);
        if (!move) {
          setAiHud(null);
          return;
        }
        setAiHud({
          text: aiSide === 'red' ? AI_POISED_RED : AI_POISED_BLACK,
          phase: 'poised',
        });
        timeoutIds.push(
          window.setTimeout(() => {
            if (cancelled) return;
            setState(prev => {
              if (prev.gameOver || prev.currentTurn !== aiSide) return prev;
              return makeMove(prev, move.from, move.to);
            });
            setAiHud(null);
          }, AI_MOVE_PAUSE_MS),
        );
      }, 0),
    );

    return () => {
      cancelled = true;
      timeoutIds.forEach(id => window.clearTimeout(id));
      setAiHud(null);
    };
  }, [isPve, humanSide, aiDifficulty, state.currentTurn, state.gameOver, state.moveHistory.length]);

  const humanTurn = !isPve || state.currentTurn === humanSide;

  const handleCellClick = useCallback((row: number, col: number) => {
    if (state.gameOver) return;
    if (isPve && state.currentTurn !== humanSide) return;
    const clickedPos: Position = { row, col };
    const piece = state.board[row][col].piece;

    if (state.selectedPos && state.legalMoves.some(m => posEquals(m, clickedPos))) {
      const from = state.selectedPos;
      setState(prev => makeMove(prev, from, clickedPos));
      return;
    }

    if (piece && piece.side === state.currentTurn) {
      const moves = getLegalMoves(state.board, clickedPos);
      setState(prev => ({ ...prev, selectedPos: clickedPos, legalMoves: moves }));
      return;
    }

    setState(prev => ({ ...prev, selectedPos: null, legalMoves: [] }));
  }, [state, isPve, humanSide]);

  const handleReset = () => {
    setState(createInitialState());
    setShowVictory(false);
    setAiHud(null);
  };

  const handleUndo = () => {
    const prev = undoMove(state, isPve);
    if (prev) setState(prev);
  };

  const handleSurrender = () => {
    const winner = state.currentTurn === 'red' ? 'black' : 'red';
    setState(prev => ({
      ...prev,
      gameOver: winner,
      message: winner === 'red' ? '孫劉聯軍獲勝' : '曹操軍獲勝',
    }));
    setShowSurrender(false);
  };

  // 取得最後一手的 threatTag（投降時 moveHistory 不會追加紀錄，需額外處理）
  const lastThreatTag = state.moveHistory[state.moveHistory.length - 1]?.threatTag;

  // 【修正①】getStatusDisplay：
  // - draw 依最後 threatTag 區分「議和」（重複）vs「罷戰」（死局）
  // - 勝方結果依 threatTag 區分「凱旋」（絕殺/投降）vs「奏捷」（困斃）
  const getStatusDisplay = () => {
    if (aiHud) return aiHud.text;
    if (state.gameOver) {
      if (state.gameOver === 'draw') {
        return lastThreatTag === '重複' ? "兩軍 議和" : "兩軍 罷戰";
      }
      // 勝方為 state.gameOver 的 side
      const isStalemate = lastThreatTag === '困斃';
      if (state.gameOver === 'red') {
        return isStalemate ? "孫劉聯軍 奏捷" : "孫劉聯軍 凱旋";
      } else {
        return isStalemate ? "曹操軍 奏捷" : "曹操軍 凱旋";
      }
    }
    if (state.inCheck) {
      return state.inCheck === 'red' ? "聯軍 勢危！" : "曹軍 勢危！";
    }
    if (state.moveHistory.length === 0) return "聯軍 啟行";
    return state.currentTurn === 'red' ? "聯軍 執棋" : "曹軍 執棋";
  };

  // 【修正②】狀態欄顏色：
  // 遊戲結束時，currentTurn 是「下一手」即輸家，顏色應跟隨 gameOver（勝方）。
  // draw 時用中性色。
  const statusColorSide = (() => {
    if (state.gameOver) {
      if (state.gameOver === 'draw') return null;       // draw → 中性色
      return state.gameOver;                            // 勝方顏色
    }
    // 電腦思考時訊息欄跟隨行棋方（即 AI 陣營）
    return state.currentTurn;                           // 對局中 → 當前行棋方
  })();

  const statusBg    = statusColorSide === 'red' ? '#660000' : statusColorSide === 'black' ? '#1a1a1a' : '#3a3020';
  const statusText  = statusColorSide === 'red' ? '#F2F2E8' : statusColorSide === 'black' ? '#D4AF37' : '#C8B060';
  const statusBorderColor = statusColorSide === 'red' ? '#F2F2E8' : statusColorSide === 'black' ? '#D4AF37' : '#C8B060';

  const getVictoryContent = () => {
    const lastMove = state.moveHistory[state.moveHistory.length - 1];
    const isStalemate = lastMove?.threatTag === '困斃';

    if (state.gameOver === 'red') {
      return {
        title: isStalemate ? "孫劉聯軍 奏捷" : "孫劉聯軍 凱旋",
        desc: isStalemate
          ? "「誘敵深入，鐵索自困。北軍不習水性，深陷死地，進退無路。」"
          : "「烈火張天，曹賊退避。江東豪傑守土有功，天塹終不可越！」"
      };
    }
    if (state.gameOver === 'black') {
      return {
        title: isStalemate ? "曹操軍 奏捷" : "曹操軍 凱旋",
        desc: isStalemate
          ? "「雷霆之勢，困獸之鬥。聯軍已無立錐之地，唯有歸降一途。」"
          : "「天命歸一，江東底定。丞相大軍踏平天塹，四海終歸一統。」"
      };
    }
    // draw：依 threatTag 區分
    if (lastThreatTag === '重複') {
      return { title: "兩軍 議和", desc: "「兩軍僵持，膠著江線。虛實已盡，再戰無益，各引兵退。」" };
    }
    return { title: "兩軍 罷戰", desc: "「血染長江，子力凋零。雙方皆無破陣之兵，難續戰事，各自鳴金。」" };
  };

  const isLegalTarget = (row: number, col: number) =>
    state.legalMoves.some(m => m.row === row && m.col === col);

  const isKingInCheck = (row: number, col: number) => {
    if (!state.inCheck) return false;
    const p = state.board[row][col].piece;
    return p?.type === 'commander' && p.side === state.inCheck;
  };

  const getCellBg = (row: number, col: number) => {
    if (row >= 3 && row <= 6) {
      return (row === 3 || row === 6) ? 'bg-board-trench-shore' : 'bg-board-trench';
    }
    return (row + col) % 2 === 0 ? 'bg-board-land' : 'bg-board-land-dark';
  };

  const vInfo = getVictoryContent();
  const rows = Array.from({ length: 10 }, (_, i) => 9 - i);
  const cols = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-center lg:items-start max-w-[960px] mx-auto w-full px-2">
      <div className="flex flex-col items-center gap-3 w-full lg:w-auto">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-primary tracking-[0.2em] drop-shadow-[0_2px_8px_hsl(35_60%_50%/0.4)]">
          赤壁：天塹棋
        </h1>
        <p className="text-[10px] sm:text-xs text-muted-foreground tracking-widest -mt-2">CHIBI: NATURAL BARRIER</p>
        {isPve && (
          <p className="text-[10px] sm:text-xs text-amber-200/70 tracking-widest -mt-1">
            對戰電腦 · {difficultyLabel[aiDifficulty]}
          </p>
        )}

        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-1.5 rounded text-sm font-bold transition-all duration-300 ease-in-out ${
              aiHud?.phase === 'thinking'
                ? 'animate-pulse shadow-[0_0_12px_hsl(42_70%_45%/0.35)]'
                : ''
            } ${aiHud?.phase === 'poised' ? 'opacity-95' : ''} ${
              state.inCheck && !aiHud ? 'animate-pulse bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : ''
            }`}
            style={{
              fontFamily: "'Noto Serif TC', serif",
              backgroundColor: state.inCheck && !aiHud ? undefined : statusBg,
              color: state.inCheck && !aiHud ? undefined : statusText,
              borderLeft: state.inCheck && !aiHud ? '4px solid #fff' : `4px solid ${statusBorderColor}`,
            }}
          >
            {getStatusDisplay()}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          {onBackToMenu && (
            <Button variant="ghost" size="sm" onClick={onBackToMenu} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> 返回標題
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleUndo} disabled={
            !!state.gameOver ||
            !humanTurn ||
            (isPve ? state.moveHistory.length < 2 : state.moveHistory.length === 0)
          }>
            <Undo2 className="w-4 h-4 mr-1" /> 悔棋
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!!aiHud}>
            <RotateCcw className="w-4 h-4 mr-1" /> 重整
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowSurrender(true)} disabled={!!state.gameOver || !humanTurn}>
            <Flag className="w-4 h-4 mr-1" /> 投誠
          </Button>
          <BingshuDialog />
        </div>

        <div className="relative border-2 border-board-grid rounded-lg overflow-hidden shadow-[0_8px_32px_hsl(0_0%_0%/0.6)]">
          <div className="flex">
            <div className="w-8 sm:w-9" />
            {cols.map(c => (
              <div key={c} className="w-9 sm:w-11 md:w-12 flex items-center justify-center text-[9px] text-muted-foreground font-mono py-0.5">
                {getColLabel(c)}
              </div>
            ))}
            <div className="w-8 sm:w-9" />
          </div>

          <div className="relative board-rows isolate" style={{ '--cell-w': '2.25rem', '--cell-h': '2.25rem', '--sb-w': '2rem' } as React.CSSProperties}>
            <style>{`
              @media (min-width: 640px) { .board-rows { --cell-w: 2.75rem; --cell-h: 2.75rem; --sb-w: 2.25rem; } }
              @media (min-width: 768px) { .board-rows { --cell-w: 3rem; --cell-h: 3rem; --sb-w: 2.25rem; } }
            `}</style>

            {/* 底層：格紋（不透明）；列高由格子 h-9/h-11/h-12 自然撐開，勿鎖 var(--cell-h) 以免與邊框斷點錯位 */}
            <div className="absolute inset-0 z-0 flex flex-col pointer-events-none" aria-hidden>
              {rows.map(row => {
                const region = getRegionBandStyle(row);
                return (
                  <div key={`bg-${row}`} className="flex">
                    <div className={`w-8 sm:w-9 shrink-0 self-stretch ${region.bg}`} />
                    {cols.map(col => (
                      <div
                        key={col}
                        className={`w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 shrink-0 box-border border border-board-grid/30 ${getCellBg(row, col)}`}
                      />
                    ))}
                    <div className={`w-8 sm:w-9 shrink-0 self-stretch ${region.bg}`} />
                  </div>
                );
              })}
            </div>

            {/* 中層：長江天塹書法（在格紋與棋子之間） */}
            <div
              className="absolute pointer-events-none z-[1]"
              style={{
                top: 'calc(var(--cell-h) * 4)',
                height: 'calc(var(--cell-h) * 2)',
                left: 'var(--sb-w)',
                right: 'var(--sb-w)',
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}river-barrier.png`}
                alt=""
                className="absolute pointer-events-none max-w-none select-none"
                style={{
                  top: '120%',
                  left: 'calc(var(--cell-w) * 5.5)',
                  width: 'calc(var(--cell-w) * 10)',
                  transform: 'translate(-50%, -50%)',
                  opacity: 0.16,
                  filter: 'brightness(1.05) contrast(1.05)',
                }}
              />
            </div>

            {/* 上層：互動格（透明底）+ 棋子；與底層同一 flex／寬高類別，確保對齊 */}
            <div className="relative z-[2] flex flex-col">
              {rows.map(row => {
                const region = getRegionBandStyle(row);
                return (
                  <div key={row} className="flex">
                    <div className={`w-8 sm:w-9 shrink-0 self-stretch flex items-center justify-center ${region.bg}`}>
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono">{getRowLabel(row)}</span>
                    </div>

                    {cols.map(col => {
                      const piece = state.board[row][col].piece;
                      const legal = isLegalTarget(row, col);
                      const selected = posEquals(state.selectedPos || { row: -1, col: -1 }, { row, col });
                      const inCheck = isKingInCheck(row, col);
                      const promoted = promotedCell?.row === row && promotedCell?.col === col;

                      return (
                        <div
                          key={col}
                          className={`
                            relative w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 shrink-0 box-border grid place-items-center
                            bg-transparent border border-board-grid/30 cursor-pointer transition-colors
                            ${selected ? 'bg-white/10' : ''}
                            ${legal ? 'ring-2 ring-inset ring-highlight-move' : ''}
                            ${inCheck ? 'ring-2 ring-inset ring-destructive bg-destructive/20' : ''}
                          `}
                          onClick={() => handleCellClick(row, col)}
                        >
                          {legal && !piece && (
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/40" />
                          )}
                          {piece && (
                            <GamePiece piece={piece} row={row} isSelected={selected} isPromoted={promoted} onClick={() => handleCellClick(row, col)} />
                          )}
                        </div>
                      );
                    })}

                    <div className={`w-8 sm:w-9 shrink-0 self-stretch flex items-center justify-center ${region.bg}`}>
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono">{getRowLabel(row)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex">
            <div className="w-8 sm:w-9" />
            {cols.map(c => (
              <div key={c} className="w-9 sm:w-11 md:w-12 flex items-center justify-center text-[9px] text-muted-foreground font-mono py-0.5">
                {getColLabel(c)}
              </div>
            ))}
            <div className="w-8 sm:w-9" />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs justify-center font-serif">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#660000]">
            <span className="font-bold text-[10px] text-[#F2F2E8]">聯軍 俘獲:</span>
            <span className="text-[#D4AF37]">
              {state.capturedBlack.length === 0 ? "—" : state.capturedBlack.map((p, i) => <span key={i} className="mx-0.5">{getPieceChar(p, 9)}</span>)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#1a1a1a]">
            <span className="font-bold text-[10px] text-[#D4AF37]">曹軍 俘獲:</span>
            <span className="text-[#F2F2E8]">
              {state.capturedRed.length === 0 ? "—" : state.capturedRed.map((p, i) => <span key={i} className="mx-0.5">{getPieceChar(p, 0)}</span>)}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-64 h-48 sm:h-64 lg:h-[540px] glass-panel rounded-lg overflow-hidden border-l border-white/5">
        <MoveHistory moves={state.moveHistory} />
      </div>

      <Dialog open={showVictory} onOpenChange={setShowVictory}>
        <DialogContent className="bg-zinc-950 border-amber-900/50 text-amber-50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif tracking-widest text-amber-400 border-b border-amber-900/30 pb-2">{vInfo.title}</DialogTitle>
            <DialogDescription className="text-lg leading-relaxed pt-4 font-serif italic text-amber-100/80">{vInfo.desc}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button onClick={handleReset} className="bg-amber-700 hover:bg-amber-600 text-white font-serif">重整旗鼓 (New Game)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSurrender} onOpenChange={setShowSurrender}>
        <DialogContent className="bg-zinc-900 text-white">
          <DialogHeader>
            <DialogTitle className="font-serif">是否 投誠？</DialogTitle>
            <DialogDescription>{state.currentTurn === 'red' ? '聯軍' : '曹軍'} 將放棄抵抗，歸降敵陣。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSurrender(false)}>再戰片刻</Button>
            <Button variant="destructive" onClick={handleSurrender}>解甲投誠</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}