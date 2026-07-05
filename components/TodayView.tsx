import React, { useState, useEffect } from 'react';
import { Medicine, DoseLog, ScheduledDose, VitalLog } from '../types';
import {
  dosesForDate, todayStr, nowHM, formatTime12, minutesUntil, humanDelta,
  treatmentDay, formatDateLong, adherenceStats, isActiveOn, vitalSummary,
} from '../utils';
import EditDoseModal from './EditDoseModal';
import VitalsForm, { VitalDraft } from './VitalsForm';
import {
  Camera, Check, X, Clock, AlarmClock, Utensils, Printer, PartyPopper,
  Share2, Pencil, Plus, HeartPulse, Activity,
} from 'lucide-react';

interface Props {
  medicines: Medicine[];
  logs: DoseLog[];
  vitals: VitalLog[];
  onMark: (medicineId: string, date: string, time: string, status: 'taken' | 'skipped', givenTime?: string) => void;
  onEditLog: (log: DoseLog, status: 'taken' | 'skipped', givenTime: string) => void;
  onRemoveLog: (log: DoseLog) => void;
  onSaveVital: (draft: VitalDraft, existingId?: string) => void;
  onDeleteVital: (id: string) => void;
  onGoScan: () => void;
}

const takenAtLabel = (log: DoseLog): string =>
  new Date(log.takenAt).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });

const DoseRow: React.FC<{
  dose: ScheduledDose;
  isNext: boolean;
  onMark: Props['onMark'];
  onOpenEdit: (dose: ScheduledDose) => void;
}> = ({ dose, isNext, onMark, onOpenEdit }) => {
  const { medicine, date, time, status } = dose;
  const mins = minutesUntil(time);
  const overdue = status === 'pending' && mins < -15;

  return (
    <div
      onClick={() => onOpenEdit(dose)}
      className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all cursor-pointer ${
        isNext ? 'border-medi-teal ring-2 ring-medi-mint' : overdue ? 'border-red-200' : 'border-transparent'
      } ${status !== 'pending' ? 'opacity-75' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white shrink-0"
          style={{ backgroundColor: medicine.color }}
        >
          <Clock className="w-4 h-4 mb-0.5" />
          <span className="text-[13px] font-extrabold leading-none">{formatTime12(time).replace(/\s.*/, '')}</span>
          <span className="text-[10px] font-bold">{formatTime12(time).split(' ')[1]}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-slate-800 text-lg leading-tight">{medicine.name}</p>
          <p className="text-slate-600 font-semibold">{medicine.dose}</p>
          {medicine.instructions && (
            <p className="text-amber-700 text-sm font-semibold flex items-center gap-1 mt-0.5">
              <Utensils className="w-4 h-4 shrink-0" /> {medicine.instructions}
            </p>
          )}
          {medicine.durationDays > 0 && (
            <p className="text-slate-400 text-xs font-bold mt-0.5">
              Día {treatmentDay(medicine, date)} de {medicine.durationDays}
            </p>
          )}

          {status === 'pending' && (
            <p className={`text-sm font-bold mt-1 ${overdue ? 'text-medi-red' : 'text-medi-teal'}`}>
              {overdue ? `⚠ Atrasada (${humanDelta(mins)})` : humanDelta(mins)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {status === 'pending' ? (
          <>
            <button
              onClick={e => { e.stopPropagation(); onMark(medicine.id, date, time, 'taken'); }}
              className="flex-1 bg-medi-teal text-white font-extrabold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform text-base"
            >
              <Check className="w-5 h-5" /> Ya la tomó
            </button>
            <button
              onClick={e => { e.stopPropagation(); onMark(medicine.id, date, time, 'skipped'); }}
              className="px-4 bg-slate-100 text-slate-500 font-bold py-3 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-transform"
            >
              <X className="w-5 h-5" /> Omitir
            </button>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-between">
            <span
              className={`font-extrabold flex items-center gap-2 ${
                status === 'taken' ? 'text-green-600' : 'text-slate-400'
              }`}
            >
              {status === 'taken' ? (
                <>
                  <Check className="w-5 h-5" /> Tomada
                  {dose.log && (
                    <span className="text-slate-400 text-sm font-semibold">
                      a las {takenAtLabel(dose.log)}
                      {dose.log.by ? ` · ${dose.log.by}` : ''}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <X className="w-5 h-5" /> Omitida
                  {dose.log?.by && <span className="text-slate-400 text-sm font-semibold">· {dose.log.by}</span>}
                </>
              )}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onOpenEdit(dose); }}
              className="text-medi-teal font-bold text-sm flex items-center gap-1 px-3 py-2 rounded-lg bg-medi-light active:scale-95"
            >
              <Pencil className="w-4 h-4" /> Cambiar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TodayView: React.FC<Props> = ({
  medicines, logs, vitals, onMark, onEditLog, onRemoveLog, onSaveVital, onDeleteVital, onGoScan,
}) => {
  // re-render cada minuto para actualizar los contadores de tiempo
  const [, setTick] = useState(0);
  const [editing, setEditing] = useState<ScheduledDose | null>(null);
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [editingVital, setEditingVital] = useState<VitalLog | null>(null);
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(i);
  }, []);

  const today = todayStr();
  const doses = dosesForDate(medicines, logs, today);
  const schedDoses = doses.filter(d => !d.medicine.asNeeded);
  const prnDoses = doses.filter(d => d.medicine.asNeeded);
  const prnMeds = medicines.filter(m => m.asNeeded && isActiveOn(m, today));
  const pending = schedDoses.filter(d => d.status === 'pending');
  const nextDose = pending.find(d => minutesUntil(d.time) >= -15) || pending[0];

  const saveModal = (status: 'taken' | 'skipped', givenTime: string) => {
    if (!editing) return;
    if (editing.log) {
      onEditLog(editing.log, status, givenTime);
    } else if (editing.medicine.asNeeded) {
      onMark(editing.medicine.id, editing.date, givenTime, status, givenTime);
    } else {
      onMark(editing.medicine.id, editing.date, editing.time, status, givenTime);
    }
    setEditing(null);
  };

  if (medicines.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <div className="text-6xl mb-4">💊</div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Aún no hay medicinas</h2>
        <p className="text-slate-500 font-semibold mb-8 max-w-sm mx-auto">
          Toma una foto de la receta del médico y la app registrará los horarios automáticamente.
        </p>
        <button
          onClick={onGoScan}
          className="bg-medi-teal text-white font-extrabold text-lg px-8 py-4 rounded-2xl shadow-lg inline-flex items-center gap-3 active:scale-95 transition-transform"
        >
          <Camera className="w-6 h-6" /> Escanear receta
        </button>
      </div>
    );
  }

  const todayVitals = vitals
    .filter(v => v.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  const vitalsSection = (
    <div className="space-y-3">
      <h3 className="font-extrabold text-slate-400 uppercase text-sm tracking-wide pt-2 flex items-center gap-2">
        <Activity className="w-4 h-4" /> Signos vitales de hoy
      </h3>
      {todayVitals.map(v => (
        <button
          key={v.id}
          onClick={() => setEditingVital(v)}
          className="w-full text-left bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-transform"
        >
          <span className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
            <HeartPulse className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-slate-800 leading-tight">{vitalSummary(v) || 'Nota'}</p>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              {formatTime12(v.time)}{v.by ? ` · ${v.by}` : ''}{v.notes ? ` · ${v.notes}` : ''}
            </p>
          </div>
          <Pencil className="w-4 h-4 text-slate-300 shrink-0" />
        </button>
      ))}
      <button
        onClick={() => setVitalsOpen(true)}
        className="w-full border-2 border-dashed border-slate-300 text-slate-500 font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform bg-white/60"
      >
        <Plus className="w-5 h-5" /> Registrar signos vitales
      </button>
    </div>
  );

  const vitalsModals = (
    <>
      {(vitalsOpen || editingVital) && (
        <VitalsForm
          initial={editingVital}
          onSave={onSaveVital}
          onDelete={editingVital ? onDeleteVital : undefined}
          onClose={() => { setVitalsOpen(false); setEditingVital(null); }}
        />
      )}
    </>
  );

  if (schedDoses.length === 0 && prnMeds.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-10 px-6">
          <PartyPopper className="w-14 h-14 mx-auto text-medi-teal mb-4" />
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Sin tomas para hoy</h2>
          <p className="text-slate-500 font-semibold">
            Ningún tratamiento activo tiene dosis programadas hoy.
          </p>
        </div>
        {vitalsSection}
        {vitalsModals}
      </div>
    );
  }

  const takenCount = schedDoses.filter(d => d.status === 'taken').length;
  const allDone = schedDoses.length > 0 && pending.length === 0;

  const shareToday = () => {
    const lines: string[] = [`💊 *Medicinas de hoy* — ${formatDateLong(today)}`, ''];
    schedDoses.forEach(d => {
      const mark = d.status === 'taken' ? '✅' : d.status === 'skipped' ? '❌' : '⬜';
      const takenAt = d.log?.status === 'taken'
        ? ` (tomada ${takenAtLabel(d.log)})`
        : d.status === 'skipped' ? ' (omitida)' : '';
      const extra = d.medicine.instructions ? ` — ${d.medicine.instructions}` : '';
      lines.push(`${mark} ${formatTime12(d.time)} · ${d.medicine.name}, ${d.medicine.dose}${extra}${takenAt}`);
    });
    prnDoses.forEach(d => {
      if (d.status !== 'taken') return;
      lines.push(`🆘 ${formatTime12(d.time)} · ${d.medicine.name}, ${d.medicine.dose} (se dio por síntomas)`);
    });
    todayVitals.forEach(v => {
      lines.push(`🩺 ${formatTime12(v.time)} · ${vitalSummary(v) || 'Nota'}${v.notes ? ` — ${v.notes}` : ''}`);
    });
    if (schedDoses.length > 0) lines.push('', `Completadas: ${takenCount} de ${schedDoses.length}`);
    const stats = adherenceStats(medicines, logs, 7);
    if (stats.expected > 0) lines.push(`Cumplimiento últimos 7 días: ${stats.percent}%`);
    lines.push('', '— Enviado desde MediHorario');
    const text = lines.join('\n');

    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Tomas de hoy</h2>
          <p className="text-slate-500 font-bold">
            {schedDoses.length > 0
              ? `${takenCount} de ${schedDoses.length} completadas`
              : 'Solo medicinas por síntomas'}
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <button
            onClick={shareToday}
            className="bg-green-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 active:scale-95"
            title="Compartir con la familia por WhatsApp"
          >
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>
          <button
            onClick={() => window.print()}
            className="text-medi-teal bg-medi-mint font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 active:scale-95"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      {schedDoses.length > 0 && (
        <>
          {/* Barra de progreso del día */}
          <div className="bg-white rounded-full h-4 shadow-inner overflow-hidden">
            <div
              className="bg-medi-teal h-full rounded-full transition-all duration-500"
              style={{ width: `${(takenCount / schedDoses.length) * 100}%` }}
            />
          </div>

          {allDone ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 text-center">
              <p className="text-green-700 font-extrabold text-lg">✅ ¡Todas las tomas de hoy están registradas!</p>
            </div>
          ) : (
            nextDose && (
              <div className="bg-medi-teal text-white rounded-2xl p-4 flex items-center gap-3 shadow-lg">
                <AlarmClock className="w-8 h-8 shrink-0" />
                <div>
                  <p className="text-medi-mint text-sm font-bold uppercase tracking-wide">Próxima toma</p>
                  <p className="font-extrabold text-lg leading-tight">
                    {nextDose.medicine.name} · {formatTime12(nextDose.time)}
                  </p>
                  <p className="text-medi-mint font-semibold text-sm">{humanDelta(minutesUntil(nextDose.time))}</p>
                </div>
              </div>
            )
          )}

          <div className="space-y-3">
            {schedDoses.map(dose => (
              <DoseRow
                key={dose.log?.id ?? `${dose.medicine.id}-${dose.time}`}
                dose={dose}
                isNext={!allDone && nextDose === dose}
                onMark={onMark}
                onOpenEdit={setEditing}
              />
            ))}
          </div>
        </>
      )}

      {/* Medicinas sin horario fijo: se registran solo cuando se necesitan */}
      {prnMeds.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-extrabold text-slate-400 uppercase text-sm tracking-wide pt-2 flex items-center gap-2">
            <HeartPulse className="w-4 h-4" /> Solo si se necesita
          </h3>
          {prnMeds.map(med => {
            const given = prnDoses.filter(d => d.medicine.id === med.id);
            return (
              <div
                key={med.id}
                className="bg-white rounded-2xl p-4 shadow-sm border-l-8"
                style={{ borderLeftColor: med.color }}
              >
                <p className="font-extrabold text-slate-800 text-lg leading-tight">{med.name}</p>
                <p className="text-slate-600 font-semibold">{med.dose}</p>
                {(med.purpose || med.instructions) && (
                  <p className="text-slate-500 text-sm font-semibold mt-0.5">
                    {med.purpose}{med.purpose && med.instructions ? ' · ' : ''}{med.instructions}
                  </p>
                )}

                {given.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {given.map(d => (
                      <button
                        key={d.log!.id}
                        onClick={() => setEditing(d)}
                        className={`font-bold text-sm px-3 py-2 rounded-xl flex items-center gap-1.5 active:scale-95 ${
                          d.status === 'taken' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'
                        }`}
                        title="Toca para corregir la hora o quitar el registro"
                      >
                        {d.status === 'taken' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {formatTime12(d.time)}
                        <Pencil className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onMark(med.id, today, nowHM(), 'taken')}
                    className="flex-1 bg-medi-teal text-white font-extrabold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <Plus className="w-5 h-5" /> Se la dio ahora
                  </button>
                  <button
                    onClick={() => setEditing({ medicine: med, date: today, time: nowHM(), status: 'pending' })}
                    className="px-4 bg-slate-100 text-slate-500 font-bold py-3 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-transform"
                    title="Registrar con otra hora"
                  >
                    <Clock className="w-5 h-5" /> Otra hora
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {vitalsSection}

      {editing && (
        <EditDoseModal
          dose={editing}
          onSave={saveModal}
          onRemove={editing.log ? () => { onRemoveLog(editing.log!); setEditing(null); } : undefined}
          onClose={() => setEditing(null)}
        />
      )}
      {vitalsModals}
    </div>
  );
};

export default TodayView;
