import { Status, Priority, Shift, Task, Handover, Office, User, Member } from './types';

export const COUNTRY_FLAGS: Record<string, string> = {
  'KSA': '🇸🇦',
  'UAE': '🇦🇪',
  'KW': '🇰🇼',
  'EG': '🇪🇬',
  'BH': '🇧🇭',
  'QA': '🇶🇦',
  'OM': '🇴🇲',
};

export const MASTER_ADMIN_EMAIL = 'a.essmat@grand-community.com';
export const MASTER_ADMIN_PASSWORD = '112233';
export const SUPER_ADMIN_PASSWORD = MASTER_ADMIN_PASSWORD;

export const INITIAL_USER: User = {
  name: 'Ahmed Essmat',
  role: 'Super Admin',
  office: 'Cairo HQ',
  country: 'EG',
  email: MASTER_ADMIN_EMAIL,
  password: MASTER_ADMIN_PASSWORD,
  isSuperAdmin: true,
};

export const TEAMS = [
  'Operations Team',
  'Community Team',
];

export const OFFICES: Office[] = [
  { id: '1', name: 'Riyadh Office', country: 'KSA', lead: 'Mona KSA', shift: Shift.MORNING },
  { id: '2', name: 'Dubai Office', country: 'UAE', lead: 'Nour UAE', shift: Shift.MORNING },
  { id: '3', name: 'Kuwait Office', country: 'KW', lead: 'Fahad KW', shift: Shift.NIGHT },
  { id: '4', name: 'Cairo HQ', country: 'EG', lead: 'Ahmed Essmat', shift: Shift.MID },
];

export const INITIAL_MEMBERS: Member[] = [
  { id: 'm1', name: 'Ahmed Essmat', team: 'Operations Team', office: 'Cairo HQ', country: 'EG', role: 'Super Admin', tasksCompleted: 18, handoversOut: 7, onTime: 16 },
  { id: 'm2', name: 'Mona KSA', team: 'Community Team', office: 'Riyadh Office', country: 'KSA', role: 'Community Lead', tasksCompleted: 14, handoversOut: 4, onTime: 12 },
  { id: 'm3', name: 'Nour UAE', team: 'Operations Team', office: 'Dubai Office', country: 'UAE', role: 'Shift Lead', tasksCompleted: 11, handoversOut: 3, onTime: 10 },
  { id: 'm4', name: 'Fahad KW', team: 'Community Team', office: 'Kuwait Office', country: 'KW', role: 'Creator Coverage Lead', tasksCompleted: 9, handoversOut: 5, onTime: 7 },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Audit Tashas missing coverage links',
    country: 'KSA',
    office: 'Riyadh Office',
    team: 'Community Team',
    owner: 'Mona KSA',
    shift: Shift.MORNING,
    priority: Priority.HIGH,
    status: Status.BLOCKED,
    due: new Date().toISOString(),
    details: 'Waiting for influencer proof links from agents.',
    carry: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creatorId: 'mock-admin'
  },
  {
    id: 't2',
    title: 'Daily client snapshot UAE Restaurants',
    country: 'UAE',
    office: 'Dubai Office',
    team: 'Operations Team',
    owner: 'Nour UAE',
    shift: Shift.MORNING,
    priority: Priority.MEDIUM,
    status: Status.IN_PROGRESS,
    due: new Date().toISOString(),
    carry: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creatorId: 'mock-admin'
  },
];

export const INITIAL_HANDOVERS: Handover[] = [
  {
    id: 'h1',
    date: new Date().toISOString().split('T')[0],
    fromShift: Shift.MORNING,
    toShift: Shift.MID,
    fromOffice: 'Riyadh Office',
    toOffice: 'Cairo HQ',
    team: 'Community Team',
    country: 'KSA',
    outgoing: 'Mona KSA',
    incoming: 'Ahmed Essmat',
    status: 'Pending',
    watchouts: 'Please prioritize the Tashas audit as the client is chasing.',
    taskIds: ['t1'],
    createdAt: new Date().toISOString(),
    creatorId: 'mock-admin'
  },
];
