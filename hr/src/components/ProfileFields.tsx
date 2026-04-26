import { Upload, Trash2 } from 'lucide-react';
import { useRef } from 'react';

interface ProfileInputProps {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}

export function ProfileInput({
  disabled,
  label,
  onChange,
  value,
}: ProfileInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}

interface ProfileImageFieldProps {
  fullName: string;
  hasPendingFile: boolean;
  imageUrl: string;
  onFileSelect: (file: File | null) => void;
  onReset: () => void;
}

export function ProfileImageField({
  fullName,
  hasPendingFile,
  imageUrl,
  onFileSelect,
  onReset,
}: ProfileImageFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="md:col-span-2 rounded border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <img
            src={imageUrl}
            alt={fullName}
            className="h-20 w-20 rounded-full border border-slate-800 object-cover"
          />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Profil rasmi</p>
            <p className="mt-2 text-sm text-slate-300">Yangi rasm saqlangandan keyin sidebar avatari ham yangilanadi.</p>
            <p className="mt-1 text-[11px] text-slate-500">JPG, PNG, WEBP yoki GIF. Maksimal 3 MB.</p>
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
            className="inline-flex items-center gap-2 rounded border border-emerald-900 bg-emerald-950/30 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-900/40"
          >
            <Upload size={12} />
            {hasPendingFile ? 'Rasmni almashtirish' : 'Rasm yuklash'}
          </button>
          {hasPendingFile ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded border border-red-900 bg-red-950/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-900/30"
            >
              <Trash2 size={12} />
              Bekor qilish
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
