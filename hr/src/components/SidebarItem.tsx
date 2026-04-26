import { ComponentType } from 'react';
import { cn } from '../lib/utils';

interface SidebarItemProps {
  active: boolean;
  icon: ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
}

export function SidebarItem({ active, icon: Icon, label, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-6 py-2 transition-all text-sm font-medium',
        active
          ? 'bg-emerald-600/10 border-l-4 border-emerald-500 text-emerald-400'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200',
      )}
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}
