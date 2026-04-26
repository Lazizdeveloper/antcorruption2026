import {
  useEffect,
  useState,
} from 'react';
import {
  FileText,
  ShieldCheck,
  LayoutDashboard,
  UserCircle,
  BarChart3,
  LogOut,
  Loader2,
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
import { SidebarItem } from './components/SidebarItem';
import {
  ApplyScene,
  DashboardScene,
  ProfileScene,
  StatusScene,
  SubmitConfirmModal,
} from './components/KadrScenes';

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
  const rankingRows =
    rankingPreview.length > 0 ? rankingPreview : fallbackRanking(application);

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
          {activeTab === 'dashboard' && candidate && (
            <DashboardScene
              application={application}
              candidate={candidate}
              currentStep={currentStep}
              onOpenApplication={() => setActiveTab('apply')}
              onOpenStatus={() => setActiveTab('status')}
            />
          )}

          {activeTab === 'apply' && (
            <ApplyScene
              applicationDraft={applicationDraft}
              currentVacancyPositions={currentVacancyPositions}
              documentDrafts={documentDrafts}
              errors={{
                department: departmentInputError,
                documents: documentsInputError,
                phone: phoneInputError,
                position: positionInputError,
                telegram: telegramInputError,
              }}
              onApply={() => void handleApply()}
              onDepartmentChange={(department) =>
                setApplicationDraft((prev) => ({ ...prev, department, position: '' }))
              }
              onDocumentClear={handleDocumentClear}
              onDocumentSelect={(type, label, file) => {
                void handleDocumentSelect(type, label, file);
              }}
              onPhoneChange={(value) =>
                setApplicationDraft((prev) => ({ ...prev, phone: normalizePhoneInput(value) }))
              }
              onPositionChange={(position) =>
                setApplicationDraft((prev) => ({ ...prev, position }))
              }
              onTelegramChange={(value) =>
                setApplicationDraft((prev) => ({ ...prev, telegram: normalizeTelegramInput(value) }))
              }
              onTextFieldChange={(field, value) =>
                setApplicationDraft((prev) => ({ ...prev, [field]: value }))
              }
              requiredDocuments={REQUIRED_DOCUMENTS}
              submittingApplication={submittingApplication}
              uploadingDocumentType={uploadingDocumentType}
              vacancies={vacancies}
              vacancyPlaceholder={vacancyPlaceholder}
            />
          )}

          {activeTab === 'status' && candidate && (
            <StatusScene
              application={application}
              candidate={candidate}
              meritQuestions={meritQuestions}
              onCompleteMeritTest={(answers) => void handleCompleteMeritTest(answers)}
              onStartMeritTest={() => setApplication((prev) => (prev ? { ...prev, status: 'merit_test' } : prev))}
              profileImageUrl={
                profileDraft?.photoUrl ||
                candidate.photoUrl ||
                createAvatarPlaceholder(`${candidate.name} ${candidate.surname}`)
              }
              rankingRows={rankingRows}
              submittingTest={submittingTest}
            />
          )}

          {activeTab === 'profile' && profileDraft && (
            <ProfileScene
              hasPendingProfilePhoto={Boolean(pendingProfilePhoto)}
              onConnectionsChange={(value) =>
                setProfileDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        connections: value.split('\n').map((item) => item.trim()).filter(Boolean),
                      }
                    : prev,
                )
              }
              onFieldChange={(field, value) =>
                setProfileDraft((prev) => (prev ? { ...prev, [field]: value } : prev))
              }
              onFileSelect={handleProfilePhotoChange}
              onPhoneChange={(value) =>
                setProfileDraft((prev) => (prev ? { ...prev, phone: normalizePhoneInput(value) } : prev))
              }
              onResetPhoto={handleProfilePhotoReset}
              onSave={() => void handleSaveProfile()}
              profileDraft={profileDraft}
              profileImageUrl={
                profileDraft.photoUrl ||
                createAvatarPlaceholder(`${profileDraft.name} ${profileDraft.surname}`)
              }
              savingProfile={savingProfile}
            />
          )}
        </AnimatePresence>

        <SubmitConfirmModal
          applicationDraft={applicationDraft}
          busy={submittingApplication}
          open={isSubmitConfirmOpen}
          onClose={() => setIsSubmitConfirmOpen(false)}
          onConfirm={() => void handleConfirmApply()}
          normalizedPhone={normalizedPhone}
          normalizedTelegram={normalizedTelegram}
          uploadingDocumentType={uploadingDocumentType}
        />
      </main>
    </div>
  );
}


