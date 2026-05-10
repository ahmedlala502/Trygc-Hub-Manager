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
  const { addHandover, updateHandover, offices, settings, user, members, currentTeam, canUseFeature, isWidgetEnabled } = useLocalData();
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingHandoverId, setEditingHandoverId] = useState<string | null>(null);
  const [reviewingHandoverId, setReviewingHandoverId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewerFilter, setReviewerFilter] = useState<'all' | 'mine' | string>('all');
  const teamOptions = settings.teams?.length ? settings.teams : TEAMS;

  const [newHo, setNewHo] = useState<Partial<Handover>>({
    fromShift: Shift.MORNING,
    toShift: Shift.MID,
    fromOffice: 'Riyadh Office',
    toOffice: 'Cairo HQ',
    team: teamOptions[0],
    country: user.country || 'EG',
    outgoing: user.name,
    incoming: '',
    watchouts: '',
    taskIds: []
  });

  const assignableMembers = useMemo(() => {
    const pool = members.filter(member => !newHo.team || member.team === newHo.team);
    const deduped = new Map<string, typeof pool[number]>();

    pool.forEach(member => {
      if (!deduped.has(member.name)) deduped.set(member.name, member);
    });

    if (user.name && !deduped.has(user.name)) {
      deduped.set(user.name, {
        id: 'current-user',
        name: user.name,
        team: newHo.team || user.team || teamOptions[0],
        office: user.office,
        country: user.country,
        role: user.role,
        tasksCompleted: 0,
        handoversOut: 0,
        onTime: 0,
      });
    }

    return Array.from(deduped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [members, newHo.team, teamOptions, user]);

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

  const reviewHandover = async (handover: Handover, action: 'Reviewed' | 'Acknowledged') => {
    const reviewedAt = new Date().toISOString();
    const trimmedComment = reviewComment.trim();
    const nextHistory = [
      ...(handover.reviewHistory || []),
      {
        id: `review-${Date.now().toString(36)}`,
        reviewer: user.name,
        reviewedAt,
        comment: trimmedComment,
        action,
      },
    ];

    await updateHandover(handover.id, {
      reviewedBy: user.name,
      reviewedAt,
      reviewComment: trimmedComment,
      reviewHistory: nextHistory,
      ...(action === 'Acknowledged' ? { status: 'Acknowledged', ackAt: reviewedAt } : {}),
    });
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

  const openReviewModal = (handover: Handover) => {
    setReviewComment(handover.reviewComment || '');
    setReviewingHandoverId(handover.id);
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

  const reviewingHandover = reviewingHandoverId
    ? handovers.find(handover => handover.id === reviewingHandoverId) || null
    : null;

  const reviewingTasks = reviewingHandover
    ? tasks.filter(task => reviewingHandover.taskIds.includes(task.id))
    : [];

  const availableReviewers = useMemo(() => {
    return Array.from(
      new Set(
        handovers
          .flatMap(handover => handover.reviewHistory?.map(entry => entry.reviewer) || [])
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [handovers]);

  const filteredHandovers = useMemo(() => {
    if (reviewerFilter === 'all') return handovers;
    if (reviewerFilter === 'mine') {
      return handovers.filter(handover =>
        handover.reviewedBy === user.name || handover.reviewHistory?.some(entry => entry.reviewer === user.name)
      );
    }

    return handovers.filter(handover =>
      handover.reviewedBy === reviewerFilter || handover.reviewHistory?.some(entry => entry.reviewer === reviewerFilter)
    );
  }, [handovers, reviewerFilter, user.name]);

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
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                <span className="px-3 py-2 bg-citrus/10 text-citrus rounded-xl">{newHo.team || currentTeam}</span>
                <span className="px-3 py-2 bg-white border border-dawn text-muted rounded-xl">{newHo.country || user.country}</span>
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
                    <div>
                      <label className="text-[9px] font-bold text-muted mb-2 block uppercase">Outgoing Lead</label>
                      <select value={newHo.outgoing || user.name} onChange={(e) => setNewHo({ ...newHo, outgoing: e.target.value })} className="w-full bg-white border border-dawn rounded-xl px-4 py-3 text-sm font-bold focus:outline-none">
                        {assignableMembers.map(member => <option key={member.id} value={member.name}>{member.name} - {member.role || 'Viewer'}</option>)}
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
                    <div>
                      <label className="text-[9px] font-bold text-white/50 mb-2 block uppercase">Incoming Lead</label>
                      <select value={newHo.incoming || ''} onChange={(e) => setNewHo({ ...newHo, incoming: e.target.value })} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none text-white">
                        <option value="" className="text-ink">Select receiver</option>
                        {assignableMembers.map(member => <option key={member.id} value={member.name} className="text-ink">{member.name} - {member.role || 'Viewer'}</option>)}
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
                  disabled={isAnalyzing || activeTasks.length === 0 || !canUseFeature('ai.use')}
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
                        <select
                          value={newHo.incoming || ''}
                          onChange={(e) => setNewHo({ ...newHo, incoming: e.target.value })}
                          className="min-w-[240px] bg-transparent border-none p-0 text-sm font-bold text-ink focus:outline-none"
                        >
                          <option value="">Select receiver</option>
                          {assignableMembers.map(member => (
                            <option key={member.id} value={member.name}>
                              {member.name} - {member.role || 'Viewer'}
                            </option>
                          ))}
                        </select>
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
                <button onClick={saveHandover} disabled={!canUseFeature(editingHandoverId ? 'handover.edit' : 'handover.create')} className="flex items-center gap-3 px-10 py-4 bg-ink text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-ink/20 disabled:opacity-50 disabled:hover:scale-100">
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
      {isWidgetEnabled('handoverAudit') && (
      <section className="space-y-8">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-muted" />
            <h3 className="relaxed-title text-2xl">Shift Transfer Audit</h3>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted/50">
              Reviewer
            </label>
            <select
              value={reviewerFilter}
              onChange={(e) => setReviewerFilter(e.target.value)}
              className="rounded-xl border border-dawn bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted focus:outline-none focus:ring-2 focus:ring-citrus/20"
            >
              <option value="all">All reviews</option>
              <option value="mine">Reviewed by me</option>
              {availableReviewers.map(reviewer => (
                <option key={reviewer} value={reviewer}>{reviewer}</option>
              ))}
            </select>
          </div>
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
              {filteredHandovers.map(ho => (
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
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {ho.reviewHistory?.some(entry => entry.reviewer === user.name) && (
                        <span className="px-3 py-2 rounded-lg bg-ink/5 text-ink text-[9px] font-black uppercase tracking-widest border border-dawn">
                          Reviewed by me
                        </span>
                      )}
                      <button onClick={() => openReviewModal(ho)} className="px-4 py-2 bg-ink text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-ink/10">
                        Review
                      </button>
                      <button onClick={() => editHandover(ho)} disabled={!canUseFeature('handover.edit')} className="px-4 py-2 bg-white border border-dawn text-muted rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-citrus transition-all disabled:opacity-40">Edit</button>
                      {ho.status === 'Pending' ? (
                        <button onClick={() => acknowledgeHandover(ho.id)} disabled={!canUseFeature('handover.ack')} className="px-5 py-2 bg-citrus text-ink rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-citrus/10 disabled:opacity-40 disabled:hover:scale-100">Acknowledge</button>
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
              {filteredHandovers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted opacity-30 italic">
                      {reviewerFilter === 'all' ? 'No historical records in current cycle' : 'No handovers match this reviewer filter'}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      <AnimatePresence>
        {reviewingHandover && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setReviewingHandoverId(null)} />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              className="relative w-full max-w-4xl max-h-[88vh] overflow-hidden rounded-[32px] border border-dawn bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between px-8 py-6 border-b border-dawn">
                <div>
                  <h3 className="relaxed-title text-2xl">Handover Review</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mt-2">
                    {reviewingHandover.fromShift} to {reviewingHandover.toShift} · {reviewingHandover.team || 'All Teams'} · {reviewingHandover.country || user.country}
                  </p>
                </div>
                <button onClick={() => setReviewingHandoverId(null)} className="px-4 py-2 bg-stone border border-dawn rounded-xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-ink transition-all">
                  Close
                </button>
              </div>

              <div className="p-8 overflow-y-auto max-h-[calc(88vh-96px)] custom-scrollbar space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-stone/30 rounded-3xl border border-dawn space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-citrus block">Transfer Context</span>
                    <div className="grid grid-cols-2 gap-4 text-sm font-bold text-ink">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Outgoing</p>
                        <p>{reviewingHandover.outgoing}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Incoming</p>
                        <p>{reviewingHandover.incoming}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">From Hub</p>
                        <p>{reviewingHandover.fromOffice}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">To Hub</p>
                        <p>{reviewingHandover.toOffice}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-ink text-white rounded-3xl space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-citrus/80 block">Review Status</span>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white/70">Current State</span>
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${reviewingHandover.status === 'Pending' ? 'bg-citrus text-ink' : 'bg-green-500 text-white'}`}>
                        {reviewingHandover.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm font-bold text-white/80">
                      <p>Created: {new Date(reviewingHandover.createdAt).toLocaleString()}</p>
                      <p>Tasks linked: {reviewingTasks.length}</p>
                      {reviewingHandover.reviewedBy && <p>Last reviewed by: {reviewingHandover.reviewedBy}</p>}
                      {reviewingHandover.reviewedAt && <p>Reviewed at: {new Date(reviewingHandover.reviewedAt).toLocaleString()}</p>}
                      {reviewingHandover.ackAt && <p>Acknowledged: {new Date(reviewingHandover.ackAt).toLocaleString()}</p>}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="relaxed-title text-xl">Watchouts and Notes</h4>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Review before accept</span>
                  </div>
                  <div className="p-6 bg-stone/20 border border-dawn rounded-3xl text-sm font-medium text-muted leading-relaxed whitespace-pre-wrap min-h-[140px]">
                    {reviewingHandover.watchouts || 'No watchouts were recorded for this handover.'}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="relaxed-title text-xl">Reviewer Notes</h4>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Saved to audit trail</span>
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Add review notes, decisions, blockers, or follow-ups"
                    className="w-full min-h-[140px] rounded-3xl border border-dawn bg-white px-5 py-4 text-sm font-medium text-ink placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-citrus/20"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="relaxed-title text-xl">Linked Tasks</h4>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">{reviewingTasks.length} items</span>
                  </div>
                  <div className="space-y-3">
                    {reviewingTasks.map(task => (
                      <div key={task.id} className="p-5 bg-white border border-dawn rounded-2xl flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-ink">{task.title}</p>
                          <div className="flex items-center gap-2 mt-2 text-[10px] font-black uppercase tracking-widest text-muted">
                            <span>{task.team}</span>
                            <span className="text-muted/30">·</span>
                            <span>{task.office}</span>
                            <span className="text-muted/30">·</span>
                            <span>{task.owner}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`inline-block px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                            task.status === Status.BLOCKED ? 'bg-red-50 text-red-500' :
                            task.status === Status.DONE ? 'bg-green-50 text-green-600' :
                            'bg-stone text-muted'
                          }`}>
                            {task.status}
                          </span>
                          <p className="text-[10px] font-bold text-muted mt-2">{task.priority}</p>
                        </div>
                      </div>
                    ))}
                    {reviewingTasks.length === 0 && (
                      <div className="p-8 bg-stone/20 border border-dawn rounded-2xl text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted/40 italic">No linked tasks found</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="relaxed-title text-xl">Review History</h4>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                      {(reviewingHandover.reviewHistory || []).length} entries
                    </span>
                  </div>
                  <div className="space-y-3">
                    {(reviewingHandover.reviewHistory || []).length > 0 ? (
                      reviewingHandover.reviewHistory?.slice().reverse().map(entry => (
                        <div key={entry.id} className="rounded-3xl border border-dawn bg-stone/20 p-5">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-bold text-ink">{entry.reviewer}</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted mt-1">
                                {entry.action} · {new Date(entry.reviewedAt).toLocaleString()}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                              entry.action === 'Acknowledged' ? 'bg-green-50 text-green-600' : 'bg-citrus/10 text-citrus'
                            }`}>
                              {entry.action}
                            </span>
                          </div>
                          <p className="mt-4 text-sm font-medium leading-relaxed text-muted whitespace-pre-wrap">
                            {entry.comment || 'No comment recorded for this review.'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 bg-stone/20 border border-dawn rounded-2xl text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted/40 italic">No review entries yet</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-dawn">
                  <div className="text-[10px] font-bold text-muted">
                    Review notes, reviewer identity, and timestamps are now saved into the handover trail.
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setReviewingHandoverId(null);
                        editHandover(reviewingHandover);
                      }}
                      disabled={!canUseFeature('handover.edit')}
                      className="px-5 py-3 bg-white border border-dawn rounded-xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-citrus transition-all disabled:opacity-40"
                    >
                      Edit Handover
                    </button>
                    <button
                      onClick={async () => {
                        await reviewHandover(reviewingHandover, 'Reviewed');
                        setReviewingHandoverId(null);
                      }}
                      className="px-6 py-3 bg-ink text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-ink/10"
                    >
                      Save Review
                    </button>
                    {reviewingHandover.status === 'Pending' && (
                      <button
                        onClick={async () => {
                          await reviewHandover(reviewingHandover, 'Acknowledged');
                          setReviewingHandoverId(null);
                        }}
                        disabled={!canUseFeature('handover.ack')}
                        className="px-6 py-3 bg-citrus text-ink rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-citrus/10 disabled:opacity-40 disabled:hover:scale-100"
                      >
                        Review and Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
