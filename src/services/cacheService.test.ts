import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cacheService } from './cacheService';
import { DeviceCategory, DiagnosisResult, RiskLevel } from '../types';

/**
 * Unit tests for cacheService.
 *
 * Uses vitest's built-in localStorage mock via jsdom environment.
 * Covers:
 * - normalizeSymptoms: text normalisation logic
 * - generateImageHash: hash stability and variation
 * - get/set: round-trip, expiry, and cache miss
 * - clear: removes only TITAN cache keys
 */

// ── Minimal mock DiagnosisResult ──────────────────────────────────────────────
const makeResult = (): DiagnosisResult => ({
  brand: 'Apple',
  model: 'iPhone 13',
  confidence_score: 90,
  risk_level: RiskLevel.LOW,
  is_high_voltage: false,
  recommended_action: 'Repair screen',
  reasoning: 'Cracked display',
  potential_fix_cost_estimate: '$100',
  currency_code: 'USD',
  resale_value: {
    unit_value_fixed: '$400',
    unit_value_broken: '$200',
    profit_potential: '$200',
  },
  recommended_repair_hubs: [],
  diy_guides: [],
  required_tools: [],
  purchase_options: [],
  parts_retailers: [],
  category_mismatch: false,
  identified_category: 'Smartphone',
  no_visible_issue: false,
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const TEST_IMAGES = ['data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD'];

describe('cacheService.normalizeSymptoms()', () => {
  it('lowercases and sorts words', () => {
    const result = cacheService.normalizeSymptoms('Screen Cracked Battery Dead');
    // words sorted alphabetically, lowercased, punctuation removed
    expect(result).toBe('battery cracked dead screen');
  });

  it('removes short stop words (length <= 2)', () => {
    const result = cacheService.normalizeSymptoms('My phone is broken');
    expect(result).not.toContain(' my ');
    expect(result).not.toContain(' is ');
    expect(result).toContain('broken');
    expect(result).toContain('phone');
  });

  it('removes punctuation', () => {
    const result = cacheService.normalizeSymptoms('screen cracked!!! wont charge?');
    expect(result).not.toMatch(/[!?]/);
  });

  it('handles empty string', () => {
    expect(cacheService.normalizeSymptoms('')).toBe('');
  });
});

describe('cacheService.generateImageHash()', () => {
  it('returns "no_image" for empty array', () => {
    expect(cacheService.generateImageHash([])).toBe('no_image');
  });

  it('returns a stable hex string for the same image', () => {
    const h1 = cacheService.generateImageHash(TEST_IMAGES);
    const h2 = cacheService.generateImageHash(TEST_IMAGES);
    expect(h1).toBe(h2);
  });

  it('returns different hashes for different images', () => {
    const img2 = ['data:image/jpeg;base64,ABCDEFGHIJKLMNOP1234567890ZYXWVUTSRQPONMLKJIHGFEDCBA'];
    const h1 = cacheService.generateImageHash(TEST_IMAGES);
    const h2 = cacheService.generateImageHash(img2);
    expect(h1).not.toBe(h2);
  });
});

describe('cacheService get() / set()', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns null on cache miss', () => {
    const result = cacheService.get(DeviceCategory.PHONE, 'cracked screen', TEST_IMAGES);
    expect(result).toBeNull();
  });

  it('returns the cached result after set()', () => {
    const data = makeResult();
    cacheService.set(DeviceCategory.PHONE, 'cracked screen', TEST_IMAGES, data);
    const retrieved = cacheService.get(DeviceCategory.PHONE, 'cracked screen', TEST_IMAGES);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.brand).toBe('Apple');
    expect(retrieved?.model).toBe('iPhone 13');
  });

  it('returns null for an expired entry', () => {
    const data = makeResult();
    cacheService.set(DeviceCategory.PHONE, 'battery dead', TEST_IMAGES, data);

    // Simulate expiry by manipulating the stored timestamp
    const key = cacheService.generateKey(DeviceCategory.PHONE, 'battery dead', TEST_IMAGES);
    const entry = JSON.parse(localStorage.getItem(key) || '{}');
    entry.timestamp = Date.now() - (1000 * 60 * 60 * 24 * 91); // 91 days ago
    localStorage.setItem(key, JSON.stringify(entry));

    const result = cacheService.get(DeviceCategory.PHONE, 'battery dead', TEST_IMAGES);
    expect(result).toBeNull();
  });
});

describe('cacheService.clear()', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('removes only titan cache keys', () => {
    const data = makeResult();
    cacheService.set(DeviceCategory.PHONE, 'test', TEST_IMAGES, data);
    localStorage.setItem('other_app_key', 'should remain');

    cacheService.clear();

    // TITAN cache gone
    const remaining = Object.keys(localStorage).filter(k => k.startsWith('titan_neural_cache_'));
    expect(remaining).toHaveLength(0);

    // Other keys untouched
    expect(localStorage.getItem('other_app_key')).toBe('should remain');
  });
});
