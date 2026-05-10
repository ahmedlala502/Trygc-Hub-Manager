import React, { useState, useMemo } from 'react';
import { Globe, Search, Plus, Loader2, Sparkles, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OFFICES, TEAMS } from './constants';
import { Status, Priority, Shift } from './types';
import { useLocalData } from './components/LocalDataContext';
import { APP_PAGES } from './lib/accessControl';

// Components
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/views/Dashboard';
import TaskBoard from './components/views/TaskBoard';
import HandoverFlow from './components/views/HandoverFlow';
import AICopilot from './components/views/AICopilot';
import OfficeRegister from './components/views/OfficeRegister';
import SettingsView from './components/views/Settings';
import Reporting from './components/views/Reporting';
import TeamPerformance from './components/views/TeamPerformance';
import ReminderEngine from './components/ReminderEngine';
import TaskModal from './components/TaskModal';

export default function App() {
  const { user, tasks, handovers, offices, members, settings, scopedTasks, scopedHandovers, scopedOffices, scopedMembers, loading, isReady, addTask, auth, login, currentTeam, canAccessPage, canUseFeature } = useLocalData();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'handover' | 'offices' | 'team' | 'ai' | 'settings' | 'reports'>(() => getInitialTab());
  const [settingsTab, setSettingsTab] = useState(() => getInitialSettingsTab());
  const [isGlobalTaskModalOpen, setIsGlobalTaskModalOpen] = useState(false);
  const [taskFilterPreset, setTaskFilterPreset] = useState('');
  const [taskStatusPreset, setTaskStatusPreset] = useState('All');
  
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('trygc_theme') || 'flow';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  React.useEffect(() => {
    const syncFromHash = () => {
      const nextTab = getInitialTab();
      const nextSettingsTab = getInitialSettingsTab();
      setActiveTab(nextTab);
      if (nextTab === 'settings') setSettingsTab(nextSettingsTab);
    };

    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  React.useEffect(() => {
    const suffix = activeTab === 'settings' ? `:${settingsTab}` : '';
    window.history.replaceState(null, '', `#${activeTab}${suffix}`);
  }, [activeTab, settingsTab]);

  React.useEffect(() => {
    if (canAccessPage(activeTab)) return;
    const fallback = APP_PAGES.find(page => canAccessPage(page)) || 'dashboard';
    setActiveTab(fallback);
  }, [activeTab, canAccessPage]);

  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  const stats = useMemo(() => {
    const open = scopedTasks.filter(t => t.status !== Status.DONE);
    const risks = open.filter(t => t.priority === Priority.HIGH || t.status === Status.BLOCKED);
    return {
      openCount: open.length,
      riskCount: risks.length,
      carryCount: open.filter(t => t.carry).length,
      handoverCount: scopedHandovers.filter(h => h.status === 'Pending').length
    };
  }, [scopedTasks, scopedHandovers]);

  const [copilotMessages, setCopilotMessages] = useState<{role: 'user' | 'assistant', content: string, timestamp: number}[]>([
    { role: 'assistant', content: 'Operational intelligence is ready. How can I assist with your shift flow or risk synthesis today?', timestamp: Date.now() }
  ]);

  const openSettingsTab = (tab: string) => {
    setSettingsTab(tab);
    setActiveTab('settings');
  };

  const openTasks = (filter = '', status = 'All') => {
    setTaskFilterPreset(filter);
    setTaskStatusPreset(status);
    setActiveTab('tasks');
  };

  const saveTaskFromHeader = async (taskData: any) => {
    await addTask({
      ...taskData,
      creatorId: 'local-workspace',
      owner: taskData.owner || user.name,
    });
    setIsGlobalTaskModalOpen(false);
  };

  const handleQuickAdd = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && quickAddTitle.trim() && !isQuickAdding) {
      setIsQuickAdding(true);
      try {
        await addTask({
          title: quickAddTitle.trim(),
          details: 'Quickly added task via Command Palette.',
          priority: Priority.MEDIUM,
          status: Status.BACKLOG,
          shift: Shift.MORNING,
          owner: user.name,
          country: user.country || 'KSA',
          office: user.office || OFFICES[0].name,
          team: currentTeam || TEAMS[0],
          creatorId: 'local-workspace',
          due: new Date().toISOString().split('T')[0],
          carry: false,
          dod: [],
        });
        setQuickAddTitle('');
      } catch (error) {
        console.error('Quick add failed:', error);
      } finally {
        setIsQuickAdding(false);
      }
    }
  };

  if (!isReady || loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-stone">
        <Sparkles className="w-12 h-12 text-citrus animate-pulse mb-4" />
        <p className="text-sm font-black uppercase tracking-[0.3em] text-ink animate-pulse">Initializing Ecosystem</p>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Login onLogin={login} isLocked={auth.isLocked} passwordless={settings.authMode === 'none'} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard tasks={scopedTasks} handovers={scopedHandovers} offices={scopedOffices} stats={stats} onActionRisks={() => openTasks('risk')} onGenerateBrief={() => setActiveTab(canAccessPage('ai') ? 'ai' : 'settings')} onNavigate={(tab, filter, status) => tab === 'tasks' ? openTasks(filter, status) : setActiveTab(tab as any)} />;
      case 'tasks': return <TaskBoard tasks={scopedTasks} initialFilter={taskFilterPreset} initialStatus={taskStatusPreset} />;
      case 'handover': return <HandoverFlow handovers={scopedHandovers} tasks={scopedTasks} stats={stats} aiInteractions={copilotMessages} />;
      case 'offices': return <OfficeRegister offices={scopedOffices} tasks={scopedTasks} />;
      case 'team': return <TeamPerformance members={scopedMembers} offices={scopedOffices} tasks={scopedTasks} handovers={scopedHandovers} />;
      case 'reports': return <Reporting tasks={scopedTasks} handovers={scopedHandovers} stats={stats} />;
      case 'ai': return <AICopilot tasks={scopedTasks} handovers={scopedHandovers} messages={copilotMessages} setMessages={setCopilotMessages} />;
      case 'settings': return <SettingsView activeTab={settingsTab} setActiveTab={setSettingsTab} />;
      default: return <Dashboard tasks={scopedTasks} handovers={scopedHandovers} offices={scopedOffices} stats={stats} onActionRisks={() => openTasks('risk')} onGenerateBrief={() => setActiveTab(canAccessPage('ai') ? 'ai' : 'settings')} onNavigate={(tab, filter, status) => tab === 'tasks' ? openTasks(filter, status) : setActiveTab(tab as any)} />;
    }
  };

  return (
    <div className="flex h-screen bg-stone overflow-hidden">
      <ReminderEngine tasks={tasks} />
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        openSettingsTab={openSettingsTab}
        stats={stats}
      />
      
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 flex items-center justify-between px-8 bg-stone/50 backdrop-blur-md border-b border-dawn">
          <div>
            <h1 className="relaxed-title text-2xl text-ink uppercase tracking-tight">
              {activeTab === 'dashboard' ? 'Daily Rhythm' : 
               activeTab === 'tasks' ? 'Task Register' : 
               activeTab === 'handover' ? 'Shift Continuity' : 
               activeTab === 'offices' ? 'Office Registry' : 
               activeTab === 'team' ? 'Team Performance' :
               activeTab === 'reports' ? 'Performance Reporting' :
               activeTab === 'settings' ? 'System Settings' : 'Operations Copilot'}
            </h1>
            <p className="text-sm text-muted font-medium">
              {activeTab === 'dashboard' ? 'A focused view of today’s priorities and team flow.' : 
               activeTab === 'tasks' ? 'Managing daily outcomes across all regions.' : 
               activeTab === 'handover' ? 'Guiding the bridge between outgoing and incoming teams.' : 
               activeTab === 'offices' ? 'Management of regional operating hubs and regional leads.' : 
               activeTab === 'team' ? 'Member-level output, on-time rate, and handover accountability.' :
               activeTab === 'reports' ? 'Statistical synthesis of regional outcomes and closure rates.' :
               activeTab === 'settings' ? 'Configure your workspace and preferences.' : 'AI intelligence layers for the modern workspace.'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-citrus transition-colors" />
              <input 
                type="text" 
                placeholder="Find anything..." 
                className="pl-10 pr-4 py-2 bg-white/50 border border-dawn rounded-xl focus:outline-none focus:ring-2 focus:ring-citrus/20 focus:border-citrus transition-all w-48 text-sm font-medium"
              />
            </div>

            <div className="relative group">
              {isQuickAdding ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-citrus animate-spin" />
              ) : (
                <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-citrus transition-colors" />
              )}
              <input 
                type="text" 
                value={quickAddTitle}
                onChange={(e) => setQuickAddTitle(e.target.value)}
                onKeyDown={handleQuickAdd}
                placeholder="Quick add task..." 
                disabled={isQuickAdding}
                className="pl-10 pr-4 py-2 bg-citrus/5 border border-citrus/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-citrus focus:border-citrus transition-all w-64 text-sm font-bold placeholder:font-medium disabled:opacity-50 shadow-inner"
              />
            </div>

            {activeTab !== 'settings' && canUseFeature('task.create') && (
              <button 
              onClick={() => setIsGlobalTaskModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-xl font-semibold text-sm hover:bg-ink/90 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Entry</span>
              </button>
            )}
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
        <TaskModal isOpen={isGlobalTaskModalOpen} onClose={() => setIsGlobalTaskModalOpen(false)} onSave={saveTaskFromHeader} />
      </main>
    </div>
  );
}

function getInitialTab(): 'dashboard' | 'tasks' | 'handover' | 'offices' | 'team' | 'ai' | 'settings' | 'reports' {
  const tab = window.location.hash.replace('#', '').split(':')[0];
  return ['dashboard', 'tasks', 'handover', 'offices', 'team', 'ai', 'settings', 'reports'].includes(tab)
    ? tab as any
    : 'dashboard';
}

function getInitialSettingsTab() {
  return window.location.hash.replace('#', '').split(':')[1] || 'general';
}
