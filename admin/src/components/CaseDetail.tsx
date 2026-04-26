import { useState } from 'react';
import { CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Case } from '../types';

interface CaseDetailProps {
  caseItem: Case;
  onClose: () => void;
  onReport: (caseItem: Case) => Promise<void>;
}

export function CaseDetail({ caseItem, onClose, onReport }: CaseDetailProps) {
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const handleReport = async () => {
    setReportError(null);
    setReporting(true);

    try {
      await onReport(caseItem);
      setReported(true);
      setTimeout(() => setReported(false), 3000);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Report yuborilmadi');
    } finally {
      setReporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-full overflow-y-auto border-l border-zinc-800 p-5 shadow-2xl glass-panel sm:max-w-sm sm:p-8"
    >
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl serif-title text-gold font-bold">Holat tafsilotlari</h2>
        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
          <ChevronRight />
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Holat nomi</label>
          <p className="text-lg font-medium text-zinc-100">{caseItem.name}</p>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Tashkilot</label>
          <p className="text-zinc-300">{caseItem.organization}</p>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 block mb-2">
            Halollik xavfi indeksi
          </label>
          <div className="flex items-center gap-3">
            <div className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  caseItem.riskScore > 75
                    ? 'bg-red-500'
                    : caseItem.riskScore > 40
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${caseItem.riskScore}%` }}
              />
            </div>
            <span className="font-mono text-xs text-zinc-100">{caseItem.riskScore}/100</span>
          </div>
        </div>

        <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50 mt-8">
          <h4 className="text-[11px] font-bold text-gold uppercase tracking-widest mb-3">
            Batafsil tahlil
          </h4>
          <ul className="space-y-3">
            {caseItem.anomalies.map((anomaly, index) => (
              <li key={index} className="flex items-start gap-2 text-xs text-zinc-400 leading-relaxed">
                <div className="w-1 h-1 rounded-full bg-gold/50 mt-1.5 flex-shrink-0" />
                {anomaly}
              </li>
            ))}
            {caseItem.anomalies.length === 0 && (
              <li className="text-xs text-zinc-500 italic">Tarixiy anomaliyalar qayd etilmagan.</li>
            )}
          </ul>
        </div>

        <div className="pt-8 border-t border-zinc-800">
          <button
            onClick={handleReport}
            disabled={reporting || reported}
            className={`w-full py-2.5 rounded text-[10px] uppercase tracking-widest font-bold transition-all border ${
              reported
                ? 'bg-emerald-900/20 border-emerald-500 text-emerald-500'
                : 'border-gold text-gold hover:bg-gold hover:text-black'
            }`}
          >
            {reporting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Xabar yuborilmoqda...
              </span>
            ) : reported ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 size={14} />
                Xabar yuborildi
              </span>
            ) : (
              'KAK Agentligiga xabar berish'
            )}
          </button>
          {reportError && <p className="mt-3 text-[10px] text-red-400">{reportError}</p>}
        </div>
      </div>
    </motion.div>
  );
}
