import { GoogleGenAI, Type } from '@google/genai';
import { ExtractedPrescription, MedicineInfo, InteractionReport } from '../types';
import { getConfig } from '../config';

export const hasApiKey = (): boolean => Boolean(getConfig().geminiKey);

// La clave puede cambiar desde Ajustes, por eso el cliente se crea al momento
const getAI = () => new GoogleGenAI({ apiKey: getConfig().geminiKey });

const MODEL = 'gemini-2.5-flash';

const medicineSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'Nombre del medicamento con su concentración, ej. "Amoxicilina 500 mg"' },
    dose: { type: Type.STRING, description: 'Cantidad por toma, ej. "1 tableta" o "10 ml"' },
    presentation: { type: Type.STRING, description: 'tableta, cápsula, jarabe, gotas, inyección, etc.' },
    suggestedTimes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Horarios de toma en formato 24h HH:MM según la frecuencia indicada, ej. ["08:00","16:00","00:00"] para cada 8 horas',
    },
    frequencyHours: { type: Type.INTEGER, description: 'Cada cuántas horas se toma (8 para "cada 8 horas"). 24 si es una vez al día. 0 si no aplica.' },
    durationDays: { type: Type.INTEGER, description: 'Duración del tratamiento en días. 0 si es de uso continuo/permanente o no se indica.' },
    instructions: { type: Type.STRING, description: 'Indicaciones especiales: con alimentos, en ayunas, antes de dormir, etc. Vacío si no hay.' },
    purpose: { type: Type.STRING, description: 'Para qué sirve este medicamento, en una frase corta y sencilla en español.' },
    description: { type: Type.STRING, description: 'Explicación sencilla (2-4 frases) de qué es este medicamento y cómo actúa, en español claro para una persona mayor.' },
    sideEffects: { type: Type.STRING, description: 'Efectos secundarios comunes, en lenguaje sencillo.' },
    warnings: { type: Type.STRING, description: 'Precauciones importantes (interacciones, alcohol, manejo, etc.), en lenguaje sencillo.' },
  },
  required: ['name', 'dose', 'presentation', 'suggestedTimes', 'frequencyHours', 'durationDays', 'instructions', 'purpose', 'description', 'sideEffects', 'warnings'],
};

const prescriptionSchema = {
  type: Type.OBJECT,
  properties: {
    medicines: { type: Type.ARRAY, items: medicineSchema },
    doctor: { type: Type.STRING, description: 'Nombre del médico si aparece, o vacío' },
    patient: { type: Type.STRING, description: 'Nombre del paciente si aparece, o vacío' },
    prescriptionDate: { type: Type.STRING, description: 'Fecha de la receta en formato YYYY-MM-DD si aparece, o vacío' },
    notes: { type: Type.STRING, description: 'Otras indicaciones generales de la receta, o vacío' },
  },
  required: ['medicines', 'doctor', 'patient', 'prescriptionDate', 'notes'],
};

/** Lee una foto de receta médica y extrae los medicamentos con horarios y duración */
export const extractPrescription = async (imageDataUrl: string): Promise<ExtractedPrescription> => {
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.*)$/s);
  if (!match) throw new Error('Formato de imagen no válido');
  const [, mimeType, data] = match;

  const prompt = `Eres un asistente experto en leer recetas médicas en español (pueden estar escritas a mano o impresas).
Analiza esta foto de una receta médica y extrae CADA medicamento recetado con:
- Nombre y concentración exactos como aparecen (corrige la ortografía a nombres reales de medicamentos si la letra es difícil).
- Dosis por toma, presentación y frecuencia. Convierte la frecuencia a horarios concretos del día (formato 24h) usando horarios razonables para una persona mayor: "cada 24 h / 1 vez al día" → ["08:00"]; "cada 12 h" → ["08:00","20:00"]; "cada 8 h" → ["08:00","16:00","00:00"]; "cada 6 h" → ["06:00","12:00","18:00","00:00"]. Si la receta indica momentos específicos (desayuno, comida, cena, antes de dormir), úsalos: desayuno=08:00, comida=14:00, cena=20:00, antes de dormir=22:00.
- Duración del tratamiento en días ("por 7 días" → 7; "por 2 semanas" → 14; si dice uso continuo o no se indica, 0).
- Indicaciones especiales (con alimentos, en ayunas, etc.).
Además, para cada medicamento agrega una explicación sencilla en español de qué es, para qué sirve, sus efectos secundarios comunes y precauciones — dirigida a un adulto mayor y su familia, sin tecnicismos.
Si algún dato no aparece en la receta, usa cadena vacía o 0 según corresponda. NO inventes medicamentos que no estén en la receta.`;

  const response = await getAI().models.generateContent({
    model: MODEL,
    contents: {
      parts: [
        { inlineData: { mimeType, data } },
        { text: prompt },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: prescriptionSchema,
    },
  });

  const text = response.text;
  if (!text) throw new Error('La IA no devolvió respuesta');
  return JSON.parse(text) as ExtractedPrescription;
};

const infoSchema = {
  type: Type.OBJECT,
  properties: {
    purpose: { type: Type.STRING },
    description: { type: Type.STRING },
    sideEffects: { type: Type.STRING },
    warnings: { type: Type.STRING },
  },
  required: ['purpose', 'description', 'sideEffects', 'warnings'],
};

/** Obtiene la explicación de un medicamento agregado manualmente */
export const fetchMedicineInfo = async (name: string, dose: string): Promise<MedicineInfo> => {
  const response = await getAI().models.generateContent({
    model: MODEL,
    contents: `Explica en español sencillo, para un adulto mayor y su familia, el medicamento "${name}" (dosis: ${dose || 'no especificada'}).
Devuelve:
- purpose: para qué sirve, en una frase corta.
- description: qué es y cómo actúa, en 2 a 4 frases sin tecnicismos.
- sideEffects: efectos secundarios comunes.
- warnings: precauciones importantes (interacciones frecuentes, alcohol, alimentos, etc.).
Si el nombre no corresponde a un medicamento conocido, dilo claramente en description y deja los demás campos con una nota de verificar con el médico.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: infoSchema,
    },
  });

  const text = response.text;
  if (!text) throw new Error('La IA no devolvió respuesta');
  return JSON.parse(text) as MedicineInfo;
};

const interactionSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: 'Resumen general en 1-2 frases sencillas.' },
    riskLevel: { type: Type.STRING, enum: ['bajo', 'medio', 'alto'] },
    interactions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          medicines: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Nombres de los medicamentos involucrados' },
          severity: { type: Type.STRING, enum: ['leve', 'moderada', 'importante'] },
          description: { type: Type.STRING, description: 'Qué puede pasar al combinarlos, en lenguaje sencillo.' },
          advice: { type: Type.STRING, description: 'Qué hacer: separar horarios, vigilar síntomas, comentar con el médico, etc.' },
        },
        required: ['medicines', 'severity', 'description', 'advice'],
      },
    },
    generalAdvice: { type: Type.STRING, description: 'Consejo general (alimentos, alcohol, horarios), o vacío.' },
  },
  required: ['summary', 'riskLevel', 'interactions', 'generalAdvice'],
};

/** Revisa posibles interacciones entre los medicamentos activos */
export const checkInteractions = async (medicines: { name: string; dose: string }[]): Promise<InteractionReport> => {
  const list = medicines.map(m => `- ${m.name} (${m.dose || 'dosis no especificada'})`).join('\n');
  const response = await getAI().models.generateContent({
    model: MODEL,
    contents: `Un adulto mayor toma actualmente estos medicamentos:
${list}

Analiza si existen interacciones conocidas entre ellos (medicamento-medicamento) y riesgos típicos de esta combinación. Responde en español sencillo, dirigido a la familia que lo cuida:
- summary: resumen breve de si la combinación es en general segura o requiere atención.
- riskLevel: "bajo" si no hay interacciones relevantes, "medio" si hay leves/moderadas, "alto" si alguna es importante.
- interactions: SOLO interacciones reales y conocidas entre los medicamentos de la lista (no inventes). Para cada una: qué puede pasar y qué hacer en la práctica.
- generalAdvice: consejos generales de la combinación (alcohol, alimentos, separar horarios), o cadena vacía.
Si no hay interacciones conocidas, devuelve la lista vacía y dilo en summary.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: interactionSchema,
    },
  });

  const text = response.text;
  if (!text) throw new Error('La IA no devolvió respuesta');
  return JSON.parse(text) as InteractionReport;
};
