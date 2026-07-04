import { Medicine, DoseLog, ScheduledDose } from './types';

export const MED_COLORS = [
  '#0D9488', '#7C3AED', '#DB2777', '#EA580C',
  '#2563EB', '#65A30D', '#0891B2', '#C026D3',
];

export const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

/** Fecha local en formato YYYY-MM-DD (sin problemas de zona horaria de toISOString) */
export const localISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const todayStr = (): string => localISODate(new Date());

export const parseLocalDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (dateStr: string, n: number): string => {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + n);
  return localISODate(d);
};

/** Último día del tratamiento, o null si es de uso continuo */
export const endDateOf = (med: Medicine): string | null =>
  med.durationDays > 0 ? addDays(med.startDate, med.durationDays - 1) : null;

export const isActiveOn = (med: Medicine, dateStr: string): boolean => {
  if (dateStr < med.startDate) return false;
  const end = endDateOf(med);
  return !end || dateStr <= end;
};

/** Día número X del tratamiento (1-indexado) */
export const treatmentDay = (med: Medicine, dateStr: string): number =>
  Math.round(
    (parseLocalDate(dateStr).getTime() - parseLocalDate(med.startDate).getTime()) / 86400000
  ) + 1;

export const daysRemaining = (med: Medicine, dateStr: string): number | null => {
  const end = endDateOf(med);
  if (!end) return null;
  return Math.max(
    0,
    Math.round((parseLocalDate(end).getTime() - parseLocalDate(dateStr).getTime()) / 86400000)
  );
};

export const formatTime12 = (t: string): string => {
  const [h, m] = t.split(':').map(Number);
  const suffix = h < 12 ? 'a.m.' : 'p.m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
};

export const formatDateLong = (dateStr: string): string => {
  const s = parseLocalDate(dateStr).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const formatDateShort = (dateStr: string): string =>
  parseLocalDate(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

export const nowHM = (): string => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Minutos desde ahora hasta la hora dada de hoy (negativo si ya pasó) */
export const minutesUntil = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  return h * 60 + m - (now.getHours() * 60 + now.getMinutes());
};

export const humanDelta = (minutes: number): string => {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const txt = h > 0 ? `${h} h ${m > 0 ? `${m} min` : ''}`.trim() : `${m} min`;
  return minutes >= 0 ? `en ${txt}` : `hace ${txt}`;
};

export const doseKey = (medicineId: string, date: string, time: string): string =>
  `${medicineId}|${date}|${time}`;

/** Genera la agenda de tomas de un día, ordenada por hora */
export const dosesForDate = (
  medicines: Medicine[],
  logs: DoseLog[],
  dateStr: string
): ScheduledDose[] => {
  const logMap = new Map<string, DoseLog>();
  logs.forEach(l => logMap.set(doseKey(l.medicineId, l.date, l.time), l));

  const doses: ScheduledDose[] = [];
  medicines.forEach(med => {
    if (!isActiveOn(med, dateStr)) return;
    med.times.forEach(time => {
      const log = logMap.get(doseKey(med.id, dateStr, time));
      doses.push({
        medicine: med,
        date: dateStr,
        time,
        status: log ? log.status : 'pending',
        log,
      });
    });
  });
  return doses.sort((a, b) => a.time.localeCompare(b.time) || a.medicine.name.localeCompare(b.medicine.name));
};

export interface AdherenceStats {
  expected: number;
  taken: number;
  skipped: number;
  missed: number;
  percent: number; // 0-100 sobre las tomas ya vencidas
}

/** Adherencia de los últimos `days` días (incluye hoy, solo tomas ya vencidas) */
export const adherenceStats = (
  medicines: Medicine[],
  logs: DoseLog[],
  days: number
): AdherenceStats => {
  const today = todayStr();
  const now = nowHM();
  let expected = 0, taken = 0, skipped = 0;

  for (let i = 0; i < days; i++) {
    const date = addDays(today, -i);
    dosesForDate(medicines, logs, date).forEach(dose => {
      // solo cuenta tomas cuya hora ya pasó
      if (date === today && dose.time > now && dose.status === 'pending') return;
      expected++;
      if (dose.status === 'taken') taken++;
      else if (dose.status === 'skipped') skipped++;
    });
  }
  const missed = expected - taken - skipped;
  return {
    expected,
    taken,
    skipped,
    missed,
    percent: expected > 0 ? Math.round((taken / expected) * 100) : 100,
  };
};

/** Genera horarios sugeridos a partir de tomas por día (patrones típicos) */
export const defaultTimesFor = (timesPerDay: number): string[] => {
  switch (timesPerDay) {
    case 1: return ['08:00'];
    case 2: return ['08:00', '20:00'];
    case 3: return ['08:00', '14:00', '20:00'];
    case 4: return ['06:00', '12:00', '18:00', '00:00'];
    default: {
      const step = Math.floor(24 / Math.max(1, timesPerDay));
      return Array.from({ length: timesPerDay }, (_, i) =>
        `${String((8 + i * step) % 24).padStart(2, '0')}:00`
      );
    }
  }
};

/** Comprime una imagen a JPEG con lado máximo dado; devuelve dataURL */
export const compressImage = (dataUrl: string, maxSide: number, quality: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = dataUrl;
  });
