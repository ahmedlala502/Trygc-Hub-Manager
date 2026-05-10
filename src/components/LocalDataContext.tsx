import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { AuthState, Handover, Member, Office, PendingSignupRequest, Shift, Task, User, WorkspaceUser } from '../types';
import { MASTER_ADMIN_EMAIL, MASTER_ADMIN_PASSWORD } from '../constants';
import { AuditEvent, clearAuthState, createId, getAuthState, importWorkspace, loadWorkspace, LocalWorkspace, normalizeTask, resetWorkspace, saveAuthState, saveWorkspace, WorkspaceSettings } from '../lib/localStore';
import { AppPage, FeatureKey, WidgetKey, filterHandoversByTeam, filterMembersByTeam, filterOfficesByTeam, filterTasksByTeam, getCurrentTeam, resolvePermissionProfile } from '../lib/accessControl';

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface SignupPayload {
  name: string;
  email: string;
  password: string;
  team: string;
  office: string;
  country: string;
}

interface LocalDataContextType extends LocalWorkspace {
  loading: boolean;
  isReady: boolean;
  auth: AuthState;
  login: (email: string, password: string) => Promise<AuthResult>;
  requestSignup: (payload: SignupPayload) => Promise<AuthResult>;
  approveSignup: (id: string) => Promise<void>;
  rejectSignup: (id: string) => Promise<void>;
  logout: () => void;
  lock: () => void;
  currentTeam: string;
  isMasterAdmin: boolean;
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
  addMember: (member: Partial<Member> & { email?: string; password?: string }) => Promise<void>;
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

function toSessionUser(account: WorkspaceUser): User {
  return {
    name: account.name,
    role: account.role,
    office: account.office,
    country: account.country,
    email: account.email,
    team: account.team,
    password: account.password,
    isSuperAdmin: account.isSuperAdmin,
  };
}

function isMasterAccount(user?: Pick<User, 'email' | 'password'>) {
  return user?.email?.toLowerCase() === MASTER_ADMIN_EMAIL && user?.password === MASTER_ADMIN_PASSWORD;
}

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

  const isMasterAdmin = isMasterAccount(workspace.user);
  const isSuperAdmin = isMasterAdmin || workspace.user.isSuperAdmin === true || workspace.user.role === 'Super Admin';
  const hasAdminAccess = isMasterAdmin || isSuperAdmin || ['super admin', 'admin', 'manager', 'lead', 'head', 'director', 'general'].some(r => workspace.user.role.toLowerCase().includes(r));
  const currentTeam = getCurrentTeam(workspace.user, workspace.members);
  const permissionProfile = resolvePermissionProfile(workspace.user.role, workspace.settings.rolePermissions);
  const allowedTeams = isSuperAdmin ? ['*'] : permissionProfile.teams;
  const teamIsolation = workspace.settings.featureFlags?.teamIsolation !== false;
  const scopedTasks = filterTasksByTeam(workspace.tasks, allowedTeams, teamIsolation);
  const scopedHandovers = filterHandoversByTeam(workspace.handovers, allowedTeams, teamIsolation);
  const scopedMembers = filterMembersByTeam(workspace.members, allowedTeams, teamIsolation);
  const scopedOffices = filterOfficesByTeam(workspace.offices, workspace.tasks, workspace.members, allowedTeams, teamIsolation);

  React.useEffect(() => {
    const masterAccount = workspace.users.find(user => user.email?.toLowerCase() === MASTER_ADMIN_EMAIL);
    const needsUserFix = (workspace.user.isSuperAdmin || workspace.user.role === 'Super Admin') && !isMasterAccount(workspace.user);
    const needsAccountFix = !masterAccount || masterAccount.password !== MASTER_ADMIN_PASSWORD || masterAccount.role !== 'Super Admin';

    if (!needsUserFix && !needsAccountFix) return;

    setWorkspace(current => {
      const nextUsers = current.users.some(user => user.email?.toLowerCase() === MASTER_ADMIN_EMAIL)
        ? current.users.map(user => user.email?.toLowerCase() === MASTER_ADMIN_EMAIL
          ? { ...user, email: MASTER_ADMIN_EMAIL, password: MASTER_ADMIN_PASSWORD, role: 'Super Admin', isSuperAdmin: true, status: 'active' as const }
          : user)
        : [{
          id: 'user-master',
          name: current.user.name,
          role: 'Super Admin',
          office: current.user.office,
          country: current.user.country,
          email: MASTER_ADMIN_EMAIL,
          password: MASTER_ADMIN_PASSWORD,
          team: current.user.team || current.members.find(member => member.name === current.user.name)?.team || current.settings.teams[0],
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
          isSuperAdmin: true,
        }, ...current.users];

      const next = {
        ...current,
        user: (current.user.isSuperAdmin || current.user.role === 'Super Admin')
          ? {
            ...current.user,
            email: MASTER_ADMIN_EMAIL,
            password: MASTER_ADMIN_PASSWORD,
            role: 'Super Admin',
            isSuperAdmin: true,
          }
          : current.user,
        users: nextUsers,
      };
      saveWorkspace(next);
      return next;
    });
  }, [workspace.user, workspace.users, workspace.members, workspace.settings.teams]);

  const sanitizeUserPatch = (patch: Partial<LocalWorkspace['user']>, currentUser: LocalWorkspace['user']) => {
    if (isMasterAdmin) {
      return {
        ...patch,
        email: MASTER_ADMIN_EMAIL,
        password: MASTER_ADMIN_PASSWORD,
        role: 'Super Admin',
        isSuperAdmin: true,
      };
    }

    const nextPatch = { ...patch };
    delete nextPatch.role;
    delete nextPatch.isSuperAdmin;

    if (nextPatch.email?.toLowerCase() === MASTER_ADMIN_EMAIL) {
      nextPatch.email = currentUser.email;
    }

    if (nextPatch.password === MASTER_ADMIN_PASSWORD) {
      nextPatch.password = currentUser.password;
    }

    return nextPatch;
  };

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const pendingRequest = workspace.pendingSignups.find(request => request.email.toLowerCase() === normalizedEmail);

    if (pendingRequest) {
      return { ok: false, error: 'Your access request is still pending approval.' };
    }

    const account = workspace.users.find(user => user.email.toLowerCase() === normalizedEmail);
    if (!account) {
      return { ok: false, error: 'No approved account was found for this email.' };
    }

    if ((account.password || '') !== normalizedPassword) {
      return { ok: false, error: 'Incorrect password. Please try again.' };
    }

    commit(current => ({
      ...current,
      user: toSessionUser(account),
    }));

    const state: AuthState = { isAuthenticated: true, isLocked: false, lastActivity: Date.now() };
    setAuth(state);
    saveAuthState(state);
    return { ok: true };
  }, [workspace.pendingSignups, workspace.users]);

  const requestSignup = useCallback(async (payload: SignupPayload): Promise<AuthResult> => {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const trimmedPassword = payload.password.trim();

    if (!payload.name.trim() || !normalizedEmail || !trimmedPassword) {
      return { ok: false, error: 'Please complete the full access request form.' };
    }

    if (normalizedEmail === MASTER_ADMIN_EMAIL) {
      return { ok: false, error: 'This email is reserved.' };
    }

    if (workspace.users.some(user => user.email.toLowerCase() === normalizedEmail)) {
      return { ok: false, error: 'An approved account already exists for this email.' };
    }

    if (workspace.pendingSignups.some(request => request.email.toLowerCase() === normalizedEmail)) {
      return { ok: false, error: 'An access request for this email is already pending.' };
    }

    commit(current => appendAudit({
      ...current,
      pendingSignups: [{
        id: createId('signup'),
        name: payload.name.trim(),
        email: normalizedEmail,
        password: trimmedPassword,
        team: payload.team,
        office: payload.office,
        country: payload.country,
        requestedAt: new Date().toISOString(),
      }, ...current.pendingSignups],
    }, 'SIGNUP_REQUEST', { email: normalizedEmail, team: payload.team }));

    return { ok: true };
  }, [workspace.pendingSignups, workspace.users]);

  const logout = useCallback(() => {
    setAuth({ isAuthenticated: false, isLocked: false, lastActivity: 0 });
    clearAuthState();
  }, []);

  const lock = useCallback(() => {
    const state: AuthState = { ...auth, isLocked: true };
    setAuth(state);
    saveAuthState(state);
  }, [auth]);

  const canUsePrivilegedFeature = (feature: FeatureKey) => {
    if (['users.switch', 'users.manage', 'settings.manage', 'widgets.manage', 'ai.configure'].includes(feature)) {
      return isMasterAdmin;
    }
    return isSuperAdmin || permissionProfile.features.includes(feature);
  };

  const value = useMemo<LocalDataContextType>(() => ({
    ...workspace,
    auth,
    loading: false,
    isReady: true,
    login,
    requestSignup,
    approveSignup: async (id) => {
      if (!isMasterAdmin) return;
      commit(current => {
        const request = current.pendingSignups.find(item => item.id === id);
        if (!request) return current;

        const approvedAt = new Date().toISOString();
        const nextUser: WorkspaceUser = {
          id: createId('user'),
          name: request.name,
          role: 'Viewer',
          office: request.office,
          country: request.country,
          email: request.email,
          password: request.password,
          team: request.team,
          status: 'active',
          createdAt: request.requestedAt,
          approvedAt,
        };

        const nextMembers = current.members.some(member => member.name === request.name)
          ? current.members.map(member => member.name === request.name
            ? { ...member, role: member.role || 'Viewer', team: request.team, office: request.office, country: request.country, updatedAt: approvedAt }
            : member)
          : [{
            id: createId('member'),
            name: request.name,
            team: request.team,
            office: request.office,
            country: request.country,
            role: 'Viewer',
            tasksCompleted: 0,
            handoversOut: 0,
            onTime: 0,
            updatedAt: approvedAt,
          }, ...current.members];

        return appendAudit({
          ...current,
          users: [nextUser, ...current.users.filter(user => user.email.toLowerCase() !== request.email.toLowerCase())],
          pendingSignups: current.pendingSignups.filter(item => item.id !== id),
          members: nextMembers,
        }, 'SIGNUP_APPROVED', { email: request.email, role: 'Viewer' });
      });
    },
    rejectSignup: async (id) => {
      if (!isMasterAdmin) return;
      commit(current => {
        const request = current.pendingSignups.find(item => item.id === id);
        if (!request) return current;
        return appendAudit({
          ...current,
          pendingSignups: current.pendingSignups.filter(item => item.id !== id),
        }, 'SIGNUP_REJECTED', { email: request.email });
      });
    },
    logout,
    lock,
    currentTeam,
    isMasterAdmin,
    isSuperAdmin,
    hasAdminAccess,
    scopedTasks,
    scopedHandovers,
    scopedMembers,
    scopedOffices,
    canAccessPage: page => page === 'settings' || isSuperAdmin || permissionProfile.pages.includes(page),
    canUseFeature: feature => canUsePrivilegedFeature(feature),
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
    addMember: async member => {
      if (!isMasterAdmin) return;
      commit(current => {
        const createdAt = new Date().toISOString();
        const name = member.name || 'New Member';
        const role = member.role || 'Operations';
        const team = member.team || current.settings.teams[0];
        const office = member.office || current.user.office;
        const country = member.country || current.user.country;
        const emailBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
        const email = (member.email || `${emailBase || 'user'}@trygc.local`).trim().toLowerCase();
        const password = member.password || '';

        return appendAudit({
          ...current,
          members: [{
            id: createId('member'),
            name,
            team,
            office,
            country,
            role,
            tasksCompleted: member.tasksCompleted || 0,
            handoversOut: member.handoversOut || 0,
            onTime: member.onTime || 0,
            updatedAt: createdAt,
          }, ...current.members],
          users: current.users.some(account => account.email.toLowerCase() === email)
            ? current.users
            : [{
              id: createId('user'),
              name,
              role,
              office,
              country,
              email,
              password,
              team,
              status: 'active',
              createdAt,
              approvedAt: createdAt,
            }, ...current.users],
        }, 'MEMBER_CREATE', { name, email });
      });
    },
    updateMember: async (id, patch) => {
      if (!isMasterAdmin) return;
      commit(current => {
        const target = current.members.find(member => member.id === id);
        if (!target) return current;
        const updatedName = patch.name || target.name;
        const updatedRole = patch.role || target.role || 'Viewer';
        const updatedOffice = patch.office || target.office;
        const updatedCountry = patch.country || target.country;
        const updatedTeam = patch.team || target.team;

        return appendAudit({
          ...current,
          members: current.members.map(member => member.id === id ? { ...member, ...patch, updatedAt: new Date().toISOString() } : member),
          users: current.users.map(account => account.name === target.name
            ? {
              ...account,
              name: updatedName,
              role: updatedRole,
              office: updatedOffice,
              country: updatedCountry,
              team: updatedTeam,
              isSuperAdmin: account.email.toLowerCase() === MASTER_ADMIN_EMAIL ? true : account.isSuperAdmin,
            }
            : account),
          user: current.user.name === target.name
            ? {
              ...current.user,
              name: updatedName,
              role: isMasterAccount(current.user) ? 'Super Admin' : updatedRole,
              office: updatedOffice,
              country: updatedCountry,
              team: updatedTeam,
            }
            : current.user,
        }, 'MEMBER_UPDATE', { id, patch });
      });
    },
    deleteMember: async id => {
      if (!isMasterAdmin) return;
      commit(current => {
        const target = current.members.find(member => member.id === id);
        if (!target) return current;
        return appendAudit({
          ...current,
          members: current.members.filter(member => member.id !== id),
          users: current.users.filter(account => account.name !== target.name || account.email.toLowerCase() === MASTER_ADMIN_EMAIL),
        }, 'MEMBER_DELETE', { id });
      });
    },
    updateSettings: async settings => {
      if (!isMasterAdmin) return;
      commit(current => appendAudit({ ...current, settings }, 'SETTINGS_UPDATE', {}));
    },
    updateUser: async patch => commit(current => {
      const safePatch = sanitizeUserPatch(patch, current.user);
      const nextUser = { ...current.user, ...safePatch };
      const previousName = current.user.name;
      const previousEmail = current.user.email.toLowerCase();

      return appendAudit({
        ...current,
        user: nextUser,
        users: current.users.map(account => account.email.toLowerCase() === previousEmail
          ? {
            ...account,
            name: nextUser.name,
            role: isMasterAccount(nextUser) ? 'Super Admin' : nextUser.role,
            office: nextUser.office,
            country: nextUser.country,
            email: nextUser.email,
            password: nextUser.password,
            team: nextUser.team || account.team,
            isSuperAdmin: isMasterAccount(nextUser) ? true : account.isSuperAdmin,
          }
          : account),
        members: current.members.map(member => member.name === previousName
          ? {
            ...member,
            name: nextUser.name,
            role: isMasterAccount(nextUser) ? 'Super Admin' : nextUser.role,
            office: nextUser.office,
            country: nextUser.country,
            updatedAt: new Date().toISOString(),
          }
          : member),
      }, 'PROFILE_UPDATE', safePatch);
    }),
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
  }), [workspace, auth, login, requestSignup, logout, lock, currentTeam, isMasterAdmin, isSuperAdmin, hasAdminAccess, scopedTasks, scopedHandovers, scopedMembers, scopedOffices, permissionProfile]);

  return <LocalDataContext.Provider value={value}>{children}</LocalDataContext.Provider>;
}

export function useLocalData() {
  const context = useContext(LocalDataContext);
  if (!context) throw new Error('useLocalData must be used within LocalDataProvider');
  return context;
}
