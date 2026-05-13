import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScrollText, Sword, ShieldAlert, Trophy } from 'lucide-react';

/* 嚴格根據《赤壁：天塹棋》規則全文同步 */
const rules = [
  {
    title: '【統帥】都 / 丞',
    move: '直線四方向 1 格。',
    eat: '同移動。',
    limit: '不可進入「長江天塹」。',
  },
  {
    title: '【軍師】謀 / 祭',
    move: '直線或斜線八方向 1 格。',
    eat: '同移動。',
  },
  {
    title: '【舟師】督 / 尉',
    move: '直線四方向 1 格。',
    eat: '同移動。',
    special: '當進入「長江天塹」時，觸發 (啟航)，型態變換為【戰船】。',
  },
  {
    title: '【戰船】舸 / 艨',
    move: '直線或斜線八方向 1～2 格。',
    eat: '同移動。',
    limit: '不可跳過棋子。',
    special: '當離開「長江天塹」時，觸發 (登岸)，型態還原為【舟師】。',
  },
  {
    title: '【驍騎】突 / 豹',
    move: 'L 型跳躍。',
    eat: '同移動。',
  },
  {
    title: '【攻械】火 / 霹',
    move: '直線四方向 1 格。',
    eat: '直線四方向無限距離，但必須跳過一枚棋子（稱為「炮架」）才能吃掉目標。',
  },
  {
    title: '【部曲】丹 / 青',
    move: '向前 1 格，首次移動可選擇向前 2 格。',
    eat: '斜前 1 格。',
    limit: '不可跳過棋子。',
    special: '1. 進入敵方「江線」觸發 (橫江)，永久解鎖左右各 1 格移動能力。\n2. 抵達敵方「底線」觸發 (晉位)，立即變更身分為【豪傑 / 梟雄】。',
  },
  {
    title: '【豪傑 / 梟雄】豪 / 梟',
    move: '直線或斜線八方向 1～2 格（一般移動不可跳過棋子）。',
    eat: '1. 同移動。\n2. 若目標格距離兩格，且中間有一枚棋子，可跳過該子吃掉目標，觸發 (躍擊)。',
  },
];

const logicRules = [
  { label: '王不見王', detail: '棋子移動後，若導致雙方【統帥】位於同一縱列且中間無任何棋子阻隔，視為非法移動。' },
  { label: '自陷將軍', detail: '棋子移動後，若使己方【統帥】處於被攻擊狀態，該步法視為非法移動。' },
  { label: '禁止跳過回合', detail: '玩家於自己回合必須執行一次合法移動，不得放棄行棋。' },
  { label: '投誠', detail: '任一方可於己方回合宣布投降，該局立即判負。' },
];

const victoryConditions = [
  {
    label: '絕殺',
    tag: '勝負',
    detail: '當一方【統帥】受到攻擊（將軍），且無法透過移動、阻擋或吃子解除威脅，對局立即結束，發動絕殺方獲勝。',
  },
  {
    label: '困斃',
    tag: '勝負',
    detail: '若當前行棋方之【統帥】未受攻擊，但全軍已無任何合法步法可走，由「欠行方」判負。',
  },
  {
    label: '議和',
    tag: '和局',
    detail: '若同一對局中，完全相同之局面（包含所有棋子位置、行棋方與可執行之特殊能力狀態）出現三次，判定和局。',
  },
  {
    label: '罷戰',
    tag: '和局',
    detail: '若盤面殘餘子力足以判定雙方皆無法達成「將死」條件（如僅剩統帥對統帥，或統帥＋單攻械對統帥），立即判定和局。',
  },
];

// 先後手說明
const setupNote = '紅方（孫劉聯軍／下位）具備先手優勢，黑方（曹操軍／上位）為後手應對。';

export function BingshuDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-amber-950/20 border-amber-900/40 text-amber-200 hover:bg-amber-900/40 hover:text-amber-100 transition-all duration-300"
        >
          <ScrollText className="w-4 h-4 mr-2 text-amber-500" />
          兵書
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md bg-[#0a0a0a] border-amber-900/40 text-zinc-100 shadow-2xl">
        <DialogHeader className="border-b border-amber-900/20 pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-serif tracking-[0.2em] text-amber-500">
            <ScrollText className="w-6 h-6" />
            赤壁：天塹棋 兵書
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] mt-4 pr-4">
          <div className="space-y-8 text-zinc-300">

            {/* 先後手說明 */}
            <p className="text-[12px] text-zinc-400 leading-relaxed bg-zinc-900/60 px-3 py-2 rounded border border-white/5">
              {setupNote}
            </p>

            {/* 基本走法 */}
            <section>
              <h4 className="flex items-center gap-2 text-xs font-black text-amber-500 uppercase tracking-widest mb-4">
                <Sword className="w-3.5 h-3.5" /> 基本走法
              </h4>
              <div className="space-y-5">
                {rules.map((r, i) => (
                  <div key={i} className="border-l-2 border-amber-800/50 pl-4 space-y-1.5">
                    <h5 className="text-sm font-bold text-amber-300">{r.title}</h5>
                    <div className="space-y-1 text-[12.5px] leading-relaxed">
                      <p>
                        <span className="text-amber-700 mr-1.5">移動</span>
                        <span className="text-zinc-300">{r.move}</span>
                      </p>
                      <p>
                        <span className="text-amber-700 mr-1.5">吃子</span>
                        <span className="text-zinc-300">{r.eat}</span>
                      </p>
                      {r.limit && (
                        <p>
                          <span className="text-red-400/80 mr-1.5">限制</span>
                          <span className="text-red-300/90">{r.limit}</span>
                        </p>
                      )}
                      {r.special && (
                        <p className="text-amber-300 bg-amber-950/30 px-2 py-1.5 rounded mt-1 border border-amber-900/20 whitespace-pre-line">
                          <span className="font-bold text-amber-400">特殊　</span>{r.special}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 行棋細則 */}
            <section className="bg-zinc-900/50 p-4 rounded-lg border border-white/5">
              <h4 className="flex items-center gap-2 text-xs font-black text-red-400 uppercase tracking-widest mb-3">
                <ShieldAlert className="w-3.5 h-3.5" /> 行棋細則
              </h4>
              <div className="space-y-3">
                {logicRules.map((l, i) => (
                  <div key={i}>
                    <span className="text-[12.5px] font-bold text-amber-300">【{l.label}】</span>
                    <p className="text-[12px] text-zinc-400 mt-0.5 leading-relaxed">{l.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 終局判定 */}
            <section>
              <h4 className="flex items-center gap-2 text-xs font-black text-blue-400 uppercase tracking-widest mb-3">
                <Trophy className="w-3.5 h-3.5" /> 終局判定
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {victoryConditions.map((v, i) => (
                  <div key={i} className="bg-zinc-900/60 px-3 py-2.5 rounded border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12.5px] font-bold text-amber-300">【{v.label}】</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wide ${
                        v.tag === '和局'
                          ? 'bg-blue-900/40 text-blue-300 border border-blue-800/40'
                          : 'bg-red-900/30 text-red-300 border border-red-800/30'
                      }`}>{v.tag}</span>
                    </div>
                    <p className="text-[12px] text-zinc-400 leading-relaxed">{v.detail}</p>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </ScrollArea>

        <div className="mt-4 pt-4 border-t border-amber-900/20 flex justify-center">
          <p className="text-[10px] text-amber-900/60 font-serif italic tracking-widest uppercase">
            Chibi: The Natural Barrier
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}