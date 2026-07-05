import React, { useState } from 'react';
import { ScheduledDose } from '../types';
import { formatTime12, nowHM, todayStr } from '../utils';
import { X, Check, Save, Trash2, Clock } from 'lucide-react';

interface Props {
  dose: ScheduledDose;
  onSave: (status: 'taken' | 'skipped', givenTime: string) => void;
  /** Solo cuando ya existe un registro que se pueda quitar */
  onRemove?: () => void;
  onClose: () => void;
}

const hmFromISO = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Ventana para registrar o corregir una toma: cambiar entre tomada/omitida,
 * ajustar la hora real en que se dio (rescate antes o registro tardío)
 * o quitar el registro por completo.
 */
const EditDoseModal: React.FC<Props> = ({ dose, onSave, onRemove, onClose }) => {
  const { medicine, log } = dose;
  const isPrn = !!medicine.asNeeded;
  const [status, setStatus] = useState<'taken' | 'skipped'>(log?.status ?? 'taken');
  const [givenTime, setGivenTime] = useState<string>(() => {
    if (log?.status === 'taken') return hmFromISO(log.takenAt);
    return dose.date === todayStr() ? nowHM() : dose.time;
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-white p-5 flex items-start justify-between" style={{ backgroundColor: medicine.color }}>
          <div>
            <h3 className="text-xl font-extrabold leading-tight">{medicine.name}</h3>
            <p className="font-bold opacity-90">
              {isPrn ? 'Cuando se necesite' : `Toma de las ${formatTime12(dose.time)}`} · {medicine.dose}
            </p>
          </div>
          <button onClick={onClose} className="bg-white/20 rounded-full p-2 shrink-0"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-extrabold text-slate-400 uppercase mb-2">¿Qué pasó con esta toma?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setStatus('taken')}
                className={`flex-1 py-3.5 rounded-xl font-extrabold border-2 flex items-center justify-center gap-2 transition-colors ${
                  status === 'taken' ? 'bg-medi-teal text-white border-medi-teal' : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                <Check className="w-5 h-5" /> La tomó
              </button>
              <button
                onClick={() => setStatus('skipped')}
                className={`flex-1 py-3.5 rounded-xl font-extrabold border-2 flex items-center justify-center gap-2 transition-colors ${
                  status === 'skipped' ? 'bg-slate-600 text-white border-slate-600' : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                <X className="w-5 h-5" /> Omitida
              </button>
            </div>
          </div>

          {status === 'taken' && (
            <div>
              <p className="text-xs font-extrabold text-slate-400 uppercase mb-2 flex items-center gap-1">
                <Clock className="w-4 h-4" /> ¿A qué hora se la dio?
              </p>
              <input
                type="time"
                value={givenTime}
                onChange={e => setGivenTime(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-3 font-extrabold text-xl text-slate-800 focus:border-medi-teal outline-none"
              />
              <p className="text-[11px] text-slate-400 font-semibold mt-1">
                Puedes poner la hora real, aunque haya sido antes o después de la programada.
              </p>
            </div>
          )}

          <button
            onClick={() => onSave(status, givenTime || nowHM())}
            className="w-full bg-medi-teal text-white font-extrabold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg"
          >
            <Save className="w-5 h-5" /> Guardar
          </button>

          {onRemove && (
            <button
              onClick={onRemove}
              className="w-full text-medi-red font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              {isPrn ? 'Borrar este registro' : 'Quitar registro (dejar pendiente)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditDoseModal;
