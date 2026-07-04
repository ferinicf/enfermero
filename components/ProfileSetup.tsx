import React, { useState } from 'react';
import { UserCircle2, Check } from 'lucide-react';

interface Props {
  initialName: string;
  onSave: (name: string) => void;
  onCancel?: () => void;   // solo disponible al cambiar de nombre, no en el primer arranque
}

const QUICK_NAMES = ['Papá', 'Mamá', 'Hermana', 'Hermano'];

const ProfileSetup: React.FC<Props> = ({ initialName, onSave, onCancel }) => {
  const [name, setName] = useState(initialName);

  const submit = () => {
    const clean = name.trim();
    if (clean) onSave(clean);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-5">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-4">
        <div className="text-center">
          <UserCircle2 className="w-14 h-14 text-medi-teal mx-auto mb-2" />
          <h3 className="text-xl font-extrabold text-slate-800">¿Quién usa este teléfono?</h3>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Así toda la familia sabrá quién registró cada toma.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {QUICK_NAMES.map(q => (
            <button
              key={q}
              onClick={() => setName(q)}
              className={`px-4 py-2 rounded-xl font-bold border-2 transition-colors ${
                name === q ? 'bg-medi-teal text-white border-medi-teal' : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="O escribe tu nombre..."
          className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:border-medi-teal outline-none text-center"
        />

        <button
          onClick={submit}
          disabled={!name.trim()}
          className="w-full bg-medi-teal text-white font-extrabold text-lg py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-transform"
        >
          <Check className="w-6 h-6" /> Listo
        </button>

        {onCancel && (
          <button onClick={onCancel} className="w-full text-slate-400 font-bold py-1">
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileSetup;
