import { supabase } from './supabase';
import { cache } from '@/lib/cache';
import { getBeijingDate } from '@/lib/utils';
import type { MediaItem, Profile, StorageConfig, ItemStatus, UserRole, AppNotification, UserFieldConfig, CheckIn, PointsLog, Report, ReportStatus, Ad, RedemptionCode, RedemptionLog, Tag, MediaTag, ContentCategory, PermissionGroup, AuditConfig, DedupeConfig, SystemConfig, PhotoAlbum, AlbumPhoto, AlbumCustomField, AlbumFieldGroup, AlbumPhotoLevelLog, KeywordReplacement, Shortcode, SuperbedConfig, DebugLogSetting, DebugLog } from '@/types';

export const mediaSocialApi: any = {
  async getPhotoAlbums(page = 0, limit = 20, search = '', permissionGroupId?: string, onlyPublic = true) {
    // 根据用户要求，列表接口完全禁止缓存，确保即时显示最新内容
    // 同时通过 album_photos(url) 获取第一张图片作为封面兜底
    let query = supabase.from('photo_albums').select('*, permission_groups!permission_group_id(*), album_photos!album_id(url)', { count: 'exact' }).eq('is_active', true);
    if (onlyPublic) query = query.eq('is_public', true);
    if (search) query = query.ilike('title', `%${search}%`);
    if (permissionGroupId) query = query.eq('permission_group_id', permissionGroupId);
    
    // 我们对 album_photos 进行排序和限制，确保只拿到第一张
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .order('sort_order', { foreignTable: 'album_photos', ascending: true })
      .limit(1, { foreignTable: 'album_photos' })
      .range(page * limit, (page + 1) * limit - 1);
    
    if (error && (error as any).code === 'PGRST103') {
      return { data: [], error: null, total: count || 0 };
    }
    
    const albums = (data || []) as (PhotoAlbum & { album_photos: { url: string }[] })[];
    
    // 如果没有封面，使用第一张图片
    const processedAlbums = albums.map(album => {
      if (!album.cover_url && album.album_photos?.[0]) {
        return { ...album, cover_url: album.album_photos[0].url };
      }
      return album;
    });

    return { data: processedAlbums as PhotoAlbum[], error, total: count || 0 };
  },

  async getJoinedPrivateAlbums(userId: string, page = 0, limit = 20) {
    const { data, error, count } = await supabase
      .from('album_joins')
      .select('*, photo_albums!inner(*, permission_groups!permission_group_id(*), album_photos!album_id(url))', { count: 'exact' })
      .eq('user_id', userId)
      .eq('photo_albums.is_public', false)
      .order('joined_at', { ascending: false })
      .order('sort_order', { foreignTable: 'photo_albums.album_photos', ascending: true })
      .limit(1, { foreignTable: 'photo_albums.album_photos' })
      .range(page * limit, (page + 1) * limit - 1);
    
    if (error && (error as any).code === 'PGRST103') {
      return { data: [], error: null, total: count || 0 };
    }
    
    const processedAlbums = (data || []).map(item => {
      const album = item.photo_albums as any;
      if (!album.cover_url && album.album_photos?.[0]) {
        album.cover_url = album.album_photos[0].url;
      }
      return album;
    }) as PhotoAlbum[];

    return { 
      data: processedAlbums, 
      error, 
      total: count || 0 
    };
  },

  async joinAlbum(userId: string, albumId: string) {
    return await supabase.from('album_joins').upsert({ user_id: userId, album_id: albumId }, { onConflict: 'user_id, album_id' });
  },

  async isAlbumJoined(userId: string, albumId: string) {
    const { data, error } = await supabase
      .from('album_joins')
      .select('id')
      .eq('user_id', userId)
      .eq('album_id', albumId)
      .maybeSingle();
    return !!data;
  },

  async getAllPhotoAlbumsAdmin(page = 0, limit = 20, search = '') {
    let query = supabase.from('photo_albums').select('*, permission_groups!permission_group_id(*), album_photos!album_id(url)', { count: 'exact' });
    if (search) query = query.ilike('title', `%${search}%`);
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .order('sort_order', { foreignTable: 'album_photos', ascending: true })
      .limit(1, { foreignTable: 'album_photos' })
      .range(page * limit, (page + 1) * limit - 1);
    
    if (error && (error as any).code === 'PGRST103') {
      return { data: [], error: null, total: count || 0 };
    }

    const albums = (data || []) as (PhotoAlbum & { album_photos: { url: string }[] })[];
    const processedAlbums = albums.map(album => {
      if (!album.cover_url && album.album_photos?.[0]) {
        return { ...album, cover_url: album.album_photos[0].url };
      }
      return album;
    });

    return { data: processedAlbums as PhotoAlbum[], error, total: count || 0 };
  },

  async getPhotoAlbum(id: string) {
    // 根据用户要求，列表接口完全禁止缓存，确保即时显示最新内容
    const { data, error } = await supabase.from('photo_albums').select('*, permission_groups!permission_group_id(*), album_photos!album_id(url)').eq('id', id).order('sort_order', { foreignTable: 'album_photos', ascending: true }).limit(1, { foreignTable: 'album_photos' }).maybeSingle();
    const album = data as any;
    if (album && !album.cover_url && album.album_photos?.[0]) {
      album.cover_url = album.album_photos[0].url;
    }
    return { data: album as PhotoAlbum | null, error };
  },

  async upsertPhotoAlbum(album: Partial<PhotoAlbum>) {
    // 移除关联字段，防止 Supabase 尝试更新不存在的列
    const { permission_groups, album_photos, id, ...dataToSave } = album as any;
    
    // 确保 boolean 字段有正确的值
    if (dataToSave.is_zonerama === undefined) dataToSave.is_zonerama = false;
    if (dataToSave.is_active === undefined) dataToSave.is_active = true;
    if (dataToSave.is_public === undefined) dataToSave.is_public = true;
    if (dataToSave.auto_pdf_enabled === undefined) dataToSave.auto_pdf_enabled = false;

    if (id && id !== '') {
      cache.invalidate(`photo_album_${id}`);
      return await supabase.from('photo_albums').update(dataToSave).eq('id', id).select().single();
    }
    return await supabase.from('photo_albums').insert([dataToSave]).select().single();
  },

  async batchUpsertPhotoAlbums(albums: Partial<PhotoAlbum>[]) {
    const dataToSave = albums.map(album => {
      const { permission_groups, album_photos, id, ...cleanData } = album as any;
      if (cleanData.is_zonerama === undefined) cleanData.is_zonerama = false;
      if (cleanData.is_active === undefined) cleanData.is_active = true;
      if (cleanData.is_public === undefined) cleanData.is_public = true;
      if (cleanData.auto_pdf_enabled === undefined) cleanData.auto_pdf_enabled = false;
      if (id && id !== '') cleanData.id = id;
      return cleanData;
    });
    
    // 如果有 ID 则执行 upsert，否则执行 insert
    const hasIds = dataToSave.some(item => !!item.id);
    if (hasIds) {
      return await supabase.from('photo_albums').upsert(dataToSave);
    }
    return await supabase.from('photo_albums').insert(dataToSave);
  },

  async deletePhotoAlbum(id: string) {
    cache.invalidate(`photo_album_${id}`);
    return await supabase.from('photo_albums').delete().eq('id', id);
  },
  // 图集访问权限管理
  async getAlbumAccessRequests(page = 0, limit = 20, status?: string) {
    let query = supabase.from('album_access_requests').select('*, profiles(*), photo_albums(*)', { count: 'exact' });
    if (status && status !== 'all') query = query.eq('status', status);
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
    return { data: (data || []) as any[], error, total: count || 0 };
  },

  async updateAlbumAccessRequest(id: string, updates: any) {
    // 先获取原状态，避免重复触发审批逻辑
    const { data: oldData } = await supabase.from('album_access_requests').select('status').eq('id', id).single();
    
    const { data, error } = await supabase.from('album_access_requests').update(updates).eq('id', id).select().single();
    
    // 如果状态为 approved，同步更新/覆盖到 album_user_permissions
    // 这里不再校验 oldData?.status !== 'approved'，以支持管理员直接修改已通过申请的授予等级
    if (!error && data && data.status === 'approved') {
      const { error: permError } = await this.updateAlbumUserPermission(data.user_id, data.album_id, data.approved_level || 'pt');
      if (permError) {
        console.error('Failed to sync album user permission:', permError);
      }
    }
    return { data, error };
  },

  async getAlbumViewingHistory(userId: string, albumId: string) {
    return await supabase.from('album_viewing_history').select('*').eq('user_id', userId).eq('album_id', albumId).maybeSingle();
  },

  async getAlbumPhotoLevelCounts(albumId: string) {
    return await supabase.rpc('get_album_photo_level_counts', { p_album_id: albumId });
  },

  async updateAlbumViewingHistory(userId: string, albumId: string, index: number, mode?: string) {
    return await supabase.from('album_viewing_history').upsert({
      user_id: userId,
      album_id: albumId,
      last_photo_index: index,
      last_mode: mode,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id, album_id' });
  },

  async recordMediaView(mediaId: string, userId?: string, browserFingerprint?: string) {
    if (!mediaId) return;
    
    // 我们使用 upsert 来避免重复记录冲突
    const data: any = {
      media_id: mediaId,
      visitor_fingerprint: browserFingerprint || null
    };
    
    if (userId) {
      data.user_id = userId;
      return await supabase.from('media_views').upsert(data, { 
        onConflict: 'user_id, media_id',
        ignoreDuplicates: true 
      });
    }
    
    // 匿名用户直接插入，不限制（因为没有 user_id 的唯一约束通常不包含 NULL）
    return await supabase.from('media_views').insert(data);
  },

  async getSeenMediaIds(userId?: string, browserFingerprint?: string) {
    if (!userId && !browserFingerprint) return { data: [] };
    
    let query = supabase.from('media_views').select('media_id');
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('visitor_fingerprint', browserFingerprint);
    }
    
    const { data, error } = await query;
    return { data: (data || []).map((v: any) => v.media_id), error };
  },


  async submitAlbumAccessRequest(userId: string, albumId: string, reason: string, attachmentUrl?: string) {
    const res = await supabase.from('album_access_requests').insert([{
      user_id: userId,
      album_id: albumId,
      reason,
      attachment_url: attachmentUrl,
      status: 'pending'
    }]);

    if (!res.error) {
      // 获取图集标题用于通知
      supabase.from('photo_albums').select('title').eq('id', albumId).maybeSingle().then(({ data: album }) => {
        // 调用 coreUserApi.sendEmail 发送通知
        import('./core_user_api').then(({ coreUserApi }) => {
          coreUserApi.sendEmail(
            '2314429716@qq.com',
            '【系统通知】收到新的图集权限申请',
            `管理员您好：\n\n系统收到一条新的图集访问权限申请。\n用户ID: ${userId}\n申请图集: ${album?.title || albumId}\n申请原因: ${reason}\n\n请尽快登录管理后台处理。`
          ).catch((err: any) => console.error('Failed to send album request email:', err));
        });
      });
    }
    return res;
  },

  async getAlbumUserPermissions(albumId?: string, userId?: string, page = 0, limit = 20) {
    let query = supabase.from('album_user_permissions').select('*, profiles!inner(*), photo_albums!inner(*)', { count: 'exact' });
    if (albumId) query = query.eq('album_id', albumId);
    if (userId) query = query.eq('user_id', userId);
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
    return { data: (data || []) as any[], error, total: count || 0 };
  },
  async getMyAlbumUserPermissions(userId: string) {
    const { data, error } = await supabase.from('album_user_permissions').select('*, photo_albums(*)').eq('user_id', userId);
    return { data: (data || []) as any[], error };
  },


  async getAlbumUserPermission(albumId: string, userId: string) {
    return await supabase.from('album_user_permissions').select('*').eq('album_id', albumId).eq('user_id', userId).maybeSingle();
  },

  async updateAlbumUserPermission(userId: string, albumId: string, level: string) {
    // 使用 UPSERT 且指定唯一约束字段
    return await supabase.from('album_user_permissions').upsert({
      user_id: userId,
      album_id: albumId,
      level,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,album_id' });
  },
  async addAlbumUserPermission(permission: { album_id: string, user_id: string, level: string }) {
    return await supabase.from('album_user_permissions').upsert({
      ...permission,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id, album_id' });
  },

  async batchAddAlbumUserPermissions(permissions: { album_id: string, user_id: string, level: string, updated_at: string }[]) {
    return await supabase.from('album_user_permissions').upsert(permissions, { onConflict: 'user_id, album_id' });
  },

  async generateCollectionToken(mediaIds: string[]) {
    const { data: { user } } = await supabase.auth.getUser();
    // 生成一个短口令
    const { data: token } = await supabase.rpc('generate_short_token');
    
    return await supabase.from('collection_tokens').insert({
      token: `COL-${token}`,
      media_ids: mediaIds,
      creator_id: user?.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7天有效
    }).select().single();
  },

  async importCollectionToken(token: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('请先登录') };

    const { data: tokenData, error: tokenError } = await supabase
      .from('collection_tokens')
      .select('*')
      .eq('token', token.trim().toUpperCase())
      .maybeSingle();

    if (tokenError || !tokenData) return { error: new Error('口令不存在或已失效') };
    
    // 检查是否过期
    if (tokenData.expires_at && new Date(tokenData.expires_at).getTime() < Date.now()) {
      return { error: new Error('该口令已过期') };
    }

    // 批量加入收藏，先去重并过滤空值
    const uniqueMediaIds = [...new Set(tokenData.media_ids.filter((id: any) => !!id))] as string[];
    const favorites = uniqueMediaIds.map((mediaId: string) => ({
      user_id: user.id,
      media_id: mediaId
    }));

    if (favorites.length === 0) return { data: [], error: null };

    return await supabase.from('favorites').upsert(favorites, { 
      onConflict: 'user_id, media_id',
      ignoreDuplicates: true 
    });
  },

  async addBatchToFavorites(mediaIds: string[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('请先登录') };

    // 先去重并过滤空值
    const uniqueMediaIds = [...new Set(mediaIds.filter(id => !!id))] as string[];
    const favorites = uniqueMediaIds.map((mediaId: string) => ({
      user_id: user.id,
      media_id: mediaId
    }));

    if (favorites.length === 0) return { data: [], error: null };

    return await supabase.from('favorites').upsert(favorites, { 
      onConflict: 'user_id, media_id',
      ignoreDuplicates: true 
    });
  },


  async deleteAlbumUserPermission(userId: string, albumId: string) {
    return await supabase.from('album_user_permissions').delete().eq('user_id', userId).eq('album_id', albumId);
  },

  async triggerDailyGalleryScheduler() {
    return await supabase.functions.invoke('daily-gallery-scheduler');
  },
  async importZoneramaAlbum(albumId: string | number) {
    return await supabase.functions.invoke('zonerama-album-import', {
      body: { albumId: albumId.toString() }
    });
  },



  async checkAlbumPhotoFileDuplicate(albumId: string, md5: string) {
    return await supabase.from('album_photos').select('id, url').eq('album_id', albumId).eq('file_md5', md5).limit(1).maybeSingle();
  },

  async checkAlbumPhotoVisualDuplicate(albumId: string, hash: string, threshold = 2) {
    return await supabase.rpc('check_album_photo_similar_with_url', { p_album_id: albumId, p_hash: hash, p_threshold: threshold });
  },

  async getAlbumPhotos(albumId: string, page = 0, limit = 100, level?: string, excludePending = false, allowedLevels?: string[]) {
    // 根据用户要求，列表接口完全禁止缓存，确保即时显示最新内容
    let query = supabase.from('album_photos').select('*', { count: 'exact' }).eq('album_id', albumId).order('sort_order', { ascending: true });
    
    if (level && level !== 'all') {
      query = query.eq('level', level);
    } else if (allowedLevels && allowedLevels.length > 0) {
      query = query.in('level', allowedLevels);
    } else if (excludePending) {
      query = query.neq('level', 'pending');
    }
    
    if (page !== undefined && limit !== undefined) {
      query = query.range(page * limit, (page + 1) * limit - 1);
    }
    
    const { data, error, count } = await query;
    if (error && (error as any).code === 'PGRST103') {
      return { data: [], error: null, total: count || 0 };
    }
    return { data: (data || []) as AlbumPhoto[], error, total: count || 0 };
  },

  async upsertAlbumPhoto(photo: Partial<AlbumPhoto>) {
    if (photo.album_id) cache.invalidate(`album_photos_${photo.album_id}`);
    const { id, ...cleanPhoto } = photo;
    if (id && id !== '') {
      return await supabase.from('album_photos').update(cleanPhoto).eq('id', id).select().single();
    }
    return await supabase.from('album_photos').insert([cleanPhoto]).select().single();
  },

  async batchUpsertAlbumPhotos(photos: Partial<AlbumPhoto>[]) {
    if (photos.length > 0 && photos[0].album_id) {
      cache.invalidate(`album_photos_${photos[0].album_id}`);
    }
    return await supabase.from('album_photos').upsert(photos, { onConflict: 'album_id, url' });
  },

  async deleteAlbumPhoto(id: string, albumId?: string) {
    if (albumId) cache.invalidate(`album_photos_${albumId}`);
    return await supabase.from('album_photos').delete().eq('id', id);
  },

  async getAlbumCustomFields() {
    // 根据用户要求，列表接口完全禁止缓存，确保即时显示最新内容
    const { data, error } = await supabase.from('album_custom_fields').select('*').order('created_at', { ascending: true });
    return { data: (data || []) as AlbumCustomField[], error };
  },

  async upsertAlbumCustomField(field: Partial<AlbumCustomField>) {
    cache.invalidate('album_custom_fields');
    const { id, ...cleanField } = field;
    if (id && id !== '') {
      return await supabase.from('album_custom_fields').update(cleanField).eq('id', id).select().single();
    }
    return await supabase.from('album_custom_fields').insert([cleanField]).select().single();
  },

  async deleteAlbumCustomField(id: string) {
    return await supabase.from('album_custom_fields').delete().eq('id', id);
  },

  async getAlbumFieldGroups() {
    const { data, error } = await supabase.from('album_custom_field_groups').select('*').order('created_at', { ascending: false });
    return { data: (data || []) as AlbumFieldGroup[], error };
  },

  async upsertAlbumFieldGroup(group: Partial<AlbumFieldGroup>) {
    // 移除空 ID 以免触发 UUID 格式错误
    const { id, ...cleanGroup } = group as any;
    const dataToSave = (id && id !== '') ? { id, ...cleanGroup } : cleanGroup;
    return await supabase.from('album_custom_field_groups').upsert(dataToSave).select().single();
  },

  async deleteAlbumFieldGroup(id: string) {
    return await supabase.from('album_custom_field_groups').delete().eq('id', id);
  },


  async logAlbumPhotoLevelChange(log: Partial<AlbumPhotoLevelLog>) {
    return await supabase.from('album_photo_level_logs').insert([log]);
  },


  async getTopMedia(limit = 10) {
    return await supabase.from('media_items').select('*, profiles!user_id(*)').eq('status', 'approved').is('deleted_at', null).order('favorite_count', { ascending: false }).limit(limit);
  },


  async getTopDislikedMedia(limit = 10) {
    return await supabase.rpc('get_top_disliked_media', { p_limit: limit });
  },

  async getTags() {
    const cacheKey = 'tag_cloud_global';
    const { data: profile } = await this.getCurrentProfile();
    const isAdmin = (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) || profile?.role === 'admin';

    // 后台管理页面禁用缓存,确保 CRUD 实时生效
    if (!isAdmin) {
      const cached = cache.get<Tag[]>(cacheKey, 1800000, 'tag_cloud'); // 30分钟
      if (cached) return { data: cached, error: null };
    }

    let { data, error } = await supabase.from('tags').select('*').order('weight', { ascending: false }).order('name', { ascending: true });
    
    if (!isAdmin && data) {
      const userRole = profile?.album_level || 'pt';
      const roleWeights: Record<string, number> = { 'pt': 0, 'vip': 1, 'svip': 2, 'vvip': 3 };
      const userWeight = roleWeights[userRole] || 0;

      data = (data as any[]).filter(tag => {
        if (tag.is_visible === false) return false;
        const tagMinRole = tag.min_role || 'pt';
        const tagWeight = roleWeights[tagMinRole] || 0;
        return userWeight >= tagWeight;
      });
    }

    if (data && !error && !isAdmin) {
      cache.set(cacheKey, data);
    }
    
    return { data: (data || []) as Tag[], error };
  },

  async createTag(data: { name: string; parent_id?: string | null; level?: number; weight?: number; is_visible?: boolean; min_role?: string }) {
    cache.invalidate('tag_cloud_global');
    cache.invalidate('tag_cloud_data');
    return await supabase.from('tags').insert(data).select().single();
  },

  async updateTag(id: string, data: Partial<{ name: string; parent_id?: string | null; level?: number; weight?: number; is_visible?: boolean; min_role?: string }>) {
    cache.invalidate('tag_cloud_global');
    cache.invalidate('tag_cloud_data');
    return await supabase.from('tags').update(data).eq('id', id).select().single();
  },

  // 宣传页 DIY
  async deleteTag(id: string) {
    cache.invalidate('tag_cloud_global');
    cache.invalidate('tag_cloud_data');
    return await supabase.from('tags').delete().eq('id', id);
  },

  async archiveAllApprovedMedia() {
    return await supabase.rpc('archive_all_approved_media');
  },

  async submitDailyGalleryImage(userId: string | null, imageUrl: string, metadata: any = {}, openid?: string | null, nickname?: string | null) {
    return await supabase.from('daily_gallery_submissions').insert([{
      user_id: userId,
      image_url: imageUrl,
      status: 'pending',
      metadata,
      openid: openid || null,
      nickname: nickname || null
    }]);
  },

  async getDailyGallerySubmissions(page = 0, limit = 20, status?: string) {
    let query = supabase.from('daily_gallery_submissions').select('*, profiles!user_id(*)', { count: 'exact' });
    if (status && status !== 'all') query = query.eq('status', status);
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    return { data: (data || []) as any[], error, total: count || 0 };
  },

  async updateDailyGallerySubmission(id: string, updates: any) {
    return await supabase.from('daily_gallery_submissions').update(updates).eq('id', id).select().single();
  },

  async getMyDailyGallerySubmissions(userId: string) {
    const { data, error } = await supabase
      .from('daily_gallery_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: (data || []) as any[], error };
  },


  async getContentCategories() {
    const cacheKey = 'categories_all';
    const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

    const fetcher = async () => {
      const { data, error } = await supabase.from('content_categories').select('*').order('sort_order', { ascending: true });
      let processedData = (data || []) as ContentCategory[];

      if (!isAdmin && processedData.length > 0) {
        const { data: profile } = await this.getCurrentProfile();
        const userRole = profile?.album_level || 'pt';
        const roleWeights: Record<string, number> = { 'pt': 0, 'vip': 1, 'svip': 2, 'vvip': 3 };
        const userWeight = roleWeights[userRole] || 0;

        processedData = processedData.filter(cat => {
          if (cat.is_visible === false) return false;
          const catMinRole = cat.min_role || 'pt';
          const catWeight = roleWeights[catMinRole] || 0;
          return userWeight >= catWeight;
        });
      }
      return { data: processedData, error };
    };

    // 管理员页面或后台路径不使用缓存
    if (isAdmin) return await fetcher();

    // 分类信息持久化缓存 1 小时 (模拟 SDK 行为)
    return await cache.getOrFetch(cacheKey, fetcher, 3600000, 'categories', true);
  },

  async createContentCategory(category: any) {
    const res = await supabase.from('content_categories').insert([category]).select().single();
    if (!res.error) {
      cache.invalidate('categories_all');
      cache.invalidate('category_cloud_data');
    }
    return res;
  },

  async updateContentCategory(id: string, updates: any) {
    const res = await supabase.from('content_categories').update(updates).eq('id', id).select().single();
    if (!res.error) {
      cache.invalidate('categories_all');
      cache.invalidate('category_cloud_data');
    }
    return res;
  },

  async deleteContentCategory(id: string) {
    const res = await supabase.from('content_categories').delete().eq('id', id);
    if (!res.error) {
      cache.invalidate('categories_all');
      cache.invalidate('category_cloud_data');
    }
    return res;
  },

  // 基础配置
  async getStorageConfig() {
    let { data, error } = await supabase.from('storage_configs').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    
    if (error && (error as any).status === 401) {
      console.warn('[Storage] Detect 401, trying clean fetch...');
      await supabase.auth.signOut();
      const { data: retryData, error: retryError } = await supabase.from('storage_configs').select('*').maybeSingle();
      data = retryData;
      error = retryError;
    }
    return { data, error };
  },

  async updateStorageConfig(updates: any) {
    const { data, error } = await supabase.from('storage_configs').update(updates).eq('id', updates.id).select().single();
    if (data && !error) {
      cache.set('storage_config', data as any);
    }
    return { data: data as StorageConfig | null, error };
  },

  async upsertStorageConfig(updates: any) {
    // 如果包含验证状态更新，同步至 Supabase Auth
    if (updates.email_verification !== undefined || updates.phone_verification !== undefined) {
      // 异步调用，不阻塞配置保存
      supabase.functions.invoke('admin-auth-action', {
        body: { 
          action: 'update_verification_settings', 
          email: updates.email_verification,
          phone: updates.phone_verification 
        }
      }).catch(e => console.warn('[upsertStorageConfig] Auth action failed:', e));
    }

    const { data: existing } = await this.getStorageConfig();
    const { id, updated_at, ...cleanUpdates } = updates as any;
    
    // 确保合并现有配置，防止部分更新导致其他字段丢失
    const finalData = { 
      ...(existing || {}),
      ...cleanUpdates, 
      id: existing?.id 
    };
    
    const result = await supabase.from('storage_configs').upsert(finalData).select().single();

    if (result.data && !result.error) {
      cache.set('storage_config', result.data as any);
    }
    return { data: result.data as StorageConfig | null, error: result.error };
  },

  // 收藏与不喜欢
  async getFavorites(userId: string) {
    const { data, error } = await supabase.from('favorites').select('media_items(*)').eq('user_id', userId);
    const favorites = data?.map(f => Array.isArray(f.media_items) ? f.media_items[0] : f.media_items).filter(Boolean) || [];
    return { data: favorites as MediaItem[], error };
  },

  async toggleFavorite(userId: string, mediaId: string) {
    // 切换到 RPC 逻辑，统一处理 Toggle 与奖励，并规避 columns 引号问题
    const { data, error } = await supabase.rpc('toggle_favorite', { p_user_id: userId, p_media_id: mediaId });
    if (!error && data?.action === 'added') {
      this.awardUserReward(userId, 'favorite', 'favorite_' + mediaId).catch(console.error);
    }
    return { data, error };
  },

  async toggleDislike(userId: string, mediaId: string) {
    // 切换到 RPC 逻辑
    return await supabase.rpc('toggle_dislike', { p_user_id: userId, p_media_id: mediaId });
  },

  // 用户个人权限点配置 (覆盖或补充权限组)
  async generateAlbumPdf(albumId: string, level?: string) {
    return await supabase.functions.invoke('generate-album-pdf', { body: { albumId, level } });
  },

  async getDedupeStats() {
    const { data, error } = await supabase.rpc('get_dedupe_stats');
    return { data, error };
  },

  async batchUpdateMediaHashes(updates: any[]) {
    const { data, error } = await supabase.rpc('batch_update_media_hashes', { p_updates: updates });
    return { data, error };
  },

  async logDedupeScan(type: string, processed: number, duplicates: number, duration: number, config: any = {}) {
    return await supabase.rpc('log_dedupe_scan', {
      p_scan_type: type,
      p_processed_count: processed,
      p_duplicate_count: duplicates,
      p_duration_ms: duration,
      p_config: config
    });
  },

  /** 域名配置管理 (Multi-domain management) */
  async getDailyGalleryAvailableImages(limit = 50, offset = 0, search = '', status = 'unused') {
    const { data, error } = await supabase.rpc('get_daily_gallery_available_images_rpc', {
      p_limit: limit,
      p_offset: offset,
      p_search: search || null,
      p_status: status
    });
    
    return { 
      data: data || [], 
      total: data?.[0]?.total_count || 0, 
      error 
    };
  },

  async autoRefillPendingMaterials() {
    return await supabase.rpc('auto_refill_pending_daily_gallery_materials');
  },

  async releaseOrphanedMaterials() {
    return await supabase.rpc('release_orphaned_daily_gallery_images');
  },

  // ==================== 公告管理 ====================
  async updateMediaDailyGalleryStatus(ids: string[], status: 'unused' | 'pending' | 'used') {
    return await supabase.from('media_items').update({ daily_gallery_status: status }).in('id', ids);
  },

  async batchExcludeFromDailyGallery(ids: string[], exclude: boolean) {
    return await supabase.from('media_items').update({ exclude_from_daily_gallery: exclude }).in('id', ids);
  },

  async getDailyGalleryUsedImages(limit = 50, offset = 0, search = '', startDate?: string, endDate?: string) {
    // 始终使用 RPC 以确保正确关联到已发布的 post_date，且不受当前排除策略影响
    const { data, error } = await supabase.rpc('get_used_daily_gallery_images', {
      p_limit: limit,
      p_offset: offset,
      p_search: search || null,
      p_start_date: startDate || null,
      p_end_date: endDate || null
    });
    
    let total = 0;
    if (data && data.length > 0) {
      total = data[0].total_count;
    }
    
    return { data: data || [], total, error };
  },

  async toggleExcludeFromDailyGallery(mediaId: string, exclude: boolean) {
    const { data, error } = await supabase
      .from('media_items')
      .update({ exclude_from_daily_gallery: exclude })
      .eq('id', mediaId)
      .select()
      .single();
    return { data, error };
  },

  /** 每日发布管理 */
  async getDailyGalleryPosts(page = 0, limit = 30, startDate?: string, endDate?: string) {
    let query = supabase
      .from('daily_gallery_posts')
      .select('*', { count: 'exact' });
    
    if (startDate) query = query.gte('post_date', startDate);
    if (endDate) query = query.lte('post_date', endDate);
    
    const { data, error, count } = await query
      .order('post_date', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
      
    return { data: data || [], error, total: count || 0 };
  },

  async getDailyGalleryPostByDate(date: string) {
    const { data, error } = await supabase
      .from('daily_gallery_posts')
      .select('*')
      .eq('post_date', date)
      .maybeSingle();
    return { data, error };
  },

  async createDailyGalleryPost(post: {
    post_date: string;
    password: string;
    password_expires_at: string;
    image_ids: string[];
    is_published?: boolean;
  }) {
    const { data, error } = await supabase
      .from('daily_gallery_posts')
      .insert([{ ...post, published_at: post.is_published ? new Date().toISOString() : null }])
      .select()
      .single();
    
    if (!error && data) {
      // 标记图片为已使用
      await supabase.rpc('mark_images_as_used', {
        image_ids: post.image_ids,
        post_id: data.id
      });
    }
    
    return { data, error };
  },

  async updateDailyGalleryPost(id: string, updates: Partial<{
    password: string;
    password_expires_at: string;
    image_ids: string[];
    is_published: boolean;
  }>) {
    const processedUpdates: any = { ...updates };
    if (updates.is_published !== undefined) {
      processedUpdates.published_at = updates.is_published ? new Date().toISOString() : null;
    }
    
    // 获取更新前的记录，用于比较 image_ids
    const { data: oldPost } = await supabase
      .from('daily_gallery_posts')
      .select('image_ids')
      .eq('id', id)
      .maybeSingle();

    const { data, error } = await supabase
      .from('daily_gallery_posts')
      .update(processedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data && updates.image_ids) {
      const oldIds = oldPost?.image_ids || [];
      const newIds = updates.image_ids;
      
      const removedIds = oldIds.filter((id: string) => !newIds.includes(id));
      const addedIds = newIds.filter((id: string) => !oldIds.includes(id));
      
      if (removedIds.length > 0) {
        // 撤销选入的图片回归"待使用"，并清除日期
        await supabase.from('media_items').update({ 
          daily_gallery_status: 'unused',
          daily_gallery_date: null 
        }).in('id', removedIds);
      }
      if (addedIds.length > 0) {
        await supabase.rpc('mark_images_as_used', {
          image_ids: addedIds,
          post_id: id
        });
      }
    }

    return { data, error };
  },

  async deleteDailyGalleryPost(id: string) {
    const { data: post } = await supabase
      .from('daily_gallery_posts')
      .select('image_ids')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase
      .from('daily_gallery_posts')
      .delete()
      .eq('id', id);

    if (!error && post && post.image_ids && post.image_ids.length > 0) {
      // 记录删除后图片回归“待使用”库，并清除日期
      await supabase.from('media_items').update({ 
        daily_gallery_status: 'unused',
        daily_gallery_date: null
      }).in('id', post.image_ids);
    }

    return { error };
  },

  async getRandomUnusedImages(count: number) {
    const { data, error } = await supabase.rpc('get_random_unused_images', { count });
    return { data: data || [], error };
  },

  async verifyDailyGalleryPassword(postDate: string, password: string) {
    const { data, error } = await supabase.rpc('verify_daily_gallery_password', {
      p_post_date: postDate,
      p_password: password
    });
    return { data: data?.[0] || null, error };
  },

  async logDailyGalleryAccess(params: {
    post_id: string;
    user_openid?: string | null;
    user_id?: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
    password_used?: string | null;
    browser_fingerprint?: string | null;
    access_type?: string | null;
  }) {
    const { data, error } = await supabase.rpc('log_daily_gallery_access', {
      p_post_id: params.post_id,
      p_user_openid: params.user_openid || null,
      p_user_id: params.user_id || null,
      p_ip_address: params.ip_address || null,
      p_user_agent: params.user_agent || null,
      p_password_used: params.password_used || null,
      p_browser_fingerprint: params.browser_fingerprint || null,
      p_access_type: params.access_type || 'view'
    });
    return { data, error };
  },

  async getDailyGalleryStats(startDate?: string, endDate?: string) {
    const { data, error } = await supabase.rpc('get_daily_gallery_stats', {
      p_start_date: startDate || null,
      p_end_date: endDate || null
    });
    return { data: data || [], error };
  },

  async getDailyGalleryAccessLogs(postId: string, page = 0, limit = 50) {
    const { data, error, count } = await supabase
      .from('daily_gallery_access_logs_view')
      .select('*', { count: 'exact' })
      .eq('post_id', postId)
      .order('accessed_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    return { data: data || [], error, total: count || 0 };
  },

  async syncDailyGalleryUserHistory(userId: string, openid: string) {
    const { data, error } = await supabase.rpc('sync_daily_gallery_user_history', {
      p_user_id: userId,
      p_openid: openid
    });
    return { data, error };
  },

  async getDailyGalleryUserReadHistory(params: {
    user_id?: string;
    openid?: string;
    browser_fingerprint?: string;
  }) {
    let query = supabase
      .from('user_daily_read_history')
      .select('publish_date, accessed_at');
    
    const identifiers: string[] = [];
    if (params.user_id) identifiers.push(params.user_id);
    if (params.openid) identifiers.push(params.openid);
    if (params.browser_fingerprint) identifiers.push(params.browser_fingerprint);
    
    if (identifiers.length === 0) return { data: [], error: null };
    
    query = query.in('user_identifier', identifiers);
    
    const { data, error } = await query.order('accessed_at', { ascending: false });
    return { data: data || [], error };
  },


  async getDailyGalleryConfig() {
    return await this.getSystemConfig('daily_gallery_config');
  },

  async getDailyGalleryPublishedDates() {
    const { data, error } = await supabase
      .from('daily_gallery_posts')
      .select('post_date')
      .eq('is_published', true)
      .order('post_date', { ascending: false });
    return { data: (data || []).map((d: any) => d.post_date) as string[], error };
  },

  async updateDailyGalleryConfig(config: {
    daily_count?: number;
    auto_publish?: boolean;
    publish_time?: string;
    password_duration?: number;
    password_keyword?: string;
    universal_password?: string;
    enable_password?: boolean;
    enable_wechat_password?: boolean;
    enable_miniprogram_ad?: boolean;
    restrict_to_wechat?: boolean;
    enable_incentive?: boolean;
    incentive_button_text?: string;
    incentive_qr_url?: string;
    ad_unlock_mode?: string;
    excluded_categories?: string[];
    excluded_tags?: string[];
    trigger_token?: string;
    rb_trigger_probability?: number;
  }) {
    const { data: current } = await this.getDailyGalleryConfig();
    const newConfig = { ...(current?.value || {}), ...config };
    return await this.updateSystemConfig('daily_gallery_config', newConfig);
  },

  async clearAllDailyGalleryUserPasswords(postDate: string) {
    const { data, error } = await supabase
      .from('daily_gallery_user_passwords')
      .delete()
      .eq('post_date', postDate);
    return { data, error };
  },

  async getDailyGallerySpecialPasswords(page = 0, limit = 50, filters?: {
    openid?: string;
    source?: string;
    status?: string;
    target_date?: string;
    type?: string;
  }) {
    let query = supabase
      .from('daily_gallery_special_passwords')
      .select('*', { count: 'exact' });

    // 按 openid 搜索（creator_id 字段）
    if (filters?.openid) {
      query = query.ilike('creator_id', `%${filters.openid}%`);
    }

    // 按生成方式筛选
    if (filters?.source && filters.source !== 'all') {
      query = query.eq('source', filters.source);
    }

    // 按类型筛选
    if (filters?.type && filters.type !== 'all') {
      query = query.eq('password_type', filters.type);
    }

    // 按状态筛选
    if (filters?.status && filters.status !== 'all') {
      const now = new Date().toISOString();
      if (filters.status === 'active') {
        // 未过期 且 (定期/长期密码 且 额度未满) 或 (一次性/多次密码 且 未用完)
        query = query.or(`expires_at.is.null,expires_at.gt.${now}`)
          .or(`password_type.in.("periodic_single_user","periodic_multi_user","long_term"),used_count.lt.max_usages,is_used.eq.false`);
      } else if (filters.status === 'used') {
        query = query.or(`is_used.eq.true,used_count.gte.max_usages`);
      } else if (filters.status === 'expired') {
        query = query.lt('expires_at', now);
      }
    }

    // 按目标日期筛选
    if (filters?.target_date) {
      query = query.eq('target_date', filters.target_date);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    
    return { data: data || [], error, total: count || 0 };
  },

  async createDailyGallerySpecialPassword(params: {
    password: string;
    target_date?: string | null;
    is_one_time?: boolean;
    expires_at?: string | null;
    max_usages?: number;
    password_type?: string;
    browser_id?: string;
    per_user_max_total?: number;
    per_user_max_daily?: number;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    return await supabase
      .from('daily_gallery_special_passwords')
      .insert([{
        ...params,
        created_by: user?.id,
        source: 'backend',
        creator_id: user?.id || 'unknown_admin'
      }])
      .select()
      .single();
  },

  async deleteDailyGallerySpecialPassword(id: string) {
    return await supabase
      .from('daily_gallery_special_passwords')
      .delete()
      .eq('id', id);
  },

  async clearDailyGalleryUserResets(creatorId: string) {
    return await supabase
      .from('daily_gallery_special_passwords')
      .update({ reset_count: 0 })
      .eq('creator_id', creatorId);
  },


};
