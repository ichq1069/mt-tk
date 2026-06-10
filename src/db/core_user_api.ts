import { supabase } from './supabase';
import { cache } from '@/lib/cache';
import { getBeijingDate } from '@/lib/utils';
import type { MediaItem, Profile, StorageConfig, ItemStatus, UserRole, AppNotification, UserFieldConfig, CheckIn, PointsLog, Report, ReportStatus, Ad, RedemptionCode, RedemptionLog, Tag, MediaTag, ContentCategory, PermissionGroup, AuditConfig, DedupeConfig, SystemConfig, PhotoAlbum, AlbumPhoto, AlbumCustomField, AlbumFieldGroup, AlbumPhotoLevelLog, KeywordReplacement, Shortcode, SuperbedConfig, DebugLogSetting, DebugLog } from '@/types';

export const coreUserApi: any = {
  // 用户资料
  async getProfile(id: string) {
    const cacheKey = `user_profile_${id}`;
    // 后台管理页面禁用缓存，确保 CRUD 实时生效
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      const { data, error } = await supabase.from('profiles').select('*, permission_groups(*)').eq('id', id).maybeSingle();
      return { data: data as Profile | null, error };
    }

    try {
      const data = await cache.getOrFetch<Profile | null>(cacheKey, async () => {
        const { data: profile, error } = await supabase.from('profiles').select('*, permission_groups(*)').eq('id', id).maybeSingle();
        if (error) throw error;
        return profile;
      }, 600000, 'user_profile'); // 10分钟缓存
      return { data, error: null };
    } catch (error) {
      console.error('getProfile error:', error);
      return { data: null, error };
    }
  },

  async getMyAlbumAccessRequests(userId: string) {
    return await supabase
      .from('album_access_requests')
      .select('*, photo_albums(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  },

  async uploadToR2(file: any, path: string) {
    const res = await this.uploadFile('user-uploads', path, file);
    if (res.error) return { data: null, error: res.error };
    return { data: { publicUrl: res.data }, error: null };
  },

  async getAllProfiles(page = 0, limit = 20, search = '', groupId?: string) {
    let query = supabase.from('profiles').select('*, permission_groups(*), wechat_users(id, openid, wechat_configs(name))', { count: 'exact' });
    if (search) {
      const isNumber = /^\d+$/.test(search);
      let orStr = `username.ilike.%${search}%,email.ilike.%${search}%,notes.ilike.%${search}%,mp_openid.ilike.%${search}%,wechat_openid.ilike.%${search}%`;
      if (isNumber) {
        // 如果输入的是全数字，则增加对数字ID的精确匹配搜索
        orStr += `,digital_id.eq."${search}"`;
      }
      query = query.or(orStr);
    }
    if (groupId) query = query.eq('group_id', groupId);
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
    return { data: (data || []) as Profile[], error, total: count || 0 };
  },
  async getInvitedUsers(referrerId: string) {
    return await supabase.from('profiles').select('id, username, avatar_url, created_at').eq('referrer_id', referrerId).order('created_at', { ascending: false });
  },


  async searchProfiles(query: string) {
    let q = supabase.from('profiles').select('id, username, email, avatar_url, digital_id');
    const isNumber = /^\d+$/.test(query);
    if (isNumber) {
      q = q.or(`username.ilike.%${query}%,email.ilike.%${query}%,digital_id.eq."${query}"`);
    } else {
      q = q.or(`username.ilike.%${query}%,email.ilike.%${query}%`);
    }
    const { data, error } = await q.limit(5);
    return { data: (data || []) as Profile[], error };
  },

  async updateProfile(id: string, updates: Partial<Profile>) {
    cache.invalidate(`user_profile_${id}`);
    const processedUpdates = { ...updates };
    if (processedUpdates.username) {
      processedUpdates.username = await this.applyUserContentReplacements(processedUpdates.username);
    }
    if (processedUpdates.notes) {
      processedUpdates.notes = await this.applyUserContentReplacements(processedUpdates.notes);
    }
    return await supabase.from('profiles').update(processedUpdates).eq('id', id).select().single();
  },

  async updateProfileBannedStatus(id: string, is_banned: boolean) {
    return this.updateProfile(id, { is_banned });
  },
  async updateProfileBlacklistStatus(id: string, is_blacklisted: boolean) {
    return this.updateProfile(id, { is_blacklisted });
  },

  async getBlacklistedProfiles(page = 0, limit = 20, search = '') {
    let query = supabase.from('profiles').select('*, permission_groups(*)', { count: 'exact' }).eq('is_blacklisted', true);
    if (search) query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    const { data, error, count } = await query.order('updated_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
    return { data: (data || []) as Profile[], error, total: count || 0 };
  },


  async updateProfileRole(id: string, role: UserRole) {
    return this.updateProfile(id, { role });
  },
  async updateProfileDigitalId(id: string, digitalId: string | number | null) {
    cache.invalidate(`user_profile_${id}`);
    return await supabase.from('profiles').update({ digital_id: digitalId }).eq('id', id);
  },
  async batchUpdateProfiles(profiles: any[]) {
    // Expects array of { id, digital_id, custom_fields }
    const { data, error } = await supabase.from('profiles').upsert(profiles);
    if (!error) {
      profiles.forEach(p => cache.invalidate(`user_profile_${p.id}`));
    }
    return { data, error };
  },



  async updateProfileNotes(id: string, notes: string) {
    return this.updateProfile(id, { notes });
  },


  async updateUserAuthEmail(userId: string, email: string) {
    return await supabase.functions.invoke('admin-auth-action', { 
      body: { action: 'update_email', userId, email } 
    });
  },

  async deleteUser(userId: string) {
    return await supabase.functions.invoke('delete-user', { body: { userId } });
  },

  async sendEmail(to: string, subject: string, content: string) {
    return await supabase.functions.invoke('send-email', { body: { to, subject, content } });
  },

  async batchRepairAuthUsers() {
    return await supabase.functions.invoke('admin-auth-action', { 
      body: { action: 'batch_repair_users' } 
    });
  },

  async createUserManually(formData: any) {
    return await supabase.functions.invoke('create-user-manually', { body: formData });
  },

  // 媒体内容
  async getRecommendationSettings() {
    return await supabase.from('recommendation_settings').select('*').eq('name', 'default').maybeSingle();
  },

  async updateRecommendationSettings(weights: any) {
    return await supabase.from('recommendation_settings').update({ weights, updated_at: new Date().toISOString() }).eq('name', 'default');
  },

  async getCurrentProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: null };
    return this.getProfile(user.id);
  },

  async createReport(report: any) {
    const res = await supabase.from('reports').insert([report]).select().single();
    if (!res.error) {
      // 发送邮件通知管理员
      this.sendEmail(
        '2314429716@qq.com',
        '【系统通知】收到新的内容举报',
        `管理员您好：\n\n系统收到一条新的内容举报。\n举报人ID: ${report.user_id || '匿名'}\n举报类型: ${report.report_type}\n举报原因: ${report.reason}\n被举报内容ID: ${report.media_id}\n\n请尽快登录管理后台处理。`
      ).catch((err: any) => console.error('Failed to send report notification email:', err));
    }
    return res;
  },

  async getCheckInHistory(userId: string, page = 0, limit = 30) {
    return await supabase.from('check_ins').select('*').eq('user_id', userId).order('check_in_date', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
  },

  async performCheckIn(userId: string) {
    return await supabase.functions.invoke('check-in', { body: { userId } });
  },

  async trackInteraction(mediaId: string, type: 'view' | 'favorite' | 'click' | 'share', weight = 1) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    return await supabase.from('user_interactions').insert([{
      user_id: user.id,
      media_id: mediaId,
      interaction_type: type,
      weight
    }]);
  },

  async clearUserInteractions(userId: string) {
    return await supabase.from('user_interactions').delete().eq('user_id', userId);
  },


  async cleanupOldNotifications(days = 30) {
    return await supabase.rpc('cleanup_old_notifications', { days_threshold: days });
  },

  async getPermissionGroups() {
    return await supabase.from('permission_groups').select('*').order('is_default', { ascending: false });
  },

  async updatePermissionGroup(id: string, updates: Partial<PermissionGroup>) {
    return await supabase.from('permission_groups').update(updates).eq('id', id).select().single();
  },

  // 通知相关
  async getNotifications(userId?: string, isAdmin = false) {
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (!isAdmin) {
      if (!userId) {
        // 未登录用户：只显示全局通知（user_id 和 role_id 都为 null）
        query = query.is('user_id', null).is('role_id', null);
      } else {
        // 已登录用户：显示属于该用户的通知 + 全局通知
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }
      query = query.in('channel', ['in_app', 'all']);
    }
    return await query;
  },

  async markNotificationAsRead(id: string) {
    return await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
  },

  async markAllNotificationsAsRead(userId: string) {
    // 标记所有属于当前用户的通知为已读
    return await supabase.from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);
  },

  async deleteReadNotifications(userId: string) {
    // 删除属于当前用户的已读通知
    return await supabase.from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true);
  },

  async getPointsLogs(userId?: string, page = 0, limit = 20) {
    if (!userId) return { data: [], error: { message: 'UserId is required' } };
    
    // 根据要求：不显示后台同步记录 (type != 'sync')
    // 且不显示重复记录 (针对下载，我们已经在 SQL 层保证了，这里保持简单的过滤逻辑)
    const { data, error, count } = await supabase
      .from('points_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .not('type', 'eq', 'sync') // 排除后台同步
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
      
    return { data: (data || []) as PointsLog[], error, total: count || 0 };
  },

  async getCheckInStatus(userId: string) {
    const today = getBeijingDate();
    const { data, error } = await supabase.from('check_ins').select('*').eq('user_id', userId).eq('check_in_date', today).maybeSingle();
    return { hasCheckedIn: !!data, error };
  },
  async createNotification(notification: any) {
    return await supabase.from('notifications').insert([notification]).select().single();
  },

  async bufferNotification(notification: any) {
    // 检查是否有待发送的同类通知（同用户、同类型、同链接）
    const { data: existing, error: findError } = await supabase
      .from('notification_buffer')
      .select('*')
      .eq('user_id', notification.user_id)
      .eq('type', notification.type)
      .eq('link', notification.link)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      // 合并内容
      let newContent = notification.content;
      let count = (existing.metadata?.count || 1) + 1;
      
      if (notification.type === 'audit') {
        newContent = `您有 ${count} 个作品已处理完毕，请点击查看。`;
      } else if (notification.type === 'takedown') {
        newContent = `您有 ${count} 个作品被下架或拒绝，请查看详情。`;
      }
      
      return await supabase
        .from('notification_buffer')
        .update({ 
          content: newContent, 
          metadata: { ...existing.metadata, count }, 
          send_at: new Date(Date.now() + 60000).toISOString(), // 延时 1 分钟
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // 创建新缓冲
      return await supabase
        .from('notification_buffer')
        .insert([{
          ...notification,
          send_at: new Date(Date.now() + 60000).toISOString(), // 延时 1 分钟
          metadata: { count: 1 }
        }]);
    }
  },

  async flushNotificationBuffer() {
    return await supabase.rpc('flush_notification_buffer');
  },

  async logUserVisitStats(stats: any) {
    // 调用 upsert_user_visit_stats 函数记录访问统计
    // 已确保数据库中的函数参数与此处使用的 p_ 前缀一致
    return await supabase.rpc('upsert_user_visit_stats', {
      p_user_id: stats.user_id || null,
      p_ip_address: stats.ip_address || 'unknown',
      p_browser: stats.browser || 'unknown',
      p_os: stats.os || 'unknown',
      p_network_type: stats.network_type || 'unknown',
      p_path: stats.path || '/',
      p_duration: Math.floor(stats.duration || 0),
      p_adblock_enabled: !!stats.adblock_enabled,
      p_device: stats.device || 'PC',
      p_country: stats.country || null,
      p_region: stats.region || null,
      p_city: stats.city || null,
      p_referrer: stats.referrer || null,
      p_resolution: stats.resolution || null,
      p_language: stats.language || null,
      p_page_title: stats.page_title || null,
      p_visited_at: stats.visited_at || new Date().toISOString()
    });
  },
  
  async getVisitStats() {
    return await supabase.from('user_visit_stats').select('*, profiles!user_id(username, avatar_url)').order('created_at', { ascending: false }).limit(2000);
  },

  async getTerminalAnalytics() {
    return await supabase.rpc('get_terminal_analytics');
  },


  async deleteNotification(id: string) {
    return await supabase.from('notifications').delete().eq('id', id);
  },


  async redeemCode(userId: string, code: string) {
    return await supabase.functions.invoke('redeem-code', { body: { userId, code } });
  },

  async uploadFile(bucket: string, path: string, file: any) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', path);
      formData.append('bucket', bucket);

      const { data, error } = await supabase.functions.invoke('app-storage', {
        body: formData,
        headers: {
          'x-bucket-name': bucket
        }
      });

      if (error) {
        let errorMsg = error.message;
        if (error.context && typeof error.context.text === 'function') {
          try {
            const contextText = await Promise.race([
              error.context.text(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
            ]);
            if (contextText && typeof contextText === 'string') errorMsg = contextText;
          } catch (e) {
            console.warn('Failed to get error context text:', e);
          }
        }
        return { error: new Error(errorMsg) };
      }
      
      if (!data?.success) return { error: new Error(data?.error || '上传失败') };
      
      return { data: data.url, error: null };
    } catch (err: any) {
      console.error('uploadFile caught error:', err);
      return { error: err };
    }
  },


  async getNotificationTemplates() {
    return await supabase.from('notification_templates').select('*').order('created_at', { ascending: false });
  },

  // 查重扫描
  async getGuides() {
    return await supabase.from('system_guides').select('*, system_guide_categories(name)').order('created_at', { ascending: false });
  },
  async getGuide(id: string) {
    return await supabase.from('system_guides').select('*, system_guide_categories(name)').eq('id', id).maybeSingle();
  },
  async createGuide(guide: { title: string; content: string; is_public: boolean; category_id?: string | null }) {
    return await supabase.from('system_guides').insert([guide]).select().single();
  },
  async updateGuide(id: string, updates: Partial<{ title: string; content: string; is_public: boolean; category_id?: string | null; custom_fields?: any }>) {
    return await supabase.from('system_guides').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  },
  // 文档分类相关
  async getGuideCategories() {
    return await supabase
      .from('system_guide_categories')
      .select('*')
      .order('sort_order', { ascending: true });
  },

  async createGuideCategory(category: any) {
    return await supabase
      .from('system_guide_categories')
      .insert(category);
  },

  async updateGuideCategory(id: string, category: any) {
    return await supabase
      .from('system_guide_categories')
      .update(category)
      .eq('id', id);
  },

  async deleteGuideCategory(id: string) {
    return await supabase
      .from('system_guide_categories')
      .delete()
      .eq('id', id);
  },

  // 文档模板相关
  async getGuideTemplates() {
    return await supabase
      .from('system_guide_templates')
      .select('*')
      .order('created_at', { ascending: false });
  },

  async createGuideTemplate(template: any) {
    return await supabase
      .from('system_guide_templates')
      .insert(template);
  },

  async updateGuideTemplate(id: string, template: any) {
    return await supabase
      .from('system_guide_templates')
      .update(template)
      .eq('id', id);
  },
  
  // 登录与会话管理
  async getLoginSettings() {
    const { data, error } = await this.getSystemConfig('login_methods');
    return { data: (data?.value || { wechat: true, email: true, phone: false }) as { wechat: boolean; email: boolean; phone: boolean }, error };
  },

  async getActiveSessions(userId: string) {
    const { data, error } = await supabase
      .from('user_active_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('last_ping_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()); // 15分钟内有心跳
    return { data, error };
  },

  async upsertActiveSession(userId: string, sessionId: string, deviceInfo: any) {
    // 切换到 RPC 调用，规避 columns 引号问题
    return await supabase.rpc('upsert_user_active_session', {
      p_user_id: userId,
      p_session_id: sessionId,
      p_device_info: deviceInfo,
      p_is_active: true,
      p_last_ping_at: new Date().toISOString()
    });
  },

  async invalidateAllUserSessions(userId: string) {
    // 标记所有会话为不活跃
    await supabase.from('user_active_sessions').update({ is_active: false }).eq('user_id', userId);
    // 更新用户安全状态
    await supabase.from('profiles').update({ security_status: 'reset_required' }).eq('id', userId);
    return { success: true };
  },

  async checkUserSessionsByIdentifier(identifier: string) {
    const { data, error } = await supabase.rpc('check_user_sessions_by_identifier', { p_identifier: identifier });
    const result = Array.isArray(data) ? data[0] : data;
    // 重映射字段名，确保前端代码兼容性
    if (result && result.user_id_out) {
      result.user_id = result.user_id_out;
    }
    return { data: result, error };
  },

  async checkEmailExistence(email: string) {
    const { data, error } = await supabase.from('profiles').select('id, email, security_status').eq('email', email).maybeSingle();
    return { data, error };
  },

  async deleteGuideTemplate(id: string) {
    return await supabase
      .from('system_guide_templates')
      .delete()
      .eq('id', id);
  },

  async deleteGuide(id: string) {
    return await supabase.from('system_guides').delete().eq('id', id);
  },
  async incrementGuideView(id: string) {
    return await supabase.rpc('increment_guide_view', { guide_id: id });
  },

  async getReadingRanking(limit = 10, type: 'continuous' | 'total' = 'continuous') {
    const orderField = type === 'continuous' ? 'continuous_read_days' : 'total_read_days';
    return await supabase
      .from('profiles')
      .select('id, username, avatar_url, continuous_read_days, total_read_days')
      .order(orderField, { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(limit);
  },

  async getUserReadingRank(userId?: string | null, type: 'continuous' | 'total' = 'continuous', openid?: string | null) {
    let query = supabase.from('profiles').select('continuous_read_days, total_read_days, updated_at');
    
    if (userId) {
      query = query.eq('id', userId);
    } else if (openid) {
      // 兼容 mp_openid 和 wechat_openid
      query = query.or(`mp_openid.eq.${openid},wechat_openid.eq.${openid}`);
    } else {
      return { rank: null, continuous_read_days: 0, total_read_days: 0 };
    }

    const { data: profile } = await query.maybeSingle();

    if (!profile) return { rank: null, continuous_read_days: 0, total_read_days: 0 };

    const val = type === 'continuous' ? profile.continuous_read_days : (profile.total_read_days || 0);
    const field = type === 'continuous' ? 'continuous_read_days' : 'total_read_days';

    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .or(`${field}.gt.${val},and(${field}.eq.${val},updated_at.gt.${profile.updated_at})`);

    return { 
      rank: (count || 0) + 1, 
      continuous_read_days: profile.continuous_read_days,
      total_read_days: profile.total_read_days || 0
    };
  },

  async updateReadingStats(userId?: string | null, openid?: string | null) {
    return await supabase.rpc('update_user_reading_stats', { 
      target_user_id: userId || null,
      target_openid: openid || null
    });
  },

  // 勋章相关
  async getBadges() {
    return await supabase.from('badges').select('*').eq('is_active', true).order('category', { ascending: true });
  },

  async getAllBadgesAdmin() {
    return await supabase.from('badges').select('*').order('created_at', { ascending: false });
  },

  async getUserBadges(userId: string) {
    return await supabase.from('user_badges').select('*, badges(*)').eq('user_id', userId);
  },

  async upsertBadge(badge: any) {
    const { id, ...cleanBadge } = badge;
    if (id && id !== '') {
      return await supabase.from('badges').update(cleanBadge).eq('id', id).select().single();
    }
    return await supabase.from('badges').insert([cleanBadge]).select().single();
  },

  // ==================== 微信订阅通知 ====================
  async getWechatNotificationTemplates(configId: string) {
    return await supabase
      .from('wechat_notification_templates')
      .select('*')
      .eq('config_id', configId)
      .order('created_at', { ascending: false });
  },

  async syncWechatNotificationTemplates(configId: string) {
    return await supabase.functions.invoke('wechat-notifications', {
      body: { action: 'sync_templates', configId }
    });
  },

  async getWechatNotificationTasks(configId: string, page = 0, limit = 20) {
    const { data, error, count } = await supabase
      .from('wechat_notification_tasks')
      .select('*, wechat_notification_templates(title, pri_tmpl_id)', { count: 'exact' })
      .eq('config_id', configId)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    return { data: data || [], error, total: count || 0 };
  },

  async createWechatNotificationTask(task: any) {
    return await supabase
      .from('wechat_notification_tasks')
      .insert([task])
      .select()
      .single();
  },

  async updateWechatNotificationTask(taskId: string, task: any) {
    return await supabase
      .from('wechat_notification_tasks')
      .update(task)
      .eq('id', taskId)
      .select()
      .single();
  },


  async deleteWechatNotificationTask(taskId: string) {
    return await supabase
      .from('wechat_notification_tasks')
      .delete()
      .eq('id', taskId);
  },

  async sendWechatNotificationTask(configId: string, taskId: string) {
    return await supabase.functions.invoke('wechat-notifications', {
      body: { action: 'send_task', configId, taskId }
    });
  },

  async getWechatNotificationLogs(taskId: string, page = 0, limit = 50) {
    const { data, error, count } = await supabase
      .from('wechat_notification_logs')
      .select('*', { count: 'exact' })
      .eq('task_id', taskId)
      .order('sent_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    return { data: data || [], error, total: count || 0 };
  },

  async getWechatPubCategories(configId: string) {
    return await supabase.functions.invoke('wechat-notifications', {
      body: { action: 'get_category', configId }
    });
  },

  async getWechatPubTemplates(configId: string, ids: string, start = 0, limit = 30) {
    return await supabase.functions.invoke('wechat-notifications', {
      body: { action: 'get_pub_templates', configId, ids, start, limit }
    });
  },

  async getWechatPubKeywords(configId: string, tid: string) {
    return await supabase.functions.invoke('wechat-notifications', {
      body: { action: 'get_pub_keywords', configId, tid }
    });
  },

  async addWechatNotificationTemplate(configId: string, params: { tid: string; kidList: number[]; sceneDesc?: string }) {
    return await supabase.functions.invoke('wechat-notifications', {
      body: { action: 'add_template', configId, ...params }
    });
  },

  async deleteWechatNotificationTemplate(configId: string, priTmplId: string) {
    // 首先从微信删除
    const res = await supabase.functions.invoke('wechat-notifications', {
      body: { action: 'delete_template', configId, priTmplId }
    });
    
    if (res.data?.success || res.data?.errcode === 0) {
      // 然后从本地删除
      return await supabase
        .from('wechat_notification_templates')
        .delete()
        .eq('config_id', configId)
        .eq('pri_tmpl_id', priTmplId);
    }
    return res;
  },

  // 获取用户订阅状态
  async getWechatNotificationSubscriptions(configId: string, page = 0, limit = 20, search?: string) {
    let query = supabase
      .from('wechat_notification_subscriptions')
      .select('*, config:wechat_configs(name)', { count: 'exact' })
      .eq('config_id', configId);
    
    if (search) {
      // 如果搜索内容存在，则添加模糊查询
      query = query.or(`openid.ilike.%${search}%,template_id.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
      
    return { data: data || [], error, total: count || 0 };
  },


  async deleteBadge(id: string) {
    return await supabase.from('badges').delete().eq('id', id);
  },

  async grantBadge(userId: string, badgeId: string, expiresAt?: string) {
    return await supabase.rpc('batch_grant_badges', { p_user_ids: [userId], p_badge_id: badgeId, p_expires_at: expiresAt });
  },

  async batchGrantBadges(userIds: string[], badgeId: string, expiresAt?: string) {
    return await supabase.rpc('batch_grant_badges', { p_user_ids: userIds, p_badge_id: badgeId, p_expires_at: expiresAt });
  },

  async grantBadgeToGroup(groupId: string, badgeId: string, expiresAt?: string) {
    return await supabase.rpc('grant_badge_to_group', { p_group_id: groupId, p_badge_id: badgeId, p_expires_at: expiresAt });
  },

  async revokeBadge(userId: string, badgeId: string) {
    return await supabase.from('user_badges').delete().match({ user_id: userId, badge_id: badgeId });
  },

  async getBadgeTasks() {
    return await supabase.from('badge_tasks').select('*, badges(*)');
  },

  async getBadgeCategories() {
    return await supabase.from('badge_categories').select('*').order('sort_order', { ascending: true });
  },

  async upsertBadgeCategory(category: any) {
    const { id, ...cleanCategory } = category;
    if (id && id !== '') {
      return await supabase.from('badge_categories').update(cleanCategory).eq('id', id).select().maybeSingle();
    }
    return await supabase.from('badge_categories').insert([cleanCategory]).select().maybeSingle();
  },

  async deleteBadgeCategory(id: string) {
    return await supabase.from('badge_categories').delete().eq('id', id);
  },

  async upsertBadgeTask(task: any) {
    const { id, badges, ...cleanTask } = task;
    if (id && id !== '') {
      return await supabase.from('badge_tasks').update(cleanTask).eq('id', id).select().maybeSingle();
    }
    return await supabase.from('badge_tasks').insert([cleanTask]).select().maybeSingle();
  },

  async claimBadge(userId: string, badgeId: string) {
    // 检查是否已经拥有
    const { data: existing } = await supabase
      .from('user_badges')
      .select('id')
      .match({ user_id: userId, badge_id: badgeId })
      .maybeSingle();
    
    if (existing) {
      return { error: { message: '您已拥有该勋章' } };
    }

    return await supabase.from('user_badges').insert({
      user_id: userId,
      badge_id: badgeId,
      granted_at: new Date().toISOString()
    });
  },

  async getUserBadgeProgress(userId: string) {
    // 获取各项指标数据
    const [checkinRes, uploadRes, favoriteRes] = await Promise.all([
      supabase.from('check_ins').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('media_items').select('id', { count: 'exact' }).match({ user_id: userId, status: 'approved' }),
      supabase.from('favorites').select('id', { count: 'exact' }).eq('user_id', userId)
    ]);

    return {
      checkin_count: checkinRes.count || 0,
      upload_count: uploadRes.count || 0,
      favorite_count: favoriteRes.count || 0
    };
  },

  async checkUserBadges(userId: string) {
    return await supabase.rpc('check_user_badges', { p_user_id: userId });
  },

  async checkAllUsersBadges() {
    return await supabase.rpc('check_all_users_badges');
  },


  async deleteBadgeTask(id: string) {
    return await supabase.from('badge_tasks').delete().eq('id', id);
  },

  // 全局关键词替换
  async getKeywordReplacements() {
    return await supabase.from('global_keyword_replacements').select('*').order('created_at', { ascending: false });
  },

  async upsertKeywordReplacement(replacement: Partial<KeywordReplacement>) {
    // 移除空 ID 以免触发 UUID 格式错误
    const { id, ...cleanReplacement } = replacement as any;
    const dataToSave = (id && id !== '') ? { id, ...cleanReplacement } : cleanReplacement;
    return await supabase.from('global_keyword_replacements').upsert(dataToSave).select().single();
  },

  async deleteKeywordReplacement(id: string) {
    return await supabase.from('global_keyword_replacements').delete().eq('id', id);
  },


  async applyUserContentReplacements(text: string): Promise<string> {
    if (!text) return text;
    try {
      const { data: rules } = await this.getKeywordReplacements();
      if (!rules) return text;
      
      let result = text;
      rules
        .filter((r: any) => r.type === 'user' && r.is_active)
        .forEach((rule: any) => {
          const escaped = rule.original_word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          result = result.replace(new RegExp(escaped, 'g'), rule.replacement_word);
        });
      return result;
    } catch (e) {
      console.error('Apply replacements error:', e);
      return text;
    }
  },

  // 短代码管理
  async getShortcodes() {
    return await supabase.from('site_shortcodes').select('*').order('created_at', { ascending: false });
  },

  async upsertShortcode(shortcode: any) {
    const { id, ...cleanShortcode } = shortcode;
    if (id && id !== '') {
      return await supabase.from('site_shortcodes').update(cleanShortcode).eq('id', id).select().single();
    }
    return await supabase.from('site_shortcodes').insert([cleanShortcode]).select().single();
  },

  async deleteShortcode(id: string) {
    return await supabase.from('site_shortcodes').delete().eq('id', id);
  },


  async checkUserBadgeTasks(userId: string) {
    return await supabase.rpc('check_user_badge_tasks', { p_user_id: userId });
  },

  async ignoreAllDedupeErrors() {
    return await supabase.from('media_items').update({ dedupe_ignored: true }).not('dedupe_error', 'is', null);
  },

  async getUnprocessedMediaCount() {
    const { count, error } = await supabase.from('media_items').select('*', { count: 'exact', head: true }).eq('type', 'image').is('content_hash', null).is('dedupe_error', null).eq('dedupe_ignored', false);
    return { count: count || 0, error };
  },

  async getReports(page = 0, limit = 20, status?: string) {
    let query = supabase.from('reports').select('*, media_items(*), profiles!reporter_id(*)', { count: 'exact' });
    if (status) query = query.eq('status', status);
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
    return { data: (data || []) as Report[], error, total: count || 0 };
  },

  async updateReportStatus(id: string, status: ReportStatus, result?: string, punishment?: string) {
    return await supabase.from('reports').update({ 
      status, 
      result, 
      punishment, 
      updated_at: new Date().toISOString() 
    }).eq('id', id).select().single();
  },

  async resetUserPassword(userId: string, newPassword: string) {
    return await supabase.functions.invoke('admin-auth-action', {
      body: { action: 'reset_password', userId, password: newPassword }
    });
  },

  async getDigitalIdConfig() {
    return await supabase.from('digital_id_configs').select('*').maybeSingle();
  },

  async updateDigitalIdConfig(updates: any) {
    const { data: cfg } = await this.getDigitalIdConfig();
    const finalData = { ...updates, id: cfg?.id };
    return await supabase.from('digital_id_configs').upsert(finalData).select().single();
  },

  async getExcludedDigitalIds() {
    return await supabase.from('excluded_digital_ids').select('*').order('created_at', { ascending: false });
  },

  async addExcludedDigitalId(digital_id: string, reason?: string) {
    return await supabase.from('excluded_digital_ids').insert([{ digital_id, reason }]);
  },

  async deleteExcludedDigitalId(id: string) {
    return await supabase.from('excluded_digital_ids').delete().eq('id', id);
  },

  async getDigitalIdPatterns() {
    return await supabase.from('digital_id_patterns').select('*').order('created_at', { ascending: false });
  },

  async addDigitalIdPattern(pattern: string, description?: string) {
    return await supabase.from('digital_id_patterns').insert([{ pattern, description }]);
  },

  async updateDigitalIdPattern(id: string, updates: any) {
    return await supabase.from('digital_id_patterns').update(updates).eq('id', id);
  },

  async deleteDigitalIdPattern(id: string) {
    return await supabase.from('digital_id_patterns').delete().eq('id', id);
  },

  /** 获取可用靓号 (前端展示，过滤已售) */
  async getAvailableSpecialDigitalIds() {
    return await supabase
      .from('special_digital_ids')
      .select('*, profiles(username)')
      .eq('is_sold', false)
      .order('price', { ascending: true });
  },

  async buySpecialDigitalId(userId: string, specialId: string) {
    const { data, error } = await supabase.rpc('buy_special_digital_id', {
      p_user_id: userId,
      p_special_id: specialId
    });
    return { data, error };
  },

  async getRanks() {
    return await supabase.from('rank_configs').select('*').order('min_exp', { ascending: true });
  },

  async createSpecialDigitalId(data: any) {
    return await supabase.from('special_digital_ids').insert([data]).select().single();
  },

  async updateSpecialDigitalId(id: string, updates: any) {
    return await supabase.from('special_digital_ids').update(updates).eq('id', id).select().single();
  },

  async deleteSpecialDigitalId(id: string) {
    return await supabase.from('special_digital_ids').delete().eq('id', id);
  },


  // 图集写真模块
  async getGrowthLogs() {
    return await supabase.from('growth_logs').select('*, profiles!user_id(username)').order('created_at', { ascending: false }).limit(100);
  },

  async getUserGrowthLogs(userId: string, page = 0, limit = 20) {
    return await supabase.from('growth_logs').select('*', { count: 'exact' }).eq('user_id', userId).order('created_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
  },


  async getPointsLogic() {
    return await this.getSystemConfig('points_logic');
  },

  async updatePointsLogic(logic: any) {
    const { error } = await supabase.from('system_configs').upsert({ key: 'points_logic', value: logic }, { onConflict: 'key' });
    return { error };
  },

  async awardUserReward(userId: string, action: string, targetId?: string) {
    // 接口风暴优化：5秒内同一个用户+同一个动作+同一个目标只记一次
    const dedupKey = `reward_${userId}_${action}_${targetId || ''}`;
    if ((window as any)._recentRewards?.[dedupKey]) return { data: null, error: null };
    
    if (!(window as any)._recentRewards) (window as any)._recentRewards = {};
    (window as any)._recentRewards[dedupKey] = true;
    setTimeout(() => {
      if ((window as any)._recentRewards) delete (window as any)._recentRewards[dedupKey];
    }, 5000);

    return await supabase.rpc('award_user_reward', { p_user_id: userId, p_action: action, p_target_id: targetId });
  },

  async getSigninConfigs() {
    return await supabase.from('signin_configs').select('*').order('day_number', { ascending: true });
  },

  async updateSigninConfigs(configs: any[]) {
    return await supabase.from('signin_configs').upsert(configs);
  },

  async deleteSigninConfig(id: string) {
    return await supabase.from('signin_configs').delete().eq('id', id);
  },
  async directLogin(username: string, password: string) {
    return await supabase.functions.invoke('direct-auth', {
      body: { action: 'login', username, password }
    });
  },

  async directSignUp(username: string, password: string, customData?: any, inviteCode?: string, email?: string) {
    return await supabase.functions.invoke('direct-auth', {
      body: { action: 'register', username, password, customData, inviteCode, email }
    });
  },


  async getDailyGalleryAccessHistory(openid: string) {
    if (!openid) return { data: [], error: null };
    const { data, error } = await supabase
      .from('daily_gallery_user_passwords')
      .select('*')
      .eq('openid', openid)
      .order('post_date', { ascending: false });
    return { data, error };
  },

};
