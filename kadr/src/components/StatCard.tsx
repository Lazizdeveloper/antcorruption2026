import { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  title: string;
  trend: string;
  value: string;
}

export function StatCard({ icon, title, trend, value }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-zinc-800/50 bg-[#080808] p-5 shadow-sm transition-all hover:bg-zinc-800/50 sm:flex sm:items-center sm:gap-6 sm:p-6">
      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full pointer-events-none"></div>
      <div className="mb-4 w-fit rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-4 transition-transform group-hover:scale-110 sm:mb-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-1">{title}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline">
          <h4 className="text-2xl font-bold text-zinc-300">{value}</h4>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trend.includes('Toza') || trend.includes('Tasdiqlangan') ? 'text-emerald-500/80 bg-emerald-500/10 border border-emerald-500/10' : 'text-zinc-600 bg-zinc-800/30'}`}>{trend}</span>
        </div>
      </div>
    </div>
  );
}
