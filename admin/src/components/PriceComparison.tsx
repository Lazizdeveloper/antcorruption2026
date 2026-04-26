import { AlertCircle, PieChart } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface PriceComparisonDatum {
  name: string;
  price: number;
}

interface PriceComparisonProps {
  data: PriceComparisonDatum[];
}

export function PriceComparison({ data }: PriceComparisonProps) {
  return (
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
}
