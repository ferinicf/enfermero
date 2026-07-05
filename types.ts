export type View = 'today' | 'medicines' | 'scan' | 'history';

export type DoseStatus = 'pending' | 'taken' | 'skipped';

export interface Medicine {
  id: string;
  name: string;              // "Amoxicilina 500 mg"
  dose: string;              // "1 tableta"
  presentation: string;      // tableta, cápsula, jarabe, inyección...
  times: string[];           // horarios en formato 24h "HH:MM" (vacío si asNeeded)
  asNeeded?: boolean;        // true = solo cuando se necesite (por síntomas), sin horario fijo
  startDate: string;         // YYYY-MM-DD (fecha local)
  durationDays: number;      // 0 = uso continuo / crónico
  instructions: string;      // "tomar con alimentos", "en ayunas"...
  purpose: string;           // para qué sirve (frase corta)
  description: string;       // explicación de qué es la medicina
  sideEffects: string;
  warnings: string;
  doctor: string;
  color: string;             // color asignado para la UI
  stock: number | null;      // pastillas restantes; null = sin control de inventario
  prescriptionPhoto?: string; // miniatura base64 de la receta
  addedBy?: string;          // quién la registró (modo familiar)
  createdAt: string;
}

export interface DoseLog {
  id: string;
  medicineId: string;
  date: string;      // YYYY-MM-DD del día programado
  time: string;      // hora programada "HH:MM" (en medicinas asNeeded: hora en que se dio)
  status: 'taken' | 'skipped';
  takenAt: string;   // timestamp ISO de cuándo se dio realmente (editable)
  by?: string;       // quién lo registró (modo familiar)
}

export interface FamilyEvent {
  id: string;
  at: string;        // timestamp ISO
  kind: 'taken' | 'skipped' | 'med-added';
  text: string;
}

export interface ScheduledDose {
  medicine: Medicine;
  date: string;
  time: string;
  status: DoseStatus;
  log?: DoseLog;
}

/** Medicina tal como la extrae Gemini de la foto de la receta */
export interface ExtractedMedicine {
  name: string;
  dose: string;
  presentation: string;
  suggestedTimes: string[];
  frequencyHours: number;
  durationDays: number;
  instructions: string;
  purpose: string;
  description: string;
  sideEffects: string;
  warnings: string;
}

export interface ExtractedPrescription {
  medicines: ExtractedMedicine[];
  doctor: string;
  patient: string;
  prescriptionDate: string;
  notes: string;
}

export interface MedicineInfo {
  purpose: string;
  description: string;
  sideEffects: string;
  warnings: string;
}

export interface Interaction {
  medicines: string[];       // medicamentos involucrados
  severity: 'leve' | 'moderada' | 'importante';
  description: string;       // qué puede pasar
  advice: string;            // qué hacer / comentar con el médico
}

export interface InteractionReport {
  summary: string;
  riskLevel: 'bajo' | 'medio' | 'alto';
  interactions: Interaction[];
  generalAdvice: string;
}

export interface CachedInteractionReport {
  key: string;               // nombres de medicinas activas, ordenados
  checkedAt: string;         // ISO timestamp
  report: InteractionReport;
}
