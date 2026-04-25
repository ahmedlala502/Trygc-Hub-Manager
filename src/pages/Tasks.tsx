/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckSquare,
  Clock,
  Edit2,
  Filter,
  Plus,
  Save,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { cn } from '../utils';
import { dataService } from '../services/dataService';
import { Task } from '../types';

const OWNERS = ['Ahmed E.', 'Sarah A.', 'Mona K.', 'Omar S.', 'Coverage Team', 'QA Team', 'Community Team'];
const PRIORITIES: Task['priority'][] = ['Low', 'Medium', 'High', 'Critical'];

const emptyDraft = (): Partial<Task> => ({
  title: '',
  description: '',
  ownerId: 'Sarah A.',
  campaignId: 'Generic Ops',
  priority: 'Medium',
  dueDate: Date.now() + 86400000,
  completed: false,
});

export default function TasksCenter() {
  const [tasks, setTasks] = useState<Task[]>(dataService.getTasks());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Task>>(emptyDraft());
  const [query, setQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Task['priority']>('all');
  const [showCreate, setShowCreate] = useState(false);

  const campaigns = dataService.getCampaigns();
  const owners = Array.from(new Set([...OWNERS, ...tasks.map((task) => task.ownerId?.trim()).filter(Boolean)]));

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const haystack = `${task.title} ${task.description} ${task.ownerId} ${task.campaignId}`.toLowerCase();
        const matchesQuery = !query || haystack.includes(query.toLowerCase());
        const matchesOwner = ownerFilter === 'all' || task.ownerId.trim() === ownerFilter;
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'completed' ? task.completed : !task.completed);
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        return matchesQuery && matchesOwner && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        const priorityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (priorityWeight[b.priority] !== priorityWeight[a.priority]) return priorityWeight[b.priority] - priorityWeight[a.priority];
        return a.dueDate - b.dueDate;
      });
  }, [tasks, query, ownerFilter, statusFilter, priorityFilter]);

  const saveTask = () => {
    if (!draft.title?.trim()) return;
    if (editingId) {
      setTasks(dataService.updateTask(editingId, { ...draft, updatedAt: Date.now() }));
      setEditingId(null);
    } else {
      const task: Task = {
        id: `TSK-${Date.now()}`,
        title: draft.title || '',
        description: draft.description || '',
        ownerId: draft.ownerId || 'Ops',
        campaignId: draft.campaignId || 'Generic Ops',
        priority: draft.priority || 'Medium',
        dueDate: draft.dueDate || Date.now(),
        completed: Boolean(draft.completed),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'admin',
      };
      setTasks(dataService.addTask(task));
      setShowCreate(false);
    }
    setDraft(emptyDraft());
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setDraft({ ...task });
    setShowCreate(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowCreate(false);
    setDraft(emptyDraft());
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(dataService.updateTask(id, { ...updates, updatedAt: Date.now() }));
  };

  const activeCount = tasks.filter((task) => !task.completed).length;
  const overdueCount = tasks.filter((task) => !task.completed && isPast(task.dueDate)).length;
  const completedCount = tasks.filter((task) => task.completed).length;

  return (
    <div className="max-w-[1240px] mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-gc-orange">Core Operations</div>
          <h2 className="font-extrabold text-2xl tracking-tight text-foreground">Task Management</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckSquare size={16} className="text-gc-orange" />
            Assign, reassign, edit, and close day-to-day operational work.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setEditingId(null);
            setDraft(emptyDraft());
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-gc-orange px-4 py-2 text-sm font-bold text-white hover:bg-gc-orange/90"
        >
          <Plus size={16} />
          New Task
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TaskStat label="Active" value={activeCount} tone="orange" />
        <TaskStat label="Overdue" value={overdueCount} tone="red" />
        <TaskStat label="Completed" value={completedCount} tone="green" />
        <TaskStat label="Owners" value={owners.length} tone="purple" />
      </div>

      {(showCreate || editingId) && (
        <TaskEditor
          draft={draft}
          setDraft={setDraft}
          campaigns={campaigns.map((campaign) => campaign.name)}
          owners={owners}
          title={editingId ? 'Edit Task' : 'Create Task'}
          onSave={saveTask}
          onCancel={cancelEdit}
        />
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="grid gap-3 border-b border-border bg-muted/30 p-4 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="settings-input pl-9"
              placeholder="Search task, owner, campaign..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select value={ownerFilter} onChange={setOwnerFilter} options={['all', ...owners]} />
          <Select value={statusFilter} onChange={(value) => setStatusFilter(value as any)} options={['active', 'completed', 'all']} />
          <Select value={priorityFilter} onChange={(value) => setPriorityFilter(value as any)} options={['all', ...PRIORITIES]} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground">State</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground">Task</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground">Assignee</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground">Campaign</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground">Priority</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground">Due</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[1.4px] text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTasks.map((task) => {
                const overdue = !task.completed && isPast(task.dueDate);
                return (
                  <tr key={task.id} className={cn('group hover:bg-accent/40', overdue && 'bg-red-50/60 dark:bg-red-900/10')}>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => updateTask(task.id, { completed: !task.completed })}
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg border-2',
                          task.completed ? 'border-green-600 bg-green-600 text-white' : 'border-border text-transparent hover:border-gc-orange'
                        )}
                      >
                        <Check size={17} strokeWidth={3} />
                      </button>
                    </td>
                    <td className="px-5 py-4 min-w-[280px]">
                      <p className={cn('text-sm font-bold text-foreground', task.completed && 'line-through text-muted-foreground')}>{task.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{task.description || 'No description'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <select className="settings-input min-w-36" value={task.ownerId.trim()} onChange={(event) => updateTask(task.id, { ownerId: event.target.value })}>
                        {owners.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <input className="settings-input min-w-40" value={task.campaignId} onChange={(event) => updateTask(task.id, { campaignId: event.target.value })} />
                    </td>
                    <td className="px-5 py-4">
                      <select className={cn('settings-input min-w-28 font-bold', priorityTone(task.priority))} value={task.priority} onChange={(event) => updateTask(task.id, { priority: event.target.value as Task['priority'] })}>
                        {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <div className={cn('flex items-center gap-2 text-xs font-bold', overdue ? 'text-red-600' : 'text-muted-foreground')}>
                        <Clock size={14} />
                        {format(task.dueDate, 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => startEdit(task)} className="icon-btn opacity-0 group-hover:opacity-100">
                        <Edit2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TaskEditor({ draft, setDraft, campaigns, owners, title, onSave, onCancel }: any) {
  return (
    <div className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm dark:border-orange-900/30 dark:bg-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-gc-orange">Task Editor</p>
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
        </div>
        <button onClick={onCancel} className="icon-btn"><X size={15} /></button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Title" value={draft.title || ''} onChange={(value: string) => setDraft({ ...draft, title: value })} />
        <label>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assignee</span>
          <select className="settings-input" value={draft.ownerId || ''} onChange={(event) => setDraft({ ...draft, ownerId: event.target.value })}>
            {owners.map((owner: string) => <option key={owner} value={owner}>{owner}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Campaign</span>
          <input className="settings-input" list="campaign-options" value={draft.campaignId || ''} onChange={(event) => setDraft({ ...draft, campaignId: event.target.value })} />
          <datalist id="campaign-options">
            {campaigns.map((campaign: string) => <option key={campaign} value={campaign} />)}
          </datalist>
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Priority</span>
          <select className="settings-input" value={draft.priority || 'Medium'} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}>
            {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Due Date</span>
          <input className="settings-input" type="date" value={format(draft.dueDate || Date.now(), 'yyyy-MM-dd')} onChange={(event) => setDraft({ ...draft, dueDate: new Date(event.target.value).getTime() })} />
        </label>
        <label className="md:col-span-2">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Description</span>
          <textarea className="settings-input min-h-24" value={draft.description || ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-accent">Cancel</button>
        <button onClick={onSave} className="inline-flex items-center gap-2 rounded-lg bg-gc-orange px-4 py-2 text-sm font-bold text-white hover:bg-gc-orange/90">
          <Save size={15} />
          Save Task
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input className="settings-input" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select className="settings-input min-w-36 capitalize" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function TaskStat({ label, value, tone }: { label: string; value: number; tone: 'orange' | 'red' | 'green' | 'purple' }) {
  const tones = {
    orange: 'text-gc-orange',
    red: 'text-red-600',
    green: 'text-green-600',
    purple: 'text-purple-600 dark:text-purple-400',
  };
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-card">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
      <p className={cn('mt-1 text-3xl font-bold tabular-nums', tones[tone])}>{value}</p>
    </div>
  );
}

function priorityTone(priority: Task['priority']) {
  if (priority === 'Critical') return 'text-red-700';
  if (priority === 'High') return 'text-orange-700';
  if (priority === 'Medium') return 'text-amber-700';
  return 'text-green-700';
}
