import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChevronRight,
  Fingerprint,
  Loader2,
  Search,
  Save,
  TrendingUp,
  UserCheck,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { Application, DashboardSummary, HrProfile } from '../types';
import { cn } from '../lib/utils';
import { ProfileImageField, ProfileInput } from './ProfileFields';
import { StatCard } from './StatCard';

type ApplicationFilter = 'all' | 'new_resumes' | 'pending' | 'hired';

interface DepartmentDataRow {
  apps: number;
  name: string;
  risk: number;
}

interface DashboardSceneProps {
  deptData: DepartmentDataRow[];
  isOffline: boolean;
  summary: DashboardSummary;
}

export function DashboardScene({
  deptData,
  isOffline,
  summary,
}: DashboardSceneProps) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0 bg-slate-950 p-3 sm:p-4 space-y-4">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Umumiy Arizalar" value={summary.totalApplications} trend={`${summary.pendingCount} ta navbatda`} />
        <StatCard label="O'rtacha Ball (AI)" value={summary.averageScore.toFixed(1)} subLabel="Max: 100 / Min: 0" />
        <StatCard label="Ishga Qabul Samaradorligi" value={`${summary.hiredCount}`} color="text-emerald-500" subLabel="Hired nomzodlar" />
        <StatCard label="Tizim Holati" value={isOffline ? 'OFFLINE' : 'ONLINE'} color={isOffline ? 'text-red-500' : 'text-emerald-500'} trend={isOffline ? 'Aloqa tiklanmoqda' : 'Barqaror'} />
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
              <div className="bg-emerald-500 h-full w-[100%]" />
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>Shubhali nomzodlar</span>
              <span className="text-amber-500">Monitoring ostida</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full w-[12%]" />
            </div>
          </div>
          <div className="space-y-3 font-mono text-[9px]">
            <div className="text-slate-700 uppercase tracking-widest py-4 text-center border border-slate-900 rounded">Monitoring faol. Tizim xavfsiz holatda.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ApplicationsSceneProps {
  applicationFilter: ApplicationFilter;
  exportingReport: boolean;
  filteredApplications: Application[];
  onExport: () => void;
  onFilterChange: (value: ApplicationFilter) => void;
  onSearchChange: (value: string) => void;
  onSelectApplication: (application: Application) => void;
  searchTerm: string;
}

export function ApplicationsScene({
  applicationFilter,
  exportingReport,
  filteredApplications,
  onExport,
  onFilterChange,
  onSearchChange,
  onSelectApplication,
  searchTerm,
}: ApplicationsSceneProps) {
  return (
    <section className="flex-1 px-4 pb-4 overflow-hidden flex flex-col">
      <div className="bg-slate-900 border border-slate-800 rounded shadow-sm h-full flex flex-col overflow-hidden">
        <div className="shrink-0 border-b border-slate-800 bg-slate-950 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Barcha arizalar bazasi</h2>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end">
              <button
                onClick={onExport}
                disabled={exportingReport}
                className="rounded border border-emerald-900 bg-emerald-950/30 px-3 py-1.5 text-[10px] font-bold uppercase text-emerald-400 outline-none hover:bg-emerald-900/40 disabled:opacity-50"
              >
                {exportingReport ? 'Eksport...' : 'CSV eksport'}
              </button>
              <div className="relative">
                <SearchBox value={searchTerm} onChange={onSearchChange} placeholder="Nomzod yoki lavozim..." />
              </div>
              <select
                value={applicationFilter}
                onChange={(event) => onFilterChange(event.target.value as ApplicationFilter)}
                className="rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-[10px] font-bold uppercase text-slate-400 outline-none focus:border-emerald-500"
              >
                <option value="all">Barcha arizalar</option>
                <option value="new_resumes">Yangi rezyumelar</option>
                <option value="pending">Pending</option>
                <option value="hired">Qabul qilinganlar</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="min-w-[720px] w-full text-left">
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
              {filteredApplications.map((application) => (
                <tr key={application.id} className="hover:bg-slate-800 transition-colors">
                  <td className="p-3 font-bold">
                    <span className="blur-[6px]">{application.candidateName}</span>
                  </td>
                  <td className="p-3 text-slate-500">{application.position}</td>
                  <td className="p-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded font-bold',
                        application.score > 80
                          ? 'bg-emerald-950 text-emerald-400'
                          : application.score > 60
                            ? 'bg-blue-950 text-blue-400'
                            : 'bg-red-950 text-red-400',
                      )}
                    >
                      {application.score}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {application.conflictDetected ? (
                      <span className="text-[10px] text-red-500 font-bold border border-red-900 px-2 py-0.5 rounded bg-red-950/30">CONFLICT</span>
                    ) : (
                      <span className="text-[10px] text-emerald-500 font-bold border border-emerald-900 px-2 py-0.5 rounded bg-emerald-950/30">CLEAN</span>
                    )}
                  </td>
                  <td className="p-3 text-blue-500 uppercase font-black">{application.status}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => onSelectApplication(application)} className="text-slate-100 bg-slate-950 p-1.5 rounded hover:bg-emerald-600 transition-colors">
                      <ChevronRight size={14} />
                    </button>
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
  );
}

interface ShortlistedSceneProps {
  applications: Application[];
  onSelectApplication: (application: Application) => void;
}

export function ShortlistedScene({
  applications,
  onSelectApplication,
}: ShortlistedSceneProps) {
  const shortlistedApplications = applications.filter((application) => application.status === 'shortlisted');

  return (
    <section className="flex-1 px-4 pb-4 overflow-hidden flex flex-col">
      <div className="bg-slate-900 border border-slate-800 rounded shadow-sm h-full flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950 shrink-0">
          <h2 className="text-xs font-bold text-blue-400 uppercase tracking-tighter">Suhbatga chaqirilgan nomzodlar (Interview Stage)</h2>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="min-w-[720px] w-full text-left">
            <thead className="bg-slate-950 text-[10px] text-slate-500 uppercase sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="p-4 font-semibold">Nomzod</th>
                <th className="p-4 font-semibold">Lavozim</th>
                <th className="p-4 font-semibold">Suhbatga chaqirgan HR</th>
                <th className="p-4 font-semibold text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-800 font-mono">
              {shortlistedApplications.length > 0 ? (
                shortlistedApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-slate-800 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-100 blur-[6px]">{application.candidateName}</div>
                    </td>
                    <td className="p-4 text-slate-400">{application.position}</td>
                    <td className="p-4 text-emerald-500 font-bold uppercase text-[10px]">
                      {application.recruiterInfo || 'Tizim'}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => onSelectApplication(application)} className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-[10px] font-bold text-white transition-colors">
                        Intervyu Markazi
                      </button>
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
  );
}

interface HiredStaffSceneProps {
  applications: Application[];
  onSelectApplication: (application: Application) => void;
}

export function HiredStaffScene({
  applications,
  onSelectApplication,
}: HiredStaffSceneProps) {
  const hiredApplications = applications.filter((application) => application.status === 'hired');

  return (
    <section className="flex-1 px-4 pb-4 overflow-hidden flex flex-col">
      <div className="bg-slate-900 border border-slate-800 rounded shadow-sm h-full flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950 shrink-0">
          <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-tighter">Ishga qabul qilingan kadrlar ruyhati</h2>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="min-w-[720px] w-full text-left">
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
              {hiredApplications.length > 0 ? (
                hiredApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-slate-800 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                          <UserCheck size={14} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-100">{application.candidateName}</div>
                          <div className="text-[10px] text-slate-500">{application.candidateEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400">{application.position}</td>
                    <td className="p-4 text-emerald-500 font-black uppercase text-[10px]">
                      {application.recruiterInfo || 'Tizim'}
                    </td>
                    <td className="p-4 text-slate-500">
                      {application.updatedAt ? format(new Date(application.updatedAt), 'yyyy-MM-dd') : 'Recently'}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => onSelectApplication(application)} className="bg-slate-950 hover:bg-emerald-600 px-3 py-1 rounded text-[10px] font-bold text-slate-200 transition-colors">
                        Batafsil
                      </button>
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
  );
}

interface ProfileSceneProps {
  hasPendingProfilePhoto: boolean;
  onFieldChange: (field: keyof HrProfile, value: string) => void;
  onFileSelect: (file: File | null) => void;
  onResetPhoto: () => void;
  onSave: () => void;
  profileDraft: HrProfile;
  profileImageUrl: string;
  savingProfile: boolean;
}

export function ProfileScene({
  hasPendingProfilePhoto,
  onFieldChange,
  onFileSelect,
  onResetPhoto,
  onSave,
  profileDraft,
  profileImageUrl,
  savingProfile,
}: ProfileSceneProps) {
  return (
    <section className="flex-1 px-4 pb-4 overflow-hidden flex flex-col">
      <div className="bg-slate-900 border border-slate-800 rounded shadow-sm h-full flex flex-col overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-tighter">HR Profil</h2>
            <p className="text-[10px] text-slate-500 mt-1">Kadrlar bo'limi foydalanuvchi ma'lumotlari</p>
          </div>
          <button
            onClick={onSave}
            disabled={savingProfile}
            className="inline-flex w-full items-center justify-center gap-2 rounded bg-emerald-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-950 hover:bg-emerald-500 disabled:opacity-60 sm:w-auto"
          >
            {savingProfile ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {savingProfile ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-950">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <ProfileImageField
              fullName={`${profileDraft.firstName} ${profileDraft.lastName}`}
              imageUrl={profileImageUrl}
              hasPendingFile={hasPendingProfilePhoto}
              onFileSelect={onFileSelect}
              onReset={onResetPhoto}
            />
            <ProfileInput label="Ismi" value={profileDraft.firstName} onChange={(value) => onFieldChange('firstName', value)} />
            <ProfileInput label="Familiyasi" value={profileDraft.lastName} onChange={(value) => onFieldChange('lastName', value)} />
            <ProfileInput label="Otasining ismi" value={profileDraft.middleName} onChange={(value) => onFieldChange('middleName', value)} />
            <ProfileInput label="Telefon" value={profileDraft.phone} onChange={(value) => onFieldChange('phone', value)} />
            <ProfileInput label="Email" value={profileDraft.email} disabled onChange={() => {}} />
            <ProfileInput label="Passport raqami" value={profileDraft.passportNumber} onChange={(value) => onFieldChange('passportNumber', value.toUpperCase())} />
            <ProfileInput label="JSHSHIR / PINFL" value={profileDraft.passportPinfl} onChange={(value) => onFieldChange('passportPinfl', value)} />
          </div>
        </div>
      </div>
    </section>
  );
}

interface SearchBoxProps {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}

function SearchBox({ onChange, placeholder, value }: SearchBoxProps) {
  return (
    <>
      <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border border-slate-800 bg-slate-950 py-1.5 pl-8 pr-2 font-mono text-xs text-slate-300 outline-none focus:border-emerald-500 sm:w-64"
      />
    </>
  );
}
