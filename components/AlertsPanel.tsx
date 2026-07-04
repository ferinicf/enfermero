import React from 'react';
import { Medicine, DoseLog, FamilyEvent } from '../types';
import { formatTime12 } from '../utils';
import { X, Check, PlusCircle, BellOff } from 'lucide-react';

/** Construye la lista de avisos a partir de las tomas y medicinas registradas */
export const buildFamilyEvents = (medicines: Medicine[], logs: DoseLog[]): FamilyEvent[] => {
  const medName = new Map(medicines.map(m => [m.id, m.name]));
  const events: FamilyEvent[] = [];

  logs.forEach(l => {
    const name = medName.get(l.medicineId);
    if (!name) return;
    const who = l.by || 'Alguien';
    events.push({
      id: `log-${l.id}`,
      at: l.takenAt,
      kind: l.status,
      text: l.status === 'taken'
        ? `${who} registró: ${name} tomada (toma de ${formatTime12(l.time)})`
        : `${who} marcó como omitida: ${name} (toma de ${formatTime12(l.time)})`,
    });
  });

  medicines.forEach(m => {
    events.push({
      id: `med-${m.id}`,
      at: m.createdAt,
      kind: 'med-added',
      text: `${m.addedBy || 'Alguien'} agregó la medicina ${m.name}`,
    });
  });

  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 50);
};

const eventDate = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Hoy ${time}`;
  return `${d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} ${time}`;
};

interface Props {
  events: FamilyEvent[];
  seenAt: string;
  onClose: () => void;
}

const AlertsPanel: React.FC<Props> = ({ events, seenAt, onClose }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
    <div
      className="bg-white w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
      onClick={e => e.stopPropagation()}
    >
      <div className="sticky top-0 bg-medi-teal text-white p-5 flex items-center justify-between z-10">
        <h3 className="text-xl font-extrabold">Avisos de la familia</h3>
        <button onClick={onClose} className="bg-white/20 rounded-full p-2"><X className="w-5 h-5" /></button>
      </div>

      <div className="p-4 space-y-2">
        {events.length === 0 ? (
          <div className="text-center py-10">
            <BellOff className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-400">
              Aquí verás lo que registre cada miembro de la familia.
            </p>
          </div>
        ) : (
          events.map(ev => {
            const unread = !seenAt || ev.at > seenAt;
            return (
              <div
                key={ev.id}
                className={`flex items-start gap-3 rounded-xl p-3 ${unread ? 'bg-medi-light' : 'bg-slate-50'}`}
              >
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    ev.kind === 'taken' ? 'bg-green-100 text-green-600'
                    : ev.kind === 'skipped' ? 'bg-slate-200 text-slate-500'
                    : 'bg-medi-mint text-medi-dark'
                  }`}
                >
                  {ev.kind === 'taken' ? <Check className="w-4 h-4" />
                    : ev.kind === 'skipped' ? <X className="w-4 h-4" />
                    : <PlusCircle className="w-4 h-4" />}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm leading-snug ${unread ? 'font-extrabold text-slate-800' : 'font-semibold text-slate-600'}`}>
                    {ev.text}
                  </p>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">{eventDate(ev.at)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  </div>
);

export default AlertsPanel;
