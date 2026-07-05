import React, { useState } from 'react';
import { Medicine, DoseLog, ScheduledDose } from '../types';
import {
  adherenceStats, dosesForDate, todayStr, addDays, nowHM,
  formatTime12, formatDateLong,
} from '../utils';
import EditDoseModal from './EditDoseModal';
import { Check, X, HelpCircle, TrendingUp, Pencil } from 'lucide-react';

interface Props {
  medicines: Medicine[];
  logs: DoseLog[];
  onMark: (medicineId: string, date: string, time: string, status: 'taken' | 'skipped', givenTime?: string) => void;
  onEditLog: (log: DoseLog, status: 'taken' | 'skipped', givenTime: string) => void;
  onRemoveLog: (log: DoseLog) => void;
}

const HistoryView: React.FC<Props> = ({ medicines, logs, onMark, onEditLog, onRemoveLog }) => {
  const [editing, setEditing] = useState<ScheduledDose | null>(null);
  const today = todayStr();
  const now = nowHM();
  const stats = adherenceStats(medicines, logs, 7);

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i));

  const saveModal = (status: 'taken' | 'skipped', givenTime: string) => {
    if (!editing) return;
    if (editing.log) {
      onEditLog(editing.log, status, givenTime);
    } else {
      onMark(editing.medicine.id, editing.date, editing.time, status, givenTime);
    }
    setEditing(null);
  };

  if (medicines.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <div className="text-5xl mb-3">📈</div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Sin historial todavía</h2>
        <p className="text-slate-500 font-semibold">
          Cuando registres las tomas de cada día, aquí verás el cumplimiento del tratamiento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-extrabold text-slate-800">Historial</h2>

      {/* Resumen de adherencia */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="font-extrabold text-slate-400 text-xs uppercase tracking-wide flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4" /> Cumplimiento — últimos 7 días
        </p>
        <div className="flex items-center gap-5">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center border-8 shrink-0 ${
              stats.percent >= 85 ? 'border-green-500 text-green-600'
              : stats.percent >= 60 ? 'border-amber-400 text-amber-600'
              : 'border-red-400 text-medi-red'
            }`}
          >
            <span className="text-2xl font-extrabold">{stats.percent}%</span>
          </div>
          <div className="space-y-1.5 font-bold text-slate-600">
            <p className="flex items-center gap-2 text-green-600"><Check className="w-5 h-5" /> {stats.taken} tomadas</p>
            <p className="flex items-center gap-2 text-slate-400"><X className="w-5 h-5" /> {stats.skipped} omitidas</p>
            <p className="flex items-center gap-2 text-medi-red"><HelpCircle className="w-5 h-5" /> {stats.missed} sin registrar</p>
          </div>
        </div>
        {stats.percent >= 85 && stats.expected > 0 && (
          <p className="mt-3 text-green-700 bg-green-50 rounded-xl p-3 font-bold text-sm">
            🎉 ¡Excelente! El tratamiento se está siguiendo muy bien.
          </p>
        )}
        <p className="mt-3 text-xs text-slate-400 font-semibold">
          Toca cualquier toma para corregirla: cambiar la hora, marcarla o quitar el registro.
        </p>
      </div>

      {/* Detalle por día */}
      {days.map(date => {
        const doses = dosesForDate(medicines, logs, date);
        if (doses.length === 0) return null;
        return (
          <div key={date} className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="font-extrabold text-slate-700 mb-3">
              {date === today ? 'Hoy — ' : ''}{formatDateLong(date)}
            </p>
            <div className="space-y-2">
              {doses.map(dose => {
                const pendingFuture = dose.status === 'pending' && date === today && dose.time > now;
                const isPrn = !!dose.medicine.asNeeded;
                return (
                  <button
                    key={dose.log?.id ?? `${dose.medicine.id}-${dose.time}`}
                    onClick={() => !pendingFuture && setEditing(dose)}
                    disabled={pendingFuture}
                    className={`w-full text-left flex items-center gap-3 rounded-xl p-1.5 -m-1.5 ${
                      pendingFuture ? '' : 'active:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        dose.status === 'taken' ? 'bg-green-100 text-green-600'
                        : dose.status === 'skipped' ? 'bg-slate-100 text-slate-400'
                        : pendingFuture ? 'bg-medi-light text-medi-teal'
                        : 'bg-red-50 text-medi-red'
                      }`}
                    >
                      {dose.status === 'taken' ? <Check className="w-4 h-4" />
                        : dose.status === 'skipped' ? <X className="w-4 h-4" />
                        : <HelpCircle className="w-4 h-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-700 truncate">{dose.medicine.name}</p>
                      <p className="text-xs font-semibold text-slate-400">
                        {isPrn ? 'Se necesitó' : `Programada ${formatTime12(dose.time)}`}
                        {dose.log?.status === 'taken' && (
                          <> · tomada a las {new Date(dose.log.takenAt).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })}{dose.log.by ? ` por ${dose.log.by}` : ''}</>
                        )}
                        {dose.log?.status === 'skipped' && <> · omitida{dose.log.by ? ` por ${dose.log.by}` : ''}</>}
                        {dose.status === 'pending' && !pendingFuture && ' · sin registrar'}
                        {pendingFuture && ' · pendiente'}
                      </p>
                    </div>
                    {!pendingFuture && <Pencil className="w-4 h-4 text-slate-300 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {editing && (
        <EditDoseModal
          dose={editing}
          onSave={saveModal}
          onRemove={editing.log ? () => { onRemoveLog(editing.log!); setEditing(null); } : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};

export default HistoryView;
