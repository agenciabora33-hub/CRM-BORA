import {
  BarChart3,
  Columns3,
  Globe,
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
  return (
    <header className="sticky top-0 z-30 bg-[#0F172A] border-b border-slate-800">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between gap-3">
          {/* Left: Company Logo + Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={`Logo ${settings.companyName}`}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-md object-contain border border-slate-700 bg-slate-900 shrink-0"
              />
            ) : (
              <div
                aria-hidden="true"
                className="h-8 w-8 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/25 flex items-center justify-center shrink-0"
              >
                <Globe className="h-4 w-4" />
              </div>
            )}
            <span className="font-display font-semibold text-base text-slate-100 truncate max-w-[150px] sm:max-w-[220px]">
              {settings.companyName || 'Sua Agência'}
            </span>
          </div>

          {/* Center: Desktop View Switcher */}
          <nav
            aria-label="Navegação principal"
            className="hidden md:flex items-center gap-1 bg-slate-950/70 border border-slate-800 p-1 rounded-lg"
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
                      ? 'bg-slate-800 text-slate-50 shadow-xs'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Active user, Sync status, Settings, + Novo Prospect */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Active User Selector */}
            <div className="hidden lg:flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-950/70 px-2.5 py-1">
              <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <label htmlFor="active-user-select" className="text-xs text-slate-400 whitespace-nowrap">
                Atuando como:
              </label>
              <select
                id="active-user-select"
                value={settings.activeUser}
                onChange={(e) => onChangeActiveUser(e.target.value)}
                className="text-xs font-semibold text-slate-100 bg-slate-950 focus:outline-none cursor-pointer pr-1"
              >
                {settings.teamMembers.map((member) => (
                  <option key={member} value={member} className="bg-slate-900 text-slate-100">
                    {member}
                  </option>
                ))}
              </select>
            </div>

            {/* Sync status badge + refresh */}
            <div className="hidden sm:flex items-center gap-1">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                  isConnected
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {isConnected ? 'Planilha Conectada' : 'Modo Local'}
              </span>
              {isConnected && (
                <button
                  type="button"
                  onClick={onManualSync}
                  disabled={isSyncing}
                  title="Sincronizar agora com Google Sheets"
                  aria-label="Sincronizar"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50 whitespace-nowrap transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
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
              className="inline-flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-md border border-slate-700 bg-slate-800/80 text-sm font-medium text-slate-100 hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              <span className="hidden xl:inline">Planilha & Config</span>
            </button>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={onOpenNewProspect}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 sm:px-4 rounded-md bg-[#2563EB] hover:bg-blue-500 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Prospect</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>

        {/* Mobile compact second bar: View Switcher + Active User */}
        <div className="flex md:hidden items-center justify-between gap-2 py-2 border-t border-slate-800">
          <nav aria-label="Navegação mobile" className="flex items-center gap-1 bg-slate-950/70 border border-slate-800 p-0.5 rounded-md">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeView(item.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
                    isActive ? 'bg-slate-800 text-slate-50 shadow-xs' : 'text-slate-400'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <select
              aria-label="Atuando como"
              value={settings.activeUser}
              onChange={(e) => onChangeActiveUser(e.target.value)}
              className="text-xs font-medium text-slate-100 bg-slate-900 border border-slate-700 rounded px-2 py-1"
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
                className="p-1.5 rounded border border-slate-700 bg-slate-800 text-slate-100"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
