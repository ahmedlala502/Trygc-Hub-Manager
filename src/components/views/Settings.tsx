import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Database,
  Download,
  Globe,
  KeyRound,
  Palette,
  Plus,
  Save,
  Settings as SettingsIcon,
  Shield,
  Sliders,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { useLocalData } from '../LocalDataContext';

interface SettingsProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

const settingTabs = [
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'general', icon: Globe, label: 'General' },
  { id: 'appearance', icon: Palette, label: 'Appearance' },
  { id: 'ai', icon: Bot, label: 'AI Config' },
  { id: 'security', icon: Shield, label: 'Auth & Users' },
  { id: 'operations', icon: Sliders, label: 'Ops Engine' },
  { id: 'teams', icon: Users, label: 'Team Roles' },
  { id: 'data', icon: Database, label: 'Data & Audit' },
];

export default function Settings({ activeTab: controlledTab, setActiveTab: setControlledTab }: SettingsProps) {
  const { user, settings, auditLogs, updateSettings, updateUser, exportWorkspace, resetData } = useLocalData();
  const [internalTab, setInternalTab] = useState(controlledTab || 'general');
  const activeTab = controlledTab || internalTab;
  const setActiveTab = setControlledTab || setInternalTab;
  const [theme, setTheme] = useState(localStorage.getItem('trygc_theme') || 'flow');
  const [saving, setSaving] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [config, setConfig] = useState(settings);
  const [profile, setProfile] = useState(user);
  const [newTeam, setNewTeam] = useState('');

  useEffect(() => setConfig(settings), [settings]);
  useEffect(() => setProfile(user), [user]);

  const saveConfig = async (nextConfig = config) => {
    setSaving(true);
    try {
      await updateSettings(nextConfig);
      setConfig(nextConfig);
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateUser(profile);
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId);
    localStorage.setItem('trygc_theme', themeId);
    document.documentElement.setAttribute('data-theme', themeId);
  };

  const handleExportData = () => {
    const blob = new Blob([JSON.stringify(exportWorkspace(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trygc-hub-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetData = async () => {
    setSaving(true);
    try {
      await resetData();
      setShowConfirmReset(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = (key: string) => {
    const next = {
      ...config,
      featureFlags: {
        ...(config.featureFlags || {}),
        [key]: !config.featureFlags?.[key],
      },
    };
    saveConfig(next);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-stone rounded-2xl border border-dawn">
            <SettingsIcon className="w-6 h-6 text-ink" />
          </div>
          <div>
            <h2 className="relaxed-title text-3xl">System Configuration</h2>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-muted">Appearance · AI · Auth · Teams · Data</p>
          </div>
        </div>
        <button
          onClick={() => saveConfig()}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-ink text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving' : 'Save Config'}</span>
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-3 space-y-2">
          {settingTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all group ${
                activeTab === tab.id ? 'bg-ink text-white shadow-xl shadow-ink/10' : 'text-muted hover:bg-stone'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-citrus' : 'text-muted group-hover:text-ink'}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="col-span-9 bg-white border border-dawn rounded-[32px] p-10 shadow-2xl min-h-[640px]">
          {activeTab === 'profile' && (
            <Panel title="Profile Settings" desc="Local workspace identity used across tasks, handovers, and dashboards.">
              <div className="grid grid-cols-2 gap-6">
                <Field label="Full Name"><input className={inputClass} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></Field>
                <Field label="Role"><input className={inputClass} value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })} /></Field>
                <Field label="Office"><input className={inputClass} value={profile.office} onChange={e => setProfile({ ...profile, office: e.target.value })} /></Field>
                <Field label="Country"><input className={inputClass} value={profile.country} onChange={e => setProfile({ ...profile, country: e.target.value })} /></Field>
                <Field label="Email"><input className={inputClass} value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} /></Field>
              </div>
              <button onClick={saveProfile} className="mt-8 px-8 py-3 bg-ink text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all">Save Profile</button>
            </Panel>
          )}

          {activeTab === 'general' && (
            <Panel title="Regional Parameters" desc="Configure defaults for the local command center.">
              <div className="grid grid-cols-2 gap-8">
                <Field label="Tool Name"><input className={inputClass} value={config.name || 'TryGC Hub Manager'} onChange={e => setConfig({ ...config, name: e.target.value })} /></Field>
                <Field label="Default SLA (Minutes)"><input type="number" className={inputClass} value={config.sla} onChange={e => setConfig({ ...config, sla: Number(e.target.value) })} /></Field>
              </div>
              <ToggleCard
                title="Auto-Bridge Logic"
                desc="Automatically propose shift transfers based on regional handover timing."
                active={!!config.autoBridge}
                onClick={() => saveConfig({ ...config, autoBridge: !config.autoBridge })}
              />
            </Panel>
          )}

          {activeTab === 'appearance' && (
            <Panel title="Appearance" desc="Preserve the current design while exposing the theme controls from the HTML build.">
              <div className="grid grid-cols-3 gap-5">
                {[
                  { id: 'flow', name: 'Hub Modern', desc: 'Soft stone with citrus action color', colors: ['bg-[#F5F5F7]', 'bg-[#F28C33]'] },
                  { id: 'tech', name: 'Deep Tech', desc: 'Dark control-room mode', colors: ['bg-[#0A0A0B]', 'bg-[#00F0FF]'] },
                  { id: 'minimal', name: 'Swiss Minimal', desc: 'High contrast and quiet chrome', colors: ['bg-white', 'bg-black'] },
                ].map(t => (
                  <button key={t.id} onClick={() => handleThemeChange(t.id)} className={`p-6 rounded-[28px] border-2 text-left space-y-4 transition-all ${theme === t.id ? 'border-citrus bg-citrus/5' : 'border-dawn bg-stone/20 grayscale hover:grayscale-0'}`}>
                    <div className="flex gap-2">{t.colors.map(c => <div key={c} className={`w-8 h-8 rounded-xl ${c} border border-dawn`} />)}</div>
                    <div><b className="block text-xs uppercase tracking-widest">{t.name}</b><span className="text-[10px] font-bold text-muted">{t.desc}</span></div>
                    {theme === t.id && <span className="flex items-center gap-2 text-citrus text-[10px] font-black uppercase tracking-widest"><CheckCircle2 className="w-4 h-4" /> Active</span>}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-5 mt-8">
                <Field label="Base Font Size"><input type="number" className={inputClass} value={config.appearance?.fontSize || 14} onChange={e => setConfig({ ...config, appearance: { ...(config.appearance || { radius: 24, density: 'comfortable' }), fontSize: Number(e.target.value) } })} /></Field>
                <Field label="Border Radius"><input type="number" className={inputClass} value={config.appearance?.radius || 24} onChange={e => setConfig({ ...config, appearance: { ...(config.appearance || { fontSize: 14, density: 'comfortable' }), radius: Number(e.target.value) } })} /></Field>
                <Field label="Density">
                  <select className={inputClass} value={config.appearance?.density || 'comfortable'} onChange={e => setConfig({ ...config, appearance: { ...(config.appearance || { fontSize: 14, radius: 24 }), density: e.target.value as any } })}>
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </Field>
              </div>
            </Panel>
          )}

          {activeTab === 'ai' && (
            <Panel title="AI Configuration" desc="Configure the provider used by Generate Brief, handover analysis, and task suggestions.">
              <div className="grid grid-cols-2 gap-6">
                <Field label="Provider">
                  <select className={inputClass} value={config.aiProvider || 'gemini'} onChange={e => setConfig({ ...config, aiProvider: e.target.value as any })}>
                    <option value="gemini">Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="alibaba">Alibaba Qwen</option>
                    <option value="local">Local / Offline</option>
                  </select>
                </Field>
                <Field label="Model"><input className={inputClass} value={config.aiModel || ''} onChange={e => setConfig({ ...config, aiModel: e.target.value })} placeholder="gemini-1.5-flash" /></Field>
                <Field label="Endpoint"><input className={inputClass} value={config.aiEndpoint || ''} onChange={e => setConfig({ ...config, aiEndpoint: e.target.value })} placeholder="Optional local endpoint" /></Field>
                <Field label="API Key Note">
                  <textarea
                    className={`${inputClass} min-h-20 resize-none leading-relaxed`}
                    value={config.apiKeyHint || ''}
                    onChange={e => setConfig({ ...config, apiKeyHint: e.target.value })}
                  />
                </Field>
              </div>
              <div className="mt-8 p-6 bg-citrus/5 border border-citrus/20 rounded-3xl">
                <div className="flex items-center gap-3 text-citrus mb-2"><KeyRound className="w-5 h-5" /><b className="text-xs uppercase tracking-widest">Local-first key handling</b></div>
                <p className="text-xs font-bold text-muted leading-relaxed">Keys are not stored in this UI. Keep provider keys in your local environment file, then use this panel to select the provider and model the tool should target.</p>
              </div>
            </Panel>
          )}

          {activeTab === 'security' && (
            <Panel title="Authentication & Users" desc="The original HTML auth settings are kept as local configuration, without blocking the app behind login.">
              <div className="grid grid-cols-3 gap-5">
                <Field label="Auth Mode">
                  <select className={inputClass} value={config.authMode || 'none'} onChange={e => setConfig({ ...config, authMode: e.target.value as any })}>
                    <option value="none">No Login</option>
                    <option value="local">Local Passcode</option>
                  </select>
                </Field>
                <Field label="Min Passcode Length"><input type="number" className={inputClass} value={config.minPasscodeLength || 6} onChange={e => setConfig({ ...config, minPasscodeLength: Number(e.target.value) })} /></Field>
                <Field label="Session Lock Minutes"><input type="number" className={inputClass} value={config.sessionLockMinutes || 60} onChange={e => setConfig({ ...config, sessionLockMinutes: Number(e.target.value) })} /></Field>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                {[user].map(u => (
                  <div key={u.email} className="flex items-center justify-between p-5 bg-stone/30 border border-dawn rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-dawn flex items-center justify-center text-xs font-black text-muted">{u.name.split(' ').map(n => n[0]).join('')}</div>
                      <div><b className="block text-sm">{u.name}</b><span className="text-[10px] font-bold uppercase tracking-widest text-muted">{u.role} · Local Admin</span></div>
                    </div>
                    <span className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Active</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {activeTab === 'operations' && (
            <Panel title="Operational Logic" desc="Feature flags and thresholds from the original backend settings.">
              <div className="space-y-4">
                {Object.entries(config.featureFlags || {}).map(([key, active]) => (
                  <div key={key}>
                    <ToggleCard title={labelize(key)} desc={flagDescription(key)} active={!!active} onClick={() => toggleFlag(key)} />
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {activeTab === 'teams' && (
            <Panel title="Organizational Grid" desc="Manage active teams permitted to register outcomes.">
              <div className="flex gap-2">
                <input value={newTeam} onChange={e => setNewTeam(e.target.value)} placeholder="Enter new team name..." className="flex-1 bg-stone/50 border border-dawn rounded-xl px-4 py-3 font-bold text-sm focus:border-citrus outline-none" />
                <button onClick={() => { if (newTeam.trim()) { saveConfig({ ...config, teams: [...(config.teams || []), newTeam.trim()] }); setNewTeam(''); } }} className="px-6 bg-ink text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2"><Plus className="w-3 h-3" /> Add Team</button>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                {(config.teams || []).map((t, i) => (
                  <div key={t} className="flex items-center justify-between p-4 bg-stone/30 rounded-2xl border border-dawn group">
                    <span className="text-sm font-bold text-ink">{t}</span>
                    <button onClick={() => saveConfig({ ...config, teams: config.teams.filter((_, idx) => idx !== i) })} className="p-2 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {activeTab === 'data' && (
            <Panel title="Data Management & Audit" desc="Backup, reset, and review local configuration events.">
              <div className="grid grid-cols-2 gap-6">
                <button onClick={handleExportData} className="flex flex-col items-center justify-center p-10 bg-white border border-dawn rounded-[32px] hover:border-citrus transition-all group">
                  <Download className="w-8 h-8 text-muted group-hover:text-citrus transition-colors mb-4" />
                  <span className="font-black text-xs uppercase tracking-widest text-ink">Export Workspace</span>
                  <span className="text-[9px] font-bold text-muted/40 mt-2 text-center px-4">Download all local data as JSON.</span>
                </button>
                <button onClick={() => setShowConfirmReset(true)} className="flex flex-col items-center justify-center p-10 bg-white border border-dawn rounded-[32px] hover:border-red-500 transition-all group">
                  <Trash2 className="w-8 h-8 text-muted group-hover:text-red-500 transition-colors mb-4" />
                  <span className="font-black text-xs uppercase tracking-widest text-red-500">Atomic Reset</span>
                  <span className="text-[9px] font-bold text-muted/40 mt-2 text-center px-4">Wipe local browser data. Irreversible.</span>
                </button>
              </div>
              {showConfirmReset && (
                <div className="mt-6 p-8 bg-red-50 border border-red-100 rounded-3xl space-y-6">
                  <div className="flex gap-4"><AlertCircle className="w-6 h-6 text-red-500 shrink-0" /><p className="text-xs font-bold text-red-900/60 leading-relaxed">You are about to delete all local tasks, offices, handovers, settings, and members.</p></div>
                  <button onClick={handleResetData} disabled={saving} className="px-6 py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50">{saving ? 'Resetting...' : 'Yes, Confirm Deletion'}</button>
                </div>
              )}
              <div className="mt-8 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted">Recent Audit</h4>
                {(auditLogs || []).slice(0, 8).map(event => (
                  <div key={event.id} className="p-3 bg-stone/30 border border-dawn rounded-xl text-xs font-bold text-muted"><b className="text-ink">{event.action}</b> · {new Date(event.timestamp).toLocaleString()}</div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="relaxed-title text-2xl">{title}</h3>
        <p className="text-sm font-medium text-muted">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2 block">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted">{label}</span>
      {children}
    </label>
  );
}

function ToggleCard({ title, desc, active, onClick }: { title: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between p-6 bg-stone/30 rounded-2xl border border-dawn">
      <div className="space-y-1">
        <span className="block text-sm font-bold text-ink">{title}</span>
        <span className="text-[10px] font-medium text-muted leading-relaxed">{desc}</span>
      </div>
      <button onClick={onClick} className={`w-12 h-6 rounded-full relative transition-colors ${active ? 'bg-citrus' : 'bg-dawn'}`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${active ? 'right-1' : 'left-1'}`} />
      </button>
    </div>
  );
}

function labelize(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
}

function flagDescription(key: string) {
  const descriptions: Record<string, string> = {
    autoRiskFlagging: 'Flag high-risk tasks when priority, blocked status, or SLA pressure requires attention.',
    carryOverThreshold: 'Highlight tasks that must move into the next shift handover.',
    officeIsolation: 'Separate office-level queues, reporting, and handover context so each hub can operate independently.',
    teamIsolation: 'Separate Operations Team and Community Team workflows while preserving a shared leadership view.',
    shiftOverlapBuffer: 'Display adjacent shift context for smoother handovers.',
    aiBriefGeneration: 'Enable AI-assisted brief and watchout generation.',
    localBackups: 'Enable local JSON backup and restore workflows.',
  };
  return descriptions[key] || 'Workspace feature toggle.';
}

const inputClass = 'w-full bg-stone/50 border border-dawn rounded-xl px-4 py-3 font-bold text-sm focus:border-citrus outline-none';
