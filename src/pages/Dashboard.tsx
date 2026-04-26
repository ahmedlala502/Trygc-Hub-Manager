/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Activity,
  AlertTriangle,
  Briefcase,
  ShieldAlert,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { Button } from '../components/ui/button';
import { CampaignStage } from '../constants';

const STAGE_SHORT: Record<number, string> = {
  1: 'Intake', 2: 'Validation', 3: 'Blocked', 4: 'Ready',
  5: 'Setup', 6: 'List Prep', 7: 'Approval', 8: 'Invites',
  9: 'Reminder 1', 10: 'Reminder 2', 11: 'Confirmations',
  12: 'Scheduling', 13: 'Execution', 14: 'Coverage',
  15: 'Recovery', 16: 'QA Review', 17: 'Reporting', 18: 'Closure',
};

const TOTAL_STAGES = 18;

// Maps detailed stage numbers to 11-bar lifecycle radar positions (0-indexed)
const STAGE_TO_BAR: Record<number, number> = {
  1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5,
  8: 6, 9: 6, 10: 6, 11: 6, 12: 6, 13: 7, 14: 8,
  15: 8, 16: 9, 17: 10, 18: 10,
};

const RADAR_LABELS = [
  'Intake', 'Validation', 'Ready', 'Setup', 'List Prep', 'Approval',
  'Invites', 'Execution', 'Coverage', 'QA Review', 'Closure',
];

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function HeaderWidget({
  label,
  value,
  detail,
  tone = 'neutral',
  active,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'neutral' | 'green' | 'orange' | 'red' | 'purple';
  active?: boolean;
}) {
  const toneClasses = {
    neutral: {
      label: 'text-gray-500 dark:text-gray-400',
      value: 'text-gray-900 dark:text-white',
      border: 'border-gray-100 dark:border-gray-800',
      dot: '',
    },
    green: {
      label: 'text-green-600 dark:text-green-400',
      value: 'text-green-600 dark:text-green-400',
      border: 'border-gray-100 dark:border-gray-800',
      dot: 'bg-green-500',
    },
    orange: {
      label: 'text-gc-orange',
      value: 'text-gc-orange',
      border: 'border-gray-100 dark:border-gray-800',
      dot: '',
    },
    red: {
      label: 'text-red-500',
      value: 'text-red-500',
      border: 'border-red-100 dark:border-red-900/30',
      dot: '',
    },
    purple: {
      label: 'text-purple-600 dark:text-purple-400',
      value: 'text-purple-600 dark:text-purple-400',
      border: 'border-gray-100 dark:border-gray-800',
      dot: '',
    },
  }[tone];

  return (
    <div className={`bg-white dark:bg-card rounded-xl p-4 border ${toneClasses.border} shadow-sm hover:shadow-md transition-shadow cursor-pointer`}>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 flex items-center ${toneClasses.label}`}>
        {active && <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${toneClasses.dot}`} />}
        {label}
      </p>
      <p className={`text-3xl font-bold leading-tight tabular-nums ${toneClasses.value}`}>{value}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{detail}</p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const campaigns = dataService.getCampaigns();
  const tasks = dataService.getTasks();
  const influencers = dataService.getInfluencers();
  const blockers = dataService.getBlockers();

  const activeCampaigns = campaigns.filter(c => c.status === 'Active').length;
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const atRiskCount = campaigns.filter(c => c.recordHealth && c.recordHealth !== 'Healthy').length;
  const coverageGap = influencers.filter(i => !i.coverageReceived).length;
  const openBlockers = blockers.filter(b => b.status === 'Open');

  // Build campaign matrix rows from real data (up to 5)
  const matrixRows = campaigns.slice(0, 5).map(c => ({
    id: c.id,
    name: c.name,
    stage: STAGE_SHORT[c.stage] ?? 'Unknown',
    progress: Math.round(((c.stage - 1) / (TOTAL_STAGES - 1)) * 100),
    health: c.recordHealth ?? 'Healthy',
    owner: c.currentOwner ?? c.createdBy,
  }));

  // Compute bar heights for Lifecycle Radar from campaign stage distribution
  const barCounts = Array(RADAR_LABELS.length).fill(0) as number[];
  campaigns.forEach(c => {
    const bar = STAGE_TO_BAR[c.stage];
    if (bar !== undefined) barCounts[bar]++;
  });
  const maxBar = Math.max(...barCounts, 1);

  // Most-active bar index for highlight
  const activeBarIndex = barCounts.indexOf(Math.max(...barCounts));

  // Execution-cluster campaigns (stages 8-15)
  const executionCount = campaigns.filter(c => c.stage >= CampaignStage.INVITATIONS_RUNNING && c.stage <= CampaignStage.MISSING_COVERAGE_RECOVERY).length;

  return (
    <div className="space-y-6 max-w-[1240px] mx-auto">

      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-white dark:bg-card rounded-xl p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gc-orange" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-[10px] font-bold text-green-700 font-mono tracking-[0.2px] dark:bg-green-900/20 dark:border-green-900/40 dark:text-green-400">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live · Global Sync Active
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">Uptime: 99.98%</span>
          </div>
          <h1 className="font-condensed font-black text-4xl md:text-5xl tracking-tight text-gray-900 dark:text-white leading-[1]">
            Operational<br />
            <span className="text-gc-orange">Heartbeat.</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-md leading-relaxed mt-1">
            Supervising <strong className="text-gray-900 dark:text-white">{activeCampaigns} active campaign{activeCampaigns !== 1 ? 's' : ''}</strong> across all regions.
            {pendingTasks > 0 && <> <strong className="text-gc-orange">{pendingTasks} task{pendingTasks !== 1 ? 's' : ''}</strong> pending action.</>}
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-3 shrink-0">
          <Button
            onClick={() => navigate('/campaigns/new')}
            className="bg-gc-orange hover:bg-gc-orange/90 text-white font-condensed font-bold tracking-wide text-sm gap-2"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/campaigns')}
            className="border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-800 font-condensed font-bold tracking-wide text-sm"
          >
            View Registry
          </Button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <HeaderWidget
          label="All Campaigns"
          value={campaigns.length.toLocaleString()}
          detail="All markets combined"
        />
        <HeaderWidget
          label="Active Now"
          value={activeCampaigns.toLocaleString()}
          detail="Currently running"
          tone="green"
          active={activeCampaigns > 0}
        />
        <HeaderWidget
          label="Pending Tasks"
          value={pendingTasks.toLocaleString()}
          detail="Awaiting completion"
          tone="orange"
        />
        <HeaderWidget
          label="At Risk"
          value={atRiskCount.toLocaleString()}
          detail="Health issues detected"
          tone="red"
        />
        <HeaderWidget
          label="Coverage Gap"
          value={coverageGap.toLocaleString()}
          detail="Influencers missing coverage"
          tone="purple"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* Campaign Matrix */}
        <div className="xl:col-span-8 space-y-5">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-[9.5px] font-bold uppercase tracking-[1.5px] text-muted-foreground mb-0.5">Status Panel</p>
                <h3 className="font-condensed font-extrabold text-[17px] tracking-tight text-foreground">Active Mission Matrix</h3>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-[11px] font-semibold" onClick={() => navigate('/campaigns')}>
                Full Registry
              </Button>
            </div>
            {matrixRows.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                No campaigns yet. <button onClick={() => navigate('/campaigns/new')} className="text-gc-orange font-semibold hover:underline">Create one</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground">Campaign</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground">Stage Progress</th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground">Health</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {matrixRows.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => navigate('/campaigns')}
                        className="hover:bg-accent/40 cursor-pointer transition-colors group"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gc-orange/10 border border-gc-orange/20 flex items-center justify-center text-gc-orange group-hover:bg-gc-orange group-hover:text-white transition-all">
                              <Briefcase className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-foreground group-hover:text-gc-orange transition-colors">{c.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono uppercase">{c.owner} · Ops</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1.5 max-w-[200px]">
                            <div className="flex justify-between text-[10.5px] font-semibold">
                              <span className="text-muted-foreground">{c.stage}</span>
                              <span className="text-foreground tabular-nums">{c.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${c.health === 'Blocked' ? 'bg-destructive' : 'bg-gc-purple'}`}
                                style={{ width: `${c.progress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            c.health === 'Healthy' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            c.health === 'At Risk' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                            'bg-destructive/10 text-destructive border-destructive/20 animate-pulse'
                          }`}>
                            {c.health}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Lifecycle Radar */}
          <div className="bg-white dark:bg-card border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[9.5px] font-bold uppercase tracking-[1.5px] text-muted-foreground mb-0.5">Stage Mapping</p>
                <h3 className="font-condensed font-extrabold text-[17px] text-foreground">Global Lifecycle Radar</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-gc-purple" />
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wide">Other</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-gc-orange" />
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wide">Peak</span>
                </div>
              </div>
            </div>
            <div className="flex items-end gap-[3px] h-20">
              {RADAR_LABELS.map((s, i) => {
                const count = barCounts[i];
                const heightPct = maxBar > 0 ? Math.max((count / maxBar) * 100, count > 0 ? 15 : 8) : 8;
                const isPeak = i === activeBarIndex && count > 0;
                return (
                  <div key={s} className="flex-1 group cursor-pointer flex flex-col items-center justify-end h-full gap-1" title={`${s}: ${count} campaign${count !== 1 ? 's' : ''}`}>
                    <div
                      className={`w-1.5 rounded-full transition-all duration-500 group-hover:w-2.5 ${
                        isPeak ? 'bg-gc-orange shadow-[0_0_12px_rgba(232,99,12,0.5)]' : count > 0 ? 'bg-gc-purple/60' : 'bg-muted'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
            {executionCount > 0 ? (
              <div className="mt-4 flex items-start gap-3 p-4 bg-orange-50 border border-orange-100 rounded-lg dark:bg-orange-900/10 dark:border-orange-900/30">
                <ShieldAlert className="h-4 w-4 text-gc-orange shrink-0 mt-0.5" />
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Relay obstruction:</strong> {executionCount} campaign{executionCount !== 1 ? 's' : ''} in execution pipeline.{' '}
                  <button onClick={() => navigate('/campaigns')} className="text-gc-orange font-semibold hover:underline">Review in registry</button>
                </p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="mt-4 flex items-start gap-3 p-4 bg-muted/30 border border-border rounded-lg">
                <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[12px] text-muted-foreground">No campaigns in the pipeline yet.</p>
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-lg dark:bg-green-900/10 dark:border-green-900/30">
                <ShieldCheck className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Pipeline clear:</strong> No campaigns in active execution phase.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="xl:col-span-4 space-y-5">
          {/* Health Score */}
          <div className="bg-white dark:bg-card rounded-xl p-6 text-foreground relative overflow-hidden group border border-purple-100 dark:border-purple-900/30 shadow-sm">
            <div className="absolute top-0 right-0 p-6 text-purple-100 dark:text-purple-900/30 group-hover:rotate-12 transition-transform duration-700">
              <ShieldCheck className="h-28 w-28" strokeWidth={1} />
            </div>
            <p className="text-[9.5px] font-bold uppercase tracking-[1.5px] text-purple-600 dark:text-purple-400 mb-1">Campaign Health</p>
            {campaigns.length > 0 ? (
              <>
                <p className="text-5xl font-condensed font-black tracking-tight text-purple-700 dark:text-purple-300 mb-3">
                  {Math.round((campaigns.filter(c => c.recordHealth === 'Healthy').length / campaigns.length) * 100)}
                  <span className="text-3xl text-purple-400">%</span>
                </p>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                  {campaigns.filter(c => c.recordHealth === 'Healthy').length} of {campaigns.length} campaigns in healthy state.
                </p>
              </>
            ) : (
              <>
                <p className="text-5xl font-condensed font-black tracking-tight text-purple-700 dark:text-purple-300 mb-3">—</p>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">No campaigns to evaluate yet.</p>
              </>
            )}
          </div>

          {/* Live Alert Log */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              <div>
                <p className="text-[9.5px] font-bold uppercase tracking-[1.5px] text-destructive">Escalations</p>
                <h3 className="font-condensed font-extrabold text-[15px] text-foreground">Live Alert Log</h3>
              </div>
            </div>
            <div className="divide-y divide-border">
              {openBlockers.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-muted-foreground">No open blockers.</div>
              ) : (
                openBlockers.slice(0, 3).map((b) => (
                  <div key={b.id} className="flex gap-3 items-start px-5 py-3.5 hover:bg-accent/40 cursor-pointer transition-colors" onClick={() => navigate('/blockers')}>
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2">
                        <p className="text-[12.5px] font-semibold text-foreground truncate">{b.summary}</p>
                        <span className="text-[9.5px] font-mono text-muted-foreground shrink-0">{timeAgo(b.createdAt)}</span>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground font-mono">{b.id} · {b.ownerId}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-border">
              <Button variant="outline" className="w-full h-8 text-[11px] font-semibold" onClick={() => navigate('/blockers')}>
                View All Blockers {openBlockers.length > 0 && `(${openBlockers.length})`}
              </Button>
            </div>
          </div>

          {/* Ops Velocity */}
          <div className="bg-white dark:bg-card border border-green-100 dark:border-green-900/30 rounded-xl p-5 relative overflow-hidden shadow-sm">
            <Activity className="absolute -bottom-3 -right-3 h-20 w-20 text-green-500/10" />
            <p className="text-[9.5px] font-bold uppercase tracking-[1.5px] text-green-600 dark:text-green-400 mb-2">Task Velocity</p>
            {tasks.length > 0 ? (
              <>
                <p className="font-condensed font-bold text-[15px] text-foreground leading-snug">
                  {tasks.filter(t => t.completed).length} of {tasks.length} tasks completed.
                </p>
                <div className="mt-4 h-1.5 bg-green-50 dark:bg-green-900/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-green-600 dark:text-green-400 font-mono mt-1.5">
                  {Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)}% completion rate
                </p>
              </>
            ) : (
              <>
                <p className="font-condensed font-bold text-[15px] text-foreground leading-snug">No tasks yet.</p>
                <div className="mt-4 h-1.5 bg-green-50 dark:bg-green-900/20 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '0%' }} />
                </div>
                <p className="text-[10px] text-green-600 dark:text-green-400 font-mono mt-1.5">0% completion rate</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
