/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Search, 
  Bell, 
  User, 
  BarChart3, 
  FileText,
  ShieldAlert,
  ChevronRight,
  Loader2,
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
  Building
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
  fetchDashboard,
  fetchReports,
} from './lib/api';
import { Case, Candidate, ExternalProject, IntegrityReport, NewsItem, RiskStats } from './types';

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

const CaseDetail = ({
  caseItem,
  onClose,
  onReport,
}: {
  caseItem: Case,
  onClose: () => void,
  onReport: (caseItem: Case) => Promise<void>,
}) => {
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const handleReport = async () => {
    setReportError(null);
    setReporting(true);
    try {
      await onReport(caseItem);
      setReporting(false);
      setReported(true);
      setTimeout(() => setReported(false), 3000);
    } catch (error) {
      setReporting(false);
      setReportError(error instanceof Error ? error.message : 'Report yuborilmadi');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed inset-y-0 right-0 w-full max-w-sm glass-panel z-50 p-8 border-l border-zinc-800 overflow-y-auto shadow-2xl"
    >
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl serif-title text-gold font-bold">Holat tafsilotlari</h2>
        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
          <ChevronRight />
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Holat nomi</label>
          <p className="text-lg font-medium text-zinc-100">{caseItem.name}</p>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Tashkilot</label>
          <p className="text-zinc-300">{caseItem.organization}</p>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 block mb-2">Halollik xavfi indeksi</label>
          <div className="flex items-center gap-3">
            <div className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${
                  caseItem.riskScore > 75 ? 'bg-red-500' : caseItem.riskScore > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${caseItem.riskScore}%` }}
              />
            </div>
            <span className="font-mono text-xs text-zinc-100">{caseItem.riskScore}/100</span>
          </div>
        </div>

        <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50 mt-8">
          <h4 className="text-[11px] font-bold text-gold uppercase tracking-widest mb-3 flex items-center gap-2">
            Batafsil tahlil
          </h4>
          <ul className="space-y-3">
            {caseItem.anomalies.map((anomaly, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-400 leading-relaxed">
                <div className="w-1 h-1 rounded-full bg-gold/50 mt-1.5 flex-shrink-0" />
                {anomaly}
              </li>
            ))}
            {caseItem.anomalies.length === 0 && (
              <li className="text-xs text-zinc-500 italic">Tarixiy anomaliyalar qayd etilmagan.</li>
            )}
          </ul>
        </div>

        <div className="pt-8 border-t border-zinc-800">
          <button 
            onClick={handleReport}
            disabled={reporting || reported}
            className={`w-full py-2.5 rounded text-[10px] uppercase tracking-widest font-bold transition-all border ${
              reported 
                ? 'bg-emerald-900/20 border-emerald-500 text-emerald-500' 
                : 'border-gold text-gold hover:bg-gold hover:text-black'
            }`}
          >
            {reporting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Xabar yuborilmoqda...
              </span>
            ) : reported ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 size={14} />
                Xabar yuborildi
              </span>
            ) : (
              'KAK Agentligiga xabar berish'
            )}
          </button>
          {reportError && (
            <p className="mt-3 text-[10px] text-red-400">{reportError}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

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
  const [selectionStatus, setSelectionStatus] = useState<{ type: 'error' | 'success', message: string, candidate: Candidate } | null>(null);
  const [displayCases, setDisplayCases] = useState<Case[]>([]);
  const [candidateRows, setCandidateRows] = useState<Candidate[]>([]);
  const [timelineData, setTimelineData] = useState<Array<{ name: string; value: number }>>([]);
  const [soliqGraphData, setSoliqGraphData] = useState<Array<{ name: string; entities: number; individuals: number }>>([]);
  const [externalProjects, setExternalProjects] = useState<ExternalProject[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [reports, setReports] = useState<IntegrityReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Yangi yuqori xavfli holat aniqlandi: EF-005', type: 'error', time: '2 daqiqa oldin' },
    { id: 2, text: 'Tender jarayoni muvaffaqiyatli yakunlandi', type: 'success', time: '1 soat oldin' },
    { id: 3, text: 'Tizim yangilanishi muvaffaqiyatli tugallandi', type: 'info', time: '3 soat oldin' }
  ]);

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

  const filteredCandidates = candidateRows.filter(c => 
    c.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.conflictDetails && c.conflictDetails.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatReportTime = (value: string) =>
    new Date(value).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const pushNotification = (text: string, type: 'error' | 'success' | 'info') => {
    setNotifications(prev => [
      { id: Date.now(), text, type, time: 'Hozir' },
      ...prev,
    ]);
  };

  const handleSelectCandidate = (candidate: Candidate) => {
    if (candidate.conflictRisk === 'High' && candidate.score < 50) {
      setSelectionStatus({
        type: 'error',
        candidate,
        message: `BLOKIROVKA: Menejer #${candidate.id.split('-')[1]} nomzodni tanlashga urindi (Ball: ${candidate.score}). "Majburiy reyting" qoidasi buzilganligi sababli tizim bloklandi.`
      });
      pushNotification(`Blokirovka: Nomzod #${candidate.id.split('-')[1]} bo'yicha shubhali urinish`, 'error');
    } else {
      setSelectionStatus({
        type: 'success',
        candidate,
        message: `TASDIQLANDI: #${candidate.id.split('-')[1]} nomzod barcha tekshiruvlardan muvaffaqiyatli o‘tdi va zaxiraga olindi.`
      });
    }
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

  const handleSelectionReport = async (result: { type: 'error' | 'success', message: string, candidate: Candidate }) => {
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
    <div className="min-h-screen bg-dark-bg flex font-sans text-zinc-300 selection:bg-gold selection:text-black">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 bg-zinc-950/95 border-r gold-border flex flex-col z-50 transition-all duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:w-64 md:bg-zinc-950/50`}>
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
          <div className="p-4 border border-zinc-800 rounded bg-zinc-900/30">
            <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-2">Tizimda</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-gold">AM</div>
              <div className="overflow-hidden">
                <p className="text-[11px] font-bold text-zinc-200 truncate">A. Mirzayev</p>
                <p className="text-[9px] text-zinc-500 uppercase">Bosh monitor</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col h-screen">
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
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-dark-bg" />
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-72 sm:w-80 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-50 p-4"
                  >
                    <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-gold">Bildirishnomalar</h4>
                      <button onClick={() => setShowNotifications(false)} className="text-[9px] text-zinc-500 hover:text-zinc-300">Hammasini o'chirish</button>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} className="p-2 hover:bg-zinc-800/50 rounded transition-colors border-l-2 border-gold/30">
                          <p className="text-[11px] text-zinc-100">{n.text}</p>
                          <p className="text-[9px] text-zinc-500 mt-1">{n.time}</p>
                        </div>
                      ))}
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
                  <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                    <h3 className="text-xl serif-title text-zinc-100">Shubhali harakatlar monitori</h3>
                    <div className="flex items-center gap-4">
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
                    <table className="w-full text-left text-sm">
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
                            candidate.conflictRisk === 'High' 
                              ? 'bg-red-900/10 border-red-900/30' 
                              : 'bg-zinc-800/20 border-zinc-800/50 hover:bg-gold/[0.03]'
                          }`}
                        >
                          <div>
                            <p className="text-[11px] font-mono text-zinc-100 tracking-wider">NOMZOD #{candidate.id.split('-')[1]}</p>
                            <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest font-bold">{candidate.department}</p>
                            <div className="flex gap-4 mt-1">
                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Rezyume mosligi: <span className={candidate.matchPercentage > 80 ? "text-green-500" : "text-yellow-500"}>{candidate.matchPercentage}%</span></p>
                              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">ID: {candidate.id}</p>
                            </div>
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
                              <span className={`text-[9px] uppercase tracking-[0.2em] font-bold ${candidate.conflictRisk === 'High' ? 'text-red-500' : 'text-emerald-500'}`}>
                                {candidate.conflictRisk === 'High' ? 'Yuqori xavf' : 'Tekshiruv darajasi L1'}
                              </span>
                              <p className="text-[9px] text-zinc-600 italic block mt-0.5">
                                {candidate.conflictRisk === 'High' ? 'Nepotizm aloqasi (Oila)' : 'Halollik tasdiqlangan'}
                              </p>
                            </div>
                            <button 
                              onClick={() => handleSelectCandidate(candidate)}
                              className={`px-6 py-2 rounded text-[9px] font-bold uppercase tracking-widest transition-all ${
                                candidate.conflictRisk === 'High'
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
                      <button 
                        onClick={() => {}} // This will be triggered by re-opening or automated
                        className="text-[10px] uppercase tracking-widest font-bold text-gold hover:underline whitespace-nowrap"
                      >
                        Hisobotni ochish
                      </button>
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
                  <div className="p-4 bg-zinc-900/50 border-b border-zinc-800 flex justify-between items-center">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Backend reportlar</h4>
                    <span className="text-[9px] text-zinc-600 font-mono">{reports.length} ta yozuv</span>
                  </div>
                  <div className="divide-y divide-zinc-800/50">
                    {reports.length > 0 ? reports.map((report) => (
                      <div key={report.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                        <div>
                          <p className="text-xs text-zinc-200">{report.title}</p>
                          <p className="text-[10px] text-zinc-500 mt-1">{report.createdBy ?? 'System'} • {formatReportTime(report.createdAt)}</p>
                          <p className="text-[10px] text-zinc-600 mt-2">{report.message}</p>
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
                  <div className="p-4 bg-zinc-900/50 border-b border-zinc-800 flex justify-between items-center">
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
        
        {selectionStatus && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectionStatus(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-40"
            />
            <SelectionReport 
              result={selectionStatus} 
              onClose={() => setSelectionStatus(null)} 
              onExport={handleExport}
              onReport={handleSelectionReport}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const SelectionReport = ({ result, onClose, onExport, onReport }: { 
  result: { type: 'error' | 'success', message: string, candidate: Candidate }, 
  onClose: () => void,
  onExport: () => Promise<void>,
  onReport: (result: { type: 'error' | 'success', message: string, candidate: Candidate }) => Promise<void>
}) => {
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const handleReport = async () => {
    setReportError(null);
    setReporting(true);
    try {
      await onReport(result);
      setReporting(false);
      setReported(true);
      setTimeout(() => {
        setReported(false);
        onClose();
      }, 2000);
    } catch (error) {
      setReporting(false);
      setReportError(error instanceof Error ? error.message : 'Report yuborilmadi');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed inset-0 m-auto w-[90%] max-w-[500px] h-fit max-h-[90vh] glass-panel z-50 p-8 border border-zinc-800 overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-2xl flex flex-col"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${result.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
            <ShieldAlert size={20} />
          </div>
          <h2 className="text-xl serif-title text-zinc-100 font-bold uppercase tracking-tight">Halollik hisoboti</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500">
          <ChevronRight className="rotate-90" />
        </button>
      </div>

      <div className="space-y-6 flex-1">
        <div className={`p-4 rounded-lg border ${result.type === 'error' ? 'bg-red-950/20 border-red-900/50' : 'bg-emerald-950/20 border-emerald-900/50'}`}>
          <div className="flex items-center gap-2 mb-2">
             <AlertTriangle size={14} className={result.type === 'error' ? 'text-red-500' : 'text-emerald-500'} />
             <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${result.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
               {result.type === 'error' ? 'Blokirovka faollashdi' : 'Halollik tasdiqlandi'}
             </span>
          </div>
          <p className="text-sm text-zinc-200 leading-relaxed">{result.message}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
             <p className="text-[10px] uppercase text-zinc-500 tracking-widest mb-1">Nomzod ID</p>
             <p className="text-sm font-mono text-gold">#{result.candidate.id}</p>
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
             <p className="text-[10px] uppercase text-zinc-500 tracking-widest mb-1">Vazirlik bo'limi</p>
             <p className="text-[11px] font-bold text-zinc-100 truncate">{result.candidate.department}</p>
          </div>
          <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 col-span-2">
             <p className="text-[10px] uppercase text-zinc-500 tracking-widest mb-1">Vakolat balli</p>
             <p className="text-sm font-bold text-zinc-100">{result.candidate.score}/100</p>
          </div>
        </div>

        <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
           <p className="text-[10px] uppercase text-zinc-500 tracking-widest mb-3 font-bold">Xavf omillari & Aloqalar</p>
           <div className="space-y-3">
             <div className="flex justify-between items-center text-[11px]">
               <span className="text-zinc-500">Qarindoshlik aloqasi:</span>
               <span className={result.candidate.conflictRisk === 'High' ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                 {result.candidate.conflictRisk === 'High' ? 'Aniqlangan' : 'Mavjud emas'}
               </span>
             </div>
             <div className="p-3 bg-zinc-950/50 rounded border border-zinc-800/50 italic text-[11px] text-zinc-400 leading-relaxed">
               {result.candidate.conflictDetails || "Nomzodning hech qaysi qarindoshi ushbu tashkilotda faoliyat yuritmaydi."}
             </div>
           </div>
        </div>

        <div className="pt-6 border-t border-zinc-800 flex flex-col gap-3">
          {result.type === 'error' ? (
            <button 
              onClick={handleReport}
              disabled={reporting || reported}
              className={`w-full py-3 rounded text-[10px] uppercase tracking-widest font-bold transition-all border flex items-center justify-center gap-2 ${
                reported 
                  ? 'bg-red-900/40 border-red-500 text-red-500' 
                  : 'bg-red-600 border-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20'
              }`}
            >
              {reporting ? <Loader2 size={14} className="animate-spin" /> : reported ? <CheckCircle2 size={14} /> : null}
              {reporting ? 'Yuborilmoqda...' : reported ? 'Habar yuborildi' : 'Agentlikka xabar berish'}
            </button>
          ) : (
            <button 
              onClick={onClose}
              className="w-full py-3 rounded text-[10px] uppercase tracking-widest font-bold transition-all border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Zaxiraga olishni tasdiqlash
            </button>
          )}
          {reportError && (
            <p className="text-[10px] text-red-400">{reportError}</p>
          )}
          
          <button 
            onClick={onExport}
            className="w-full py-3 rounded text-[10px] uppercase tracking-widest font-bold transition-all border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Hisobotni yuklab olish (.CSV)
          </button>
          
          <button 
            onClick={onClose}
            className="w-full py-3 text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </motion.div>
  );
};
