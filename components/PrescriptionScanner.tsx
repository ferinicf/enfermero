import React, { useState, useRef } from 'react';
import { Medicine, ExtractedPrescription } from '../types';
import { extractPrescription, hasApiKey } from '../services/geminiService';
import { compressImage, todayStr, defaultTimesFor } from '../utils';
import {
  Camera, ImagePlus, Loader2, Sparkles, AlertTriangle, Check,
  Trash2, Plus, X, PencilLine, RefreshCcw,
} from 'lucide-react';

type NewMedicine = Omit<Medicine, 'id' | 'color' | 'createdAt'>;

interface Props {
  onSave: (medicines: NewMedicine[]) => void;
  onAddManual: () => void;
  onOpenSettings: () => void;
}

interface ReviewMed extends NewMedicine {
  included: boolean;
}

const PrescriptionScanner: React.FC<Props> = ({ onSave, onAddManual, onOpenSettings }) => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [reviewMeds, setReviewMeds] = useState<ReviewMed[] | null>(null);
  const [prescriptionMeta, setPrescriptionMeta] = useState<{ doctor: string; notes: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError('');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressImage(reader.result as string, 1400, 0.85);
        setPhoto(compressed);
        setReviewMeds(null);
      } catch {
        setError('No se pudo procesar la imagen. Intenta con otra foto.');
      }
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!photo) return;
    setAnalyzing(true);
    setError('');
    try {
      const result: ExtractedPrescription = await extractPrescription(photo);
      if (!result.medicines || result.medicines.length === 0) {
        setError('No se encontraron medicamentos en la foto. Asegúrate de que la receta se vea completa, con buena luz y sin reflejos.');
        return;
      }
      const thumbnail = await compressImage(photo, 700, 0.6);
      setPrescriptionMeta({ doctor: result.doctor, notes: result.notes });
      setReviewMeds(
        result.medicines.map(m => ({
          included: true,
          name: m.name,
          dose: m.dose,
          presentation: m.presentation,
          times: m.suggestedTimes && m.suggestedTimes.length > 0
            ? m.suggestedTimes.map(t => t.slice(0, 5)).sort()
            : defaultTimesFor(m.frequencyHours > 0 ? Math.max(1, Math.round(24 / m.frequencyHours)) : 1),
          startDate: todayStr(),
          durationDays: m.durationDays || 0,
          instructions: m.instructions,
          purpose: m.purpose,
          description: m.description,
          sideEffects: m.sideEffects,
          warnings: m.warnings,
          doctor: result.doctor,
          stock: null,
          prescriptionPhoto: thumbnail,
        }))
      );
    } catch (e) {
      console.error(e);
      setError('Hubo un problema al leer la receta. Revisa tu conexión a internet e intenta de nuevo.');
    } finally {
      setAnalyzing(false);
    }
  };

  const updateMed = (index: number, changes: Partial<ReviewMed>) => {
    setReviewMeds(prev => prev!.map((m, i) => (i === index ? { ...m, ...changes } : m)));
  };

  const updateTime = (medIndex: number, timeIndex: number, value: string) => {
    setReviewMeds(prev => prev!.map((m, i) => {
      if (i !== medIndex) return m;
      const times = [...m.times];
      times[timeIndex] = value;
      return { ...m, times };
    }));
  };

  const save = () => {
    const toSave = reviewMeds!
      .filter(m => m.included && m.name.trim())
      .map(m => ({ ...m, times: [...new Set(m.times)].sort() }));
    if (toSave.length === 0) {
      setError('Selecciona al menos una medicina para guardar.');
      return;
    }
    onSave(toSave);
    setPhoto(null);
    setReviewMeds(null);
  };

  if (!hasApiKey()) {
    return (
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 text-amber-800 font-semibold space-y-3">
        <p className="font-extrabold flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Falta configurar la lectura de recetas</p>
        <p className="text-sm">
          Si alguien de tu familia ya configuró la app, pídele que te mande el <strong>enlace de configuración</strong> (está en Ajustes ⚙️) y solo ábrelo en este teléfono.
        </p>
        <p className="text-sm">
          Si eres el primero, entra a Ajustes y pega tu clave gratuita de Gemini (ahí viene el enlace para obtenerla).
        </p>
        <button onClick={onOpenSettings} className="w-full bg-amber-600 text-white font-extrabold px-4 py-3 rounded-xl">
          ⚙️ Abrir Ajustes
        </button>
        <button onClick={onAddManual} className="w-full bg-white border-2 border-amber-300 text-amber-700 font-bold px-4 py-2.5 rounded-xl">
          Agregar medicina manualmente (sin IA)
        </button>
      </div>
    );
  }

  // ---- Paso 3: revisión de lo extraído ----
  if (reviewMeds) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-extrabold text-slate-800">Revisa lo que leí</h2>
        <p className="text-slate-500 font-semibold text-sm">
          Encontré {reviewMeds.length} {reviewMeds.length === 1 ? 'medicamento' : 'medicamentos'} en la receta
          {prescriptionMeta?.doctor ? ` (Dr. ${prescriptionMeta.doctor.replace(/^dr\.?\s*/i, '')})` : ''}.
          Verifica los datos y corrige lo necesario antes de guardar. <strong>Ante cualquier duda, confirma con el médico.</strong>
        </p>
        {prescriptionMeta?.notes && (
          <p className="bg-slate-100 rounded-xl p-3 text-sm font-semibold text-slate-600">📝 {prescriptionMeta.notes}</p>
        )}

        {reviewMeds.map((med, i) => (
          <div
            key={i}
            className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${med.included ? 'border-medi-mint' : 'border-slate-100 opacity-60'}`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={med.included}
                  onChange={e => updateMed(i, { included: e.target.checked })}
                  className="w-6 h-6 accent-teal-700"
                />
                <span className="font-extrabold text-slate-700">Guardar esta medicina</span>
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-slate-400 uppercase">Nombre</label>
                <input
                  value={med.name}
                  onChange={e => updateMed(i, { name: e.target.value })}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:border-medi-teal outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-400 uppercase">Dosis por toma</label>
                  <input
                    value={med.dose}
                    onChange={e => updateMed(i, { dose: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 font-semibold focus:border-medi-teal outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-400 uppercase">Duración (días)</label>
                  <input
                    type="number"
                    min={0}
                    value={med.durationDays}
                    onChange={e => updateMed(i, { durationDays: Math.max(0, Number(e.target.value)) })}
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 font-semibold focus:border-medi-teal outline-none"
                  />
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">0 = uso continuo</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-400 uppercase">Horarios de toma</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {med.times.map((t, ti) => (
                    <div key={ti} className="flex items-center gap-1 bg-medi-light rounded-xl px-2 py-1">
                      <input
                        type="time"
                        value={t}
                        onChange={e => updateTime(i, ti, e.target.value)}
                        className="bg-transparent font-bold text-medi-dark outline-none"
                      />
                      {med.times.length > 1 && (
                        <button onClick={() => updateMed(i, { times: med.times.filter((_, x) => x !== ti) })} className="text-slate-400">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => updateMed(i, { times: [...med.times, '12:00'] })}
                    className="bg-slate-100 text-slate-500 rounded-xl px-3 py-2 font-bold flex items-center gap-1 text-sm"
                  >
                    <Plus className="w-4 h-4" /> Hora
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-400 uppercase">Empieza el</label>
                  <input
                    type="date"
                    value={med.startDate}
                    onChange={e => updateMed(i, { startDate: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 font-semibold focus:border-medi-teal outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-400 uppercase">Indicaciones</label>
                  <input
                    value={med.instructions}
                    onChange={e => updateMed(i, { instructions: e.target.value })}
                    placeholder="con alimentos..."
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 font-semibold focus:border-medi-teal outline-none"
                  />
                </div>
              </div>

              {med.purpose && (
                <p className="text-sm font-semibold text-slate-500 bg-slate-50 rounded-xl p-3">
                  💡 {med.purpose}
                </p>
              )}
            </div>
          </div>
        ))}

        {error && <p className="text-medi-red font-bold">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => { setReviewMeds(null); }}
            className="px-5 bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl flex items-center gap-2"
          >
            <RefreshCcw className="w-5 h-5" /> Repetir
          </button>
          <button
            onClick={save}
            className="flex-1 bg-medi-teal text-white font-extrabold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg"
          >
            <Check className="w-6 h-6" /> Guardar medicinas
          </button>
        </div>
      </div>
    );
  }

  // ---- Pasos 1 y 2: tomar foto y analizar ----
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-extrabold text-slate-800">Escanear receta</h2>
      <p className="text-slate-500 font-semibold">
        Toma una foto de la receta del médico. La app leerá los medicamentos, sus horarios y la duración del tratamiento.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {!photo ? (
        <div className="space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-medi-teal text-white font-extrabold text-lg py-6 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform shadow-lg"
          >
            <Camera className="w-10 h-10" />
            Tomar foto de la receta
          </button>
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = () => input.files?.[0] && handleFile(input.files[0]);
              input.click();
            }}
            className="w-full bg-white border-2 border-medi-teal text-medi-teal font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <ImagePlus className="w-6 h-6" /> Elegir de la galería
          </button>
          <button
            onClick={onAddManual}
            className="w-full text-slate-500 font-bold py-3 rounded-2xl flex items-center justify-center gap-2"
          >
            <PencilLine className="w-5 h-5" /> Prefiero escribirla a mano
          </button>

          <div className="bg-medi-light rounded-2xl p-4 text-sm font-semibold text-medi-dark space-y-1">
            <p className="font-extrabold">Consejos para una buena lectura:</p>
            <p>• Buena luz, sin sombras ni reflejos.</p>
            <p>• Que se vea toda la receta, derecha y enfocada.</p>
            <p>• Si son varias hojas, escanéalas una por una.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <img src={photo} alt="Receta" className="rounded-2xl w-full border-2 border-slate-200" />
            {!analyzing && (
              <button
                onClick={() => setPhoto(null)}
                className="absolute top-3 right-3 bg-white/90 text-medi-red rounded-full p-2.5 shadow"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            {analyzing && (
              <div className="absolute inset-0 bg-white/85 rounded-2xl flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-12 h-12 text-medi-teal animate-spin" />
                <p className="font-extrabold text-medi-dark text-lg">Leyendo la receta...</p>
                <p className="text-slate-500 font-semibold text-sm">Identificando medicinas, horarios y duración</p>
              </div>
            )}
          </div>

          {!analyzing && (
            <button
              onClick={analyze}
              className="w-full bg-medi-teal text-white font-extrabold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg"
            >
              <Sparkles className="w-6 h-6" /> Leer receta
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="bg-red-50 border border-red-200 rounded-xl p-3 text-medi-red font-bold text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
};

export default PrescriptionScanner;
