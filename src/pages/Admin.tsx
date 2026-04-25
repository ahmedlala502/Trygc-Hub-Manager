/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Archive,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Database,
  Download,
  Key,
  Lock,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  Upload,
  Users,
} from 'lucide-react';

type AdminRole = 'Owner' | 'Super Admin' | 'Ops Lead' | 'Finance' | 'Viewer';
type AccessLevel = 'Full' | 'Scoped' | 'Read Only';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  access: AccessLevel;
  status: 'Active' | 'Suspended';
  lastSeen: string;
};

type ModulePolicy = {
  id: string;
  label: string;
  description: string;
  owner: AdminRole;
  enabled: boolean;
  approvalRequired: boolean;
};

type FeatureFlag = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

const STORAGE_KEY = 'trygc-admin-access-center';

const defaultUsers: AdminUser[] = [
  {
    id: 'usr-owner',
    name: 'Admin User',
    email: 'admin@trygc.com',
    role: 'Owner',
    access: 'Full',
    status: 'Active',
    lastSeen: 'Now',
  },
  {
    id: 'usr-ops',
    name: 'Sarah A.',
    email: 'sarah.ops@trygc.com',
    role: 'Ops Lead',
    access: 'Full',
    status: 'Active',
    lastSeen: '8m ago',
  },
  {
    id: 'usr-finance',
    name: 'Ahmed E.',
    email: 'finance@trygc.com',
    role: 'Finance',
    access: 'Scoped',
    status: 'Active',
    lastSeen: '32m ago',
  },
  {
    id: 'usr-viewer',
    name: 'Client QA',
    email: 'qa@trygc.com',
    role: 'Viewer',
    access: 'Read Only',
    status: 'Active',
    lastSeen: '1h ago',
  },
];

const defaultPolicies: ModulePolicy[] = [
  { id: 'campaigns', label: 'Campaign Registry', description: 'Create, edit, import, export, and archive campaign records.', owner: 'Ops Lead', enabled: true, approvalRequired: false },
  { id: 'influencers', label: 'Creator Roster', description: 'Manage creator records, campaign matching, and roster exports.', owner: 'Ops Lead', enabled: true, approvalRequired: false },
  { id: 'discovery', label: 'AI Discovery', description: 'Use configured AI providers for creator discovery and scoring.', owner: 'Super Admin', enabled: true, approvalRequired: true },
  { id: 'tasks', label: 'Task Management', description: 'Assign, reassign, edit, and close operational tasks.', owner: 'Ops Lead', enabled: true, approvalRequired: false },
  { id: 'settings', label: 'Settings & Theme', description: 'Customize dashboards, widgets, providers, and workspace identity.', owner: 'Owner', enabled: true, approvalRequired: true },
  { id: 'audit', label: 'Audit Logs', description: 'Review admin changes, data exports, and sensitive operations.', owner: 'Owner', enabled: true, approvalRequired: true },
  { id: 'billing', label: 'Billing & Vendors', description: 'Control payment references, vendor notes, and finance exports.', owner: 'Finance', enabled: true, approvalRequired: true },
  { id: 'reports', label: 'Reporting Center', description: 'Publish operational reports and download stakeholder summaries.', owner: 'Ops Lead', enabled: true, approvalRequired: false },
];

const defaultFlags: FeatureFlag[] = [
  { id: 'maintenance', label: 'Maintenance Mode', description: 'Temporarily pause public workflows while admins continue working.', enabled: false },
  { id: 'strict-rbac', label: 'Strict RBAC', description: 'Require module-level permissions before saving sensitive changes.', enabled: true },
  { id: 'bulk-upload', label: 'Bulk Uploads', description: 'Allow CSV and Excel imports for campaigns and influencers.', enabled: true },
  { id: 'ai-discovery', label: 'Provider AI Discovery', description: 'Enable configured AI providers from Settings for discovery runs.', enabled: true },
  { id: 'daily-digest', label: 'Daily Digest', description: 'Send the operations digest to stakeholders at 9:00 AM.', enabled: true },
];

export default function Admin() {
  const [users, setUsers] = useState<AdminUser[]>(defaultUsers);
  const [policies, setPolicies] = useState<ModulePolicy[]>(defaultPolicies);
  const [flags, setFlags] = useState<FeatureFlag[]>(defaultFlags);
  const [search, setSearch] = useState('');
  const [savedAt, setSavedAt] = useState('Ready');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.users)) setUsers(parsed.users);
      if (Array.isArray(parsed.policies)) setPolicies(parsed.policies);
      if (Array.isArray(parsed.flags)) setFlags(parsed.flags);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ users, policies, flags }));
  }, [flags, policies, users]);

  const visibleUsers = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return users;
    return users.filter(user =>
      [user.name, user.email, user.role, user.access, user.status].some(item => item.toLowerCase().includes(value)),
    );
  }, [search, users]);

  const fullAccessCount = users.filter(user => user.access === 'Full' && user.status === 'Active').length;
  const activeModules = policies.filter(policy => policy.enabled).length;
  const enabledFlags = flags.filter(flag => flag.enabled).length;

  const updateUser = (id: string, patch: Partial<AdminUser>) => {
    setUsers(prev => prev.map(user => (user.id === id ? { ...user, ...patch } : user)));
    setSavedAt('Saved locally');
  };

  const updatePolicy = (id: string, patch: Partial<ModulePolicy>) => {
    setPolicies(prev => prev.map(policy => (policy.id === id ? { ...policy, ...patch } : policy)));
    setSavedAt('Saved locally');
  };

  const updateFlag = (id: string) => {
    setFlags(prev => prev.map(flag => (flag.id === id ? { ...flag, enabled: !flag.enabled } : flag)));
    setSavedAt('Saved locally');
  };

  const grantFullAccess = () => {
    setUsers(prev => prev.map(user => ({ ...user, access: 'Full', status: 'Active' })));
    setPolicies(prev => prev.map(policy => ({ ...policy, enabled: true })));
    setFlags(prev => prev.map(flag => (flag.id === 'maintenance' ? { ...flag, enabled: false } : { ...flag, enabled: true })));
    setSavedAt('Full access enabled');
  };

  const resetDefaults = () => {
    setUsers(defaultUsers);
    setPolicies(defaultPolicies);
    setFlags(defaultFlags);
    setSavedAt('Defaults restored');
  };

  return (
    <div className="max-w-[1240px] mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gc-orange" />
        <div className="absolute -right-14 -top-16 h-48 w-48 rounded-full bg-gc-orange/10" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gc-orange/10 border border-gc-orange/20 rounded-lg text-[9.5px] font-extrabold uppercase tracking-widest text-gc-orange mb-3">
              <Lock size={11} /> Root Access Enabled
            </div>
            <h2 className="font-condensed font-extrabold text-[26px] tracking-tight text-foreground">Admin Control Center</h2>
            <p className="text-[12px] font-semibold text-muted-foreground mt-1 max-w-2xl">
              Full workspace control for permissions, modules, provider access, bulk operations, data tools, and audit visibility.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 min-w-full xl:min-w-[450px]">
            <Metric label="Full Access" value={fullAccessCount.toString()} tone="orange" />
            <Metric label="Modules Live" value={`${activeModules}/${policies.length}`} tone="green" />
            <Metric label="Features On" value={`${enabledFlags}/${flags.length}`} tone="purple" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-6">
        <div className="space-y-6">
          <section className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gc-orange">Access Directory</p>
                <h3 className="font-condensed font-extrabold text-[18px] text-foreground">Admins, Roles & Session Control</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <label className="h-10 min-w-[260px] bg-secondary border border-border rounded-lg px-3 flex items-center gap-2 focus-within:border-gc-orange">
                  <Search size={14} className="text-muted-foreground" />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search admins"
                    className="w-full bg-transparent outline-none text-[12px] font-semibold text-foreground placeholder:text-muted-foreground"
                  />
                </label>
                <button onClick={grantFullAccess} className="h-10 px-4 rounded-lg bg-gc-orange text-white text-[11px] font-extrabold uppercase tracking-widest hover:bg-gc-orange-hover transition-colors flex items-center justify-center gap-2">
                  <ShieldCheck size={14} /> Grant All
                </button>
              </div>
            </div>

            <div className="divide-y divide-border">
              {visibleUsers.map(user => (
                <div key={user.id} className="p-5 grid grid-cols-1 lg:grid-cols-[1.1fr_0.85fr_0.75fr_auto] gap-4 items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-lg bg-gc-orange/10 text-gc-orange flex items-center justify-center font-condensed font-black text-[14px]">
                      {user.name.split(' ').map(part => part[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold text-foreground truncate">{user.name}</p>
                      <p className="text-[11px] font-semibold text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={user.role}
                      onChange={value => updateUser(user.id, { role: value as AdminRole })}
                      options={['Owner', 'Super Admin', 'Ops Lead', 'Finance', 'Viewer']}
                    />
                    <Select
                      value={user.access}
                      onChange={value => updateUser(user.id, { access: value as AccessLevel })}
                      options={['Full', 'Scoped', 'Read Only']}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateUser(user.id, { status: user.status === 'Active' ? 'Suspended' : 'Active' })}
                      className={`h-9 px-3 rounded-lg border text-[10px] font-extrabold uppercase tracking-widest transition-colors ${
                        user.status === 'Active'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-red-50 border-red-200 text-red-600'
                      }`}
                    >
                      {user.status}
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{user.lastSeen}</span>
                  </div>

                  <button
                    onClick={() => updateUser(user.id, { access: 'Full', status: 'Active' })}
                    className="h-9 px-3 rounded-lg bg-secondary border border-border text-[10px] font-extrabold uppercase tracking-widest text-foreground hover:border-gc-orange hover:text-gc-orange transition-colors"
                  >
                    Full Access
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gc-orange">Permission Matrix</p>
                <h3 className="font-condensed font-extrabold text-[18px] text-foreground">Editable Module Access</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{savedAt}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
              {policies.map(policy => (
                <div key={policy.id} className="border border-border rounded-xl p-4 bg-background hover:border-gc-orange/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-condensed font-extrabold text-[15px] text-foreground">{policy.label}</h4>
                      <p className="text-[11px] font-semibold text-muted-foreground leading-relaxed mt-1">{policy.description}</p>
                    </div>
                    <button
                      onClick={() => updatePolicy(policy.id, { enabled: !policy.enabled })}
                      className={`shrink-0 ${policy.enabled ? 'text-gc-orange' : 'text-muted-foreground'}`}
                      aria-label={`Toggle ${policy.label}`}
                    >
                      {policy.enabled ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-[1fr_auto] gap-2 items-center">
                    <Select
                      value={policy.owner}
                      onChange={value => updatePolicy(policy.id, { owner: value as AdminRole })}
                      options={['Owner', 'Super Admin', 'Ops Lead', 'Finance', 'Viewer']}
                    />
                    <button
                      onClick={() => updatePolicy(policy.id, { approvalRequired: !policy.approvalRequired })}
                      className={`h-9 px-3 rounded-lg border text-[10px] font-extrabold uppercase tracking-widest ${
                        policy.approvalRequired
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'bg-secondary border-border text-muted-foreground'
                      }`}
                    >
                      {policy.approvalRequired ? 'Approval' : 'Direct'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gc-orange">Feature Gates</p>
                <h3 className="font-condensed font-extrabold text-[17px] text-foreground">Workspace Switchboard</h3>
              </div>
              <SlidersHorizontal size={18} className="text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {flags.map(flag => (
                <button
                  key={flag.id}
                  onClick={() => updateFlag(flag.id)}
                  className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-left hover:border-gc-orange/50 transition-colors"
                >
                  <span>
                    <span className="block text-[12px] font-extrabold text-foreground">{flag.label}</span>
                    <span className="block text-[10.5px] font-semibold text-muted-foreground mt-0.5">{flag.description}</span>
                  </span>
                  {flag.enabled ? <ToggleRight size={32} className="text-gc-orange" /> : <ToggleLeft size={32} className="text-muted-foreground" />}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gc-orange">Data Tools</p>
              <h3 className="font-condensed font-extrabold text-[17px] text-foreground">Backups, Imports & Exports</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ActionButton icon={<Download size={14} />} label="Export Data" />
              <ActionButton icon={<Upload size={14} />} label="Import Data" />
              <ActionButton icon={<Archive size={14} />} label="Create Backup" />
              <ActionButton icon={<RotateCcw size={14} />} label="Restore Point" />
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-start gap-3">
              <CheckCircle2 size={16} className="text-emerald-600 mt-0.5" />
              <div>
                <p className="text-[11px] font-extrabold text-emerald-800">Auto-save enabled</p>
                <p className="text-[10.5px] font-semibold text-emerald-700/80 mt-0.5">Admin changes are stored in this workspace profile.</p>
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gc-orange">Integrations</p>
              <h3 className="font-condensed font-extrabold text-[17px] text-foreground">Provider & API Access</h3>
            </div>
            {[
              { icon: <Key size={15} />, label: 'AI Provider Keys', value: 'Managed in Settings', status: 'Ready' },
              { icon: <Cloud size={15} />, label: 'Bulk Upload Pipeline', value: 'Excel + CSV enabled', status: 'Live' },
              { icon: <Database size={15} />, label: 'Local Workspace Store', value: 'Persistent profile', status: 'Synced' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                <div className="h-9 w-9 rounded-lg bg-gc-orange/10 text-gc-orange flex items-center justify-center">{item.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-extrabold text-foreground">{item.label}</p>
                  <p className="text-[10.5px] font-semibold text-muted-foreground">{item.value}</p>
                </div>
                <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-emerald-600">{item.status}</span>
              </div>
            ))}
          </section>

          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gc-orange">Audit Trail</p>
                <h3 className="font-condensed font-extrabold text-[17px] text-foreground">Recent Admin Events</h3>
              </div>
              <Activity size={17} className="text-muted-foreground" />
            </div>
            {[
              'Root access confirmed for Admin User',
              'AI discovery provider controls enabled',
              'Bulk upload permissions opened',
              'Task management module granted',
            ].map((event, index) => (
              <div key={event} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-gc-orange font-condensed font-black text-[12px]">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-bold text-foreground truncate">{event}</p>
                  <p className="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground">{index === 0 ? 'Now' : `${index * 12}m ago`}</p>
                </div>
                <ChevronRight size={13} className="text-muted-foreground" />
              </div>
            ))}
          </section>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={resetDefaults} className="h-10 rounded-lg border border-border bg-card text-[10px] font-extrabold uppercase tracking-widest text-foreground hover:border-gc-orange transition-colors flex items-center justify-center gap-2">
              <RotateCcw size={13} /> Reset
            </button>
            <button onClick={() => setSavedAt('Saved just now')} className="h-10 rounded-lg bg-gc-orange text-white text-[10px] font-extrabold uppercase tracking-widest hover:bg-gc-orange-hover transition-colors flex items-center justify-center gap-2">
              <Save size={13} /> Save
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'orange' | 'green' | 'purple' }) {
  const tones = {
    orange: 'text-gc-orange bg-gc-orange/10 border-gc-orange/20',
    green: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-[9.5px] font-extrabold uppercase tracking-widest opacity-70">{label}</p>
      <p className="font-condensed font-black text-[24px] leading-none mt-2">{value}</p>
    </div>
  );
}

function Select({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="h-9 w-full rounded-lg border border-border bg-card px-3 text-[11px] font-bold text-foreground outline-none focus:border-gc-orange"
    >
      {options.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="h-10 rounded-lg border border-border bg-secondary text-[10px] font-extrabold uppercase tracking-widest text-foreground hover:border-gc-orange hover:text-gc-orange transition-colors flex items-center justify-center gap-2">
      {icon}
      {label}
    </button>
  );
}
