import { Fragment } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  EyeOff,
  Loader2,
  Lock,
  Save,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Application,
  ApplicationDocument,
  Candidate,
  MeritQuestion,
  RankingPreviewRow,
  VacancyGroup,
} from '../types';
import { FileUploadBox, FormInput, FormTextarea, ProfileImageField } from './FormFields';
import { MeritTest } from './MeritTest';
import { ProgressStep } from './ProgressStep';
import { RankingRow } from './RankingRow';
import { StatCard } from './StatCard';

interface ApplicationDraft {
  department: string;
  position: string;
  phone: string;
  telegram: string;
  skills: string;
  experience: string;
  education: string;
  summary: string;
}

type RequiredDocumentType = 'diploma' | 'passport' | 'certificate' | 'employment';
type DocumentDraftMap = Record<RequiredDocumentType, ApplicationDocument | null>;

interface RequiredDocument {
  label: string;
  type: RequiredDocumentType;
}

interface ApplyFormErrors {
  department?: string;
  documents?: string;
  phone?: string;
  position?: string;
  telegram?: string;
}

interface DashboardSceneProps {
  application: Application | null;
  candidate: Candidate;
  currentStep: number;
  onOpenApplication: () => void;
  onOpenStatus: () => void;
}

export function DashboardScene({
  application,
  candidate,
  currentStep,
  onOpenApplication,
  onOpenStatus,
}: DashboardSceneProps) {
  return (
    <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Arizalar soni" value={application ? '1' : '0'} icon={<FileTextIcon />} trend={application ? 'Backend bilan sinxron' : 'Ariza hali yuborilmagan'} />
        <StatCard title="Merit Ball" value={application?.meritScore ? application.meritScore.toString() : '--'} icon={<BarChart3 className="text-emerald-500" />} trend={application?.meritScore ? 'Tasdiqlangan' : 'Kutilmoqda'} />
        <StatCard title="Xavfsizlik holati" value={candidate.connections.length > 0 ? 'Monitoring' : 'Toza'} icon={<ShieldCheck className="text-emerald-500" />} trend={candidate.connections.length > 0 ? 'Aloqalar tekshirildi' : "Nizolar yo'q"} />
      </div>

      <div className="group rounded-3xl border border-zinc-800/50 bg-[#080808] p-6 shadow-lg sm:p-8">
        <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-serif italic flex items-center gap-2 text-zinc-200">
              <Building2 size={22} className="text-emerald-500" />
              {application ? `Hozirgi ariza: ${application.position}` : 'Faol ariza mavjud emas'}
            </h2>
            <p className="text-zinc-500 text-sm mt-1">{application?.department ?? "Ariza topshirish bo'limidan yangi yo'nalish tanlang"}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500/80 text-[10px] uppercase font-bold tracking-widest border border-emerald-500/20">
              {application ? application.status.replace('_', ' ') : 'idle'}
            </span>
            <button onClick={application ? onOpenStatus : onOpenApplication} className="text-emerald-500/60 font-semibold text-sm hover:text-emerald-400 hover:underline transition-colors">
              Batafsil ko'rish
            </button>
          </div>
        </div>

        <div className="relative flex flex-wrap justify-center md:justify-between px-4 gap-y-12">
          <div className="absolute top-5 left-0 right-0 h-[1px] bg-zinc-800/30 -z-10 mx-10 hidden md:block" />
          <div
            className="absolute top-5 left-0 h-[1px] bg-emerald-500/60 -z-10 transition-all duration-700 mx-10 shadow-[0_0_10px_rgba(16,185,129,0.3)] hidden md:block"
            style={{ width: `${Math.max(0, currentStep - 1) * 25}%` }}
          />
          <ProgressStep icon={<Upload size={20} />} label="Hujjatlar" active={currentStep >= 1} done={currentStep > 1} />
          <ProgressStep icon={<EyeOff size={20} />} label="Anonimlik" active={currentStep >= 2} done={currentStep > 2} />
          <ProgressStep icon={<BarChart3 size={20} />} label="Merit Test" active={currentStep >= 3} done={currentStep > 3} />
          <ProgressStep icon={<Lock size={20} />} label="Reyting" active={currentStep >= 4} done={currentStep > 4} />
          <ProgressStep icon={<CheckCircle2 size={20} />} label="Qaror" active={currentStep >= 5} done={currentStep > 5} />
        </div>
      </div>
    </motion.div>
  );
}

interface ApplySceneProps {
  applicationDraft: ApplicationDraft;
  currentVacancyPositions: string[];
  documentDrafts: DocumentDraftMap;
  errors: ApplyFormErrors;
  onApply: () => void;
  onDepartmentChange: (value: string) => void;
  onDocumentClear: (type: RequiredDocumentType) => void;
  onDocumentSelect: (type: RequiredDocumentType, label: string, file: File | null) => void;
  onPhoneChange: (value: string) => void;
  onPositionChange: (value: string) => void;
  onTelegramChange: (value: string) => void;
  onTextFieldChange: (field: keyof Pick<ApplicationDraft, 'skills' | 'experience' | 'education' | 'summary'>, value: string) => void;
  requiredDocuments: RequiredDocument[];
  submittingApplication: boolean;
  uploadingDocumentType: RequiredDocumentType | null;
  vacancies: VacancyGroup[];
  vacancyPlaceholder: string;
}

export function ApplyScene({
  applicationDraft,
  currentVacancyPositions,
  documentDrafts,
  errors,
  onApply,
  onDepartmentChange,
  onDocumentClear,
  onDocumentSelect,
  onPhoneChange,
  onPositionChange,
  onTelegramChange,
  onTextFieldChange,
  requiredDocuments,
  submittingApplication,
  uploadingDocumentType,
  vacancies,
  vacancyPlaceholder,
}: ApplySceneProps) {
  return (
    <motion.div key="apply" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mx-auto w-full max-w-4xl">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800/50 bg-[#080808] p-6 shadow-2xl sm:p-8 md:p-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -z-0" />
        <h2 className="text-2xl font-serif italic mb-8 relative z-10 text-zinc-200">Ariza yuborish</h2>

        <div className="space-y-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Vazirlik / Tashkilot *</label>
              <select
                value={applicationDraft.department}
                onChange={(event) => onDepartmentChange(event.target.value)}
                className={`w-full bg-zinc-900/40 border rounded-xl px-5 py-4 font-semibold text-zinc-400 outline-none transition-all appearance-none cursor-pointer ${
                  errors.department ? 'border-red-900/60 focus:ring-1 focus:ring-red-500/30' : 'border-zinc-800/50 focus:ring-1 focus:ring-emerald-500/30'
                }`}
              >
                <option value="" className="bg-[#080808]">Tanlang</option>
                {vacancies.map((item) => (
                  <option key={item.department} value={item.department} className="bg-[#080808]">
                    {item.department}
                  </option>
                ))}
              </select>
              {errors.department ? <p className="text-[11px] text-red-400">{errors.department}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Vakansiya nomi *</label>
              <select
                value={applicationDraft.position}
                onChange={(event) => onPositionChange(event.target.value)}
                className={`w-full bg-zinc-900/40 border rounded-xl px-5 py-4 font-semibold text-zinc-400 outline-none transition-all appearance-none cursor-pointer ${
                  errors.position ? 'border-red-900/60 focus:ring-1 focus:ring-red-500/30' : 'border-zinc-800/50 focus:ring-1 focus:ring-emerald-500/30'
                }`}
              >
                <option value="" className="bg-[#080808]">{vacancyPlaceholder}</option>
                {currentVacancyPositions.map((position) => (
                  <option key={position} value={position} className="bg-[#080808]">
                    {position}
                  </option>
                ))}
              </select>
              {errors.position ? (
                <p className="text-[11px] text-red-400">{errors.position}</p>
              ) : !applicationDraft.department ? (
                <p className="text-[11px] text-zinc-500">
                  Avval `Vazirlik / Tashkilot` ni tanlang, keyin shu yerda vakansiyalar chiqadi.
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Telefon *"
              value={applicationDraft.phone}
              onChange={onPhoneChange}
              placeholder="+998901234567"
              inputMode="tel"
              error={errors.phone}
            />
            <FormInput
              label="Telegram *"
              value={applicationDraft.telegram}
              onChange={onTelegramChange}
              placeholder="@username"
              error={errors.telegram}
            />
          </div>

          <div className="space-y-6">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Majburiy hujjatlar</label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {requiredDocuments.map((document) => (
                <Fragment key={document.type}>
                  <FileUploadBox
                    label={document.label}
                    fileName={documentDrafts[document.type]?.name}
                    isUploading={uploadingDocumentType === document.type}
                    onClear={() => onDocumentClear(document.type)}
                    onFileSelect={(file) => onDocumentSelect(document.type, document.label, file)}
                  />
                </Fragment>
              ))}
            </div>
            {errors.documents ? <p className="text-[11px] text-red-400">{errors.documents}</p> : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormTextarea label="Ko'nikmalar (ixtiyoriy)" value={applicationDraft.skills} onChange={(value) => onTextFieldChange('skills', value)} />
            <FormTextarea label="Tajriba (ixtiyoriy)" value={applicationDraft.experience} onChange={(value) => onTextFieldChange('experience', value)} />
            <FormTextarea label="Ta'lim (ixtiyoriy)" value={applicationDraft.education} onChange={(value) => onTextFieldChange('education', value)} />
            <FormTextarea label="Qisqa tavsif (ixtiyoriy)" value={applicationDraft.summary} onChange={(value) => onTextFieldChange('summary', value)} />
          </div>

          <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-6 transition-all hover:bg-zinc-800/50">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-500 border border-emerald-500/20">
                  <EyeOff size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-300">Anonim baholash rejimi</h4>
                  <p className="text-xs text-zinc-500">Shaxsiy identifikatorlar yashirilib, faqat merit va kompetensiya ko'rinadi.</p>
                </div>
              </div>
              <div className="text-[10px] font-bold text-emerald-500/60 bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/20 tracking-widest uppercase">
                Faol
              </div>
            </div>
          </div>

          <button
            onClick={onApply}
            disabled={submittingApplication || Boolean(uploadingDocumentType)}
            className="w-full bg-emerald-600 text-black py-4 rounded-xl font-bold text-lg hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(5,150,105,0.2)] hover:scale-[1.01] disabled:opacity-60 disabled:hover:scale-100"
          >
            {submittingApplication ? <Loader2 size={20} className="animate-spin" /> : null}
            Arizani Yuborish
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-[11px] text-zinc-500">
            `*` bilan belgilangan maydonlar va barcha 4 ta PDF hujjat majburiy. Telefon to'g'ri raqam formatida, Telegram esa `@username` ko'rinishida bo'lishi kerak.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

interface StatusSceneProps {
  application: Application | null;
  candidate: Candidate;
  meritQuestions: MeritQuestion[];
  onCompleteMeritTest: (answers: number[]) => void;
  onStartMeritTest: () => void;
  profileImageUrl: string;
  rankingRows: RankingPreviewRow[];
  submittingTest: boolean;
}

export function StatusScene({
  application,
  candidate,
  meritQuestions,
  onCompleteMeritTest,
  onStartMeritTest,
  profileImageUrl,
  rankingRows,
  submittingTest,
}: StatusSceneProps) {
  return (
    <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {!application ? (
        <div className="bg-[#080808] rounded-3xl p-12 border border-zinc-800/50 text-center">
          <h3 className="text-2xl font-serif italic text-zinc-200">Faol ariza topilmadi</h3>
          <p className="text-zinc-500 mt-3">Avval vakansiya tanlab, arizani backend bazaga yuboring.</p>
        </div>
      ) : application.status === 'merit_test' ? (
        <MeritTest questions={meritQuestions} busy={submittingTest} onComplete={onCompleteMeritTest} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="h-fit rounded-3xl border border-zinc-800/50 bg-[#080808] p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-serif italic text-xl text-zinc-200">Sizning profilingiz</h3>
                <div className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">ID: {candidate.id}</div>
              </div>

              <div className="mb-6 flex flex-col gap-4 border-b border-zinc-800/30 pb-6 sm:flex-row sm:items-center sm:gap-6">
                <img
                  src={profileImageUrl}
                  className="w-24 h-24 rounded-2xl object-cover grayscale opacity-60 hover:opacity-100 transition-all"
                />
                <div className="space-y-1">
                  <h4 className="text-2xl font-bold text-zinc-200">{candidate.name} {candidate.surname}</h4>
                  <p className="text-zinc-600 text-sm">{candidate.gender} • {candidate.birthPlace}</p>
                  <p className="text-zinc-600 text-sm">{candidate.email}</p>
                  <p className="text-emerald-500/80 font-semibold">{candidate.phone}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <ShieldCheck size={20} className="text-amber-500/80 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Aniqlangan aloqalar</p>
                    {candidate.connections.length > 0 ? candidate.connections.map((connection) => (
                      <p key={connection} className="text-xs font-medium text-amber-500/90 bg-amber-500/5 border border-amber-500/10 px-2 py-1 rounded inline-block mr-2 mb-2">
                        {connection}
                      </p>
                    )) : (
                      <p className="text-sm text-zinc-500">Aloqalar aniqlanmadi.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-zinc-800/50 bg-[#0b0b0b] p-6 shadow-2xl sm:p-8">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500/10 animate-scanline" />
              <div className="mb-6 flex flex-col gap-4 border-b border-zinc-800/30 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <EyeOff className="text-emerald-500/70" size={20} />
                  <h3 className="font-serif italic text-xl text-zinc-200">Anonim ko'rinish</h3>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-500/60 uppercase tracking-wider">
                  <span className="w-2 h-2 bg-emerald-500/60 rounded-full animate-pulse" />
                  API Sync
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                  <div className="w-24 h-24 bg-zinc-900/50 rounded-2xl flex items-center justify-center backdrop-blur-md border border-zinc-800/50">
                    <Lock size={32} className="text-zinc-800" />
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className="h-6 bg-zinc-800/50 rounded w-1/2 animate-pulse" />
                    <div className="h-4 bg-zinc-800/30 rounded w-1/3 animate-pulse" />
                    <div className="h-4 bg-zinc-800/20 rounded w-1/4 animate-pulse" />
                  </div>
                </div>

                <div className="p-6 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 border-l-emerald-600/30 border-l-4">
                  <p className="text-emerald-600/80 font-mono text-[10px] uppercase tracking-widest mb-4">Holat Hisoboti:</p>
                  <p className="text-zinc-500 text-sm italic font-serif">
                    Shaxsiy identifikatorlar yashirildi. Hakamlar faqat merit va kompetensiya ma'lumotini ko'radi.
                    {application.conflictDetected ? " Aloqa topilgani sababli qo'shimcha monitoring yoqilgan." : ' Aloqadorlik flag topilmadi.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50">
                    <p className="text-[10px] text-zinc-600 uppercase mb-1 tracking-widest">Moslik</p>
                    <p className="text-2xl font-bold text-zinc-400">{application.matchPercentage ?? '--'}%</p>
                  </div>
                  <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50">
                    <p className="text-[10px] text-zinc-600 uppercase mb-1 tracking-widest">Merit Ball</p>
                    <p className="text-2xl font-bold text-emerald-500/80">{application.meritScore || 'Kutilmoqda'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {(application.status === 'submitted' || application.status === 'blind_review') ? (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="group relative overflow-hidden rounded-3xl border border-emerald-500/10 bg-[#080808] p-6 shadow-2xl sm:p-8 md:p-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-all" />
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="space-y-4 max-w-xl text-center md:text-left">
                  <h2 className="text-3xl font-serif italic text-zinc-300 tracking-tight">Merit Test uchun tayyormisiz?</h2>
                  <p className="text-zinc-600 text-lg leading-relaxed">
                    Ariza backend bazada saqlandi. Endi onlayn merit test topshirib, reyting bosqichiga o'tasiz.
                  </p>
                </div>
                <button
                  onClick={onStartMeritTest}
                  className="bg-emerald-600 text-black px-10 py-5 rounded-2xl font-bold text-xl hover:bg-emerald-500 transition-all shadow-[0_0_30px_rgba(5,150,105,0.2)] hover:scale-105 flex items-center gap-3"
                >
                  <BarChart3 />
                  Testni boshlash
                </button>
              </div>
            </motion.div>
          ) : null}

          {(application.status === 'ranking' || application.status === 'completed') ? (
            <div className="bg-[#080808] rounded-3xl p-8 border border-zinc-800/50">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-emerald-500/5 rounded-xl flex items-center justify-center border border-emerald-500/10">
                  <Lock className="text-emerald-500/60" size={20} />
                </div>
                <h3 className="text-xl font-serif italic text-zinc-300">Majburiy Merit Reytingi</h3>
              </div>

              <div className="space-y-4">
                {rankingRows.map((row) => (
                  <Fragment key={`${row.rank}-${row.name}`}>
                    <RankingRow name={row.name} score={row.score} rank={row.rank} isYou={row.isYou} blocked={row.blocked} />
                  </Fragment>
                ))}
              </div>

              {application.conflictDetected ? (
                <div className="mt-8 p-6 bg-red-950/10 border border-red-900/20 rounded-2xl flex items-start gap-4 text-red-400">
                  <AlertCircle size={24} className="text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-[10px] uppercase tracking-widest mb-1">Xavfsizlik bayrog'i</p>
                    <p className="text-sm opacity-80 leading-relaxed font-serif italic">
                      Backend konflikt aloqasini qayd etdi. Shu sababli tanlov qo'shimcha nazorat bilan davom etadi.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </motion.div>
  );
}

interface ProfileSceneProps {
  hasPendingProfilePhoto: boolean;
  onConnectionsChange: (value: string) => void;
  onFieldChange: (field: keyof Candidate, value: string) => void;
  onFileSelect: (file: File | null) => void;
  onPhoneChange: (value: string) => void;
  onResetPhoto: () => void;
  onSave: () => void;
  profileDraft: Candidate;
  profileImageUrl: string;
  savingProfile: boolean;
}

export function ProfileScene({
  hasPendingProfilePhoto,
  onConnectionsChange,
  onFieldChange,
  onFileSelect,
  onPhoneChange,
  onResetPhoto,
  onSave,
  profileDraft,
  profileImageUrl,
  savingProfile,
}: ProfileSceneProps) {
  return (
    <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mx-auto w-full max-w-4xl">
      <div className="rounded-3xl border border-zinc-800/50 bg-[#080808] p-6 shadow-2xl sm:p-8 md:p-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-serif italic text-zinc-200">Profil ma'lumotlari</h3>
            <p className="text-sm text-zinc-500 mt-2">Bu bo'lim to'g'ridan-to'g'ri backenddagi candidate profile yozuvini yangilaydi.</p>
          </div>
          <button
            onClick={onSave}
            disabled={savingProfile}
            className="px-5 py-3 rounded-xl bg-emerald-600 text-black font-bold flex items-center gap-2 hover:bg-emerald-500 transition-colors disabled:opacity-60"
          >
            {savingProfile ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Saqlash
          </button>
        </div>

        <div className="mb-8">
          <ProfileImageField
            name={`${profileDraft.name} ${profileDraft.surname}`}
            imageUrl={profileImageUrl}
            hasPendingFile={hasPendingProfilePhoto}
            onFileSelect={onFileSelect}
            onReset={onResetPhoto}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput label="Ism" value={profileDraft.name} onChange={(value) => onFieldChange('name', value)} />
          <FormInput label="Familiya" value={profileDraft.surname} onChange={(value) => onFieldChange('surname', value)} />
          <FormInput label="Jins" value={profileDraft.gender} disabled onChange={() => {}} />
          <FormInput label="Tug'ilgan joy" value={profileDraft.birthPlace} onChange={(value) => onFieldChange('birthPlace', value)} />
          <FormInput label="Email" value={profileDraft.email} disabled onChange={() => {}} />
          <FormInput label="Telefon" value={profileDraft.phone} onChange={onPhoneChange} />
          <FormTextarea label="Aloqalar" value={profileDraft.connections.join('\n')} onChange={onConnectionsChange} />
        </div>
      </div>
    </motion.div>
  );
}

interface SubmitConfirmModalProps {
  applicationDraft: ApplicationDraft;
  busy: boolean;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  normalizedPhone: string;
  normalizedTelegram: string;
  uploadingDocumentType: RequiredDocumentType | null;
}

export function SubmitConfirmModal({
  applicationDraft,
  busy,
  open,
  onClose,
  onConfirm,
  normalizedPhone,
  normalizedTelegram,
  uploadingDocumentType,
}: SubmitConfirmModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70]"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="fixed inset-0 z-[71] flex items-center justify-center px-4 sm:px-6"
          >
            <div className="w-full max-w-lg rounded-3xl border border-zinc-800/60 bg-[#080808] p-6 shadow-2xl sm:p-8">
              <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-500/70 font-bold">
                Tasdiqlash
              </p>
              <h3 className="mt-3 text-2xl font-serif italic text-zinc-200">
                Kiritilgan ma'lumotlar to'g'rimi?
              </h3>
              <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
                Ariza yuborilgandan keyin ma'lumotlar backend bazaga saqlanadi va ko'rib chiqish jarayoni boshlanadi.
              </p>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailCard label="Vazirlik" value={applicationDraft.department} />
                <DetailCard label="Vakansiya" value={applicationDraft.position} />
                <DetailCard label="Telefon" value={normalizedPhone} />
                <DetailCard label="Telegram" value={normalizedTelegram} />
              </div>

              <div className="mt-8 flex flex-col-reverse md:flex-row gap-3">
                <button
                  onClick={onClose}
                  className="w-full rounded-2xl border border-zinc-800 px-5 py-4 text-sm font-bold text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 transition-colors"
                >
                  Yo'q, qayta ko'raman
                </button>
                <button
                  onClick={onConfirm}
                  disabled={busy || Boolean(uploadingDocumentType)}
                  className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-bold text-black hover:bg-emerald-500 transition-colors disabled:opacity-60"
                >
                  {busy ? 'Yuborilmoqda...' : "Ha, arizani yuborish"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">{label}</p>
      <p className="mt-2 text-sm font-semibold text-zinc-300">{value}</p>
    </div>
  );
}

function FileTextIcon() {
  return <BarChart3 className="text-emerald-500" />;
}
