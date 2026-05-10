/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BarChart3, TrendingUp, CheckCircle2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell,
} from 'recharts';

const DATA_KPI = [
  { name: 'KSA', active: 12, closed: 45 },
  { name: 'UAE', active: 8, closed: 32 },
  { name: 'EG', active: 15, closed: 28 },
  { name: 'KW', active: 4, closed: 12 },
];

const COLORS = ['#f97316', '#6b21a8', '#16a34a', '#64748b'];

export default function OperationalAnalytics() {
  return (
    <div className="max-w-[1240px] mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <div className="text-[9.5px] font-bold uppercase tracking-[1.5px] text-gc-orange">Data Science</div>
          <h2 className="font-condensed font-extrabold text-[22px] tracking-tight text-foreground">Operational Insights</h2>
          <p className="text-muted-foreground flex items-center gap-2 mt-1 text-[12px]">
            <TrendingUp size={14} className="text-gc-purple" />
            Performance mapping across the full TryGC ecosystem.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <AnalyticsStatCard title="Total Campaigns" value="156" trend="+12.5%" desc="YoY Growth Managed" icon={<BarChart3 size={22} />} accent="orange" />
        <AnalyticsStatCard title="QA Pass Rate" value="98.2%" trend="+0.4%" desc="Against Compliance Brief" icon={<CheckCircle2 size={22} />} accent="purple" />
        <AnalyticsStatCard title="Recovery Avg Time" value="1.4h" trend="-15%" desc="Lead to Archive Speed" icon={<TrendingUp size={22} />} accent="lavender" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-condensed font-bold text-[10px] uppercase tracking-widest text-muted-foreground mb-5">Active vs Closed Operations</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DATA_KPI}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={11} fontWeight="bold" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(82,53,140,0.05)' }}
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)', borderRadius: '8px', fontSize: '11px' }}
                />
                  <Bar dataKey="active" fill="#f97316" radius={[4, 4, 0, 0]} name="Active" />
                  <Bar dataKey="closed" fill="#6b21a8" radius={[4, 4, 0, 0]} name="Closed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-5 mt-3">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gc-orange" /><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Active</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gc-purple" /><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Closed</span></div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center">
          <h3 className="font-condensed font-bold text-[10px] uppercase tracking-widest text-muted-foreground mb-5 self-start">Market Distribution</h3>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie data={DATA_KPI} innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="active" stroke="transparent">
                  {DATA_KPI.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)', borderRadius: '8px', fontSize: '11px' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {DATA_KPI.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-secondary/30">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-[9.5px] font-bold uppercase text-foreground tracking-wider">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsStatCard({ title, value, trend, desc, icon, accent }: any) {
  const accentClasses = {
    orange: { text: 'text-gc-orange', bg: 'bg-gc-orange/10', border: 'border-gc-orange/20' },
    purple: { text: 'text-gc-purple', bg: 'bg-gc-purple/10', border: 'border-gc-purple/20' },
    lavender: { text: 'text-[#A798BF]', bg: 'bg-[#A798BF]/10', border: 'border-[#A798BF]/20' },
  }[accent] || { text: 'text-foreground', bg: 'bg-muted', border: 'border-border' };

  const isPositive = trend.startsWith('+');
  const isNegative = trend.startsWith('-');

  return (
    <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden group hover:border-gc-orange/30 transition-colors">
      <div className={`absolute top-5 right-5 p-2.5 rounded-lg ${accentClasses.bg} ${accentClasses.text}`}>
        {icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground mb-1">{title}</p>
      <p className={`text-4xl font-condensed font-black tracking-tight mt-1 ${accentClasses.text}`}>{value}</p>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <p className="text-[10.5px] font-mono text-muted-foreground max-w-[140px] uppercase tracking-wider">{desc}</p>
        <span className={`px-2 py-0.5 rounded border text-[9.5px] font-bold tracking-widest ${
          isNegative
            ? 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800'
            : isPositive
            ? 'text-gc-orange bg-gc-orange/10 border-gc-orange/20'
            : 'text-muted-foreground bg-muted border-border'
        }`}>{trend}</span>
      </div>
    </div>
  );
}
