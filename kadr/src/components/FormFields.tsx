import { InputHTMLAttributes, useRef } from 'react';
import { CheckCircle2, Loader2, RefreshCcw, Trash2, Upload } from 'lucide-react';

interface FileUploadBoxProps {
  fileName?: string;
  isUploading?: boolean;
  label: string;
  onClear: () => void;
  onFileSelect: (file: File | null) => void;
}

export function FileUploadBox({
  fileName,
  isUploading,
  label,
  onClear,
  onFileSelect,
}: FileUploadBoxProps) {
  const isUploaded = Boolean(fileName);
  const inputId = `upload-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    if (isUploading) {
      return;
    }

    inputRef.current?.click();
  };

  return (
    <div
      onClick={openPicker}
      className={`block border-2 border-dashed rounded-2xl p-5 transition-all hover:bg-zinc-800/20 cursor-pointer group ${
        isUploaded ? 'border-emerald-600/30 bg-emerald-600/5' : 'border-zinc-800/50'
      }`}
    >
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onClick={(event) => {
          event.currentTarget.value = '';
        }}
        onChange={(event) => {
          onFileSelect(event.target.files?.[0] ?? null);
        }}
      />

      <div className="flex items-center justify-between mb-3">
        <Upload
          size={20}
          className={
            isUploaded ? 'text-emerald-500' : 'text-zinc-700 group-hover:text-emerald-500/60'
          }
        />
        {isUploaded ? <CheckCircle2 size={16} className="text-emerald-600" /> : null}
      </div>
      <p
        className={`text-xs font-semibold ${
          isUploaded ? 'text-emerald-500/80' : 'text-zinc-600 group-hover:text-zinc-400'
        }`}
      >
        {label}
      </p>
      <p className="mt-2 text-[11px] text-zinc-500 break-all">
        {fileName ?? 'PDF tanlash uchun bosing'}
      </p>
      <p className="text-[10px] text-zinc-700 mt-2 uppercase tracking-tighter">
        {isUploading ? 'PDF yuklanmoqda' : isUploaded ? 'PDF selected' : 'PDF required'}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openPicker();
          }}
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:bg-emerald-900/30"
        >
          {isUploading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
          {isUploading ? 'Yuklanmoqda...' : isUploaded ? 'Almashtirish' : 'Yuklash'}
        </button>

        {isUploaded ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClear();
            }}
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-900/30"
          >
            <Trash2 size={12} />
            O'chirish
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface ProfileImageFieldProps {
  hasPendingFile: boolean;
  imageUrl: string;
  name: string;
  onFileSelect: (file: File | null) => void;
  onReset: () => void;
}

export function ProfileImageField({
  hasPendingFile,
  imageUrl,
  name,
  onFileSelect,
  onReset,
}: ProfileImageFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <img
            src={imageUrl}
            alt={name}
            className="h-24 w-24 rounded-3xl border border-zinc-800/60 object-cover shadow-2xl"
          />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">Profil rasmi</p>
            <p className="mt-2 text-sm text-zinc-300">Haqiqiy rasm yuklang, saqlaganda backendga yoziladi.</p>
            <p className="mt-2 text-[11px] text-zinc-500">JPG, PNG, WEBP yoki GIF. Maksimal 3 MB.</p>
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
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-900/40 bg-emerald-950/20 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:bg-emerald-900/30"
          >
            <Upload size={14} />
            {hasPendingFile ? 'Rasmni almashtirish' : 'Rasm yuklash'}
          </button>
          {hasPendingFile ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-900/30"
            >
              <Trash2 size={14} />
              Bekor qilish
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface FormInputProps {
  disabled?: boolean;
  error?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

export function FormInput({
  disabled,
  error,
  inputMode,
  label,
  onChange,
  placeholder,
  value,
}: FormInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">{label}</label>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full bg-zinc-900/40 border rounded-xl px-5 py-4 font-semibold text-zinc-400 focus:ring-1 outline-none transition-all disabled:opacity-50 ${
          error
            ? 'border-red-900/60 focus:ring-red-500/30'
            : 'border-zinc-800/50 focus:ring-emerald-500/30'
        }`}
      />
      {error ? (
        <p className="text-[11px] text-red-400">{error}</p>
      ) : placeholder ? (
        <p className="text-[11px] text-zinc-500">Masalan: {placeholder}</p>
      ) : null}
    </div>
  );
}

interface FormTextareaProps {
  label: string;
  onChange: (value: string) => void;
  value: string;
}

export function FormTextarea({ label, onChange, value }: FormTextareaProps) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-xl px-5 py-4 font-semibold text-zinc-400 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all resize-none"
      />
    </div>
  );
}
