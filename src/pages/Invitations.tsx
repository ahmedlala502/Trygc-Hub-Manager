/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Mail, CheckCircle2, XCircle, Clock, Search, Filter, MoreVertical, Send, X } from 'lucide-react';
import { cn } from '../utils';

const INITIAL_INVITES = [
  { id: 1, creator: '@tech_omar', campaign: 'Red Bull Summer', sentAt: '2h ago', status: 'Pending', response: '-' },
  { id: 2, creator: '@fashion.mona', campaign: 'STC Pay Launch', sentAt: '1d ago', status: 'Accepted', response: 'Confirmed' },
  { id: 3, creator: '@riyadh_explorer', campaign: 'Almarai Fresh', sentAt: '3d ago', status: 'Declined', response: 'Conflict' },
  { id: 4, creator: '@lifestyle_sa', campaign: 'Hungerstation', sentAt: '4h ago', status: 'Pending', response: '-' },
];

export default function Invitations() {
  const [invites, setInvites] = React.useState(INITIAL_INVITES);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [newInvite, setNewInvite] = React.useState({ creator: '@', campaign: 'Red Bull Summer' });

  const addInvite = () => {
    if (!newInvite.creator.trim() || newInvite.creator.trim() === '@') return;
    setInvites(prev => [{
      id: Date.now(),
      creator: newInvite.creator.startsWith('@') ? newInvite.creator : `@${newInvite.creator}`,
      campaign: newInvite.campaign,
      sentAt: 'Just now',
      status: 'Pending',
      response: '-',
    }, ...prev]);
    setIsAddOpen(false);
    setNewInvite({ creator: '@', campaign: 'Red Bull Summer' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-display font-black tracking-tighter text-foreground">Invitations Hub</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">Manage creator outreach & response logs</p>
        </div>
        <button onClick={() => setIsAddOpen(true)} className="px-8 py-4 bg-gc-orange text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-gc-orange/20 hover:bg-gc-orange/90 transition-colors flex items-center gap-3">
           Dispatch New Batch <Send size={16} />
        </button>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/30 p-4" onClick={() => setIsAddOpen(false)}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gc-orange">Invitations</p>
                <h3 className="font-condensed text-[20px] font-extrabold text-foreground">Dispatch New Batch</h3>
              </div>
              <button className="icon-btn" onClick={() => setIsAddOpen(false)}><X size={15} /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 py-5">
              <label className="space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Creator Handle</span>
                <input className="settings-input" value={newInvite.creator} onChange={(event) => setNewInvite({ ...newInvite, creator: event.target.value })} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Campaign</span>
                <input className="settings-input" value={newInvite.campaign} onChange={(event) => setNewInvite({ ...newInvite, campaign: event.target.value })} />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button onClick={() => setIsAddOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-accent">Cancel</button>
              <button onClick={addInvite} className="rounded-lg bg-gc-orange px-4 py-2 text-sm font-bold text-white hover:bg-gc-orange/90">Dispatch</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden bg-[var(--white)] border-2 border-border rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-border bg-secondary/30/30 flex justify-between items-center">
          <div className="flex items-center gap-6">
             <div className="relative group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-[var(--gc-orange)] transition-colors" />
                <input 
                  type="text" 
                  placeholder="Filter by creator or campaign..." 
                  className="pl-12 pr-6 py-2.5 bg-[var(--white)] border border-border rounded-xl text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-slate-50 transition-all w-64"
                />
             </div>
             <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary/30">
                <Filter size={14} /> Filters
             </button>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-1 bg-secondary rounded-lg">Active Transmissions: {invites.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-secondary/20">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Creator Instance</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mission Link</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dispatch Time</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synch Status</th>
                <th className="px-8 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invites.map((invite) => (
                <tr key={invite.id} className="group hover:bg-secondary/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground font-black text-xs">
                        {invite.creator[1].toUpperCase()}
                      </div>
                      <span className="text-sm font-black text-foreground">{invite.creator}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest px-3 py-1 bg-secondary/30 rounded-lg">{invite.campaign}</span>
                  </td>
                  <td className="px-8 py-6 text-xs font-bold text-muted-foreground tabular-nums uppercase">{invite.sentAt}</td>
                  <td className="px-8 py-6">
                    <div className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                      invite.status === 'Accepted' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      invite.status === 'Pending' ? "bg-amber-50 text-amber-500 border-amber-100 animate-pulse" :
                      "bg-red-50 text-red-500 border-red-100"
                    )}>
                      {invite.status === 'Accepted' ? <CheckCircle2 size={12} /> : 
                       invite.status === 'Pending' ? <Clock size={12} /> : 
                       <XCircle size={12} />}
                      {invite.status}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 text-muted-foreground/60 hover:text-foreground transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
