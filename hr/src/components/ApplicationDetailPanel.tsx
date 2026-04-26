import { ArrowUpRight, FileText, Fingerprint, Phone, Send, ShieldAlert, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Application } from '../types';
import { cn } from '../lib/utils';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  diploma: "Oliy ma'lumot diplomi",
  certificate: 'Ilmiy unvon / Sertifikat',
  employment: 'Ish staji (E-Mehnat)',
  resume: 'Rezyume / CV',
};

function getDocumentLabel(type: string) {
  return DOCUMENT_TYPE_LABELS[type] ?? type;
}

function isViewableDocumentUrl(url?: string) {
  if (!url) {
    return false;
  }

  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
}

function isLegacyDocumentUrl(url?: string) {
  return String(url ?? '').startsWith('uploaded://');
}

interface ApplicationDetailPanelProps {
  application: Application;
  onClose: () => void;
  onUpdateStatus: (applicationId: string, status: Application['status']) => void;
}

export function ApplicationDetailPanel({
  application,
  onClose,
  onUpdateStatus,
}: ApplicationDetailPanelProps) {
  return (
    <>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-[4px] z-[60]"
      />
      <motion.div
        key="panel"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-full flex-col border-l border-slate-800 bg-slate-900 font-mono shadow-2xl sm:max-w-lg"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-950 p-4 text-white sm:p-6">
          <div>
            <h3 className={cn(application.status !== 'hired' && 'blur-[10px]', 'text-sm font-black uppercase tracking-tighter')}>
              {application.candidateName}
            </h3>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{application.position}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <XCircle size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 p-4 sm:p-6">
          {application.conflictDetected ? (
            <div className="p-4 bg-red-950 border border-red-900 text-red-400 rounded-sm">
              <div className="flex gap-3">
                <ShieldAlert size={20} className="shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase italic tracking-widest">Manfaatlar to'qnashuvi aniqlandi!</p>
                  <p className="text-[11px] mt-1 leading-relaxed text-red-500/80">{application.conflictDetails}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded">
              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">AI Merit Score</p>
              <p className="text-3xl font-black text-slate-100">{application.score}</p>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded">
              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Current Status</p>
              <p className="text-lg font-black text-emerald-500 uppercase mt-2 tracking-tighter">{application.status}</p>
            </div>
          </div>

          {application.status === 'hired' ? (
            <section className="space-y-4">
              <div className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-2">
                <Phone size={12} /> Aloqa Ma'lumotlari (REVEALED)
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="p-4 bg-emerald-950/20 border border-emerald-900 rounded flex items-center gap-3">
                  <Phone size={14} className="text-emerald-500" />
                  <div>
                    <p className="text-[8px] text-slate-500 uppercase font-bold">Telefon</p>
                    <p className="text-[10px] text-slate-100 font-bold">{application.phone || '+998 90 000 00 00'}</p>
                  </div>
                </div>
                <div className="p-4 bg-emerald-950/20 border border-emerald-900 rounded flex items-center gap-3">
                  <Send size={14} className="text-emerald-500" />
                  <div>
                    <p className="text-[8px] text-slate-500 uppercase font-bold">Telegram</p>
                    <p className="text-[10px] text-slate-100 font-bold">{application.telegram || '@candidate'}</p>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="space-y-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
              <FileText size={12} /> Ko'rinadigan hujjatlar
            </div>
            <div className="p-4 border border-slate-800 space-y-3 bg-slate-950/50">
              <div className="rounded border border-amber-900/30 bg-amber-950/10 px-3 py-2 text-[10px] uppercase tracking-widest text-amber-400">
                Fuqarolik pasporti HR uchun yashirilgan.
              </div>

              {application.documents.length > 0 ? (
                application.documents.map((document, index) => (
                  <div
                    key={`${document.type}-${document.name}-${index}`}
                    className="flex flex-col gap-3 rounded border border-slate-800 bg-slate-950 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {getDocumentLabel(document.type)}
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-200">
                        {document.name}
                      </p>
                    </div>

                    {isViewableDocumentUrl(document.url) ? (
                      <a
                        href={document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-2 rounded border border-emerald-900 bg-emerald-950/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-900/30"
                      >
                        Ko'rish
                        <ArrowUpRight size={12} />
                      </a>
                    ) : isLegacyDocumentUrl(document.url) ? (
                      <span className="shrink-0 rounded border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                        Qayta yuklash kerak
                      </span>
                    ) : (
                      <span className="shrink-0 rounded border border-slate-800 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Yuklangan
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded border border-slate-800 bg-slate-950 px-4 py-6 text-center text-[11px] uppercase tracking-widest text-slate-500">
                  HR uchun ko'rinadigan hujjatlar topilmadi.
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
              <Fingerprint size={12} /> Metadata Analysis
            </div>
            <div className="p-4 border border-slate-800 space-y-4 bg-slate-950/50">
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-600 uppercase">Ko'nikmalar</p>
                <div className="flex flex-wrap gap-1">
                  {application.maskedData.skills.map((skill) => (
                    <span key={skill} className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[9px] font-bold rounded-sm uppercase">{skill}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-600 uppercase">Tajriba</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed bg-slate-950 p-3 border border-slate-800 italic">{application.maskedData.experience}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-600 uppercase">Ta'lim</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed bg-slate-950 p-3 border border-slate-800">{application.maskedData.education}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-slate-800 flex flex-col gap-3 bg-slate-950">
          {application.status === 'pending' || application.status === 'reviewing' ? (
            <button
              onClick={() => onUpdateStatus(application.id, 'shortlisted')}
              className="w-full bg-blue-600 text-white font-black py-4 text-xs uppercase tracking-widest rounded shadow hover:bg-blue-500 flex items-center justify-center gap-2"
            >
              SUHBATGA CHAQIRISH (INTERVIEW ON)
            </button>
          ) : application.status === 'shortlisted' ? (
            <button
              onClick={() => onUpdateStatus(application.id, 'hired')}
              className="w-full bg-emerald-600 text-slate-950 font-black py-4 text-xs uppercase tracking-widest rounded shadow hover:bg-emerald-500 flex items-center justify-center gap-2"
            >
              ISHGA QABUL QILISH (FINALIZE)
            </button>
          ) : application.status === 'hired' ? (
            <div className="text-center py-4 text-emerald-500 font-bold text-[10px] uppercase border border-emerald-900 bg-emerald-950/20">
              Ushbu nomzod ishga qabul qilingan.
            </div>
          ) : null}

          {application.status !== 'hired' && application.status !== 'rejected' ? (
            <button
              onClick={() => onUpdateStatus(application.id, 'rejected')}
              className="w-full bg-slate-800 text-slate-400 font-black py-4 text-xs uppercase tracking-widest rounded hover:bg-slate-700 flex items-center justify-center gap-2 border border-slate-700"
            >
              RAD ETISH
            </button>
          ) : null}
        </div>
      </motion.div>
    </>
  );
}
