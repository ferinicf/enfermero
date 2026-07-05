import React, { useState } from 'react';
import { VitalLog } from '../types';
import { todayStr, nowHM } from '../utils';
import { X, Save, Trash2, Activity } from 'lucide-react';

export type VitalDraft = Omit<VitalLog, 'id' | 'by' | 'createdAt'>;

interface Props {
  /** Registro a corregir, o null para uno nuevo */
  initial: VitalLog | null;
  onSave: (draft: VitalDraft, existingId?: string) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const numOrNull = (s: string): number | null => {
  const n = Number(s.replace(',', '.'));
  return s.trim() === '' || Number.isNaN(n) ? null : n;
};

const VitalsForm: React.FC<Props> = ({ initial, onSave, onDelete, onClose }) => {
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [time, setTime] = useState(initial?.time ?? nowHM());
  const [systolic, setSystolic] = useState(initial?.systolic?.toString() ?? '');
  const [diastolic, setDiastolic] = useState(initial?.diastolic?.toString() ?? '');
  const [heartRate, setHeartRate] = useState(initial?.heartRate?.toString() ?? '');
  const [temperature, setTemperature] = useState(initial?.temperature?.toString() ?? '');
  const [oxygen, setOxygen] = useState(initial?.oxygen?.toString() ?? '');
  const [glucose, setGlucose] = useState(initial?.glucose?.toString() ?? '');
  const [weight, setWeight] = useState(initial?.weight?.toString() ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState('');

  const submit = () => {
    const draft: VitalDraft = {
      date,
      time,
      systolic: numOrNull(systolic),
      diastolic: numOrNull(diastolic),
      heartRate: numOrNull(heartRate),
      temperature: numOrNull(temperature),
      oxygen: numOrNull(oxygen),
      glucose: numOrNull(glucose),
      weight: numOrNull(weight),
      notes: notes.trim(),
    };
    const hasValue = [draft.systolic, draft.diastolic, draft.heartRate, draft.temperature, draft.oxygen, draft.glucose, draft.weight]
      .some(v => v !== null) || draft.notes !== '';
    if (!hasValue) {
      setError('Anota al menos un valor (o una nota).');
      return;
    }
    onSave(draft, initial?.id);
    onClose();
  };

  const field = 'w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 font-semibold text-slate-800 focus:border-medi-teal outline-none';
  const label = 'text-xs font-extrabold text-slate-400 uppercase';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-medi-teal text-white p-5 flex items-center justify-between z-10">
          <h3 className="text-xl font-extrabold flex items-center gap-2">
            <Activity className="w-6 h-6" /> {initial ? 'Corregir signos vitales' : 'Signos vitales'}
          </h3>
          <button onClick={onClose} className="bg-white/20 rounded-full p-2"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-slate-500 font-semibold text-sm">
            Llena solo lo que mediste; lo demás se puede dejar vacío.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Fecha</label>
              <input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>Hora</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className={field} />
            </div>
          </div>

          <div>
            <label className={label}>Presión arterial (mmHg)</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="number" inputMode="numeric" value={systolic} onChange={e => setSystolic(e.target.value)} placeholder="120 (alta)" className={field} />
              <span className="font-extrabold text-slate-400 text-xl">/</span>
              <input type="number" inputMode="numeric" value={diastolic} onChange={e => setDiastolic(e.target.value)} placeholder="80 (baja)" className={field} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Pulso (latidos/min)</label>
              <input type="number" inputMode="numeric" value={heartRate} onChange={e => setHeartRate(e.target.value)} placeholder="72" className={field} />
            </div>
            <div>
              <label className={label}>Temperatura (°C)</label>
              <input type="number" inputMode="decimal" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)} placeholder="36.5" className={field} />
            </div>
            <div>
              <label className={label}>Oxígeno (%)</label>
              <input type="number" inputMode="numeric" value={oxygen} onChange={e => setOxygen(e.target.value)} placeholder="96" className={field} />
            </div>
            <div>
              <label className={label}>Glucosa (mg/dL)</label>
              <input type="number" inputMode="numeric" value={glucose} onChange={e => setGlucose(e.target.value)} placeholder="110" className={field} />
            </div>
          </div>

          <div>
            <label className={label}>Peso (kg)</label>
            <input type="number" inputMode="decimal" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" className={field} />
          </div>

          <div>
            <label className={label}>Notas</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej. se sentía mareado en la mañana" className={field} />
          </div>

          {error && <p className="text-medi-red font-bold text-sm">{error}</p>}

          <button
            onClick={submit}
            className="w-full bg-medi-teal text-white font-extrabold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg"
          >
            <Save className="w-6 h-6" /> Guardar
          </button>

          {initial && onDelete && (
            <button
              onClick={() => { onDelete(initial.id); onClose(); }}
              className="w-full text-medi-red font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" /> Borrar este registro
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VitalsForm;
