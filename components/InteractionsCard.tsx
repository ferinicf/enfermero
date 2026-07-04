import React, { useState } from 'react';
import { Medicine, CachedInteractionReport } from '../types';
import { checkInteractions, hasApiKey } from '../services/geminiService';
import { loadInteractionReport, saveInteractionReport } from '../storage';
import { ShieldCheck, ShieldAlert, Loader2, RefreshCcw, ChevronDown, ChevronUp } from 'lucide-react';

/** Clave estable del conjunto de medicinas activas, para saber si la revisión sigue vigente */
const reportKey = (meds: Medicine[]): string =>
  meds.map(m => m.name.trim().toLowerCase()).sort().join(' | ');

const severityStyle: Record<string, string> = {
  leve: 'bg-slate-100 text-slate-600',
  moderada: 'bg-amber-100 text-amber-700',
  importante: 'bg-red-100 text-medi-red',
};

const riskStyle: Record<string, { box: string; icon: React.ReactNode; label: string }> = {
  bajo: {
    box: 'bg-green-50 border-green-200',
    icon: <ShieldCheck className="w-6 h-6 text-green-600" />,
    label: 'Riesgo bajo',
  },
  medio: {
    box: 'bg-amber-50 border-amber-200',
    icon: <ShieldAlert className="w-6 h-6 text-amber-600" />,
    label: 'Requiere atención',
  },
  alto: {
    box: 'bg-red-50 border-red-200',
    icon: <ShieldAlert className="w-6 h-6 text-medi-red" />,
    label: 'Consultar al médico',
  },
};

const InteractionsCard: React.FC<{ activeMedicines: Medicine[] }> = ({ activeMedicines }) => {
  const [cached, setCached] = useState<CachedInteractionReport | null>(() => loadInteractionReport());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  if (!hasApiKey() || activeMedicines.length < 2) return null;

  const key = reportKey(activeMedicines);
  const current = cached && cached.key === key ? cached : null;
  const outdated = cached !== null && cached.key !== key;

  const runCheck = async () => {
    setLoading(true);
    setError('');
    try {
      const report = await checkInteractions(activeMedicines.map(m => ({ name: m.name, dose: m.dose })));
      const newCached: CachedInteractionReport = { key, checkedAt: new Date().toISOString(), report };
      saveInteractionReport(newCached);
      setCached(newCached);
      setExpanded(true);
    } catch (e) {
      console.error(e);
      setError('No se pudo hacer la revisión. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!current) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-dashed border-medi-mint">
        <p className="font-extrabold text-slate-700 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-medi-teal" />
          ¿Se pueden combinar estas medicinas?
        </p>
        <p className="text-sm font-semibold text-slate-500 mt-1">
          {outdated
            ? 'La lista de medicinas cambió: conviene revisar de nuevo las interacciones.'
            : `Revisa con IA si los ${activeMedicines.length} medicamentos activos tienen interacciones conocidas entre sí.`}
        </p>
        <button
          onClick={runCheck}
          disabled={loading}
          className="mt-3 w-full bg-medi-teal text-white font-extrabold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-transform"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
          {loading ? 'Analizando combinación...' : 'Revisar interacciones'}
        </button>
        {error && <p className="text-medi-red font-bold text-sm mt-2">{error}</p>}
      </div>
    );
  }

  const { report } = current;
  const style = riskStyle[report.riskLevel] ?? riskStyle.medio;

  return (
    <div className={`rounded-2xl p-4 shadow-sm border-2 ${style.box}`}>
      <button className="w-full text-left" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3">
          {style.icon}
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-slate-800">{style.label} · combinación de medicinas</p>
            <p className="text-sm font-semibold text-slate-600">{report.summary}</p>
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {report.interactions.length === 0 ? (
            <p className="text-sm font-semibold text-slate-600 bg-white/70 rounded-xl p-3">
              No se encontraron interacciones conocidas entre estos medicamentos.
            </p>
          ) : (
            report.interactions.map((inter, i) => (
              <div key={i} className="bg-white/80 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md ${severityStyle[inter.severity] ?? severityStyle.leve}`}>
                    {inter.severity}
                  </span>
                  <span className="font-bold text-slate-700 text-sm">{inter.medicines.join(' + ')}</span>
                </div>
                <p className="text-sm font-medium text-slate-600">{inter.description}</p>
                <p className="text-sm font-bold text-medi-dark">👉 {inter.advice}</p>
              </div>
            ))
          )}

          {report.generalAdvice && (
            <p className="text-sm font-semibold text-slate-600 bg-white/70 rounded-xl p-3">💡 {report.generalAdvice}</p>
          )}

          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-slate-400">
              Revisado el {new Date(current.checkedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · generado con IA, confirma con el médico o farmacéutico.
            </p>
            <button
              onClick={runCheck}
              disabled={loading}
              className="text-medi-teal font-bold text-xs flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/60 shrink-0 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />} Revisar de nuevo
            </button>
          </div>
          {error && <p className="text-medi-red font-bold text-sm">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default InteractionsCard;
