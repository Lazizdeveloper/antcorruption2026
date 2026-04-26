import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Building,
  CheckCircle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Flag,
  PieChart,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatHiringAlertReason, formatOptionalValue, isConflictHireReport, type SelectionStatus } from '../lib/integrity';
import { Case, Candidate, ExternalProject, IntegrityReport, NewsItem, RiskStats } from '../types';
import { PersonDetail } from './PersonDetail';
import { PriceComparison } from './PriceComparison';
import { StatCard } from './StatCard';

interface DashboardSceneProps {
  filteredCases: Case[];
  onExport: () => void;
  onSelectCase: (caseItem: Case) => void;
  soliqGraphData: Array<{ entities: number; individuals: number; name: string }>;
  stats: RiskStats;
  timelineData: Array<{ name: string; value: number }>;
}

export function DashboardScene({
  filteredCases,
  onExport,
  onSelectCase,
  soliqGraphData,
  stats,
  timelineData,
}: DashboardSceneProps) {
  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-10"
    >
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

      <div className="glass-panel rounded-lg p-6 flex flex-col border gold-border">
        <div className="mb-6 flex flex-col gap-3 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl serif-title text-zinc-100">Shubhali harakatlar monitori</h3>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              onClick={onExport}
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
                        onClick={() => onSelectCase(item)}
                        className="text-[10px] font-mono text-zinc-500 hover:text-gold uppercase tracking-[0.1em] transition-colors"
                      >
                        {100 - item.riskScore}/100
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-500 italic text-sm">Natija topilmadi</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

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
  );
}

interface RecruitmentSceneProps {
  filteredCandidates: Candidate[];
  onClearSelectionStatus: () => void;
  onOpenSelectionReport: () => void;
  onSelectCandidate: (candidate: Candidate) => void;
  selectionStatus: SelectionStatus | null;
}

export function RecruitmentScene({
  filteredCandidates,
  onClearSelectionStatus,
  onOpenSelectionReport,
  onSelectCandidate,
  selectionStatus,
}: RecruitmentSceneProps) {
  const analysisSteps = [
    { title: 'DXA Integratsiya', desc: "DXA va FXDYo bazasidan qarindoshlik zanjirlarini avtomatik yuklash", icon: Database },
    { title: "mehnat.uz Tahlili", desc: "Nomzodning mehnat faoliyati va malaka darajasini tizimli solishtirish", icon: ShieldCheck },
    { title: 'AI Kompetensiya', desc: "Intervyu va proktoring natijalari asosida nomzodga ob'ektiv baho berish", icon: Cpu },
  ];

  return (
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
          {analysisSteps.map((step) => (
            <div key={step.title} className="glass-panel p-4 rounded-lg border border-zinc-800/50 bg-zinc-900/20 group hover:border-gold/20 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <step.icon size={16} className="text-gold" />
                <h5 className="text-[10px] uppercase tracking-widest font-bold text-zinc-300">{step.title}</h5>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed font-light">{step.desc}</p>
            </div>
          ))}
        </div>

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
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Rezyume mosligi: <span className={candidate.matchPercentage > 80 ? 'text-green-500' : 'text-yellow-500'}>{candidate.matchPercentage}%</span></p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">ID: {candidate.id}</p>
                  </div>
                  {candidate.hiringAlert ? (
                    <p className="text-[10px] text-red-400 mt-2">
                      HR: {candidate.hiringAlert.hr?.fullName ?? 'HR xodim'} | {formatOptionalValue(candidate.hiringAlert.hr?.phone)}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-8">
                  <div className="hidden lg:block text-right">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Intervyu vaqti</p>
                    <p className="text-[11px] text-zinc-300 font-mono italic">{candidate.interviewTime}</p>
                  </div>
                  {(candidate.proctoringRisk ?? 0) > 50 ? (
                    <div className="bg-red-900/20 px-2 py-1 rounded border border-red-900/40 flex items-center gap-2">
                      <AlertCircle size={12} className="text-red-500 animate-pulse" />
                      <span className="text-[9px] text-red-500 font-bold uppercase tracking-widest">AI Proctoring: Cheat Detected</span>
                    </div>
                  ) : null}
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
                    onClick={() => onSelectCandidate(candidate)}
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
          {filteredCandidates.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 italic text-sm">Nomzod topilmadi</div>
          ) : null}
        </div>

        {selectionStatus ? (
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
                onClick={onClearSelectionStatus}
                className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-zinc-300 whitespace-nowrap"
              >
                Yashirish
              </button>
              <button
                onClick={onOpenSelectionReport}
                className="text-[10px] uppercase tracking-widest font-bold text-gold hover:underline whitespace-nowrap"
              >
                Hisobotni ochish
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

interface TendersSceneProps {
  onSelectCase: (caseItem: Case) => void;
  tenders: Case[];
}

export function TendersScene({ onSelectCase, tenders }: TendersSceneProps) {
  const aiPrinciples = [
    { title: '1. Raqobat', desc: "Ishtirokchilar soni 1 ta bo'lsa risk. Raqobat yo'qligi = signal.", icon: Users, status: 'Competition' },
    { title: '2. Narx', desc: "O'rtacha narxdan 30% dan ortiq farq pul manipulyatsiyasini bildiradi.", icon: PieChart, status: 'Price Anomaly' },
    { title: "3. Takroriy g'olib", desc: "Bir kompaniya ko'p yutgan bo'lsa kelishilgan o'yinlar ehtimoli oshadi.", icon: Target, status: 'Pattern' },
    { title: '4. Vaqt', desc: "Sun'iy vaqt qisqartirilishi yoki anomaliyalar nazorati asosiy indikator hisoblanadi.", icon: Clock, status: 'Time Principle' },
  ];

  const advisorItems = [
    { title: 'Audit Direktiva', text: "Kritik xavf (70%+) aniqlangan tenderlar uchun mustaqil auditorlik tekshiruvini tayinlang. Jismoniy borib tekshirish shart.", icon: ShieldCheck },
    { title: 'Soliq Monitoring', text: "Tizim aniqlagan benefitsiar zanjirlarini Soliq.uz 'Xavf tahlili' tizimi bilan integratsiya qiling.", icon: PieChart },
    { title: "Ma'lumotlar Sifat", text: "Stat.uz ma'lumotlari eskirgan bo'lishi mumkin. AI flag qo'ygan holatlarda Ustav nusxasini so'rang.", icon: Database },
  ];

  return (
    <motion.div
      key="tenders"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
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
          {aiPrinciples.map((item) => (
            <div key={item.title} className="relative p-4 border border-zinc-800/80 rounded bg-zinc-950/40 group hover:border-gold/30 transition-all">
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
          <PriceComparison
            data={[
              { name: 'Kompaniya A', price: 85 },
              { name: 'Kompaniya B', price: 92 },
              { name: 'Kompaniya C', price: 135 },
              { name: "O'rtacha", price: 100 },
              { name: 'Kompaniya D', price: 145 },
            ]}
          />

          <div className="space-y-6 flex flex-col justify-center">
            <div className="flex items-start gap-4">
              <Target size={18} className="text-gold shrink-0 mt-1" />
              <div>
                <p className="text-[11px] text-gold/90 font-medium leading-relaxed">
                  <span className="font-bold underline uppercase">Strategik Maslahat:</span> qizil nuqtalar aniqlangan tenderlar uchun avtomatik auditorlik tekshiruvini tayinlashni tavsiya etamiz.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tenders.map((tender) => (
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
                    onClick={() => onSelectCase(tender)}
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
              {advisorItems.map((advice) => (
                <div key={advice.title} className="space-y-2 group">
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
  );
}

interface AuditSceneProps {
  exportingReports: boolean;
  externalProjects: ExternalProject[];
  formatReportTime: (value: string) => string;
  newsItems: NewsItem[];
  onExportReports: () => void;
  reports: IntegrityReport[];
}

export function AuditScene({
  exportingReports,
  externalProjects,
  formatReportTime,
  newsItems,
  onExportReports,
  reports,
}: AuditSceneProps) {
  const logs = [
    { user: 'Sistema AI', action: "Stat.uz benefitsiar zanjiri yangilandi (Batch-209)", time: '12:45', status: 'Success' },
    { user: 'A. Mirzayev', action: "Tender #7717 bo'yicha Uzex narx tahlilini so'radi", time: '12:10', status: 'Info' },
    { user: 'Audit Bot', action: "NOM-103: DXA ma'lumotlariga ko'ra nepotizm aniqlandi", time: '11:20', status: 'Alert' },
    { user: 'Soliq API', action: "Yuridik shaxslar qarzdorlik bazasi sinxronizatsiya qilindi", time: '09:00', status: 'Success' },
  ];

  return (
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
            {externalProjects.map((project) => (
              <div key={project.url} className="glass-panel p-4 rounded border border-zinc-800 hover:border-gold/30 transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] uppercase tracking-widest text-gold bg-gold/10 px-2 py-0.5 rounded">{project.document_type}</span>
                  <span className="text-[9px] text-zinc-600 font-mono">{project.published_date}</span>
                </div>
                <h5 className="text-xs font-bold text-zinc-200 mb-2 leading-relaxed">{project.title}</h5>
                <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-zinc-500 hover:text-gold flex items-center gap-1 transition-colors">
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
            {newsItems.map((newsItem) => (
              <div key={newsItem.url} className="glass-panel p-4 rounded border border-zinc-800 flex gap-4">
                <img src={newsItem.image_url} alt="news" className="w-16 h-16 object-cover rounded bg-zinc-800 flex-shrink-0" referrerPolicy="no-referrer" />
                <div>
                  <p className="text-[9px] text-zinc-600 font-mono mb-1">{newsItem.published_date}</p>
                  <h5 className="text-xs font-bold text-zinc-200 mb-1 leading-snug line-clamp-2">{newsItem.title}</h5>
                  <p className="text-[10px] text-zinc-500 line-clamp-2">{newsItem.summary}</p>
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
              onClick={onExportReports}
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
                {isConflictHireReport(report) ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                    <PersonDetail label="HR ma'lumotlari" person={report.details?.hr} />
                    <PersonDetail label="Qabul qilingan nomzod" person={report.details?.candidate} />
                  </div>
                ) : null}
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
          {logs.map((log) => (
            <div key={`${log.user}-${log.time}`} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-zinc-800/20 transition-colors gap-3 sm:gap-0">
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
  );
}
