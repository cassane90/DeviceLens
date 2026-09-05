
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { API_KEYS } from '../constants';
import { UserProfile, QueryRecord, DeviceCategory, DiagnosisResult } from '../types';

let supabase: SupabaseClient | null = null;
try {
  if (API_KEYS.SUPABASE_URL && API_KEYS.SUPABASE_ANON) {
    supabase = createClient(API_KEYS.SUPABASE_URL, API_KEYS.SUPABASE_ANON);
  }
} catch {
  console.warn("DeviceLens: Supabase unavailable. Guest mode remains available.");
}

const LOCAL_LOGS_KEY = 'dl_local_logs';
const GUEST_PROFILE_KEY = 'dl_guest_profile';

async function base64ToBlob(base64: string): Promise<Blob> {
  const res = await fetch(base64);
  return res.blob();
}

export const supabaseService = {
  get client() { return supabase; },

  async signIn() {
    if (!supabase) {
      throw new Error("Cloud sign-in is not configured on this deployment.");
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  },

  async signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  async getProfile(): Promise<UserProfile | null> {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) return null;

    if (!data) {
      const newProfile = {
        id: user.id,
        email: user.email,
        query_count: 0,
        onboarding_accepted: false,
        permissions: { camera: 'prompt', location: 'prompt' },
      };
      await supabase.from('profiles').upsert(newProfile);
      return newProfile as UserProfile;
    }
    return data;
  },

  async updateProfile(updates: Partial<UserProfile>) {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update(updates).eq('id', user.id);
  },

  async uploadPhotos(photos: string[]): Promise<string[]> {
    if (!supabase) return photos;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return photos;

    const urls: string[] = [];
    for (const base64 of photos) {
      if (!base64.startsWith('data:')) {
        urls.push(base64);
        continue;
      }
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const blob = await base64ToBlob(base64);
      const { data, error } = await supabase.storage
        .from('device-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (error) {
        console.error('Photo upload failed:', error);
        urls.push(base64);
      } else {
        const { data: { publicUrl } } = supabase.storage.from('device-photos').getPublicUrl(data.path);
        urls.push(publicUrl);
      }
    }
    return urls;
  },

  async saveLog(category: DeviceCategory, desc: string, photos: string[], result: DiagnosisResult): Promise<QueryRecord> {
    const { data: authData } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    const user = authData?.user;

    const photo_urls = user ? await this.uploadPhotos(photos) : photos;

    const newRecord: Partial<QueryRecord> = {
      id: Math.random().toString(36).substring(2, 15),
      created_at: new Date().toISOString(),
      category,
      description: desc,
      photo_urls: photos,
      ai_response: result,
    };

    if (supabase && user) {
      const { data, error } = await supabase.from('queries').insert({
        user_id: user.id,
        category,
        description: desc,
        photo_urls,
        ai_response: result,
      }).select().single();

      if (error) throw error;

      const profile = await this.getProfile();
      if (profile) await this.updateProfile({ query_count: profile.query_count + 1 });

      return data;
    }

    // Guest — save to localStorage
    const localLogs = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
    const record = newRecord as QueryRecord;
    localLogs.unshift(record);

    try {
      localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(localLogs));
    } catch (e: unknown) {
      const err = e as { name?: string; code?: number };
      if (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014) {
        let saved = false;
        let attempts = 0;
        while (!saved && localLogs.length > 0 && attempts < 50) {
          localLogs.splice(-5);
          try {
            localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(localLogs));
            saved = true;
          } catch {
            attempts++;
          }
        }
      }
    }

    const guestStored = localStorage.getItem(GUEST_PROFILE_KEY);
    if (guestStored) {
      try {
        const profile = JSON.parse(guestStored);
        profile.query_count += 1;
        localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
      } catch { /* ignore */ }
    }

    return record;
  },

  async getLogs(): Promise<QueryRecord[]> {
    const { data: authData } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    const user = authData?.user;
    const localLogs = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');

    if (supabase && user) {
      const { data, error } = await supabase.from('queries').select('*').order('created_at', { ascending: false });
      return error ? localLogs : [...(data || []), ...localLogs];
    }
    return localLogs;
  },

  async getDeviceSpecs(brand: string, model: string): Promise<Record<string, unknown> | null> {
    if (!supabase) return null;

    const { data } = await supabase
      .from('device_specs')
      .select('*')
      .ilike('brand_name', `%${brand}%`)
      .ilike('model_name', model)
      .limit(1)
      .maybeSingle();

    if (data) return data;

    const { data: fuzzyData } = await supabase
      .from('device_specs')
      .select('*')
      .ilike('model_name', `%${model}%`)
      .limit(1)
      .maybeSingle();

    return fuzzyData || null;
  },
};

export { GUEST_PROFILE_KEY };
