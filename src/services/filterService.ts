/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SuggestedInfluencer } from './geminiService';

export interface FilterCriteria {
  platforms: string[];
  minFollowers: number;
  maxFollowers: number;
  minEngagement: number;
  maxEngagement: number;
  niches: string[];
  locations: string[];
  minLastPostDays: number;
}

export interface SortConfig {
  field: 'followers' | 'engagement' | 'relevance' | 'lastPost';
  direction: 'asc' | 'desc';
}

export const DEFAULT_FILTERS: FilterCriteria = {
  platforms: [],
  minFollowers: 0,
  maxFollowers: 10000000,
  minEngagement: 0,
  maxEngagement: 100,
  niches: [],
  locations: [],
  minLastPostDays: 0
};

/**
 * Parse follower count string to a numeric value
 */
function parseFollowerCount(followerStr: string): number {
  const match = followerStr.match(/[\d.]+/);
  if (!match) return 0;
  
  let num = parseFloat(match[0]);
  if (followerStr.includes('M')) num *= 1000000;
  else if (followerStr.includes('K')) num *= 1000;
  
  return num;
}

/**
 * Parse engagement rate string to a numeric value
 */
function parseEngagementRate(engagementStr: string): number {
  const match = engagementStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Filter influencers based on criteria
 */
export function filterInfluencers(
  influencers: SuggestedInfluencer[],
  criteria: Partial<FilterCriteria>
): SuggestedInfluencer[] {
  const filters = { ...DEFAULT_FILTERS, ...criteria };

  return influencers.filter(inf => {
    // Platform filter
    if (filters.platforms.length > 0 && !filters.platforms.includes(inf.platform)) {
      return false;
    }

    // Follower count filter
    const followers = parseFollowerCount(inf.followers);
    if (followers < filters.minFollowers || followers > filters.maxFollowers) {
      return false;
    }

    // Engagement rate filter
    const engagement = parseEngagementRate(inf.engagement);
    if (engagement < filters.minEngagement || engagement > filters.maxEngagement) {
      return false;
    }

    // Niche filter
    if (filters.niches.length > 0) {
      const matchesNiche = filters.niches.some(niche =>
        inf.niche.toLowerCase().includes(niche.toLowerCase())
      );
      if (!matchesNiche) return false;
    }

    // Location filter
    if (filters.locations.length > 0) {
      const matchesLocation = filters.locations.some(location =>
        inf.location.toLowerCase().includes(location.toLowerCase())
      );
      if (!matchesLocation) return false;
    }

    return true;
  });
}

/**
 * Sort influencers based on config
 */
export function sortInfluencers(
  influencers: SuggestedInfluencer[],
  sort: SortConfig
): SuggestedInfluencer[] {
  const sorted = [...influencers];

  sorted.sort((a, b) => {
    let aVal: number;
    let bVal: number;

    switch (sort.field) {
      case 'followers':
        aVal = parseFollowerCount(a.followers);
        bVal = parseFollowerCount(b.followers);
        break;
      case 'engagement':
        aVal = parseEngagementRate(a.engagement);
        bVal = parseEngagementRate(b.engagement);
        break;
      case 'relevance':
        aVal = a.relevanceReason.length;
        bVal = b.relevanceReason.length;
        break;
      case 'lastPost':
        aVal = a.recentPerformance.length;
        bVal = b.recentPerformance.length;
        break;
      default:
        return 0;
    }

    return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return sorted;
}

/**
 * Apply both filtering and sorting
 */
export function applyFiltersAndSort(
  influencers: SuggestedInfluencer[],
  filters: Partial<FilterCriteria>,
  sort: SortConfig
): SuggestedInfluencer[] {
  const filtered = filterInfluencers(influencers, filters);
  return sortInfluencers(filtered, sort);
}

/**
 * Get unique values for filter options
 */
export function getFilterOptions(influencers: SuggestedInfluencer[]) {
  const platforms = new Set(influencers.map(i => i.platform));
  const niches = new Set(influencers.map(i => i.niche));
  const locations = new Set(influencers.map(i => i.location));

  return {
    platforms: Array.from(platforms).sort(),
    niches: Array.from(niches).sort(),
    locations: Array.from(locations).sort()
  };
}
