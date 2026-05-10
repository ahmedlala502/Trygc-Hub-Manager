import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Download,
  Globe,
  KeyRound,
  LayoutGrid,
  Loader2,
  Palette,
  Plus,
  Save,
  Server,
  Settings as SettingsIcon,
  Shield,
  Sliders,
  Terminal,
  Trash2,
  Upload,
  User,
  UserCheck,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { useLocalData } from '../LocalDataContext';
import { CustomProvider, WorkspaceSettings } from '../../lib/localStore';
import { Status } from '../../types';
import { APP_PAGES, DEFAULT_ROLE_PERMISSIONS, FEATURE_KEYS, WIDGET_KEYS, resolveRoleName } from '../../lib/accessControl';

interface SettingsProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

const settingTabs = [
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'general', icon: Globe, label: 'General' },
  { id: 'appearance', icon: Palette, label: 'Appearance' },
  { id: 'ai', icon: Bot, label: 'AI & API' },
  { id: 'security', icon: Shield, label: 'Auth & Users' },
  { id: 'users', icon: Users, label: 'User Management' },
  { id: 'operations', icon: Sliders, label: 'Ops Engine' },
  { id: 'teams', icon: Users, label: 'Team Roles' },
  { id: 'data', icon: Database, label: 'Data & Audit' },
];

const API_KEYS_STORE = 'trygc_api_keys_v1';

function loadApiKeys(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(API_KEYS_STORE) || '{}'); } catch { return {}; }
}
function persistApiKeys(keys: Record<string, string>) {
  localStorage.setItem(API_KEYS_STORE, JSON.stringify(keys));
}

const BUILTIN_PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini', badge: 'G', defaultModel: 'gemini-1.5-flash', keyPlaceholder: 'AIza...', color: 'bg-blue-500', adminOnly: false },
  { id: 'openai', name: 'OpenAI', badge: '⬡', defaultModel: 'gpt-4o', keyPlaceholder: 'sk-...', color: 'bg-green-500', adminOnly: false },
  { id: 'anthropic', name: 'Anthropic Claude', badge: '◈', defaultModel: 'claude-3-5-sonnet-20241022', keyPlaceholder: 'sk-ant-...', color: 'bg-orange-500', adminOnly: false },
  { id: 'groq', name: 'Groq', badge: '⚡', defaultModel: 'llama-3.3-70b-versatile', keyPlaceholder: 'gsk_...', color: 'bg-purple-500', adminOnly: false },
  { id: 'alibaba', name: 'Alibaba Qwen', badge: 'Q', defaultModel: 'qwen-plus', keyPlaceholder: 'sk-...', color: 'bg-red-500', adminOnly: true },
  { id: 'local', name: 'Local / Ollama', badge: '⬢', defaultModel: 'llama3', keyPlaceholder: 'No key required', color: 'bg-slate-500', adminOnly: false },
];

function isAdminUser(role: string): boolean {
  const r = role.toLowerCase();
  return r.includes('admin') || r.includes('manager') || r.includes('lead') || r.includes('head') || r.includes('director') || r.includes('general');
}

const PRESET_ROLES = [
  // ── Admin / Management ──────────────────────────────
  'Admin',
  'Super Admin',
  'Regional Manager',
  'Country Manager',
  'Department Head',
  'General Manager',
  // ── Operations ──────────────────────────────────────
  'Operations Lead',
  'Operations Manager',
  'Shift Lead',
  'Senior Operations Agent',
  'Operations Agent',
  // ── Community ───────────────────────────────────────
  'Community Lead',
  'Community Manager',
  'Creator Coverage Lead',
  'Community Agent',
  // ── Support & Reporting ─────────────────────────────
  'Analyst',
  'Reporting Specialist',
  'Support Agent',
  'QA Specialist',
  // ── Custom ──────────────────────────────────────────
  'Viewer',
];

export default function Settings({ activeTab: controlledTab, setActiveTab: setControlledTab }: SettingsProps) {
  const { user, settings, members, pendingSignups, tasks, handovers, auditLogs, updateSettings, updateUser, addMember, updateMember, deleteMember, approveSignup, rejectSignup, exportWorkspace, importData, resetData, isMasterAdmin, lock, logout } = useLocalData();
  const [internalTab, setInternalTab] = useState(controlledTab || 'general');
  const activeTab = controlledTab || internalTab;
  const setActiveTab = setControlledTab || setInternalTab;
  const [theme, setTheme] = useState(localStorage.getItem('trygc_theme') || 'flow');
  const [saving, setSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [config, setConfig] = useState(settings);
  const configRef = useRef(config);
  const [profile, setProfile] = useState(user);
  const [newTeam, setNewTeam] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const isAdmin = isAdminUser(user.role);

  // ── User Management state ─────────────────────────────────────────────────
  const emptyMember = { name: '', role: PRESET_ROLES[0], team: settings.teams?.[0] || 'Operations Team', office: user.office, country: user.country, email: '', password: '' };
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState(emptyMember);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<typeof members[0]>>({});
  const [memberSearch, setMemberSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // AI tab state
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(loadApiKeys);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, 'idle' | 'testing' | 'ok' | 'fail'>>({});
  const [mcpConfig, setMcpConfig] = useState(
    () => settings.mcpConfig || JSON.stringify({ mcpServers: {} }, null, 2)
  );
  const [mcpError, setMcpError] = useState('');
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState<Partial<CustomProvider>>({ name: '', baseUrl: '', defaultModel: '' });
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Super Admin');
  const canManageWorkspace = isMasterAdmin;
  const visibleTabs = useMemo(
    () => settingTabs.filter(tab => canManageWorkspace || tab.id === 'profile'),
    [canManageWorkspace]
  );

  // Keep ref up to date
  useEffect(() => { configRef.current = config; }, [config]);

  const providerModels: Record<string, string> = {
    ...BUILTIN_PROVIDERS.reduce((acc, p) => ({ ...acc, [p.id]: p.defaultModel }), {}),
    ...(config.providerModels || {}),
  };
  const providerEndpoints: Record<string, string> = config.providerEndpoints || {};

  useEffect(() => { setConfig(settings); configRef.current = settings; }, [settings]);
  useEffect(() => setProfile(user), [user]);
  useEffect(() => {
    if (settings.mcpConfig) setMcpConfig(settings.mcpConfig);
  }, [settings.mcpConfig]);
  useEffect(() => {
    if (!canManageWorkspace && activeTab !== 'profile') {
      setActiveTab('profile');
    }
  }, [activeTab, canManageWorkspace, setActiveTab]);

  // Unsaved changes detection
  const hasUnsaved = useMemo(() => {
    const clean = (c: WorkspaceSettings) => JSON.stringify({ ...c, mcpConfig: undefined });
    return clean(config) !== clean(settings);
  }, [config, settings]);

  // ── Save helpers ───────────────────────────────────────────────

  const saveConfig = async (nextConfig?: WorkspaceSettings) => {
    setSaving(true);
    const toSave = nextConfig ?? configRef.current;
    let final = { ...toSave };
    try { JSON.parse(mcpConfig); final.mcpConfig = mcpConfig; } catch {}
    try {
      await updateSettings(final);
      setConfig(final);
      configRef.current = final;
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1200);
    } finally { setSaving(false); }
  };

  const saveProviderModel = (providerId: string, model: string) => {
    const next = {
      ...configRef.current,
      providerModels: { ...(configRef.current.providerModels || {}), [providerId]: model },
    };
    setConfig(next);
    saveConfig(next);
  };

  const saveProviderEndpoint = (providerId: string, endpoint: string) => {
    const next = {
      ...configRef.current,
      providerEndpoints: { ...(configRef.current.providerEndpoints || {}), [providerId]: endpoint },
    };
    setConfig(next);
    saveConfig(next);
  };

  const setActiveProvider = (providerId: string, model: string) => {
    const next = { ...configRef.current, aiProvider: providerId, aiModel: model };
    setConfig(next);
    saveConfig(next);
  };

  const saveProfile = async () => {
    setSaving(true);
    try { await updateUser(profile); } finally { setSaving(false); }
  };

  const switchToMember = (member: typeof members[0]) => {
    const profile = {
      name: member.name,
      role: member.role || user.role,
      office: member.office,
      country: member.country,
      email: user.email,
    };
    updateUser(profile);
    setProfile(profile);
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
    try { await resetData(); setShowConfirmReset(false); } finally { setSaving(false); }
  };

  const toggleFlag = (key: string) => {
    const next = { ...configRef.current, featureFlags: { ...(configRef.current.featureFlags || {}), [key]: !configRef.current.featureFlags?.[key] } };
    setConfig(next);
    saveConfig(next);
  };

  // API key helpers
  const updateApiKey = (providerId: string, key: string) => {
    const next = { ...apiKeys, [providerId]: key };
    setApiKeys(next);
    persistApiKeys(next);
  };

  const deleteApiKey = (providerId: string) => {
    const next = { ...apiKeys };
    delete next[providerId];
    setApiKeys(next);
    persistApiKeys(next);
  };

  const updateProviderModel = (providerId: string, model: string) => {
    const next = { ...configRef.current, providerModels: { ...(configRef.current.providerModels || {}), [providerId]: model } };
    setConfig(next);
    configRef.current = next;
  };

  const updateProviderEndpoint = (providerId: string, endpoint: string) => {
    const next = { ...configRef.current, providerEndpoints: { ...(configRef.current.providerEndpoints || {}), [providerId]: endpoint } };
    setConfig(next);
    configRef.current = next;
  };

  const testConnection = async (providerId: string) => {
    setTestResults(r => ({ ...r, [providerId]: 'testing' }));
    try {
      const key = apiKeys[providerId] || '';
      const model = providerModels[providerId] || '';
      const ep = providerEndpoints[providerId] || '';
      let ok = false;

      if (providerId === 'gemini' && key) {
        const m = model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] }) });
        ok = res.ok;
      } else if (providerId === 'openai' && key) {
        const url = ep || 'https://api.openai.com/v1/chat/completions';
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify({ model: model || 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 }) });
        ok = res.ok;
      } else if (providerId === 'anthropic' && key) {
        const url = ep || 'https://api.anthropic.com/v1/messages';
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: model || 'claude-3-5-haiku-20241022', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }) });
        ok = res.ok;
      } else if (providerId === 'groq' && key) {
        const url = ep || 'https://api.groq.com/openai/v1/chat/completions';
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify({ model: model || 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 }) });
        ok = res.ok;
      } else if (providerId === 'alibaba' && key) {
        const url = ep || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify({ model: model || 'qwen-plus', messages: [{ role: 'user', content: 'Hi' }] }) });
        ok = res.ok;
      } else if (providerId === 'local') {
        const url = (ep || 'http://localhost:11434') + '/api/tags';
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        ok = res.ok;
      } else if (key && ep) {
        const url = ep.endsWith('/') ? ep + 'chat/completions' : ep + '/chat/completions';
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 }) });
        ok = res.ok;
      }
      setTestResults(r => ({ ...r, [providerId]: ok ? 'ok' : 'fail' }));
    } catch {
      setTestResults(r => ({ ...r, [providerId]: 'fail' }));
    }
  };

  const saveMcpConfig = () => {
    try {
      JSON.parse(mcpConfig);
      setMcpError('');
      saveConfig({ ...configRef.current, mcpConfig });
    } catch {
      setMcpError('Invalid JSON — fix the syntax before saving.');
    }
  };

  const copyMcpTemplate = () => {
    const template = JSON.stringify({ mcpServers: { 'brave-search': { command: 'npx', args: ['-y', '@modelcontextprotocol/server-brave-search'], env: { BRAVE_API_KEY: 'your-key-here' } }, filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/dir'] } } }, null, 2);
    setMcpConfig(template);
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 2000);
  };

  const addCustomProvider = () => {
    if (!newProvider.name || !newProvider.baseUrl) return;
    const provider: CustomProvider = { id: `custom-${Date.now()}`, name: newProvider.name!, baseUrl: newProvider.baseUrl!, defaultModel: newProvider.defaultModel || 'default' };
    const next = { ...configRef.current, customProviders: [...(configRef.current.customProviders || []), provider] };
    setNewProvider({ name: '', baseUrl: '', defaultModel: '' });
    setShowAddProvider(false);
    setConfig(next);
    saveConfig(next);
  };

  const removeCustomProvider = (id: string) => {
    const next = { ...configRef.current, customProviders: (configRef.current.customProviders || []).filter(p => p.id !== id) };
    setConfig(next);
    saveConfig(next);
  };

  const allProviders = [
    ...BUILTIN_PROVIDERS,
    ...(config.customProviders || []).map(p => ({ id: p.id, name: p.name, badge: '⬡', defaultModel: p.defaultModel, keyPlaceholder: 'API key', color: 'bg-teal-500', adminOnly: false })),
  ];

  // Current user's performance computed from live data
  const myStats = useMemo(() => {
    const myTasks = tasks.filter(t => t.owner === user.name || t.owner === user.email);
    const myHandovers = handovers.filter(h => h.outgoing === user.name);
    const completed = myTasks.filter(t => t.status === Status.DONE).length;
    const inProgress = myTasks.filter(t => t.status !== Status.DONE && t.status !== 'Blocked' as any).length;
    const blocked = myTasks.filter(t => t.status === 'Blocked' as any).length;
    const acked = myHandovers.filter(h => h.status === 'Acknowledged').length;
    return {
      total: myTasks.length,
      completed,
      inProgress,
      blocked,
      handoversOut: myHandovers.length,
      onTimeRate: myHandovers.length > 0 ? Math.round((acked / myHandovers.length) * 100) : 100,
    };
  }, [tasks, handovers, user.name, user.email]);

  const getUserMetrics = (name: string) => {
    const ownedTasks = tasks.filter(task => task.owner === name);
    const completed = ownedTasks.filter(task => task.status === Status.DONE).length;
    const blocked = ownedTasks.filter(task => task.status === Status.BLOCKED).length;
    const inProgress = ownedTasks.filter(task => task.status === Status.IN_PROGRESS || task.status === Status.WAITING).length;
    const carry = ownedTasks.filter(task => task.carry && task.status !== Status.DONE).length;
    const handoversOut = handovers.filter(handover => handover.outgoing === name).length;
    const acknowledgedHandovers = handovers.filter(handover => handover.outgoing === name && handover.status === 'Acknowledged').length;
    const onTimeRate = handoversOut > 0 ? Math.round((acknowledgedHandovers / handoversOut) * 100) : completed > 0 ? Math.round((completed / Math.max(ownedTasks.length, 1)) * 100) : 100;
    const productivity = Math.round(Math.min(100, completed * 12 + handoversOut * 6 + Math.max(0, 20 - blocked * 8)));
    return { total: ownedTasks.length, completed, blocked, inProgress, carry, handoversOut, onTimeRate, productivity };
  };

  const activeProfileMetrics = getUserMetrics(user.name);

  const roleProfiles = config.rolePermissions || DEFAULT_ROLE_PERMISSIONS;
  const editableRoleProfile = roleProfiles[selectedRole] || DEFAULT_ROLE_PERMISSIONS[resolveRoleName(selectedRole)];

  const updateRoleProfile = (role: string, patch: Partial<(typeof editableRoleProfile)>) => {
    const current = roleProfiles[role] || DEFAULT_ROLE_PERMISSIONS[resolveRoleName(role)];
    const next = {
      ...configRef.current,
      rolePermissions: {
        ...roleProfiles,
        [role]: {
          ...current,
          ...patch,
        },
      },
    };
    setConfig(next);
    saveConfig(next);
  };

  const updateWidgetConfig = (key: string) => {
    const next = {
      ...configRef.current,
      widgetConfig: {
        ...(configRef.current.widgetConfig || {}),
        [key]: !configRef.current.widgetConfig?.[key as keyof typeof config.widgetConfig],
      },
    };
    setConfig(next);
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
        <div className="flex items-center gap-3">
          {canManageWorkspace && hasUnsaved && !saving && (
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              Unsaved changes
            </span>
          )}
          {canManageWorkspace && (
            <button
              onClick={() => saveConfig()}
              disabled={saving}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50 ${saveFlash ? 'bg-green-500 text-white' : hasUnsaved ? 'bg-amber-500 text-white' : 'bg-ink text-white'}`}
            >
              {saveFlash ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? 'Saving...' : saveFlash ? 'Saved!' : hasUnsaved ? 'Save Changes' : 'Save Config'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-3 space-y-2">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all group ${activeTab === tab.id ? 'bg-ink text-white shadow-xl shadow-ink/10' : 'text-muted hover:bg-stone'}`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-citrus' : 'text-muted group-hover:text-ink'}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="col-span-9 bg-white border border-dawn rounded-[32px] p-10 shadow-2xl min-h-[640px]">

          {/* ── Profile ── */}
          {activeTab === 'profile' && (
            <Panel title="My Profile" desc="Your identity across tasks, handovers, and reports.">
              <div className="space-y-8">
                <div className="grid grid-cols-4 gap-4">
                  <StatBox label="Productivity" value={`${activeProfileMetrics.productivity}%`} sub="live profile score" color="text-citrus" />
                  <StatBox label="Tasks Owned" value={activeProfileMetrics.total} sub={`${activeProfileMetrics.inProgress} active now`} color="text-blue-600" />
                  <StatBox label="Carry-over" value={activeProfileMetrics.carry} sub="still open" color="text-amber-600" />
                  <StatBox label="Blocked" value={activeProfileMetrics.blocked} sub="needs attention" color="text-red-500" />
                </div>

                {/* Profile form */}
                <div className="grid grid-cols-2 gap-6">
                  <Field label="Full Name"><input className={inputClass} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></Field>
                  <Field label="Role"><input className={inputClass} value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })} disabled={!isMasterAdmin} /></Field>
                  <Field label="Office"><input className={inputClass} value={profile.office} onChange={e => setProfile({ ...profile, office: e.target.value })} /></Field>
                  <Field label="Country"><input className={inputClass} value={profile.country} onChange={e => setProfile({ ...profile, country: e.target.value })} /></Field>
                  <Field label="Email"><input className={inputClass} value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} disabled={isMasterAdmin} /></Field>
                  <Field label="Passcode">
                    <input className={inputClass} type="password" value={profile.password || ''} onChange={e => setProfile({ ...profile, password: e.target.value })} placeholder="Set your passcode" disabled={isMasterAdmin} />
                  </Field>
                </div>
                <button onClick={saveProfile} className="px-8 py-3 bg-ink text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all">Save Profile</button>

                {/* Performance stats */}
                <div className="p-6 bg-stone/30 rounded-3xl border border-dawn space-y-4">
                  <div className="flex items-center gap-2 text-muted">
                    <Award className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">My Performance</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <StatBox label="Tasks Done" value={myStats.completed} sub={`of ${myStats.total}`} color="text-green-600" />
                    <StatBox label="Handovers Out" value={myStats.handoversOut} sub="total" color="text-blue-600" />
                    <StatBox label="On-Time Rate" value={`${myStats.onTimeRate}%`} sub="handovers acked" color="text-citrus" />
                  </div>
                  <div className="flex gap-4 text-[10px] font-bold text-muted pt-2 border-t border-dawn">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" />{myStats.inProgress} in progress</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />{myStats.blocked} blocked</span>
                  </div>
                </div>

                {/* Switch account */}
                {canManageWorkspace && members.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-muted mb-4">
                      <UserCheck className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Switch Account</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {members.map(m => {
                        const isCurrentUser = m.name === user.name;
                        return (
                          <button
                            key={m.id}
                            onClick={() => !isCurrentUser && switchToMember(m)}
                            disabled={isCurrentUser}
                            className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${isCurrentUser ? 'border-citrus bg-citrus/5 cursor-default' : 'border-dawn bg-stone/20 hover:border-ink hover:bg-stone/40'}`}
                          >
                            <div className="w-10 h-10 rounded-xl bg-white border border-dawn flex items-center justify-center text-xs font-black text-muted shrink-0">
                              {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-sm font-black text-ink truncate">{m.name}</span>
                              <span className="block text-[9px] font-bold text-muted uppercase tracking-widest truncate">{m.role || m.team}</span>
                              <span className="block text-[9px] font-bold text-muted/60">{getUserMetrics(m.name).productivity}% productivity · {m.office}</span>
                            </div>
                            {isCurrentUser && <span className="ml-auto text-[8px] font-black text-citrus uppercase tracking-widest">Active</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}

          {/* ── General ── */}
          {canManageWorkspace && activeTab === 'general' && (
            <Panel title="Regional Parameters" desc="Configure defaults for the local command center.">
              <div className="grid grid-cols-2 gap-8">
                <Field label="Tool Name"><input className={inputClass} value={config.name || 'TryGC Hub Manager'} onChange={e => setConfig({ ...configRef.current, name: e.target.value })} /></Field>
                <Field label="Default SLA (Minutes)"><input type="number" className={inputClass} value={config.sla} onChange={e => setConfig({ ...configRef.current, sla: Number(e.target.value) })} /></Field>
              </div>
              <ToggleCard
                title="Auto-Bridge Logic"
                desc="Automatically propose shift transfers based on regional handover timing."
                active={!!config.autoBridge}
                onClick={() => { const next = { ...configRef.current, autoBridge: !configRef.current.autoBridge }; setConfig(next); saveConfig(next); }}
              />
            </Panel>
          )}

          {/* ── Appearance ── */}
          {canManageWorkspace && activeTab === 'appearance' && (
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
                <Field label="Base Font Size"><input type="number" className={inputClass} value={config.appearance?.fontSize || 14} onChange={e => setConfig({ ...configRef.current, appearance: { ...(configRef.current.appearance || { radius: 24, density: 'comfortable' }), fontSize: Number(e.target.value) } })} /></Field>
                <Field label="Border Radius"><input type="number" className={inputClass} value={config.appearance?.radius || 24} onChange={e => setConfig({ ...configRef.current, appearance: { ...(configRef.current.appearance || { fontSize: 14, density: 'comfortable' }), radius: Number(e.target.value) } })} /></Field>
                <Field label="Density">
                  <select className={inputClass} value={config.appearance?.density || 'comfortable'} onChange={e => setConfig({ ...configRef.current, appearance: { ...(configRef.current.appearance || { fontSize: 14, radius: 24 }), density: e.target.value as any } })}>
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </Field>
              </div>
            </Panel>
          )}

          {/* ── AI & API ── */}
          {canManageWorkspace && activeTab === 'ai' && (
            <Panel title="API & Integration Hub" desc="Configure AI providers, manage API keys locally, and connect MCP servers.">
              <div className="space-y-10">

                {/* Active Configuration */}
                <section>
                  <SectionHeading icon={<Zap className="w-4 h-4" />} label="Active Configuration" />
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <Field label="Active Provider">
                      <select
                        className={inputClass}
                        value={config.aiProvider || 'gemini'}
                        onChange={e => {
                          const next = { ...configRef.current, aiProvider: e.target.value };
                          setConfig(next);
                          saveConfig(next);
                        }}
                      >
                        {allProviders.filter(p => !p.adminOnly || isAdmin).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Active Model">
                      <input
                        className={inputClass}
                        value={config.aiModel || providerModels[config.aiProvider || 'gemini'] || ''}
                        onChange={e => setConfig({ ...configRef.current, aiModel: e.target.value })}
                        onBlur={() => saveConfig()}
                        placeholder={providerModels[config.aiProvider || 'gemini'] || 'model name'}
                      />
                    </Field>
                    <Field label="Override Endpoint">
                      <input
                        className={inputClass}
                        value={config.aiEndpoint || ''}
                        onChange={e => setConfig({ ...configRef.current, aiEndpoint: e.target.value })}
                        onBlur={() => saveConfig()}
                        placeholder="https://... (optional)"
                      />
                    </Field>
                  </div>
                  <div className="mt-4">
                    <Field label="Fallback Order">
                      <input
                        className={inputClass}
                        value={(config.fallbackProviders || []).join(', ')}
                        onChange={e => setConfig({ ...configRef.current, fallbackProviders: e.target.value.split(',').map(item => item.trim()).filter(Boolean) })}
                        onBlur={() => saveConfig()}
                        placeholder="local, openai, anthropic, groq"
                      />
                    </Field>
                  </div>
                </section>

                {/* API Keys */}
                <section>
                  <div className="flex items-center justify-between">
                    <SectionHeading icon={<KeyRound className="w-4 h-4" />} label="API Keys — stored in browser only" />
                    <span className="text-[9px] font-bold text-muted/60 uppercase tracking-widest">Never sent to any server</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {BUILTIN_PROVIDERS.filter(p => !p.adminOnly || isAdmin).map(provider => {
                      const key = apiKeys[provider.id] || '';
                      const model = providerModels[provider.id] || provider.defaultModel;
                      const result = testResults[provider.id] || 'idle';
                      const isActive = (config.aiProvider || 'gemini') === provider.id;
                      return (
                        <ProviderRow
                          key={provider.id}
                          provider={provider}
                          apiKey={key}
                          model={model}
                          endpoint={providerEndpoints[provider.id] || ''}
                          isActive={isActive}
                          showKey={!!showKeys[provider.id]}
                          testResult={result}
                          isAdminOnly={provider.adminOnly}
                          isAdmin={isAdmin}
                          onToggleShow={() => setShowKeys(s => ({ ...s, [provider.id]: !s[provider.id] }))}
                          onKeyChange={v => updateApiKey(provider.id, v)}
                          onKeyDelete={() => deleteApiKey(provider.id)}
                          onModelChange={v => updateProviderModel(provider.id, v)}
                          onModelBlurSave={v => saveProviderModel(provider.id, v)}
                          onEndpointChange={v => updateProviderEndpoint(provider.id, v)}
                          onEndpointBlurSave={v => saveProviderEndpoint(provider.id, v)}
                          onTest={() => testConnection(provider.id)}
                          onSetActive={() => setActiveProvider(provider.id, model)}
                        />
                      );
                    })}
                  </div>
                </section>

                {/* Custom Providers */}
                <section>
                  <div className="flex items-center justify-between">
                    <SectionHeading icon={<Server className="w-4 h-4" />} label="Custom Providers (OpenAI-compatible)" />
                    <button
                      onClick={() => setShowAddProvider(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
                    >
                      <Plus className="w-3 h-3" /> Add Provider
                    </button>
                  </div>

                  {showAddProvider && (
                    <div className="mt-4 p-6 bg-stone/30 rounded-2xl border border-dawn space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <Field label="Provider Name"><input className={inputClass} value={newProvider.name} onChange={e => setNewProvider(p => ({ ...p, name: e.target.value }))} placeholder="My Local Proxy" /></Field>
                        <Field label="Base URL"><input className={inputClass} value={newProvider.baseUrl} onChange={e => setNewProvider(p => ({ ...p, baseUrl: e.target.value }))} placeholder="https://api.example.com/v1" /></Field>
                        <Field label="Default Model"><input className={inputClass} value={newProvider.defaultModel} onChange={e => setNewProvider(p => ({ ...p, defaultModel: e.target.value }))} placeholder="model-name" /></Field>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={addCustomProvider} className="px-5 py-2 bg-ink text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Add & Save</button>
                        <button onClick={() => setShowAddProvider(false)} className="px-5 py-2 bg-stone border border-dawn text-muted rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                      </div>
                    </div>
                  )}

                  {(config.customProviders || []).length > 0 && (
                    <div className="mt-4 space-y-2">
                      {(config.customProviders || []).map(p => {
                        const key = apiKeys[p.id] || '';
                        const result = testResults[p.id] || 'idle';
                        const isActive = config.aiProvider === p.id;
                        return (
                          <ProviderRow
                            key={p.id}
                            provider={{ id: p.id, name: p.name, badge: '⬡', defaultModel: p.defaultModel, keyPlaceholder: 'Bearer token', color: 'bg-teal-500', adminOnly: false }}
                            apiKey={key}
                            model={providerModels[p.id] || p.defaultModel}
                            endpoint={providerEndpoints[p.id] || p.baseUrl}
                            isActive={isActive}
                            showKey={!!showKeys[p.id]}
                            testResult={result}
                            isAdminOnly={false}
                            isAdmin={isAdmin}
                            onToggleShow={() => setShowKeys(s => ({ ...s, [p.id]: !s[p.id] }))}
                            onKeyChange={v => updateApiKey(p.id, v)}
                            onKeyDelete={() => deleteApiKey(p.id)}
                            onModelChange={v => updateProviderModel(p.id, v)}
                            onModelBlurSave={v => saveProviderModel(p.id, v)}
                            onEndpointChange={v => updateProviderEndpoint(p.id, v)}
                            onEndpointBlurSave={v => saveProviderEndpoint(p.id, v)}
                            onTest={() => testConnection(p.id)}
                            onSetActive={() => setActiveProvider(p.id, providerModels[p.id] || p.defaultModel)}
                            onDelete={() => removeCustomProvider(p.id)}
                          />
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* MCP Servers */}
                <section>
                  <div className="flex items-center justify-between">
                    <SectionHeading icon={<Terminal className="w-4 h-4" />} label="MCP Servers (mcp.json)" />
                    <button
                      onClick={copyMcpTemplate}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-stone border border-dawn rounded-xl text-[9px] font-black uppercase tracking-widest text-muted hover:text-ink hover:border-ink transition-all"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedMcp ? 'Loaded Template' : 'Load Template'}
                    </button>
                  </div>
                  <p className="text-[10px] font-bold text-muted mt-2 mb-4">
                    Paste your MCP configuration JSON. Follows the Claude Desktop format.
                  </p>
                  <textarea
                    value={mcpConfig}
                    onChange={e => { setMcpConfig(e.target.value); setMcpError(''); }}
                    className="w-full h-52 bg-slate-900 text-green-400 font-mono text-xs p-4 rounded-2xl border border-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-citrus/20 custom-scrollbar"
                    spellCheck={false}
                  />
                  {mcpError && (
                    <div className="flex items-center gap-2 mt-2 text-red-500 text-[10px] font-bold">
                      <AlertCircle className="w-3.5 h-3.5" /> {mcpError}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[9px] font-bold text-muted/60">Changes are saved with the MCP Save button below or the main Save Config button.</span>
                    <button onClick={saveMcpConfig} className="flex items-center gap-1.5 px-4 py-2 bg-ink text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all">
                      <Save className="w-3 h-3" /> Save MCP Config
                    </button>
                  </div>
                </section>

                <div className="p-6 bg-citrus/5 border border-citrus/20 rounded-3xl">
                  <div className="flex items-center gap-3 text-citrus mb-2"><KeyRound className="w-5 h-5" /><b className="text-xs uppercase tracking-widest">Local-first key storage</b></div>
                  <p className="text-xs font-bold text-muted leading-relaxed">
                    API keys are stored in <code className="bg-black/5 px-1 rounded font-mono text-[11px]">localStorage</code> under <code className="bg-black/5 px-1 rounded font-mono text-[11px]">trygc_api_keys_v1</code>. They never leave your browser and are saved instantly when you type them.
                  </p>
                </div>
              </div>
            </Panel>
          )}

          {/* ── Security / Auth ── */}
          {canManageWorkspace && activeTab === 'security' && (
            <Panel title="Authentication & Security" desc="Session and access control settings for this local workspace.">
              <div className="grid grid-cols-2 gap-5">
                <Field label="Auth Mode">
                  <select className={inputClass} value={config.authMode || 'none'} onChange={e => { const next = { ...configRef.current, authMode: e.target.value as any }; setConfig(next); saveConfig(next); }}>
                    <option value="none">No Login Required</option>
                    <option value="local">Local Passcode</option>
                  </select>
                </Field>
                <Field label="Min Passcode Length"><input type="number" className={inputClass} value={config.minPasscodeLength || 6} onChange={e => { const next = { ...configRef.current, minPasscodeLength: Number(e.target.value) }; setConfig(next); }} onBlur={() => saveConfig()} /></Field>
              </div>
              <div className="mt-6 p-6 bg-stone/30 border border-dawn rounded-3xl space-y-4">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Active Session</span>
                </div>
                <div className="flex items-center justify-between p-5 bg-white border border-dawn rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-ink text-white flex items-center justify-center text-xs font-black">{user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                    <div>
                      <b className="block text-sm text-ink">{user.name}</b>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{user.role}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isMasterAdmin && <span className="px-2 py-1 bg-citrus/10 text-citrus rounded-lg text-[9px] font-black uppercase tracking-widest">Master Admin</span>}
                    {!isMasterAdmin && isAdmin && <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Admin</span>}
                    <span className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-muted/60">
                    To manage team members and assign roles, go to <button className="text-citrus underline" onClick={() => setActiveTab('users')}>User Management</button>.
                  </p>
                  <button
                    onClick={() => {
                      if (window.confirm('Lock your session? You will need to re-enter your passcode.')) {
                        lock();
                        logout();
                      }
                    }}
                    className="px-4 py-2 bg-stone border border-dawn rounded-xl text-[9px] font-black uppercase tracking-widest text-muted hover:text-ink transition-all"
                  >
                    Lock Session
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {/* ── User Management ── */}
          {canManageWorkspace && activeTab === 'users' && (
            <Panel title="User Management" desc="Create team members, assign roles, update profiles, and switch active users.">
              <div className="space-y-6">

                {/* Search + Add + Import/Export */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      placeholder="Search by name, role, office…"
                      className="w-full bg-stone/50 border border-dawn rounded-xl px-4 py-3 text-sm font-bold focus:border-citrus outline-none"
                    />
                    {memberSearch && (
                      <button onClick={() => setMemberSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {isMasterAdmin && (
                    <>
                      <button
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(members, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `trygc-users-${new Date().toISOString().split('T')[0]}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex items-center gap-2 px-4 py-3 bg-stone border border-dawn rounded-xl text-xs font-black uppercase tracking-widest text-muted hover:text-ink transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export
                      </button>
                      <label className="flex items-center gap-2 px-4 py-3 bg-stone border border-dawn rounded-xl text-xs font-black uppercase tracking-widest text-muted hover:text-ink cursor-pointer transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        Import
                        <input
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              try {
                                const data = JSON.parse(ev.target?.result as string);
                                if (Array.isArray(data)) {
                                  data.forEach(async (m: any) => {
                                    if (m.name) await addMember(m);
                                  });
                                  setImportSuccess(`Imported ${data.length} users successfully.`);
                                  setTimeout(() => setImportSuccess(''), 3000);
                                } else {
                                  setImportError('Invalid format. Expected an array of users.');
                                  setTimeout(() => setImportError(''), 3000);
                                }
                              } catch {
                                setImportError('Invalid JSON file.');
                                setTimeout(() => setImportError(''), 3000);
                              }
                            };
                            reader.readAsText(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </>
                  )}
                  <button
                    onClick={() => { setShowAddMember(v => !v); setNewMemberForm(emptyMember); }}
                    className="flex items-center gap-2 px-5 py-3 bg-ink text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New User
                  </button>
                </div>

                {importError && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600">
                    <AlertCircle className="w-3.5 h-3.5" /> {importError}
                  </div>
                )}
                {importSuccess && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-xs font-bold text-green-600">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {importSuccess}
                  </div>
                )}

                {pendingSignups.length > 0 && (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">Pending Access Requests</p>
                        <p className="text-sm font-medium text-amber-900/80 mt-1">
                          New sign-ups wait here until you approve or reject them.
                        </p>
                      </div>
                      <div className="px-3 py-2 rounded-2xl bg-white text-amber-700 text-xs font-black uppercase tracking-widest">
                        {pendingSignups.length} pending
                      </div>
                    </div>

                    <div className="space-y-3">
                      {pendingSignups.map(request => (
                        <div key={request.id} className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-white px-4 py-4">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-black shrink-0">
                            {request.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-ink truncate">{request.name}</span>
                              <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Pending</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-muted mt-1">
                              <span>{request.email}</span>
                              <span className="text-muted/30">·</span>
                              <span>{request.team}</span>
                              <span className="text-muted/30">·</span>
                              <span>{request.office}</span>
                              <span className="text-muted/30">·</span>
                              <span>{request.country}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => approveSignup(request.id)}
                              className="px-3 py-2 rounded-xl bg-ink text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectSignup(request.id)}
                              className="px-3 py-2 rounded-xl bg-white border border-dawn text-[10px] font-black uppercase tracking-widest text-muted hover:text-red-500 hover:border-red-200 transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add member form */}
                {showAddMember && (
                  <div className="p-6 bg-citrus/5 border-2 border-citrus/20 rounded-3xl space-y-5">
                    <div className="flex items-center gap-2 text-citrus mb-1">
                      <Plus className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Add New User</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Full Name">
                        <input className={inputClass} value={newMemberForm.name} onChange={e => setNewMemberForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sara Ahmed" />
                      </Field>
                      <Field label="Email">
                        <input className={inputClass} type="email" value={newMemberForm.email} onChange={e => setNewMemberForm(f => ({ ...f, email: e.target.value }))} placeholder="name@company.com" />
                      </Field>
                      <Field label="Role">
                        <div className="flex gap-2">
                          <select
                            className={inputClass}
                            value={PRESET_ROLES.includes(newMemberForm.role) ? newMemberForm.role : '__custom__'}
                            onChange={e => {
                              if (e.target.value !== '__custom__') setNewMemberForm(f => ({ ...f, role: e.target.value }));
                            }}
                          >
                            {PRESET_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            <option value="__custom__">Custom…</option>
                          </select>
                        </div>
                        {(!PRESET_ROLES.includes(newMemberForm.role) || newMemberForm.role === '') && (
                          <input className={`${inputClass} mt-2`} value={newMemberForm.role} onChange={e => setNewMemberForm(f => ({ ...f, role: e.target.value }))} placeholder="Custom role…" />
                        )}
                      </Field>
                      <Field label="Team">
                        <select className={inputClass} value={newMemberForm.team} onChange={e => setNewMemberForm(f => ({ ...f, team: e.target.value }))}>
                          {(settings.teams || []).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </Field>
                      <Field label="Office">
                        <input className={inputClass} value={newMemberForm.office} onChange={e => setNewMemberForm(f => ({ ...f, office: e.target.value }))} placeholder="e.g. Cairo HQ" />
                      </Field>
                      <Field label="Country Code">
                        <input className={inputClass} value={newMemberForm.country} onChange={e => setNewMemberForm(f => ({ ...f, country: e.target.value }))} placeholder="EG / KSA / UAE…" maxLength={4} />
                      </Field>
                      <Field label="Temporary Password">
                        <input className={inputClass} type="password" value={newMemberForm.password} onChange={e => setNewMemberForm(f => ({ ...f, password: e.target.value }))} placeholder="Set first password" />
                      </Field>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          if (!newMemberForm.name.trim()) return;
                          await addMember(newMemberForm);
                          setShowAddMember(false);
                          setNewMemberForm(emptyMember);
                        }}
                        className="px-6 py-2.5 bg-citrus text-ink rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
                      >
                        Create User
                      </button>
                      <button onClick={() => setShowAddMember(false)} className="px-6 py-2.5 bg-stone border border-dawn text-muted rounded-xl text-xs font-black uppercase tracking-widest">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Member list */}
                <div className="space-y-2">
                  {members
                    .filter(m => !memberSearch || [m.name, m.role, m.office, m.team].join(' ').toLowerCase().includes(memberSearch.toLowerCase()))
                    .map(m => {
                      const isCurrentUser = m.name === user.name;
                      const isEditing = editingMemberId === m.id;
                      const metrics = getUserMetrics(m.name);

                      return (
                        <div
                          key={m.id}
                          className={`rounded-2xl border transition-all overflow-hidden ${
                            isCurrentUser ? 'border-citrus bg-citrus/3' : isEditing ? 'border-ink/20 bg-stone/30' : 'border-dawn bg-white'
                          }`}
                        >
                          {/* Row header */}
                          <div className="flex items-center gap-4 p-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                              isCurrentUser ? 'bg-ink text-white' : 'bg-stone border border-dawn text-muted'
                            }`}>
                              {m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-ink truncate">{m.name}</span>
                                {isCurrentUser && <span className="text-[8px] font-black uppercase tracking-widest text-citrus">You</span>}
                                {m.role === 'Super Admin' && <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-citrus/10 text-citrus rounded">Super Admin</span>}
                                {isAdminUser(m.role || '') && m.role !== 'Super Admin' && <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">Admin</span>}
                              </div>
                              <div className="flex items-center gap-2 text-[9px] font-bold text-muted uppercase tracking-widest">
                                <span>{m.role || 'No role'}</span>
                                <span className="text-muted/30">·</span>
                                <span>{m.team}</span>
                                <span className="text-muted/30">·</span>
                                <span>{m.office}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted shrink-0 mr-2">
                              <span className="px-2 py-1 bg-stone rounded-lg">{metrics.completed} done</span>
                              <span className="px-2 py-1 bg-stone rounded-lg">{metrics.productivity}% productivity</span>
                              <span className="px-2 py-1 bg-stone rounded-lg">{metrics.onTimeRate}% on-time</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {!isCurrentUser && (
                                <button
                                  onClick={() => { updateUser({ name: m.name, role: m.role || user.role, office: m.office, country: m.country, email: user.email }); }}
                                  title="Switch to this user"
                                  className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest bg-stone border border-dawn rounded-lg text-muted hover:text-citrus hover:border-citrus/40 transition-all"
                                >
                                  Switch
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (isEditing) { setEditingMemberId(null); }
                                  else { setEditingMemberId(m.id); setEditForm({ name: m.name, role: m.role, team: m.team, office: m.office, country: m.country }); }
                                }}
                                className={`p-2 rounded-lg transition-all ${
                                  isEditing ? 'bg-ink text-white' : 'text-muted hover:text-ink hover:bg-stone'
                                }`}
                                title="Edit"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              {deleteConfirmId === m.id ? (
                                <>
                                  <button onClick={async () => { await deleteMember(m.id); setDeleteConfirmId(null); }} className="px-2 py-1.5 bg-red-500 text-white rounded-lg text-[9px] font-black uppercase">Confirm</button>
                                  <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1.5 bg-stone border border-dawn rounded-lg text-[9px] font-black uppercase text-muted">No</button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(m.id)}
                                  disabled={isCurrentUser || (m.role === 'Super Admin' && !isMasterAdmin)}
                                  className="p-2 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Inline edit form */}
                          {isEditing && (
                            <div className="px-5 pb-5 border-t border-dawn/50 pt-4 space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                <Field label="Full Name">
                                  <input className={inputClass} value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                                </Field>
                                <Field label="Role">
                                  <select
                                    className={inputClass}
                                    value={PRESET_ROLES.includes(editForm.role || '') ? editForm.role || '' : '__custom__'}
                                    onChange={e => { if (e.target.value !== '__custom__') setEditForm(f => ({ ...f, role: e.target.value })); }}
                                  >
                                    {PRESET_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                    <option value="__custom__">Custom…</option>
                                  </select>
                                  {!PRESET_ROLES.includes(editForm.role || '') && (
                                    <input className={`${inputClass} mt-2`} value={editForm.role || ''} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} placeholder="Custom role…" />
                                  )}
                                </Field>
                                <Field label="Team">
                                  <select className={inputClass} value={editForm.team || ''} onChange={e => setEditForm(f => ({ ...f, team: e.target.value }))}>
                                    {(settings.teams || []).map(t => <option key={t} value={t}>{t}</option>)}
                                    {editForm.team && !(settings.teams || []).includes(editForm.team) && <option value={editForm.team}>{editForm.team}</option>}
                                  </select>
                                </Field>
                                <Field label="Office">
                                  <input className={inputClass} value={editForm.office || ''} onChange={e => setEditForm(f => ({ ...f, office: e.target.value }))} />
                                </Field>
                                <Field label="Country">
                                  <input className={inputClass} value={editForm.country || ''} onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))} maxLength={4} />
                                </Field>
                              </div>
                              <div className="flex gap-3">
                                <button
                                  onClick={async () => {
                                    await updateMember(m.id, editForm);
                                    if (isCurrentUser && editForm.name && editForm.role) {
                                      await updateUser({ name: editForm.name, role: editForm.role, office: editForm.office || user.office, country: editForm.country || user.country });
                                    }
                                    setEditingMemberId(null);
                                  }}
                                  className="px-5 py-2 bg-ink text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
                                >
                                  Save Changes
                                </button>
                                <button onClick={() => setEditingMemberId(null)} className="px-5 py-2 bg-stone border border-dawn rounded-xl text-xs font-black uppercase tracking-widest text-muted">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {members.filter(m => !memberSearch || [m.name, m.role, m.office, m.team].join(' ').toLowerCase().includes(memberSearch.toLowerCase())).length === 0 && (
                    <div className="py-16 text-center text-muted/40">
                      <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
                      <p className="text-sm font-black">No users match your search.</p>
                    </div>
                  )}
                </div>

                {/* Summary bar */}
                <div className="flex items-center justify-between p-4 bg-stone/40 rounded-2xl border border-dawn text-[10px] font-bold text-muted">
                  <span>{members.length} total users · {members.filter(m => m.role === 'Super Admin').length} super admins · {members.filter(m => isAdminUser(m.role || '') && m.role !== 'Super Admin').length} admins</span>
                  <span>Active: <b className="text-ink">{user.name}</b></span>
                </div>
              </div>
            </Panel>
          )}

          {/* ── Operations ── */}
          {canManageWorkspace && activeTab === 'operations' && (
            <Panel title="Operational Logic" desc="Feature flags and thresholds from the original backend settings.">
              <div className="space-y-4">
                {Object.entries(config.featureFlags || {}).map(([key, active]) => (
                  <ToggleCard key={key} title={labelize(key)} desc={flagDescription(key)} active={!!active} onClick={() => toggleFlag(key)} />
                ))}
              </div>
              <div className="space-y-4 pt-6 border-t border-dawn">
                <SectionHeading icon={<LayoutGrid className="w-4 h-4" />} label="Dashboard Widgets" />
                {WIDGET_KEYS.map(key => (
                  <ToggleCard
                    key={key}
                    title={labelize(key)}
                    desc="Enable or disable this widget across the workspace."
                    active={config.widgetConfig?.[key] !== false}
                    onClick={() => updateWidgetConfig(key)}
                  />
                ))}
              </div>
            </Panel>
          )}

          {/* ── Teams ── */}
          {canManageWorkspace && activeTab === 'teams' && (
            <Panel title="Organizational Grid" desc="Manage active teams permitted to register outcomes.">
              <div className="flex gap-2">
                <input value={newTeam} onChange={e => setNewTeam(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newTeam.trim()) { const next = { ...configRef.current, teams: [...(configRef.current.teams || []), newTeam.trim()] }; setConfig(next); saveConfig(next); setNewTeam(''); } }} placeholder="Enter new team name..." className="flex-1 bg-stone/50 border border-dawn rounded-xl px-4 py-3 font-bold text-sm focus:border-citrus outline-none" />
                <button onClick={() => { if (newTeam.trim()) { const next = { ...configRef.current, teams: [...(configRef.current.teams || []), newTeam.trim()] }; setConfig(next); saveConfig(next); setNewTeam(''); } }} className="px-6 bg-ink text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2"><Plus className="w-3 h-3" /> Add</button>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                {(config.teams || []).map((t, i) => (
                  <div key={t} className="flex items-center justify-between p-4 bg-stone/30 rounded-2xl border border-dawn group">
                    <span className="text-sm font-bold text-ink">{t}</span>
                    <button onClick={() => { const next = { ...configRef.current, teams: configRef.current.teams.filter((_, idx) => idx !== i) }; setConfig(next); saveConfig(next); }} className="p-2 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
              <div className="pt-8 border-t border-dawn space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-black text-ink">Role Access Matrix</h4>
                    <p className="text-sm font-medium text-muted">Assign pages, features, and team visibility per role.</p>
                  </div>
                  <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className={inputClass}>
                    {Object.keys(roleProfiles).map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Pages</span>
                    {APP_PAGES.map(page => (
                      <label key={page} className="flex items-center justify-between p-3 bg-stone/30 border border-dawn rounded-xl">
                        <span className="text-xs font-bold text-ink">{labelize(page)}</span>
                        <input
                          type="checkbox"
                          checked={editableRoleProfile.pages.includes(page)}
                          onChange={e => updateRoleProfile(selectedRole, { pages: e.target.checked ? [...editableRoleProfile.pages, page] : editableRoleProfile.pages.filter(item => item !== page) })}
                          className="w-4 h-4 accent-citrus"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Features</span>
                    {FEATURE_KEYS.map(feature => (
                      <label key={feature} className="flex items-center justify-between p-3 bg-stone/30 border border-dawn rounded-xl">
                        <span className="text-xs font-bold text-ink">{labelize(feature)}</span>
                        <input
                          type="checkbox"
                          checked={editableRoleProfile.features.includes(feature)}
                          onChange={e => updateRoleProfile(selectedRole, { features: e.target.checked ? [...editableRoleProfile.features, feature] : editableRoleProfile.features.filter(item => item !== feature) })}
                          className="w-4 h-4 accent-citrus"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Team Scope</span>
                    <label className="flex items-center justify-between p-3 bg-stone/30 border border-dawn rounded-xl">
                      <span className="text-xs font-bold text-ink">All Teams</span>
                      <input
                        type="checkbox"
                        checked={editableRoleProfile.teams.includes('*')}
                        onChange={e => updateRoleProfile(selectedRole, { teams: e.target.checked ? ['*'] : [] })}
                        className="w-4 h-4 accent-citrus"
                      />
                    </label>
                    {(config.teams || []).map(team => (
                      <label key={team} className="flex items-center justify-between p-3 bg-stone/30 border border-dawn rounded-xl">
                        <span className="text-xs font-bold text-ink">{team}</span>
                        <input
                          type="checkbox"
                          checked={editableRoleProfile.teams.includes('*') || editableRoleProfile.teams.includes(team)}
                          disabled={editableRoleProfile.teams.includes('*')}
                          onChange={e => updateRoleProfile(selectedRole, { teams: e.target.checked ? [...editableRoleProfile.teams.filter(item => item !== '*'), team] : editableRoleProfile.teams.filter(item => item !== team && item !== '*') })}
                          className="w-4 h-4 accent-citrus"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {/* ── Data ── */}
          {canManageWorkspace && activeTab === 'data' && (
            <Panel title="Data Management & Audit" desc="Backup, reset, and review local configuration events.">
              <div className="grid grid-cols-3 gap-6">
                <button onClick={handleExportData} className="flex flex-col items-center justify-center p-8 bg-white border border-dawn rounded-[32px] hover:border-citrus transition-all group">
                  <Download className="w-8 h-8 text-muted group-hover:text-citrus transition-colors mb-4" />
                  <span className="font-black text-xs uppercase tracking-widest text-ink">Export Workspace</span>
                  <span className="text-[9px] font-bold text-muted/40 mt-2 text-center px-2">Download all local data as JSON.</span>
                </button>
                <label className="flex flex-col items-center justify-center p-8 bg-white border border-dawn rounded-[32px] hover:border-citrus transition-all group cursor-pointer">
                  <Upload className="w-8 h-8 text-muted group-hover:text-citrus transition-colors mb-4" />
                  <span className="font-black text-xs uppercase tracking-widest text-ink">Import Workspace</span>
                  <span className="text-[9px] font-bold text-muted/40 mt-2 text-center px-2">Restore from a JSON backup.</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const result = importData(ev.target?.result as string);
                        if (result) {
                          setImportSuccess('Workspace imported successfully. Reloading...');
                          setTimeout(() => window.location.reload(), 1000);
                        } else {
                          setImportError('Invalid workspace file. Please check the file format.');
                          setTimeout(() => setImportError(''), 3000);
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                <button onClick={() => setShowConfirmReset(true)} className="flex flex-col items-center justify-center p-8 bg-white border border-dawn rounded-[32px] hover:border-red-500 transition-all group">
                  <Trash2 className="w-8 h-8 text-muted group-hover:text-red-500 transition-colors mb-4" />
                  <span className="font-black text-xs uppercase tracking-widest text-red-500">Atomic Reset</span>
                  <span className="text-[9px] font-bold text-muted/40 mt-2 text-center px-2">Wipe local browser data. Irreversible.</span>
                </button>
              </div>
              {importError && (
                <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600">
                  <AlertCircle className="w-3.5 h-3.5" /> {importError}
                </div>
              )}
              {importSuccess && (
                <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-xs font-bold text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {importSuccess}
                </div>
              )}
              {showConfirmReset && (
                <div className="mt-6 p-8 bg-red-50 border border-red-100 rounded-3xl space-y-6">
                  <div className="flex gap-4"><AlertCircle className="w-6 h-6 text-red-500 shrink-0" /><p className="text-xs font-bold text-red-900/60 leading-relaxed">You are about to delete all local tasks, offices, handovers, settings, members, and audit logs.</p></div>
                  <button onClick={handleResetData} disabled={saving} className="px-6 py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50">{saving ? 'Resetting...' : 'Yes, Confirm Deletion'}</button>
                </div>
              )}
              <div className="mt-8 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted">Recent Audit</h4>
                {(auditLogs || []).slice(0, 10).map(event => (
                  <div key={event.id} className="p-3 bg-stone/30 border border-dawn rounded-xl text-xs font-bold text-muted"><b className="text-ink">{event.action}</b> · {new Date(event.timestamp).toLocaleString()}</div>
                ))}
                {(!auditLogs || auditLogs.length === 0) && (
                  <p className="text-xs font-bold text-muted/40 text-center py-4">No audit events yet.</p>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function StatBox({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="p-4 bg-white border border-dawn rounded-2xl">
      <span className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">{label}</span>
      <span className={`block text-2xl font-black relaxed-title ${color}`}>{value}</span>
      <span className="block text-[9px] font-bold text-muted/60">{sub}</span>
    </div>
  );
}

interface ProviderRowProps {
  key?: string | number;
  provider: { id: string; name: string; badge: string; defaultModel: string; keyPlaceholder: string; color: string; adminOnly: boolean };
  apiKey: string;
  model: string;
  endpoint: string;
  isActive: boolean;
  showKey: boolean;
  testResult: 'idle' | 'testing' | 'ok' | 'fail';
  isAdminOnly: boolean;
  isAdmin: boolean;
  onToggleShow: () => void;
  onKeyChange: (v: string) => void;
  onKeyDelete: () => void;
  onModelChange: (v: string) => void;
  onModelBlurSave: (v: string) => void;
  onEndpointChange: (v: string) => void;
  onEndpointBlurSave: (v: string) => void;
  onTest: () => void;
  onSetActive: () => void;
  onDelete?: () => void;
}

function ProviderRow({ provider, apiKey, model, endpoint, isActive, showKey, testResult, isAdminOnly, isAdmin, onToggleShow, onKeyChange, onKeyDelete, onModelChange, onModelBlurSave, onEndpointChange, onEndpointBlurSave, onTest, onSetActive, onDelete }: ProviderRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [localModel, setLocalModel] = useState(model);
  const [localEndpoint, setLocalEndpoint] = useState(endpoint);

  useEffect(() => setLocalModel(model), [model]);
  useEffect(() => setLocalEndpoint(endpoint), [endpoint]);

  return (
    <div className={`rounded-2xl border transition-all ${isActive ? 'border-citrus bg-citrus/3' : 'border-dawn bg-stone/20'}`}>
      <div className="flex items-center gap-3 p-4">
        <div className={`w-8 h-8 ${provider.color} text-white rounded-xl flex items-center justify-center text-xs font-black shrink-0`}>
          {provider.badge}
        </div>

        <div className="w-36 shrink-0">
          <span className="block text-sm font-black text-ink">{provider.name}</span>
          <div className="flex items-center gap-1.5">
            {isActive && <span className="text-[8px] font-black uppercase tracking-widest text-citrus">Active</span>}
            {isAdminOnly && <span className="text-[7px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-1 py-0.5 rounded">Admin</span>}
          </div>
        </div>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => onKeyChange(e.target.value)}
              placeholder={provider.keyPlaceholder}
              disabled={isAdminOnly && !isAdmin}
              className="w-full bg-white border border-dawn rounded-xl px-3 py-2 text-xs font-mono focus:border-citrus outline-none pr-16 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {apiKey && isAdmin && (
                <button onClick={onKeyDelete} className="text-red-400 hover:text-red-600 transition-colors" title="Delete key">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              {apiKey && (
                <button onClick={onToggleShow} className="text-muted hover:text-ink">
                  <span className="text-[8px] font-black">{showKey ? 'hide' : 'show'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <TestBadge result={testResult} />
          <button
            onClick={onTest}
            disabled={testResult === 'testing' || (!apiKey && provider.id !== 'local')}
            className="px-3 py-1.5 bg-stone border border-dawn rounded-lg text-[9px] font-black uppercase tracking-widest text-muted hover:text-ink hover:border-ink transition-all disabled:opacity-40"
          >
            {testResult === 'testing' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Test'}
          </button>
          {!isActive && (
            <button onClick={onSetActive} className="px-3 py-1.5 bg-citrus/10 border border-citrus/30 rounded-lg text-[9px] font-black uppercase tracking-widest text-citrus hover:bg-citrus hover:text-white transition-all">
              Use
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-1.5 text-muted hover:text-red-500 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => setExpanded(v => !v)} className="p-1.5 text-muted hover:text-ink transition-all">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-3 border-t border-dawn/50 pt-3">
          <div>
            <span className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Model</span>
            <input
              className="w-full bg-white border border-dawn rounded-xl px-3 py-2 text-xs font-mono focus:border-citrus outline-none"
              value={localModel}
              onChange={e => { setLocalModel(e.target.value); onModelChange(e.target.value); }}
              onBlur={() => onModelBlurSave(localModel)}
              placeholder={provider.defaultModel}
            />
          </div>
          <div>
            <span className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Custom Endpoint (auto-saved on blur)</span>
            <input
              className="w-full bg-white border border-dawn rounded-xl px-3 py-2 text-xs font-mono focus:border-citrus outline-none"
              value={localEndpoint}
              onChange={e => { setLocalEndpoint(e.target.value); onEndpointChange(e.target.value); }}
              onBlur={() => onEndpointBlurSave(localEndpoint)}
              placeholder="https://..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TestBadge({ result }: { result: 'idle' | 'testing' | 'ok' | 'fail' }) {
  if (result === 'idle') return null;
  if (result === 'testing') return <Loader2 className="w-3.5 h-3.5 animate-spin text-muted" />;
  if (result === 'ok') return <span className="flex items-center gap-1 text-green-600 text-[9px] font-black uppercase"><Wifi className="w-3 h-3" /> OK</span>;
  return <span className="flex items-center gap-1 text-red-500 text-[9px] font-black uppercase"><WifiOff className="w-3 h-3" /> Fail</span>;
}

function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
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

function ToggleCard({ title, desc, active, onClick }: { key?: string | number; title: string; desc: string; active: boolean; onClick: () => void }) {
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

function labelize(key: string) { return key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()); }

function flagDescription(key: string) {
  const d: Record<string, string> = {
    autoRiskFlagging: 'Flag high-risk tasks when priority, blocked status, or SLA pressure requires attention.',
    carryOverThreshold: 'Highlight tasks that must move into the next shift handover.',
    officeIsolation: 'Separate office-level queues, reporting, and handover context.',
    teamIsolation: 'Separate Operations and Community team workflows.',
    shiftOverlapBuffer: 'Display adjacent shift context for smoother handovers.',
    aiBriefGeneration: 'Enable AI-assisted brief and watchout generation.',
    localBackups: 'Enable local JSON backup and restore workflows.',
  };
  return d[key] || 'Workspace feature toggle.';
}



const inputClass = 'w-full bg-stone/50 border border-dawn rounded-xl px-4 py-3 font-bold text-sm focus:border-citrus outline-none';
