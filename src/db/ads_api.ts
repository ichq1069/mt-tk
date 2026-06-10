import { supabase } from './supabase';

export const adsApi = {
  async getAds(placement?: string) {
    let query = supabase
      .from('ads')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (placement && placement !== 'all') {
      query = query.or(`placements.cs.{all},placements.cs.{${placement}}`);
    }

    const { data, error } = await query;
    return { data, error };
  },

  async logAdEvent(adId: string, eventType: string, userId?: string, openid?: string) {
    const { error } = await supabase
      .from('ad_events')
      .insert({ ad_id: adId, event_type: eventType, user_id: userId, openid: openid });
    return { error };
  },

  async getAdStats() {
    // Fetch all events for admins to aggregate
    const { data, error } = await supabase
      .from('ad_events')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(1000);
    return { data, error };
  },

  async getAllAdsAdmin() {
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async createAd(ad: any) {
    const { data, error } = await supabase
      .from('ads')
      .insert(ad)
      .select()
      .single();
    return { data, error };
  },

  async updateAd(id: string, updates: any) {
    const { data, error } = await supabase
      .from('ads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deleteAd(id: string) {
    const { error } = await supabase
      .from('ads')
      .delete()
      .eq('id', id);
    return { error };
  }
};
