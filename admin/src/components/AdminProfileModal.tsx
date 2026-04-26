import { Save, ShieldCheck, Trash2, Upload, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useRef } from 'react';
import { AdminProfile } from '../types';

interface AdminProfileModalProps {
  avatarPreview: string;
  hasPendingFile: boolean;
  onClose: () => void;
  onFileSelect: (file: File | null) => void;
  onProfileChange: (patch: Partial<AdminProfile>) => void;
  onResetPhoto: () => void;
  onSave: () => void;
  profile: AdminProfile;
  saving: boolean;
}

export function AdminProfileModal({
  avatarPreview,
  hasPendingFile,
  onClose,
  onFileSelect,
  onProfileChange,
  onResetPhoto,
  onSave,
  profile,
  saving,
}: AdminProfileModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.98 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70 font-bold">Admin profil</p>
            <h3 className="mt-3 text-2xl serif-title text-zinc-100">Shaxsiy ma'lumotlar</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-800 p-2 text-zinc-500 hover:text-zinc-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <img
                src={avatarPreview}
                alt={profile.fullName}
                className="h-24 w-24 rounded-3xl border border-zinc-800 object-cover"
              />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Profil rasmi</p>
                <p className="mt-2 text-sm text-zinc-300">Saqlangandan keyin sidebar kartadagi avatar ham yangilanadi.</p>
                <p className="mt-1 text-[11px] text-zinc-500">JPG, PNG, WEBP yoki GIF. Maksimal 3 MB.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onClick={(event) => {
                  event.currentTarget.value = '';
                }}
                onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gold hover:bg-gold/20"
              >
                <Upload size={14} />
                {hasPendingFile ? 'Rasmni almashtirish' : 'Rasm yuklash'}
              </button>
              {hasPendingFile ? (
                <button
                  type="button"
                  onClick={onResetPhoto}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-900/30"
                >
                  <Trash2 size={14} />
                  Bekor qilish
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">F.I.Sh.</span>
            <input
              type="text"
              value={profile.fullName}
              onChange={(event) => onProfileChange({ fullName: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-4 text-sm text-zinc-200 outline-none focus:border-gold/40"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Telefon</span>
            <input
              type="text"
              value={profile.phone}
              onChange={(event) => onProfileChange({ phone: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-4 text-sm text-zinc-200 outline-none focus:border-gold/40"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Email</span>
            <input
              type="text"
              value={profile.email}
              disabled
              className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-900/20 px-4 py-4 text-sm text-zinc-500 outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Bo'lim</span>
            <input
              type="text"
              value={profile.department}
              disabled
              className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-900/20 px-4 py-4 text-sm text-zinc-500 outline-none"
            />
          </label>
        </div>

        <div className="mt-8 flex flex-col-reverse md:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-zinc-800 px-5 py-4 text-sm font-bold text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
          >
            Yopish
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-4 text-sm font-bold text-black hover:brightness-110 disabled:opacity-60"
          >
            {saving ? <ShieldCheck size={16} className="animate-pulse" /> : <Save size={16} />}
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
