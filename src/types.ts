export enum Status {
  BACKLOG = 'Backlog',
  IN_PROGRESS = 'In Progress',
  WAITING = 'Waiting',
  BLOCKED = 'Blocked',
  DONE = 'Done',
}

export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
}

export enum Shift {
  MORNING = 'Morning',
  MID = 'Mid',
  NIGHT = 'Night',
}

export interface Reminder {
  time: string;
  triggered: boolean;
  label?: string;
}

export interface Task {
  id: string;
  title: string;
  country: string;
  office: string;
  team: string;
  owner: string;
  shift: Shift;
  priority: Priority;
  status: Status;
  due: string;
  campaign?: string;
  details?: string;
  carry: boolean;
  dod?: string[];
  reminders?: Reminder[];
  createdAt: string;
  updatedAt: string;
  creatorId: string;
}

export interface Handover {
  id: string;
  date: string;
  fromShift: Shift;
  toShift: Shift;
  fromOffice: string;
  toOffice: string;
  team?: string;
  country?: string;
  outgoing: string;
  incoming: string;
  status: 'Pending' | 'Acknowledged';
  watchouts?: string;
  taskIds: string[];
  createdAt: string;
  ackAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
  reviewHistory?: HandoverReviewEntry[];
  creatorId: string;
}

export interface HandoverReviewEntry {
  id: string;
  reviewer: string;
  reviewedAt: string;
  comment: string;
  action: 'Reviewed' | 'Acknowledged';
}

export interface Office {
  id: string;
  name: string;
  country: string;
  lead: string;
  shift: Shift;
}

export interface Member {
  id: string;
  name: string;
  team: string;
  office: string;
  country: string;
  role?: string;
  tasksCompleted: number;
  handoversOut: number;
  onTime: number;
  updatedAt?: string;
}

export interface User {
  name: string;
  role: string;
  office: string;
  country: string;
  email: string;
  team?: string;
  password?: string;
  isSuperAdmin?: boolean;
}

export interface WorkspaceUser extends User {
  id: string;
  team: string;
  status: 'active';
  createdAt: string;
  approvedAt?: string;
}

export interface PendingSignupRequest {
  id: string;
  name: string;
  email: string;
  password: string;
  team: string;
  office: string;
  country: string;
  requestedAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLocked: boolean;
  lastActivity: number;
}

export interface AppState {
  theme: 'light' | 'dark';
  user: User;
  tasks: Task[];
  handovers: Handover[];
  offices: Office[];
  members: Member[];
  teams: string[];
}
