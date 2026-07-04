import React from 'react';
import { HeartPulse, Cloud, CloudOff, Loader2, Bell, UserCircle2, Settings } from 'lucide-react';
import { todayStr, formatDateLong } from '../utils';

export type SyncStatus = 'off' | 'connecting' | 'online' | 'error';

interface Props {
  syncStatus: SyncStatus;
  profileName: string;
  unreadCount: number;
  onOpenAlerts: () => void;
  onEditProfile: () => void;
  onOpenSettings: () => void;
}

const Header: React.FC<Props> = ({ syncStatus, profileName, unreadCount, onOpenAlerts, onEditProfile, onOpenSettings }) => {
  const dateText = formatDateLong(todayStr());
  return (
    <header className="bg-medi-teal text-white px-4 py-4 rounded-b-3xl shadow-lg no-print">
      <div className="flex items-center gap-2.5">
        <div className="bg-white/15 rounded-2xl p-2.5 shrink-0">
          <HeartPulse className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold leading-tight">MediHorario</h1>
          <p className="text-medi-mint text-sm font-semibold truncate">{dateText}</p>
        </div>

        {syncStatus !== 'off' && (
          <div
            className="bg-white/15 rounded-xl p-2 shrink-0"
            title={
              syncStatus === 'online' ? 'Sincronizado con la familia'
              : syncStatus === 'connecting' ? 'Conectando...'
              : 'Sin conexión: se guardará en este teléfono'
            }
          >
            {syncStatus === 'online' && <Cloud className="w-5 h-5" />}
            {syncStatus === 'connecting' && <Loader2 className="w-5 h-5 animate-spin" />}
            {syncStatus === 'error' && <CloudOff className="w-5 h-5 text-amber-300" />}
          </div>
        )}

        <button
          onClick={onOpenAlerts}
          className="relative bg-white/15 rounded-xl p-2 shrink-0 active:scale-95 transition-transform"
          title="Avisos de la familia"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-medi-red text-white text-[10px] font-extrabold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-medi-teal">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={onEditProfile}
          className="bg-white/15 rounded-xl px-2.5 py-2 shrink-0 flex items-center gap-1.5 active:scale-95 transition-transform max-w-[110px]"
          title="Cambiar quién usa este teléfono"
        >
          <UserCircle2 className="w-5 h-5 shrink-0" />
          {profileName && <span className="text-xs font-extrabold truncate">{profileName}</span>}
        </button>

        <button
          onClick={onOpenSettings}
          className="bg-white/15 rounded-xl p-2 shrink-0 active:scale-95 transition-transform"
          title="Ajustes"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
