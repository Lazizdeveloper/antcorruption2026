import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Loader2, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { Candidate } from '../types';
import { PersonDetail } from './PersonDetail';
import { formatHiringAlertReason } from '../lib/integrity';

interface SelectionReportProps {
  result: {
    type: 'error' | 'success';
    message: string;
    candidate: Candidate;
  };
  onClose: () => void;
  onExport: () => Promise<void>;
  onReport: (result: {
    type: 'error' | 'success';
    message: string;
    candidate: Candidate;
  }) => Promise<void>;
}

function formatAlertTime(value: string) {
  return new Date(value).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SelectionReport({
  result,
  onClose,
  onExport,
  onReport,
}: SelectionReportProps) {
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const hiringAlert = result.candidate.hiringAlert;
  const alertReason = hiringAlert ? formatHiringAlertReason(result.candidate) : null;

  const handleReport = async () => {
    setReportError(null);
    setReporting(true);

    try {
      await onReport(result);
      setReported(true);
      setTimeout(() => {
        setReported(false);
        onClose();
      }, 2000);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Report yuborilmadi');
    } finally {
      setReporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed inset-0 z-50 m-auto flex h-fit max-h-[90vh] w-[calc(100vw-2rem)] max-w-[500px] flex-col overflow-y-auto rounded-2xl border border-zinc-800 p-5 shadow-[0_0_50px_rgba(0,0,0,0.8)] glass-panel sm:w-[90%] sm:p-8"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${result.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
            <ShieldAlert size={20} />
          </div>
          <h2 className="text-xl serif-title text-zinc-100 font-bold uppercase tracking-tight">
            Halollik hisoboti
          </h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500">
          <ChevronRight className="rotate-90" />
        </button>
      </div>

      <div className="space-y-6 flex-1">
        <div className={`p-4 rounded-lg border ${result.type === 'error' ? 'bg-red-950/20 border-red-900/50' : 'bg-emerald-950/20 border-emerald-900/50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className={result.type === 'error' ? 'text-red-500' : 'text-emerald-500'} />
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${result.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
              {result.type === 'error' ? 'Blokirovka faollashdi' : 'Halollik tasdiqlandi'}
            </span>
          </div>
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">{result.message}</p>
          {hiringAlert && (
            <p className="text-[11px] text-red-300 mt-3">Alert vaqti: {formatAlertTime(hiringAlert.createdAt)}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
            <p className="text-[10px] uppercase text-zinc-500 tracking-widest mb-1">Nomzod ID</p>
            <p className="text-sm font-mono text-gold">#{result.candidate.id}</p>
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
            <p className="text-[10px] uppercase text-zinc-500 tracking-widest mb-1">Nomzod</p>
            <p className="text-[11px] font-bold text-zinc-100 truncate">{result.candidate.candidateName}</p>
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
            <p className="text-[10px] uppercase text-zinc-500 tracking-widest mb-1">Vazirlik bo'limi</p>
            <p className="text-[11px] font-bold text-zinc-100 truncate">{result.candidate.department}</p>
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
            <p className="text-[10px] uppercase text-zinc-500 tracking-widest mb-1">Lavozim</p>
            <p className="text-[11px] font-bold text-zinc-100 truncate">{result.candidate.position}</p>
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 col-span-2">
            <p className="text-[10px] uppercase text-zinc-500 tracking-widest mb-1">Vakolat balli</p>
            <p className="text-sm font-bold text-zinc-100">{result.candidate.score}/100</p>
          </div>
        </div>

        <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
          <p className="text-[10px] uppercase text-zinc-500 tracking-widest mb-3 font-bold">
            Xavf omillari & Aloqalar
          </p>
          <div className="space-y-3">
            {hiringAlert && (
              <div className="flex flex-col gap-1 text-[11px] sm:flex-row sm:items-center sm:justify-between">
                <span className="text-zinc-500">Admin alert sababi:</span>
                <span className="text-red-400 font-bold text-right">{alertReason}</span>
              </div>
            )}
            <div className="flex flex-col gap-1 text-[11px] sm:flex-row sm:items-center sm:justify-between">
              <span className="text-zinc-500">Qarindoshlik aloqasi:</span>
              <span className={result.candidate.conflictRisk === 'High' ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                {result.candidate.conflictRisk === 'High' ? 'Aniqlangan' : 'Mavjud emas'}
              </span>
            </div>
            {hiringAlert && (
              <div className="flex flex-col gap-1 text-[11px] sm:flex-row sm:items-center sm:justify-between">
                <span className="text-zinc-500">AI ball holati:</span>
                <span className={hiringAlert.riskFlags?.lowAiScore ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {hiringAlert.riskFlags?.lowAiScore ? `Qizil (${hiringAlert.aiScore ?? result.candidate.score}/100)` : `Normal (${hiringAlert.aiScore ?? result.candidate.score}/100)`}
                </span>
              </div>
            )}
            {hiringAlert && (
              <div className="flex flex-col gap-1 text-[11px] sm:flex-row sm:items-center sm:justify-between">
                <span className="text-zinc-500">Audit holati:</span>
                <span className={hiringAlert.auditStatus === 'CONFLICT' ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {hiringAlert.auditStatus ?? (result.candidate.conflictRisk === 'High' ? 'CONFLICT' : 'CLEAN')}
                </span>
              </div>
            )}
            <div className="p-3 bg-zinc-950/50 rounded border border-zinc-800/50 italic text-[11px] text-zinc-400 leading-relaxed">
              {result.candidate.conflictDetails ||
                (hiringAlert?.riskFlags?.lowAiScore
                  ? `AI ball qizil: ${hiringAlert.aiScore ?? result.candidate.score}/100.`
                  : "Nomzodning hech qaysi qarindoshi ushbu tashkilotda faoliyat yuritmaydi.")}
            </div>
          </div>
        </div>

        {hiringAlert && (
          <div className="grid grid-cols-1 gap-4">
            <PersonDetail label="HR ma'lumotlari" person={hiringAlert.hr} />
            <PersonDetail label="Qabul qilingan nomzod" person={hiringAlert.candidate} />
            <div className="bg-red-950/20 p-4 rounded-lg border border-red-900/40">
              <p className="text-[10px] uppercase tracking-widest text-red-300 mb-2">Admin alert matni</p>
              <p className="text-[11px] text-zinc-300 whitespace-pre-line">{hiringAlert.message}</p>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-zinc-800 flex flex-col gap-3">
          {result.type === 'error' ? (
            <button
              onClick={handleReport}
              disabled={reporting || reported}
              className={`w-full py-3 rounded text-[10px] uppercase tracking-widest font-bold transition-all border flex items-center justify-center gap-2 ${
                reported
                  ? 'bg-red-900/40 border-red-500 text-red-500'
                  : 'bg-red-600 border-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20'
              }`}
            >
              {reporting ? <Loader2 size={14} className="animate-spin" /> : reported ? <CheckCircle2 size={14} /> : null}
              {reporting ? 'Yuborilmoqda...' : reported ? 'Habar yuborildi' : 'Agentlikka xabar berish'}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 rounded text-[10px] uppercase tracking-widest font-bold transition-all border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Zaxiraga olishni tasdiqlash
            </button>
          )}

          {reportError && <p className="text-[10px] text-red-400">{reportError}</p>}

          <button
            onClick={onExport}
            className="w-full py-3 rounded text-[10px] uppercase tracking-widest font-bold transition-all border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Hisobotni yuklab olish (.CSV)
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </motion.div>
  );
}
