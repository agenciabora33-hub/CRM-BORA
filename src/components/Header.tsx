import { useEffect, useState } from 'react';
import {
  BarChart3,
  Columns3,
  Plus,
  RefreshCw,
  Settings,
  Table2,
  UserCheck,
} from 'lucide-react';
import { AgencySettings, AppView } from '../types/crm';

interface HeaderProps {
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  settings: AgencySettings;
  isConnected: boolean;
  isSyncing: boolean;
  onChangeActiveUser: (user: string) => void;
  onManualSync: () => void;
  onOpenNewProspect: () => void;
  onOpenSettings: () => void;
}

const NAV_ITEMS: { id: AppView; label: string; icon: typeof Columns3 }[] = [
  { id: 'kanban', label: 'Kanban', icon: Columns3 },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'table', label: 'Tabela', icon: Table2 },
];

export function Header({
  activeView,
  onChangeView,
  settings,
  isConnected,
  isSyncing,
  onChangeActiveUser,
  onManualSync,
  onOpenNewProspect,
  onOpenSettings,
}: HeaderProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [settings.logoUrl]);

  return (
    <header className="sticky top-0 z-30 bg-[#111114]/95 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="h-14 sm:h-15 flex items-center justify-between gap-3">
          {/* Left: Bora Brand Logo Lockup + Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 sm:h-10 px-2 py-1 rounded-lg bg-black border border-zinc-800 flex items-center justify-center shrink-0">
              {settings.logoUrl && !imgFailed ? (
                <img
                  src={settings.logoUrl}
                  alt={`Logo ${settings.companyName || 'Bora CRM'}`}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="h-7 sm:h-8 w-auto max-w-[116px] object-contain"
                />
              ) : (
                <span className="font-display font-extrabold text-sm tracking-tight text-white px-1">
                  bora<span className="text-[#F97316]">&gt;&gt;</span>
                </span>
              )}
            </div>
            <div className="hidden sm:block h-5 w-px bg-zinc-800 shrink-0" aria-hidden="true" />
            <span className="font-display font-bold text-base sm:text-lg tracking-tight text-zinc-50 truncate max-w-[140px] sm:max-w-[220px]">
              {settings.companyName || 'Bora CRM'}
            </span>
          </div>

          {/* Center: Desktop View Switcher */}
          <nav
            aria-label="Navegação principal"
            className="hidden md:flex items-center gap-1 bg-[#09090B] border border-zinc-800 p-1 rounded-lg"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeView(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#18181B] text-white border border-zinc-700/80 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-100 border border-transparent'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-[#F97316]' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Active user, Sync status, Settings, + Novo Prospect */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Active User Selector */}
            <div className="hidden lg:flex items-center gap-1.5 rounded-md border border-zinc-800 bg-[#09090B] px-2.5 py-1.5">
              <UserCheck className="h-3.5 w-3.5 text-[#F97316] shrink-0" />
              <label htmlFor="active-user-select" className="text-xs text-zinc-400 whitespace-nowrap">
                Atuando como:
              </label>
              <select
                id="active-user-select"
                value={settings.activeUser}
                onChange={(e) => onChangeActiveUser(e.target.value)}
                className="text-xs font-semibold text-zinc-100 bg-[#09090B] focus:outline-none cursor-pointer pr-1"
              >
                {settings.teamMembers.map((member) => (
                  <option key={member} value={member} className="bg-[#18181B] text-zinc-100">
                    {member}
                  </option>
                ))}
              </select>
            </div>

            {/* Sync status + refresh */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span
                title={isConnected ? 'Sincronização automática em tempo real ativada' : 'Modo Local'}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-800 bg-[#09090B] text-xs font-medium text-zinc-300 whitespace-nowrap"
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${
                    isConnected ? 'bg-emerald-400' : 'bg-zinc-500'
                  }`}
                />
                <span>{isConnected ? 'Planilha Conectada' : 'Modo Local'}</span>
              </span>
              {isConnected && (
                <button
                  type="button"
                  onClick={onManualSync}
                  disabled={isSyncing}
                  title="Sincronizar agora com Google Sheets"
                  aria-label="Sincronizar"
                  className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md border border-zinc-800 bg-[#18181B] text-xs font-medium text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50 whitespace-nowrap transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-[#F97316]' : 'text-zinc-400'}`} />
                  <span className="hidden xl:inline">Sincronizar</span>
                </button>
              )}
            </div>

            {/* Settings button */}
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Conectar Planilha e Configurações"
              title="Conectar Planilha & Configurações"
              className="inline-flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-md border border-zinc-800 bg-[#18181B] text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Settings className="h-4 w-4 text-zinc-400" />
              <span className="hidden xl:inline">Planilha & Config</span>
            </button>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={onOpenNewProspect}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 sm:px-4 rounded-md bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Prospect</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>

        {/* Mobile compact second bar: View Switcher + Active User */}
        <div className="flex md:hidden items-center justify-between gap-1.5 py-1.5 border-t border-zinc-800">
          <nav aria-label="Navegação mobile" className="flex items-center gap-0.5 bg-[#09090B] border border-zinc-800 p-0.5 rounded-md min-w-0">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeView(item.id)}
                  className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded whitespace-nowrap ${
                    isActive ? 'bg-[#18181B] text-white' : 'text-zinc-400'
                  }`}
                >
                  <Icon className={`h-3 w-3 shrink-0 ${isActive ? 'text-[#F97316]' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            <select
              aria-label="Atuando como"
              value={settings.activeUser}
              onChange={(e) => onChangeActiveUser(e.target.value)}
              className="text-[11px] font-medium text-zinc-100 bg-[#09090B] border border-zinc-800 rounded px-1.5 py-1 max-w-[90px] truncate"
            >
              {settings.teamMembers.map((member) => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
            {isConnected && (
              <button
                type="button"
                onClick={onManualSync}
                disabled={isSyncing}
                aria-label="Sincronizar planilha"
                className="p-1.5 rounded border border-zinc-800 bg-[#18181B] text-zinc-200 shrink-0"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin text-[#F97316]' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
