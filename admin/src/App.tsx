/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  AlertTriangle,
  ArrowRight, 
  Search, 
  Bell, 
  User, 
  BarChart3, 
  CheckCircle2,
  FileText,
  ShieldAlert,
  Flag,
  Menu,
  X,
  ShieldCheck,
  CheckCircle,
  Database,
  Cpu,
  AlertCircle,
  Clock,
  Target,
  PieChart,
  Building,
  Save,
  Upload,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  ReferenceLine
} from 'recharts';
import {
  createReport,
  downloadBlob,
  downloadDashboardExport,
  downloadReportsExport,
  fetchDashboard,
  fetchReports,
  updateProfile,
  uploadProfileImage,
} from './lib/api';
import {
  AdminNotification,
  AdminProfile,
  Case,
  Candidate,
  ExternalProject,
  IntegrityReport,
  NewsItem,
  RiskStats,
} from './types';
import {
  createLocalNotification,
  buildSelectionNotification,
  buildSelectionStatus,
  filterCandidates,
  formatHiringAlertReason,
  formatOptionalValue,
  formatNotificationTime,
  isConflictHireReport,
  mergeNotifications,
  type SelectionStatus,
} from './lib/integrity';
import { CaseDetail } from './components/CaseDetail';
import { PersonDetail } from './components/PersonDetail';
import { SelectionReport } from './components/SelectionReport';

const MAX_PROFILE_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;

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
      <rect width="96" height="96" rx="24" fill="#18181b" />
      <text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" fill="#d4af37" font-family="Arial, sans-serif" font-size="28" font-weight="700">${initials}</text>
    </svg>`,
  )}`;
}

const PriceComparison = ({ data }: { data: any[] }) => (
  <div className="glass-panel p-6 rounded-lg border border-zinc-800">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Narx Anomaliyasi Tahlili</h4>
        <p className="text-[9px] text-zinc-600 mt-1 uppercase tracking-widest italic">Kritik chegara: +30%</p>
      </div>
      <PieChart size={16} className="text-gold opacity-50" />
    </div>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', fontSize: '10px' }}
            itemStyle={{ color: '#d4d4d8' }}
          />
          <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: '30% Anomaliya', fill: '#ef4444', fontSize: '8px' }} />
          <Bar dataKey="price" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.price > 100 ? '#ef4444' : '#ca8a04'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="mt-4 p-3 bg-red-950/10 border border-red-900/30 rounded flex items-start gap-3">
       <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
       <p className="text-[9px] text-zinc-400 italic">
         Qizil ustunlar bozor o'rtacha narxidan 30% dan ortiq qimmat takliflarni bildiradi. Bu korrupsion kelishuv alomati bo'lishi mumkin.
       </p>
    </div>
  </div>
);

// Components

const StatCard = ({ title, value, icon: Icon, color, trend }: { title: string, value: string | number, icon: any, color: string, trend?: string }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-panel p-4 sm:p-6 rounded-xl stat-card flex flex-col"
  >
    <div className="flex items-start justify-between mb-3 sm:mb-4">
      <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-zinc-500">{title}</p>
      <Icon size={16} className="text-zinc-500 sm:w-[18px] sm:h-[18px]" />
    </div>
    <h3 className="text-2xl sm:text-3xl serif-title font-medium text-zinc-100">{value}</h3>
    {trend && <p className="text-[9px] sm:text-[10px] mt-2 text-zinc-400">{trend}</p>}
  </motion.div>
);

function AdminProfileModal({
  profile,
  saving,
  hasPendingFile,
  onClose,
  onSave,
  onProfileChange,
  onFileSelect,
  onResetPhoto,
}: {
  profile: AdminProfile;
  saving: boolean;
  hasPendingFile: boolean;
  onClose: () => void;
  onSave: () => void;
  onProfileChange: (patch: Partial<AdminProfile>) => void;
  onFileSelect: (file: File | null) => void;
  onResetPhoto: () => void;
}) {
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
                src={profile.photoUrl || createAvatarPlaceholder(profile.fullName)}
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'recruitment' | 'tenders' | 'audit'>('dashboard');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stats, setStats] = useState<RiskStats>({
    highRiskCases: 0,
    totalCases: 0,
    potentialSavings: '0 $',
  });
  const [selectionStatus, setSelectionStatus] = useState<SelectionStatus | null>(null);
  const [isSelectionReportOpen, setIsSelectionReportOpen] = useState(false);
  const [displayCases, setDisplayCases] = useState<Case[]>([]);
  const [candidateRows, setCandidateRows] = useState<Candidate[]>([]);
  const [timelineData, setTimelineData] = useState<Array<{ name: string; value: number }>>([]);
  const [soliqGraphData, setSoliqGraphData] = useState<Array<{ name: string; entities: number; individuals: number }>>([]);
  const [externalProjects, setExternalProjects] = useState<ExternalProject[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [reports, setReports] = useState<IntegrityReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [exportingReports, setExportingReports] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [pendingProfilePhoto, setPendingProfilePhoto] = useState<File | null>(null);
  const [savedProfilePhotoUrl, setSavedProfilePhotoUrl] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [serverNotifications, setServerNotifications] = useState<AdminNotification[]>([]);
  const [localNotifications, setLocalNotifications] = useState<AdminNotification[]>([]);
  const [dismissedServerNotificationIds, setDismissedServerNotificationIds] = useState<string[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async (withLoader = true) => {
      if (withLoader) {
        setLoading(true);
      }

      try {
        const [dashboard, reportRows] = await Promise.all([fetchDashboard(), fetchReports()]);

        if (!isMounted) {
          return;
        }

        setStats(dashboard.stats);
        setDisplayCases(dashboard.cases);
        setCandidateRows(dashboard.candidates);
        setTimelineData(dashboard.timelineData);
        setSoliqGraphData(dashboard.soliqGraphData);
        setExternalProjects(dashboard.externalProjects);
        setNewsItems(dashboard.newsItems);
        setReports(reportRows);
        setAdminProfile(dashboard.profile);
        setSavedProfilePhotoUrl(dashboard.profile?.photoUrl ?? '');
        setPendingProfilePhoto(null);
        setServerNotifications(dashboard.notifications);
        setLoadError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : 'Dashboard yuklanmadi');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadData();
    const interval = window.setInterval(() => {
      void loadData(false);
    }, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const filteredCases = displayCases.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCandidates = filterCandidates(candidateRows, searchQuery);
  const notifications = mergeNotifications(
    serverNotifications,
    localNotifications,
    dismissedServerNotificationIds,
  );
  const unreadNotifications = notifications.filter(
    (notification) => !readNotificationIds.includes(notification.id),
  );

  const formatReportTime = (value: string) =>
    new Date(value).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const pushNotification = (text: string, type: 'error' | 'success' | 'info') => {
    setLocalNotifications((prev) => [createLocalNotification(text, type), ...prev]);
  };

  const handleProfilePhotoChange = async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setLoadError('Profil uchun faqat rasm faylini yuklang.');
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
      setLoadError('Profil rasmi 3 MB dan oshmasligi kerak.');
      return;
    }

    try {
      const previewUrl = await readFileAsDataUrl(file);
      setPendingProfilePhoto(file);
      setAdminProfile((prev) => (prev ? { ...prev, photoUrl: previewUrl } : prev));
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Rasm faylini o'qib bo'lmadi");
    }
  };

  const handleProfilePhotoReset = () => {
    setPendingProfilePhoto(null);
    setAdminProfile((prev) => (prev ? { ...prev, photoUrl: savedProfilePhotoUrl } : prev));
  };

  const handleSaveProfile = async () => {
    if (!adminProfile) {
      return;
    }

    setSavingProfile(true);

    try {
      const nextPhotoUrl = pendingProfilePhoto
        ? await uploadProfileImage(pendingProfilePhoto)
        : adminProfile.photoUrl;
      const updatedProfile = await updateProfile({
        ...adminProfile,
        photoUrl: nextPhotoUrl,
      });
      setAdminProfile(updatedProfile);
      setSavedProfilePhotoUrl(updatedProfile.photoUrl ?? '');
      setPendingProfilePhoto(null);
      setLoadError(null);
      setIsProfileModalOpen(false);
      pushNotification('Admin profil rasmi yangilandi', 'success');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Profil saqlanmadi');
    } finally {
      setSavingProfile(false);
    }
  };

  const clearNotifications = () => {
    setLocalNotifications([]);
    setDismissedServerNotificationIds(serverNotifications.map((notification) => notification.id));
    setShowNotifications(false);
  };

  const markAllNotificationsAsRead = () => {
    setReadNotificationIds((prev) => {
      const readIds = new Set(prev);

      for (const notification of notifications) {
        readIds.add(notification.id);
      }

      return Array.from(readIds);
    });
  };

  const handleSelectCandidate = (candidate: Candidate) => {
    const selection = buildSelectionStatus(candidate);
    const notification = buildSelectionNotification(candidate);

    setSelectionStatus(selection);

    if (notification) {
      pushNotification(notification.text, notification.type);
    }

    setIsSelectionReportOpen(true);
  };

  const handleExport = async () => {
    pushNotification('Ma`lumotlar eksport qilinmoqda...', 'info');

    try {
      const blob = await downloadDashboardExport();
      downloadBlob(blob, `admin-dashboard-${new Date().toISOString().slice(0, 10)}.csv`);
      pushNotification('Dashboard eksporti muvaffaqiyatli yuklandi (.csv)', 'success');
    } catch (error) {
      pushNotification(error instanceof Error ? error.message : 'Eksport bajarilmadi', 'error');
    }
  };

  const handleCaseReport = async (caseItem: Case) => {
    const report = await createReport({
      reportType: 'case',
      referenceId: caseItem.id,
      title: `${caseItem.id} bo'yicha audit signali`,
      message: `${caseItem.organization}: ${caseItem.description}`,
      severity: caseItem.riskScore >= 75 ? 'high' : caseItem.riskScore >= 40 ? 'medium' : 'low',
    });

    setReports(prev => [report, ...prev]);
    pushNotification(`${caseItem.id} bo'yicha report saqlandi`, 'success');
  };

  const handleSelectionReport = async (result: SelectionStatus) => {
    const report = await createReport({
      reportType: 'candidate',
      referenceId: result.candidate.id,
      title: `${result.candidate.id} bo'yicha integrity signali`,
      message: result.message,
      severity: result.type === 'error' ? 'high' : 'low',
    });

    setReports(prev => [report, ...prev]);
    pushNotification(`${result.candidate.id} bo'yicha report yaratildi`, 'success');
  };

  const handleExportReports = async () => {
    setExportingReports(true);

    try {
      const blob = await downloadReportsExport();
      downloadBlob(blob, `admin-reports-${new Date().toISOString().slice(0, 10)}.csv`);
      pushNotification('Backend reportlar eksporti yuklandi (.csv)', 'success');
    } catch (error) {
      pushNotification(error instanceof Error ? error.message : 'Report eksporti bajarilmadi', 'error');
    } finally {
      setExportingReports(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center font-sans">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="mb-6"
        >
          <ShieldAlert size={64} className="text-gold opacity-50" />
        </motion.div>
        <h2 className="text-2xl serif-title font-bold text-gold tracking-tight">EthicFlow AI</h2>
        <p className="text-zinc-500 text-xs uppercase tracking-[0.3em] mt-2">Halollik tizimi yuklanmoqda</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-dark-bg flex font-sans text-zinc-300 selection:bg-gold selection:text-black">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-[18rem] transform flex-col border-r bg-zinc-950/95 transition-all duration-300 gold-border ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:w-64 md:bg-zinc-950/50`}>
        <div className="p-8 pb-4 relative">
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-4 right-4 p-1 hover:bg-zinc-800 rounded md:hidden"
          >
            <X size={20} className="text-zinc-400" />
          </button>
          <div className="mb-8">
            <h1 className="text-2xl serif-title font-bold text-gold">EthicFlow</h1>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Iqtisodiyot va moliya vazirligi</p>
          </div>
          
          <nav className="space-y-1">
            <button 
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded text-[11px] uppercase tracking-widest font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-gold/10 text-gold border-r-2 border-gold font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <LayoutDashboard size={16} />
              Boshqaruv paneli
            </button>
            <button 
              onClick={() => { setActiveTab('recruitment'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded text-[11px] uppercase tracking-widest font-semibold transition-all ${activeTab === 'recruitment' ? 'bg-gold/10 text-gold border-r-2 border-gold font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Users size={16} />
              Kadrlar
            </button>
            <button 
              onClick={() => { setActiveTab('tenders'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded text-[11px] uppercase tracking-widest font-semibold transition-all ${activeTab === 'tenders' ? 'bg-gold/10 text-gold border-r-2 border-gold font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <BarChart3 size={16} />
              Tenderlar
            </button>
            <button 
              onClick={() => { setActiveTab('audit'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded text-[11px] uppercase tracking-widest font-semibold transition-all ${activeTab === 'audit' ? 'bg-gold/10 text-gold border-r-2 border-gold font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <FileText size={16} />
              Audit jurnali
            </button>
          </nav>
        </div>

        <div className="p-6 mt-auto hidden md:block">
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="w-full p-4 border border-zinc-800 rounded bg-zinc-900/30 text-left hover:border-gold/40 transition-colors"
          >
            <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-2">Tizimda</p>
            <div className="flex items-center gap-3">
              <img
                src={
                  adminProfile?.photoUrl ||
                  createAvatarPlaceholder(adminProfile?.fullName ?? 'EthicFlow Admin')
                }
                alt={adminProfile?.fullName ?? 'EthicFlow Admin'}
                className="w-8 h-8 rounded object-cover border border-zinc-800"
              />
              <div className="overflow-hidden">
                <p className="text-[11px] font-bold text-zinc-200 truncate">
                  {adminProfile?.fullName ?? 'A. Mirzayev'}
                </p>
                <p className="text-[9px] text-zinc-500 uppercase">
                  {adminProfile?.department || 'Bosh monitor'}
                </p>
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col h-screen">
        {/* Header */}
        <header className="px-4 sm:px-6 md:px-10 py-4 sm:py-6 flex flex-col md:flex-row justify-between items-start md:items-end border-b gold-border sticky top-0 bg-dark-bg/80 backdrop-blur-xl z-30 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded md:hidden"
            >
              <Menu size={20} className="text-gold" />
            </button>
            <div className="overflow-hidden">
              <h2 className="text-xl sm:text-2xl md:text-3xl serif-title font-bold text-gold truncate">
                {activeTab === 'dashboard' ? 'Moliyaviy halollik monitori' : 
                 activeTab === 'recruitment' ? 'Kadrlar va nepotizm nazorati' :
                 activeTab === 'tenders' ? 'Vazirlik xaridlari tahlili' : 'Audit va nazorat'}
              </h2>
              <p className="text-[8px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-zinc-500 italic mt-0.5 sm:mt-1 truncate">Iqtisodiyot va moliya vazirligi ichki monitoring tizimi</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6 w-full md:w-auto justify-between md:justify-end">
            <div className="relative group flex items-center flex-1 md:flex-initial">
              <Search className="absolute left-3 text-zinc-500" size={12} />
              <input 
                type="text" 
                placeholder="Qidiruv..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-900/50 border border-zinc-800 rounded-full py-1.5 sm:py-2 pl-9 sm:pl-10 pr-4 text-[10px] sm:text-xs focus:outline-none focus:border-gold/50 transition-all w-full sm:w-48 md:focus:w-64"
              />
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 bg-zinc-900/50 border border-zinc-800 rounded-full hover:bg-zinc-800 transition-colors relative"
              >
                <Bell size={14} className="text-zinc-400 sm:w-4 sm:h-4" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-dark-bg" />
                )}
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-zinc-800 bg-zinc-900 p-4 shadow-2xl z-50"
                  >
                    <div className="mb-4 flex flex-col gap-3 border-b border-zinc-800 pb-2 sm:flex-row sm:items-center sm:justify-between">
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-gold">Bildirishnomalar</h4>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={markAllNotificationsAsRead}
                          disabled={unreadNotifications.length === 0}
                          className="text-[9px] text-zinc-500 hover:text-zinc-300 disabled:opacity-40 disabled:hover:text-zinc-500"
                        >
                          Hammasini o'qilgan deb belgilash
                        </button>
                        <button
                          onClick={clearNotifications}
                          disabled={notifications.length === 0}
                          className="text-[9px] text-zinc-500 hover:text-zinc-300 disabled:opacity-40 disabled:hover:text-zinc-500"
                        >
                          Hammasini o'chirish
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[min(24rem,calc(100vh-10rem))] space-y-3 overflow-y-auto">
                      {notifications.length > 0 ? notifications.map(n => {
                        const isRead = readNotificationIds.includes(n.id);

                        return (
                        <div
                          key={n.id}
                          className={`p-2 hover:bg-zinc-800/50 rounded transition-colors border-l-2 ${
                            n.type === 'error'
                              ? 'border-red-500/40'
                              : n.type === 'success'
                                ? 'border-emerald-500/40'
                                : 'border-gold/30'
                          } ${isRead ? 'opacity-60' : ''}`}
                        >
                          <p className={`text-[11px] ${isRead ? 'text-zinc-400' : 'text-zinc-100'}`}>{n.text}</p>
                          <p className="text-[9px] text-zinc-500 mt-1">{formatNotificationTime(n.createdAt)}</p>
                        </div>
                        );
                      }) : (
                        <div className="py-6 text-center text-[11px] text-zinc-500 italic">
                          Hozircha yangi bildirishnoma yo'q.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden lg:flex gap-8 text-right">
              <div className="border-r border-zinc-800 pr-8">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Tizim holati</p>
                <p className="text-emerald-500 text-sm font-semibold flex items-center justify-end gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Ishlamoqda
                </p>
              </div>
              <div className="">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Node Sync</p>
                <p className="text-zinc-100 text-sm font-mono">v2.4.0</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 md:p-10 flex-1">
          {loadError && (
            <div className="mb-6 rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
              Backenddan ma`lumot yuklashda xatolik: {loadError}
            </div>
          )}
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-10"
              >
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard 
                    title="Yuqori xavfli holatlar" 
                    value={stats.highRiskCases} 
                    icon={AlertTriangle} 
                    color="text-red-500"
                    trend="Shu haftada +4 ta"
                  />
                  <StatCard 
                    title="Aniqlangan anomaliyalar" 
                    value="142" 
                    icon={BarChart3} 
                    color="text-zinc-500"
                    trend="Umumiy jarayonlarning 3.1% ni tashkil etadi"
                  />
                  <StatCard 
                    title="Tejalgan mablag‘lar" 
                    value={stats.potentialSavings} 
                    icon={CheckCircle2} 
                    color="text-gold"
                    trend="Bloklashlar orqali qaytarildi"
                  />
                </div>

                {/* Table Section */}
                <div className="glass-panel rounded-lg p-6 flex flex-col border gold-border">
                  <div className="mb-6 flex flex-col gap-3 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-xl serif-title text-zinc-100">Shubhali harakatlar monitori</h3>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      <button 
                        onClick={handleExport}
                        className="text-[10px] text-gold border border-gold/30 px-3 py-1 rounded hover:bg-gold hover:text-black transition-all"
                      >
                        Export (.XLSX)
                      </button>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Jonli ma’lumotlar oqimi</span>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-[640px] w-full text-left text-sm">
                      <thead>
                        <tr className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] border-b border-zinc-800">
                          <th className="pb-4 font-normal">Holat identifikatori</th>
                          <th className="pb-4 font-normal">Tashkilot</th>
                          <th className="pb-4 font-normal">Anomaliya turi</th>
                          <th className="pb-4 font-normal text-center">Xavf indeksi</th>
                          <th className="pb-4 font-normal text-right">Halollik</th>
                        </tr>
                      </thead>
                      <tbody className="text-zinc-300">
                        <AnimatePresence initial={false}>
                          {filteredCases.map((item) => (
                            <motion.tr 
                              key={item.id} 
                              layout
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.3 }}
                              className="border-b border-zinc-800/30 hover:bg-gold/[0.02] group transition-colors"
                            >
                              <td className="py-4 font-mono text-xs text-zinc-400 group-hover:text-gold transition-colors">{item.id}</td>
                              <td className="py-4 text-xs font-semibold">{item.organization}</td>
                              <td className="py-4">
                                <span className="text-[11px] text-zinc-500">
                                  {item.riskScore > 75 ? 'Pora almashinuvi' : item.riskScore > 40 ? 'Bitta ishtirokchi' : 'Standart jarayon'}
                                </span>
                              </td>
                              <td className="py-4">
                                <div className="flex items-center justify-center">
                                  <motion.span 
                                    layout
                                    className={`px-2 py-0.5 rounded-[2px] text-[9px] uppercase font-bold border tracking-widest transition-colors duration-500 ${
                                      item.riskScore > 75 
                                        ? 'text-red-500 bg-red-500/10 border-red-500/30' 
                                        : item.riskScore > 40 
                                          ? 'text-amber-500 bg-amber-500/10 border-amber-500/30' 
                                          : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
                                    }`}
                                  >
                                    {item.riskScore > 75 ? 'Yuqori' : item.riskScore > 40 ? 'O‘rta' : 'Past'}
                                  </motion.span>
                                </div>
                              </td>
                              <td className="py-4 text-right">
                                <button 
                                  onClick={() => setSelectedCase(item)}
                                  className="text-[10px] font-mono text-zinc-500 hover:text-gold uppercase tracking-[0.1em] transition-colors"
                                >
                                  {100 - item.riskScore}/100
                                </button>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                        {filteredCases.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-zinc-500 italic text-sm">Natija topilmadi</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="glass-panel p-6 rounded-lg border border-zinc-800">
                    <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-bold">Xo'jalik yurituvchi subyektlar (Hududlar kesimida)</h4>
                    <p className="text-[10px] text-zinc-600 mb-6 uppercase tracking-widest">Manba: my.soliq.uz</p>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={soliqGraphData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', fontSize: '10px' }}
                            itemStyle={{ color: '#d4d4d8' }}
                          />
                          <Bar dataKey="entities" fill="#ca8a04" radius={[2, 2, 0, 0]} name="Yuridik shaxslar" />
                          <Bar dataKey="individuals" fill="#52525b" radius={[2, 2, 0, 0]} name="Jismoniy shaxslar" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="glass-panel p-6 rounded-lg border border-zinc-800">
                    <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-bold">Respublika bo'yicha dinamika</h4>
                    <p className="text-[10px] text-zinc-600 mb-6 uppercase tracking-widest">Soliq to'lovchilar soni (Manba: my.soliq.uz)</p>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timelineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', fontSize: '10px' }}
                            itemStyle={{ color: '#d4d4d8' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#ca8a04" 
                            strokeWidth={2} 
                            dot={{ r: 4, fill: '#09090b', stroke: '#ca8a04', strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                            name="Soliq to'lovchilar"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'recruitment' ? (
              <motion.div 
                key="recruitment"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-10"
              >
                <div className="glass-panel rounded-lg p-6 border gold-border flex-1 flex flex-col min-h-[500px]">
                  <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                    <h3 className="text-xl serif-title text-zinc-100">Halollik tekshiruvi navbati</h3>
                    <span className="text-[10px] px-2 py-0.5 bg-red-900/40 text-red-100 border border-red-900/60 uppercase tracking-widest font-bold">Nepotizm ogohlantirishi faol</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[
                      { title: "DXA Integratsiya", desc: "DXA va FXDYo bazasidan qarindoshlik zanjirlarini avtomatik yuklash", icon: Database },
                      { title: "mehnat.uz Tahlili", desc: "Nomzodning mehnat faoliyati va malaka darajasini tizimli solishtirish", icon: ShieldCheck },
                      { title: "AI Kompetensiya", desc: "Intervyu va proktoring natijalari asosida nomzodga ob'ektiv baho berish", icon: Cpu }
                    ].map((step, i) => (
                      <div key={i} className="glass-panel p-4 rounded-lg border border-zinc-800/50 bg-zinc-900/20 group hover:border-gold/20 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                          <step.icon size={16} className="text-gold" />
                          <h5 className="text-[10px] uppercase tracking-widest font-bold text-zinc-300">{step.title}</h5>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed font-light">{step.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Project Strategy Banner */}
                  <div className="mb-8 p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-lg flex items-center gap-4">
                    <div className="p-2 bg-emerald-500/20 rounded-full">
                       <Target size={20} className="text-emerald-500" />
                    </div>
                    <div>
                       <h4 className="text-xs font-bold text-emerald-100 uppercase tracking-widest">Strategik Maqsad: Kadrlarni shaffof tanlash</h4>
                       <p className="text-[10px] text-emerald-500/80">Inson omilini kamaytirish va ochiq ma'lumotlar (DXA, Mehnat.uz) asosida adolatli saralash.</p>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 mb-8 max-w-2xl leading-relaxed italic border-l-2 gold-border pl-4">
                    Vazirlik kadrlar tanlovining "Blind Assessment" jarayoni. AI tizimi rezyumelarni malaka talablariga solishtirib, 
                    moslik foizini chiqaradi va intervyu vaqtini avtomatik belgilaydi. 
                    Intervyu davomida kamera va ekran nazorati (AI Proctoring) orqali cheat-faktorlar nazorat qilinadi.
                  </p>

                  <div className="space-y-3">
                    <AnimatePresence>
                      {filteredCandidates.map((candidate) => (
                        <motion.div 
                          key={candidate.id} 
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className={`flex items-center justify-between p-4 rounded border transition-all ${
                            candidate.hiringAlert || candidate.conflictRisk === 'High' 
                              ? 'bg-red-900/10 border-red-900/30' 
                              : 'bg-zinc-800/20 border-zinc-800/50 hover:bg-gold/[0.03]'
                          }`}
                        >
                          <div>
                            <p className="text-[11px] font-mono text-zinc-100 tracking-wider">NOMZOD #{candidate.id.split('-')[1]}</p>
                            <p className="text-sm font-semibold text-zinc-100 mt-1">{candidate.candidateName}</p>
                            <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest font-bold">{candidate.department}</p>
                            <p className="text-[10px] text-zinc-500 mt-1">{candidate.position}</p>
                            <div className="flex gap-4 mt-1">
                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Rezyume mosligi: <span className={candidate.matchPercentage > 80 ? "text-green-500" : "text-yellow-500"}>{candidate.matchPercentage}%</span></p>
                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">ID: {candidate.id}</p>
                            </div>
                            {candidate.hiringAlert && (
                              <p className="text-[10px] text-red-400 mt-2">
                                HR: {candidate.hiringAlert.hr?.fullName ?? 'HR xodim'} | {formatOptionalValue(candidate.hiringAlert.hr?.phone)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="hidden lg:block text-right">
                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Intervyu vaqti</p>
                              <p className="text-[11px] text-zinc-300 font-mono italic">{candidate.interviewTime}</p>
                            </div>
                            {(candidate.proctoringRisk ?? 0) > 50 && (
                              <div className="bg-red-900/20 px-2 py-1 rounded border border-red-900/40 flex items-center gap-2">
                                <AlertCircle size={12} className="text-red-500 animate-pulse" />
                                <span className="text-[9px] text-red-500 font-bold uppercase tracking-widest">AI Proctoring: Cheat Detected</span>
                              </div>
                            )}
                            <div className="text-right">
                              <span className={`text-[9px] uppercase tracking-[0.2em] font-bold ${
                                candidate.hiringAlert || candidate.conflictRisk === 'High' ? 'text-red-500' : 'text-emerald-500'
                              }`}>
                                {candidate.hiringAlert ? 'Riskli qabul' : candidate.conflictRisk === 'High' ? 'Yuqori xavf' : 'Tekshiruv darajasi L1'}
                              </span>
                              <p className="text-[9px] text-zinc-600 italic block mt-0.5">
                                {candidate.hiringAlert
                                  ? formatHiringAlertReason(candidate)
                                  : candidate.conflictRisk === 'High'
                                    ? 'Nepotizm aloqasi (Oila)'
                                    : 'Halollik tasdiqlangan'}
                              </p>
                            </div>
                            <button 
                              onClick={() => handleSelectCandidate(candidate)}
                              className={`px-6 py-2 rounded text-[9px] font-bold uppercase tracking-widest transition-all ${
                                candidate.hiringAlert || candidate.conflictRisk === 'High'
                                  ? 'border border-red-900/50 text-red-500 hover:bg-red-500 hover:text-white'
                                  : 'border border-gold text-gold hover:bg-gold hover:text-black'
                              }`}
                            >
                              Tekshirish
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {filteredCandidates.length === 0 && (
                      <div className="py-20 text-center text-zinc-500 italic text-sm">Nomzod topilmadi</div>
                    )}
                  </div>

                  {selectionStatus && (
                    <div className="mt-8 p-4 glass-panel border border-gold/30 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${selectionStatus.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          <Flag size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-200">Tekshiruv hisoboti tayyor</p>
                          <p className="text-[10px] text-zinc-500">Nomzod #{selectionStatus.candidate.id.split('-')[1]} bo'yicha tahlil yakunlandi</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setSelectionStatus(null)}
                          className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-zinc-300 whitespace-nowrap"
                        >
                          Yashirish
                        </button>
                        <button 
                          onClick={() => setIsSelectionReportOpen(true)}
                          className="text-[10px] uppercase tracking-widest font-bold text-gold hover:underline whitespace-nowrap"
                        >
                          Hisobotni ochish
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'tenders' ? (
              <motion.div 
                key="tenders"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* AI Methodology Info - 4 Principles */}
                <div className="glass-panel p-6 rounded-lg border border-zinc-800 bg-zinc-900/60 shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        <CheckCircle size={20} className="text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="text-sm uppercase tracking-[0.2em] font-bold text-zinc-100 italic">4 Tamoyil asosida AI Analizi</h3>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Tender monitoringi qaysi mezonlar asosida amalga oshiriladi?</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { 
                        title: "1. 👥 Raqobat", 
                        desc: "Ishtirokchilar soni 1 ta bo'lsa → 🔴. Raqobat yo'qligi = Risk.", 
                        icon: Users,
                        status: "Competition"
                      },
                      { 
                        title: "2. 💰 Narx", 
                        desc: "O'rtacha narxdan 30% dan ortiq farq (🔴) pul manipulyatsiyasini bildiradi.", 
                        icon: PieChart,
                        status: "Price Anomaly"
                      },
                      { 
                        title: "3. 🏢 Takroriy g'olib", 
                        desc: "Bir kompaniya ko'p yutgan bo'lsa → 🔴. Kelishilgan o'yinlar ehtimoli.", 
                        icon: Target,
                        status: "Pattern"
                      },
                      { 
                        title: "4. ⏱️ Vaqt", 
                        desc: "Sun'iy vaqt qisqartirilishi yoki anomaliyalar nazorati.", 
                        icon: Clock,
                        status: "Time Principle"
                      }
                    ].map((item, idx) => (
                      <div key={idx} className="relative p-4 border border-zinc-800/80 rounded bg-zinc-950/40 group hover:border-gold/30 transition-all">
                        <div className="flex items-center justify-between mb-3">
                           <div className="flex items-center gap-2">
                             <item.icon size={14} className="text-gold" />
                             <h4 className="text-[10px] font-bold text-zinc-100 uppercase tracking-widest">{item.title}</h4>
                           </div>
                           <span className="text-[8px] px-1.5 py-0.5 bg-emerald-900/30 text-emerald-500 border border-emerald-900/50 rounded uppercase font-bold">{item.status}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-relaxed font-light">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-8 border-t border-zinc-800/50">
                    <PriceComparison data={[
                       { name: 'Kompaniya A', price: 85 },
                       { name: 'Kompaniya B', price: 92 },
                       { name: 'Kompaniya C', price: 135 },
                       { name: 'O\'rtacha', price: 100 },
                       { name: 'Kompaniya D', price: 145 }
                    ]} />
                    
                    <div className="space-y-6 flex flex-col justify-center">
                       <div className="flex items-start gap-4">
                          <Target size={18} className="text-gold shrink-0 mt-1" />
                          <div>
                            <p className="text-[11px] text-gold/90 font-medium leading-relaxed">
                              <span className="font-bold underline uppercase">Strategik Maslahat:</span> 🔴 nuqtalar aniqlangan tenderlar uchun avtomatik auditorlik tekshiruvi tayinlashni tavsiya etamiz.
                            </p>
                          </div>
                       </div>
                       <div className="p-4 bg-zinc-950/50 rounded border border-zinc-800 border-l-4 border-l-gold">
                          <h5 className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest mb-2">Tizim Logikasi</h5>
                          <ul className="space-y-2">
                             <li className="text-[10px] text-zinc-500 flex items-center gap-2">
                                <div className="w-1 h-1 bg-gold rounded-full" />
                                1 ishtirokchi = Raqobat yo'q
                             </li>
                             <li className="text-[10px] text-zinc-500 flex items-center gap-2">
                                <div className="w-1 h-1 bg-gold rounded-full" />
                                30% farq = Byudjet riski
                             </li>
                             <li className="text-[10px] text-zinc-500 flex items-center gap-2">
                                <div className="w-1 h-1 bg-gold rounded-full" />
                                3+ g'alaba = Kelishuv gumoni
                             </li>
                          </ul>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3 space-y-6">
                    {/* Tender Content Grid starts here */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredCases.filter(c => c.type === 'Tender').map(tender => (
                        <motion.div 
                          key={tender.id}
                          layout
                          whileHover={{ y: -4 }}
                          className="glass-panel p-6 rounded-lg border border-zinc-800 flex flex-col group relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-20 transition-opacity">
                             <Building size={48} className="text-zinc-500" />
                          </div>

                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[9px] font-mono text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded">ID: {tender.id}</span>
                            <div className="flex items-center gap-2">
                               <span className="text-[8px] text-zinc-500 font-mono italic">Source: Uzex.uz</span>
                               <Flag size={14} className={tender.riskScore > 70 ? 'text-red-500 animate-pulse' : 'text-zinc-700'} />
                            </div>
                          </div>

                          <h4 className="text-sm font-bold text-zinc-100 mb-1 leading-snug">{tender.name}</h4>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Building size={10} />
                            {tender.organization}
                          </p>
                          
                          <div className="bg-zinc-950/40 p-3 rounded border border-zinc-800/50 mb-4 flex-grow">
                            <p className="text-[10px] text-zinc-400 italic leading-relaxed">
                              <span className="text-gold font-bold uppercase mr-1">AI Audit:</span> 
                              {tender.riskScore > 70 
                                ? "Benefitsiar zanjiri bo'yicha affillanganlik aniqlandi. Korxona Stat.uz bazasida 'active' emas." 
                                : "Ochiq ma'lumotlar bilan nomuvofiqlik aniqlanmadi. Normativ talablarga javob beradi."}
                            </p>
                          </div>

                          <div className="mt-auto pt-4 border-t border-zinc-800 flex justify-between items-center">
                            <div>
                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                <Target size={10} />
                                Xavf Analizi
                              </p>
                              <p className={`text-xs font-bold ${tender.riskScore > 70 ? 'text-red-500' : 'text-emerald-500'}`}>{tender.riskScore}%</p>
                            </div>
                            <button 
                              onClick={() => setSelectedCase(tender)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-800 hover:bg-gold hover:text-black transition-all text-[10px] font-bold uppercase tracking-widest border border-zinc-700 hover:border-gold"
                            >
                              Batafsil
                              <ArrowRight size={12} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="glass-panel p-5 rounded-lg border border-gold/20 bg-gold/5 sticky top-24 shadow-[0_0_50px_-12px_rgba(212,175,55,0.15)]">
                      <div className="flex items-center gap-2 mb-4">
                        <Cpu size={18} className="text-gold" />
                        <h3 className="text-xs font-bold text-gold uppercase tracking-widest">AI Strategik Maslahatchi</h3>
                      </div>
                      
                      <div className="space-y-5">
                        {[
                          { title: "Audit Direktiva", text: "Kritik xavf (70%+) aniqlangan tenderlar uchun mustaqil auditorlik tekshiruvini tayinlang. Jismoniy borib tekshirish shart.", icon: ShieldCheck },
                          { title: "Soliq Monitoring", text: "Tizim aniqlagan benefitsiar zanjirlarini Soliq.uz 'Xavf tahlili' tizimi bilan integratsiya qiling.", icon: PieChart },
                          { title: "Ma'lumotlar Sifat", text: "Stat.uz ma'lumotlari eskirgan bo'lishi mumkin. AI flag qo'ygan holatlarda Ustav nusxasini so'rang.", icon: Database }
                        ].map((advice, i) => (
                          <div key={i} className="space-y-2 group">
                            <div className="flex items-center gap-2">
                               <advice.icon size={12} className="text-gold/60" />
                               <h5 className="text-[10px] font-bold text-zinc-200 uppercase tracking-wider">{advice.title}</h5>
                            </div>
                            <p className="text-[10px] text-zinc-400 leading-relaxed font-light italic group-hover:text-zinc-300 transition-colors">
                              "{advice.text}"
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 pt-6 border-t border-gold/10">
                         <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                           <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-2 font-bold text-center">Inson + AI hamkorligi</p>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'audit' ? (
              <motion.div 
                key="audit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">Qonunchilik loyihalari (Regulation.gov.uz)</h4>
                       <Database size={14} className="text-zinc-700" />
                    </div>
                    <div className="space-y-3">
                      {externalProjects.map((p, i) => (
                        <div key={i} className="glass-panel p-4 rounded border border-zinc-800 hover:border-gold/30 transition-all cursor-pointer">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[9px] uppercase tracking-widest text-gold bg-gold/10 px-2 py-0.5 rounded">{p.document_type}</span>
                            <span className="text-[9px] text-zinc-600 font-mono">{p.published_date}</span>
                          </div>
                          <h5 className="text-xs font-bold text-zinc-200 mb-2 leading-relaxed">{p.title}</h5>
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-zinc-500 hover:text-gold flex items-center gap-1 transition-colors">
                            Batafsil ko'rish <ArrowRight size={10} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">Xalq Qabulxonasi Yangiliklari (pm.gov.uz)</h4>
                       <Bell size={14} className="text-zinc-700" />
                    </div>
                    <div className="space-y-3">
                      {newsItems.map((n, i) => (
                        <div key={i} className="glass-panel p-4 rounded border border-zinc-800 flex gap-4">
                          <img src={n.image_url} alt="news" className="w-16 h-16 object-cover rounded bg-zinc-800 flex-shrink-0" referrerPolicy="no-referrer" />
                          <div>
                            <p className="text-[9px] text-zinc-600 font-mono mb-1">{n.published_date}</p>
                            <h5 className="text-xs font-bold text-zinc-200 mb-1 leading-snug line-clamp-2">{n.title}</h5>
                            <p className="text-[10px] text-zinc-500 line-clamp-2">{n.summary}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="glass-panel rounded-lg border border-zinc-800 overflow-hidden">
                  <div className="flex flex-col gap-3 border-b border-zinc-800 bg-zinc-900/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Backend reportlar</h4>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[9px] text-zinc-600 font-mono">{reports.length} ta yozuv</span>
                      <button
                        onClick={() => void handleExportReports()}
                        disabled={exportingReports}
                        className="text-[9px] uppercase tracking-widest font-bold text-gold hover:underline disabled:opacity-50 disabled:hover:no-underline"
                      >
                        {exportingReports ? 'Eksport...' : 'CSV eksport'}
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-zinc-800/50">
                    {reports.length > 0 ? reports.map((report) => (
                      <div key={report.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                        <div>
                          <p className="text-xs text-zinc-200">{report.title}</p>
                          <p className="text-[10px] text-zinc-500 mt-1">{report.createdBy ?? 'System'} • {formatReportTime(report.createdAt)}</p>
                          <p className="text-[10px] text-zinc-600 mt-2 whitespace-pre-line">{report.message}</p>
                          {isConflictHireReport(report) && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                              <PersonDetail label="HR ma'lumotlari" person={report.details?.hr} />
                              <PersonDetail label="Qabul qilingan nomzod" person={report.details?.candidate} />
                            </div>
                          )}
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded border self-start sm:self-center ${
                          report.severity === 'high'
                            ? 'border-red-900/50 text-red-500 bg-red-950/20'
                            : report.severity === 'medium'
                              ? 'border-amber-900/50 text-amber-500 bg-amber-950/20'
                              : 'border-emerald-900/50 text-emerald-500 bg-emerald-950/20'
                        }`}>
                          {report.status.toUpperCase()}
                        </span>
                      </div>
                    )) : (
                      <div className="px-6 py-10 text-center text-zinc-500 text-sm italic">
                        Backend reportlar hali mavjud emas.
                      </div>
                    )}
                  </div>
                </div>

                <div className="glass-panel rounded-lg border border-zinc-800 overflow-hidden">
                  <div className="flex flex-col gap-3 border-b border-zinc-800 bg-zinc-900/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Tizim harakatlari jurnali</h4>
                    <span className="text-[9px] text-zinc-600 font-mono">Live Logs</span>
                  </div>
                  <div className="divide-y divide-zinc-800/50">
                    {[
                      { user: "Sistema AI", action: "Stat.uz benefitsiar zanjiri yangilandi (Batch-209)", time: "12:45", status: "Success" },
                      { user: "A. Mirzayev", action: "Tender #7717 bo'yicha Uzex narx tahlilini so'radi", time: "12:10", status: "Info" },
                      { user: "Audit Bot", action: "NOM-103: DXA ma'lumotlariga ko'ra nepotizm aniqlandi", time: "11:20", status: "Alert" },
                      { user: "Soliq API", action: "Yuridik shaxslar qarzdorlik bazasi sinxronizatsiya qilindi", time: "09:00", status: "Success" }
                    ].map((log, i) => (
                      <div key={i} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-zinc-800/20 transition-colors gap-3 sm:gap-0">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">
                            {log.user.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs text-zinc-200 leading-tight">{log.action}</p>
                            <p className="text-[10px] text-zinc-500 mt-1">{log.user} • {log.time}</p>
                          </div>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded border self-start sm:self-center ${
                          log.status === 'Alert' ? 'border-red-900/50 text-red-500 bg-red-950/20' :
                          log.status === 'Info' ? 'border-zinc-700 text-zinc-400' : 'border-emerald-900/50 text-emerald-500 bg-emerald-950/20'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="h-auto py-4 sm:h-12 flex flex-col sm:flex-row items-center justify-between px-4 sm:px-10 glass-panel border-t gold-border text-[8px] sm:text-[9px] text-zinc-600 uppercase tracking-[0.1em] sm:tracking-[0.2em] font-medium gap-3 sm:gap-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-10 items-center sm:items-start text-center sm:text-left">
            <span className="flex items-center gap-2">Monitor: <span className="text-zinc-400">A. Mirzayev</span></span>
            <span className="flex items-center gap-2">Yurisdiksiya: <span className="text-zinc-400">O‘zbekiston Respublikasi</span></span>
          </div>
          <div className="flex gap-6 items-center">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Jonli ma’lumotlar faol
            </span>
          </div>
        </footer>
      </main>

      {/* Overlays */}
      <AnimatePresence>
        {isProfileModalOpen && adminProfile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-40"
            />
            <AdminProfileModal
              profile={adminProfile}
              saving={savingProfile}
              hasPendingFile={Boolean(pendingProfilePhoto)}
              onClose={() => setIsProfileModalOpen(false)}
              onSave={() => void handleSaveProfile()}
              onProfileChange={(patch) =>
                setAdminProfile((prev) => (prev ? { ...prev, ...patch } : prev))
              }
              onFileSelect={handleProfilePhotoChange}
              onResetPhoto={handleProfilePhotoReset}
            />
          </>
        )}

        {selectedCase && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCase(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-40"
            />
            <CaseDetail caseItem={selectedCase} onClose={() => setSelectedCase(null)} onReport={handleCaseReport} />
          </>
        )}
        
        {selectionStatus && isSelectionReportOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSelectionReportOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-40"
            />
            <SelectionReport 
              result={selectionStatus} 
              onClose={() => setIsSelectionReportOpen(false)} 
              onExport={handleExport}
              onReport={handleSelectionReport}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
