import React, { useState } from 'react';
import { Medicine } from '../types';
import {
  todayStr, formatTime12, formatDateShort, endDateOf, isActiveOn,
  treatmentDay, daysRemaining,
} from '../utils';
import { fetchMedicineInfo, hasApiKey } from '../services/geminiService';
import InteractionsCard from './InteractionsCard';
import {
  Camera, PlusCircle, Pencil, Trash2, X, Clock, CalendarDays,
  Stethoscope, Package, Sparkles, Loader2, AlertTriangle, Utensils, Info,
} from 'lucide-react';

interface Props {
  medicines: Medicine[];
  onEdit: (med: Medicine) => void;
  onDelete: (id: string) => void;
  onUpdate: (med: Medicine) => void;
  onAddManual: () => void;
  onGoScan: () => void;
}

const InfoSection: React.FC<{ title: string; text: string; icon: React.ReactNode; tone?: 'normal' | 'warn' }> = ({ title, text, icon, tone = 'normal' }) => {
  if (!text) return null;
  return (
    <div className={`rounded-xl p-4 ${tone === 'warn' ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
      <p className={`font-extrabold text-sm uppercase tracking-wide mb-1 flex items-center gap-2 ${tone === 'warn' ? 'text-amber-700' : 'text-medi-teal'}`}>
        {icon} {title}
      </p>
      <p className="text-slate-700 font-medium whitespace-pre-line">{text}</p>
    </div>
  );
};

const MedicineDetail: React.FC<{
  medicine: Medicine;
  onClose: () => void;
  onEdit: () => void;
  onUpdate: (med: Medicine) => void;
}> = ({ medicine, onClose, onEdit, onUpdate }) => {
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [infoError, setInfoError] = useState('');
  const today = todayStr();
  const end = endDateOf(medicine);
  const active = isActiveOn(medicine, today);
  const remaining = daysRemaining(medicine, today);

  const loadInfo = async () => {
    setLoadingInfo(true);
    setInfoError('');
    try {
      const info = await fetchMedicineInfo(medicine.name, medicine.dose);
      onUpdate({ ...medicine, ...info });
    } catch (e) {
      console.error(e);
      setInfoError('No se pudo obtener la información. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setLoadingInfo(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 text-white p-5 flex items-start justify-between rounded-t-3xl" style={{ backgroundColor: medicine.color }}>
          <div>
            <h3 className="text-2xl font-extrabold leading-tight">{medicine.name}</h3>
            <p className="font-bold opacity-90">{medicine.dose}{medicine.presentation ? ` · ${medicine.presentation}` : ''}</p>
          </div>
          <button onClick={onClose} className="bg-white/20 rounded-full p-2 shrink-0"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {medicine.purpose && (
            <p className="text-lg font-bold text-slate-800">{medicine.purpose}</p>
          )}

          {/* Horario y duración */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-medi-light rounded-xl p-3">
              <p className="text-medi-teal font-extrabold text-xs uppercase flex items-center gap-1 mb-1"><Clock className="w-4 h-4" /> Horarios</p>
              {medicine.asNeeded ? (
                <p className="font-extrabold text-medi-dark">Solo si se necesita</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {medicine.times.map(t => (
                    <span key={t} className="bg-white text-medi-dark font-extrabold text-sm px-2.5 py-1 rounded-lg shadow-sm">
                      {formatTime12(t)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-medi-light rounded-xl p-3">
              <p className="text-medi-teal font-extrabold text-xs uppercase flex items-center gap-1 mb-1"><CalendarDays className="w-4 h-4" /> Duración</p>
              {medicine.durationDays > 0 ? (
                <div>
                  <p className="font-extrabold text-medi-dark">{medicine.durationDays} días</p>
                  <p className="text-sm font-semibold text-slate-600">
                    {formatDateShort(medicine.startDate)} — {end ? formatDateShort(end) : ''}
                  </p>
                  {active && remaining !== null && (
                    <p className="text-sm font-bold text-medi-teal mt-1">
                      Día {treatmentDay(medicine, today)} · {remaining === 0 ? 'último día' : `faltan ${remaining} días`}
                    </p>
                  )}
                  {!active && today > (end || '') && (
                    <p className="text-sm font-bold text-slate-400 mt-1">Tratamiento terminado</p>
                  )}
                </div>
              ) : (
                <p className="font-extrabold text-medi-dark">Uso continuo</p>
              )}
            </div>
          </div>

          {medicine.durationDays > 0 && active && (
            <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (treatmentDay(medicine, today) / medicine.durationDays) * 100)}%`,
                  backgroundColor: medicine.color,
                }}
              />
            </div>
          )}

          {medicine.instructions && (
            <InfoSection title="Indicaciones" text={medicine.instructions} icon={<Utensils className="w-4 h-4" />} />
          )}

          <InfoSection title="¿Qué es esta medicina?" text={medicine.description} icon={<Info className="w-4 h-4" />} />
          <InfoSection title="Efectos secundarios comunes" text={medicine.sideEffects} icon={<AlertTriangle className="w-4 h-4" />} />
          <InfoSection title="Precauciones" text={medicine.warnings} icon={<AlertTriangle className="w-4 h-4" />} tone="warn" />

          {(!medicine.description || !medicine.sideEffects) && hasApiKey() && (
            <button
              onClick={loadInfo}
              disabled={loadingInfo}
              className="w-full bg-medi-mint text-medi-dark font-extrabold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loadingInfo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {loadingInfo ? 'Consultando...' : 'Completar explicación con IA'}
            </button>
          )}
          {infoError && <p className="text-medi-red font-bold text-sm">{infoError}</p>}

          {(medicine.description || medicine.sideEffects) && (
            <p className="text-xs text-slate-400 font-semibold">
              ℹ️ Esta explicación fue generada con inteligencia artificial como orientación general.
              Siempre confirma con el médico o farmacéutico.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {medicine.doctor && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-400 font-extrabold text-xs uppercase flex items-center gap-1 mb-0.5"><Stethoscope className="w-4 h-4" /> Recetó</p>
                <p className="font-bold text-slate-700">{medicine.doctor}</p>
              </div>
            )}
            {medicine.stock !== null && (() => {
              const low = medicine.stock <= Math.max(1, medicine.times.length) * 2;
              return (
                <div className={`rounded-xl p-3 ${low ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <p className="text-slate-400 font-extrabold text-xs uppercase flex items-center gap-1 mb-0.5"><Package className="w-4 h-4" /> Quedan</p>
                  <p className={`font-extrabold ${low ? 'text-medi-red' : 'text-slate-700'}`}>
                    {medicine.stock} {medicine.presentation || 'unidades'}{low ? ' — ¡compra más!' : ''}
                  </p>
                </div>
              );
            })()}
          </div>

          {medicine.prescriptionPhoto && (
            <div>
              <p className="text-slate-400 font-extrabold text-xs uppercase mb-2">Foto de la receta</p>
              <img src={medicine.prescriptionPhoto} alt="Receta médica" className="rounded-xl w-full border border-slate-200" />
            </div>
          )}

          <button
            onClick={onEdit}
            className="w-full bg-medi-teal text-white font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Pencil className="w-5 h-5" /> Editar medicina
          </button>
        </div>
      </div>
    </div>
  );
};

const MedicinesView: React.FC<Props> = ({ medicines, onEdit, onDelete, onUpdate, onAddManual, onGoScan }) => {
  const [detailId, setDetailId] = useState<string | null>(null);
  const today = todayStr();
  const detail = medicines.find(m => m.id === detailId) || null;

  const activeMeds = medicines.filter(m => isActiveOn(m, today));
  const finishedMeds = medicines.filter(m => !isActiveOn(m, today));

  const MedCard: React.FC<{ med: Medicine; finished?: boolean }> = ({ med, finished }) => {
    const remaining = daysRemaining(med, today);
    const lowStock = med.stock !== null && med.stock <= Math.max(1, med.times.length) * 2;
    return (
      <button
        onClick={() => setDetailId(med.id)}
        className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border-l-8 active:scale-[0.98] transition-transform ${finished ? 'opacity-60' : ''}`}
        style={{ borderLeftColor: med.color }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-extrabold text-slate-800 text-lg leading-tight">{med.name}</p>
            {med.purpose && <p className="text-slate-500 font-semibold text-sm mt-0.5">{med.purpose}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {med.asNeeded ? (
                <span className="bg-amber-50 text-amber-700 font-bold text-xs px-2 py-1 rounded-md">
                  Solo si se necesita
                </span>
              ) : (
                med.times.map(t => (
                  <span key={t} className="bg-medi-light text-medi-dark font-bold text-xs px-2 py-1 rounded-md">
                    {formatTime12(t)}
                  </span>
                ))
              )}
            </div>
            <p className="text-xs font-bold text-slate-400 mt-2">
              {finished
                ? 'Tratamiento terminado'
                : med.asNeeded && med.durationDays === 0
                  ? 'Sin horario fijo'
                  : med.durationDays > 0
                    ? `Día ${treatmentDay(med, today)} de ${med.durationDays}${remaining === 0 ? ' · último día' : ''}`
                    : 'Uso continuo'}
              {lowStock && !finished && <span className="text-medi-red"> · ⚠ quedan {med.stock}</span>}
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <span
              onClick={e => { e.stopPropagation(); onEdit(med); }}
              className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
            </span>
            <span
              onClick={e => { e.stopPropagation(); onDelete(med.id); }}
              className="p-2 rounded-lg bg-red-50 text-medi-red hover:bg-red-100 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </span>
          </div>
        </div>
        {med.durationDays > 0 && !finished && (
          <div className="bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (treatmentDay(med, today) / med.durationDays) * 100)}%`,
                backgroundColor: med.color,
              }}
            />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold text-slate-800">Medicinas</h2>
        <div className="flex gap-2">
          <button
            onClick={onGoScan}
            className="bg-medi-teal text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 active:scale-95"
          >
            <Camera className="w-4 h-4" /> Receta
          </button>
          <button
            onClick={onAddManual}
            className="bg-medi-mint text-medi-dark font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" /> Manual
          </button>
        </div>
      </div>

      {medicines.length === 0 && (
        <div className="text-center py-12 px-6">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-slate-500 font-semibold">
            Todavía no hay medicinas registradas.<br />Escanea la receta del médico o agrégalas a mano.
          </p>
        </div>
      )}

      <InteractionsCard activeMedicines={activeMeds} />

      {activeMeds.length > 0 && (
        <div className="space-y-3">
          {activeMeds.map(med => <MedCard key={med.id} med={med} />)}
        </div>
      )}

      {finishedMeds.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-extrabold text-slate-400 uppercase text-sm tracking-wide pt-2">Tratamientos terminados</h3>
          {finishedMeds.map(med => <MedCard key={med.id} med={med} finished />)}
        </div>
      )}

      {detail && (
        <MedicineDetail
          medicine={detail}
          onClose={() => setDetailId(null)}
          onEdit={() => { setDetailId(null); onEdit(detail); }}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

export default MedicinesView;
