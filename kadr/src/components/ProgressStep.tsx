import { CheckCircle2 } from 'lucide-react';
import { ReactNode } from 'react';

interface ProgressStepProps {
  active: boolean;
  done: boolean;
  icon: ReactNode;
  label: string;
}

export function ProgressStep({ active, done, icon, label }: ProgressStepProps) {
  return (
    <div className="flex flex-col items-center gap-3 relative">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
        done ? 'bg-emerald-600 border-emerald-600 text-black shadow-[0_0_20px_rgba(5,150,105,0.3)]' :
        active ? 'bg-[#080808] border-emerald-500/50 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
        'bg-[#080808] border-zinc-800/50 text-zinc-800'
      }`}>
        {done ? <CheckCircle2 size={24} /> : icon}
      </div>
      <p className={`text-[10px] uppercase font-bold tracking-widest ${active || done ? 'text-zinc-400' : 'text-zinc-800'}`}>{label}</p>
    </div>
  );
}
