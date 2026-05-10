import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal,
  Flame,
  ShieldAlert,
  Clock,
  CheckCircle2,
  X
} from 'lucide-react';
import { cn } from '../utils';
import { dataService } from '../services/dataService';
import { Blocker } from '../types';

export default function BlockersWorkspace() {
  const [blockers, setBlockers] = useState<Blocker[]>(dataService.getBlockers());
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newBlocker, setNewBlocker] = useState({
    summary: '',
    impact: '',
    campaignId: 'C-001',
    ownerId: 'Admin User',
    severity: 'High' as Blocker['severity'],
  });

  const filteredBlockers = blockers.filter(b => 
    b.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.impact.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateStatus = (id: string, status: Blocker['status']) => {
    setBlockers(dataService.updateBlocker(id, { status }));
  };

  const handleUpdateSeverity = (id: string, severity: Blocker['severity']) => {
    setBlockers(dataService.updateBlocker(id, { severity }));
  };

  const addBlocker = () => {
    if (!newBlocker.summary.trim()) return;
    const now = Date.now();
    const blocker: Blocker = {
      id: `B-${now}`,
      campaignId: newBlocker.campaignId,
      summary: newBlocker.summary,
      impact: newBlocker.impact || 'Impact pending triage',
      status: 'Open',
      severity: newBlocker.severity,
      ownerId: newBlocker.ownerId,
      createdAt: now,
      updatedAt: now,
      createdBy: 'admin',
    };
    setBlockers(dataService.addBlocker(blocker));
    setIsAddOpen(false);
    setNewBlocker({ summary: '', impact: '', campaignId: 'C-001', ownerId: 'Admin User', severity: 'High' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-10">
        <div>
          <div className="text-[9.5px] font-bold uppercase tracking-[1.5px] text-gc-orange text-[var(--danger)]/80">Crisis Management</div>
          <h2 className="font-condensed font-extrabold text-[22px] tracking-tight text-foreground">Risk Radar</h2>
          <p className="text-[var(--ink-700)] flex items-center gap-2 mt-2 font-medium">
            <ShieldAlert size={16} className="text-[var(--danger)]" />
            Tracking {blockers.filter(b => b.status === 'Open').length} active systemic bottlenecks.
          </p>
        </div>
        <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 px-6 py-3.5 bg-gc-orange text-white rounded-xl text-[12px] font-display font-black uppercase tracking-widest hover:bg-gc-orange-hover transition-all shadow-lg shadow-gc-orange/20">
          <Plus size={18} /> Signal Escalation
        </button>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/30 p-4" onClick={() => setIsAddOpen(false)}>
          <div className="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gc-orange">Crisis Management</p>
                <h3 className="font-condensed text-[20px] font-extrabold text-foreground">Signal Escalation</h3>
              </div>
              <button className="icon-btn" onClick={() => setIsAddOpen(false)}><X size={15} /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 py-5">
              <label className="space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Risk Summary</span>
                <input className="settings-input" value={newBlocker.summary} onChange={(event) => setNewBlocker({ ...newBlocker, summary: event.target.value })} placeholder="Example: Visit proof mismatch for @creator" />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Impact</span>
                <textarea className="settings-input min-h-[90px]" value={newBlocker.impact} onChange={(event) => setNewBlocker({ ...newBlocker, impact: event.target.value })} placeholder="Describe the operational impact..." />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Campaign</span>
                  <input className="settings-input" value={newBlocker.campaignId} onChange={(event) => setNewBlocker({ ...newBlocker, campaignId: event.target.value })} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Owner</span>
                  <input className="settings-input" value={newBlocker.ownerId} onChange={(event) => setNewBlocker({ ...newBlocker, ownerId: event.target.value })} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Severity</span>
                  <select className="settings-input" value={newBlocker.severity} onChange={(event) => setNewBlocker({ ...newBlocker, severity: event.target.value as Blocker['severity'] })}>
                    {['Low', 'Medium', 'High', 'Critical'].map(severity => <option key={severity}>{severity}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button onClick={() => setIsAddOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-accent">Cancel</button>
              <button onClick={addBlocker} className="rounded-lg bg-gc-orange px-4 py-2 text-sm font-bold text-white hover:bg-gc-orange/90">Add Blocker</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card border border-border rounded-xl overflow-hidden bg-[var(--bg)] overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] flex items-center gap-4 bg-[var(--bg)]/50">
               <div className="relative flex-1">
                 <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-400)] transition-colors peer-focus:text-[var(--danger)]" />
                 <input 
                   className="peer w-full pl-12 pr-4 py-3 text-[14px] outline-none font-bold text-[var(--ink-900)] bg-[var(--bg)] border border-[var(--border-strong)] rounded-xl focus:ring-[4px] focus:ring-[rgba(180,35,24,0.1)] focus:border-[var(--danger)] transition-all shadow-sm placeholder:text-[var(--ink-300)] placeholder:font-medium" 
                   placeholder="Search blockers, impacts, or owners..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
               </div>
               <button className="flex items-center gap-2 px-5 py-3 h-[46px] border border-[var(--border-strong)] rounded-xl text-[12px] font-bold text-[var(--ink-700)] bg-[var(--bg)] hover:bg-[var(--ink-100)] hover:border-[var(--ink-300)] transition-all shadow-sm">
                  <Filter size={16} /> Severity Filter
               </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground bg-muted/30 border-b border-border">Risk Summary</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground bg-muted/30 border-b border-border">Severity</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground bg-muted/30 border-b border-border">Status</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground bg-muted/30 border-b border-border">Owner</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground bg-muted/30 border-b border-border text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--white)]">
                  {filteredBlockers.length > 0 ? filteredBlockers.map((b) => (
                    <tr key={b.id} className="group hover:bg-[var(--danger-soft)]/20 transition-all border-l-4 border-transparent hover:border-l-[var(--danger)]">
                      <td className="px-5 py-3.5 border-b border-border bg-card group-hover:bg-accent/40 transition-colors pl-5">
                        <div className="flex gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border",
                            b.severity === 'Critical' ? "bg-red-50 text-[var(--danger)] border-red-200" : "bg-orange-50 text-[var(--warning)] border-orange-200"
                          )}>
                            <AlertTriangle size={22} strokeWidth={2.5} />
                          </div>
                          <div>
                            <input 
                              className="text-[14px] font-bold text-[var(--ink-900)] bg-transparent border-none outline-none focus:ring-2 focus:ring-[var(--danger-soft)] rounded px-1 -mx-1 w-full placeholder:text-[var(--ink-300)] transition-all"
                              value={b.summary}
                              onChange={(e) => {
                                setBlockers(dataService.updateBlocker(b.id, { summary: e.target.value }));
                              }}
                            />
                            <p className="text-[12px] text-[var(--ink-500)] mt-1 max-w-md line-clamp-1 italic">{b.impact}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 border-b border-border bg-card group-hover:bg-accent/40 transition-colors">
                         <select 
                           value={b.severity}
                           onChange={(e) => handleUpdateSeverity(b.id, e.target.value as any)}
                           className={cn(
                             "text-[11px] font-display font-black uppercase tracking-widest outline-none appearance-none cursor-pointer bg-transparent",
                             b.severity === 'Critical' ? "text-[var(--danger)]" : 
                             b.severity === 'High' ? "text-orange-600 dark:text-orange-400" : "text-[var(--warning)]"
                           )}
                         >
                           {['Low', 'Medium', 'High', 'Critical'].map(s => <option key={s} value={s} className="text-[var(--ink-900)]">{s}</option>)}
                         </select>
                      </td>
                      <td className="px-5 py-3.5 border-b border-border bg-card group-hover:bg-accent/40 transition-colors">
                         <select 
                           value={b.status}
                           onChange={(e) => handleUpdateStatus(b.id, e.target.value as any)}
                           className={cn(
                             "text-[10px] font-display font-black uppercase tracking-widest px-3 py-1.5 rounded-full outline-none leading-none shadow-sm cursor-pointer",
                             b.status === 'Resolved' ? "bg-[var(--success)]/10 text-[var(--success)]" :
                             b.status === 'Escalated' ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--warning)]/10 text-[var(--warning)]"
                           )}
                         >
                           {['Open', 'Resolved', 'Escalated'].map(s => <option key={s} value={s} className="text-[var(--ink-900)] font-sans tracking-normal font-medium">{s}</option>)}
                         </select>
                      </td>
                      <td className="px-5 py-3.5 border-b border-border bg-card group-hover:bg-accent/40 transition-colors">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold text-[var(--ink-700)]">
                             {b.ownerId?.substring(0, 2).toUpperCase()}
                           </div>
                           <span className="text-[13px] font-bold text-[var(--ink-900)]">{b.ownerId}</span>
                         </div>
                       </td>
                      <td className="px-5 py-3.5 border-b border-border bg-card group-hover:bg-accent/40 transition-colors text-right pr-5">
                         <button className="p-2 text-[var(--ink-400)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] rounded-lg transition-all opacity-0 group-hover:opacity-100">
                            <MoreHorizontal size={20} />
                         </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="p-16 text-center">
                        <div className="flex flex-col items-center justify-center text-[var(--ink-300)] gap-3">
                          <CheckCircle2 size={40} strokeWidth={1.5} className="text-[var(--success)]/50" />
                          <p className="italic font-medium">No mission-critical blockers detected.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden shadow-sm">
              <div className="absolute inset-y-0 left-0 w-1.5 bg-gc-orange" />
              <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-gc-orange/10" />
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[1.4px] text-gc-orange">Escalation Velocity</p>
                    <p className="text-[11px] font-semibold text-muted-foreground mt-1">Median response lead</p>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-gc-orange/10 border border-gc-orange/20 text-gc-orange flex items-center justify-center">
                    <Clock size={20} strokeWidth={2.5} />
                  </div>
                </div>

                <div className="mt-6 flex items-end justify-between gap-4">
                  <p className="text-[52px] leading-none font-display font-black tracking-tight text-foreground">
                    2.4<span className="text-[28px] text-muted-foreground ml-1">h</span>
                  </p>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">
                    On Track
                  </span>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    <span>Response SLA</span>
                    <span className="text-gc-orange">72%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full w-[72%] rounded-full bg-gc-orange" />
                  </div>
                </div>
              </div>
           </div>

           <div className="bg-card border border-border rounded-xl overflow-hidden p-6 space-y-6 bg-[var(--bg)]">
              <div className="pb-4 border-b border-[var(--border)]">
                 <h3 className="font-condensed font-extrabold text-[22px] tracking-tight text-foreground text-[13px] tracking-widest">Resolution Summary</h3>
              </div>
              <div className="space-y-4">
                 {[
                   { label: 'Systemic Resolution', value: '82%', icon: <CheckCircle2 className="text-[var(--success)]" size={18} /> },
                   { label: 'Unmitigated Risks', value: '3 Active', icon: <Flame className="text-[var(--warning)]" size={18} /> }
                 ].map((stat, i) => (
                   <div key={i} className="flex items-center justify-between group cursor-default">
                      <div className="flex items-center gap-3">
                         <div className="p-2.5 bg-[var(--white)] border border-[var(--border)] rounded-xl group-hover:bg-[var(--ink-100)] transition-all shadow-sm">
                            {stat.icon}
                         </div>
                         <p className="text-[13px] font-bold text-[var(--ink-900)]">{stat.label}</p>
                      </div>
                      <p className="text-[14px] font-mono font-black text-[var(--ink-900)]">{stat.value}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
