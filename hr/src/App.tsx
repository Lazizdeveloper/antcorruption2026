import { useEffect, useState } from 'react';
import { Application, DashboardSummary, HrProfile } from './types';
import { 
  LayoutDashboard, 
  Users, 
  CheckCircle2,
  TrendingUp,
  UserCircle,
  Menu,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import {
  downloadApplicationsExport,
  downloadBlob,
  fetchDashboard,
  uploadProfileImage,
  updateApplicationStatus,
  updateProfile,
} from './lib/api';
import { SidebarItem } from './components/SidebarItem';
import {
  ApplicationsScene,
  DashboardScene,
  HiredStaffScene,
  ProfileScene,
  ShortlistedScene,
} from './components/HrScenes';
import { ApplicationDetailPanel } from './components/ApplicationDetailPanel';

type ApplicationFilter = 'all' | 'new_resumes' | 'pending' | 'hired';

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
    .join('') || 'HR';

  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="48" fill="#0f172a" />
      <text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" fill="#10b981" font-family="Arial, sans-serif" font-size="28" font-weight="700">${initials}</text>
    </svg>`,
  )}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'applications' | 'shortlisted' | 'hired_staff' | 'profile'>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalApplications: 0,
    pendingCount: 0,
    shortlistedCount: 0,
    hiredCount: 0,
    averageScore: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [applicationFilter, setApplicationFilter] = useState<ApplicationFilter>('all');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [profileDraft, setProfileDraft] = useState<HrProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportingReport, setExportingReport] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [pendingProfilePhoto, setPendingProfilePhoto] = useState<File | null>(null);
  const [savedProfilePhotoUrl, setSavedProfilePhotoUrl] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadData = async (withLoader = true) => {
      if (withLoader) {
        setLoading(true);
      }

      try {
        const dashboard = await fetchDashboard();

        if (!isMounted) {
          return;
        }

        setApplications(dashboard.applications);
        setProfileDraft(dashboard.profile ? { ...dashboard.profile, photoUrl: dashboard.profile.photoUrl ?? '' } : null);
        setSavedProfilePhotoUrl(dashboard.profile?.photoUrl ?? '');
        setSummary(dashboard.summary);
        setPendingProfilePhoto(null);
        setIsOffline(false);
        setErrorMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setIsOffline(true);
        setErrorMessage(error instanceof Error ? error.message : 'Backend bilan aloqa uzildi');
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

  const handleUpdateStatus = async (appId: string, newStatus: Application['status']) => {
    const app = applications.find(a => a.id === appId);
    if (!app) {
      console.error("App not found for update:", appId);
      return;
    }

    if (newStatus === 'hired' && app.conflictDetected) {
      console.log("Nomzod conflict bo'lishiga qaramay ishga qabul qilinmoqda.");
    }

    try {
      const updatedApplication = await updateApplicationStatus(appId, newStatus);

      setApplications(prev => prev.map(item => item.id === appId ? updatedApplication : item));
      setSelectedApplication(updatedApplication);
      setSummary(prev => ({
        ...prev,
        pendingCount: applications.filter(item => (item.id === appId ? updatedApplication : item).status === 'pending').length,
        shortlistedCount: applications.filter(item => (item.id === appId ? updatedApplication : item).status === 'shortlisted').length,
        hiredCount: applications.filter(item => (item.id === appId ? updatedApplication : item).status === 'hired').length,
      }));
      setIsOffline(false);
      setErrorMessage(null);

      const refreshedDashboard = await fetchDashboard();
      setApplications(refreshedDashboard.applications);
      setProfileDraft(refreshedDashboard.profile);
      setSummary(refreshedDashboard.summary);

      window.setTimeout(() => setSelectedApplication(null), newStatus === 'hired' || newStatus === 'shortlisted' ? 3000 : 1000);
    } catch (error) { 
      console.warn("Update failed", error);
      setIsOffline(true);
      setErrorMessage(error instanceof Error ? error.message : 'Status yangilanmadi');
    }
  };

  const exportReport = async () => {
    setExportingReport(true);

    try {
      const blob = await downloadApplicationsExport();
      downloadBlob(blob, `shaffof_audit_report_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      setIsOffline(false);
    } catch (error) {
      setIsOffline(true);
      setErrorMessage(error instanceof Error ? error.message : 'Eksport amalga oshmadi');
    } finally {
      setExportingReport(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileDraft) {
      return;
    }

    setSavingProfile(true);

    try {
      const nextPhotoUrl = pendingProfilePhoto
        ? await uploadProfileImage(pendingProfilePhoto)
        : profileDraft.photoUrl;
      const updatedProfile = await updateProfile({
        ...profileDraft,
        photoUrl: nextPhotoUrl,
      });
      setProfileDraft(updatedProfile);
      setPendingProfilePhoto(null);
      setSavedProfilePhotoUrl(updatedProfile.photoUrl ?? '');
      setIsOffline(false);
      setErrorMessage(null);
    } catch (error) {
      setIsOffline(true);
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
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
      setErrorMessage('Profil rasmi 3 MB dan oshmasligi kerak.');
      return;
    }

    try {
      const previewUrl = await readFileAsDataUrl(file);
      setPendingProfilePhoto(file);
      setProfileDraft((prev) => (prev ? { ...prev, photoUrl: previewUrl } : prev));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Rasm faylini o'qib bo'lmadi");
    }
  };

  const handleProfilePhotoReset = () => {
    setPendingProfilePhoto(null);
    setProfileDraft((prev) => (prev ? { ...prev, photoUrl: savedProfilePhotoUrl } : prev));
  };

  const deptData = Array.from(
    applications.reduce((acc, application) => {
      const bucket = acc.get(application.department) ?? { name: application.department, apps: 0, risk: 0 };
      bucket.apps += 1;
      if (application.conflictDetected || application.proctoringRisk > 70) {
        bucket.risk += 1;
      }
      acc.set(application.department, bucket);
      return acc;
    }, new Map<string, { name: string; apps: number; risk: number }>()),
  ).map(([, value]) => ({
    ...value,
    risk: value.apps === 0 ? 0 : Math.round((value.risk / value.apps) * 100),
  }));

  const filteredApplications = applications.filter((app) => {
    const matchSearch =
      app.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.position.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) {
      return false;
    }

    if (applicationFilter === 'pending') {
      return app.status === 'pending';
    }

    if (applicationFilter === 'hired') {
      return app.status === 'hired';
    }

    if (applicationFilter === 'new_resumes') {
      const submittedAt = new Date(app.submittedAt).getTime();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return submittedAt >= sevenDaysAgo;
    }

    return true;
  });

  if (loading) return (
    <div className="h-screen bg-slate-950 flex items-center justify-center font-mono">
      <div className="text-emerald-400 font-black animate-pulse tracking-widest uppercase text-xs">LOG: [SYSTEM_BOOT] SHAFFOF-ISH v2.1 LOADING...</div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-slate-950 font-sans text-slate-200 overflow-x-hidden md:h-screen">
      <div className="fixed inset-x-0 top-0 z-[60] flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 md:hidden">
        <div>
          <div className="text-lg font-bold tracking-tight text-emerald-400">SHAFFOF-ISH</div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Nazorat Markazi</div>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="rounded border border-slate-800 p-2 text-slate-300 hover:bg-slate-900"
        >
          <Menu size={18} />
        </button>
      </div>

      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[70] flex w-[85vw] max-w-60 shrink-0 -translate-x-full flex-col border-r border-slate-800 bg-slate-950 transition-transform duration-300 md:static md:z-auto md:w-60 md:translate-x-0',
          isMobileSidebarOpen && 'translate-x-0',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 p-4 md:p-6">
          <div>
            <div className="text-xl font-bold tracking-tight text-emerald-400">SHAFFOF-ISH</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">Nazorat Markazi v2.1</div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="rounded border border-slate-800 p-2 text-slate-400 hover:bg-slate-900 md:hidden"
          >
            <X size={16} />
          </button>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col">
          <SidebarItem icon={LayoutDashboard} label="Boshqaruv Paneli" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsMobileSidebarOpen(false); }} />
          <SidebarItem icon={Users} label="Arizalar Monitoringi" active={activeTab === 'applications'} onClick={() => { setActiveTab('applications'); setIsMobileSidebarOpen(false); }} />
          <SidebarItem icon={TrendingUp} label="Suhbat Bosqichi" active={activeTab === 'shortlisted'} onClick={() => { setActiveTab('shortlisted'); setIsMobileSidebarOpen(false); }} />
          <SidebarItem icon={CheckCircle2} label="Ishga qabul qilinganlar" active={activeTab === 'hired_staff'} onClick={() => { setActiveTab('hired_staff'); setIsMobileSidebarOpen(false); }} />
          <SidebarItem icon={UserCircle} label="Profil" active={activeTab === 'profile'} onClick={() => { setActiveTab('profile'); setIsMobileSidebarOpen(false); }} />
        </nav>

        <div className="border-t border-slate-800 p-4 md:p-6">
          <div className="flex items-center gap-3">
            <img
              src={
                profileDraft?.photoUrl ||
                createAvatarPlaceholder(
                  profileDraft ? `${profileDraft.firstName} ${profileDraft.lastName}` : 'HR Profil',
                )
              }
              alt={profileDraft ? `${profileDraft.firstName} ${profileDraft.lastName}` : 'HR Profil'}
              className="w-8 h-8 rounded-full border border-slate-800 object-cover"
            />
            <div className="text-[10px]">
              <div className="font-semibold text-slate-100">
                {profileDraft ? `${profileDraft.firstName} ${profileDraft.lastName}` : 'HR Profil'}
              </div>
              <div className="text-slate-500">Bosh Inspektor (Kadrlar)</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex min-w-0 flex-col pt-16 md:pt-0">
        {/* Top Header */}
        <header className="flex min-h-14 shrink-0 flex-col gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
          <h1 className="text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-xs">Tizimdagi arizalar tahlili va korrupsiya monitoringi</h1>
          <div className="flex w-full items-center justify-between gap-4 md:w-auto md:justify-end">
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-blue-950/30 text-blue-500 text-[10px] font-bold rounded border border-blue-900/50">{applications.filter(a => a.status === 'pending').length} YANGI ARIZA</span>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {errorMessage && (
            <div className="mx-4 mt-4 rounded border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
              Backend xabari: {errorMessage}
            </div>
          )}
          {activeTab === 'dashboard' && (
            <DashboardScene deptData={deptData} isOffline={isOffline} summary={summary} />
          )}

          {activeTab === 'applications' && (
            <ApplicationsScene
              applicationFilter={applicationFilter}
              exportingReport={exportingReport}
              filteredApplications={filteredApplications}
              onExport={() => void exportReport()}
              onFilterChange={setApplicationFilter}
              onSearchChange={setSearchTerm}
              onSelectApplication={setSelectedApplication}
              searchTerm={searchTerm}
            />
          )}

          {activeTab === 'shortlisted' && (
            <ShortlistedScene
              applications={applications}
              onSelectApplication={setSelectedApplication}
            />
          )}

          {activeTab === 'hired_staff' && (
            <HiredStaffScene
              applications={applications}
              onSelectApplication={setSelectedApplication}
            />
          )}

          {activeTab === 'profile' && profileDraft && (
            <ProfileScene
              hasPendingProfilePhoto={Boolean(pendingProfilePhoto)}
              onFieldChange={(field, value) =>
                setProfileDraft((prev) => (prev ? { ...prev, [field]: value } : prev))
              }
              onFileSelect={handleProfilePhotoChange}
              onResetPhoto={handleProfilePhotoReset}
              onSave={() => void handleSaveProfile()}
              profileDraft={profileDraft}
              profileImageUrl={
                profileDraft.photoUrl ||
                createAvatarPlaceholder(`${profileDraft.firstName} ${profileDraft.lastName}`)
              }
              savingProfile={savingProfile}
            />
          )}

        </div>

        {/* System Footer Bar */}
        <footer className="shrink-0 border-t border-slate-900 bg-slate-950 px-4 py-3 font-mono text-[10px] text-slate-500">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center gap-2">
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isOffline ? "bg-red-500" : "bg-emerald-500")}></span> 
            {isOffline ? "TIZIM OFLAYN (ALOQA YO'Q)" : "TIZIM ONLAYN"}
          </div>
          <div className="truncate hidden sm:block">LOG: [{new Date().toLocaleTimeString()}] Tizim tahlillari real-vaqtda yangilanmoqda...</div>
          <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> BLOKCHEYN SINXRON</div>
            <div className="text-slate-400">SHAFFOFLIK DARAJASI: <span className="text-emerald-400 font-bold">99.8%</span></div>
          </div>
          </div>
        </footer>
      </main>

      <AnimatePresence>
        {selectedApplication && (
          <ApplicationDetailPanel
            application={selectedApplication}
            onClose={() => setSelectedApplication(null)}
            onUpdateStatus={handleUpdateStatus}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


