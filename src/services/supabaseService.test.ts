import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceCategory, RiskLevel, DiagnosisResult } from '../types';

// Use vi.hoisted to ensure these are available for the mocks
const { mockSupabase, MOCK_USER } = vi.hoisted(() => {
  const MOCK_USER = { id: 'user-123', email: 'test@example.com' };
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn().mockReturnThis(),
      getPublicUrl: vi.fn().mockReturnThis(),
    },
  };
  return { mockSupabase, MOCK_USER };
});

// Mock constants
vi.mock('../../constants', () => ({
  API_KEYS: {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON: 'test-key',
  },
}));

// Mock createClient
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Import service AFTER mocks
import { supabaseService } from './supabaseService';

describe('supabaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Default setup for most tests: ensure client is detected as "online"
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
  });

  it('should have a client initialized in test environment', () => {
    expect(supabaseService.client).not.toBeNull();
  });

  describe('getProfile()', () => {
    it('returns null if no user is authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const profile = await supabaseService.getProfile();
      expect(profile).toBeNull();
    });

    it('returns existing profile data', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValue({
        data: { id: 'user-123', email: 'test@example.com', query_count: 5 },
        error: null,
      });

      const profile = await supabaseService.getProfile();
      expect(profile).not.toBeNull();
      expect(profile?.query_count).toBe(5);
    });

    it('creates and returns a new profile if none exists', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValue({ data: null, error: null });
      mockSupabase.from().upsert.mockResolvedValue({ error: null });

      const profile = await supabaseService.getProfile();
      expect(profile).not.toBeNull();
      expect(profile?.id).toBe(MOCK_USER.id);
      expect(mockSupabase.from().upsert).toHaveBeenCalled();
    });
  });

  describe('saveLog() - Guest Mode', () => {
    const mockResult = {
      brand: 'Samsung',
      model: 'S22',
      risk_level: RiskLevel.LOW,
      recommended_action: 'Fix',
    } as unknown as DiagnosisResult;

    it('saves log to localStorage when unauthenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      
      const record = await supabaseService.saveLog(
        DeviceCategory.PHONE,
        'Broken screen',
        ['img1'],
        mockResult
      );

      expect(record).toBeDefined();
      expect(record.description).toBe('Broken screen');
      
      const localLogs = JSON.parse(localStorage.getItem('titan_local_logs') || '[]');
      expect(localLogs).toHaveLength(1);
    });
  });

  describe('getDeviceSpecs()', () => {
    it('returns data on exact match', async () => {
      mockSupabase.from().select().ilike().ilike().limit().maybeSingle.mockResolvedValue({
        data: { brand_name: 'Apple', model_name: 'iPhone 13' },
        error: null,
      });

      const specs = await supabaseService.getDeviceSpecs('Apple', 'iPhone 13');
      expect(specs).not.toBeNull();
      expect(specs.model_name).toBe('iPhone 13');
    });

    it('returns null if no match found', async () => {
      mockSupabase.from().select().ilike().ilike().limit().maybeSingle.mockResolvedValue({ data: null, error: null });
      mockSupabase.from().select().ilike().limit().maybeSingle.mockResolvedValue({ data: null, error: null });

      const specs = await supabaseService.getDeviceSpecs('X', 'Y');
      expect(specs).toBeNull();
    });
  });
});
