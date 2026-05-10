import React, { useState } from 'react';
import { Task, Status, Priority, Shift } from '../../types';
import { Search, Filter, MoreHorizontal, ArrowUpDown, Clock, AlertCircle, CheckCircle2, Plus, ChevronDown, ChevronUp, RefreshCw, Trash2, UserPlus, CheckSquare, Square, X, Loader2, Bell, LayoutGrid, List, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TaskModal from '../TaskModal';
import { COUNTRY_FLAGS, TEAMS } from '../../constants';
import { useLocalData } from '../LocalDataContext';

interface TaskBoardProps {
  tasks: Task[];
  initialFilter?: string;
  initialStatus?: string;
}

export default function TaskBoard({ tasks, initialFilter = '', initialStatus = 'All' }: TaskBoardProps) {
  const { user, addTask, updateTask, deleteTasks } = useLocalData();
  const [filter, setFilter] = useState(initialFilter);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof Task | 'title'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    setFilter(initialFilter);
    setStatusFilter(initialStatus);
  }, [initialFilter, initialStatus]);

  const handleSort = (field: keyof Task | 'title') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredTasks = tasks.filter(t => 
    (statusFilter === 'All' || t.status === statusFilter) &&
    (filter.toLowerCase() === 'risk'
      ? (t.priority === Priority.HIGH || t.status === Status.BLOCKED) && t.status !== Status.DONE
      : filter.toLowerCase() === 'carry'
        ? t.carry && t.status !== Status.DONE
        : t.title.toLowerCase().includes(filter.toLowerCase()) || 
     t.owner.toLowerCase().includes(filter.toLowerCase()) || 
     t.office.toLowerCase().includes(filter.toLowerCase()) ||
     (t.country && t.country.toLowerCase().includes(filter.toLowerCase())) ||
     (t.team && t.team.toLowerCase().includes(filter.toLowerCase())))
  );

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let valA: any = a[sortField as keyof Task];
    let valB: any = b[sortField as keyof Task];

    if (sortField === 'priority') {
      const weights = { [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
      valA = weights[a.priority as Priority] || 0;
      valB = weights[b.priority as Priority] || 0;
    }

    if (valA == null) valA = '';
    if (valB == null) valB = '';

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedTasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedTasks.map(t => t.id));
    }
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkStatus = async (status: Status) => {
    setIsProcessing(true);
    await Promise.all(selectedIds.map(id => updateTask(id, { status })));
    setSelectedIds([]);
    setIsProcessing(false);
  };

  const handleBulkPriority = async (priority: Priority) => {
    setIsProcessing(true);
    await Promise.all(selectedIds.map(id => updateTask(id, { priority })));
    setSelectedIds([]);
    setIsProcessing(false);
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} tasks?`)) {
      setIsProcessing(true);
      await deleteTasks(selectedIds);
      setSelectedIds([]);
      setIsProcessing(false);
    }
  };

  const handleBulkAssign = async (owner: string) => {
    setIsProcessing(true);
    await Promise.all(selectedIds.map(id => updateTask(id, { owner })));
    setSelectedIds([]);
    setIsProcessing(false);
  };

  const updateStatus = async (id: string, status: Status) => {
    await updateTask(id, { status });
  };

  const toggleStatus = async (id: string, currentStatus: Status) => {
    const statuses = Object.values(Status);
    const currentIndex = statuses.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statuses.length;
    
    await updateTask(id, { status: statuses[nextIndex] });
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (editingTask) {
      await updateTask(editingTask.id, taskData);
      setEditingTask(null);
      return;
    }

    await addTask({
      ...taskData,
      creatorId: 'local-workspace',
      country: taskData.country || 'KSA',
      team: taskData.team || TEAMS[0],
      status: taskData.status || Status.BACKLOG,
      priority: taskData.priority || Priority.MEDIUM,
      owner: taskData.owner || user.name
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            className="mr-4 flex items-center gap-2 px-4 py-2 bg-citrus text-white rounded-xl font-bold text-xs shadow-lg shadow-citrus/20 hover:scale-[1.02] transition-all"
          >
            <Plus className="w-3 h-3" />
            <span>New Task</span>
          </button>
          {['All', ...Object.values(Status)].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                statusFilter === s 
                  ? 'bg-ink text-white border-ink' 
                  : 'bg-white text-muted border-dawn hover:border-citrus'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-dawn rounded-xl p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-ink text-white shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-ink text-white shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              type="text" 
              placeholder="Filter register..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-dawn rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-citrus/20"
            />
          </div>
          <button className="p-2 bg-white border border-dawn rounded-xl hover:bg-slate-soft transition-colors">
            <Filter className="w-4 h-4 text-muted" />
          </button>
          <button className="p-2 bg-white border border-dawn rounded-xl hover:bg-slate-soft transition-colors text-muted hover:text-ink font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <ArrowUpDown className="w-3 h-3" />
            <span>Sort</span>
          </button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 h-[calc(100vh-280px)] min-h-[600px]">
          {Object.values(Status).map(status => {
            const laneTasks = sortedTasks.filter(t => t.status === status);
            return (
              <div key={status} className="flex flex-col h-full bg-stone/40 rounded-3xl border border-dawn/50 p-4">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      status === Status.DONE ? 'bg-green-500' : 
                      status === Status.BLOCKED ? 'bg-red-500' :
                      status === Status.IN_PROGRESS ? 'bg-blue-500' :
                      status === Status.WAITING ? 'bg-amber-500' : 'bg-dawn'
                    }`} />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-ink">{status}</h4>
                    <span className="px-1.5 py-0.5 bg-white border border-dawn rounded-md text-[8px] font-bold text-muted">{laneTasks.length}</span>
                  </div>
                  <button
                    onClick={() => {
                      setEditingTask(null);
                      setIsModalOpen(true);
                      setStatusFilter(status);
                    }}
                    className="p-1 text-muted hover:text-citrus transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                  {laneTasks.map(task => (
                    <motion.div 
                      layoutId={task.id}
                      key={task.id}
                      onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                      className={`relative bg-white border-l-4 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden ${
                        task.priority === Priority.HIGH ? 'border-l-red-500' : 
                        task.priority === Priority.MEDIUM ? 'border-l-amber-500' : 'border-l-blue-500'
                      } ${expandedTaskId === task.id ? 'ring-2 ring-citrus/20' : 'border-dawn'}`}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className={`text-[11px] font-bold leading-tight ${task.status === Status.DONE ? 'text-muted line-through' : 'text-ink'}`}>
                            {task.title}
                          </span>
                          <span className="text-sm flex-shrink-0">{COUNTRY_FLAGS[task.country] || '🌍'}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-muted opacity-50" />
                            <span className="text-[9px] font-bold text-muted uppercase tracking-tighter">{task.office}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-muted opacity-50" />
                            <span className="text-[9px] font-bold text-muted">{new Date(task.due).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-stone border border-dawn rounded-full flex items-center justify-center text-[8px] font-black text-muted">
                              {task.owner.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted/60">{task.shift}</span>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTask(task);
                                setIsModalOpen(true);
                              }}
                              className="w-4 h-4 bg-stone text-muted rounded-md flex items-center justify-center border border-dawn hover:text-citrus"
                              title="Edit task"
                            >
                              <MoreHorizontal className="w-2.5 h-2.5" />
                            </button>
                            {task.carry && (
                              <div className="w-4 h-4 bg-citrus/10 text-citrus rounded-md flex items-center justify-center border border-citrus/20" title="Carry-over">
                                <RefreshCw className="w-2.5 h-2.5" />
                              </div>
                            )}
                            {task.reminders && task.reminders.length > 0 && (
                              <div className="w-4 h-4 bg-amber-50 text-amber-500 rounded-md flex items-center justify-center border border-amber-100" title="Reminders active">
                                <Bell className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1 mt-4 border-t border-stone pt-2">
                          {Object.values(Status).filter(s => s !== task.status).slice(0, 2).map(nextStatus => (
                            <button
                              key={nextStatus}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatus(task.id, nextStatus as Status);
                              }}
                              className="px-2 py-1 bg-stone/50 hover:bg-dawn rounded text-[8px] font-black uppercase tracking-tighter text-muted hover:text-ink transition-colors text-center"
                            >
                              Move to {nextStatus}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {laneTasks.length === 0 && (
                    <div className="p-4 text-center border-2 border-dashed border-dawn/30 rounded-2xl">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted/40 italic">Lane Clear</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-dawn rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone/50 border-b border-dawn">
                <th className="px-6 py-4 w-10">
                  <button 
                    onClick={toggleSelectAll}
                    className="flex items-center justify-center text-muted hover:text-citrus transition-colors"
                  >
                    {selectedIds.length > 0 && selectedIds.length === sortedTasks.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th 
                  onClick={() => handleSort('title')}
                  className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted cursor-pointer hover:text-citrus transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Core Outcome</span>
                    <div className="w-3 h-3 flex items-center justify-center">
                      {sortField === 'title' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-citrus" /> : <ChevronDown className="w-3 h-3 text-citrus" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                      )}
                    </div>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('country')}
                  className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted cursor-pointer hover:text-citrus transition-colors group whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Country</span>
                    <div className="w-3 h-3 flex items-center justify-center">
                      {sortField === 'country' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-citrus" /> : <ChevronDown className="w-3 h-3 text-citrus" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                      )}
                    </div>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('office')}
                  className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted cursor-pointer hover:text-citrus transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Region</span>
                    <div className="w-3 h-3 flex items-center justify-center">
                      {sortField === 'office' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-citrus" /> : <ChevronDown className="w-3 h-3 text-citrus" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                      )}
                    </div>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('team')}
                  className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted cursor-pointer hover:text-citrus transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Team</span>
                    <div className="w-3 h-3 flex items-center justify-center">
                      {sortField === 'team' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-citrus" /> : <ChevronDown className="w-3 h-3 text-citrus" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                      )}
                    </div>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('owner')}
                  className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted cursor-pointer hover:text-citrus transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Identity</span>
                    <div className="w-3 h-3 flex items-center justify-center">
                      {sortField === 'owner' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-citrus" /> : <ChevronDown className="w-3 h-3 text-citrus" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                      )}
                    </div>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('priority')}
                  className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted cursor-pointer hover:text-citrus transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Priority</span>
                    <div className="w-3 h-3 flex items-center justify-center">
                      {sortField === 'priority' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-citrus" /> : <ChevronDown className="w-3 h-3 text-citrus" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                      )}
                    </div>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('status')}
                  className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted cursor-pointer hover:text-citrus transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Current State</span>
                    <div className="w-3 h-3 flex items-center justify-center">
                      {sortField === 'status' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-citrus" /> : <ChevronDown className="w-3 h-3 text-citrus" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                      )}
                    </div>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('due')}
                  className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted cursor-pointer hover:text-citrus transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Commitment</span>
                    <div className="w-3 h-3 flex items-center justify-center">
                      {sortField === 'due' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-citrus" /> : <ChevronDown className="w-3 h-3 text-citrus" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                      )}
                    </div>
                  </div>
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => (
                <React.Fragment key={task.id}>
                  <tr 
                    onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                    className={`group hover:bg-stone/30 transition-colors border-b border-dawn last:border-0 cursor-pointer ${expandedTaskId === task.id ? 'bg-stone/20' : ''} ${selectedIds.includes(task.id) ? 'bg-citrus/5' : ''}`}
                  >
                    <td className="px-6 py-5" onClick={(e) => toggleSelect(e, task.id)}>
                      <div className="flex items-center justify-center text-muted group-hover:text-citrus transition-colors">
                        {selectedIds.includes(task.id) ? (
                          <CheckSquare className="w-4 h-4 text-citrus" />
                        ) : (
                          <Square className="w-4 h-4 opacity-30 group-hover:opacity-100" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 flex-shrink-0 ${task.status === Status.DONE ? 'text-green-500' : 'text-dawn'}`}>
                          <AnimatePresence mode="wait">
                            {task.status === Status.DONE ? (
                              <motion.div
                                key="done"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="pending"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              >
                                <div className="w-4 h-4 border-2 border-current rounded-md" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <span className={`block text-sm font-bold leading-snug transition-colors ${task.status === Status.DONE ? 'text-muted line-through' : 'text-ink group-hover:text-citrus'}`}>
                              {task.title}
                            </span>
                            {task.reminders && task.reminders.length > 0 && (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 rounded border border-amber-100">
                                <Bell className="w-2.5 h-2.5 text-amber-500" />
                                <span className="text-[8px] font-black text-amber-600">{task.reminders.length}</span>
                              </div>
                            )}
                            {expandedTaskId === task.id ? <ChevronUp className="w-3 h-3 text-citrus" /> : <ChevronDown className="w-3 h-3 text-muted group-hover:text-citrus" />}
                          </div>
                          {task.campaign && (
                            <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-widest text-muted/60">{task.campaign}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-citrus bg-citrus/5 px-2 py-0.5 rounded border border-citrus/10">{task.country || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg leading-none">🌍</span>
                        <span className="text-xs font-bold text-muted whitespace-nowrap">{task.office}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted whitespace-nowrap">{task.team || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 bg-dawn rounded-full flex items-center justify-center text-[10px] font-bold text-muted border border-white flex-shrink-0">
                          {task.owner.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-xs font-bold text-muted truncate max-w-[120px]">{task.owner}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                        task.priority === Priority.HIGH ? 'bg-red-50 text-red-500 border-red-100' : 
                        task.priority === Priority.MEDIUM ? 'bg-citrus/10 text-citrus border-citrus/20' : 'bg-blue-50 text-blue-500 border-blue-100'
                      }`}>
                        {task.priority === Priority.HIGH && <AlertCircle className="w-2.5 h-2.5" />}
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => toggleStatus(task.id, task.status)}
                        className="group/status flex items-center gap-2 hover:bg-slate-soft p-1.5 rounded-lg transition-all"
                      >
                        <span className={`block w-1.5 h-1.5 rounded-full ${
                          task.status === Status.DONE ? 'bg-green-500' : 
                          task.status === Status.BLOCKED ? 'bg-red-500' :
                          task.status === Status.IN_PROGRESS ? 'bg-blue-500' :
                          task.status === Status.WAITING ? 'bg-amber-500' : 'bg-dawn'
                        }`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover/status:text-ink">{task.status}</span>
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5 text-muted font-bold text-[11px]">
                        <Clock className="w-3.5 h-3.5 opacity-50" />
                        <span>{new Date(task.due).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setEditingTask(task);
                          setIsModalOpen(true);
                        }}
                        className="p-2 hover:bg-slate-soft rounded-lg transition-colors text-muted opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  {expandedTaskId === task.id && (
                    <tr className="bg-stone/10 border-b border-dawn">
                      <td colSpan={10} className="px-16 py-6 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="grid grid-cols-3 gap-12">
                          <div className="col-span-2 space-y-4">
                            <div>
                              <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2">Detailed Notes & Context</span>
                              <p className="text-sm font-medium text-muted leading-relaxed whitespace-pre-wrap">
                                {task.details || 'No additional notes provided for this outcome.'}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2">Metadata</span>
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                  <span className="text-muted/60">Campaign</span>
                                  <span className="text-ink">{task.campaign || 'General Ops'}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold">
                                  <span className="text-muted/60">Executing Team</span>
                                  <span className="text-ink">{task.team}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold">
                                  <span className="text-muted/60">Shift Window</span>
                                  <span className="text-ink">{task.shift}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold">
                                  <span className="text-muted/60">Created At</span>
                                  <span className="text-ink">{new Date(task.createdAt).toLocaleDateString('en-GB')}</span>
                                </div>
                              </div>
                            </div>
                            {task.carry && (
                              <div className="p-3 bg-citrus/5 border border-citrus/20 rounded-xl">
                                 <div className="flex items-center gap-2 mb-1">
                                    <RefreshCw className="w-3 h-3 text-citrus" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-citrus">Carry-over Flag</span>
                                 </div>
                                 <p className="text-[10px] font-bold text-muted leading-relaxed">This item will be automatically included in the next shift handover.</p>
                              </div>
                            )}
                            
                            {task.reminders && task.reminders.length > 0 && (
                              <div className="space-y-2">
                                <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted">Active Reminders</span>
                                <div className="space-y-1.5">
                                  {task.reminders.map((r, i) => (
                                    <div key={i} className={`flex items-center justify-between p-2 rounded-lg border ${r.triggered ? 'bg-stone/20 border-dawn opacity-50' : 'bg-amber-50/50 border-amber-100'}`}>
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-amber-500" />
                                        <span className="text-[10px] font-bold text-ink">
                                          {new Date(r.time).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      {r.triggered && <span className="text-[8px] font-black uppercase text-muted tracking-widest">Triggered</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          
          {filteredTasks.length === 0 && (
            <div className="p-16 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-stone/50 rounded-full mb-4">
                <Search className="w-6 h-6 text-muted" />
              </div>
              <h3 className="text-lg font-bold text-ink">No outcomes matching filters</h3>
              <p className="text-sm text-muted font-medium mt-1">Try adjusting your search or filters to see more tasks.</p>
            </div>
          )}
        </div>
      </div>
      )}
      
      <div className="flex items-center justify-between text-xs font-bold px-4">
        <span className="text-muted">Displaying <span className="text-ink">{filteredTasks.length}</span> of <span className="text-ink">{tasks.length}</span> total daily outcomes.</span>
        <div className="flex items-center gap-1">
          <button className="px-2 py-1 text-muted hover:text-ink disabled:opacity-30" disabled>Previous</button>
          {[1].map(p => (
            <button key={p} className="w-6 h-6 flex items-center justify-center bg-ink text-white rounded-md">{p}</button>
          ))}
          <button className="px-2 py-1 text-muted hover:text-ink disabled:opacity-30" disabled>Next</button>
        </div>
      </div>
      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveTask}
        initialTask={editingTask}
      />

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 bg-ink text-white rounded-2xl shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 pr-8 border-r border-white/10">
              <span className="flex items-center justify-center w-6 h-6 bg-citrus text-white rounded-full text-[10px] font-black">
                {selectedIds.length}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap">items highlighted</span>
              <button 
                onClick={() => setSelectedIds([])}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 opacity-50" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="group relative">
                <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest">
                  Status
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute bottom-full mb-2 left-0 hidden group-hover:block w-40 bg-white text-ink rounded-xl border border-dawn shadow-2xl overflow-hidden p-1">
                  {Object.values(Status).map(s => (
                    <button 
                      key={s}
                      onClick={() => handleBulkStatus(s)}
                      className="w-full px-4 py-2 text-left hover:bg-stone text-[10px] font-bold uppercase tracking-widest transition-colors rounded-lg"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="group relative">
                <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest">
                  Priority
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute bottom-full mb-2 left-0 hidden group-hover:block w-40 bg-white text-ink rounded-xl border border-dawn shadow-2xl overflow-hidden p-1">
                  {Object.values(Priority).map(p => (
                    <button 
                      key={p}
                      onClick={() => handleBulkPriority(p)}
                      className="w-full px-4 py-2 text-left hover:bg-stone text-[10px] font-bold uppercase tracking-widest transition-colors rounded-lg"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => {
                  const email = window.prompt('Enter owner email address:');
                  if (email) handleBulkAssign(email);
                }}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
              >
                <UserPlus className="w-3 h-3" />
                Assign
              </button>

              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-500 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-white"
              >
                <Trash2 className="w-3 h-3" />
                Discard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
