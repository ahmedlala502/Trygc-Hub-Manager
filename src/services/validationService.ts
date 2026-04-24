/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SuggestedInfluencer } from './geminiService';

export interface ValidationResult {
  handle: string;
  isValid: boolean;
  lastChecked: number;
  isActive: boolean;
  lastPostDate?: string;
  followerCountVerified?: boolean;
  validationStatus: 'fresh' | 'stale' | 'invalid';
}

const VALIDATION_CACHE_KEY = 'influencer-validation-cache';
const VALIDATION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get validation cache from localStorage
 */
function getValidationCache(): Record<string, ValidationResult> {
  try {
    const cached = localStorage.getItem(VALIDATION_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (error) {
    console.error('Error reading validation cache:', error);
    return {};
  }
}

/**
 * Save validation cache to localStorage
 */
function saveValidationCache(cache: Record<string, ValidationResult>) {
  try {
    localStorage.setItem(VALIDATION_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving validation cache:', error);
  }
}

/**
 * Check if a validation result is fresh (within TTL)
 */
function isFresh(result: ValidationResult): boolean {
  const age = Date.now() - result.lastChecked;
  return age < VALIDATION_CACHE_TTL;
}

/**
 * Simulate validation (in real implementation, would call actual APIs)
 * For now, we mark influencers as valid and set random last post dates
 */
function simulateValidation(influencer: SuggestedInfluencer): ValidationResult {
  const daysAgo = Math.floor(Math.random() * 30);
  const lastPostDate = new Date();
  lastPostDate.setDate(lastPostDate.getDate() - daysAgo);

  return {
    handle: influencer.handle,
    isValid: true, // Assume valid for demo
    lastChecked: Date.now(),
    isActive: daysAgo < 7, // Mark as active if posted within 7 days
    lastPostDate: lastPostDate.toISOString().split('T')[0],
    followerCountVerified: Math.random() > 0.2, // 80% verification rate
    validationStatus: 'fresh'
  };
}

/**
 * Validate a single influencer
 */
export async function validateInfluencer(
  influencer: SuggestedInfluencer
): Promise<ValidationResult> {
  const cache = getValidationCache();
  const cached = cache[influencer.handle];

  // Return cached result if fresh
  if (cached && isFresh(cached)) {
    return cached;
  }

  // Simulate API validation
  const result = simulateValidation(influencer);

  // Save to cache
  cache[influencer.handle] = result;
  saveValidationCache(cache);

  return result;
}

/**
 * Validate multiple influencers in parallel
 */
export async function validateInfluencers(
  influencers: SuggestedInfluencer[]
): Promise<ValidationResult[]> {
  const results = await Promise.all(
    influencers.map(inf => validateInfluencer(inf))
  );
  return results;
}

/**
 * Get validation status for an influencer
 */
export function getValidationStatus(handle: string): ValidationResult | null {
  const cache = getValidationCache();
  const result = cache[handle];

  if (!result) return null;

  return {
    ...result,
    validationStatus: isFresh(result) ? 'fresh' : 'stale'
  };
}

/**
 * Clear validation cache
 */
export function clearValidationCache() {
  localStorage.removeItem(VALIDATION_CACHE_KEY);
}

/**
 * Get all validation results
 */
export function getAllValidations(): Record<string, ValidationResult> {
  return getValidationCache();
}

/**
 * Format last check time as human-readable string
 */
export function formatLastChecked(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
