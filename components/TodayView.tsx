import React, { useState, useEffect } from 'react';
import { Medicine, DoseLog, ScheduledDose } from '../types';
import { dosesForDate, todayStr, formatTime12, minutesUntil, humanDelta, treatmentDay, formatDateLong, adherenceStats } from '../utils';
import { Camera, Check, X, RotateCcw, Clock, AlarmClock, Utensils, Printer, PartyPopper, Share2 } from 'lucide-react';

interface Props {
  medicines: Medicine[];
  logs: DoseLog[];
  onMark: (medicineId: string, date: string, time: string, status: 'taken' | 'skipped') => void;
  onUndo: (medicineId: string, date: string, time: string) => void;
  onGoScan: () => void;
}

const DoseRow: React.FC<{
  dose: ScheduledDose;
  isNext: boolean;
  onMark: Props['onMark'];
  onUndo: Props['onUndo'];
}> = ({ dose, isNext, onMark, onUndo }) => {
  const { medicine, date, time, status } = dose;
  const mins = minutesUntil(time);
  const overdue = status === 'pending' && mins < -15;

  return (
    <div
      className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${
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
              onClick={() => onMark(medicine.id, date, time, 'taken')}
              className="flex-1 bg-medi-teal text-white font-extrabold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform text-base"
            >
              <Check className="w-5 h-5" /> Ya la tomó
            </button>
            <button
              onClick={() => onMark(medicine.id, date, time, 'skipped')}
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
                      a las {new Date(dose.log.takenAt).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })}
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
              onClick={() => onUndo(medicine.id, date, time)}
              className="text-slate-400 font-bold text-sm flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              <RotateCcw className="w-4 h-4" /> Deshacer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TodayView: React.FC<Props> = ({ medicines, logs, onMark, onUndo, onGoScan }) => {
  // re-render cada minuto para actualizar los contadores de tiempo
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(i);
  }, []);

  const today = todayStr();
  const doses = dosesForDate(medicines, logs, today);
  const pending = doses.filter(d => d.status === 'pending');
  const nextDose = pending.find(d => minutesUntil(d.time) >= -15) || pending[0];

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

  if (doses.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <PartyPopper className="w-14 h-14 mx-auto text-medi-teal mb-4" />
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Sin tomas para hoy</h2>
        <p className="text-slate-500 font-semibold">
          Ningún tratamiento activo tiene dosis programadas hoy.
        </p>
      </div>
    );
  }

  const takenCount = doses.filter(d => d.status === 'taken').length;
  const allDone = pending.length === 0;

  const shareToday = () => {
    const lines: string[] = [`💊 *Medicinas de hoy* — ${formatDateLong(today)}`, ''];
    doses.forEach(d => {
      const mark = d.status === 'taken' ? '✅' : d.status === 'skipped' ? '❌' : '⬜';
      const takenAt = d.log?.status === 'taken'
        ? ` (tomada ${new Date(d.log.takenAt).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })})`
        : d.status === 'skipped' ? ' (omitida)' : '';
      const extra = d.medicine.instructions ? ` — ${d.medicine.instructions}` : '';
      lines.push(`${mark} ${formatTime12(d.time)} · ${d.medicine.name}, ${d.medicine.dose}${extra}${takenAt}`);
    });
    lines.push('', `Completadas: ${takenCount} de ${doses.length}`);
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
            {takenCount} de {doses.length} completadas
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

      {/* Barra de progreso del día */}
      <div className="bg-white rounded-full h-4 shadow-inner overflow-hidden">
        <div
          className="bg-medi-teal h-full rounded-full transition-all duration-500"
          style={{ width: `${doses.length ? (takenCount / doses.length) * 100 : 0}%` }}
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
        {doses.map(dose => (
          <DoseRow
            key={`${dose.medicine.id}-${dose.time}`}
            dose={dose}
            isNext={!allDone && nextDose === dose}
            onMark={onMark}
            onUndo={onUndo}
          />
        ))}
      </div>
    </div>
  );
};

export default TodayView;
