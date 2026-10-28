import { useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollText, Waves, Trophy } from 'lucide-react';

type Diagram = 'orthogonal' | 'adjacent' | 'long' | 'knight' | 'pawn' | 'siege';
const units: { name: string; chars: string; images: string[]; diagram: Diagram; move: string; capture?: string; note?: string }[] = [
  { name: '統帥', chars: '都／丞', images: ['r_du', 'b_cheng'], diagram: 'orthogonal', move: '上下左右走 1 格，吃子也相同。', note: '不能進入長江水域，也不能走到會被攻擊的位置。' },
  { name: '軍師', chars: '謀／祭', images: ['r_mou', 'b_ji'], diagram: 'adjacent', move: '上下左右、斜向都能走 1 格，吃子也相同。' },
  { name: '舟師', chars: '督／尉', images: ['r_du_shui', 'b_wei'], diagram: 'orthogonal', move: '在陸地上下左右走 1 格，吃子也相同。', note: '進入第 4～7 列水域後，立即變為戰船（啟航）。' },
  { name: '戰船', chars: '舸／艨', images: ['r_ge', 'b_meng'], diagram: 'long', move: '沿上下左右或斜線走 1～2 格，吃子也相同；不能越過其他棋子。', note: '走出水域後還原為舟師（登岸）。走法由出發時的形態決定。' },
  { name: '驍騎', chars: '突／豹', images: ['r_tu', 'b_bao'], diagram: 'knight', move: '走 L 形：一個方向 2 格，再垂直轉 1 格。吃子也相同。', note: '可以跳過棋子，沒有「蹩馬腿」限制。' },
  { name: '攻械', chars: '火／霹', images: ['r_huo', 'b_pi'], diagram: 'siege', move: '上下左右走 1 格，只能走到空格。', capture: '沿同一直線，隔著恰好 1 枚棋子吃掉敵子，距離不限。', note: '中間那枚是「炮架」，敵我皆可；不能不隔子吃，也不能隔兩枚以上。' },
  { name: '部曲', chars: '丹／青', images: ['r_dan', 'b_qing'], diagram: 'pawn', move: '向前走 1 格；第一次移動可走 2 格，沿途必須是空格。', capture: '只吃斜前方 1 格的敵子，不能直走吃子。', note: '紅方向第 10 列前進，黑方向第 1 列前進。抵達敵方江線後，可永久左右移動 1 格，但橫移不能吃子；抵達敵方底線後升變。' },
  { name: '豪傑／梟雄', chars: '豪／梟', images: ['r_hao', 'b_xiao'], diagram: 'long', move: '部曲升變後，沿上下左右或斜線走 1～2 格，吃子也相同。', capture: '目標相距 2 格時，還能跳過中間恰好 1 枚棋子吃掉敵子（躍擊）。', note: '只有吃子能跳；走到空格時不能越子。' },
];

function MoveDiagram({ kind }: { kind: Diagram }) {
  return <figure className="w-[100px] shrink-0 text-center">
    <svg viewBox="0 0 100 100" role="img" aria-label={kind === 'pawn' ? '部曲走法：向前移動、斜前吃子，以紅方向上為例' : '空棋盤上的基本移動範圍，中心為棋子，藍點為可移動格'}>
      {Array.from({ length: 25 }, (_, i) => {
        const x = i % 5 - 2, y = Math.floor(i / 5) - 2;
        const ax = Math.abs(x), ay = Math.abs(y);
        const allowed = kind === 'orthogonal' || kind === 'siege' ? ax + ay === 1 :
          kind === 'adjacent' ? Math.max(ax, ay) === 1 :
          kind === 'long' ? (x === 0 || y === 0 || ax === ay) && ax + ay > 0 :
          kind === 'knight' ? ax * ay === 2 : x === 0 && y === -1;
        const capture = kind === 'pawn' && ax === 1 && y === -1;
        return <g key={i}>
          <rect x={(x + 2) * 20 + 1} y={(y + 2) * 20 + 1} width="18" height="18" rx="2" fill={capture ? '#713c34' : allowed ? '#46616a' : '#282923'} />
          {allowed && <circle cx={(x + 2) * 20 + 10} cy={(y + 2) * 20 + 10} r="3" fill="#a9d9dd" />}
          {capture && <path d={`M${(x + 2) * 20 + 7},${(y + 2) * 20 + 7}l6,6m0,-6l-6,6`} stroke="#efb2a7" strokeWidth="1.5" />}
        </g>;
      })}
      <circle cx="50" cy="50" r="7" fill="#d5b47a" /><circle cx="50" cy="50" r="4" fill="none" stroke="#342b20" />
    </svg>
    <figcaption className="mt-1 text-[11px] text-[#a8a99f]">{kind === 'pawn' ? '藍點移動・紅叉吃子' : '藍點為基本移動格'}</figcaption>
  </figure>;
}

function BoardGuide() {
  return <figure className="mx-auto w-full max-w-[240px]" aria-label="棋盤示意：8 欄 10 列，第 4 到 7 列為長江水域">
    <div className="mb-1 grid grid-cols-8 pl-6 text-center text-xs text-[#bdb5a6]">{'ABCDEFGH'.split('').map(c => <span key={c}>{c}</span>)}</div>
    {Array.from({ length: 10 }, (_, i) => 10 - i).map(row => <div key={row} className="flex h-5 items-center gap-2">
      <span className="w-4 text-right text-[11px] text-[#bdb5a6]">{row}</span>
      <div className={`relative grid h-full flex-1 grid-cols-8 ${row >= 4 && row <= 7 ? 'bg-[#355761]' : 'bg-[#746047]'}`}>
        {Array.from({ length: 8 }, (_, col) => <span key={col} className="border-b border-r border-black/20" />)}
        {[10, 6, 5, 1].includes(row) && <span className="absolute inset-0 text-center text-[10px] leading-5 text-white/90">{row === 10 ? '黑方底線' : row === 1 ? '紅方底線' : row === 6 ? '紅方部曲橫移解鎖線' : '黑方部曲橫移解鎖線'}</span>}
      </div>
    </div>)}
    <figcaption className="mt-2 text-center text-xs text-[#bdb5a6]">紅方由下往上，黑方由上往下</figcaption>
  </figure>;
}

export function BingshuDialog() {
  const body = useRef<HTMLDivElement>(null);
  return <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline" size="sm" className="border-amber-900/40 bg-amber-950/20 text-amber-200 hover:bg-amber-900/40 hover:text-amber-100">
        <ScrollText className="mr-2 h-4 w-4" />兵書
      </Button>
    </DialogTrigger>
    <DialogContent className="rulebook flex h-[min(86dvh,800px)] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-xl border-[#756044]/60 bg-[#191c18] p-0 text-[#eee9dd] shadow-2xl">
      <DialogHeader className="shrink-0 border-b border-white/10 px-5 pb-4 pt-6 text-left sm:px-8">
        <p className="text-xs tracking-[0.25em] text-[#d5b47a]">赤壁：天塹棋</p>
        <DialogTitle className="pt-1 font-serif text-2xl tracking-wider">兵書 <span className="ml-2 font-sans text-sm font-normal tracking-normal text-[#bdb5a6]">遊戲規則</span></DialogTitle>
        <DialogDescription className="pt-1 text-sm text-[#bdb5a6]">先學會出手，再掌握渡江與制勝之道。</DialogDescription>
      </DialogHeader>
      <Tabs defaultValue="start" onValueChange={() => { if (body.current) body.current.scrollTop = 0; }} className="flex min-h-0 flex-1 flex-col">
        <TabsList aria-label="規則分類" className="mx-4 my-3 grid h-11 shrink-0 grid-cols-3 bg-black/20 sm:mx-8">
          <TabsTrigger value="start" className="rulebook-tab">快速上手</TabsTrigger>
          <TabsTrigger value="pieces" className="rulebook-tab">棋子走法</TabsTrigger>
          <TabsTrigger value="advanced" className="rulebook-tab">進階規則</TabsTrigger>
        </TabsList>
        <div ref={body} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-7 sm:px-8">
          <TabsContent value="start" className="space-y-6">
            <section className="rounded-lg border border-[#d5b47a]/25 bg-[#d5b47a]/5 p-4 sm:p-5">
              <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-[#edcf98]"><Trophy className="h-5 w-5" />讓對手無棋可走</h3>
              <p>將軍後，對手無法解除威脅，就是<strong>將死（絕殺）</strong>。即使沒有被將軍，只要輪到對手時沒有任何合法走法，對手也會輸（困斃）。</p>
              <p className="mt-2 text-sm text-[#bdb5a6]">目標是將死統帥，不是實際吃掉統帥。對手投降也算獲勝。</p>
            </section>
            <div className="grid gap-6 sm:grid-cols-2 sm:items-start">
              <section>
                <h3 className="mb-3 text-lg font-semibold text-[#edcf98]">一回合，一步棋</h3>
                <ol className="space-y-3">
                  <li><span className="rulebook-step">1</span>紅方孫劉聯軍先走，黑方曹軍後走，雙方輪流。</li>
                  <li><span className="rulebook-step">2</span>點選己方棋子，再點選標示出的合法目標格。</li>
                  <li><span className="rulebook-step">3</span>移到敵子所在格即可吃子；部曲與攻械有特殊吃法。</li>
                </ol>
                <p className="mt-4 rounded-md bg-black/20 p-3 text-sm text-[#bdb5a6]">被將軍時，下一步必須解除威脅；任何時候都不能讓自己的統帥受攻擊。</p>
              </section>
              <BoardGuide />
            </div>
            <section className="rounded-lg border border-sky-200/15 bg-sky-200/5 p-4">
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-sky-100"><Waves className="h-5 w-5" />長江讓戰局改變</h3>
              <p>棋盤有 8 欄、10 列，<strong>第 4～7 列都是水域</strong>。舟師入水變戰船，統帥不能入水；其他棋子仍可通行。</p>
              <p className="mt-2">部曲抵達敵方江線後能左右移動，抵達敵方底線則升變為豪傑或梟雄。</p>
            </section>
            <p className="text-sm text-[#bdb5a6]">各棋子的移動範圍，請看「棋子走法」。</p>
          </TabsContent>
          <TabsContent value="pieces" className="space-y-3">
            <p className="mb-4 text-sm text-[#bdb5a6]">示意圖以空棋盤為例；實際走法還要避開己方棋子，並確保統帥安全。</p>
            {units.map(unit => <article key={unit.name} className="rounded-lg border border-white/10 bg-white/[0.025] p-4 sm:p-5">
              <header className="mb-3 flex items-center gap-3">
                <div className="flex shrink-0 -space-x-1">{unit.images.map((image, i) => <img key={image} src={`${import.meta.env.BASE_URL}pieces/${image}.png`} alt={`${i === 0 ? '紅' : '黑'}方${unit.name}`} className="h-10 w-10 object-contain" loading="lazy" />)}</div>
                <h3 className="font-semibold text-[#edcf98]">{unit.name}<span className="ml-2 text-sm font-normal text-[#bdb5a6]">{unit.chars}</span></h3>
              </header>
              <div className="flex items-start gap-4 sm:gap-6">
                <MoveDiagram kind={unit.diagram} />
                <div className="min-w-0 flex-1 space-y-2 text-sm">
                  <p><span className="mr-2 font-semibold text-[#d5b47a]">移動</span>{unit.move}</p>
                  {unit.capture && <p><span className="mr-2 font-semibold text-[#e4aa99]">吃子</span>{unit.capture}</p>}
                </div>
              </div>
              {unit.note && <p className="mt-3 border-t border-white/10 pt-3 text-sm text-[#c7c6b9]">{unit.note}</p>}
            </article>)}
          </TabsContent>
          <TabsContent value="advanced" className="space-y-6">
            <section><h3 className="rulebook-heading">渡江與升變</h3>
              <dl className="rulebook-definitions">
                <div><dt>啟航／登岸</dt><dd>舟師進入第 4～7 列變戰船，離開後還原。是否能走 2 格，依出發時的形態判定。</dd></div>
                <div><dt>橫江</dt><dd>紅方部曲抵達第 6 列、黑方抵達第 5 列後，永久解鎖左右各 1 格的空格移動；斜前吃子的方式不變。</dd></div>
                <div><dt>晉位</dt><dd>紅方部曲抵達第 10 列變豪傑，黑方抵達第 1 列變梟雄，立即獲得新走法。</dd></div>
                <div><dt>躍擊</dt><dd>豪傑／梟雄可沿直線或斜線，跳過中間 1 枚敵方或己方棋子，吃掉相距 2 格的敵子。</dd></div>
              </dl>
            </section>
            <section><h3 className="rulebook-heading">哪些步不能走？</h3>
              <ul className="list-disc space-y-2 pl-5 marker:text-[#d5b47a]">
                <li>不能讓己方統帥受到攻擊；被將軍時必須先解除威脅。</li>
                <li>兩名統帥不能在同一欄直接相對，中間必須有棋子阻隔。</li>
                <li>不能走到己方棋子所在格，也不能跳過自己的回合。</li>
              </ul>
            </section>
            <section><h3 className="rulebook-heading">勝負與和局</h3>
              <dl className="rulebook-definitions">
                <div><dt>將死・絕殺</dt><dd>統帥被將軍，且全軍沒有任何合法走法能解除威脅，該方判負。</dd></div>
                <div><dt>無棋可走・困斃</dt><dd>沒有被將軍，但輪到行棋時全軍沒有合法走法，該方仍然判負。</dd></div>
                <div><dt>投降・投誠</dt><dd>可在自己的回合選擇投降，對手立即獲勝。</dd></div>
                <div><dt>三次重複・議和</dt><dd>同一局面出現三次，系統判和。棋子位置、輪到哪方行棋，以及部曲的橫移能力，都會影響是否為相同局面的判定。</dd></div>
                <div><dt>無法將死・罷戰</dt><dd>系統會對已辨識的無法將死局面自動判和，例如只剩統帥對統帥，或統帥加一枚攻械對統帥。</dd></div>
              </dl>
            </section>
          </TabsContent>
        </div>
      </Tabs>
      <footer className="shrink-0 border-t border-white/10 px-5 py-3 text-xs text-[#bdb5a6] sm:px-8">遊戲為赤壁題材的原創棋類；棋子能力與勝負規則以本遊戲為準。</footer>
    </DialogContent>
  </Dialog>;
}
