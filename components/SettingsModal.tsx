import React, { useState } from 'react';
import { getConfig, saveConfig, buildConfigLink } from '../config';
import { syncEnabled } from '../supabaseClient';
import { X, Save, Share2, Copy, Check, KeyRound, Cloud, ExternalLink } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const SettingsModal: React.FC<Props> = ({ onClose }) => {
  const current = getConfig();
  const [geminiKey, setGeminiKey] = useState(current.geminiKey);
  const [supabaseUrl, setSupabaseUrl] = useState(current.supabaseUrl);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(current.supabaseAnonKey);
  const [copied, setCopied] = useState(false);

  const save = () => {
    saveConfig({
      geminiKey: geminiKey.trim(),
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
    });
    // Recarga para que la conexión de Supabase se cree con los datos nuevos
    window.location.reload();
  };

  const shareLink = async () => {
    const link = buildConfigLink();
    const message = `Configura MediHorario en tu teléfono: solo abre este enlace y quedará listo.\n${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        return;
      } catch {
        /* el usuario canceló; sigue al portapapeles */
      }
    }
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const field = 'w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 font-semibold text-slate-800 focus:border-medi-teal outline-none text-sm';
  const label = 'text-xs font-extrabold text-slate-400 uppercase';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-medi-teal text-white p-5 flex items-center justify-between z-10">
          <h3 className="text-xl font-extrabold">Ajustes</h3>
          <button onClick={onClose} className="bg-white/20 rounded-full p-2"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="space-y-2">
            <p className="font-extrabold text-slate-700 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-medi-teal" /> Clave de inteligencia artificial
            </p>
            <p className="text-sm font-semibold text-slate-500">
              Necesaria para leer recetas y explicar medicinas. Es gratis:{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-medi-teal underline inline-flex items-center gap-0.5"
              >
                consíguela aquí <ExternalLink className="w-3.5 h-3.5" />
              </a>{' '}
              y pégala abajo.
            </p>
            <div>
              <label className={label}>Clave de Gemini</label>
              <input
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                placeholder="AIza..."
                className={field}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-extrabold text-slate-700 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-medi-teal" /> Modo familiar (opcional)
            </p>
            <p className="text-sm font-semibold text-slate-500">
              Conecta la base de datos para que todos los teléfonos vean lo mismo.
              {syncEnabled
                ? ' ✅ Conectado en este teléfono.'
                : ' Instrucciones para crearla (gratis) en el README del proyecto.'}
            </p>
            <div>
              <label className={label}>URL de Supabase</label>
              <input
                value={supabaseUrl}
                onChange={e => setSupabaseUrl(e.target.value)}
                placeholder="https://xxxx.supabase.co"
                className={field}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <div>
              <label className={label}>Clave anónima (anon key)</label>
              <input
                value={supabaseAnonKey}
                onChange={e => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJ..."
                className={field}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>

          <button
            onClick={save}
            className="w-full bg-medi-teal text-white font-extrabold text-lg py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Save className="w-5 h-5" /> Guardar y aplicar
          </button>

          {(geminiKey || supabaseUrl) && (
            <div className="bg-medi-light rounded-2xl p-4 space-y-2">
              <p className="font-extrabold text-medi-dark">👨‍👩‍👧 Configura a tu familia en un toque</p>
              <p className="text-sm font-semibold text-slate-600">
                Comparte este enlace (solo con tu familia): al abrirlo en su teléfono,
                la app queda configurada sola, sin escribir nada.
              </p>
              <button
                onClick={shareLink}
                className="w-full bg-medi-dark text-white font-extrabold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                {copied ? <Check className="w-5 h-5" /> : navigator.share ? <Share2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Enlace copiado' : 'Compartir enlace de configuración'}
              </button>
              <p className="text-[11px] font-semibold text-slate-400">
                El enlace contiene las claves de arriba. Guárdalas como algo privado de la familia.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
