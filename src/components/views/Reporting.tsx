import React, { useMemo, useState } from 'react';
import { Handover, Priority, Shift, Status, Task } from '../../types';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, CheckCircle, Download, FileText, Filter, Globe, RefreshCw, TrendingUp, Users, Zap } from 'lucide-react';
import { COUNTRY_FLAGS, TEAMS } from '../../constants';
import { motion } from 'motion/react';

interface ReportingProps {
  tasks: Task[];
  handovers: Handover[];
  stats: {
    openCount: number;
    riskCount: number;
    carryCount: number;
    handoverCount: number;
  };
}

const COLORS = ['#1E293B', '#F28C33', '#3B82F6', '#EF4444', '#10B981', '#6366F1', '#F59E0B'];

export default function Reporting({ tasks, handovers, stats }: ReportingProps) {
  const [teamFilter, setTeamFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [shiftFilter, setShiftFilter] = useState('All');

  const teams = useMemo(() => ['All', ...new Set([...TEAMS, ...tasks.map(task => task.team)].filter(Boolean))], [tasks]);
  const countries = useMemo(() => ['All', ...new Set(tasks.map(task => task.country).filter(Boolean))], [tasks]);
  const filteredTasks = useMemo<Task[]>(() => tasks.filter(task =>
    (teamFilter === 'All' || task.team === teamFilter) &&
    (countryFilter === 'All' || task.country === countryFilter) &&
    (shiftFilter === 'All' || task.shift === shiftFilter)
  ), [countryFilter, shiftFilter, tasks, teamFilter]);

  const totalCompleted = filteredTasks.filter(t => t.status === Status.DONE).length;
  const closureRate = filteredTasks.length ? (totalCompleted / filteredTasks.length) * 100 : 0;
  const riskCount = filteredTasks.filter(t => t.status !== Status.DONE && (t.status === Status.BLOCKED || t.priority === Priority.HIGH)).length;

  const teamData = groupCount<Task>(filteredTasks, task => task.team || 'Unassigned').map(item => ({
    ...item,
    closed: filteredTasks.filter(task => task.team === item.name && task.status === Status.DONE).length,
    risk: filteredTasks.filter(task => task.team === item.name && (task.priority === Priority.HIGH || task.status === Status.BLOCKED)).length,
  }));

  const countryData = groupCount<Task>(filteredTasks, task => task.country || 'N/A');
  const shiftData = Object.values(Shift).map(shift => ({
    name: shift,
    open: filteredTasks.filter(task => task.shift === shift && task.status !== Status.DONE).length,
    closed: filteredTasks.filter(task => task.shift === shift && task.status === Status.DONE).length,
    handovers: handovers.filter(handover => handover.fromShift === shift || handover.toShift === shift).length,
  }));
  const userData = groupCount<Task>(filteredTasks, task => task.owner || 'Unassigned').map(item => ({
    name: item.name,
    total: item.value,
    closed: filteredTasks.filter(task => task.owner === item.name && task.status === Status.DONE).length,
    risk: filteredTasks.filter(task => task.owner === item.name && (task.priority === Priority.HIGH || task.status === Status.BLOCKED)).length,
    countries: [...new Set(filteredTasks.filter(task => task.owner === item.name).map(task => task.country))].join(', '),
    teams: [...new Set(filteredTasks.filter(task => task.owner === item.name).map(task => task.team))].join(', '),
  })).sort((a, b) => b.total - a.total);

  const statusData = Object.values(Status).map(status => ({
    name: status,
    value: filteredTasks.filter(task => task.status === status).length,
  }));

  const officeData = groupCount<Task>(filteredTasks, task => task.office || 'Unassigned').map(item => ({
    ...item,
    risk: filteredTasks.filter(task => task.office === item.name && (task.priority === Priority.HIGH || task.status === Status.BLOCKED)).length,
  }));

  return (
    <div className="space-y-10 pb-20">
      <section className="glass-card bg-citrus/5 border-citrus/20 p-8 flex flex-col xl:flex-row justify-between gap-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-citrus/10 text-citrus rounded-lg border border-citrus/20 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            <Zap className="w-3 h-3" />
            <span>Analytics command layer</span>
          </div>
          <h2 className="relaxed-title text-3xl mb-3">Per-user, country, shift, office, and team reporting.</h2>
          <p className="text-muted font-medium max-w-3xl leading-relaxed">
            Current filtered view is running at <span className="text-ink font-bold">{closureRate.toFixed(1)}% closure velocity</span> with <span className="text-red-500 font-bold">{riskCount} active risk items</span>. Office isolation and team isolation are reflected directly in the filters and charts.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-[520px]">
          <FilterSelect label="Team" value={teamFilter} options={teams} onChange={setTeamFilter} />
          <FilterSelect label="Country" value={countryFilter} options={countries} onChange={setCountryFilter} />
          <FilterSelect label="Shift" value={shiftFilter} options={['All', ...Object.values(Shift)]} onChange={setShiftFilter} />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {[
          { label: 'Filtered Tasks', val: filteredTasks.length, icon: FileText, color: 'text-blue-500', trend: `${tasks.length} total workspace` },
          { label: 'Closure Rate', val: `${closureRate.toFixed(1)}%`, icon: CheckCircle, color: 'text-green-500', trend: `${totalCompleted} completed` },
          { label: 'Risk Intensity', val: riskCount, icon: AlertCircle, color: 'text-red-500', trend: `${stats.riskCount} total risk` },
          { label: 'Carry-over', val: filteredTasks.filter(t => t.carry).length, icon: RefreshCw, color: 'text-citrus', trend: 'Shift continuity' },
          { label: 'Handovers', val: handovers.length, icon: Globe, color: 'text-blue-500', trend: 'Transfer audit' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-card p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <span className="relaxed-title text-3xl font-bold block mb-2">{kpi.val}</span>
            <div className="text-[10px] font-bold text-muted/60 uppercase tracking-widest">{kpi.trend}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <ChartCard title="Team Isolation Load" desc="Operations Team vs Community Team, with risk overlay.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teamData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} />
              <RechartsTooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Total" fill="#1E293B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="risk" name="Risk" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Country Load" desc="Regional work distribution by country.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={countryData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} />
              <RechartsTooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                {countryData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <ChartCard title="Shift Rhythm" desc="Open, closed, and handover volume by shift." compact>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={shiftData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} />
              <RechartsTooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="open" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="closed" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="handovers" stroke="#F28C33" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Mix" desc="Current task state breakdown." compact>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={92} paddingAngle={3}>
                {statusData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <RechartsTooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Office Isolation" desc="Workload and risk per office." compact>
          <div className="space-y-4 overflow-y-auto max-h-[260px] pr-2 custom-scrollbar">
            {officeData.map((office, index) => (
              <div key={office.name} className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-ink">{office.name}</span>
                  <span className={office.risk ? 'text-red-500' : 'text-muted'}>{office.risk} risk / {office.value} total</span>
                </div>
                <div className="h-2 bg-dawn rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, office.value * 20)}%` }} className="h-full rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </section>

      <section className="glass-card p-0 overflow-hidden">
        <div className="p-6 border-b border-dawn flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-citrus" />
            <div>
              <h3 className="relaxed-title text-xl">Per-user Performance</h3>
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Owner load, closure, risk, countries, and team scope</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-dawn rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-stone transition-all">
            <Download className="w-3.5 h-3.5" />
            <span>Export View</span>
          </button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-stone/50 border-b border-dawn">
            <tr>
              {['User', 'Team Scope', 'Countries', 'Total', 'Closed', 'Risk', 'Closure'].map(head => (
                <th key={head} className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-dawn">
            {userData.map(user => {
              const rate = user.total ? Math.round((user.closed / user.total) * 100) : 0;
              return (
                <tr key={user.name} className="hover:bg-stone/30 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-dawn rounded-xl flex items-center justify-center text-[11px] font-black text-muted border border-white">{initials(user.name)}</div>
                      <span className="text-sm font-bold text-ink">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-xs font-bold text-muted">{user.teams}</td>
                  <td className="px-6 py-5 text-xs font-bold text-muted">{user.countries.split(', ').map(country => `${COUNTRY_FLAGS[country] || ''} ${country}`).join('  ')}</td>
                  <td className="px-6 py-5 relaxed-title text-xl">{user.total}</td>
                  <td className="px-6 py-5 text-xs font-black text-green-600">{user.closed}</td>
                  <td className="px-6 py-5 text-xs font-black text-red-500">{user.risk}</td>
                  <td className="px-6 py-5">
                    <div className="w-36">
                      <div className="h-1.5 bg-dawn rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${rate}%` }} className={`h-full rounded-full ${rate >= 75 ? 'bg-green-500' : rate >= 40 ? 'bg-citrus' : 'bg-red-500'}`} />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted mt-2 block">{rate}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2"><Filter className="w-3 h-3" /> {label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="w-full bg-white/80 border border-dawn rounded-xl px-4 py-3 text-sm font-bold focus:border-citrus outline-none">
        {options.map(option => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ChartCard({ title, desc, children, compact = false }: { title: string; desc: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <div className="glass-card p-6 border-dawn min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="relaxed-title text-xl">{title}</h3>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">{desc}</p>
        </div>
        <TrendingUp className="w-4 h-4 text-dawn" />
      </div>
      <div className={`${compact ? 'h-[260px]' : 'h-[330px]'} min-w-0 w-full`}>{children}</div>
    </div>
  );
}

function groupCount<T>(items: T[], keyer: (item: T) => string) {
  const groups = items.reduce((acc, item) => {
    const key = keyer(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return Object.entries(groups).map(([name, value]) => ({ name, value }));
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 3).toUpperCase();
}

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid #E2E8F0',
  padding: '12px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
};
