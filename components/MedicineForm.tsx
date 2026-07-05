import React, { useState } from 'react';
import { Medicine } from '../types';
import { todayStr, defaultTimesFor } from '../utils';
import { fetchMedicineInfo, hasApiKey } from '../services/geminiService';
import { X, Plus, Sparkles, Loader2, Save } from 'lucide-react';

type NewMedicine = Omit<Medicine, 'id' | 'color' | 'createdAt'>;

interface Props {
  initial: Medicine | null;
  onSave: (med: NewMedicine) => void;
  onCancel: () => void;
}

const MedicineForm: React.FC<Props> = ({ initial, onSave, onCancel }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [dose, setDose] = useState(initial?.dose ?? '');
  const [presentation, setPresentation] = useState(initial?.presentation ?? 'tableta');
  const [asNeeded, setAsNeeded] = useState(initial?.asNeeded ?? false);
  const [times, setTimes] = useState<string[]>(
    initial && initial.times.length > 0 ? initial.times : ['08:00']
  );
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayStr());
  const [durationDays, setDurationDays] = useState(initial?.durationDays ?? 7);
  const [instructions, setInstructions] = useState(initial?.instructions ?? '');
  const [doctor, setDoctor] = useState(initial?.doctor ?? '');
  const [stockEnabled, setStockEnabled] = useState(initial ? initial.stock !== null : false);
  const [stock, setStock] = useState(initial?.stock ?? 30);
  const [purpose, setPurpose] = useState(initial?.purpose ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [sideEffects, setSideEffects] = useState(initial?.sideEffects ?? '');
  const [warnings, setWarnings] = useState(initial?.warnings ?? '');
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [error, setError] = useState('');

  const setTimesPerDay = (n: number) => setTimes(defaultTimesFor(n));

  const toggleAsNeeded = (checked: boolean) => {
    setAsNeeded(checked);
    // Una medicina por síntomas suele ser de uso continuo; solo al crearla nueva
    if (checked && !initial) setDurationDays(0);
  };

  const loadInfo = async () => {
    if (!name.trim()) {
      setError('Escribe primero el nombre de la medicina.');
      return;
    }
    setLoadingInfo(true);
    setError('');
    try {
      const info = await fetchMedicineInfo(name, dose);
      setPurpose(info.purpose);
      setDescription(info.description);
      setSideEffects(info.sideEffects);
      setWarnings(info.warnings);
    } catch (e) {
      console.error(e);
      setError('No se pudo obtener la información. Intenta de nuevo.');
    } finally {
      setLoadingInfo(false);
    }
  };

  const submit = () => {
    if (!name.trim()) {
      setError('El nombre de la medicina es obligatorio.');
      return;
    }
    if (!asNeeded && times.length === 0) {
      setError('Agrega al menos un horario de toma.');
      return;
    }
    onSave({
      name: name.trim(),
      dose: dose.trim() || '1 dosis',
      presentation,
      asNeeded,
      times: asNeeded ? [] : [...new Set(times)].sort(),
      startDate,
      durationDays: Math.max(0, durationDays),
      instructions: instructions.trim(),
      purpose,
      description,
      sideEffects,
      warnings,
      doctor: doctor.trim(),
      stock: stockEnabled ? Math.max(0, stock) : null,
      prescriptionPhoto: initial?.prescriptionPhoto,
    });
  };

  const field = 'w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 font-semibold text-slate-800 focus:border-medi-teal outline-none';
  const label = 'text-xs font-extrabold text-slate-400 uppercase';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onCancel}>
      <div
        className="bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-medi-teal text-white p-5 flex items-center justify-between z-10">
          <h3 className="text-xl font-extrabold">{initial ? 'Editar medicina' : 'Nueva medicina'}</h3>
          <button onClick={onCancel} className="bg-white/20 rounded-full p-2"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={label}>Nombre y concentración *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Losartán 50 mg" className={field} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Dosis por toma</label>
              <input value={dose} onChange={e => setDose(e.target.value)} placeholder="Ej. 1 tableta" className={field} />
            </div>
            <div>
              <label className={label}>Presentación</label>
              <select value={presentation} onChange={e => setPresentation(e.target.value)} className={field}>
                {['tableta', 'cápsula', 'jarabe', 'gotas', 'inyección', 'inhalador', 'parche', 'crema', 'otro'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-medi-light rounded-xl p-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={asNeeded}
                onChange={e => toggleAsNeeded(e.target.checked)}
                className="w-5 h-5 accent-teal-700"
              />
              <span className="font-bold text-medi-dark">Solo cuando se necesite (si hay síntomas)</span>
            </label>
            {asNeeded && (
              <p className="text-[11px] text-slate-500 font-semibold mt-1.5">
                Sin horarios fijos ni recordatorios: se registra cada vez que se dé.
                Por ejemplo, para el hipo, dolor o náuseas.
              </p>
            )}
          </div>

          {!asNeeded && (
          <div>
            <label className={label}>¿Cuántas veces al día?</label>
            <div className="flex gap-2 mt-1">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => setTimesPerDay(n)}
                  className={`flex-1 py-2.5 rounded-xl font-extrabold border-2 transition-colors ${
                    times.length === n ? 'bg-medi-teal text-white border-medi-teal' : 'bg-white text-slate-500 border-slate-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          )}

          {!asNeeded && (
          <div>
            <label className={label}>Horarios</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {times.map((t, i) => (
                <div key={i} className="flex items-center gap-1 bg-medi-light rounded-xl px-2 py-1.5">
                  <input
                    type="time"
                    value={t}
                    onChange={e => setTimes(prev => prev.map((x, xi) => (xi === i ? e.target.value : x)))}
                    className="bg-transparent font-bold text-medi-dark outline-none"
                  />
                  {times.length > 1 && (
                    <button onClick={() => setTimes(prev => prev.filter((_, xi) => xi !== i))} className="text-slate-400">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setTimes(prev => [...prev, '12:00'])}
                className="bg-slate-100 text-slate-500 rounded-xl px-3 py-2 font-bold flex items-center gap-1 text-sm"
              >
                <Plus className="w-4 h-4" /> Hora
              </button>
            </div>
          </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Empieza el</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>Duración (días)</label>
              <input
                type="number"
                min={0}
                value={durationDays}
                onChange={e => setDurationDays(Number(e.target.value))}
                className={field}
              />
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">0 = uso continuo</p>
            </div>
          </div>

          <div>
            <label className={label}>Indicaciones especiales</label>
            <input
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="Ej. tomar con alimentos"
              className={field}
            />
          </div>

          <div>
            <label className={label}>Médico que la recetó</label>
            <input value={doctor} onChange={e => setDoctor(e.target.value)} placeholder="Ej. Dra. García" className={field} />
          </div>

          <div className="bg-slate-50 rounded-xl p-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={stockEnabled}
                onChange={e => setStockEnabled(e.target.checked)}
                className="w-5 h-5 accent-teal-700"
              />
              <span className="font-bold text-slate-700">Controlar cuántas pastillas quedan</span>
            </label>
            {stockEnabled && (
              <div className="mt-2">
                <label className={label}>Cantidad actual en casa</label>
                <input
                  type="number"
                  min={0}
                  value={stock}
                  onChange={e => setStock(Number(e.target.value))}
                  className={field}
                />
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  Se descuenta 1 cada vez que se marca una toma. Te avisará cuando queden pocas.
                </p>
              </div>
            )}
          </div>

          {hasApiKey() && (
            <button
              onClick={loadInfo}
              disabled={loadingInfo}
              className="w-full bg-medi-mint text-medi-dark font-extrabold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loadingInfo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {loadingInfo ? 'Consultando...' : 'Explicar esta medicina con IA'}
            </button>
          )}

          {purpose && (
            <div className="bg-slate-50 rounded-xl p-3 text-sm font-semibold text-slate-600 space-y-1">
              <p><strong>Para qué sirve:</strong> {purpose}</p>
              {description && <p>{description}</p>}
            </div>
          )}

          {error && <p className="text-medi-red font-bold text-sm">{error}</p>}

          <button
            onClick={submit}
            className="w-full bg-medi-teal text-white font-extrabold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg"
          >
            <Save className="w-6 h-6" /> {initial ? 'Guardar cambios' : 'Agregar medicina'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicineForm;
