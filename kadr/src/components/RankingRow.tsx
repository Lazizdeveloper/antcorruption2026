import { CheckCircle2, Lock } from 'lucide-react';

interface RankingRowProps {
  blocked?: boolean;
  isYou?: boolean;
  name: string;
  rank: number;
  score: number;
}

export function RankingRow({ blocked, isYou, name, rank, score }: RankingRowProps) {
  return (
    <div className={`flex flex-col items-start gap-4 rounded-2xl border p-5 transition-all sm:flex-row sm:items-center sm:gap-6 ${
      isYou ? 'bg-emerald-600/10 border-emerald-500/30 shadow-[0_0_20px_rgba(5,150,105,0.05)]' : 'bg-zinc-900/20 border-zinc-800/50'
    }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
        rank <= 3 ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(5,150,105,0.2)]' : 'bg-zinc-800/50 text-zinc-700'
      }`}>
        #{rank}
      </div>
      <div className="flex-1">
        <p className={`font-bold transition-colors ${isYou ? 'text-emerald-400' : 'text-zinc-400'}`}>
          {name} {isYou ? <span className="text-[10px] border border-emerald-500/30 text-emerald-500/80 px-2 py-0.5 rounded ml-2 uppercase tracking-tighter font-bold">Sizning balingiz</span> : null}
        </p>
        <p className="text-[10px] text-zinc-600 font-mono mt-1 uppercase tracking-widest font-medium">Kompetentsiya indeksi: {score}/100</p>
      </div>
      <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-start sm:gap-6">
        <div className="text-left sm:text-right">
          <p className={`text-2xl font-light ${isYou ? 'text-emerald-400' : 'text-zinc-500'}`}>{score}</p>
        </div>
        {blocked ? (
          <div className="bg-red-900/20 text-red-600 p-2 rounded-lg border border-red-900/30" title="Blocked by integrity logic">
            <Lock size={18} />
          </div>
        ) : rank <= 3 ? (
          <div className="bg-emerald-950/30 text-emerald-600 p-2 rounded-lg border border-emerald-900/30" title="Selection authorized">
            <CheckCircle2 size={18} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
