import { supabase } from './supabase';
import { cache } from '@/lib/cache';
import { getBeijingDate } from '@/lib/utils';
import type { MediaItem, Profile, StorageConfig, ItemStatus, UserRole, AppNotification, UserFieldConfig, CheckIn, PointsLog, Report, ReportStatus, Ad, RedemptionCode, RedemptionLog, Tag, MediaTag, ContentCategory, PermissionGroup, AuditConfig, DedupeConfig, SystemConfig, PhotoAlbum, AlbumPhoto, AlbumCustomField, AlbumFieldGroup, AlbumPhotoLevelLog, KeywordReplacement, Shortcode, SuperbedConfig, DebugLogSetting, DebugLog } from '@/types';

export const coreSystemApi: any = {
  /** 获取靓号池列表 */
  async getSpecialDigitalIds() {
    return await supabase
      .from('special_digital_ids')
      .select('*, profiles(username)')
      .order('digital_id', { ascending: true });
  },

  async createSpecialDigitalId(idData: any) {
    return await supabase.from('special_digital_ids').insert([idData]);
  },

  async deleteSpecialDigitalId(id: string) {
    return await supabase.from('special_digital_ids').delete().eq('id', id);
  },

  async getRanks() {
    return await supabase.from('rank_configs').select('*').order('min_exp', { ascending: true });
  },

  async createRank(rankData: any) {
    return await supabase.from('rank_configs').insert([rankData]);
  },

  async updateRank(id: string, rankData: any) {
    return await supabase.from('rank_configs').update(rankData).eq('id', id);
  },

  async deleteRank(id: string) {
    return await supabase.from('rank_configs').delete().eq('id', id);
  },

  async buySpecialDigitalId(userId: string, specialId: string) {
    const { data, error } = await supabase.rpc('buy_special_id', { p_user_id: userId, p_special_id: specialId });
    if (error) return { data: null, error };
    return { data: data as any, error: null };
  },


  // 微信公众号配置
  async getWechatConfigs() {
    let { data, error } = await supabase.from('wechat_configs').select('*').order('created_at', { ascending: true });
    if (error && (error as any).status === 401) {
      await supabase.auth.signOut();
      return await supabase.from('wechat_configs').select('*').order('created_at', { ascending: true });
    }
    return { data, error };
  },

  async updateWechatConfig(id: string, updates: Partial<any>) {
    return await supabase.from('wechat_configs').update(updates).eq('id', id).select().single();
  },

  async createWechatConfig(config: any) {
    return await supabase.from('wechat_configs').insert([config]).select().single();
  },

  async deleteWechatConfig(id: string) {
    return await supabase.from('wechat_configs').delete().eq('id', id);
  },

  async getWechatUsers(configId?: string) {
    let query = supabase.from('wechat_users').select('*').order('created_at', { ascending: false });
    if (configId) query = query.eq('config_id', configId);
    return await query;
  },

  // 暴露 supabase 实例供其他功能使用
  supabase,

  async testWechatConnection(configId: string) {
    try {
      // 显式添加 apikey 以兼容某些自建 Supabase 环境
      const { data, error } = await supabase.functions.invoke('wechat-test-connection', {
        body: { configId },
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        }
      });
      
      if (error && (error as any).status === 401) {
        throw new Error('鉴权失败 (401 Invalid JWT): 对于自建 Supabase 环境，请在边缘函数部署时通过 --no-verify-jwt 选项或在控制台手动关闭 JWT 验证，以允许外部回调和测试请求。');
      }
      return { data, error };
    } catch (e: any) {
      console.error('[WechatTest] Invoke error:', e);
      return { data: null, error: e };
    }
  },

  async updateWechatTestStatus(configId: string, status: string, message?: string) {
    return await supabase.from('wechat_configs').update({
      test_status: status,
      last_test_time: new Date().toISOString(),
      test_message: message || null
    }).eq('id', configId);
  },

  async getWechatReplies(configId?: string, type?: string) {
    let query = supabase.from('wechat_replies').select('*').order('created_at', { ascending: false });
    if (configId) query = query.eq('config_id', configId);
    if (type) query = query.eq('type', type);
    return await query;
  },

  async upsertWechatReply(reply: any) {
    // 移除空 ID 以免触发 UUID 格式错误
    const { id, ...cleanReply } = reply as any;
    const dataToSave = (id && id !== '') ? { id, ...cleanReply } : cleanReply;
    return await supabase.from('wechat_replies').upsert(dataToSave).select().single();
  },

  async deleteWechatReply(id: string) {
    return await supabase.from('wechat_replies').delete().eq('id', id);
  },

  async getWechatMenu(configId: string) {
    return await supabase.from('wechat_menus').select('*').eq('config_id', configId).maybeSingle();
  },

  async upsertWechatMenu(menu: any) {
    // 移除空 ID 以免触发 UUID 格式错误
    const { id, ...cleanMenu } = menu as any;
    const dataToSave = (id && id !== '') ? { id, ...cleanMenu } : cleanMenu;
    return await supabase.from('wechat_menus').upsert(dataToSave, { onConflict: 'config_id' }).select().single();
  },

  async callWechatApi(configId: string, action: string, params: any = {}) {
    return await supabase.functions.invoke('wechat-api', {
      body: { configId, action, ...params }
    });
  },

  async inviteUserByEmail(email: string) {
    return await supabase.functions.invoke('admin-auth-action', {
      body: { action: 'send_invite_email', email }
    });
  },



  async getAllPointsLogs(page = 0, limit = 20) {
    const { data, error, count } = await supabase.from('points_logs').select('*, profiles!user_id(*)', { count: 'exact' }).order('created_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
    return { data: (data || []) as PointsLog[], error, total: count || 0 };
  },

  async getWechatMessages(configId?: string, page = 0, limit = 20, fromUser?: string) {
    let query = supabase
      .from('wechat_messages_view')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    if (configId && configId !== 'all') query = query.eq('config_id', configId);
    if (fromUser) query = query.eq('from_user', fromUser);
    
    const { data, error, count } = await query.range(page * limit, (page + 1) * limit - 1);
    
    return { 
      data: data || [], 
      error, 
      total: count || 0 
    };
  },

  async getWechatFans(configId?: string, page = 0, limit = 20, search?: string) {
    let query = supabase
      .from('wechat_fans_with_users')
      .select('*', { count: 'exact' })
      .order('last_active_at', { ascending: false });
    
    if (configId && configId !== 'all') query = query.eq('config_id', configId);
    if (search) {
      query = query.or(`nickname.ilike.%${search}%,openid.eq.${search},platform_username.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query.range(page * limit, (page + 1) * limit - 1);
    
    const processedData = (data || []).map(fan => ({
      ...fan,
      display_nickname: fan.platform_username || fan.nickname || fan.openid
    }));
    
    return { 
      data: processedData, 
      error, 
      total: count || 0 
    };
  },

  async syncWechatFans(configId: string, mode: 'full' | 'incremental' = 'full') {
    return await supabase.functions.invoke('wechat-sync-fans', {
      body: { configId, mode }
    });
  },

  async getWechatDraftMediaLibrary(params: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    tag?: string;
    trackingId?: string;
    excludedCategories?: string[];
    excludedTags?: string[];
    includeUsed?: boolean;
    onlyUsed?: boolean;
  }) {
    const { 
      page = 0, 
      limit = 20, 
      search, 
      categoryId,
      tag,
      trackingId,
      excludedCategories, 
      excludedTags, 
      includeUsed = false, 
      onlyUsed = false 
    } = params;
    
    let query = supabase
      .from('media_items')
      .select('id, url, thumbnail_url, title, type, category_id, tags, wechat_draft_status, wechat_draft_tracking_id, wechat_last_used_at, created_at, content_categories!media_items_category_id_fkey(name)', { count: 'exact' })
      .eq('type', 'image')
      .eq('status', 'approved');

    query = query.neq('wechat_draft_status', 'excluded');
    
    // 过滤掉已经在每日图集中发布的素材，但保留草稿状态的
    query = query.or('daily_gallery_status.is.null,daily_gallery_status.neq.published');

    if (onlyUsed) {
      query = query.in('wechat_draft_status', ['used', 'adopted']);
    } else if (!includeUsed) {
      // 默认仅显示待入稿的图片，排除已入稿、已采用和已移出的图片
      query = query.eq('wechat_draft_status', 'available');
    } else {
      // 如果包含已使用的，应用 15 天规则
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      
      // 逻辑：available OR ((used OR adopted) AND (last_used < 15days OR last_used is null))
      query = query.or(`wechat_draft_status.eq.available,and(wechat_draft_status.in.("used","adopted"),or(wechat_last_used_at.is.null,wechat_last_used_at.lt."${fifteenDaysAgo.toISOString()}"))`);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    if (tag && tag !== 'all') {
      query = query.contains('tags', [tag]);
    }

    if (trackingId) {
      query = query.eq('wechat_draft_tracking_id', trackingId);
    }

    if (excludedCategories && excludedCategories.length > 0) {
      query = query.or(`category_id.is.null,category_id.not.in.(${excludedCategories.join(',')})`);
    }

    // 处理标签排除 (Tags are an ARRAY in Postgres)
    if (excludedTags && excludedTags.length > 0) {
      const tagStr = `{${excludedTags.map(t => `"${t}"`).join(',')}}`;
      query = query.not('tags', 'ov', tagStr);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: true }) // 默认优先使用时间靠前的图片
      .range(page * limit, (page + 1) * limit - 1);

    return { data: data || [], error, total: count || 0 };
  },

  async updateMediaWechatDraftStatus(id: string | string[], status: 'available' | 'used' | 'adopted' | 'excluded', trackingId?: string) {
    const ids = Array.isArray(id) ? id : [id];
    const updates: any = { wechat_draft_status: status };
    if (trackingId !== undefined) {
      updates.wechat_draft_tracking_id = trackingId;
    }

    // 如果状态变更为已使用或已采用，更新最后使用时间
    if (status === 'used' || status === 'adopted') {
      updates.wechat_last_used_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('media_items')
      .update(updates)
      .in('id', ids);
    return { data, error };
  },

  async adoptWechatDraft(id: string, isAdopted: boolean, mediaIds: string[] = [], trackingId?: string) {
    const { data, error } = await supabase
      .from('wechat_drafts')
      .update({ 
        is_adopted: isAdopted, 
        adopted_at: isAdopted ? new Date().toISOString() : null 
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) return { data: null, error };
    
    // 如果被采用，同步更新相关的媒体资源状态
    if (mediaIds.length > 0) {
      const updates: any = { wechat_draft_status: isAdopted ? 'adopted' : 'available' };
      if (isAdopted) {
        updates.wechat_last_used_at = new Date().toISOString();
        if (trackingId) {
          updates.wechat_draft_tracking_id = trackingId;
        }
      } else {
        updates.wechat_draft_tracking_id = null;
        // 如果撤回采用，我们通常不重置 last_used_at，因为之前确实被用过入稿了
      }

      await supabase
        .from('media_items')
        .update(updates)
        .in('id', mediaIds);
    }
    
    return { data, error: null };
  },

  // --- 微信绑定相关 ---
  async getWechatBindings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [] };

    return await supabase
      .from('wechat_users')
      .select('*, wechat_configs(name)')
      .eq('user_id', user.id);
  },

  async unbindWechat(bindingId: string) {
    return await supabase
      .from('wechat_users')
      .update({ user_id: null })
      .eq('id', bindingId);
  },

  async generateBindingCode(configId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未登录');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const { data, error } = await supabase
      .from('wechat_binding_requests')
      .insert({
        config_id: configId,
        user_id: user.id,
        code,
        type: 'user_to_wechat',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    return { data, error, code };
  },

  async verifyBindingCode(configId: string, code: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未登录');

    // 查找微信生成的验证码 (wechat_to_user 类型)
    const { data: req, error: reqError } = await supabase
      .from('wechat_binding_requests')
      .select('*')
      .eq('config_id', configId)
      .eq('code', code)
      .eq('type', 'wechat_to_user')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (reqError || !req) {
      throw new Error('验证码错误或已过期');
    }

    // 进行绑定
    const { data: wechatUser } = await supabase
      .from('wechat_users')
      .select('id')
      .eq('config_id', configId)
      .eq('openid', req.openid)
      .maybeSingle();

    if (wechatUser) {
      const { error: updateError } = await supabase
        .from('wechat_users')
        .update({ user_id: user.id })
        .eq('id', wechatUser.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('wechat_users')
        .insert({
          config_id: configId,
          openid: req.openid,
          user_id: user.id,
          subscribe_status: true
        });
      if (insertError) throw insertError;
    }

    // 删除请求
    await supabase.from('wechat_binding_requests').delete().eq('id', req.id);

    return { success: true };
  },
  async getRedemptionCodes(page = 0, limit = 20) {
    const { data, error, count } = await supabase.from('redemption_codes').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
    return { data: (data || []) as RedemptionCode[], error, total: count || 0 };
  },

  async getRedemptionLogs(page = 0, limit = 20) {
    const { data, error, count } = await supabase.from('redemption_logs').select('*, profiles!user_id(*), redemption_codes(*)', { count: 'exact' }).order('created_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
    return { data: (data || []) as RedemptionLog[], error, total: count || 0 };
  },

  async createRedemptionCode(params: any) {
    return await supabase.from('redemption_codes').insert([params]).select().single();
  },

  async deleteRedemptionCode(id: string) {
    return await supabase.from('redemption_codes').delete().eq('id', id);
  },

  async getPromotionPages(page = 0, limit = 20) {
    const { data, error, count } = await supabase
      .from('promotion_pages')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    return { data: (data || []) as any[], error, total: count || 0 };
  },

  async getPromotionPage(id: string) {
    return await supabase.from('promotion_pages').select('*').eq('id', id).maybeSingle();
  },

  async createPromotionPage(params: any) {
    return await supabase.from('promotion_pages').insert([params]).select().single();
  },

  async updatePromotionPage(id: string, updates: any) {
    return await supabase.from('promotion_pages').update(updates).eq('id', id).select().single();
  },

  async deletePromotionPage(id: string) {
    return await supabase.from('promotion_pages').delete().eq('id', id);
  },


  async getUserFieldConfigs() {
    return await supabase.from('user_field_configs').select('*').order('sort_order', { ascending: true });
  },

  async upsertUserFieldConfig(config: any) {
    // 移除空 ID 以免触发 UUID 格式错误
    const { id, ...cleanConfig } = config as any;
    const dataToSave = (id && id !== '') ? { id, ...cleanConfig } : cleanConfig;
    return await supabase.from('user_field_configs').upsert(dataToSave).select().single();
  },

  async deleteUserFieldConfig(id: string) {
    return await supabase.from('user_field_configs').delete().eq('id', id);
  },

  async getAdminStats() {
    const { data, error } = await supabase.rpc('get_admin_stats');
    return { ...(data || {}), error };
  },

  async createOrMergeAuditNotification(params: any) {
    return await supabase.rpc('create_or_merge_audit_notification', params);
  },

  async getAdminAnalytics() {
    return await supabase.rpc('get_admin_analytics');
  },

  async getAdminDistribution() {
    return await supabase.rpc('get_admin_distribution');
  },

  async getDatabaseStats() {
    return await supabase.rpc('get_database_stats');
  },


  async getDailyGalleryStats() {
    return await supabase.rpc('get_daily_gallery_stats');
  },

  // 每日图集多公众号独立密码配置
  async getWechatAccountPasswordConfigs() {
    return await supabase.from('wechat_account_password_config').select('*').order('created_at', { ascending: true });
  },

  async upsertWechatAccountPasswordConfig(config: any) {
    const { id, ...rest } = config;
    const data = id ? { id, ...rest } : rest;
    return await supabase.from('wechat_account_password_config').upsert(data).select().single();
  },

  async deleteWechatAccountPasswordConfig(id: string) {
    return await supabase.from('wechat_account_password_config').delete().eq('id', id);
  },

  async getDailyGalleryAccountPasswords(postId: string) {
    return await supabase.from('daily_gallery_account_passwords').select('*').eq('post_id', postId);
  },

  async upsertDailyGalleryAccountPasswords(passwords: any[]) {
    return await supabase.from('daily_gallery_account_passwords').upsert(passwords);
  },

  // 视频代理加速配置
  async getVideoProxyConfigs() {
    return await supabase.from('video_proxy_configs').select('*').order('priority', { ascending: false });
  },

  async upsertVideoProxyConfig(config: any) {
    const { id, ...rest } = config;
    const data = id ? { id, ...rest } : rest;
    return await supabase.from('video_proxy_configs').upsert(data).select().single();
  },

  async deleteVideoProxyConfig(id: string) {
    return await supabase.from('video_proxy_configs').delete().eq('id', id);
  },

  async getVideoProxyStats(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('video_proxy_logs')
      .select('created_at, bytes_transferred, estimated_cost, status')
      .gte('created_at', startDate.toISOString());
      
    return { data, error };
  },

  async fullOptimizeDatabase() {
    const { data, error } = await supabase.functions.invoke('db-optimize', {
      body: { action: 'full-optimize' }
    });
    if (error) {
      const errorMsg = typeof error?.context?.text === "function" ? await error.context.text() : error?.message;
      throw new Error(errorMsg || error?.message);
    }
    return data;
  },

  // 随机美图控制
  async getRandomBeautyConfigs() {
    return await supabase.from('random_beauty_configs').select('*').maybeSingle();
  },

  async updateRandomBeautyConfigs(updates: any) {
    const { id, ...rest } = updates;
    if (id) {
      return await supabase.from('random_beauty_configs').update(rest).eq('id', id).select().single();
    }
    return await supabase.from('random_beauty_configs').insert([rest]).select().single();
  },

  async getRandomBeautyUsage(openid: string) {
    return await supabase
      .from('random_beauty_logs')
      .select('count')
      .eq('openid', openid)
      .eq('visit_date', new Date().toISOString().split('T')[0])
      .maybeSingle();
  },

  async incrementRandomBeautyUsage(openid: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await this.getRandomBeautyUsage(openid);
    
    if (existing) {
      return await supabase
        .from('random_beauty_logs')
        .update({ count: (existing.count || 0) + 1, updated_at: new Date().toISOString() })
        .eq('openid', openid)
        .eq('visit_date', today);
    } else {
      return await supabase
        .from('random_beauty_logs')
        .insert([{ openid, visit_date: today, count: 1 }]);
    }
  },

  async getRandomBeautyAccessList(page = 0, limit = 50) {
    const { data: logs, error: logsError, count } = await supabase
      .from('random_beauty_logs')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (logsError) return { data: [], error: logsError, total: 0 };

    // 获取所有相关的 openid 进行 profile 查找
    const openids = [...new Set(logs.map(l => l.openid))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, mp_openid, wechat_openid')
      .or(`id.in.(${openids.filter(id => id.includes('-')).map(id => `'${id}'`).join(',')}),mp_openid.in.(${openids.map(id => `'${id}'`).join(',')}),wechat_openid.in.(${openids.map(id => `'${id}'`).join(',')})`);

    const processedLogs = logs.map(log => {
      let profile = null;
      if (log.openid.startsWith('user:')) {
        const userId = log.openid.split(':')[1];
        profile = profiles?.find(p => p.id === userId);
      } else {
        profile = profiles?.find(p => p.mp_openid === log.openid || p.wechat_openid === log.openid || p.id === log.openid);
      }
      return {
        ...log,
        username: profile?.username || (log.openid === 'guest_visitor' ? '匿名访客' : '未知用户')
      };
    });

    return { data: processedLogs, error: null, total: count || 0 };
  },

  async verifyOpenId(openid: string) {
    // 检查 wechat_users 表
    const { data: wu } = await supabase.from('wechat_users').select('id').eq('openid', openid).maybeSingle();
    if (wu) return true;
    
    // 检查 profiles 表
    const { data: p } = await supabase.from('profiles').select('id').or(`wechat_openid.eq.${openid},mp_openid.eq.${openid}`).maybeSingle();
    if (p) return true;
    
    return false;
  },

  async exportDatabaseSQL(tables: string[]) {
    const { data, error } = await supabase.functions.invoke('db-optimize', {
      body: { action: 'export-sql', tables }
    });
    if (error) {
      const errorMsg = typeof error?.context?.text === "function" ? await error.context.text() : error?.message;
      throw new Error(errorMsg || error?.message);
    }
    return data;
  },

  async exportAdminData() {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('admin-data-sync', {
      body: { action: 'export' },
      headers: {
        Authorization: session ? `Bearer ${session.access_token}` : ''
      }
    });
    if (error) {
      const errorMsg = typeof error?.context?.text === "function" ? await error.context.text() : error?.message;
      return { data: null, error: new Error(errorMsg || error?.message) };
    }
    return { data, error: null };
  },

  async importAdminData(jsonData: any, mode: 'overwrite' | 'incremental' = 'overwrite') {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('admin-data-sync', {
      body: { action: 'import', data: jsonData, mode },
      headers: {
        Authorization: session ? `Bearer ${session.access_token}` : ''
      }
    });
    if (error) {
      const errorMsg = typeof error?.context?.text === "function" ? await error.context.text() : error?.message;
      return { data: null, error: new Error(errorMsg || error?.message) };
    }
    return { data, error: null };
  },


  async importDatabaseSQL(sql: string, conflictStrategy: 'skip' | 'overwrite') {
    const { data, error } = await supabase.functions.invoke('db-optimize', {
      body: { action: 'import-sql', sql, conflictStrategy }
    });
    return { data, error };
  },

  async getAnnouncementAcknowledgments(userId?: string, openid?: string) {
    let query = supabase.from('announcement_acknowledgments').select('*');
    if (userId) query = query.eq('user_id', userId);
    if (openid) query = query.eq('openid', openid);
    return await query;
  },

  async acknowledgeAnnouncement(announcementId: string, userId?: string, openid?: string) {
    return await supabase.from('announcement_acknowledgments').upsert({
      announcement_id: announcementId,
      user_id: userId || null,
      openid: openid || null,
      acknowledged_at: new Date().toISOString()
    });
  },

  async optimizeDatabase(params?: any) {
    return await supabase.rpc('optimize_database');
  },

  async clearAllDuplicateMedia() {
    return await supabase.rpc('clear_all_duplicate_media');
  },

  async clearAllVisualDuplicates(threshold = 5) {
    return await supabase.rpc('clear_all_visual_duplicates', { p_threshold: threshold });
  },

  // 广告与分类
  async getAds() {
    return await supabase.from('ads').select('*').order('created_at', { ascending: false });
  },

  async upsertAd(ad: any) {
    // 移除空 ID 以免触发 UUID 格式错误
    const { id, ...cleanAd } = ad as any;
    const dataToSave = (id && id !== '') ? { id, ...cleanAd } : cleanAd;
    return await supabase.from('ads').upsert(dataToSave).select().single();
  },

  async deleteAd(id: string) {
    return await supabase.from('ads').delete().eq('id', id);
  },

  async logAdEvent(adId: string, eventType: string, userId?: string) {
    return await supabase.rpc('log_ad_event', {
      p_ad_id: adId,
      p_event_type: eventType,
      p_user_id: userId
    });
  },

  async getAdStats() {
    return await supabase.rpc('get_ad_stats');
  },

  async getUserPermissions(userId: string) {
    return await supabase.from('user_permissions').select('*').eq('user_id', userId).maybeSingle();
  },

  async upsertUserPermissions(userId: string, permissions: string[], groupName?: string) {
    // 修复：更新 profiles 表中的权限字段，而非直接 upsert 视图，规避 columns 引号问题
    return await supabase.rpc('update_user_permissions', { p_user_id: userId, p_permissions: permissions });
  },

  async getIpInfo() {
    return await supabase.functions.invoke('get-ip-info', {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      }
    });
  },

  async getDomainConfigs() {
    const { data, error } = await supabase
      .from('domain_configs')
      .select('*')
      .order('created_at', { ascending: true });
    return { data: data || [], error };
  },

  async addDomainConfig(domain: { domain_url: string; identifier: string }) {
    const { data, error } = await (supabase
      .from('domain_configs') as any)
      .insert([domain])
      .select()
      .single();
    return { data, error };
  },

  async updateDomainConfig(id: string, updates: Partial<{ is_active: boolean; domain_url: string; identifier: string }>) {
    const { data, error } = await (supabase
      .from('domain_configs') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deleteDomainConfig(id: string) {
    const { error } = await (supabase
      .from('domain_configs') as any)
      .delete()
      .eq('id', id);
    return { error };
  },

  // ==================== 每日图集 ====================
  
  /** 获取每日图集可用素材 (从媒体库) */
  async getActiveAnnouncements() {
    return await supabase
      .from('active_announcements')
      .select('*')
      .order('created_at', { ascending: false });
  },

  async getAllAnnouncements() {
    return await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
  },

  async upsertAnnouncement(announcement: any) {
    const { id, ...cleanAnnouncement } = announcement;
    if (id && id !== '') {
      return await supabase.from('announcements').update(cleanAnnouncement).eq('id', id).select().single();
    }
    return await supabase.from('announcements').insert([cleanAnnouncement]).select().single();
  },

  async deleteAnnouncement(id: string) {
    return await supabase.from('announcements').delete().eq('id', id);
  },

  async getScheduledTaskLogs(taskName?: string) {
    let query = supabase
      .from('scheduled_task_logs')
      .select('*')
      .order('execution_time', { ascending: false });
    
    if (taskName) {
      query = query.eq('task_name', taskName);
    }
    
    const { data, error } = await query.limit(10);
    return { data: data || [], error };
  },

  async getMiniProgramConfig() {
    return await supabase.from('miniprogram_configs').select('*').maybeSingle();
  },

  async getPublicMiniProgramConfig() {
    let { data, error } = await supabase.from('public_miniprogram_configs').select('*').maybeSingle();
    if (error && (error as any).status === 401) {
      await supabase.auth.signOut();
      return await supabase.from('public_miniprogram_configs').select('*').maybeSingle();
    }
    return { data, error };
  },


  async updateMiniProgramConfig(config: any) {
    const { data: existing } = await this.getMiniProgramConfig();
    const cleanConfig = { ...config };
    const finalData = { ...cleanConfig, id: existing?.id };
    return await supabase.from('miniprogram_configs').upsert(finalData);
  },

  async generateMiniProgramQr(itemId: string, type: string = 'daily_gallery', bindUserId?: string, domain?: string, browserId?: string, openid?: string, userId?: string) {
    const finalDomain = domain || (typeof window !== 'undefined' ? window.location.origin : undefined);
    return await supabase.functions.invoke('wechat-miniprogram', {
      body: { 
        action: 'generate_qr', 
        itemId, 
        type, 
        bindUserId, 
        domain: finalDomain, 
        browserId,
        openid,
        userId
      }
    });
  },

  async bindMiniProgram(code: string, userId: string) {
    return await supabase.functions.invoke('wechat-miniprogram', {
      body: { action: 'mp_bind', code, bindUserId: userId }
    });
  },

  async loginWithMiniProgram(code: string) {
    return await supabase.functions.invoke('wechat-miniprogram', {
      body: { action: 'mp_login', code }
    });
  },

  async checkAdUnlockStatus(itemId: string, type: string = 'daily_gallery', identifier?: string, userId?: string) {
    // 统一检查 YYYY-MM-DD 和 YYYYMMDD 格式
    const altItemId = itemId.includes('-') ? itemId.replace(/-/g, '') : `${itemId.slice(0, 4)}-${itemId.slice(4, 6)}-${itemId.slice(6, 8)}`;
    
    // 只查最近 24 小时的记录，避免干扰
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let query = supabase.from('ad_unlock_logs')
      .select('id, status, unlocked_at, created_at, details')
      .in('item_id', [itemId, altItemId])
      .eq('unlock_type', type)
      .gte('created_at', oneDayAgo);

    if (userId && identifier) {
       query = query.or(`user_id.eq.${userId},openid.eq.${identifier},browser_id.eq.${identifier}`);
    } else if (userId) {
       query = query.eq('user_id', userId);
    } else if (identifier) {
       query = query.or(`openid.eq.${identifier},browser_id.eq.${identifier}`);
    }

    const { data: logs } = await query.order('created_at', { ascending: false });
    
    if (!logs || logs.length === 0) return { status: 'not_started', unlocked: false };
    
    // 获取最顶层（最新）的一条记录
    const latestLog = logs[0];
    const isLatestUnlocked = latestLog.status === 'unlocked';
    
    // 1. 如果最新的记录是已解锁 (且在 2 小时内)
    if (isLatestUnlocked) {
      const unlockedAt = new Date(latestLog.unlocked_at || latestLog.created_at);
      const now = new Date();
      const diffHours = (now.getTime() - unlockedAt.getTime()) / (1000 * 60 * 60);
      
      if (diffHours <= 2) {
        return { 
          status: 'unlocked', 
          unlocked: true,
          password: latestLog.details?.password || null,
          unlocked_at: latestLog.unlocked_at || latestLog.created_at,
          created_at: latestLog.created_at
        };
      }
    }

    // 2. 如果最新的记录是正在观看 (或者虽然最新是解锁但已过期，看有没有更新的观看记录)
    // 这里的逻辑优化：即使有旧的解锁记录，只要有更近的观看记录，就显示观看中
    if (latestLog.status === 'watching' || latestLog.status === 'started' || latestLog.status === 'scanned') {
      const createdAt = new Date(latestLog.created_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
      
      if (diffMinutes <= 30) {
        return { 
          status: 'watching', 
          unlocked: false,
          created_at: latestLog.created_at
        };
      }
    }

    // 3. 兜底：寻找次新的有效解锁记录（实现 2 小时 Session 保持）
    const validUnlockedLog = logs.find(l => {
      if (l.status !== 'unlocked') return false;
      const t = new Date(l.unlocked_at || l.created_at).getTime();
      return (Date.now() - t) <= 2 * 60 * 60 * 1000;
    });

    if (validUnlockedLog) {
      return { 
        status: 'unlocked', 
        unlocked: true,
        password: validUnlockedLog.details?.password || null,
        unlocked_at: validUnlockedLog.unlocked_at || validUnlockedLog.created_at,
        created_at: validUnlockedLog.created_at
      };
    }

    return { status: 'not_started', unlocked: false };
  },

  // ==================== 微信公众号草稿箱 ====================
  
  async getWechatDraftTemplates() {
    return await supabase
      .from('wechat_draft_templates')
      .select('*')
      .order('created_at', { ascending: false });
  },

  async createWechatDraftTemplate(template: {
    name: string;
    description?: string;
    title: string;
    author?: string;
    digest?: string;
    content: string;
    content_source_url?: string;
    thumb_media_id?: string;
    thumb_url?: string;
    need_open_comment?: boolean;
    only_fans_can_comment?: boolean;
    category?: string;
  }) {
    return await supabase
      .from('wechat_draft_templates')
      .insert([template])
      .select()
      .single();
  },

  async updateWechatDraftTemplate(id: string, updates: any) {
    return await supabase
      .from('wechat_draft_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  },

  async deleteWechatDraftTemplate(id: string) {
    return await supabase
      .from('wechat_draft_templates')
      .delete()
      .eq('id', id);
  },

  async getWechatDrafts(configId?: string) {
    let query = supabase
      .from('wechat_drafts')
      .select('*, wechat_configs(name), wechat_draft_templates(name)')
      .order('created_at', { ascending: false });
    
    if (configId) {
      query = query.eq('config_id', configId);
    }
    
    return await query;
  },

  async createWechatDraft(draft: any) {
    // 过滤掉 image_ids 中的非 UUID 值
    if (draft.image_ids && Array.isArray(draft.image_ids)) {
      draft.image_ids = draft.image_ids.filter((id: string) => {
        if (typeof id !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      });
    }

    return await supabase
      .from('wechat_drafts')
      .insert([draft])
      .select()
      .single();
  },

  async updateWechatDraftDb(id: string, updates: any) {
    // 过滤掉 image_ids 中的非 UUID 值
    if (updates.image_ids && Array.isArray(updates.image_ids)) {
      updates.image_ids = updates.image_ids.filter((id: string) => {
        if (typeof id !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      });
    }
    
    return await supabase
      .from('wechat_drafts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  },

  async deleteWechatDraft(id: string) {
    return await supabase
      .from('wechat_drafts')
      .delete()
      .eq('id', id);
  },

  async uploadImageToWechat(configId: string, imageUrl: string) {
    return await supabase.functions.invoke('wechat-api', {
      body: { action: 'upload_image', configId, imageUrl }
    });
  },

  async uploadContentImageToWechat(configId: string, imageUrl: string) {
    return await supabase.functions.invoke('wechat-api', {
      body: { action: 'upload_content_image', configId, imageUrl }
    });
  },

  async addWechatDraft(configId: string, articles: any[]) {
    return await supabase.functions.invoke('wechat-api', {
      body: { action: 'add_draft', configId, articles }
    });
  },

  async updateWechatDraft(configId: string, mediaId: string, articles: any[], index = 0) {
    return await supabase.functions.invoke('wechat-api', {
      body: { action: 'update_draft', configId, mediaId, index, articles }
    });
  },

  async getWechatDraftList(configId: string, offset = 0, count = 20) {
    return await supabase.functions.invoke('wechat-api', {
      body: { action: 'get_draft_list', configId, offset, count }
    });
  },

  async getWechatPublishedList(configId: string, offset = 0, count = 20) {
    return await supabase.functions.invoke('wechat-api', {
      body: { action: 'get_published_list', configId, offset, count }
    });
  },

  async submitWechatPublish(configId: string, mediaId: string) {
    return await supabase.functions.invoke('wechat-api', {
      body: { action: 'submit_publish', configId, mediaId }
    });
  },

  async deleteWechatPublished(configId: string, articleId: string) {
    return await supabase.functions.invoke('wechat-api', {
      body: { action: 'delete_published', configId, articleId }
    });
  },

  async clearAllCache() {
    cache.clear();
    const { data, error } = await supabase.functions.invoke('cache-manager', { body: { action: 'clear' } });
    if (error) {
      console.error('[Cache Manager Error]:', error);
    }
    return { data, error };
  },
  
  async getSystemStatus() {
    return await supabase.rpc('get_system_status');
  },
  
  async checkEdgeFunctionHealth(name: string) {
    try {
      const { data, error } = await supabase.functions.invoke(`${name}/health`, { 
        method: 'GET' 
      });
      if (error) {
        // 如果是 404，说明可能是路径不对，或者没有 /health
        if (error.status === 404) {
          // 再次尝试根路径
          const { data: rootData, error: rootError } = await supabase.functions.invoke(name, { method: 'GET' });
          if (!rootError && rootData?.status === 'ok') {
            return { data: rootData, error: null };
          }
        }
        return { data: { status: 'error', version: 'unknown', service: name }, error: error };
      }
      return { data, error: null };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  async deleteWechatDraftFromWechat(configId: string, mediaId: string) {
    return await supabase.functions.invoke('wechat-api', {
      body: { action: 'delete_draft', configId, mediaId }
    });
  },

  async saveWechatMaterial(material: any) {
    // 验证 local_media_id 是否为有效的 UUID
    if (material.local_media_id) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(material.local_media_id);
      if (!isUUID) {
        delete material.local_media_id;
      }
    }
    
    return await supabase
      .from('wechat_materials')
      .upsert([material], { onConflict: 'config_id,media_id' })
      .select()
      .single();
  },

  async getWechatMaterials(configId: string, mediaType?: string) {
    let query = supabase
      .from('wechat_materials')
      .select('*, media_items(title, url)')
      .eq('config_id', configId)
      .order('created_at', { ascending: false });
    
    if (mediaType) {
      query = query.eq('media_type', mediaType);
    }
    
    return await query;
  },

  // ==================== 调试日志 ====================

  async getSuperbedConfig() {
    const cacheKey = 'superbed_config';
    // 后台管理页面禁用缓存，确保 CRUD 实时生效
    if (!(typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'))) {
      const cached = cache.get<SuperbedConfig>(cacheKey, 60000); // 1分钟
      if (cached) return { data: cached, error: null };
    }

    const { data, error } = await supabase.from('superbed_configs').select('*').maybeSingle();
    if (data && !error) {
      cache.set(cacheKey, data);
    }
    return { data: data as SuperbedConfig | null, error };
  },

  async upsertSuperbedConfig(updates: Partial<SuperbedConfig>) {
    const { id, updated_at, ...cleanUpdates } = updates as any;
    const { data: existing } = await this.getSuperbedConfig();
    const finalData = { ...cleanUpdates, id: existing?.id };
    
    const result = await supabase.from('superbed_configs').upsert(finalData).select().single();

    if (result.data && !result.error) {
      cache.set('superbed_config', result.data as any);
    }
    return { data: result.data as SuperbedConfig | null, error: result.error };
  },



  async getDebugLogSettings() {
    const cacheKey = 'debug_log_settings';
    // 后台管理页面禁用缓存，确保 CRUD 实时生效
    if (!(typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'))) {
      const cached = cache.get<DebugLogSetting>(cacheKey, 60000); // 1分钟
      if (cached) return { data: cached, error: null };
    }

    const { data, error } = await supabase.from('debug_log_settings').select('*').maybeSingle();
    if (data && !error) {
      cache.set(cacheKey, data);
    }
    return { data: data as DebugLogSetting | null, error };
  },

  async upsertDebugLogSettings(updates: Partial<DebugLogSetting>) {
    const { id, ...cleanUpdates } = updates as any;
    // 使用 RPC 或直接 upsert，确保只有一行配置
    const { data: existing } = await supabase.from('debug_log_settings').select('id').maybeSingle();
    
    const finalData = { 
      ...cleanUpdates, 
      id: existing?.id || (id && id !== '' ? id : undefined),
      updated_at: new Date().toISOString()
    };
    
    const result = await supabase.from('debug_log_settings').upsert(finalData).select().single();

    if (result.data && !result.error) {
      cache.set('debug_log_settings', result.data as any);
    }
    return { data: result.data as DebugLogSetting | null, error: result.error };
  },

  async addDebugLog(log: Omit<DebugLog, 'id' | 'created_at'>) {
    return await supabase.from('debug_logs').insert([log]).select();
  },

  async reloadPostgRestSchema() {
    return await supabase.rpc('reload_postgrest_schema');
  },

  async clearExpiredDebugLogs() {
    const { data: settings } = await this.getDebugLogSettings();
    if (!settings) return;
    const expiryDate = new Date(Date.now() - settings.retention_minutes * 60 * 1000).toISOString();
    return await supabase.from('debug_logs').delete().lt('created_at', expiryDate);
  },

  async getLoginStrategyConfig() {
    const { data, error } = await this.getSystemConfig('login_strategy_config');
    return { data: (data?.value || { strategy: 'supabase', sync_to_auth: true }) as { strategy: 'supabase' | 'custom' | 'hybrid', sync_to_auth: boolean }, error };
  },

  async updateLoginStrategyConfig(config: any) {
    return await this.updateSystemConfig('login_strategy_config', config);
  },

  /** 获取图片代理排除域名 */
  async getProxyExcludeDomains() {
    const cacheKey = 'proxy_exclude_domains';
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      return await supabase
        .from('proxy_exclude_domains')
        .select('*')
        .order('created_at', { ascending: false });
    }

    return cache.getOrFetch(cacheKey, async () => {
      const { data, error } = await supabase
        .from('proxy_exclude_domains')
        .select('*')
        .order('created_at', { ascending: false });
      return data;
    }, 60000, 'proxy_exclude_domains');
  },

  /** 添加图片代理排除域名 */
  async addProxyExcludeDomain(domain: string) {
    // 自动清理域名格式
    let cleanDomain = domain.trim().toLowerCase();
    try {
      if (cleanDomain.includes('://')) {
        const url = new URL(cleanDomain);
        cleanDomain = url.hostname;
      }
    } catch (e) {}
    
    return await supabase
      .from('proxy_exclude_domains')
      .upsert([{ domain: cleanDomain, is_enabled: true }], { onConflict: 'domain' });
  },

  /** 更新图片代理排除域名状态 */
  async updateProxyExcludeDomain(id: string, updates: { is_enabled?: boolean; domain?: string }) {
    return await supabase
      .from('proxy_exclude_domains')
      .update(updates)
      .eq('id', id);
  },

  /** 删除图片代理排除域名 */
  async deleteProxyExcludeDomain(id: string) {
    return await supabase
      .from('proxy_exclude_domains')
      .delete()
      .eq('id', id);
  },

  /** 获取系统构建记录 */
  async getSystemBuilds() {
    return await supabase.from('system_builds').select('*').order('created_at', { ascending: false });
  },

  /** 触发系统构建 */
  async triggerBuild(version: string, envConfig?: string) {
    return await supabase.functions.invoke('manage-build', {
      body: { action: 'trigger', version, env_config: envConfig }
    });
  },

  /** 获取系统统计信息 */
  async getSystemStats() {
    return await supabase.rpc('get_system_stats');
  },

  /** 获取存储使用统计 */
  async getStorageStats() {
    // 默认尝试获取所有公开 bucket 的统计信息
    const { data: buckets, error: bError } = await supabase.storage.listBuckets();
    if (bError) return { data: null, error: bError };

    const stats = [];
    for (const bucket of buckets) {
      // 实际上 Supabase Storage 没有直接获取 bucket 大小的 API，
      // 我们这里通过列表递归获取（模拟）或返回 bucket 列表
      stats.push({
        id: bucket.id,
        name: bucket.name,
        public: bucket.public
      });
    }
    return { data: stats, error: null };
  },

  /** 删除构建记录 */
  async deleteBuild(id: string) {
    return await supabase.from('system_builds').delete().eq('id', id);
  },
};
