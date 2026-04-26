/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Search, 
  Bell, 
  User, 
  BarChart3, 
  FileText,
  ShieldAlert,
  Menu,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  formatNotificationTime,
  mergeNotifications,
  type SelectionStatus,
} from './lib/integrity';
import { CaseDetail } from './components/CaseDetail';
import { SelectionReport } from './components/SelectionReport';
import { AdminProfileModal } from './components/AdminProfileModal';
import { AuditScene, DashboardScene, RecruitmentScene, TendersScene } from './components/AdminScenes';

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
              <DashboardScene
                filteredCases={filteredCases}
                onExport={handleExport}
                onSelectCase={(caseItem) => setSelectedCase(caseItem)}
                soliqGraphData={soliqGraphData}
                stats={stats}
                timelineData={timelineData}
              />
            ) : activeTab === 'recruitment' ? (
              <RecruitmentScene
                filteredCandidates={filteredCandidates}
                onClearSelectionStatus={() => setSelectionStatus(null)}
                onOpenSelectionReport={() => setIsSelectionReportOpen(true)}
                onSelectCandidate={handleSelectCandidate}
                selectionStatus={selectionStatus}
              />
            ) : activeTab === 'tenders' ? (
              <TendersScene
                onSelectCase={(caseItem) => setSelectedCase(caseItem)}
                tenders={filteredCases.filter((caseItem) => caseItem.type === 'Tender')}
              />
            ) : activeTab === 'audit' ? (
              <AuditScene
                exportingReports={exportingReports}
                externalProjects={externalProjects}
                formatReportTime={formatReportTime}
                newsItems={newsItems}
                onExportReports={() => void handleExportReports()}
                reports={reports}
              />
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
              avatarPreview={
                adminProfile.photoUrl || createAvatarPlaceholder(adminProfile.fullName)
              }
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

