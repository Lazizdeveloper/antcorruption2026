import { ConflictHirePerson } from '../types';
import { formatOptionalValue } from '../lib/integrity';

interface PersonDetailProps {
  label: string;
  person?: ConflictHirePerson | null;
}

export function PersonDetail({
  label,
  person,
}: PersonDetailProps) {
  if (!person) {
    return (
      <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">{label}</p>
        <p className="text-[11px] text-zinc-500 italic">Ma'lumot topilmadi</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">{label}</p>
      <div className="space-y-2 text-[11px] text-zinc-300">
        <p><span className="text-zinc-500">F.I.Sh:</span> {formatOptionalValue(person.fullName)}</p>
        <p><span className="text-zinc-500">Email:</span> {formatOptionalValue(person.email)}</p>
        <p><span className="text-zinc-500">Telefon:</span> {formatOptionalValue(person.phone)}</p>
        {person.telegram !== undefined && (
          <p><span className="text-zinc-500">Telegram:</span> {formatOptionalValue(person.telegram)}</p>
        )}
        {person.position !== undefined && (
          <p><span className="text-zinc-500">Lavozim:</span> {formatOptionalValue(person.position)}</p>
        )}
        {person.department !== undefined && (
          <p><span className="text-zinc-500">Tashkilot:</span> {formatOptionalValue(person.department)}</p>
        )}
      </div>
    </div>
  );
}
