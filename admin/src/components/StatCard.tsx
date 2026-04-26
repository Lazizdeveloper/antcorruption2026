import { ComponentType } from 'react';
import { motion } from 'motion/react';

interface StatCardProps {
  color: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  title: string;
  trend?: string;
  value: number | string;
}

export function StatCard({ color, icon: Icon, title, trend, value }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="glass-panel p-4 sm:p-6 rounded-xl stat-card flex flex-col"
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-zinc-500">{title}</p>
        <Icon size={16} className="text-zinc-500 sm:w-[18px] sm:h-[18px]" />
      </div>
      <h3 className={`text-2xl sm:text-3xl serif-title font-medium ${color}`}>{value}</h3>
      {trend ? <p className="text-[9px] sm:text-[10px] mt-2 text-zinc-400">{trend}</p> : null}
    </motion.div>
  );
}
