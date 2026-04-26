import { ReactNode } from 'react';

interface SidebarItemProps {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

export function SidebarItem({ active, icon, label, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-6 py-4 rounded-xl transition-all duration-300 group border border-transparent ${
        active
          ? 'bg-emerald-500/10 text-emerald-400 font-bold border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
          : 'text-white/40 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className={`${active ? 'text-emerald-400' : 'text-white/20 group-hover:text-white/60'} transition-transform`}>{icon}</span>
      <span className="text-sm tracking-wide">{label}</span>
    </button>
  );
}
