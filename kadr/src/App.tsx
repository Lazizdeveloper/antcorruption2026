import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import {
  Building2,
  FileText,
  ShieldCheck,
  LayoutDashboard,
  UserCircle,
  ArrowRight,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Lock,
  Upload,
  BarChart3,
  LogOut,
  Loader2,
  Save,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Application,
  ApplicationDocument,
  ApplicationStatus,
  Candidate,
  MeritQuestion,
  RankingPreviewRow,
  VacancyGroup,
} from './types';
import {
  createApplication,
  fetchDashboard,
  submitMeritTest,
  uploadApplicationDocument,
  uploadProfileImage,
  updateProfile,
} from './lib/api';

type ActiveTab = 'dashboard' | 'apply' | 'status' | 'profile';

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

const DEFAULT_SKILLS = ['Budjet tahlili', 'Excel', 'Power BI'];

const REQUIRED_DOCUMENTS: Array<{ type: RequiredDocumentType; label: string }> = [
  { type: 'diploma', label: "Oliy ma'lumot diplomi" },
  { type: 'passport', label: 'Fuqarolik Pasporti' },
  { type: 'certificate', label: "Ilmiy unvon / Sertifikat" },
  { type: 'employment', label: 'Ish staji (E-Mehnat)' },
];

const MAX_PROFILE_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;
const MAX_APPLICATION_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const PHONE_PREFIX = '+998';
const TELEGRAM_PREFIX = '@';

function isValidPhoneNumber(value: string) {
  return /^\+998\d{9}$/.test(value.trim());
}

function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, '');
  const localDigits = digits.startsWith('998') ? digits.slice(3) : digits;
  return `${PHONE_PREFIX}${localDigits.slice(0, 9)}`;
}

function normalizeTelegramUsername(value: string) {
  return normalizeTelegramInput(value).slice(1);
}

function normalizeTelegramInput(value: string) {
  return value
    .trim()
    .replace(/^@+/, '')
    .replace(/[^A-Za-z0-9_]/g, '')
    .slice(0, 32)
    .replace(/^/, TELEGRAM_PREFIX);
}

function isValidTelegramUsername(value: string) {
  return /^@[A-Za-z0-9_]{5,32}$/.test(normalizeTelegramInput(value));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error("Rasm faylini o'qib bo'lmadi"));
    reader.readAsDataURL(file);
  });
}

function createAvatarPlaceholder(label: string) {
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'EF';

  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="24" fill="#111827" />
      <text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" fill="#10b981" font-family="Arial, sans-serif" font-size="28" font-weight="700">${initials}</text>
    </svg>`,
  )}`;
}

function getStatusStep(status?: ApplicationStatus | null) {
  switch (status) {
    case 'submitted':
      return 1;
    case 'blind_review':
      return 2;
    case 'merit_test':
      return 3;
    case 'ranking':
      return 4;
    case 'completed':
      return 5;
    default:
      return 0;
  }
}

function createDraft(
  vacancies: VacancyGroup[],
  application: Application | null,
  fallbackPhone = PHONE_PREFIX,
): ApplicationDraft {
  return {
    department: '',
    position: '',
    phone: normalizePhoneInput(application?.phone ?? fallbackPhone),
    telegram: normalizeTelegramInput(application?.telegram ?? TELEGRAM_PREFIX),
    skills: (application?.maskedData?.skills ?? DEFAULT_SKILLS).join(', '),
    experience:
      application?.maskedData?.experience ??
      '2 yil yordamchi iqtisodchi sifatida tajriba.',
    education: application?.maskedData?.education ?? 'TDIU bakalavr',
    summary:
      application?.maskedData?.summary ??
      "Davlat moliyasi bo'yicha ishlashni xohlaydi.",
  };
}

function createEmptyDocumentDrafts(): DocumentDraftMap {
  return {
    diploma: null,
    passport: null,
    certificate: null,
    employment: null,
  };
}

function fallbackRanking(application: Application | null): RankingPreviewRow[] {
  if (!application) {
    return [];
  }

  return [
    { rank: 1, name: 'Anonim Nomzod #1', score: Math.max(application.meritScore, 91) },
    { rank: 2, name: 'Siz (Anonim)', score: application.meritScore || 0, isYou: true },
    { rank: 3, name: 'Anonim Nomzod #3', score: Math.max(70, (application.meritScore || 0) - 8) },
  ];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [profileDraft, setProfileDraft] = useState<Candidate | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [vacancies, setVacancies] = useState<VacancyGroup[]>([]);
  const [meritQuestions, setMeritQuestions] = useState<MeritQuestion[]>([]);
  const [rankingPreview, setRankingPreview] = useState<RankingPreviewRow[]>([]);
  const [applicationDraft, setApplicationDraft] = useState<ApplicationDraft>({
    department: '',
    position: '',
    phone: PHONE_PREFIX,
    telegram: TELEGRAM_PREFIX,
    skills: DEFAULT_SKILLS.join(', '),
    experience: '',
    education: '',
    summary: '',
  });
  const [documentDrafts, setDocumentDrafts] = useState<DocumentDraftMap>(createEmptyDocumentDrafts);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [pendingProfilePhoto, setPendingProfilePhoto] = useState<File | null>(null);
  const [uploadingDocumentType, setUploadingDocumentType] =
    useState<RequiredDocumentType | null>(null);
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [submittingTest, setSubmittingTest] = useState(false);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const loadDashboard = async (withLoader = true) => {
    if (withLoader) {
      setLoading(true);
    }

    try {
      const dashboard = await fetchDashboard();
      const safeCandidate = {
        ...dashboard.candidate,
        photoUrl: dashboard.candidate?.photoUrl ?? '',
        phone: normalizePhoneInput(dashboard.candidate?.phone ?? PHONE_PREFIX),
        connections: Array.isArray(dashboard.candidate?.connections)
          ? dashboard.candidate.connections
          : [],
      };
      const safeVacancies = Array.isArray(dashboard.vacancies) ? dashboard.vacancies : [];
      const safeQuestions = Array.isArray(dashboard.meritQuestions) ? dashboard.meritQuestions : [];
      const safeRankingPreview = Array.isArray(dashboard.rankingPreview)
        ? dashboard.rankingPreview
        : [];

      setProfileDraft(safeCandidate);
      setApplication(dashboard.application);
      setVacancies(safeVacancies);
      setMeritQuestions(safeQuestions);
      setRankingPreview(
        safeRankingPreview.length > 0
          ? safeRankingPreview
          : fallbackRanking(dashboard.application),
      );
      setCandidate(safeCandidate);
      setApplicationDraft(
        createDraft(safeVacancies, dashboard.application, safeCandidate.phone ?? PHONE_PREFIX),
      );
      setPendingProfilePhoto(null);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Backend bilan aloqa uzildi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const currentStep = getStatusStep(application?.status);
  const currentVacancyPositions =
    vacancies.find((item) => item.department === applicationDraft.department)?.positions ?? [];
  const vacancyPlaceholder = !applicationDraft.department
    ? "Avval vazirlikni tanlang"
    : currentVacancyPositions.length === 0
      ? 'Vakansiyalar topilmadi'
      : 'Tanlang';
  const missingRequiredDocuments = REQUIRED_DOCUMENTS.some(
    ({ type }) => !documentDrafts[type],
  );
  const hasValidDepartmentSelection =
    applicationDraft.department.trim() !== '' &&
    vacancies.some((item) => item.department === applicationDraft.department);
  const hasValidPositionSelection =
    applicationDraft.position.trim() !== '' &&
    currentVacancyPositions.includes(applicationDraft.position);
  const normalizedPhone = normalizePhoneInput(applicationDraft.phone);
  const normalizedTelegram = normalizeTelegramInput(applicationDraft.telegram);
  const hasPhoneValue = normalizedPhone !== PHONE_PREFIX;
  const hasTelegramValue = normalizedTelegram !== TELEGRAM_PREFIX;
  const hasValidPhoneNumber = hasPhoneValue && isValidPhoneNumber(normalizedPhone);
  const hasValidTelegramUsername =
    hasTelegramValue && isValidTelegramUsername(normalizedTelegram);
  const phoneInputError =
    !submitAttempted
      ? undefined
      : !hasPhoneValue
        ? 'Majburiy maydon'
        : !hasValidPhoneNumber
          ? "Telefon raqamini to'g'ri kiriting. Masalan: +998901234567"
          : undefined;
  const telegramInputError =
    !submitAttempted
      ? undefined
      : !hasTelegramValue
        ? 'Majburiy maydon'
        : !hasValidTelegramUsername
          ? "Telegram username'ni to'g'ri kiriting. Masalan: @username"
          : undefined;
  const departmentInputError =
    !submitAttempted
      ? undefined
      : applicationDraft.department.trim() === ''
        ? 'Majburiy maydon'
        : !hasValidDepartmentSelection
          ? "Vazirlikni ro'yxatdan tanlang"
          : undefined;
  const positionInputError =
    !submitAttempted
      ? undefined
      : applicationDraft.position.trim() === ''
        ? 'Majburiy maydon'
        : !hasValidPositionSelection
          ? "Vakansiyani ro'yxatdan tanlang"
          : undefined;
  const documentsInputError =
    submitAttempted && missingRequiredDocuments
      ? "4 ta majburiy PDF hujjatni yuklang"
      : undefined;

  const handleDocumentSelect = async (
    documentType: RequiredDocumentType,
    label: string,
    file: File | null,
  ) => {
    if (!file) {
      return;
    }

    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setErrorMessage(`${label} faqat PDF formatida yuklanishi kerak.`);
      setSuccessMessage(null);
      return;
    }

    if (file.size > MAX_APPLICATION_DOCUMENT_SIZE_BYTES) {
      setErrorMessage(`${label} 10 MB dan oshmasligi kerak.`);
      setSuccessMessage(null);
      return;
    }

    setUploadingDocumentType(documentType);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const uploadedDocument = await uploadApplicationDocument(file);

      setDocumentDrafts((prev) => ({
        ...prev,
        [documentType]: {
          name: file.name,
          type: documentType,
          url: uploadedDocument.url,
          mimeType: uploadedDocument.mimeType || file.type || 'application/pdf',
          sizeKb: uploadedDocument.sizeKb ?? Math.max(1, Math.round(file.size / 1024)),
        },
      }));
      setSuccessMessage(`${label} muvaffaqiyatli yuklandi.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : `${label} faylini yuklab bo'lmadi.`,
      );
      setSuccessMessage(null);
    } finally {
      setUploadingDocumentType((currentType) =>
        currentType === documentType ? null : currentType,
      );
    }
  };

  const handleDocumentClear = (documentType: RequiredDocumentType) => {
    setDocumentDrafts((prev) => ({
      ...prev,
      [documentType]: null,
    }));
    setSuccessMessage(null);
  };

  const validateApplicationForm = () => {
    setSubmitAttempted(true);

    const requiredFields = {
      department: applicationDraft.department.trim(),
      position: applicationDraft.position.trim(),
      phone: normalizedPhone,
      telegram: normalizedTelegram,
    };

    if (
      !requiredFields.department ||
      !requiredFields.position ||
      !hasPhoneValue ||
      !hasTelegramValue
    ) {
      setErrorMessage("Majburiy maydonlarni to'ldiring: vazirlik, vakansiya, telefon va telegram.");
      setSuccessMessage(null);
      return null;
    }

    if (!hasValidDepartmentSelection || !hasValidPositionSelection) {
      setErrorMessage("Vazirlik va vakansiyani ro'yxatdan to'g'ri tanlang.");
      setSuccessMessage(null);
      return null;
    }

    if (!hasValidPhoneNumber) {
      setErrorMessage("Telefon raqamini to'g'ri kiriting. Masalan: +998901234567.");
      setSuccessMessage(null);
      return null;
    }

    if (!hasValidTelegramUsername) {
      setErrorMessage("Telegram username'ni to'g'ri kiriting. Masalan: @username.");
      setSuccessMessage(null);
      return null;
    }

    if (uploadingDocumentType) {
      setErrorMessage("Hujjat yuklanishini kuting, keyin arizani yuboring.");
      setSuccessMessage(null);
      return null;
    }

    if (missingRequiredDocuments) {
      setErrorMessage("Majburiy hujjatlarni yuklang: diplom, pasport, sertifikat va ish staji PDF.");
      setSuccessMessage(null);
      return null;
    }

    setErrorMessage(null);
    return requiredFields;
  };

  const submitApplication = async (requiredFields: {
    department: string;
    position: string;
    phone: string;
    telegram: string;
  }) => {
    setSubmittingApplication(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const createdApplication = await createApplication({
        department: requiredFields.department,
        position: requiredFields.position,
        phone: requiredFields.phone,
        telegram: requiredFields.telegram,
        documents: Object.values(documentDrafts).filter(
          (document): document is ApplicationDocument => document !== null,
        ),
        maskedData: {
          skills: applicationDraft.skills
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          experience: applicationDraft.experience,
          education: applicationDraft.education,
          summary: applicationDraft.summary,
        },
      });

      setApplication(createdApplication);
      setRankingPreview(fallbackRanking(createdApplication));
      setSuccessMessage("Ariza backend bazaga saqlandi va ko'rib chiqishga yuborildi.");
      setSubmitAttempted(false);
      setIsSubmitConfirmOpen(false);
      setActiveTab('status');
      setDocumentDrafts(createEmptyDocumentDrafts());
      await loadDashboard(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ariza yuborilmadi');
    } finally {
      setSubmittingApplication(false);
    }
  };

  const handleApply = () => {
    const requiredFields = validateApplicationForm();

    if (!requiredFields) {
      return;
    }

    setSuccessMessage(null);
    setIsSubmitConfirmOpen(true);
  };

  const handleConfirmApply = async () => {
    const requiredFields = validateApplicationForm();

    if (!requiredFields) {
      setIsSubmitConfirmOpen(false);
      return;
    }

    await submitApplication(requiredFields);
  };

  const handleSaveProfile = async () => {
    if (!profileDraft) {
      return;
    }

    const normalizedProfilePhone = normalizePhoneInput(profileDraft.phone);

    if (!isValidPhoneNumber(normalizedProfilePhone)) {
      setErrorMessage("Telefon raqamini to'g'ri kiriting. Masalan: +998901234567.");
      setSuccessMessage(null);
      return;
    }

    setSavingProfile(true);
    setSuccessMessage(null);

    try {
      const nextPhotoUrl = pendingProfilePhoto
        ? await uploadProfileImage(pendingProfilePhoto)
        : profileDraft.photoUrl;
      const updatedCandidate = await updateProfile({
        ...profileDraft,
        phone: normalizedProfilePhone,
        photoUrl: nextPhotoUrl,
      });
      setCandidate(updatedCandidate);
      setProfileDraft(updatedCandidate);
      setPendingProfilePhoto(null);
      setApplicationDraft((prev) => ({
        ...prev,
        phone: normalizePhoneInput(updatedCandidate.phone),
      }));
      setSuccessMessage('Profil backend orqali yangilandi.');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Profil saqlanmadi');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleProfilePhotoChange = async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Profil uchun faqat rasm faylini yuklang.');
      setSuccessMessage(null);
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
      setErrorMessage('Profil rasmi 3 MB dan oshmasligi kerak.');
      setSuccessMessage(null);
      return;
    }

    try {
      const previewUrl = await readFileAsDataUrl(file);
      setPendingProfilePhoto(file);
      setProfileDraft((prev) => (prev ? { ...prev, photoUrl: previewUrl } : prev));
      setErrorMessage(null);
      setSuccessMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Rasm faylini o'qib bo'lmadi");
      setSuccessMessage(null);
    }
  };

  const handleProfilePhotoReset = () => {
    setPendingProfilePhoto(null);
    setProfileDraft((prev) => (prev && candidate ? { ...prev, photoUrl: candidate.photoUrl } : prev));
  };

  const handleCompleteMeritTest = async (answers: number[]) => {
    if (!application) {
      return;
    }

    setSubmittingTest(true);
    setSuccessMessage(null);

    try {
      const payload = await submitMeritTest(application.id, answers);
      setApplication(payload.application);
      setSuccessMessage(`Merit test topshirildi. Yangi ball: ${payload.score}`);
      await loadDashboard(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Merit test yuborilmadi');
    } finally {
      setSubmittingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-400 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm uppercase tracking-[0.3em]">
          <Loader2 className="animate-spin text-emerald-500" />
          Backend ma'lumotlari yuklanmoqda
        </div>
      </div>
    );
  }

  if (!candidate || !profileDraft) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-400 flex items-center justify-center px-6 text-center">
        <div>
          <h2 className="text-2xl font-serif italic text-zinc-200">Nomzod profili topilmadi</h2>
          <p className="mt-3 text-sm text-zinc-500">
            Candidate backend yozuvi mavjud emas yoki login muvaffaqiyatsiz bo'ldi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] text-zinc-400 font-sans selection:bg-emerald-500/30">
      <div className="fixed top-0 left-0 right-0 z-[60] flex h-16 items-center justify-between border-b border-zinc-800/50 bg-[#080808] px-4 md:hidden sm:px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center font-bold text-black">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-lg font-serif italic tracking-tight font-semibold text-zinc-200">Adolatli</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-zinc-400 hover:text-white"
        >
          {isMobileMenuOpen ? <BarChart3 className="rotate-90" /> : <LayoutDashboard />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[51] md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed left-0 top-0 bottom-0 z-[52] flex w-[85vw] max-w-64 flex-col border-r border-zinc-800/50 bg-[#080808] transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8">
          <div className="flex items-center gap-2 mb-12 group cursor-pointer hidden md:flex">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center font-bold text-black shadow-[0_0_15px_rgba(5,150,105,0.3)] group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xl font-serif italic tracking-tight font-semibold text-zinc-200">Adolatli Tanlov</span>
          </div>

          <nav className="space-y-4 pt-16 md:pt-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2 px-4">Portal</div>
            <SidebarItem icon={<LayoutDashboard size={20} />} label="Bosh sahifa" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} />
            <SidebarItem icon={<FileText size={20} />} label="Hujjat topshirish" active={activeTab === 'apply'} onClick={() => { setActiveTab('apply'); setIsMobileMenuOpen(false); }} />
            <SidebarItem icon={<BarChart3 size={20} />} label="Ariza holati" active={activeTab === 'status'} onClick={() => { setActiveTab('status'); setIsMobileMenuOpen(false); }} />
            <SidebarItem icon={<UserCircle size={20} />} label="Profil" active={activeTab === 'profile'} onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }} />
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-zinc-800/30">
          <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50 mb-6">
            <div className="text-[10px] uppercase text-zinc-600 mb-1 tracking-widest">Blind Mode</div>
            <div className="flex items-center gap-2 text-sm text-emerald-500/80">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              Faol
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/30 hover:bg-zinc-800/50 transition-all cursor-pointer group border border-transparent hover:border-zinc-800/50">
            <img
              src={
                profileDraft?.photoUrl ||
                candidate.photoUrl ||
                createAvatarPlaceholder(`${candidate.name} ${candidate.surname}`)
              }
              alt={candidate.name}
              className="w-10 h-10 rounded-full border border-zinc-800 shadow-lg grayscale"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-zinc-300">{candidate.name} {candidate.surname}</p>
              <p className="text-xs text-zinc-600 truncate">Nomzod</p>
            </div>
            <LogOut size={16} onClick={() => window.location.reload()} className="text-zinc-600 group-hover:text-red-400 transition-colors" />
          </div>
        </div>
      </aside>

      <main className="p-4 pt-20 transition-all duration-300 sm:p-6 sm:pt-24 md:ml-64 md:p-10 md:pt-10">
        <header className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xs uppercase tracking-[0.3em] text-zinc-600 mb-2 font-bold">
              {activeTab === 'dashboard' && 'Xush kelibsiz'}
              {activeTab === 'apply' && 'Yangi ariza'}
              {activeTab === 'status' && 'Kuzatuv'}
              {activeTab === 'profile' && 'Shaxsiy profil'}
            </h1>
            <h2 className="text-2xl md:text-3xl font-serif italic text-zinc-200 tracking-tight">
              {activeTab === 'dashboard' && `Salom, ${candidate.name}`}
              {activeTab === 'apply' && 'Vakansiya uchun ariza'}
              {activeTab === 'status' && 'Arizalar holati'}
              {activeTab === 'profile' && 'Profilni yangilash'}
            </h2>
          </div>
          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
            <div className="flex flex-col items-start md:items-end">
              <span className="text-[10px] uppercase text-zinc-600 tracking-widest font-bold">Sana</span>
              <span className="text-xs md:text-sm font-serif italic text-zinc-400">{new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="h-10 w-px bg-zinc-800/50"></div>
            <div className="px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-500/70 text-[10px] font-bold tracking-[0.1em] flex items-center gap-2">
              <ShieldCheck size={14} className="animate-pulse" />
              BACKEND SECURE
            </div>
          </div>
        </header>

        {(errorMessage || successMessage) && (
          <div className="space-y-3 mb-8">
            {errorMessage && (
              <div className="rounded-2xl border border-red-900/30 bg-red-950/20 px-5 py-4 text-sm text-red-300">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="rounded-2xl border border-emerald-900/30 bg-emerald-950/20 px-5 py-4 text-sm text-emerald-300">
                {successMessage}
              </div>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Arizalar soni" value={application ? '1' : '0'} icon={<FileText className="text-emerald-500" />} trend={application ? 'Backend bilan sinxron' : 'Ariza hali yuborilmagan'} />
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
                    <button onClick={() => setActiveTab(application ? 'status' : 'apply')} className="text-emerald-500/60 font-semibold text-sm hover:text-emerald-400 hover:underline transition-colors">
                      Batafsil ko'rish
                    </button>
                  </div>
                </div>

                <div className="relative flex flex-wrap justify-center md:justify-between px-4 gap-y-12">
                  <div className="absolute top-5 left-0 right-0 h-[1px] bg-zinc-800/30 -z-10 mx-10 hidden md:block"></div>
                  <div
                    className="absolute top-5 left-0 h-[1px] bg-emerald-500/60 -z-10 transition-all duration-700 mx-10 shadow-[0_0_10px_rgba(16,185,129,0.3)] hidden md:block"
                    style={{ width: `${Math.max(0, currentStep - 1) * 25}%` }}
                  ></div>
                  <ProgressStep icon={<Upload size={20} />} label="Hujjatlar" active={currentStep >= 1} done={currentStep > 1} />
                  <ProgressStep icon={<EyeOff size={20} />} label="Anonimlik" active={currentStep >= 2} done={currentStep > 2} />
                  <ProgressStep icon={<BarChart3 size={20} />} label="Merit Test" active={currentStep >= 3} done={currentStep > 3} />
                  <ProgressStep icon={<Lock size={20} />} label="Reyting" active={currentStep >= 4} done={currentStep > 4} />
                  <ProgressStep icon={<CheckCircle2 size={20} />} label="Qaror" active={currentStep >= 5} done={currentStep > 5} />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'apply' && (
            <motion.div key="apply" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mx-auto w-full max-w-4xl">
              <div className="relative overflow-hidden rounded-3xl border border-zinc-800/50 bg-[#080808] p-6 shadow-2xl sm:p-8 md:p-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -z-0"></div>
                <h2 className="text-2xl font-serif italic mb-8 relative z-10 text-zinc-200">Ariza yuborish</h2>

                <div className="space-y-8 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Vazirlik / Tashkilot *</label>
                      <select
                        value={applicationDraft.department}
                        onChange={(event) => {
                          const department = event.target.value;
                          setApplicationDraft((prev) => ({ ...prev, department, position: '' }));
                        }}
                        className={`w-full bg-zinc-900/40 border rounded-xl px-5 py-4 font-semibold text-zinc-400 outline-none transition-all appearance-none cursor-pointer ${
                          departmentInputError
                            ? 'border-red-900/60 focus:ring-1 focus:ring-red-500/30'
                            : 'border-zinc-800/50 focus:ring-1 focus:ring-emerald-500/30'
                        }`}
                      >
                        <option value="" className="bg-[#080808]">Tanlang</option>
                        {vacancies.map((item) => (
                          <option key={item.department} value={item.department} className="bg-[#080808]">
                            {item.department}
                          </option>
                        ))}
                      </select>
                      {departmentInputError ? (
                        <p className="text-[11px] text-red-400">{departmentInputError}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Vakansiya nomi *</label>
                      <select
                        value={applicationDraft.position}
                        onChange={(event) => setApplicationDraft((prev) => ({ ...prev, position: event.target.value }))}
                        className={`w-full bg-zinc-900/40 border rounded-xl px-5 py-4 font-semibold text-zinc-400 outline-none transition-all appearance-none cursor-pointer ${
                          positionInputError
                            ? 'border-red-900/60 focus:ring-1 focus:ring-red-500/30'
                            : 'border-zinc-800/50 focus:ring-1 focus:ring-emerald-500/30'
                        }`}
                      >
                        <option value="" className="bg-[#080808]">{vacancyPlaceholder}</option>
                        {currentVacancyPositions.map((position) => (
                          <option key={position} value={position} className="bg-[#080808]">
                            {position}
                          </option>
                        ))}
                      </select>
                      {positionInputError ? (
                        <p className="text-[11px] text-red-400">{positionInputError}</p>
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
                      onChange={(value) =>
                        setApplicationDraft((prev) => ({
                          ...prev,
                          phone: normalizePhoneInput(value),
                        }))
                      }
                      placeholder="+998901234567"
                      inputMode="tel"
                      error={phoneInputError}
                    />
                    <FormInput
                      label="Telegram *"
                      value={applicationDraft.telegram}
                      onChange={(value) =>
                        setApplicationDraft((prev) => ({
                          ...prev,
                          telegram: normalizeTelegramInput(value),
                        }))
                      }
                      placeholder="@username"
                      error={telegramInputError}
                    />
                  </div>

                  <div className="space-y-6">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Majburiy hujjatlar</label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {REQUIRED_DOCUMENTS.map((document) => (
                        <Fragment key={document.type}>
                          <FileUploadBox
                            label={document.label}
                            fileName={documentDrafts[document.type]?.name}
                            isUploading={uploadingDocumentType === document.type}
                            onClear={() => handleDocumentClear(document.type)}
                            onFileSelect={(file) =>
                              void handleDocumentSelect(document.type, document.label, file)
                            }
                          />
                        </Fragment>
                      ))}
                    </div>
                    {documentsInputError ? (
                      <p className="text-[11px] text-red-400">{documentsInputError}</p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormTextarea label="Ko'nikmalar (ixtiyoriy)" value={applicationDraft.skills} onChange={(value) => setApplicationDraft((prev) => ({ ...prev, skills: value }))} />
                    <FormTextarea label="Tajriba (ixtiyoriy)" value={applicationDraft.experience} onChange={(value) => setApplicationDraft((prev) => ({ ...prev, experience: value }))} />
                    <FormTextarea label="Ta'lim (ixtiyoriy)" value={applicationDraft.education} onChange={(value) => setApplicationDraft((prev) => ({ ...prev, education: value }))} />
                    <FormTextarea label="Qisqa tavsif (ixtiyoriy)" value={applicationDraft.summary} onChange={(value) => setApplicationDraft((prev) => ({ ...prev, summary: value }))} />
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
                    onClick={() => void handleApply()}
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
          )}

          {activeTab === 'status' && (
            <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              {!application ? (
                <div className="bg-[#080808] rounded-3xl p-12 border border-zinc-800/50 text-center">
                  <h3 className="text-2xl font-serif italic text-zinc-200">Faol ariza topilmadi</h3>
                  <p className="text-zinc-500 mt-3">Avval vakansiya tanlab, arizani backend bazaga yuboring.</p>
                </div>
              ) : application.status === 'merit_test' ? (
                <MeritTest questions={meritQuestions} busy={submittingTest} onComplete={handleCompleteMeritTest} />
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
                          src={
                            profileDraft?.photoUrl ||
                            candidate.photoUrl ||
                            createAvatarPlaceholder(`${candidate.name} ${candidate.surname}`)
                          }
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
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500/10 animate-scanline"></div>
                      <div className="mb-6 flex flex-col gap-4 border-b border-zinc-800/30 pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <EyeOff className="text-emerald-500/70" size={20} />
                          <h3 className="font-serif italic text-xl text-zinc-200">Anonim ko'rinish</h3>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-500/60 uppercase tracking-wider">
                          <span className="w-2 h-2 bg-emerald-500/60 rounded-full animate-pulse"></span>
                          API Sync
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                          <div className="w-24 h-24 bg-zinc-900/50 rounded-2xl flex items-center justify-center backdrop-blur-md border border-zinc-800/50">
                            <Lock size={32} className="text-zinc-800" />
                          </div>
                          <div className="space-y-3 flex-1">
                            <div className="h-6 bg-zinc-800/50 rounded w-1/2 animate-pulse"></div>
                            <div className="h-4 bg-zinc-800/30 rounded w-1/3 animate-pulse"></div>
                            <div className="h-4 bg-zinc-800/20 rounded w-1/4 animate-pulse"></div>
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

                  {(application.status === 'submitted' || application.status === 'blind_review') && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="group relative overflow-hidden rounded-3xl border border-emerald-500/10 bg-[#080808] p-6 shadow-2xl sm:p-8 md:p-10">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-all"></div>
                      <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="space-y-4 max-w-xl text-center md:text-left">
                          <h2 className="text-3xl font-serif italic text-zinc-300 tracking-tight">Merit Test uchun tayyormisiz?</h2>
                          <p className="text-zinc-600 text-lg leading-relaxed">
                            Ariza backend bazada saqlandi. Endi onlayn merit test topshirib, reyting bosqichiga o'tasiz.
                          </p>
                        </div>
                        <button
                          onClick={() => setApplication((prev) => prev ? { ...prev, status: 'merit_test' } : prev)}
                          className="bg-emerald-600 text-black px-10 py-5 rounded-2xl font-bold text-xl hover:bg-emerald-500 transition-all shadow-[0_0_30px_rgba(5,150,105,0.2)] hover:scale-105 flex items-center gap-3"
                        >
                          <BarChart3 />
                          Testni boshlash
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {(application.status === 'ranking' || application.status === 'completed') && (
                    <div className="bg-[#080808] rounded-3xl p-8 border border-zinc-800/50">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-emerald-500/5 rounded-xl flex items-center justify-center border border-emerald-500/10">
                          <Lock className="text-emerald-500/60" size={20} />
                        </div>
                        <h3 className="text-xl font-serif italic text-zinc-300">Majburiy Merit Reytingi</h3>
                      </div>

                      <div className="space-y-4">
                        {(rankingPreview.length > 0 ? rankingPreview : fallbackRanking(application)).map((row) => (
                          <Fragment key={`${row.rank}-${row.name}`}>
                            <RankingRow name={row.name} score={row.score} rank={row.rank} isYou={row.isYou} blocked={row.blocked} />
                          </Fragment>
                        ))}
                      </div>

                      {application.conflictDetected && (
                        <div className="mt-8 p-6 bg-red-950/10 border border-red-900/20 rounded-2xl flex items-start gap-4 text-red-400">
                          <AlertCircle size={24} className="text-red-600 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-[10px] uppercase tracking-widest mb-1">Xavfsizlik bayrog'i</p>
                            <p className="text-sm opacity-80 leading-relaxed font-serif italic">
                              Backend konflikt aloqasini qayd etdi. Shu sababli tanlov qo'shimcha nazorat bilan davom etadi.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mx-auto w-full max-w-4xl">
              <div className="rounded-3xl border border-zinc-800/50 bg-[#080808] p-6 shadow-2xl sm:p-8 md:p-10">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-serif italic text-zinc-200">Profil ma'lumotlari</h3>
                    <p className="text-sm text-zinc-500 mt-2">Bu bo'lim to'g'ridan-to'g'ri backenddagi candidate profile yozuvini yangilaydi.</p>
                  </div>
                  <button
                    onClick={() => void handleSaveProfile()}
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
                    imageUrl={profileDraft.photoUrl}
                    hasPendingFile={Boolean(pendingProfilePhoto)}
                    onFileSelect={handleProfilePhotoChange}
                    onReset={handleProfilePhotoReset}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput label="Ism" value={profileDraft.name} onChange={(value) => setProfileDraft((prev) => prev ? { ...prev, name: value } : prev)} />
                  <FormInput label="Familiya" value={profileDraft.surname} onChange={(value) => setProfileDraft((prev) => prev ? { ...prev, surname: value } : prev)} />
                  <FormInput label="Jins" value={profileDraft.gender} disabled onChange={() => {}} />
                  <FormInput label="Tug'ilgan joy" value={profileDraft.birthPlace} onChange={(value) => setProfileDraft((prev) => prev ? { ...prev, birthPlace: value } : prev)} />
                  <FormInput label="Email" value={profileDraft.email} disabled onChange={() => {}} />
                  <FormInput label="Telefon" value={profileDraft.phone} onChange={(value) => setProfileDraft((prev) => prev ? { ...prev, phone: normalizePhoneInput(value) } : prev)} />
                  <FormTextarea label="Aloqalar" value={profileDraft.connections.join('\n')} onChange={(value) => setProfileDraft((prev) => prev ? { ...prev, connections: value.split('\n').map((item) => item.trim()).filter(Boolean) } : prev)} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isSubmitConfirmOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSubmitConfirmOpen(false)}
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
                    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Vazirlik</p>
                      <p className="mt-2 text-sm font-semibold text-zinc-300">{applicationDraft.department}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Vakansiya</p>
                      <p className="mt-2 text-sm font-semibold text-zinc-300">{applicationDraft.position}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Telefon</p>
                      <p className="mt-2 text-sm font-semibold text-zinc-300">{normalizedPhone}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Telegram</p>
                      <p className="mt-2 text-sm font-semibold text-zinc-300">
                        {normalizedTelegram}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col-reverse md:flex-row gap-3">
                    <button
                      onClick={() => setIsSubmitConfirmOpen(false)}
                      className="w-full rounded-2xl border border-zinc-800 px-5 py-4 text-sm font-bold text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 transition-colors"
                    >
                      Yo'q, qayta ko'raman
                    </button>
                    <button
                      onClick={() => void handleConfirmApply()}
                      disabled={submittingApplication || Boolean(uploadingDocumentType)}
                      className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-bold text-black hover:bg-emerald-500 transition-colors disabled:opacity-60"
                    >
                      {submittingApplication ? 'Yuborilmoqda...' : "Ha, arizani yuborish"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: ReactNode, label: string, active: boolean, onClick: () => void }) {
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

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: ReactNode, trend: string }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-zinc-800/50 bg-[#080808] p-5 shadow-sm transition-all hover:bg-zinc-800/50 sm:flex sm:items-center sm:gap-6 sm:p-6">
      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full pointer-events-none"></div>
      <div className="mb-4 w-fit rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-4 transition-transform group-hover:scale-110 sm:mb-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-1">{title}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline">
          <h4 className="text-2xl font-bold text-zinc-300">{value}</h4>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trend.includes('Toza') || trend.includes('Tasdiqlangan') ? 'text-emerald-500/80 bg-emerald-500/10 border border-emerald-500/10' : 'text-zinc-600 bg-zinc-800/30'}`}>{trend}</span>
        </div>
      </div>
    </div>
  );
}

function ProgressStep({ icon, label, active, done }: { icon: ReactNode, label: string, active: boolean, done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 relative">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
        done ? 'bg-emerald-600 border-emerald-600 text-black shadow-[0_0_20px_rgba(5,150,105,0.3)]' :
        active ? 'bg-[#080808] border-emerald-500/50 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
        'bg-[#080808] border-zinc-800/50 text-zinc-800'
      }`}>
        {done ? <CheckCircle2 size={24} /> : icon}
      </div>
      <p className={`text-[10px] uppercase font-bold tracking-widest ${active || done ? 'text-zinc-400' : 'text-zinc-800'}`}>{label}</p>
    </div>
  );
}

function FileUploadBox({
  label,
  fileName,
  isUploading,
  onClear,
  onFileSelect,
}: {
  label: string,
  fileName?: string,
  isUploading?: boolean,
  onClear: () => void,
  onFileSelect: (file: File | null) => void,
}) {
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
        {isUploaded && <CheckCircle2 size={16} className="text-emerald-600" />}
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

function ProfileImageField({
  name,
  imageUrl,
  hasPendingFile,
  onFileSelect,
  onReset,
}: {
  name: string,
  imageUrl: string,
  hasPendingFile: boolean,
  onFileSelect: (file: File | null) => void,
  onReset: () => void,
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <img
            src={imageUrl || createAvatarPlaceholder(name)}
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

function FormInput({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  inputMode,
  error,
}: {
  label: string,
  value: string,
  onChange: (value: string) => void,
  disabled?: boolean,
  placeholder?: string,
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'],
  error?: string,
}) {
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

function FormTextarea({ label, value, onChange }: { label: string, value: string, onChange: (value: string) => void }) {
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

function MeritTest({
  questions,
  busy,
  onComplete,
}: {
  questions: MeritQuestion[],
  busy: boolean,
  onComplete: (answers: number[]) => void,
}) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  useEffect(() => {
    setCurrentQuestion(0);
    setAnswers([]);
  }, [questions]);

  if (questions.length === 0) {
    return (
      <div className="bg-[#080808] rounded-3xl p-12 border border-zinc-800/50 shadow-2xl max-w-3xl mx-auto text-center">
        <h3 className="text-2xl font-serif italic text-zinc-300">Merit savollari hozircha mavjud emas</h3>
      </div>
    );
  }

  const handleAnswer = (answerIndex: number) => {
    if (busy) {
      return;
    }

    const nextAnswers = [...answers, answerIndex + 1];

    if (currentQuestion < questions.length - 1) {
      setAnswers(nextAnswers);
      setCurrentQuestion((prev) => prev + 1);
      return;
    }

    onComplete(nextAnswers);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-zinc-800/50 bg-[#080808] p-6 shadow-2xl sm:p-8 md:p-12"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="relative z-10 mb-8 flex flex-col gap-3 border-b border-zinc-800/30 pb-6 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-widest">Merit Baholash Jarayoni</span>
        </div>
        <span className="text-xs font-mono text-zinc-700 tracking-widest uppercase">
          {busy ? 'Yuborilmoqda...' : `Savol ${currentQuestion + 1} / ${questions.length}`}
        </span>
      </div>

      <h3 className="text-2xl font-serif italic text-zinc-300 mb-10 leading-relaxed relative z-10">
        "{questions[currentQuestion].question}"
      </h3>

      <div className="grid grid-cols-1 gap-4 relative z-10">
        {questions[currentQuestion].options.map((option, index) => (
          <button
            key={`${questions[currentQuestion].id}-${index}`}
            onClick={() => handleAnswer(index)}
            disabled={busy}
            className="group flex w-full flex-col gap-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/20 p-5 text-left transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5 disabled:opacity-60 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <span className="text-lg text-zinc-500 group-hover:text-zinc-200 transition-colors font-medium">{option}</span>
            {busy ? <Loader2 size={20} className="animate-spin text-emerald-500" /> : <ArrowRight size={20} className="text-zinc-800 group-hover:text-emerald-500 group-hover:translate-x-2 transition-all" />}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function RankingRow({ name, score, rank, isYou, blocked }: { name: string, score: number, rank: number, isYou?: boolean, blocked?: boolean }) {
  return (
    <div className={`flex flex-col items-start gap-4 rounded-2xl border p-5 transition-all sm:flex-row sm:items-center sm:gap-6 ${
      isYou ? 'bg-emerald-600/10 border-emerald-500/30 shadow-[0_0_20px_rgba(5,150,105,0.05)]' : 'bg-zinc-900/20 border-zinc-800/50'
    }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
        rank <= 3 ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(5,150,105,0.2)]' : 'bg-zinc-800/50 text-zinc-700'
      }`}>
        #{rank}
      </div>
      <div className="flex-1">
        <p className={`font-bold transition-colors ${isYou ? 'text-emerald-400' : 'text-zinc-400'}`}>
          {name} {isYou && <span className="text-[10px] border border-emerald-500/30 text-emerald-500/80 px-2 py-0.5 rounded ml-2 uppercase tracking-tighter font-bold">Sizning balingiz</span>}
        </p>
        <p className="text-[10px] text-zinc-600 font-mono mt-1 uppercase tracking-widest font-medium">Kompetentsiya indeksi: {score}/100</p>
      </div>
      <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-start sm:gap-6">
        <div className="text-left sm:text-right">
          <p className={`text-2xl font-light ${isYou ? 'text-emerald-400' : 'text-zinc-500'}`}>{score}</p>
        </div>
        {blocked ? (
          <div className="bg-red-900/20 text-red-600 p-2 rounded-lg border border-red-900/30" title="Blocked by integrity logic">
            <Lock size={18} />
          </div>
        ) : rank <= 3 ? (
          <div className="bg-emerald-950/30 text-emerald-600 p-2 rounded-lg border border-emerald-900/30" title="Selection authorized">
            <CheckCircle2 size={18} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
