import { cn } from '../lib/utils';

interface StatCardProps {
  color?: string;
  label: string;
  subLabel?: string;
  trend?: string;
  value: number | string;
}

export function StatCard({
  color = 'text-slate-100',
  label,
  subLabel,
  trend,
  value,
}: StatCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded shadow-sm">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
      <div className={cn('text-2xl font-black mt-1 tracking-tighter', color)}>{value}</div>
      {trend ? <div className="text-[10px] text-emerald-500 mt-1 font-bold">{trend}</div> : null}
      {subLabel ? <div className="text-[10px] text-slate-500 mt-1">{subLabel}</div> : null}
    </div>
  );
}
