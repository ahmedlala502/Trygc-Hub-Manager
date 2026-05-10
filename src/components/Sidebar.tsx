import React from 'react';
import { Home, CheckSquare, RefreshCw, Globe, MessageSquare, Settings, LogOut, TrendingUp, Users, Lock, Repeat } from 'lucide-react';
import { useLocalData } from './LocalDataContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  openSettingsTab?: (tab: string) => void;
  stats: {
    riskCount: number;
    handoverCount: number;
  };
}

export default function Sidebar({ activeTab, setActiveTab, openSettingsTab, stats }: SidebarProps) {
  const { user, logout, lock, isSuperAdmin, isMasterAdmin, canAccessPage } = useLocalData();

  const menuItems = [
    { section: 'Intelligence' },
    { id: 'dashboard', label: 'Command Center', icon: Home, badge: stats.riskCount > 0 ? stats.riskCount : null, badgeColor: 'bg-red-500' },
    { id: 'reports', label: 'Analytics & Reporting', icon: TrendingUp },
    { id: 'ai', label: 'AI Workspace', icon: MessageSquare },
    { section: 'Operations' },
    { id: 'tasks', label: 'Task Register', icon: CheckSquare },
    { id: 'handover', label: 'Shift Handover', icon: RefreshCw, badge: stats.handoverCount > 0 ? stats.handoverCount : null, badgeColor: 'bg-citrus' },
    { id: 'offices', label: 'Office Presence', icon: Globe },
    { id: 'team', label: 'Team Performance', icon: Users },

    { section: 'System' },
    { id: 'settings', label: 'Settings & Config', icon: Settings },
  ];

  return (
    <aside className="w-72 bg-white border-r border-dawn flex flex-col p-6 h-screen sticky top-0 overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 bg-citrus rounded-xl flex items-center justify-center shadow-lg shadow-citrus/20">
          <span className="text-white font-black text-xl tracking-tighter italic">T</span>
        </div>
        <div>
          <span className="block font-display font-bold text-lg tracking-tight text-ink leading-none">TryGC Hub Manager</span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mt-1 block">Control Center</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.filter(item => ('section' in item) || canAccessPage(item.id as any)).map((item, idx) => {
          if ('section' in item) {
            return (
              <div key={`section-${idx}`} className="text-[9px] font-black uppercase tracking-[0.2em] text-muted/60 mt-6 mb-2 ml-3">
                {item.section}
              </div>
            );
          }
          
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                activeTab === item.id 
                  ? 'bg-ink text-white font-bold shadow-lg shadow-ink/10' 
                  : 'text-muted hover:bg-stone/80 hover:text-ink font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4.5 h-4.5 ${activeTab === item.id ? 'text-citrus' : 'text-muted group-hover:text-ink'}`} />
                <span className="text-xs">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-black text-white rounded-md ${item.badgeColor} shadow-sm animate-pulse`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 space-y-6">
        <div className="p-4 bg-stone/50 rounded-2xl border border-dawn">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-dawn rounded-full flex items-center justify-center font-bold text-muted border border-white">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-bold text-ink leading-none truncate">{user.name}</span>
              <span className="text-xs font-semibold text-muted mt-1 block truncate">{user.role}</span>
              {isSuperAdmin && (
                <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-citrus/10 text-citrus rounded text-[8px] font-black uppercase tracking-widest">Super Admin</span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <button 
              onClick={() => openSettingsTab ? openSettingsTab('profile') : setActiveTab('settings')}
              className={`w-full flex items-center gap-2 p-2 text-xs font-bold transition-colors rounded-lg ${activeTab === 'settings' ? 'text-citrus' : 'text-muted hover:text-ink hover:bg-white/60'}`}
            >
              <Settings className="w-4 h-4" />
              <span>Profile Settings</span>
            </button>
            {isMasterAdmin && (
              <button
                onClick={() => openSettingsTab ? openSettingsTab('users') : setActiveTab('settings')}
                className="w-full flex items-center gap-2 p-2 text-xs font-bold text-muted hover:text-ink hover:bg-white/60 transition-colors rounded-lg"
              >
                <Repeat className="w-4 h-4" />
                <span>Switch User</span>
              </button>
            )}
            <button
              onClick={() => {
                lock();
                setActiveTab('dashboard');
              }}
              className="w-full flex items-center gap-2 p-2 text-xs font-bold text-muted hover:text-ink hover:bg-white/60 transition-colors rounded-lg"
            >
              <Lock className="w-4 h-4" />
              <span>Lock Session</span>
            </button>
            <button 
              onClick={() => {
                logout();
                setActiveTab('dashboard');
              }}
              className="w-full flex items-center gap-2 p-2 text-xs font-bold text-muted hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
