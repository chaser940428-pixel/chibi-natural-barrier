import { MoveRecord, Side, getColLabel, getRowLabel } from '@/game/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useRef } from 'react';

interface MoveHistoryProps {
  moves: MoveRecord[];
}

function formatCoord(col: number, row: number): string {
  return `${getColLabel(col)}${getRowLabel(row)}`;
}

/** Returns the text color for a given faction */
function factionColor(side: Side): string {
  return side === 'red' ? '#F2F2E8' : '#D4AF37';
}

function MoveEntry({ m }: { m: MoveRecord }) {
  const fromStr = formatCoord(m.from.col, m.from.row);
  const toStr = formatCoord(m.to.col, m.to.row);
  const isRed = m.side === 'red';
  const protagonistColor = factionColor(m.side);

  // Capture with × in white, target in its own faction color
  const captureNode = m.captured ? (
    <>
      {' '}
      <span style={{ color: '#FFFFFF', fontWeight: 'bold' }}>×</span>
      {' '}
      <span style={{ color: m.capturedSide ? factionColor(m.capturedSide) : protagonistColor }}>
        [ {m.captured} ]
      </span>
    </>
  ) : null;

  // State tags in protagonist color
  const stateNodes = (m.stateTags ?? []).map((tag, i) => (
    <span key={i} style={{ color: protagonistColor, opacity: 0.85 }}> ({tag})</span>
  ));

  // Pivot tag – faction-aware coloring
  const pivotNode = m.pivotTag ? (() => {
    const isFriendly = m.pivotTag.startsWith('架');
    const pivotColor = isFriendly ? factionColor(m.side) : factionColor(m.side === 'red' ? 'black' : 'red');
    return <span style={{ color: pivotColor, opacity: 0.85 }}> ({m.pivotTag})</span>;
  })() : null;

  // Threat tag in vermillion
  const threatNode = m.threatTag ? (
    <span style={{ color: '#CC0000', fontWeight: 'bold' }}>
      {' '}({m.threatTag}) {m.threatTag === '將軍' ? '+' : '#'}
    </span>
  ) : null;

  return (
    <div
      className={`px-3 py-1.5 text-sm ${
        isRed
          ? 'border-l-4'
          : 'border-l-4'
      }`}
      style={{
        fontFamily: "'Noto Serif TC', serif",
        backgroundColor: isRed ? '#660000' : '#333333',
        borderLeftColor: isRed ? '#F2F2E8' : '#D4AF37',
      }}
    >
      <span className="text-xs mr-1.5" style={{ color: '#999999' }}>{m.turnNumber}.</span>
      <span style={{ color: protagonistColor }}>[ {m.pieceCharBefore} ]</span>
      {' '}
      <span style={{ color: '#CCCCCC' }}>{fromStr}</span>
      {' '}
      <span style={{ color: '#CCCCCC' }}>→</span>
      {' '}
      <span style={{ color: '#CCCCCC' }}>{toStr}</span>
      {captureNode}
      {stateNodes}
      {pivotNode}
      {threatNode}
    </div>
  );
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [moves.length]);

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-bold text-foreground px-3 py-2 border-b border-border">
        戰記
      </h3>
      <ScrollArea className="flex-1">
        {moves.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 px-3">靜候軍令</p>
        ) : (
          <div className="space-y-0.5 py-1">
            {moves.map((m, i) => (
              <MoveEntry key={i} m={m} />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
