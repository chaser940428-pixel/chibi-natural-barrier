import { useState, useEffect } from 'react';
import type { AiDifficulty, GameStartOptions, Side } from '@/game/types';

interface StartScreenProps {
  onEnter: (options: GameStartOptions) => void;
}

export function StartScreen({ onEnter }: StartScreenProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<'pvp' | 'pve'>('pvp');
  const [humanSide, setHumanSide] = useState<Side>('red');
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('medium');

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            if (mode === 'pvp') onEnter({ mode: 'pvp' });
            else onEnter({ mode: 'pve', humanSide, aiDifficulty });
          }, 200);
          return 100;
        }
        return prev + Math.random() * 12 + 3;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [loading, onEnter, mode, humanSide, aiDifficulty]);

  const beginLoading = () => setLoading(true);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-primary tracking-[0.3em] drop-shadow-[0_4px_16px_hsl(35_60%_50%/0.5)] mb-4">
        赤壁：天塹棋
      </h1>
      <p className="text-xs sm:text-sm text-muted-foreground tracking-[0.4em] mb-10">
        CHIBI: NATURAL BARRIER
      </p>

      <div className="max-w-lg mx-auto mb-8 space-y-4">
        <p className="text-sm sm:text-base text-foreground/80 leading-[2.2] tracking-wider" style={{ fontFamily: "'Noto Serif TC', serif" }}>
          「建安十三年，冬。曹操率百萬大軍南下，屯兵烏林；孫劉聯軍焚舟塞江，對峙赤壁。
        </p>
        <p className="text-sm sm:text-base text-primary/70 leading-[2.2] tracking-wider italic" style={{ fontFamily: "'Noto Serif TC', serif" }}>
          大江東去，浪淘盡，千古風流人物。
        </p>
        <p className="text-sm sm:text-base text-foreground/80 leading-[2.2] tracking-wider" style={{ fontFamily: "'Noto Serif TC', serif" }}>
          這一戰，乾坤將定。」
        </p>
      </div>

      {!loading ? (
        <div className="w-full max-w-md space-y-6 mb-8">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground tracking-[0.25em]">對戰模式</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => setMode('pvp')}
                className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wider transition-all ${
                  mode === 'pvp'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                }`}
              >
                本地雙人
              </button>
              <button
                type="button"
                onClick={() => setMode('pve')}
                className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wider transition-all ${
                  mode === 'pve'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                }`}
              >
                對戰電腦
              </button>
            </div>
          </div>

          {mode === 'pve' && (
            <>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground tracking-[0.25em]">執棋陣營</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <button
                    type="button"
                    onClick={() => setHumanSide('red')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wider transition-all ${
                      humanSide === 'red'
                        ? 'bg-[#660000] text-[#F2F2E8] border border-[#F2F2E8]/40'
                        : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    孫劉聯軍（先手）
                  </button>
                  <button
                    type="button"
                    onClick={() => setHumanSide('black')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wider transition-all ${
                      humanSide === 'black'
                        ? 'bg-[#1a1a1a] text-[#D4AF37] border border-[#D4AF37]/40'
                        : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    曹操軍（後手）
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground tracking-[0.25em]">電腦難度</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {(
                    [
                      ['easy', '隨手'],
                      ['medium', '謹慎'],
                      ['hard', '嚴陣'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAiDifficulty(key)}
                      className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-bold tracking-wider transition-all ${
                        aiDifficulty === key
                          ? 'bg-amber-800/90 text-amber-50 border border-amber-500/50'
                          : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground/80 leading-relaxed px-1">
                  「隨手」偏隨機；「謹慎」一步貪評；「嚴陣」多看幾步，仍保持流暢。
                </p>
              </div>
            </>
          )}
        </div>
      ) : null}

      {!loading ? (
        <button
          onClick={beginLoading}
          className="px-8 py-3 text-lg font-bold tracking-[0.2em] text-primary-foreground rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_hsl(35_60%_50%/0.4)]"
          style={{
            background: 'linear-gradient(135deg, hsl(35 60% 45%), hsl(35 60% 55%))',
            boxShadow: '0 6px 0 hsl(0 0% 0% / 0.4), 0 8px 20px hsl(0 0% 0% / 0.3), inset 0 2px 4px hsl(0 0% 100% / 0.2)',
          }}
        >
          揮師入陣
        </button>
      ) : (
        <div className="w-64 space-y-3">
          <p className="text-sm text-muted-foreground tracking-widest animate-pulse">東風將至...</p>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(0 0% 100% / 0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: 'linear-gradient(90deg, hsl(35 60% 50%), hsl(42 80% 55%))',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
