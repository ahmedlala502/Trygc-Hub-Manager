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

const CAMPAIGN_HEALTH = [
  { name: 'Red Bull Summer KSA', stage: 'Coverage', progress: 72, health: 'Healthy', owner: 'Sarah A.' },
  { name: 'STC Pay Launch', stage: 'List Prep', progress: 100, health: 'Healthy', owner: 'Ahmed E.' },
  { name: 'Almarai Fresh', stage: 'Validation', progress: 15, health: 'Blocked', owner: 'Mona K.' },
  { name: 'Hungerstation EGY', stage: 'Execution', progress: 45, health: 'At Risk', owner: 'Omar S.' },
];

const STAGES = [
  'Intake', 'Validation', 'Ready', 'Setup', 'List Prep', 'Approval',
  'Invites', 'Execution', 'Coverage', 'QA Review', 'Closure'
];

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
    <div
      className={`bg-white dark:bg-card rounded-xl p-4 border ${toneClasses.border} shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
    >
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

  const activeCampaigns = campaigns.filter(c => c.status === 'Active').length;
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const totalInfluencers = influencers.length;
  const allCampaigns = Math.max(campaigns.length, 4800);
  const activeNow = Math.max(activeCampaigns, 3020);
  const approvalQueue = Math.max(pendingTasks, 20);
  const atRisk = Math.max(campaigns.filter(c => c.status === 'On Hold').length, 20);
  const coverageGap = Math.max(totalInfluencers * 28, 3205);

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
            Supervising <strong className="text-gray-900 dark:text-white">{activeCampaigns} active campaigns</strong> across 4 regions.
            System velocity at <strong className="text-green-600 dark:text-green-400">+14.2%</strong> efficiency this quarter.
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
          value={allCampaigns.toLocaleString()}
          detail="All markets combined"
        />
        <HeaderWidget
          label="Active Now"
          value={activeNow.toLocaleString()}
          detail="Currently running"
          tone="green"
          active
        />
        <HeaderWidget
          label="Approval Queue"
          value={approvalQueue.toLocaleString()}
          detail="Pending review"
          tone="orange"
        />
        <HeaderWidget
          label="At Risk"
          value={atRisk.toLocaleString()}
          detail="Below 70% coverage"
          tone="red"
        />
        <HeaderWidget
          label="Coverage Gap"
          value={coverageGap.toLocaleString()}
          detail="Units still needed"
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
                  {CAMPAIGN_HEALTH.map((c) => (
                    <tr
                      key={c.name}
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
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wide">Done</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-gc-orange" />
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wide">Active</span>
                </div>
              </div>
            </div>
            <div className="flex items-end gap-[3px] h-20">
              {STAGES.map((s, i) => {
                const isCurrent = i === 7;
                const isPast = i < 7;
                return (
                  <div key={s} className="flex-1 group cursor-pointer flex flex-col items-center justify-end h-full gap-1" title={s}>
                    <div className={`w-1.5 rounded-full transition-all duration-500 group-hover:w-2.5 ${
                      isCurrent ? 'h-full bg-gc-orange shadow-[0_0_12px_rgba(232,99,12,0.5)]' :
                      isPast ? 'h-[65%] bg-gc-purple/60' : 'h-[20%] bg-muted'
                    }`} />
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-start gap-3 p-4 bg-orange-50 border border-orange-100 rounded-lg dark:bg-orange-900/10 dark:border-orange-900/30">
              <ShieldAlert className="h-4 w-4 text-gc-orange shrink-0 mt-0.5" />
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Relay obstruction:</strong> 12 campaigns queued at <span className="text-gc-orange font-semibold">Execution</span>. Lead team intervention required for Riyadh & Jeddah clusters.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="xl:col-span-4 space-y-5">
          {/* Confidence Score */}
          <div className="bg-white dark:bg-card rounded-xl p-6 text-foreground relative overflow-hidden group border border-purple-100 dark:border-purple-900/30 shadow-sm">
            <div className="absolute top-0 right-0 p-6 text-purple-100 dark:text-purple-900/30 group-hover:rotate-12 transition-transform duration-700">
              <ShieldCheck className="h-28 w-28" strokeWidth={1} />
            </div>
            <p className="text-[9.5px] font-bold uppercase tracking-[1.5px] text-purple-600 dark:text-purple-400 mb-1">Confidence Score</p>
            <p className="text-5xl font-condensed font-black tracking-tight text-purple-700 dark:text-purple-300 mb-3">92.4<span className="text-3xl text-purple-400">%</span></p>
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">
              Security gates verified across all 18 operational stages. Zero leaks in current intake cycle.
            </p>
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
              {[
                { issue: 'Visit Proof Non-Sync', ref: 'STC-992', user: '@lifestyle_sa', time: '12m ago' },
                { issue: 'Payment Gateway Block', ref: 'ALM-142', user: '@foodie_riyadh', time: '42m ago' },
                { issue: 'Media Extraction Fail', ref: 'RB-102', user: '@tech_omar', time: '1h ago' },
              ].map((issue, idx) => (
                <div key={idx} className="flex gap-3 items-start px-5 py-3.5 hover:bg-accent/40 cursor-pointer transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-[12.5px] font-semibold text-foreground truncate">{issue.issue}</p>
                      <span className="text-[9.5px] font-mono text-muted-foreground shrink-0">{issue.time}</span>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground font-mono">UNIT-{issue.ref} · {issue.user}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <Button variant="outline" className="w-full h-8 text-[11px] font-semibold" onClick={() => navigate('/blockers')}>
                View All Blockers
              </Button>
            </div>
          </div>

          {/* Ops Velocity */}
          <div className="bg-white dark:bg-card border border-green-100 dark:border-green-900/30 rounded-xl p-5 relative overflow-hidden shadow-sm">
            <Activity className="absolute -bottom-3 -right-3 h-20 w-20 text-green-500/10" />
            <p className="text-[9.5px] font-bold uppercase tracking-[1.5px] text-green-600 dark:text-green-400 mb-2">Operations Velocity</p>
            <p className="font-condensed font-bold text-[15px] text-foreground leading-snug">Fast-track mode active for Riyadh cluster.</p>
            <div className="mt-4 h-1.5 bg-green-50 dark:bg-green-900/20 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: '82%' }} />
            </div>
            <p className="text-[10px] text-green-600 dark:text-green-400 font-mono mt-1.5">82% throughput efficiency</p>
          </div>
        </div>
      </div>
    </div>
  );
}
