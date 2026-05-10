import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { AuthState, Handover, Member, Office, Shift, Task } from '../types';
import { AuditEvent, createId, getAuthState, saveAuthState, clearAuthState, LocalWorkspace, loadWorkspace, normalizeTask, resetWorkspace, saveWorkspace, verifyPasscode, WorkspaceSettings, importWorkspace } from '../lib/localStore';
import { AppPage, FeatureKey, WidgetKey, filterHandoversByTeam, filterMembersByTeam, filterOfficesByTeam, filterTasksByTeam, getCurrentTeam, resolvePermissionProfile } from '../lib/accessControl';

interface LocalDataContextType extends LocalWorkspace {
  loading: boolean;
  isReady: boolean;
  auth: AuthState;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  lock: () => void;
  currentTeam: string;
  isSuperAdmin: boolean;
  hasAdminAccess: boolean;
  scopedTasks: Task[];
  scopedHandovers: Handover[];
  scopedMembers: Member[];
  scopedOffices: Office[];
  canAccessPage: (page: AppPage) => boolean;
  canUseFeature: (feature: FeatureKey) => boolean;
  isWidgetEnabled: (widget: WidgetKey) => boolean;
  addTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTasks: (ids: string[]) => Promise<void>;
  addHandover: (handover: Partial<Handover>) => Promise<void>;
  updateHandover: (id: string, patch: Partial<Handover>) => Promise<void>;
  addOffice: (office: Partial<Office>) => Promise<void>;
  updateOffice: (id: string, patch: Partial<Office>) => Promise<void>;
  deleteOffice: (id: string) => Promise<void>;
  addMember: (member: Partial<Member>) => Promise<void>;
  updateMember: (id: string, patch: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  updateSettings: (settings: WorkspaceSettings) => Promise<void>;
  updateUser: (patch: Partial<LocalWorkspace['user']>) => Promise<void>;
  exportWorkspace: () => LocalWorkspace;
  importData: (json: string) => boolean;
  resetData: () => Promise<void>;
  logAction: (action: string, details?: unknown) => Promise<void>;
}

const LocalDataContext = createContext<LocalDataContextType | undefined>(undefined);

export function LocalDataProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<LocalWorkspace>(() => loadWorkspace());
  const [auth, setAuth] = useState<AuthState>(() => getAuthState());

  const commit = (updater: (current: LocalWorkspace) => LocalWorkspace) => {
    setWorkspace(current => {
      const next = updater(current);
      saveWorkspace(next);
      return next;
    });
  };

  const appendAudit = (current: LocalWorkspace, action: string, details?: unknown): LocalWorkspace => {
    const event: AuditEvent = {
      id: createId('audit'),
      action,
      details: details || {},
      timestamp: new Date().toISOString(),
    };
    return { ...current, auditLogs: [event, ...current.auditLogs].slice(0, 100) };
  };

  const login = useCallback(async (password: string): Promise<boolean> => {
    const ok = verifyPasscode(password, workspace.user.password, workspace.settings.authMode);
    if (ok) {
      const state: AuthState = { isAuthenticated: true, isLocked: false, lastActivity: Date.now() };
      setAuth(state);
      saveAuthState(state);
      return true;
    }
    return false;
  }, [workspace.user.password, workspace.settings.authMode]);

  const logout = useCallback(() => {
    setAuth({ isAuthenticated: false, isLocked: false, lastActivity: 0 });
    clearAuthState();
  }, []);

  const lock = useCallback(() => {
    const state: AuthState = { ...auth, isLocked: true };
    setAuth(state);
    saveAuthState(state);
  }, [auth]);

  const isSuperAdmin = workspace.user.isSuperAdmin === true || workspace.user.role === 'Super Admin';
  const hasAdminAccess = isSuperAdmin || ['super admin', 'admin', 'manager', 'lead', 'head', 'director', 'general'].some(r => workspace.user.role.toLowerCase().includes(r));
  const currentTeam = getCurrentTeam(workspace.user, workspace.members);
  const permissionProfile = resolvePermissionProfile(workspace.user.role, workspace.settings.rolePermissions);
  const allowedTeams = isSuperAdmin ? ['*'] : permissionProfile.teams;
  const teamIsolation = workspace.settings.featureFlags?.teamIsolation !== false;
  const scopedTasks = filterTasksByTeam(workspace.tasks, allowedTeams, teamIsolation);
  const scopedHandovers = filterHandoversByTeam(workspace.handovers, allowedTeams, teamIsolation);
  const scopedMembers = filterMembersByTeam(workspace.members, allowedTeams, teamIsolation);
  const scopedOffices = filterOfficesByTeam(workspace.offices, workspace.tasks, workspace.members, allowedTeams, teamIsolation);

  const value = useMemo<LocalDataContextType>(() => ({
    ...workspace,
    auth,
    loading: false,
    isReady: true,
    login,
    logout,
    lock,
    currentTeam,
    isSuperAdmin,
    hasAdminAccess,
    scopedTasks,
    scopedHandovers,
    scopedMembers,
    scopedOffices,
    canAccessPage: page => isSuperAdmin || permissionProfile.pages.includes(page),
    canUseFeature: feature => isSuperAdmin || permissionProfile.features.includes(feature),
    isWidgetEnabled: widget => workspace.settings.widgetConfig?.[widget] !== false,
    addTask: async task => commit(current => appendAudit({
      ...current,
      tasks: [normalizeTask(task, current.user), ...current.tasks],
    }, 'TASK_CREATE', { title: task.title })),
    updateTask: async (id, patch) => commit(current => appendAudit({
      ...current,
      tasks: current.tasks.map(task => task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task),
    }, 'TASK_UPDATE', { id, patch })),
    deleteTasks: async ids => commit(current => appendAudit({
      ...current,
      tasks: current.tasks.filter(task => !ids.includes(task.id)),
    }, 'TASK_DELETE', { count: ids.length })),
    addHandover: async handover => commit(current => appendAudit({
      ...current,
      handovers: [{
        id: createId('handover'),
        date: handover.date || new Date().toISOString().split('T')[0],
        fromShift: handover.fromShift!,
        toShift: handover.toShift!,
        fromOffice: handover.fromOffice || '',
        toOffice: handover.toOffice || '',
        team: handover.team || current.settings.teams[0],
        country: handover.country || current.user.country,
        outgoing: handover.outgoing || current.user.name,
        incoming: handover.incoming || 'TBD',
        status: handover.status || 'Pending',
        watchouts: handover.watchouts || '',
        taskIds: handover.taskIds || [],
        createdAt: handover.createdAt || new Date().toISOString(),
        ackAt: handover.ackAt,
        creatorId: 'local-workspace',
      }, ...current.handovers],
    }, 'HANDOVER_INITIATE', { taskCount: handover.taskIds?.length || 0 })),
    updateHandover: async (id, patch) => commit(current => appendAudit({
      ...current,
      handovers: current.handovers.map(handover => handover.id === id ? { ...handover, ...patch } : handover),
    }, 'HANDOVER_UPDATE', { id, patch })),
    addOffice: async office => commit(current => appendAudit({
      ...current,
      offices: [{ id: createId('office'), name: office.name || 'New Hub', country: office.country || 'EG', lead: office.lead || current.user.name, shift: office.shift || Shift.MORNING }, ...current.offices],
    }, 'OFFICE_REGISTER', { name: office.name })),
    updateOffice: async (id, patch) => commit(current => appendAudit({
      ...current,
      offices: current.offices.map(office => office.id === id ? { ...office, ...patch } : office),
    }, 'OFFICE_UPDATE', { id, patch })),
    deleteOffice: async id => commit(current => appendAudit({
      ...current,
      offices: current.offices.filter(office => office.id !== id),
    }, 'OFFICE_DELETE', { id })),
    addMember: async member => commit(current => appendAudit({
      ...current,
      members: [{
        id: createId('member'),
        name: member.name || 'New Member',
        team: member.team || current.settings.teams[0],
        office: member.office || current.user.office,
        country: member.country || current.user.country,
        role: member.role || 'Operations',
        tasksCompleted: member.tasksCompleted || 0,
        handoversOut: member.handoversOut || 0,
        onTime: member.onTime || 0,
        updatedAt: new Date().toISOString(),
      }, ...current.members],
    }, 'MEMBER_CREATE', { name: member.name })),
    updateMember: async (id, patch) => commit(current => appendAudit({
      ...current,
      members: current.members.map(member => member.id === id ? { ...member, ...patch, updatedAt: new Date().toISOString() } : member),
    }, 'MEMBER_UPDATE', { id, patch })),
    deleteMember: async id => commit(current => appendAudit({
      ...current,
      members: current.members.filter(member => member.id !== id),
    }, 'MEMBER_DELETE', { id })),
    updateSettings: async settings => commit(current => appendAudit({ ...current, settings }, 'SETTINGS_UPDATE', {})),
    updateUser: async patch => commit(current => appendAudit({ ...current, user: { ...current.user, ...patch } }, 'PROFILE_UPDATE', patch)),
    exportWorkspace: () => workspace,
    importData: (json: string) => {
      const imported = importWorkspace(json);
      if (!imported) return false;
      setWorkspace(imported);
      saveWorkspace(imported);
      return true;
    },
    resetData: async () => {
      clearAuthState();
      setWorkspace(resetWorkspace());
      setAuth({ isAuthenticated: false, isLocked: false, lastActivity: 0 });
    },
    logAction: async (action, details) => commit(current => appendAudit(current, action, details)),
  }), [workspace, auth, login, logout, lock, currentTeam, isSuperAdmin, hasAdminAccess, scopedTasks, scopedHandovers, scopedMembers, scopedOffices, permissionProfile]);

  return <LocalDataContext.Provider value={value}>{children}</LocalDataContext.Provider>;
}

export function useLocalData() {
  const context = useContext(LocalDataContext);
  if (!context) throw new Error('useLocalData must be used within LocalDataProvider');
  return context;
}
