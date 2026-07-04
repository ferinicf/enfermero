import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Medicine, DoseLog } from './types';
import {
  loadMedicines, saveMedicines, loadLogs, saveLogs,
  loadProfileName, saveProfileName, loadAlertsSeenAt, saveAlertsSeenAt,
} from './storage';
import { uid, todayStr, nowHM, minutesUntil, doseKey, dosesForDate, MED_COLORS, formatTime12 } from './utils';
import {
  syncEnabled, fetchRemote, pushMedicine, removeMedicine as removeRemoteMedicine,
  pushLog, removeLog as removeRemoteLog, pushAll, subscribeToChanges,
} from './services/syncService';
import Header, { SyncStatus } from './components/Header';
import TodayView from './components/TodayView';
import MedicinesView from './components/MedicinesView';
import PrescriptionScanner from './components/PrescriptionScanner';
import HistoryView from './components/HistoryView';
import MedicineForm from './components/MedicineForm';
import ProfileSetup from './components/ProfileSetup';
import AlertsPanel, { buildFamilyEvents } from './components/AlertsPanel';
import SettingsModal from './components/SettingsModal';
import { CalendarClock, Pill, Camera, ClipboardList, Download, X } from 'lucide-react';

const APP_ICON = `${import.meta.env.BASE_URL}icon-192.png`;

/** Muestra una notificación del sistema (usa el service worker si está disponible) */
const systemNotify = async (title: string, body: string, tag: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, tag, icon: APP_ICON });
      return;
    }
  } catch {
    /* cae al fallback */
  }
  try {
    new Notification(title, { body, tag, icon: APP_ICON });
  } catch {
    /* algunos navegadores móviles no permiten Notification directa */
  }
};

interface Toast {
  id: string;
  text: string;
}

const App: React.FC = () => {
  const [view, setView] = useState<View>('today');
  const [medicines, setMedicines] = useState<Medicine[]>(() => loadMedicines());
  const [logs, setLogs] = useState<DoseLog[]>(() => loadLogs());
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncEnabled ? 'connecting' : 'off');
  const [profileName, setProfileName] = useState<string>(() => loadProfileName());
  const [editingProfile, setEditingProfile] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertsSeenAt, setAlertsSeenAt] = useState<string>(() => loadAlertsSeenAt());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const notifiedRef = useRef<Set<string>>(new Set());
  const knownLogIdsRef = useRef<Set<string>>(new Set(loadLogs().map(l => l.id)));
  const profileRef = useRef(profileName);
  profileRef.current = profileName;

  useEffect(() => { saveMedicines(medicines); }, [medicines]);
  useEffect(() => { saveLogs(logs); }, [logs]);

  const showToast = useCallback((text: string) => {
    const toast = { id: uid(), text };
    setToasts(prev => [...prev.slice(-2), toast]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), 7000);
  }, []);

  // Botón "Instalar app" (Android/escritorio)
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Modo familiar: carga inicial desde Supabase y suscripción a cambios de otros teléfonos
  useEffect(() => {
    if (!syncEnabled) return;

    const applyRemote = (remoteMeds: Medicine[], remoteLogs: DoseLog[], announce: boolean) => {
      if (announce) {
        // Avisa dentro de la app de las tomas nuevas registradas por otros
        const medName = new Map(remoteMeds.map(m => [m.id, m.name]));
        remoteLogs.forEach(l => {
          if (knownLogIdsRef.current.has(l.id)) return;
          if (l.by && l.by === profileRef.current) return;
          const name = medName.get(l.medicineId) || 'una medicina';
          const text = l.status === 'taken'
            ? `${l.by || 'Alguien'} registró: ${name} tomada (${formatTime12(l.time)})`
            : `${l.by || 'Alguien'} omitió: ${name} (${formatTime12(l.time)})`;
          showToast(text);
          if (document.hidden) systemNotify('👨‍👩‍👧 MediHorario', text, `family-${l.id}`);
        });
      }
      knownLogIdsRef.current = new Set(remoteLogs.map(l => l.id));
      setMedicines(remoteMeds);
      setLogs(remoteLogs);
    };

    const refresh = async (announce: boolean) => {
      try {
        const remote = await fetchRemote();
        if (!remote) return;
        applyRemote(remote.medicines, remote.logs, announce);
        setSyncStatus('online');
      } catch (e) {
        console.error('Sync: error consultando la nube', e);
        setSyncStatus('error');
      }
    };

    (async () => {
      try {
        const remote = await fetchRemote();
        if (!remote) return;
        if (remote.medicines.length === 0 && remote.logs.length === 0) {
          // Nube vacía: sube lo que ya había en este teléfono
          await pushAll(loadMedicines(), loadLogs());
        } else {
          applyRemote(remote.medicines, remote.logs, false);
        }
        setSyncStatus('online');
      } catch (e) {
        console.error('Sync: error en la carga inicial', e);
        setSyncStatus('error');
      }
    })();

    return subscribeToChanges(() => refresh(true));
  }, [showToast]);

  // Pide permiso de notificaciones al iniciar (si hay medicinas registradas)
  useEffect(() => {
    if (medicines.length > 0 && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [medicines.length]);

  // Revisa cada 30 s si hay una toma que avisar (dentro de los últimos 5 minutos)
  useEffect(() => {
    const check = () => {
      const today = todayStr();
      dosesForDate(medicines, logs, today).forEach(dose => {
        if (dose.status !== 'pending') return;
        const mins = minutesUntil(dose.time);
        if (mins > 0 || mins < -5) return;
        const key = doseKey(dose.medicine.id, today, dose.time);
        if (notifiedRef.current.has(key)) return;
        notifiedRef.current.add(key);
        systemNotify(
          '💊 Hora de la medicina',
          `${dose.medicine.name} — ${dose.medicine.dose} (${formatTime12(dose.time)})${dose.medicine.instructions ? `\n${dose.medicine.instructions}` : ''}`,
          key
        );
      });
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [medicines, logs]);

  const addMedicines = useCallback((newMeds: Omit<Medicine, 'id' | 'color' | 'createdAt'>[]) => {
    setMedicines(prev => {
      const additions = newMeds.map((m, i) => ({
        ...m,
        id: uid(),
        color: MED_COLORS[(prev.length + i) % MED_COLORS.length],
        addedBy: profileRef.current || undefined,
        createdAt: new Date().toISOString(),
      }));
      additions.forEach(pushMedicine);
      return [...prev, ...additions];
    });
  }, []);

  const updateMedicine = useCallback((updated: Medicine) => {
    setMedicines(prev => prev.map(m => (m.id === updated.id ? updated : m)));
    pushMedicine(updated);
  }, []);

  const deleteMedicine = useCallback((id: string) => {
    setMedicines(prev => prev.filter(m => m.id !== id));
    setLogs(prev => prev.filter(l => l.medicineId !== id));
    removeRemoteMedicine(id);
  }, []);

  const markDose = useCallback((medicineId: string, date: string, time: string, status: 'taken' | 'skipped') => {
    const log: DoseLog = {
      id: uid(), medicineId, date, time, status,
      takenAt: new Date().toISOString(),
      by: profileRef.current || undefined,
    };
    knownLogIdsRef.current.add(log.id);
    setLogs(prev => {
      const replaced = prev.find(l => l.medicineId === medicineId && l.date === date && l.time === time);
      if (replaced) removeRemoteLog(replaced.id);
      return [...prev.filter(l => !(l.medicineId === medicineId && l.date === date && l.time === time)), log];
    });
    pushLog(log);
    if (status === 'taken') {
      setMedicines(prev => prev.map(m => {
        if (m.id === medicineId && m.stock !== null && m.stock > 0) {
          const updated = { ...m, stock: m.stock - 1 };
          pushMedicine(updated);
          return updated;
        }
        return m;
      }));
    }
  }, []);

  const undoDose = useCallback((medicineId: string, date: string, time: string) => {
    let wasTaken = false;
    setLogs(prev => {
      const log = prev.find(l => l.medicineId === medicineId && l.date === date && l.time === time);
      wasTaken = log?.status === 'taken';
      if (log) removeRemoteLog(log.id);
      return prev.filter(l => !(l.medicineId === medicineId && l.date === date && l.time === time));
    });
    if (wasTaken) {
      setMedicines(prev => prev.map(m => {
        if (m.id === medicineId && m.stock !== null) {
          const updated = { ...m, stock: m.stock + 1 };
          pushMedicine(updated);
          return updated;
        }
        return m;
      }));
    }
  }, []);

  const familyEvents = useMemo(() => buildFamilyEvents(medicines, logs), [medicines, logs]);
  const unreadCount = useMemo(
    () => familyEvents.filter(ev => !alertsSeenAt || ev.at > alertsSeenAt).length,
    [familyEvents, alertsSeenAt]
  );

  const openAlerts = () => setAlertsOpen(true);
  const closeAlerts = () => {
    setAlertsOpen(false);
    const now = new Date().toISOString();
    setAlertsSeenAt(now);
    saveAlertsSeenAt(now);
  };

  const navItems: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: 'today', label: 'Hoy', icon: <CalendarClock className="w-7 h-7" /> },
    { key: 'medicines', label: 'Medicinas', icon: <Pill className="w-7 h-7" /> },
    { key: 'scan', label: 'Receta', icon: <Camera className="w-7 h-7" /> },
    { key: 'history', label: 'Historial', icon: <ClipboardList className="w-7 h-7" /> },
  ];

  const pendingToday = dosesForDate(medicines, logs, todayStr())
    .filter(d => d.status === 'pending' && d.time <= nowHM()).length;

  return (
    <div className="min-h-screen flex flex-col max-w-3xl mx-auto bg-slate-50">
      <Header
        syncStatus={syncStatus}
        profileName={profileName}
        unreadCount={unreadCount}
        onOpenAlerts={openAlerts}
        onEditProfile={() => setEditingProfile(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Avisos en tiempo real de otros miembros de la familia */}
      {toasts.length > 0 && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-2rem)] max-w-md space-y-2 no-print">
          {toasts.map(t => (
            <div key={t.id} className="bg-medi-dark text-white rounded-2xl px-4 py-3 shadow-2xl flex items-start gap-2 animate-[fadeIn_.2s_ease-out]">
              <span className="text-lg leading-none">👨‍👩‍👧</span>
              <p className="font-bold text-sm flex-1">{t.text}</p>
              <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="opacity-70">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <main className="flex-1 p-4 pb-32">
        {view === 'today' && (
          <TodayView
            medicines={medicines}
            logs={logs}
            onMark={markDose}
            onUndo={undoDose}
            onGoScan={() => setView('scan')}
          />
        )}

        {view === 'medicines' && (
          <MedicinesView
            medicines={medicines}
            onEdit={med => setEditingMedicine(med)}
            onDelete={id => {
              if (window.confirm('¿Eliminar esta medicina y su historial? Esta acción no se puede deshacer.')) {
                deleteMedicine(id);
              }
            }}
            onUpdate={updateMedicine}
            onAddManual={() => setShowManualForm(true)}
            onGoScan={() => setView('scan')}
          />
        )}

        {view === 'scan' && (
          <PrescriptionScanner
            onSave={meds => {
              addMedicines(meds);
              setView('medicines');
            }}
            onAddManual={() => setShowManualForm(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}

        {view === 'history' && <HistoryView medicines={medicines} logs={logs} />}
      </main>

      {(showManualForm || editingMedicine) && (
        <MedicineForm
          initial={editingMedicine}
          onCancel={() => { setShowManualForm(false); setEditingMedicine(null); }}
          onSave={med => {
            if (editingMedicine) {
              updateMedicine({ ...editingMedicine, ...med });
            } else {
              addMedicines([med]);
              setView('medicines');
            }
            setShowManualForm(false);
            setEditingMedicine(null);
          }}
        />
      )}

      {(!profileName || editingProfile) && (
        <ProfileSetup
          initialName={profileName}
          onSave={name => {
            setProfileName(name);
            saveProfileName(name);
            setEditingProfile(false);
          }}
          onCancel={profileName ? () => setEditingProfile(false) : undefined}
        />
      )}

      {alertsOpen && (
        <AlertsPanel events={familyEvents} seenAt={alertsSeenAt} onClose={closeAlerts} />
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      {/* Banner para instalar la app en el teléfono */}
      {installEvent && !installDismissed && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md no-print">
          <div className="bg-medi-dark text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3">
            <img src={APP_ICON} alt="" className="w-10 h-10 rounded-xl" />
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-sm">Instala MediHorario</p>
              <p className="text-xs font-semibold opacity-80">Tenla como app en este teléfono</p>
            </div>
            <button
              onClick={async () => {
                installEvent.prompt();
                await installEvent.userChoice;
                setInstallEvent(null);
              }}
              className="bg-medi-mid text-white font-extrabold text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 active:scale-95"
            >
              <Download className="w-4 h-4" /> Instalar
            </button>
            <button onClick={() => setInstallDismissed(true)} className="opacity-70 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-40 no-print">
        <div className="max-w-3xl mx-auto grid grid-cols-4">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => { setView(item.key); window.scrollTo({ top: 0 }); }}
              className={`relative flex flex-col items-center gap-1 py-3 transition-colors ${
                view === item.key ? 'text-medi-teal' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {item.icon}
              <span className={`text-xs ${view === item.key ? 'font-extrabold' : 'font-semibold'}`}>{item.label}</span>
              {item.key === 'today' && pendingToday > 0 && (
                <span className="absolute top-1.5 right-[calc(50%-26px)] bg-medi-red text-white text-[11px] font-extrabold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
                  {pendingToday}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default App;
