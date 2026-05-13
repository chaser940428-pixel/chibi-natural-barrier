import { Piece } from '@/game/types';

interface GamePieceProps {
  piece: Piece;
  row: number;
  isSelected: boolean;
  isPromoted: boolean; 
  onClick: () => void;
}

export function GamePiece({ piece, row, isSelected, isPromoted, onClick }: GamePieceProps) {
  const isRed = piece.side === 'red';
  const prefix = isRed ? 'r' : 'b';
  
  const getPieceImagePath = (): string => {
    const type = piece.type;
    const inTrench = row >= 3 && row <= 6; 

    const base = import.meta.env.BASE_URL;

    if (type === 'infantry') {
      const isUnlocked = piece.horizontalUnlocked;
      const baseName = isRed ? 'dan' : 'qing';
      return `${base}pieces/${prefix}_${baseName}${isUnlocked ? '_unlocked' : ''}.png`;
    }

    if (type === 'navy') {
      if (inTrench) return `${base}pieces/${prefix}_${isRed ? 'ge' : 'meng'}.png`;
      return `${base}pieces/${prefix}_${isRed ? 'du_shui' : 'wei'}.png`;
    }

    const typeMap: Record<string, string> = {
      commander: isRed ? 'du' : 'cheng',
      strategist: isRed ? 'mou' : 'ji',
      cavalry: isRed ? 'tu' : 'bao',
      siege: isRed ? 'huo' : 'pi',
      hero: isRed ? 'hao' : 'xiao',
    };

    return `${base}pieces/${prefix}_${typeMap[type] || 'dan'}.png`;
  };

  return (
    <button
      onClick={onClick}
      style={{ 
        position: 'relative', 
        zIndex: isSelected ? 999 : 500, 
        cursor: 'pointer',
        background: 'transparent', 
        border: 'none',            
        padding: 0,
        margin: 0,
        overflow: 'visible',       
        outline: 'none',
        boxShadow: 'none',         
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent !important' as any,
        backgroundImage: 'none !important' as any
      }}
      className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 ${isPromoted ? 'piece-hero-glow' : ''}`}
    >
      <img 
        src={getPieceImagePath()} 
        alt={piece.type}
        className="pointer-events-none"
        // 將原本報錯的 WebkitUserDrag 換成標準屬性，並直接用強制轉型解決
        style={{
          width: '90%',      
          height: '90%',     
          transform: `translate(-4.5px, -4.5px) ${isSelected ? 'scale(1.1) translateY(-5px)' : ''}`, 
          
          maxWidth: 'none',
          objectFit: 'contain',
          userSelect: 'none',
          // 修正點：將屬性名稱改寫為符合 TypeScript 規範的格式
          WebkitUserDrag: 'none',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease',
          filter: isSelected ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))' : 'none',
        } as any} 
      />
    </button>
  );
}