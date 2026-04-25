import React, { useEffect, useRef, useState } from 'react';
import { Application, DashboardSummary, HrProfile } from './types';
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  EyeOff, 
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  Zap,
  LogOut,
  ShieldAlert,
  Fingerprint,
  UserCircle,
  Save,
  Loader2,
  Upload,
  Trash2,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import {
  downloadApplicationsExport,
  downloadBlob,
  fetchDashboard,
  uploadProfileImage,
  updateApplicationStatus,
  updateProfile,
} from './lib/api';

// --- Components ---

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
} from 'recharts';
import { 
  Phone, 
  Send,
  UserCheck
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-6 py-2 transition-all text-sm font-medium",
      active 
        ? "bg-emerald-600/10 border-l-4 border-emerald-500 text-emerald-400" 
        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
    )}
  >
    <Icon size={14} />
    <span>{label}</span>
  </button>
);

const StatCard = ({ label, value, trend, subLabel, color = "text-slate-100" }: { label: string, value: string | number, trend?: string, subLabel?: string, color?: string }) => (
  <div className="bg-slate-900 border border-slate-800 p-4 rounded shadow-sm">
    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
    <div className={cn("text-2xl font-black mt-1 tracking-tighter", color)}>{value}</div>
    {trend && <div className="text-[10px] text-emerald-500 mt-1 font-bold">{trend}</div>}
    {subLabel && <div className="text-[10px] text-slate-500 mt-1">{subLabel}</div>}
  </div>
);

type ApplicationFilter = 'all' | 'new_resumes' | 'pending' | 'hired';

const MAX_PROFILE_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  diploma: "Oliy ma'lumot diplomi",
  certificate: 'Ilmiy unvon / Sertifikat',
  employment: 'Ish staji (E-Mehnat)',
  resume: 'Rezyume / CV',
};

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

const ProfileInput = ({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) => (
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

const ProfileImageField = ({
  fullName,
  imageUrl,
  hasPendingFile,
  onFileSelect,
  onReset,
}: {
  fullName: string;
  imageUrl: string;
  hasPendingFile: boolean;
  onFileSelect: (file: File | null) => void;
  onReset: () => void;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="md:col-span-2 rounded border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <img
            src={imageUrl || createAvatarPlaceholder(fullName)}
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
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'applications' | 'shortlisted' | 'hired_staff' | 'profile'>('dashboard');
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
    <div className="flex h-screen w-full bg-slate-950 font-sans text-slate-200 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-60 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="text-xl font-bold tracking-tight text-emerald-400">SHAFFOF-ISH</div>
          <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Nazorat Markazi v2.1</div>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col">
          <SidebarItem icon={LayoutDashboard} label="Boshqaruv Paneli" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={Users} label="Arizalar Monitoringi" active={activeTab === 'applications'} onClick={() => setActiveTab('applications')} />
          <SidebarItem icon={TrendingUp} label="Suhbat Bosqichi" active={activeTab === 'shortlisted'} onClick={() => setActiveTab('shortlisted')} />
          <SidebarItem icon={CheckCircle2} label="Ishga qabul qilinganlar" active={activeTab === 'hired_staff'} onClick={() => setActiveTab('hired_staff')} />
          <SidebarItem icon={UserCircle} label="Profil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </nav>

        <div className="p-6 border-t border-slate-800">
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
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
          <h1 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Tizimdagi arizalar tahlili va korrupsiya monitoringi</h1>
          <div className="flex items-center gap-4">
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
            <div className="flex-1 overflow-y-auto min-h-0 bg-slate-950 p-4 space-y-4">
              {/* Stats Row */}
              <section className="grid grid-cols-4 gap-4">
                <StatCard label="Umumiy Arizalar" value={summary.totalApplications} trend={`${summary.pendingCount} ta navbatda`} />
                <StatCard label="O'rtacha Ball (AI)" value={summary.averageScore.toFixed(1)} subLabel="Max: 100 / Min: 0" />
                <StatCard label="Ishga Qabul Samaradorligi" value={`${summary.hiredCount}`} color="text-emerald-500" subLabel="Hired nomzodlar" />
                <StatCard label="Tizim Holati" value={isOffline ? "OFFLINE" : "ONLINE"} color={isOffline ? "text-red-500" : "text-emerald-500"} trend={isOffline ? "Aloqa tiklanmoqda" : "Barqaror"} />
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 <div className="bg-slate-900 border border-slate-800 p-6 rounded shadow-sm">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Arizalar taqsimoti (Vazirliklar kesimida)</h3>
                    <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={deptData}>
                             <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                             <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                             <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                             <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', fontSize: '10px' }}
                                itemStyle={{ color: '#10b981' }}
                             />
                             <Bar dataKey="apps" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
                 <div className="bg-slate-900 border border-slate-800 p-6 rounded shadow-sm">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Korrupsiya xavfi darajasi (%)</h3>
                    <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={deptData} layout="vertical">
                             <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                             <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                             <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                             <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', fontSize: '10px' }}
                                itemStyle={{ color: '#f43f5e' }}
                             />
                             <Bar dataKey="risk" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                          </BarChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded shadow-sm text-slate-500 p-6">
                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2 font-mono">
                  <Zap size={12} /> TIZIM ANALITIKASI VA KRITIK SIGNALLAR
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                         <span>Barcha tekshiruvlar</span>
                         <span className="text-emerald-500">Faol</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                         <div className="bg-emerald-500 h-full w-[100%]"></div>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                         <span>Shubhali nomzodlar</span>
                         <span className="text-amber-500">Monitoring ostida</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                         <div className="bg-amber-500 h-full w-[12%]"></div>
                      </div>
                   </div>
                   <div className="space-y-3 font-mono text-[9px]">
                      <div className="text-slate-700 uppercase tracking-widest py-4 text-center border border-slate-900 rounded">Monitoring faol. Tizim xavfsiz holatda.</div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'applications' && (
              <section className="flex-1 px-4 pb-4 overflow-hidden flex flex-col">
                <div className="bg-slate-900 border border-slate-800 rounded shadow-sm h-full flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Barcha arizalar bazasi</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void exportReport()}
                        disabled={exportingReport}
                        className="text-[10px] font-bold border border-emerald-900 px-3 py-1.5 rounded bg-emerald-950/30 text-emerald-400 uppercase outline-none hover:bg-emerald-900/40 disabled:opacity-50"
                      >
                        {exportingReport ? 'Eksport...' : 'CSV eksport'}
                      </button>
                       <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                        <input 
                          type="text" 
                          placeholder="Nomzod yoki lavozim..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="text-xs border border-slate-800 bg-slate-950 text-slate-300 pl-8 pr-2 py-1.5 rounded w-64 font-mono outline-none focus:border-emerald-500" 
                        />
                      </div>
                      <select 
                        value={applicationFilter}
                        onChange={(e) => setApplicationFilter(e.target.value as ApplicationFilter)}
                        className="text-[10px] font-bold border border-slate-800 px-2 py-1.5 rounded bg-slate-950 text-slate-400 uppercase outline-none focus:border-emerald-500"
                      >
                        <option value="all">Barcha arizalar</option>
                        <option value="new_resumes">Yangi rezyumelar</option>
                        <option value="pending">Pending</option>
                        <option value="hired">Qabul qilinganlar</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-950 text-[10px] text-slate-500 uppercase sticky top-0 z-10 border-b border-slate-800">
                        <tr>
                          <th className="p-3 font-semibold">Nomzod</th>
                          <th className="p-3 font-semibold">Lavozim</th>
                          <th className="p-3 font-semibold">AI Ball</th>
                          <th className="p-3 font-semibold text-center">Audit Xulosasi</th>
                          <th className="p-3 font-semibold">Holat</th>
                          <th className="p-3 font-semibold text-right">Batafsil</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-slate-800 font-mono">
                        {filteredApplications.map(app => (
                          <tr key={app.id} className="hover:bg-slate-800 transition-colors">
                            <td className="p-3 font-bold">
                               <span className="blur-[6px]">{app.candidateName}</span>
                            </td>
                            <td className="p-3 text-slate-500">{app.position}</td>
                            <td className="p-3">
                               <span className={cn(
                                 "px-2 py-0.5 rounded font-bold",
                                 app.score > 80 ? "bg-emerald-950 text-emerald-400" : app.score > 60 ? "bg-blue-950 text-blue-400" : "bg-red-950 text-red-400"
                               )}>{app.score}</span>
                            </td>
                            <td className="p-3 text-center">
                               {app.conflictDetected ? 
                                 <span className="text-[10px] text-red-500 font-bold border border-red-900 px-2 py-0.5 rounded bg-red-950/30">CONFLICT</span> : 
                                 <span className="text-[10px] text-emerald-500 font-bold border border-emerald-900 px-2 py-0.5 rounded bg-emerald-950/30">CLEAN</span>
                               }
                            </td>
                            <td className="p-3 text-blue-500 uppercase font-black">{app.status}</td>
                            <td className="p-3 text-right">
                               <button onClick={() => setSelectedApplication(app)} className="text-slate-100 bg-slate-950 p-1.5 rounded hover:bg-emerald-600 transition-colors"><ChevronRight size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-widest shrink-0">
                    <div>Jonli ro'yxat • Jami {filteredApplications.length} nomzod</div>
                    <div className="flex gap-4">
                      <span className="flex items-center gap-1"><Fingerprint size={10} /> Hash Verified</span>
                      <span className="flex items-center gap-1 text-emerald-600"><Zap size={10} /> Live Monitoring On</span>
                    </div>
                  </div>
                </div>
              </section>
          )}

          {(activeTab as string) === 'shortlisted' && (
              <section className="flex-1 px-4 pb-4 overflow-hidden flex flex-col">
                <div className="bg-slate-900 border border-slate-800 rounded shadow-sm h-full flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-800 bg-slate-950 shrink-0">
                    <h2 className="text-xs font-bold text-blue-400 uppercase tracking-tighter">Suhbatga chaqirilgan nomzodlar (Interview Stage)</h2>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-950 text-[10px] text-slate-500 uppercase sticky top-0 z-10 border-b border-slate-800">
                        <tr>
                          <th className="p-4 font-semibold">Nomzod</th>
                          <th className="p-4 font-semibold">Lavozim</th>
                          <th className="p-4 font-semibold">Suhbatga chaqirgan HR</th>
                          <th className="p-4 font-semibold text-right">Amal</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-slate-800 font-mono">
                        {applications.filter(a => a.status === 'shortlisted').length > 0 ? (
                           applications.filter(a => a.status === 'shortlisted').map(app => (
                             <tr key={app.id} className="hover:bg-slate-800 transition-colors">
                               <td className="p-4">
                                  <div className="font-bold text-slate-100 blur-[6px]">{app.candidateName}</div>
                               </td>
                               <td className="p-4 text-slate-400">{app.position}</td>
                               <td className="p-4 text-emerald-500 font-bold uppercase text-[10px]">
                                  {app.recruiterInfo || "Tizim"}
                               </td>
                               <td className="p-4 text-right">
                                  <button onClick={() => setSelectedApplication(app)} className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-[10px] font-bold text-white transition-colors">Intervyu Markazi</button>
                               </td>
                             </tr>
                           ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-12 text-center text-slate-600 uppercase tracking-widest font-bold">
                               Suhbatdagi nomzodlar yo'q.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
          )}

          {activeTab === 'hired_staff' && (
              <section className="flex-1 px-4 pb-4 overflow-hidden flex flex-col">
                <div className="bg-slate-900 border border-slate-800 rounded shadow-sm h-full flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-800 bg-slate-950 shrink-0">
                    <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-tighter">Ishga qabul qilingan kadrlar ruyhati</h2>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-950 text-[10px] text-slate-500 uppercase sticky top-0 z-10 border-b border-slate-800">
                        <tr>
                          <th className="p-4 font-semibold">Xodim</th>
                          <th className="p-4 font-semibold">Lavozim</th>
                          <th className="p-4 font-semibold">Qabul qilgan HR</th>
                          <th className="p-4 font-semibold">Sana</th>
                          <th className="p-4 font-semibold text-right">Amal</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-slate-800 font-mono">
                        {applications.filter(a => a.status === 'hired').length > 0 ? (
                           applications.filter(a => a.status === 'hired').map(app => (
                             <tr key={app.id} className="hover:bg-slate-800 transition-colors">
                               <td className="p-4">
                                  <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500"><UserCheck size={14} /></div>
                                     <div>
                                        <div className="font-bold text-slate-100">{app.candidateName}</div>
                                        <div className="text-[10px] text-slate-500">{app.candidateEmail}</div>
                                     </div>
                                  </div>
                               </td>
                               <td className="p-4 text-slate-400">{app.position}</td>
                               <td className="p-4 text-emerald-500 font-black uppercase text-[10px]">
                                  {app.recruiterInfo || "Tizim"}
                               </td>
                               <td className="p-4 text-slate-500">
                                  {app.updatedAt ? format(new Date(app.updatedAt), 'yyyy-MM-dd') : 'Recently'}
                               </td>
                               <td className="p-4 text-right">
                                  <button onClick={() => setSelectedApplication(app)} className="bg-slate-950 hover:bg-emerald-600 px-3 py-1 rounded text-[10px] font-bold text-slate-200 transition-colors">Batafsil</button>
                               </td>
                             </tr>
                           ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-12 text-center text-slate-600 uppercase tracking-widest font-bold">
                               Hozircha ishga qabul qilingan xodimlar yo'q.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
          )}

          {activeTab === 'profile' && profileDraft && (
            <section className="flex-1 px-4 pb-4 overflow-hidden flex flex-col">
              <div className="bg-slate-900 border border-slate-800 rounded shadow-sm h-full flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
                  <div>
                    <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-tighter">HR Profil</h2>
                    <p className="text-[10px] text-slate-500 mt-1">Kadrlar bo'limi foydalanuvchi ma'lumotlari</p>
                  </div>
                  <button
                    onClick={() => void handleSaveProfile()}
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-950 hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {savingProfile ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {savingProfile ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-6 bg-slate-950">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <ProfileImageField
                      fullName={`${profileDraft.firstName} ${profileDraft.lastName}`}
                      imageUrl={profileDraft.photoUrl}
                      hasPendingFile={Boolean(pendingProfilePhoto)}
                      onFileSelect={handleProfilePhotoChange}
                      onReset={handleProfilePhotoReset}
                    />
                    <ProfileInput
                      label="Ismi"
                      value={profileDraft.firstName}
                      onChange={(value) => setProfileDraft((prev) => prev ? { ...prev, firstName: value } : prev)}
                    />
                    <ProfileInput
                      label="Familiyasi"
                      value={profileDraft.lastName}
                      onChange={(value) => setProfileDraft((prev) => prev ? { ...prev, lastName: value } : prev)}
                    />
                    <ProfileInput
                      label="Otasining ismi"
                      value={profileDraft.middleName}
                      onChange={(value) => setProfileDraft((prev) => prev ? { ...prev, middleName: value } : prev)}
                    />
                    <ProfileInput
                      label="Telefon"
                      value={profileDraft.phone}
                      onChange={(value) => setProfileDraft((prev) => prev ? { ...prev, phone: value } : prev)}
                    />
                    <ProfileInput
                      label="Email"
                      value={profileDraft.email}
                      disabled
                      onChange={() => {}}
                    />
                    <ProfileInput
                      label="Passport raqami"
                      value={profileDraft.passportNumber}
                      onChange={(value) => setProfileDraft((prev) => prev ? { ...prev, passportNumber: value.toUpperCase() } : prev)}
                    />
                    <ProfileInput
                      label="JSHSHIR / PINFL"
                      value={profileDraft.passportPinfl}
                      onChange={(value) => setProfileDraft((prev) => prev ? { ...prev, passportPinfl: value } : prev)}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

        </div>

        {/* System Footer Bar */}
        <footer className="h-12 bg-slate-950 border-t border-slate-900 text-[10px] text-slate-500 flex items-center px-4 gap-6 shrink-0 font-mono">
          <div className="flex items-center gap-2">
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isOffline ? "bg-red-500" : "bg-emerald-500")}></span> 
            {isOffline ? "TIZIM OFLAYN (ALOQA YO'Q)" : "TIZIM ONLAYN"}
          </div>
          <div className="truncate hidden sm:block">LOG: [{new Date().toLocaleTimeString()}] Tizim tahlillari real-vaqtda yangilanmoqda...</div>
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> BLOKCHEYN SINXRON</div>
            <div className="text-slate-400">SHAFFOFLIK DARAJASI: <span className="text-emerald-400 font-bold">99.8%</span></div>
          </div>
        </footer>
      </main>

      {/* Slide-over Detail View */}
      <AnimatePresence>
        {selectedApplication && (
          <React.Fragment key="detail-view-container">
            <motion.div 
               key="overlay"
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setSelectedApplication(null)}
               className="fixed inset-0 bg-slate-950/80 backdrop-blur-[4px] z-[60]"
            />
            <motion.div 
              key="panel"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-slate-900 border-l border-slate-800 z-[70] shadow-2xl flex flex-col font-mono"
            >
               <div className="p-6 border-b border-slate-800 bg-slate-950 text-white flex items-center justify-between">
                     <div>
                        <h3 className={cn(selectedApplication.status !== 'hired' && "blur-[10px]", "text-sm font-black uppercase tracking-tighter")}>
                          {selectedApplication.candidateName}
                        </h3>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{selectedApplication.position}</p>
                      </div>
                  <button onClick={() => setSelectedApplication(null)} className="text-slate-500 hover:text-white transition-colors">
                    <XCircle size={20} />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {selectedApplication.conflictDetected && (
                    <div className="p-4 bg-red-950 border border-red-900 text-red-400 rounded-sm">
                       <div className="flex gap-3">
                         <ShieldAlert size={20} className="shrink-0" />
                         <div>
                            <p className="text-[10px] font-black uppercase italic tracking-widest">Manfaatlar to'qnashuvi aniqlandi!</p>
                            <p className="text-[11px] mt-1 leading-relaxed text-red-500/80">{selectedApplication.conflictDetails}</p>
                         </div>
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded">
                       <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">AI Merit Score</p>
                       <p className="text-3xl font-black text-slate-100">{selectedApplication.score}</p>
                    </div>
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded">
                       <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Current Status</p>
                       <p className="text-lg font-black text-emerald-500 uppercase mt-2 tracking-tighter">{selectedApplication.status}</p>
                    </div>
                  </div>

                  {selectedApplication.status === 'hired' && (
                     <section className="space-y-4">
                        <div className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-2">
                           <Phone size={12} /> Aloqa Ma'lumotlari (REVEALED)
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-emerald-950/20 border border-emerald-900 rounded flex items-center gap-3">
                              <Phone size={14} className="text-emerald-500" />
                              <div>
                                 <p className="text-[8px] text-slate-500 uppercase font-bold">Telefon</p>
                                 <p className="text-[10px] text-slate-100 font-bold">{selectedApplication.phone || "+998 90 000 00 00"}</p>
                              </div>
                           </div>
                           <div className="p-4 bg-emerald-950/20 border border-emerald-900 rounded flex items-center gap-3">
                              <Send size={14} className="text-emerald-500" />
                              <div>
                                 <p className="text-[8px] text-slate-500 uppercase font-bold">Telegram</p>
                                 <p className="text-[10px] text-slate-100 font-bold">{selectedApplication.telegram || "@candidate"}</p>
                              </div>
                           </div>
                        </div>
                     </section>
                  )}

                  <section className="space-y-4">
                     <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                        <FileText size={12} /> Ko'rinadigan hujjatlar
                     </div>
                     <div className="p-4 border border-slate-800 space-y-3 bg-slate-950/50">
                        <div className="rounded border border-amber-900/30 bg-amber-950/10 px-3 py-2 text-[10px] uppercase tracking-widest text-amber-400">
                          Fuqarolik pasporti HR uchun yashirilgan.
                        </div>

                        {selectedApplication.documents.length > 0 ? (
                          selectedApplication.documents.map((document, index) => (
                            <div
                              key={`${document.type}-${document.name}-${index}`}
                              className="flex items-center justify-between gap-3 rounded border border-slate-800 bg-slate-950 px-4 py-3"
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
                            {selectedApplication.maskedData.skills.map(s => (
                              <span key={s} className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[9px] font-bold rounded-sm uppercase">{s}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-600 uppercase">Tajriba</p>
                          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed bg-slate-950 p-3 border border-slate-800 italic">{selectedApplication.maskedData.experience}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-600 uppercase">Ta'lim</p>
                          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed bg-slate-950 p-3 border border-slate-800">{selectedApplication.maskedData.education}</p>
                        </div>
                     </div>
                  </section>
               </div>

                <div className="p-6 border-t border-slate-800 flex flex-col gap-3 bg-slate-950">
                  {selectedApplication.status === 'pending' || selectedApplication.status === 'reviewing' ? (
                    <button 
                      onClick={() => handleUpdateStatus(selectedApplication.id, 'shortlisted')}
                      className="w-full bg-blue-600 text-white font-black py-4 text-xs uppercase tracking-widest rounded shadow hover:bg-blue-500 flex items-center justify-center gap-2"
                    >
                      SUHBATGA CHAQIRISH (INTERVIEW ON)
                    </button>
                  ) : selectedApplication.status === 'shortlisted' ? (
                    <button 
                      onClick={() => handleUpdateStatus(selectedApplication.id, 'hired')}
                      className="w-full bg-emerald-600 text-slate-950 font-black py-4 text-xs uppercase tracking-widest rounded shadow hover:bg-emerald-500 flex items-center justify-center gap-2"
                    >
                      ISHGA QABUL QILISH (FINALIZE)
                    </button>
                  ) : selectedApplication.status === 'hired' ? (
                    <div className="text-center py-4 text-emerald-500 font-bold text-[10px] uppercase border border-emerald-900 bg-emerald-950/20">
                      Ushbu nomzod ishga qabul qilingan.
                    </div>
                  ) : null}
                  
                  {selectedApplication.status !== 'hired' && selectedApplication.status !== 'rejected' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedApplication.id, 'rejected')}
                      className="w-full bg-slate-800 text-slate-400 font-black py-4 text-xs uppercase tracking-widest rounded hover:bg-slate-700 flex items-center justify-center gap-2 border border-slate-700"
                    >
                      RAD ETISH
                    </button>
                  ) }
               </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </div>
  );
}
