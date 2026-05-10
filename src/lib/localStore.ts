import { AuthState, Handover, Member, Office, PendingSignupRequest, Priority, Shift, Status, Task, User, WorkspaceUser } from '../types';
import { INITIAL_HANDOVERS, INITIAL_MEMBERS, INITIAL_TASKS, INITIAL_USER, MASTER_ADMIN_EMAIL, MASTER_ADMIN_PASSWORD, OFFICES, TEAMS, SUPER_ADMIN_PASSWORD } from '../constants';
import { DEFAULT_ROLE_PERMISSIONS, DEFAULT_WIDGET_CONFIG, RolePermissionMap, WidgetConfig } from './accessControl';

export interface CustomProvider {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
}

export interface WorkspaceSettings {
  name: string;
  sla: number;
  teams: string[];
  locations: string[];
  autoBridge?: boolean;
  authMode?: 'local' | 'none';
  minPasscodeLength?: number;
  sessionLockMinutes?: number;
  aiProvider?: string;
  aiModel?: string;
  aiEndpoint?: string;
  apiKeyHint?: string;
  providerModels?: Record<string, string>;
  providerEndpoints?: Record<string, string>;
  mcpConfig?: string;
  customProviders?: CustomProvider[];
  featureFlags?: Record<string, boolean>;
  rolePermissions?: RolePermissionMap;
  widgetConfig?: WidgetConfig;
  fallbackProviders?: string[];
  appearance?: {
    fontSize: number;
    radius: number;
    density: 'compact' | 'comfortable';
  };
}

export interface AuditEvent {
  id: string;
  action: string;
  details: unknown;
  timestamp: string;
}

export interface LocalWorkspace {
  user: User;
  users: WorkspaceUser[];
  pendingSignups: PendingSignupRequest[];
  tasks: Task[];
  handovers: Handover[];
  offices: Office[];
  members: Member[];
  settings: WorkspaceSettings;
  auditLogs: AuditEvent[];
}

const STORE_KEY = 'trygc_flowos_workspace_v4';
const AUTH_STORE_KEY = 'trygc_flowos_auth_v1';

export function getAuthState(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_STORE_KEY);
    if (!raw) return { isAuthenticated: false, isLocked: false, lastActivity: 0 };
    return JSON.parse(raw);
  } catch {
    return { isAuthenticated: false, isLocked: false, lastActivity: 0 };
  }
}

export function saveAuthState(state: AuthState): void {
  localStorage.setItem(AUTH_STORE_KEY, JSON.stringify(state));
}

export function clearAuthState(): void {
  localStorage.removeItem(AUTH_STORE_KEY);
}

export function verifyPasscode(input: string, userPassword?: string, settingsAuthMode?: string): boolean {
  if (settingsAuthMode === 'none') return true;
  if (userPassword && input === userPassword) return true;
  if (input === SUPER_ADMIN_PASSWORD) return true;
  return false;
}

export function isSuperAdmin(role: string): boolean {
  return role === 'Super Admin';
}

export function hasAdminAccess(role: string): boolean {
  const r = role.toLowerCase();
  return r.includes('super admin') || r.includes('admin') || r.includes('manager') || r.includes('lead') || r.includes('head') || r.includes('director') || r.includes('general');
}

function migrateMasterUser(user?: User): User {
  const seed = user || INITIAL_USER;
  const shouldBeMaster = seed.isSuperAdmin === true || seed.role === 'Super Admin';

  if (!shouldBeMaster) return seed;

  return {
    ...seed,
    email: MASTER_ADMIN_EMAIL,
    password: MASTER_ADMIN_PASSWORD,
    isSuperAdmin: true,
    role: 'Super Admin',
  };
}

function buildUserFromMember(member: Member): WorkspaceUser {
  const now = new Date().toISOString();
  const emailBase = member.name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  return {
    id: createId('user'),
    name: member.name,
    role: member.role || 'Viewer',
    office: member.office,
    country: member.country,
    email: `${emailBase || 'user'}@trygc.local`,
    password: '',
    team: member.team,
    status: 'active',
    createdAt: now,
  };
}

function buildMasterAccount(): WorkspaceUser {
  const now = new Date().toISOString();
  return {
    id: 'user-master',
    name: INITIAL_USER.name,
    role: 'Super Admin',
    office: INITIAL_USER.office,
    country: INITIAL_USER.country,
    email: MASTER_ADMIN_EMAIL,
    password: MASTER_ADMIN_PASSWORD,
    team: INITIAL_MEMBERS.find(member => member.name === INITIAL_USER.name)?.team || TEAMS[0],
    status: 'active',
    createdAt: now,
    approvedAt: now,
    isSuperAdmin: true,
  };
}

function migrateWorkspaceUsers(users: WorkspaceUser[] | undefined, members: Member[]): WorkspaceUser[] {
  const seededUsers: WorkspaceUser[] = (users || [])
    .filter(Boolean)
    .map(user => ({
      ...user,
      role: user.role || 'Viewer',
      office: user.office || INITIAL_USER.office,
      country: user.country || INITIAL_USER.country,
      team: user.team || members.find(member => member.name === user.name)?.team || TEAMS[0],
      status: 'active' as const,
      createdAt: user.createdAt || new Date().toISOString(),
      approvedAt: user.approvedAt || user.createdAt || new Date().toISOString(),
      isSuperAdmin: user.email?.toLowerCase() === MASTER_ADMIN_EMAIL ? true : user.isSuperAdmin,
      password: user.email?.toLowerCase() === MASTER_ADMIN_EMAIL ? MASTER_ADMIN_PASSWORD : (user.password || ''),
    }));

  const masterAccount = buildMasterAccount();
  const masterIndex = seededUsers.findIndex(user => user.email?.toLowerCase() === MASTER_ADMIN_EMAIL);

  if (masterIndex >= 0) {
    seededUsers[masterIndex] = { ...seededUsers[masterIndex], ...masterAccount };
  } else {
    seededUsers.unshift(masterAccount);
  }

  return seededUsers.length ? seededUsers : [masterAccount, ...members.filter(member => member.name !== INITIAL_USER.name).map(buildUserFromMember)];
}

function migratePendingSignups(pendingSignups?: PendingSignupRequest[]): PendingSignupRequest[] {
  return (pendingSignups || []).filter(Boolean).map(request => ({
    ...request,
    requestedAt: request.requestedAt || new Date().toISOString(),
    team: request.team || TEAMS[0],
    office: request.office || INITIAL_USER.office,
    country: request.country || INITIAL_USER.country,
  }));
}

export function importWorkspace(jsonData: string): LocalWorkspace | null {
  try {
    const data = JSON.parse(jsonData) as Partial<LocalWorkspace>;
    if (!data.tasks && !data.members && !data.offices) return null;
    const seed = createWorkspace();
    const members = data.members || seed.members;
    return {
      user: migrateMasterUser(data.user || INITIAL_USER),
      users: migrateWorkspaceUsers(data.users, members),
      pendingSignups: migratePendingSignups(data.pendingSignups),
      tasks: data.tasks || [],
      handovers: data.handovers || [],
      offices: data.offices || [],
      members,
      settings: migrateSettings({ ...seed.settings, ...(data.settings || {}) }),
      auditLogs: data.auditLogs || [],
    };
  } catch {
    return null;
  }
}

export function createWorkspace(): LocalWorkspace {
  const seededUsers = [
    buildMasterAccount(),
    ...INITIAL_MEMBERS
      .filter(member => member.name !== INITIAL_USER.name)
      .map(buildUserFromMember),
  ];

  return {
    user: INITIAL_USER,
    users: seededUsers,
    pendingSignups: [],
    tasks: INITIAL_TASKS,
    handovers: INITIAL_HANDOVERS,
    offices: OFFICES,
    members: INITIAL_MEMBERS,
    settings: {
      name: 'TryGC Hub Manager',
      sla: 30,
      teams: TEAMS,
      locations: ['Cairo', 'Riyadh', 'Dubai', 'Kuwait'],
      autoBridge: true,
      authMode: 'local',
      minPasscodeLength: 6,
      sessionLockMinutes: 60,
      aiProvider: 'gemini',
      aiModel: 'gemini-1.5-flash',
      aiEndpoint: '',
      apiKeyHint: 'Set GEMINI_API_KEY in your local environment when AI calls are needed.',
      featureFlags: {
        autoRiskFlagging: true,
        carryOverThreshold: true,
        officeIsolation: true,
        teamIsolation: true,
        shiftOverlapBuffer: true,
        aiBriefGeneration: true,
        localBackups: true,
      },
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
      widgetConfig: DEFAULT_WIDGET_CONFIG,
      fallbackProviders: ['local', 'openai', 'anthropic', 'groq'],
      appearance: {
        fontSize: 14,
        radius: 24,
        density: 'comfortable',
      },
    },
    auditLogs: [],
  };
}

export function loadWorkspace(): LocalWorkspace {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return createWorkspace();
    const parsed = JSON.parse(raw) as Partial<LocalWorkspace>;
    const seed = createWorkspace();
    const members = parsed.members?.length ? parsed.members : seed.members;
    return {
      user: migrateMasterUser(parsed.user || seed.user),
      users: migrateWorkspaceUsers(parsed.users, members),
      pendingSignups: migratePendingSignups(parsed.pendingSignups),
      tasks: parsed.tasks?.length ? parsed.tasks : seed.tasks,
      handovers: parsed.handovers || seed.handovers,
      offices: parsed.offices?.length ? parsed.offices : seed.offices,
      members,
      settings: migrateSettings({ ...seed.settings, ...(parsed.settings || {}) }),
      auditLogs: parsed.auditLogs || [],
    };
  } catch {
    return createWorkspace();
  }
}

function migrateSettings(settings: WorkspaceSettings): WorkspaceSettings {
  const teams = settings.teams?.some(team => team === 'Operations Team' || team === 'Community Team')
    ? settings.teams
    : TEAMS;

  return {
    ...settings,
    authMode: settings.authMode === 'none' ? 'local' : (settings.authMode || 'local'),
    teams,
    featureFlags: {
      ...settings.featureFlags,
      officeIsolation: settings.featureFlags?.officeIsolation ?? true,
      teamIsolation: settings.featureFlags?.teamIsolation ?? true,
    },
    rolePermissions: settings.rolePermissions || DEFAULT_ROLE_PERMISSIONS,
    widgetConfig: { ...DEFAULT_WIDGET_CONFIG, ...(settings.widgetConfig || {}) },
    fallbackProviders: settings.fallbackProviders?.length ? settings.fallbackProviders : ['local', 'openai', 'anthropic', 'groq'],
  };
}

export function saveWorkspace(workspace: LocalWorkspace) {
  localStorage.setItem(STORE_KEY, JSON.stringify(workspace));
}

export function resetWorkspace() {
  const workspace = createWorkspace();
  saveWorkspace(workspace);
  return workspace;
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeTask(task: Partial<Task>, user: User): Task {
  const now = new Date().toISOString();
  return {
    id: task.id || createId('task'),
    title: task.title || 'Untitled task',
    country: task.country || user.country || 'EG',
    office: task.office || user.office || 'Cairo HQ',
    team: task.team || TEAMS[0],
    owner: task.owner || user.name,
    shift: task.shift || Shift.MORNING,
    priority: task.priority || Priority.MEDIUM,
    status: task.status || Status.BACKLOG,
    due: task.due || now,
    campaign: task.campaign || '',
    details: task.details || '',
    carry: task.carry || false,
    dod: task.dod || [],
    reminders: task.reminders || [],
    createdAt: task.createdAt || now,
    updatedAt: now,
    creatorId: task.creatorId || 'local-workspace',
  };
}
