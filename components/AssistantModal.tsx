import React, { useState } from 'react';
import { Medicine } from '../types';
import { formatTime12 } from '../utils';
import { askAboutMedicines, hasApiKey } from '../services/geminiService';
import { X, Bot, Send, Loader2, Pill, ChevronRight } from 'lucide-react';

interface Props {
  medicines: Medicine[];
  onClose: () => void;
  /** Abre la ficha de la medicina elegida */
  onSelect: (medicineId: string) => void;
}

const normalize = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const STOP_WORDS = new Set([
  'que', 'cual', 'cuales', 'hay', 'para', 'por', 'los', 'las', 'ella', 'del', 'una', 'uno', 'unos', 'unas',
  'medicamento', 'medicamentos', 'medicina', 'medicinas', 'pastilla', 'pastillas', 'remedio', 'remedios',
  'ensename', 'enseniame', 'muestrame', 'dime', 'dame', 'busca', 'buscar', 'quiero', 'ver', 'tengo', 'tiene',
  'sirve', 'sirven', 'toma', 'tomar', 'darle', 'dar', 'con', 'como', 'son', 'esta', 'este', 'estos', 'estas',
]);

/** Búsqueda local por palabras sobre nombre + explicación (funciona sin internet ni IA) */
const localSearch = (question: string, medicines: Medicine[]): Medicine[] => {
  const words = normalize(question)
    .split(/[^a-z0-9ñ]+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
  if (words.length === 0) return [];
  return medicines.filter(med => {
    const haystack = normalize(
      [med.name, med.purpose, med.description, med.instructions, med.sideEffects, med.presentation].join(' ')
    );
    return words.some(w => {
      const stem = w.endsWith('es') ? w.slice(0, -2) : w.endsWith('s') ? w.slice(0, -1) : w;
      return haystack.includes(w) || (stem.length >= 3 && haystack.includes(stem));
    });
  });
};

const SUGGESTIONS = ['¿Qué hay para la náusea?', '¿Cuál es para el dolor?', '¿Qué es para la presión?'];

interface Result {
  answer: string;
  meds: Medicine[];
}

const AssistantModal: React.FC<Props> = ({ medicines, onClose, onSelect }) => {
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const ask = async (q: string) => {
    const clean = q.trim();
    if (!clean || loading) return;
    setAsked(clean);
    setLoading(true);
    setResult(null);
    const local = localSearch(clean, medicines);
    if (hasApiKey()) {
      try {
        const reply = await askAboutMedicines(clean, medicines);
        const byId = new Map(medicines.map(m => [m.id, m]));
        const meds = reply.medicineIds.map(id => byId.get(id)).filter((m): m is Medicine => Boolean(m));
        // Si la IA no señaló ninguna pero la búsqueda local sí encontró, muéstralas también
        setResult({ answer: reply.answer, meds: meds.length > 0 ? meds : local });
        setLoading(false);
        return;
      } catch (e) {
        console.error('Asistente: error consultando la IA, usando búsqueda local', e);
      }
    }
    setResult({
      answer: local.length > 0
        ? `Esto es lo que encontré registrado que menciona lo que buscas:`
        : 'No encontré ninguna medicina registrada para eso. Revisa que la explicación "para qué sirve" esté escrita en cada medicina, o consulta al médico.',
      meds: local,
    });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-medi-dark text-white p-5 flex items-center justify-between z-10">
          <h3 className="text-xl font-extrabold flex items-center gap-2"><Bot className="w-6 h-6" /> Asistente de medicinas</h3>
          <button onClick={onClose} className="bg-white/20 rounded-full p-2"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-slate-500 font-semibold text-sm">
            Pregunta qué medicina registrada sirve para un síntoma y te la muestro.
          </p>

          <div className="flex gap-2">
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') ask(question); }}
              placeholder='Ej. ¿qué hay para la náusea?'
              className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-3 font-semibold text-slate-800 focus:border-medi-teal outline-none"
            />
            <button
              onClick={() => ask(question)}
              disabled={!question.trim() || loading}
              className="bg-medi-teal text-white font-extrabold px-4 rounded-xl flex items-center justify-center disabled:opacity-40 active:scale-95"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>

          {!result && !loading && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => { setQuestion(s); ask(s); }}
                  className="bg-medi-light text-medi-dark font-bold text-sm px-3 py-2 rounded-xl active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <p className="text-slate-400 font-bold text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Buscando en tus medicinas...
            </p>
          )}

          {result && (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-xs font-extrabold text-slate-400 uppercase mb-1">Sobre «{asked}»</p>
                {result.answer && (
                  <p className="text-slate-700 font-semibold whitespace-pre-line">{result.answer}</p>
                )}
              </div>

              {result.meds.map(med => (
                <button
                  key={med.id}
                  onClick={() => onSelect(med.id)}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-l-8 flex items-center gap-3 active:scale-[0.98] transition-transform"
                  style={{ borderLeftColor: med.color }}
                >
                  <Pill className="w-6 h-6 shrink-0" style={{ color: med.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-slate-800 leading-tight">{med.name}</p>
                    <p className="text-slate-500 font-semibold text-sm">
                      {med.dose}
                      {med.purpose ? ` · ${med.purpose}` : ''}
                    </p>
                    <p className="text-xs font-bold text-medi-teal mt-0.5">
                      {med.asNeeded ? 'Solo si se necesita' : med.times.map(formatTime12).join(' · ')}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                </button>
              ))}

              <p className="text-xs text-slate-400 font-semibold">
                ℹ️ Solo busca entre las medicinas registradas en la app. Ante cualquier duda, confirma con el médico.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssistantModal;
