# Chibi: Natural Barrier (赤壁：天塹棋)

> A strategy board game set at the Battle of Red Cliff (208 AD). Two asymmetric factions — the Sun-Liu Alliance and Cao Cao's army — fight across the Yangtze River, with pieces that transform when they enter the water.

**[Live Demo](https://chaser940428-pixel.github.io/chibi-natural-barrier/)** &nbsp;|&nbsp; Built with React + TypeScript + Vite

---

## What it is

A historically-grounded chess variant where the battlefield mechanics reflect the actual battle. The Yangtze River (長江天塹) is not decoration — it changes what pieces can do. Navy units transform into warships when they enter the river zone, gaining expanded movement. Infantry that cross the river and reach the enemy's back line are promoted to heroes (豪傑/梟雄). Fire attack pieces (火/霹) can capture at range by leaping over a friendly piece as a catapult platform.

The game log (戰記) records every move in period-accurate military terminology rather than generic chess notation.

---

## Factions

**Sun-Liu Alliance (孫劉聯軍) — Red, moves first**

| Symbol | Unit | Historical basis |
|--------|------|-----------------|
| 督 | Commander (都督) | Naval command rank used by Zhou Yu |
| 謀 | Strategist (軍師) | Zhuge Liang's advisory role |
| 督/尉 | Navy (水軍都督 / 校尉) | Southern fleet vs. land-transferred northern officers |
| 舸/艨 | Warship (走舸 / 艨艟) | Fast fire-ships vs. armored vessels |
| 突 | Cavalry (突將) | Jiangdong shoreline assault unit |
| 丹 | Infantry (丹陽兵) | Elite Danyang soldiers, Sun family's founding force |
| 豪 | Hero (豪傑) | Promoted infantry |
| 火 | Fire Attack (火攻) | The decisive tactic at Red Cliff |

**Cao Cao's Army (曹操軍) — Black, moves second**

Mirrors the Alliance with historically distinct unit names: 丞 (Chancellor), 祭 (Chief Priest), 尉 (Colonel), 艨 (Warship), 貂 (Tiger-Leopard Cavalry), 青 (Qingzhou Infantry), 梟 (Warlord), 霹 (Trebuchet).

---

## Game mechanics

**Board:** 8 columns (A–H) × 10 rows (1–10)

**Zones:**
- Yangtze Trench (長江天塹): rows 4–7 — transforms Navy into Warships
- River Line (江線): row 5 (Alliance) / row 6 (Cao Cao) — Infantry crossing here gain lateral movement permanently
- Back Line (底線): row 1 / row 10 — Infantry reaching here are promoted to Hero

**Piece transformation:**
- Navy enters rows 4–7 → activates as Warship (moves 1–2 squares in any direction, cannot jump)
- Warship exits rows 4–7 → reverts to Navy
- Infantry crosses the river line → permanently unlocks sideways movement
- Infantry reaches back line → promotes to Hero (moves 1–2 squares, can leaping-capture)

**Fire Attack / Trebuchet (炮類):** Moves 1 square orthogonally. Captures at unlimited range in a straight line, but only by jumping over exactly one piece (the "platform") — identical to Chinese chess cannon mechanics.

**Win condition:** Capture the enemy Commander.

**Draw conditions:** Three-fold repetition, stalemate.

---

## AI

Three difficulty levels, all play as the selected faction:

| Level | Algorithm | Behavior |
|-------|-----------|----------|
| Easy (隨手) | Random | Picks any legal move uniformly at random |
| Medium (謹慎) | Greedy + position evaluation | Scores all moves using piece values + positional bonuses; selects from top 3 with random perturbation to avoid fixed lines |
| Hard (嚴陣) | Minimax with alpha-beta pruning | Depth-2 search tree with capture-first move ordering; evaluates material balance, positional bonuses, and check status |

The evaluation function weights:

```
Commander: 100,000  Strategist: 900  Hero: 750  Cavalry: 550
Navy: 500  Siege: 480  Infantry: 200
Navy-in-river bonus: +250
```

---

## Tech stack

| Layer | Tool |
|-------|------|
| UI framework | React + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Build | Vite |
| Game logic | Hand-written in TypeScript (`src/game/`) |

---

## Project structure

```
src/
├── game/
│   ├── types.ts      # Board, Piece, GameState, Position types
│   ├── engine.ts     # Move validation, piece transformation, win/draw detection
│   ├── ai.ts         # Easy/medium/hard AI — greedy and minimax with alpha-beta
│   └── sounds.ts     # Audio feedback
├── components/
│   ├── GameBoard.tsx      # Board rendering and interaction
│   ├── GamePiece.tsx      # Piece visuals
│   ├── MoveHistory.tsx    # 戰記 game log
│   ├── StartScreen.tsx    # Mode/faction/difficulty selection
│   └── BingshuDialog.tsx  # In-game rulebook
└── pages/
    └── Index.tsx     # Game page
```

---

## Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build
bun run build
```

---

## How it was built

Started with Lovable AI to prototype the UI and board layout. When the AI credit ran out, exported the project to GitHub and continued locally using Claude and Cursor — implementing the complete game engine from scratch: move validation, piece transformation state machine, three-fold repetition detection, stalemate detection, and all three AI difficulty levels.

The piece artwork was created in Canva using layered assets to produce a raised 3D coin effect, then exported and embedded as images.
