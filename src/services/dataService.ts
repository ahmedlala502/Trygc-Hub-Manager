/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CampaignStage } from '../constants';
import { Campaign, CampaignInfluencer, Blocker, Task } from '../types';

// Mock Data Initial State
const INITIAL_CAMPAIGNS_DATA: Campaign[] = [
  { 
    id: 'C-001', 
    name: 'Red Bull Summer KSA', 
    clientId: 'c1', 
    brandId: 'b1',
    stage: CampaignStage.COVERAGE_IN_PROGRESS, 
    status: 'Active', 
    country: 'KSA', 
    budget: 50000, 
    budgetType: 'USD',
    recordHealth: 'Healthy',
    targetInfluencers: 50,
    targetPostingCoverage: 100,
    currentOwner: 'Sarah A.',
    nextAction: 'Reconcile visit logs',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now(),
    createdBy: 'system',
    city: 'Riyadh',
    objective: 'Brand Awareness',
    platforms: ['Instagram', 'TikTok'],
    type: 'Influencer Marketing',
    startDate: '2024-06-01',
    endDate: '2024-08-31',
    deliverables: '2 Stories, 1 Reel',
    tags: '#RedBullSummer',
    mentions: '@redbullksa',
    links: 'redbull.com/summer',
    visitRequired: true,
    productDetails: 'Summer Edition Cans',
    approvalFlow: 'Standard',
    reportingCadence: 'Weekly',
    restrictions: 'None',
    internalOwners: ['Sarah A.'],
    clientOwners: ['John D.'],
    influencerCriteria: 'Gen Z, Outdoor lifestyle'
  },
  { 
    id: 'C-002', 
    name: 'STC Pay Launch', 
    clientId: 'c2', 
    brandId: 'b2',
    stage: CampaignStage.LIST_PREPARATION, 
    status: 'Active', 
    country: 'UAE', 
    budget: 120000, 
    budgetType: 'USD',
    recordHealth: 'Healthy',
    targetInfluencers: 200,
    targetPostingCoverage: 400,
    currentOwner: 'Ahmed E.',
    nextAction: 'Finalize influencer selection',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now(),
    createdBy: 'system',
    city: 'Dubai',
    objective: 'User Acquisition',
    platforms: ['Snapchat', 'TikTok'],
    type: 'Performance',
    startDate: '2024-07-01',
    endDate: '2024-07-15',
    deliverables: '1 Snap Ad, 1 TikTok Spark',
    tags: '#STCPayUAE',
    mentions: '@stcpay_uae',
    links: 'stcpay.com.ae/launch',
    visitRequired: false,
    productDetails: 'Mobile App',
    approvalFlow: 'High Priority',
    reportingCadence: 'Daily',
    restrictions: 'No competitors',
    internalOwners: ['Ahmed E.'],
    clientOwners: ['Sarah M.'],
    influencerCriteria: 'Tech savvy, UAE based'
  }
];

const INITIAL_INFLUENCERS_DATA: CampaignInfluencer[] = [
  {
    id: 'CI-001',
    campaignId: 'C-001',
    influencerId: 'INF-101',
    username: '@lifestyle_sa',
    platform: 'Instagram',
    status: 'Confirmed',
    niche: 'Lifestyle',
    followerRange: '100k-500k',
    invitationWave: 1,
    reminder1Sent: true,
    reminder2Sent: false,
    visitCompleted: true,
    coverageReceived: true,
    qaStatus: 'Approved',
    ownerId: 'Sarah A.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'system'
  },
  {
    id: 'CI-002',
    campaignId: 'C-001',
    influencerId: 'INF-102',
    username: '@travel_vibe',
    platform: 'TikTok',
    status: 'Pending',
    niche: 'Travel',
    followerRange: '50k-100k',
    invitationWave: 1,
    reminder1Sent: false,
    reminder2Sent: false,
    visitCompleted: false,
    coverageReceived: false,
    qaStatus: 'Pending',
    ownerId: 'Sarah A.',
    city: 'Dubai',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'system'
  },
  {
    id: 'CI-003',
    campaignId: 'C-002',
    influencerId: 'INF-103',
    username: '@tech_guy_uae',
    platform: 'Snapchat',
    status: 'Invited',
    niche: 'Tech',
    followerRange: '10k-50k',
    invitationWave: 2,
    reminder1Sent: true,
    reminder2Sent: true,
    visitCompleted: false,
    coverageReceived: false,
    qaStatus: 'Pending',
    ownerId: 'Ahmed E.',
    city: 'Abu Dhabi',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'system'
  },
  {
    id: 'CI-004',
    campaignId: 'C-001',
    influencerId: 'INF-104',
    username: '@foodie_riyadh',
    platform: 'Instagram',
    status: 'Confirmed',
    niche: 'Food',
    followerRange: '500k-1M',
    invitationWave: 1,
    reminder1Sent: true,
    reminder2Sent: false,
    visitCompleted: true,
    coverageReceived: false,
    qaStatus: 'Pending',
    ownerId: 'Sarah A.',
    city: 'Riyadh',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'system'
  }
];

const INITIAL_BLOCKERS_DATA: Blocker[] = [
  {
    id: 'B-001',
    campaignId: 'C-001',
    summary: 'Visit Proof Mismatch for @lifestyle_sa',
    impact: 'QA blocking for 12 posts',
    status: 'Open',
    severity: 'Critical',
    ownerId: 'Sarah A.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'system'
  }
];

const INITIAL_TASKS_DATA: Task[] = [
  { id: 'TSK-101', title: 'Verify visit proof for @tech_omar', description: 'Check story archives', ownerId: ' Sarah A.', dueDate: new Date('2026-04-20').getTime(), campaignId: 'Red Bull Summer', completed: false, priority: 'High', createdAt: Date.now(), updatedAt: Date.now(), createdBy: 'system' },
  { id: 'TSK-102', title: 'Prepare influencer list for STC launch', description: 'Filter by tech niche', ownerId: 'Ahmed E.', dueDate: new Date('2026-04-25').getTime(), campaignId: 'STC Pay Launch', completed: false, priority: 'Medium', createdAt: Date.now(), updatedAt: Date.now(), createdBy: 'system' },
  { id: 'TSK-103', title: 'Archive June coverage receipts', description: 'Batch process in GDrive', ownerId: 'Mona K.', dueDate: new Date('2026-04-22').getTime(), campaignId: 'Generic Ops', completed: false, priority: 'Low', createdAt: Date.now(), updatedAt: Date.now(), createdBy: 'system' },
  { id: 'TSK-104', title: 'Escalation: Missing recovery Jeddah', description: 'Contact restaurant manager', ownerId: 'Sarah A.', dueDate: new Date('2026-04-18').getTime(), campaignId: 'Hungerstation', completed: false, priority: 'High', createdAt: Date.now(), updatedAt: Date.now(), createdBy: 'system' },
];

const loadFromStorage = (key: string, initialData: any) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialData;
  } catch (e) {
    return initialData;
  }
};

const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save to localStorage", e);
  }
};

export let CAMPAIGNS_DATA: Campaign[] = loadFromStorage('GC_CAMPAIGNS', INITIAL_CAMPAIGNS_DATA);
export let INFLUENCERS_DATA: CampaignInfluencer[] = loadFromStorage('GC_INFLUENCERS', INITIAL_INFLUENCERS_DATA);
export let BLOCKERS_DATA: Blocker[] = loadFromStorage('GC_BLOCKERS', INITIAL_BLOCKERS_DATA);
export let TASKS_DATA: Task[] = loadFromStorage('GC_TASKS', INITIAL_TASKS_DATA);

// Service Methods
export const dataService = {
  getCampaigns: () => [...CAMPAIGNS_DATA],
  updateCampaign: (id: string, updates: Partial<Campaign>) => {
    CAMPAIGNS_DATA = CAMPAIGNS_DATA.map(c => c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c);
    saveToStorage('GC_CAMPAIGNS', CAMPAIGNS_DATA);
    return [...CAMPAIGNS_DATA];
  },
  addCampaign: (campaign: Campaign) => {
    CAMPAIGNS_DATA = [{ ...campaign, createdAt: Date.now(), updatedAt: Date.now() }, ...CAMPAIGNS_DATA];
    saveToStorage('GC_CAMPAIGNS', CAMPAIGNS_DATA);
    return [...CAMPAIGNS_DATA];
  },
  addCampaigns: (campaigns: Campaign[]) => {
    CAMPAIGNS_DATA = [...campaigns, ...CAMPAIGNS_DATA];
    saveToStorage('GC_CAMPAIGNS', CAMPAIGNS_DATA);
    return [...CAMPAIGNS_DATA];
  },
  getTasks: () => [...TASKS_DATA],
  updateTask: (id: string, updates: Partial<Task>) => {
    TASKS_DATA = TASKS_DATA.map(t => t.id === id ? { ...t, ...updates } : t);
    saveToStorage('GC_TASKS', TASKS_DATA);
    return [...TASKS_DATA];
  },
  addTask: (task: Task) => {
    TASKS_DATA = [task, ...TASKS_DATA];
    saveToStorage('GC_TASKS', TASKS_DATA);
    return [...TASKS_DATA];
  },
  getBlockers: () => [...BLOCKERS_DATA],
  updateBlocker: (id: string, updates: Partial<Blocker>) => {
    BLOCKERS_DATA = BLOCKERS_DATA.map(blocker => blocker.id === id ? { ...blocker, ...updates, updatedAt: Date.now() } : blocker);
    saveToStorage('GC_BLOCKERS', BLOCKERS_DATA);
    return [...BLOCKERS_DATA];
  },
  addBlocker: (blocker: Blocker) => {
    BLOCKERS_DATA = [blocker, ...BLOCKERS_DATA];
    saveToStorage('GC_BLOCKERS', BLOCKERS_DATA);
    return [...BLOCKERS_DATA];
  },
  getInfluencers: () => [...INFLUENCERS_DATA],
  updateInfluencer: (id: string, updates: Partial<CampaignInfluencer>) => {
    INFLUENCERS_DATA = INFLUENCERS_DATA.map(inf => inf.id === id ? { ...inf, ...updates, updatedAt: Date.now() } : inf);
    saveToStorage('GC_INFLUENCERS', INFLUENCERS_DATA);
    return [...INFLUENCERS_DATA];
  },
  addInfluencers: (influencers: CampaignInfluencer[]) => {
    INFLUENCERS_DATA = [...influencers, ...INFLUENCERS_DATA];
    saveToStorage('GC_INFLUENCERS', INFLUENCERS_DATA);
    return [...INFLUENCERS_DATA];
  },
  bulkUpdateInfluencerStatus: (ids: string[], status: CampaignInfluencer['status']) => {
    INFLUENCERS_DATA = INFLUENCERS_DATA.map(inf => ids.includes(inf.id) ? { ...inf, status, updatedAt: Date.now() } : inf);
    saveToStorage('GC_INFLUENCERS', INFLUENCERS_DATA);
    return [...INFLUENCERS_DATA];
  }
};
