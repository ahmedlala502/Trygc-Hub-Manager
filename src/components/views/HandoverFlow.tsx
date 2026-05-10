import React, { useState, useMemo } from 'react';
import { Handover, Task, Shift, Priority, Status } from '../../types';
import { RefreshCw, Calendar, MapPin, User, AlertTriangle, Send, CheckCircle2, ChevronRight, Info, Sparkles, Loader2, Clipboard, Globe, Users, ArrowRight, MessageSquare, History, Search, Layers, Quote } from 'lucide-react';
import { generateHandoverSummary } from '../../lib/apiService';
import { motion, AnimatePresence } from 'motion/react';
import { useLocalData } from '../LocalDataContext';
import { COUNTRY_FLAGS, TEAMS } from '../../constants';

interface HandoverFlowProps {
  handovers: Handover[];
  tasks: Task[];
  stats: {
    openCount: number;
    riskCount: number;
    carryCount: number;
    handoverCount: number;
  };
  aiInteractions: { role: 'user' | 'assistant', content: string }[];
}

export default function HandoverFlow({ handovers, tasks, stats, aiInteractions }: HandoverFlowProps) {
  const { addHandover, updateHandover, offices, settings, user } = useLocalData();
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingHandoverId, setEditingHandoverId] = useState<string | null>(null);
  const teamOptions = settings.teams?.length ? settings.teams : TEAMS;

  const [newHo, setNewHo] = useState<Partial<Handover>>({
    fromShift: Shift.MORNING,
    toShift: Shift.MID,
    fromOffice: 'Riyadh Office',
    toOffice: 'Cairo HQ',
    team: teamOptions[0],
    country: user.country || 'EG',
    outgoing: 'Ahmed Essmat',
    incoming: '',
    watchouts: '',
    taskIds: []
  });

  const activeTasks = useMemo(() => tasks.filter(t => newHo.taskIds?.includes(t.id)), [tasks, newHo.taskIds]);

  const autoSelectTasks = () => {
    const criticalIds = tasks
      .filter(t => (t.carry || t.priority === Priority.HIGH) && t.status !== Status.DONE && (!newHo.team || t.team === newHo.team))
      .map(t => t.id);
    setNewHo(prev => ({ ...prev, taskIds: criticalIds }));
    setStep(3);
  };

  const handleAIAnalysis = async () => {
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const taskData = activeTasks.map(t => ({
        title: t.title,
        priority: t.priority,
        status: t.status
      }));

      const result = await generateHandoverSummary({
        tasks: taskData,
        watchouts: newHo.watchouts
      });

      if (result.text) {
        setNewHo(prev => ({ ...prev, watchouts: result.text.trim() }));
      }

      // Show feedback if using fallback
      if (result.provider === 'mock') {
        console.log('Using local fallback for handover summary');
      }
    } catch (error) {
      console.error('Handover Analysis Failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveHandover = async () => {
    const fresh: Partial<Handover> = {
      date: new Date().toISOString().split('T')[0],
      fromShift: newHo.fromShift as Shift,
      toShift: newHo.toShift as Shift,
      fromOffice: newHo.fromOffice!,
      toOffice: newHo.toOffice!,
      team: newHo.team,
      country: newHo.country,
      outgoing: newHo.outgoing!,
      incoming: newHo.incoming || 'TBD',
      status: 'Pending',
      watchouts: newHo.watchouts,
      taskIds: newHo.taskIds || [],
      createdAt: new Date().toISOString(),
      creatorId: 'local-workspace'
    };
    if (editingHandoverId) {
      await updateHandover(editingHandoverId, fresh);
    } else {
      await addHandover(fresh);
    }
    setStep(6);
  };

  const acknowledgeHandover = async (id: string) => {
    await updateHandover(id, { status: 'Acknowledged', ackAt: new Date().toISOString() });
  };

  const previewText = useMemo(() => {
    return `🔴 SHIFT HANDOVER: ${newHo.fromShift} → ${newHo.toShift}\n` +
      `🏢 HUB: ${newHo.fromOffice} → ${newHo.toOffice}\n` +
      `👥 TEAM: ${newHo.team || 'All teams'}\n` +
      `👤 TRANSFERRED BY: ${newHo.outgoing}\n\n` +
      `📦 OUTCOMES SYNCED (${activeTasks.length}):\n` +
      activeTasks.map(t => `- [${t.priority}] ${t.title}`).join('\n') +
      `\n\n⚠️ WATCHOUTS:\n${newHo.watchouts || 'No specific watchouts recorded.'}`;
  }, [newHo, activeTasks]);

  const filteredTasks = tasks.filter(t =>
    t.status !== Status.DONE &&
    (!newHo.team || t.team === newHo.team) &&
    (t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.office.toLowerCase().includes(searchTerm.toLowerCase()) || t.team.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const editHandover = (handover: Handover) => {
    setEditingHandoverId(handover.id);
    setNewHo({
      ...handover,
      taskIds: handover.taskIds || [],
      team: handover.team || teamOptions[0],
      country: handover.country || user.country,
    });
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetBuilder = () => {
    setEditingHandoverId(null);
    setNewHo({
      fromShift: Shift.MORNING,
      toShift: Shift.MID,
      fromOffice: offices[0]?.name || 'Cairo HQ',
      toOffice: offices[1]?.name || 'Riyadh Office',
      team: teamOptions[0],
      country: user.country || 'EG',
      outgoing: user.name,
      incoming: '',
      watchouts: '',
      taskIds: [],
    });
    setStep(1);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-32">
      {/* Visual Progress Bar */}
      <div className="grid grid-cols-6 gap-2">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <div key={s} className="space-y-3">
            <div className={`h-1.5 rounded-full transition-all duration-500 ${step >= s ? 'bg-citrus shadow-[0_0_10px_rgba(255,210,63,0.4)]' : 'bg-dawn'}`} />
            <span className={`block text-[8px] font-black uppercase tracking-widest text-center ${step === s ? 'text-ink' : 'text-muted/40'}`}>
              {['Context', 'Setup', 'Outcomes', 'Insights', 'Preview', 'Success'][s - 1]}
            </span>
          </div>
        ))}
      </div>

      <div className="glass-card min-h-[500px] flex flex-col p-10 border-dawn shadow-2xl relative overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="step1" className="flex flex-col items-center text-center py-10 space-y-8 max-w-2xl mx-auto">
              <div className="w-24 h-24 bg-citrus/5 rounded-[40px] flex items-center justify-center border border-citrus/10 relative">
                <RefreshCw className="w-10 h-10 text-citrus animate-spin-slow" />
                <div className="absolute -right-2 -top-2 w-8 h-8 bg-ink text-white rounded-2xl flex items-center justify-center text-xs font-black shadow-lg">1</div>
              </div>
              <div className="space-y-4">
                <h2 className="relaxed-title text-4xl leading-tight">Initiate Shift Synchronization</h2>
                <p className="text-muted font-medium text-lg leading-relaxed">
                  Bridge the operational gap between team cycles. We'll surface critical risks and carry-overs automatically to ensure regional continuity.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-6 w-full pt-8">
                <div className="p-4 bg-stone/50 rounded-2xl border border-dawn">
                  <span className="block text-2xl mb-1">{stats.riskCount}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted">High Risks</span>
                </div>
                <div className="p-4 bg-stone/50 rounded-2xl border border-dawn">
                  <span className="block text-2xl mb-1">{stats.carryCount}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted">Carry-overs</span>
                </div>
                <div className="p-4 bg-stone/50 rounded-2xl border border-dawn">
                  <span className="block text-2xl mb-1">{stats.openCount}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted">Pending Total</span>
                </div>
              </div>
              <button onClick={() => setStep(2)} className="flex items-center gap-3 px-10 py-4 bg-ink text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-2xl shadow-ink/20">
                <span>Start Handover Builder</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key="step2" className="space-y-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-citrus/10 rounded-xl"><Globe className="w-6 h-6 text-citrus" /></div>
                <div>
                  <h3 className="relaxed-title text-2xl">Regional Topology</h3>
                  <p className="text-xs font-bold text-muted/60 uppercase tracking-widest">Define the operational bridge</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="p-6 bg-stone/30 rounded-3xl border border-dawn space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-citrus block">Source Environment</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-muted mb-2 block uppercase">Team Isolation</label>
                        <select value={newHo.team || teamOptions[0]} onChange={(e) => setNewHo({ ...newHo, team: e.target.value, taskIds: [] })} className="w-full bg-white border border-dawn rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-citrus/20">
                          {teamOptions.map(team => <option key={team}>{team}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-muted mb-2 block uppercase">Country</label>
                        <select value={newHo.country || user.country || 'EG'} onChange={(e) => setNewHo({ ...newHo, country: e.target.value })} className="w-full bg-white border border-dawn rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-citrus/20">
                          {Object.keys(COUNTRY_FLAGS).map(country => <option key={country} value={country}>{COUNTRY_FLAGS[country]} {country}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-muted mb-2 block uppercase">Current Shift</label>
                      <select value={newHo.fromShift || Shift.MORNING} onChange={(e) => setNewHo({ ...newHo, fromShift: e.target.value as Shift })} className="w-full bg-white border border-dawn rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-citrus/20">
                        {Object.values(Shift).map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-muted mb-2 block uppercase">Outgoing Hub</label>
                      <select value={newHo.fromOffice || offices[0]?.name || ''} onChange={(e) => setNewHo({ ...newHo, fromOffice: e.target.value })} className="w-full bg-white border border-dawn rounded-xl px-4 py-3 text-sm font-bold focus:outline-none">
                        {[...new Set([newHo.fromOffice, ...offices.map(office => office.name)])].filter(Boolean).map(office => <option key={office}>{office}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="p-6 bg-ink text-white rounded-3xl space-y-4 shadow-xl shadow-ink/20">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-citrus/80 block">Destination Node</span>
                    <div>
                      <label className="text-[9px] font-bold text-white/50 mb-2 block uppercase">Receiving Shift</label>
                      <select value={newHo.toShift || Shift.MID} onChange={(e) => setNewHo({ ...newHo, toShift: e.target.value as Shift })} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none text-white appearance-none">
                        {Object.values(Shift).map(s => <option key={s} className="text-ink">{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-white/50 mb-2 block uppercase">Incoming Hub</label>
                      <select value={newHo.toOffice || offices[1]?.name || offices[0]?.name || ''} onChange={(e) => setNewHo({ ...newHo, toOffice: e.target.value })} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none text-white">
                        {[...new Set([newHo.toOffice, ...offices.map(office => office.name)])].filter(Boolean).map(office => <option key={office} className="text-ink">{office}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-10 border-t border-dawn">
                <button onClick={resetBuilder} className="text-xs font-black uppercase tracking-widest text-muted hover:text-ink transition-colors">Abort Cycle</button>
                <button onClick={autoSelectTasks} className="flex items-center gap-3 px-10 py-4 bg-ink text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">
                  <span>Confirm Topology</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key="step3" className="space-y-8 flex flex-col h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-citrus/10 rounded-xl"><Layers className="w-6 h-6 text-citrus" /></div>
                  <div>
                    <h3 className="relaxed-title text-2xl">Outcome Selection</h3>
                    <p className="text-xs font-bold text-muted/60 uppercase tracking-widest">{newHo.taskIds?.length} Outcomes items ready for sync</p>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input type="text" placeholder="Filter tasks..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-stone/50 border border-dawn rounded-xl pl-10 pr-4 py-2 text-[10px] font-bold focus:outline-none focus:border-citrus" />
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                {filteredTasks.map(t => (
                  <label key={t.id} className={`group flex items-start gap-4 p-5 rounded-[24px] border transition-all cursor-pointer ${newHo.taskIds?.includes(t.id) ? 'bg-citrus/5 border-citrus shadow-inner' : 'bg-white border-dawn hover:border-citrus/30'}`}>
                    <div className="pt-1">
                      <input type="checkbox" className="w-5 h-5 accent-citrus rounded-lg" checked={newHo.taskIds?.includes(t.id)} onChange={(e) => {
                        const ids = newHo.taskIds || [];
                        setNewHo({ ...newHo, taskIds: e.target.checked ? [...ids, t.id] : ids.filter(id => id !== t.id) });
                      }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="block text-sm font-bold text-ink truncate group-hover:text-citrus transition-colors">{t.title}</span>
                        {t.priority === Priority.HIGH && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted/60">{t.owner}</span>
                        <span className="w-1 h-1 bg-dawn rounded-full" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted/60">{t.office}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-between items-center pt-8 border-t border-dawn">
                <button onClick={() => setStep(2)} className="text-xs font-black uppercase tracking-widest text-muted hover:text-ink transition-colors">Topology Change</button>
                <div className="flex gap-4">
                  <button onClick={() => setStep(4)} className="flex items-center gap-3 px-10 py-4 bg-ink text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">
                    <span>Analyze Sync</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key="step4" className="space-y-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-citrus/10 rounded-xl"><MessageSquare className="w-6 h-6 text-citrus" /></div>
                  <div>
                    <h3 className="relaxed-title text-2xl">Transfer Insights</h3>
                    <p className="text-xs font-bold text-muted/60 uppercase tracking-widest">Synthetic intelligence for the next team</p>
                  </div>
                </div>
                <button
                  onClick={handleAIAnalysis}
                  disabled={isAnalyzing || activeTasks.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-citrus text-ink rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-citrus/10"
                >
                  {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span>Generate Summary</span>
                </button>
              </div>

              <div className="space-y-6">
                <div className="relative group">
                  <div className="absolute top-4 left-4 opacity-10"><Quote className="w-8 h-8" /></div>
                  <textarea
                    value={newHo.watchouts || ''}
                    onChange={(e) => setNewHo({ ...newHo, watchouts: e.target.value })}
                    placeholder="Enter critical knowledge for the incoming shift..."
                    className="w-full bg-stone/30 border border-dawn rounded-[32px] p-8 text-sm font-bold min-h-[300px] focus:outline-none focus:ring-4 focus:ring-citrus/5 focus:border-citrus transition-all resize-none shadow-inner"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-8 border-t border-dawn">
                <button onClick={() => setStep(3)} className="text-xs font-black uppercase tracking-widest text-muted hover:text-ink transition-colors">Adjust Outcomes</button>
                <button onClick={() => setStep(5)} className="flex items-center gap-3 px-10 py-4 bg-ink text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">
                  <span>Preview Relay</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key="step5" className="space-y-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-citrus/10 rounded-xl"><Clipboard className="w-6 h-6 text-citrus" /></div>
                  <div>
                    <h3 className="relaxed-title text-2xl">Final Protocol Relay</h3>
                    <p className="text-xs font-bold text-muted/60 uppercase tracking-widest">Verify and synchronize communication</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="p-6 bg-ink text-white rounded-[32px] shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                      <span className="block text-[10px] font-black uppercase tracking-widest text-citrus mb-6">Channel Payload</span>
                      <div className="bg-white/10 rounded-2xl p-6 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-[350px] overflow-y-auto no-scrollbar">
                        {previewText}
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(previewText)}
                        className="mt-6 flex items-center justify-center gap-2 w-full py-4 bg-white text-ink rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-citrus transition-colors"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                        <span>Copy for Slack / Teams</span>
                      </button>
                    </div>
                    <Globe className="absolute -right-10 -bottom-10 w-48 h-48 opacity-[0.05] group-hover:rotate-12 transition-transform duration-1000" />
                  </div>
                </div>

                <div className="flex flex-col justify-between py-6">
                  <div className="space-y-8">
                    <div className="flex gap-4 p-4 border border-dawn rounded-2xl bg-stone/10">
                      <Users className="w-5 h-5 text-citrus shrink-0" />
                      <div>
                        <span className="block text-[10px] font-black uppercase tracking-widest text-ink mb-1">Incoming Lead</span>
                        <input type="text" placeholder="Add receiver (optional)" value={newHo.incoming || ''} onChange={(e) => setNewHo({ ...newHo, incoming: e.target.value })} className="bg-transparent border-none p-0 text-sm font-bold text-ink focus:outline-none placeholder:text-muted/30" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-muted">
                        <span>Relay Readiness</span>
                        <span>100%</span>
                      </div>
                      <div className="h-1 bg-stone rounded-full overflow-hidden">
                        <div className="h-full bg-citrus w-full" />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] font-bold text-muted leading-relaxed italic border-l-4 border-l-citrus pl-4">
                    Confirming this relay will broadcast the operational status across all regional command centers.
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-8 border-t border-dawn">
                <button onClick={() => setStep(4)} className="text-xs font-black uppercase tracking-widest text-muted hover:text-ink transition-colors">Edit Insights</button>
                <button onClick={saveHandover} className="flex items-center gap-3 px-10 py-4 bg-ink text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-ink/20">
                  <span>{editingHandoverId ? 'Update Relay Pulse' : 'Deploy Relay Pulse'}</span>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key="step6" className="text-center py-16 space-y-8">
              <div className="w-32 h-32 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-green-50/50">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <div className="space-y-3">
                <h2 className="relaxed-title text-4xl">Relay Pulse Confirmed</h2>
                <p className="text-muted font-medium text-lg max-w-md mx-auto">
                  Operation bridge synchronized from <span className="text-ink font-bold">{newHo.fromShift}</span> to <span className="text-ink font-bold">{newHo.toShift}</span> successfully.
                </p>
              </div>
              <div className="flex gap-4 justify-center pt-8">
                <button onClick={resetBuilder} className="px-10 py-4 bg-ink text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-2xl shadow-ink/20">
                  Return to Hub
                </button>
                <button className="px-10 py-4 bg-white border border-dawn text-muted rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-stone transition-all">
                  Audit Log
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History Table */}
      <section className="space-y-8">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-muted" />
            <h3 className="relaxed-title text-2xl">Shift Transfer Audit</h3>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-muted/40">Chronological sync log</span>
        </div>

        <div className="glass-card p-0 overflow-hidden border-dawn shadow-lg">
          <table className="w-full text-left">
            <thead className="bg-stone border-b border-dawn">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted">Time Pulse</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted">Bridge Corridor</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted">Team / Leads</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted">Outcomes</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dawn">
              {handovers.map(ho => (
                <tr key={ho.id} className="group hover:bg-stone/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-ink">{new Date(ho.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-[9px] font-bold text-muted/50 uppercase">{new Date(ho.createdAt).toLocaleDateString('en-GB')}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-ink">{ho.fromShift}</span>
                      <ArrowRight className="w-3 h-3 text-muted/40" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-ink">{ho.toShift}</span>
                    </div>
                    <span className="text-[9px] font-bold text-muted/60 lowercase">{ho.fromOffice} hub</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-citrus mb-2">{ho.team || 'All Teams'}</span>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <div className="w-6 h-6 bg-stone border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-muted">{ho.outgoing[0]}</div>
                        <div className="w-6 h-6 bg-dawn border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-muted">{ho.incoming[0]}</div>
                      </div>
                      <span className="text-[10px] font-bold text-muted lowercase tracking-tighter">{ho.outgoing} / {ho.incoming}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-citrus rounded-full" />
                      <span className="text-[11px] font-bold text-ink">{ho.taskIds.length} synced</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => editHandover(ho)} className="px-4 py-2 bg-white border border-dawn text-muted rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-citrus transition-all">Edit</button>
                      {ho.status === 'Pending' ? (
                        <button onClick={() => acknowledgeHandover(ho.id)} className="px-5 py-2 bg-citrus text-ink rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-citrus/10">Acknowledge</button>
                      ) : (
                        <div className="flex items-center justify-end gap-2 text-green-500 font-black text-[9px] uppercase tracking-widest">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Sync Clear</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {handovers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted opacity-30 italic">No historical records in current cycle</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
