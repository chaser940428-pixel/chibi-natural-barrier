import { useState, useCallback } from 'react';
import { GameBoard } from '@/components/GameBoard';
import { StartScreen } from '@/components/StartScreen';
import type { GameStartOptions } from '@/game/types';

const Index = () => {
  const [started, setStarted] = useState(false);
  const [options, setOptions] = useState<GameStartOptions>({ mode: 'pvp' });

  const handleEnter = useCallback((next: GameStartOptions) => {
    setOptions(next);
    setStarted(true);
  }, []);

  const handleBackToMenu = useCallback(() => {
    setStarted(false);
  }, []);

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      {started ? (
        <GameBoard options={options} onBackToMenu={handleBackToMenu} />
      ) : (
        <StartScreen onEnter={handleEnter} />
      )}
    </div>
  );
};

export default Index;
