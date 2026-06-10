import { supabase } from './supabase';
import { cache } from '@/lib/cache';
import { getBeijingDate } from '@/lib/utils';
import type { MediaItem, Profile, StorageConfig, ItemStatus, UserRole, AppNotification, UserFieldConfig, CheckIn, PointsLog, Report, ReportStatus, Ad, RedemptionCode, RedemptionLog, Tag, MediaTag, ContentCategory, PermissionGroup, AuditConfig, DedupeConfig, SystemConfig, PhotoAlbum, AlbumPhoto, AlbumCustomField, AlbumFieldGroup, AlbumPhotoLevelLog, KeywordReplacement, Shortcode, SuperbedConfig, DebugLogSetting, DebugLog } from '@/types';

export const mediaContentApi: any = {
  async getApprovedMedia(page = 0, limit = 10, userId?: string, type: string = 'all', categoryId: string = 'all', sortBy: 'latest' | 'popular' | 'random' = 'latest', tagIds?: string[], force = false) {
    // 列表接口缓存策略：
    // 如果不是强制刷新且是第一页，使用 5 秒短时缓存去重并发请求
    const cacheKey = `media_list_${userId || 'anon'}_${type}_${categoryId}_${sortBy}_${JSON.stringify(tagIds || [])}_p${page}`;
    
    const fetcher = async () => {
      // 使用优化后的 RPC 函数，在 SQL 层面处理排序、过滤、排除逻辑
      const { data, error } = await supabase.rpc('get_optimized_media_items_v3', {
        p_user_id: userId || null,
        p_type: type,
        p_category_id: categoryId,
        p_tag_ids: tagIds || null,
        p_sort_by: sortBy,
        p_limit: limit,
        p_offset: page * limit
      });

      if (error) {
        console.error('get_optimized_media_items_v3 error:', error);
        return { data: [], error, total: 0 };
      }

      // 转换返回的数据结构以保持与 MediaItem 类型兼容
      const items = (data || []).map((item: any) => ({
        ...item,
        profiles: item.username ? { username: item.username, avatar_url: item.avatar_url } : null,
        content_categories: item.content_categories,
        media_tags: item.media_tags
      })) as MediaItem[];

      const total = items.length > 0 ? Number((items[0] as any).total_count) : 0;
      
      return { data: items, error: null, total };
    };

    if (force) {
      return await fetcher();
    }

    // 第一页使用 5 秒短时缓存并持久化到本地 (模拟 SDK 行为，加速启动体验)
    // 后续页仅用于并发去重
    const ttl = page === 0 ? 300000 : 5000; // 第一页缓存 5 分钟，后续 5 秒
    return await cache.getOrFetch(cacheKey, fetcher, ttl, 'media_list', page === 0);
  },

  async getTimelineDates(userId?: string, type: string = 'all', categoryId: string = 'all', tagIds?: string[]) {
    const { data, error } = await supabase.rpc('get_timeline_dates', {
      p_user_id: userId || null,
      p_type: type,
      p_category_id: categoryId,
      p_tag_ids: tagIds && tagIds.length > 0 ? tagIds : null
    });
    return { data: (data || []) as Array<{ date: string; count: number }>, error };
  },

  async getUserMedia(userId: string, page = 0, limit = 20) {
    const { data, error, count } = await supabase.from('media_items').select('*, media_tags(tags(*))', { count: 'exact' }).eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
    return { data: (data || []) as MediaItem[], error, total: count || 0 };
  },

  async getPendingMedia(page = 0, limit = 20) {
    const { data, error, count } = await supabase.from('media_items').select('*, profiles!user_id(*), media_tags(tags(*))', { count: 'exact' }).eq('status', 'pending').is('deleted_at', null).order('created_at', { ascending: true }).range(page * limit, (page + 1) * limit - 1);
    return { data: (data || []) as MediaItem[], error, total: count || 0 };
  },

  async getArchivedMedia(page = 0, limit = 20) {
    const { data, error, count } = await supabase.from('media_items').select('*, profiles!user_id(*), media_tags(tags(*))', { count: 'exact' }).eq('status', 'archived').is('deleted_at', null).order('created_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
    return { data: (data || []) as MediaItem[], error, total: count || 0 };
  },

  async getDeletedMedia(page = 0, limit = 20) {
    const { data, error, count } = await supabase.from('media_items').select('*, profiles!user_id(*), media_tags(tags(*))', { count: 'exact' }).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
    return { data: (data || []) as MediaItem[], error, total: count || 0 };
  },

  async purgeAllDeletedMedia() {
    return await supabase.rpc('purge_all_deleted_media');
  },

  async batchHardDeleteMedia(ids: string[]) {
    return await supabase.rpc('batch_hard_delete_media', { p_ids: ids });
  },

  async batchRestoreMedia(ids: string[]) {
    return await supabase.rpc('batch_restore_media', { p_ids: ids });
  },

  async batchSoftDeleteMedia(ids: string[]) {
    return await supabase.rpc('batch_soft_delete_media', { p_ids: ids });
  },

  async uploadMedia(item: Partial<MediaItem> & { user_id: string; url: string; type: 'image' | 'video' }) {
    const processedItem = { ...item };
    if (processedItem.title) {
      processedItem.title = await this.applyUserContentReplacements(processedItem.title);
    }

    const { data: profile } = await this.getProfile(processedItem.user_id);
    const requiresAuditByGroup = profile?.permission_groups?.requires_audit ?? true;
    const { data: configData } = await this.getSystemConfig('audit_config');
    const auditConfig = (configData?.value || { global_audit_enabled: true, bypass_audit_with_permission: true }) as AuditConfig;
    
    let initialStatus: ItemStatus = 'pending';
    if (profile?.role === 'admin') initialStatus = 'approved';
    else if (!auditConfig.global_audit_enabled) initialStatus = 'approved';
    else if (auditConfig.bypass_audit_with_permission && !requiresAuditByGroup) initialStatus = 'approved';

    // 处理标签
    let tagsToInsert: string[] = [];
    if ((processedItem as any).tags && Array.isArray((processedItem as any).tags)) {
      tagsToInsert = [...(processedItem as any).tags];
      // 不再删除 tags，因为现在 media_items 表有了 tags 字段
      // delete (processedItem as any).tags;
    }

    const itemToInsert = {
      ...processedItem,
      category_id: (processedItem as any).category_id || null,
      tags: (processedItem as any).tags || [],
      status: initialStatus
    };

    const { data, error } = await supabase.from('media_items').insert([itemToInsert]).select().single();
    if (!error && data) {
      // 插入标签关联
      if (tagsToInsert.length > 0) {
        for (const tagName of tagsToInsert) {
          const { data: tagData } = await supabase.from('tags').select('id').eq('name', tagName).maybeSingle();
          let tagId;
          if (tagData) {
            tagId = tagData.id;
          } else {
            const { data: newTag } = await supabase.from('tags').insert([{ name: tagName }]).select('id').single();
            tagId = newTag?.id;
          }
          if (tagId) {
            await supabase.from('media_tags').insert([{ media_id: data.id, tag_id: tagId }]);
          }
        }
      }

      if (initialStatus === 'approved') {
        this.awardUserReward(processedItem.user_id, processedItem.type === 'video' ? 'video_publish' : 'image_publish', `post_${processedItem.id}`).catch(console.error);
      }
      const { data: dConfig } = await this.getSystemConfig('dedupe_config');
      if (dConfig?.value?.trigger_mode === 'on_upload' && data.type === 'image') this.scanImageContentHashes(1, [data.id]).catch(console.error);
    }
    return { data: data as MediaItem | null, error };
  },

  // 批量上传媒体（优化版本，减少数据库往返次数）
  async batchUploadMedia(items: Array<Partial<MediaItem> & { user_id: string; url: string; type: 'image' | 'video' }>) {
    if (items.length === 0) return { data: [], error: null };

    try {
      // 1. 获取用户权限和审核配置（只查询一次）
      const userId = items[0].user_id;
      const { data: profile } = await this.getProfile(userId);
      const requiresAuditByGroup = profile?.permission_groups?.requires_audit ?? true;
      const { data: configData } = await this.getSystemConfig('audit_config');
      const auditConfig = (configData?.value || { global_audit_enabled: true, bypass_audit_with_permission: true }) as AuditConfig;
      
      let initialStatus: ItemStatus = 'pending';
      if (profile?.role === 'admin') initialStatus = 'approved';
      else if (!auditConfig.global_audit_enabled) initialStatus = 'approved';
      else if (auditConfig.bypass_audit_with_permission && !requiresAuditByGroup) initialStatus = 'approved';

      // 2. 处理所有项目的标题替换
      const processedItems = await Promise.all(
        items.map(async (item) => {
          const processed = { ...item };
          if (processed.title) {
            processed.title = await this.applyUserContentReplacements(processed.title);
          }
          return processed;
        })
      );

      // 3. 收集所有标签
      const allTags = new Set<string>();
      processedItems.forEach(item => {
        if ((item as any).tags && Array.isArray((item as any).tags)) {
          (item as any).tags.forEach((tag: string) => allTags.add(tag));
        }
      });

      // 4. 批量获取或创建标签
      const tagMap = new Map<string, string>(); // tagName -> tagId
      if (allTags.size > 0) {
        const { data: existingTags } = await supabase
          .from('tags')
          .select('id, name')
          .in('name', Array.from(allTags));
        
        existingTags?.forEach(tag => tagMap.set(tag.name, tag.id));

        // 创建不存在的标签
        const newTagNames = Array.from(allTags).filter(name => !tagMap.has(name));
        if (newTagNames.length > 0) {
          const { data: newTags } = await supabase
            .from('tags')
            .insert(newTagNames.map(name => ({ name })))
            .select('id, name');
          newTags?.forEach(tag => tagMap.set(tag.name, tag.id));
        }
      }

      // 5. 批量插入媒体项
      const mediaToInsert = processedItems.map(item => ({
        ...item,
        category_id: (item as any).category_id || null,
        tags: (item as any).tags || [],
        status: initialStatus
      }));

      const { data: insertedMedia, error: insertError } = await supabase
        .from('media_items')
        .insert(mediaToInsert)
        .select();

      if (insertError) throw insertError;
      if (!insertedMedia) return { data: [], error: new Error('插入失败') };

      // 6. 批量插入标签关联
      const mediaTagsToInsert: Array<{ media_id: string; tag_id: string }> = [];
      insertedMedia.forEach((media, index) => {
        const tags = (processedItems[index] as any).tags;
        if (tags && Array.isArray(tags)) {
          tags.forEach((tagName: string) => {
            const tagId = tagMap.get(tagName);
            if (tagId) {
              mediaTagsToInsert.push({ media_id: media.id, tag_id: tagId });
            }
          });
        }
      });

      if (mediaTagsToInsert.length > 0) {
        await supabase.from('media_tags').insert(mediaTagsToInsert);
      }

      // 7. 异步处理奖励和去重（不阻塞返回）
      if (initialStatus === 'approved') {
        insertedMedia.forEach(media => {
          this.awardUserReward(
            media.user_id,
            media.type === 'video' ? 'video_publish' : 'image_publish',
            `post_${media.id}`
          ).catch(console.error);
        });
      }

      const { data: dConfig } = await this.getSystemConfig('dedupe_config');
      if (dConfig?.value?.trigger_mode === 'on_upload') {
        const imageIds = insertedMedia.filter(m => m.type === 'image').map(m => m.id);
        if (imageIds.length > 0) {
          this.scanImageContentHashes(1, imageIds).catch(console.error);
        }
      }

      return { data: insertedMedia as MediaItem[], error: null };
    } catch (error: any) {
      console.error('批量上传失败:', error);
      return { data: [], error };
    }
  },

  async getMediaItem(id: string) {
    return await supabase
      .from('media_items')
      .select('*, profiles!user_id(username), media_tags(tags(name))')
      .eq('id', id)
      .maybeSingle();
  },

  async updateMediaItem(id: string, updates: Partial<MediaItem>) {
    const processedUpdates = { ...updates };
    if (processedUpdates.title) {
      processedUpdates.title = await this.applyUserContentReplacements(processedUpdates.title as string);
    }

    // 1. 更新 media_items 表
    const { data: updatedItem, error: updateError } = await supabase
      .from('media_items')
      .update(processedUpdates)
      .eq('id', id)
      .select('*, profiles!user_id(username), media_tags(tags(name))')
      .maybeSingle();

    if (updateError) return { data: null, error: updateError };

    // 2. 如果提供了 tags，同步 media_tags 关联表
    if (updates.tags && Array.isArray(updates.tags)) {
      try {
        await supabase.from('media_tags').delete().eq('media_id', id);
        if (updates.tags.length > 0) {
          const tagNames = Array.from(new Set(updates.tags.map(t => t.trim()).filter(Boolean)));
          const tagIds: string[] = [];
          for (const name of tagNames) {
            let { data: tag } = await supabase.from('tags').select('id').eq('name', name).maybeSingle();
            if (!tag) {
              const { data: newTag } = await supabase.from('tags').insert({ name }).select('id').single();
              tag = newTag;
            }
            if (tag) tagIds.push(tag.id);
          }
          if (tagIds.length > 0) {
            await supabase.from('media_tags').insert(tagIds.map(tag_id => ({ media_id: id, tag_id })));
          }
        }
      } catch (err) {
        console.error('Tag sync error:', err);
      }
    }
    
    const { data: finalItem } = await supabase
      .from('media_items')
      .select('*, profiles!user_id(username), media_tags(tags(name))')
      .eq('id', id)
      .maybeSingle();

    return { data: finalItem || updatedItem, error: null };
  },

  async updateMediaStatus(id: string, status: ItemStatus, reason?: string) {
    const { data: item } = await supabase.from('media_items').select('*').eq('id', id).single();
    if (!item) return { error: { message: 'Item not found' } };
    if (status === 'approved' && item.status !== 'approved') {
      // 这里的 approved 逻辑
      this.awardUserReward(item.user_id, item.type === 'video' ? 'video_publish' : 'image_publish').catch(console.error);

      const { data: config } = await this.getStorageConfig();
      if (config && (config.virtual_view_base_max ?? 0) > 0) {
        const max = config.virtual_view_base_max ?? 0;
        const min = config.virtual_view_base_min ?? 0;
        const vViews = Math.floor(Math.random() * (max - min + 1)) + min;
        if (vViews > 0) await supabase.rpc('add_virtual_views', { item_id: id, amount: vViews });
      }
      const { data: dConfig } = await this.getSystemConfig('dedupe_config');
      if (dConfig?.value?.trigger_mode === 'on_audit' && item.type === 'image') this.scanImageContentHashes(1, [id]).catch(console.error);
    }
    return await supabase.rpc('update_media_status_rpc', { p_id: id, p_status: status, p_reason: reason || null });
  },

  async batchUpdateMediaStatus(ids: string[], status: ItemStatus, reason?: string) {
    if (!ids.length) return { data: [], error: null };
    
    // 批量获取媒体项
    const { data: items, error: fetchError } = await supabase.from('media_items').select('*').in('id', ids);
    if (fetchError || !items) return { error: fetchError || { message: 'Items not found' } };

    if (status === 'approved') {
      // 批量处理审核通过逻辑
      // 1. 获取配置（利用缓存）
      const [storageConfigRes, dedupeConfigRes] = await Promise.all([
        this.getStorageConfig(),
        this.getSystemConfig('dedupe_config')
      ]);
      const storageConfig = storageConfigRes.data;
      const dedupeConfig = dedupeConfigRes.data;

      // 2. 处理各项业务逻辑
      const tasks: Promise<any>[] = [];
      const dedupeIds: string[] = [];

      for (const item of items) {
        if (item.status !== 'approved') {
          // 异步奖励
          this.awardUserReward(item.user_id, item.type === 'video' ? 'video_publish' : 'image_publish', `post_${item.id}`).catch(console.error);

          // 虚拟浏览
          if (storageConfig && (storageConfig.virtual_view_base_max ?? 0) > 0) {
            const max = storageConfig.virtual_view_base_max ?? 0;
            const min = storageConfig.virtual_view_base_min ?? 0;
            const vViews = Math.floor(Math.random() * (max - min + 1)) + min;
            if (vViews > 0) tasks.push(supabase.rpc('add_virtual_views', { item_id: item.id, amount: vViews }) as unknown as Promise<any>);
          }

          // 查重任务收集
          if (dedupeConfig?.value?.trigger_mode === 'on_audit' && item.type === 'image') {
            dedupeIds.push(item.id);
          }
        }
      }

      // 并行执行 RPC 任务
      if (tasks.length > 0) await Promise.all(tasks).catch(console.error);
      // 异步执行查重
      if (dedupeIds.length > 0) this.scanImageContentHashes(1, dedupeIds).catch(console.error);
    }

    // 批量更新数据库状态
    return await supabase.rpc('batch_update_media_status_rpc', { p_ids: ids, p_status: status, p_reason: reason || null });
  },

  async adjustMediaHeat(id: string, amount: number) {
    cache.invalidate('popular_media_main');
    return await supabase.rpc('adjust_heat', { p_item_id: id, p_amount: amount });
  },

  async triggerHeatCalculation() {
    cache.invalidate('popular_media_main');
    return await supabase.functions.invoke('calculate-media-heat');
  },

  // 导入库 (Staging)
  async getMediaStaging(page = 0, limit = 20, status = 'pending') {
    const { data, error } = await supabase.rpc('get_media_staging_v2', {
      p_page: page,
      p_limit: limit,
      p_status: status
    });
    
    if (error) return { data: [], error, total: 0 };
    const items = (data || []) as any[];
    const total = items.length > 0 ? Number(items[0].total_count) : 0;
    return { data: items, error: null, total };
  },

  async importToStaging(items: any[]) {
    return await supabase.from('media_staging').insert(items);
  },

  async updateStagingItem(id: string, updates: any) {
    return await supabase.from('media_staging').update(updates).eq('id', id);
  },

  async deleteStagingItems(ids: string[]) {
    // 改为软删除方式，与壁纸库一致
    return await supabase.from('media_staging').update({ deleted_at: new Date().toISOString() }).in('id', ids);
  },

  async hardDeleteStagingItems(ids: string[]) {
    // 彻底删除
    return await supabase.from('media_staging').delete().in('id', ids);
  },

  async approveStagingItems(ids: string[]) {
    return await supabase.rpc('approve_staging_items', { p_ids: ids });
  },

  async moveToStaging(ids: string[]) {
    const { data: items, error: fetchError } = await supabase
      .from('media_items')
      .select('*, media_tags(tags(name))')
      .in('id', ids);
    
    if (fetchError || !items) return { error: fetchError || { message: 'Items not found' } };

    const stagingItems = items.map(item => ({
      url: item.url,
      thumbnail_url: item.thumbnail_url,
      title: item.title,
      type: item.type,
      category_id: item.category_id,
      owner_id: item.user_id,
      status: 'pending',
      tag_names: (item as any).media_tags?.map((mt: any) => mt.tags?.name).filter(Boolean) || []
    }));

    const { error: insertError } = await supabase
      .from('media_staging')
      .insert(stagingItems);

    if (insertError) return { error: insertError };

    return await supabase.from('media_items').delete().in('id', ids);
  },

  async getAdminAlbumPhotos(page = 0, limit = 50, albumId?: string) {
    let query = supabase.from('album_photos').select('*, photo_albums!album_id(title)', { count: 'exact' });
    if (albumId) query = query.eq('album_id', albumId);
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    return { data: (data || []) as (AlbumPhoto & { photo_albums: { title: string } })[], error, total: count || 0 };
  },

  async getPendingAlbumPhotosFast(page = 0, limit = 50) {
    const { data, error, count } = await supabase
      .from('album_photos')
      .select('*, photo_albums!album_id(title)', { count: 'exact' })
      .eq('level', 'pending')
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    return { data, error, total: count || 0 };
  },

  async updateAlbumPhotoLevel(id: string, level: string, operatorId?: string) {
    const { error } = await supabase.from('album_photos').update({ level }).eq('id', id);
    if (error) return { error };
    
    // Log the change
    if (operatorId) {
      await supabase.from('album_photo_level_logs').insert({
        photo_id: id,
        operator_id: operatorId,
        new_level: level
      });
    }
    return { error: null };
  },


  async deleteAdminAlbumPhoto(id: string) {
    return await supabase.from('album_photos').delete().eq('id', id);
  },

  async updateAdminAlbumPhoto(id: string, updates: any) {
    return await supabase.from('album_photos').update(updates).eq('id', id);
  },

  async batchUpsertAlbumPhotos(photos: Partial<AlbumPhoto>[]) {
    return await supabase.from('album_photos').upsert(photos, { onConflict: 'album_id, url' });
  },

  async approveAndCategorizeStaging(id: string, categoryId: string) {
    const { data: item, error: fetchError } = await supabase.from('media_staging').select('*').eq('id', id).single();
    if (fetchError || !item) throw fetchError || new Error('Item not found');

    const { data: inserted, error: insertError } = await supabase.from('media_items').insert([{
      url: item.url,
      thumbnail_url: item.thumbnail_url,
      title: item.title || '导入资源',
      type: item.type,
      category_id: categoryId,
      status: 'approved',
      user_id: item.owner_id
    }]).select().single();

    if (insertError) throw insertError;

    // 搬运标签
    if (item.tag_names?.length > 0) {
      for (const tagName of item.tag_names) {
        const { data: tag } = await supabase.from('tags').select('id').eq('name', tagName).maybeSingle();
        let tagId = tag?.id;
        if (!tagId) {
          const { data: newTag } = await supabase.from('tags').insert({ name: tagName }).select('id').single();
          tagId = newTag?.id;
        }
        if (tagId) {
          await supabase.from('media_tags').insert({ media_id: inserted.id, tag_id: tagId });
        }
      }
    }

    const { error: deleteError } = await supabase.from('media_staging').delete().eq('id', id);
    if (deleteError) throw deleteError;
    return { error: null };
  },

  async updateMediaAdminStatus(id: string, updates: { is_recommended?: boolean; is_hidden?: boolean; status?: ItemStatus }) {
    return await supabase.rpc('update_media_admin_status', {
      p_item_id: id,
      p_is_recommended: updates.is_recommended,
      p_is_hidden: updates.is_hidden,
      p_status: updates.status
    });
  },

  async updateMediaCategory(id: string, categoryId: string | null, userId?: string) {
    const finalCategoryId = categoryId || null;
    const updates: any = { 
      category_id: finalCategoryId,
      classified_at: finalCategoryId ? new Date().toISOString() : null,
      classified_by: finalCategoryId ? userId : null
    };
    const { error } = await supabase.from('media_items').update(updates).eq('id', id);
    if (error) throw error;
    return { error: null };
  },

  async getTagCloud() {
    const cacheKey = 'tag_cloud_data';
    const { data: profile } = await this.getCurrentProfile();
    const isAdmin = (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) || profile?.role === 'admin';

    // 后台页面不缓存
    if (!isAdmin) {
      const cached = cache.get<any[]>(cacheKey, 3600000, 'tags'); // 1小时缓存
      if (cached) return { data: cached, error: null };
    }

    // 尝试调用聚合函数
    let { data, error } = await supabase.rpc('get_tag_cloud_stats');
    
    // 如果没有 RPC，回退到普通标签拉取
    if (error) {
      console.warn('RPC get_tag_cloud_stats missing, using fallback getTags');
      const { data: tags, error: tagsError } = await this.getTags();
      data = tags;
      error = tagsError;
    }

    if (!isAdmin && data) {
      // 在前端过滤不可见或权限不足的标签
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
    return { data: (data || []) as any[], error };
  },
  async getTagManagementStats() {
    const { data, error } = await supabase.rpc('get_tag_management_stats');
    return { data: (data || []) as any[], error };
  },

  async getCategoryCloud() {
    const cacheKey = 'category_cloud_data';
    const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

    if (!isAdmin) {
      const cached = cache.get<any[]>(cacheKey, 3600000, 'categories');
      if (cached) return { data: cached, error: null };
    }

    // 使用新的 RPC 函数获取分类云，性能更好且包含准确的计数
    const { data: categories, error } = await supabase.rpc('get_category_cloud');

    const roleWeights: Record<string, number> = { 'pt': 0, 'vip': 1, 'svip': 2, 'vvip': 3 };
    let userWeight = 0;
    
    if (!isAdmin) {
      const { data: profile } = await this.getCurrentProfile();
      const userRole = profile?.album_level || 'pt';
      userWeight = roleWeights[userRole] || 0;
    }

    let processedData = (categories || []).map((cat: any) => ({
      ...cat,
      count: Number(cat.count) || 0
    }));

    if (!isAdmin) {
      processedData = processedData.filter((cat: any) => {
        if (cat.is_visible === false) return false;
        const catMinRole = cat.min_role || 'pt';
        const catWeight = roleWeights[catMinRole] || 0;
        return userWeight >= catWeight;
      });
    }

    if (!error && !isAdmin) {
      cache.set(cacheKey, processedData);
    }

    return { data: processedData, error };
  },

  async checkIsFavorite(userId: string, mediaId: string) {
    const { data, error } = await supabase.from('favorites').select('id').eq('user_id', userId).eq('media_id', mediaId).maybeSingle();
    return { isFavorite: !!data, error };
  },

  async incrementMediaView(id: string, _userId?: string) {
    return await supabase.rpc('increment_view_count', { item_id: id });
  },

  async getUncategorizedMedia(page = 0, limit = 20, type?: string) {
    let query = supabase.from('media_items').select('*, profiles!user_id(*)', { count: 'exact' }).is('category_id', null).is('deleted_at', null).order('created_at', { ascending: false });
    if (type && type !== 'all') query = query.eq('type', type);
    const { data, error, count } = await query.range(page * limit, (page + 1) * limit - 1);
    return { data: (data || []) as MediaItem[], error, total: count || 0 };
  },

  async getRandomMedia(userId?: string, limit = 10, type = 'all', categoryId = 'all', tagIds?: string[]) {
    const { data, error } = await supabase.rpc('get_random_media_items', { 
      p_limit: limit, 
      p_user_id: userId || null,
      p_type: type,
      p_category_id: categoryId,
      p_tag_ids: tagIds || null
    });
    return { data: (data || []) as MediaItem[], error };
  },

  async getRecommendedMedia(page = 0, limit = 10, userId?: string, type = 'all', categoryId = 'all', tagIds?: string[], force = false) {
    // 直接调用 getApprovedMedia 使用其完善的过滤和热度排序逻辑
    const result = await this.getApprovedMedia(page, limit, userId, type, categoryId, 'popular', tagIds, true);
    
    return { data: result.data, error: result.error, total: result.total };
  },

  // 查询指定 media_id 在当前排序/过滤条件下的 0-based 行号
  // 用于定位：rowNumber / pageSize = 目标页码，并发加载到该页后精确 scrollIntoView
  async getMediaRowNumber(
    mediaId: string,
    userId?: string,
    sortBy: 'latest' | 'popular' = 'latest',
    type: string = 'all',
    categoryId: string = 'all',
    tagIds?: string[]
  ) {
    const { data, error } = await supabase.rpc('get_media_row_number', {
      p_media_id: mediaId,
      p_user_id: userId || null,
      p_sort_by: sortBy,
      p_type: type,
      p_category_id: categoryId,
      p_tag_ids: tagIds && tagIds.length > 0 ? tagIds : null
    });
    return { rowNumber: typeof data === 'number' ? data : -1, error };
  },

  async getRelatedMedia(mediaId: string, limit = 10) {
    const { data, error } = await supabase.rpc('get_related_media', { p_media_id: mediaId, p_limit: limit });
    return { data: (data || []) as MediaItem[], error };
  },

  async getUncategorizedMediaFast(userId: string, page = 0, limit = 50, type = 'all') {
    const { data, error } = await supabase.rpc('get_fast_organize_uncategorized', {
      p_user_id: userId,
      p_type: type,
      p_limit: limit,
      p_offset: page * limit
    });
    return { data: (data || []) as MediaItem[], error };
  },

  async getPendingMediaFast(userId: string, page = 0, limit = 50, type = 'all') {
    const { data, error } = await supabase.rpc('get_fast_organize_pending', {
      p_user_id: userId,
      p_type: type,
      p_limit: limit,
      p_offset: page * limit
    });
    return { data: (data || []) as MediaItem[], error };
  },

  async addToPendingMedia(userId: string, mediaId: string) {
    // 切换到 RPC 调用，规避 columns 引号问题，并支持 NULL user_id 冲突处理
    const { error } = await supabase.rpc('upsert_user_pending_item', { p_user_id: userId, p_media_id: mediaId });
    if (error) throw error;
    return { error: null };
  },

  async removeFromPendingMedia(userId: string, mediaId: string) {
    const { error } = await supabase.from('user_pending_items').delete().match({ user_id: userId, media_id: mediaId });
    if (error) throw error;
    return { error: null };
  },

  async deleteMedia(id: string) {
    // 软删除
    return await supabase.from('media_items').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  },

  async restoreMedia(id: string) {
    // 恢复软删除的内容
    return await supabase.from('media_items').update({ deleted_at: null }).eq('id', id);
  },

  async hardDeleteMedia(id: string) {
    // 彻底删除内容
    return await supabase.from('media_items').delete().eq('id', id);
  },

  async getSystemConfig(key: string) {
    const cacheKey = `config_${key}`;
    const fetcher = async () => {
      // 直接查询 Supabase
      let { data, error } = await supabase.from('system_configs').select('*').eq('key', key).maybeSingle();
      
      // 如果遇到 401，通常是由于浏览器存有已过期的旧 Token，尝试清除并重试
      if (error && (error as any).status === 401) {
        console.warn('[SystemConfig] Detect 401, trying clean fetch...');
        await supabase.auth.signOut();
        const { data: retryData, error: retryError } = await supabase.from('system_configs').select('*').eq('key', key).maybeSingle();
        data = retryData;
        error = retryError;
      }
      return { data, error };
    };

    // 配置信息持久化缓存 1 小时，确保启动瞬间可用
    return await cache.getOrFetch(cacheKey, fetcher, 3600000, undefined, true);
  },

  async updateSystemConfig(key: string, value: any) {
    const { data, error } = await supabase.from('system_configs').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' }).select().single();
    return { data, error };
  },

  async batchUpdateSystemConfigs(configs: { key: string, value: any }[]) {
    const records = configs.map(c => ({
      key: c.key,
      value: c.value,
      updated_at: new Date().toISOString()
    }));
    
    const { data, error } = await supabase.from('system_configs').upsert(records, { onConflict: 'key' }).select();
    
    if (data && !error) {
      data.forEach(item => {
        cache.invalidate(`config_${item.key}`);
        cache.set(`config_${item.key}`, item);
      });
    }
    return { data, error };
  },

  async handleMediaDownload(userId: string, mediaId: string | null, albumId: string | null, type: 'wallpaper' | 'album', points: number) {
    return await supabase.rpc('handle_media_download', {
      p_user_id: userId,
      p_media_id: mediaId,
      p_album_id: albumId,
      p_type: type,
      p_points: points
    });
  },

  async getMediaDownloadHistory(userId: string, type: 'all' | 'wallpaper' | 'album' = 'all', page = 0, limit = 20) {
    let query = supabase
      .from('media_downloads')
      .select('*, media_items(*), album_photos(*, photo_albums!album_id(*))', { count: 'exact' })
      .eq('user_id', userId);
    
    if (type !== 'all') {
      query = query.eq('type', type);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    
    return { data: (data || []) as any[], error, total: count || 0 };
  },

  async checkDownloadStatus(userId: string, mediaId: string | null, type: 'wallpaper' | 'album', albumPhotoId?: string) {
    let query = supabase.from('media_downloads').select('id').eq('user_id', userId).eq('type', type);
    if (mediaId) query = query.eq('media_id', mediaId);
    if (albumPhotoId) query = query.eq('album_id', albumPhotoId);
    
    const { data } = await query.maybeSingle();
    return !!data;
  },

  async getCategories() {
    return this.getContentCategories();
  },

  async importFavorites(userId: string, favorites: any[]) {
    // 切换到 RPC 调用，规避 PostgREST columns 参数引号导致的 42703 错误，并支持 NULL user_id 匹配
    for (const f of favorites) {
      await supabase.rpc('upsert_favorite', { p_user_id: userId, p_media_id: f.media_id || f.id });
    }
    return { data: 'ok', error: null };
  },

  async scanImageContentHashes(limit: number = 50, ids?: string[], apiUrl?: string) {
    if (apiUrl && apiUrl.startsWith('http')) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 1分钟超时
      
      return await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_hashes', ids, limit }),
        signal: controller.signal
      }).then(async res => {
        clearTimeout(timeoutId);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP error! status: ${res.status}`);
        return { data, error: null };
      }).catch(err => {
        clearTimeout(timeoutId);
        return { data: null, error: err };
      });
    }
    return await supabase.functions.invoke('image-dedupe', { body: { action: 'generate_hashes', ids, limit } });
  },

  async getVisuallyDuplicateMedia(threshold = 5) {
    return await supabase.rpc('get_visually_duplicate_media', { p_threshold: threshold });
  },

  async getVisuallyDuplicateByHash(hash: string, threshold = 5) {
    const { data, error } = await supabase.rpc('get_media_by_similar_hash', { p_hash: hash, p_threshold: threshold });
    if (error) return { data: null, error };
    return { data: (data || []) as any[], error: null };
  },

  async checkVisualDuplicate(hash: string, threshold = 5) {
    // 检查是否存在视觉指纹在阈值范围内的项
    // 这里使用 RPC 更安全，或者手动转换 bit_count 比较难在 JS 直接拼 SQL。
    // 我们先尝试找完全一致的，如果找不到，再找相似的（如果需要）。
    // 为了极致体验，我们还是找最相似的一个。
    const { data } = await supabase.rpc('get_media_by_similar_hash', { p_hash: hash, p_threshold: threshold });
    if (data && data.length > 0) {
      return { data: { id: data[0].id, title: data[0].title || '相似作品' }, error: null };
    }
    return { data: null, error: null };
  },

  async checkFileDuplicate(md5: string) {
    return await supabase.from('media_items').select('id, title').eq('file_md5', md5).limit(1).maybeSingle();
  },

  async getDuplicateMedia() {
    return await supabase.rpc('get_duplicate_media');
  },

  async ignoreDedupeItem(id: string) {
    return await supabase.from('media_items').update({ dedupe_ignored: true }).eq('id', id);
  },
  async incrementDedupeVersion(id: string) {
    const { data: item } = await supabase.from('media_items').select('dedupe_version').eq('id', id).single();
    const nextVersion = (item?.dedupe_version || 0) + 1;
    return await supabase.from('media_items').update({ dedupe_version: nextVersion }).eq('id', id);
  },
  async batchIncrementDedupeVersion(ids: string[]) {
    // 切换到 RPC 调用，避免使用 upsert 时触发 user_id not null 约束检查 (PostgREST 特性)
    return await supabase.rpc('bulk_ignore_dedupe', { p_ids: ids });
  },

  async setDedupeIgnored(ids: string[], ignored: boolean) {
    if (ignored) {
        return await supabase.rpc('bulk_ignore_dedupe', { p_ids: ids });
    }
    return await supabase.from('media_items').update({ dedupe_ignored: ignored }).in('id', ids);
  },


  // 说明文档
  async getDuplicateMediaByMd5(md5: string) {
    return await supabase.from('media_items').select('*, profiles!user_id(*)').eq('file_md5', md5).order('created_at', { ascending: true });
  },

  async getMediaByScanStatus(status: string, page = 0, limit = 20) {
    if (status === 'unique') return await supabase.rpc('get_unique_media_items', { p_limit: limit, p_offset: page * limit });
    let query = supabase.from('media_items').select('*, profiles!user_id(*)').eq('type', 'image').is('deleted_at', null).eq('dedupe_ignored', false);
    if (status === 'processed') query = query.not('content_hash', 'is', null);
    else if (status === 'unprocessed') query = query.is('content_hash', null).is('dedupe_error', null);
    else if (status === 'error') query = query.not('dedupe_error', 'is', null);
    return await query.order('created_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
  },

  // 管理员后台特定
  async getMediaLibrary(page = 0, limit = 20, search?: string, status?: string, type?: string, categoryId?: string, tagId?: string) {
    const { data, error } = await supabase.rpc('get_media_library_v2', {
      p_page: page,
      p_limit: limit,
      p_search: search || '',
      p_status: status || 'all',
      p_type: type || 'all',
      p_category_id: categoryId || 'all',
      p_tag_id: tagId || 'all'
    });

    if (error) {
      console.error('get_media_library_v2 error:', error);
      return { data: [], error, total: 0 };
    }

    const items = (data || []) as any[];
    const total = items.length > 0 ? Number(items[0].total_count) : 0;

    // 为了兼容原有的前端代码，我们需要补充 profile 和标签数据
    // 我们可以批量查询这些关联数据
    if (items.length > 0) {
      const mediaIds = items.map(i => i.id);
      const userIds = Array.from(new Set(items.map(i => i.user_id).filter(Boolean)));

      const [profilesRes, mediaTagsRes] = await Promise.all([
        supabase.from('profiles').select('*').in('id', userIds),
        supabase.from('media_tags').select('*, tags(*)').in('media_id', mediaIds)
      ]);

      const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]));
      const tagsMap = new Map<string, any[]>();
      mediaTagsRes.data?.forEach(mt => {
        if (!tagsMap.has(mt.media_id)) tagsMap.set(mt.media_id, []);
        tagsMap.get(mt.media_id)!.push(mt);
      });

      items.forEach(item => {
        item.profiles = profileMap.get(item.user_id);
        item.media_tags = tagsMap.get(item.id) || [];
      });
    }

    return { data: items as MediaItem[], error: null, total };
  },

  async getClassifiedMedia(page = 0, limit = 20, categoryId?: string, search?: string) {
    let select = '*, content_categories(*), classifier:profiles!classified_by(username)';
    let query = supabase.from('media_items').select(select, { count: 'exact' }).is('deleted_at', null).not('category_id', 'is', null);
    
    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }
    
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    
    const { data, error, count } = await query
      .order('classified_at', { ascending: false })
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
      
    return { 
      data: (data || []).map((item: any) => ({
        ...item,
        category_name: item.content_categories?.name || '未分类',
        classifier_name: item.classifier?.username || '系统'
      })) as any as MediaItem[], 
      error, 
      total: count || 0 
    };
  },

  async getUnclassifiedMedia(page = 0, limit = 20, search?: string) {
    let select = '*, content_categories(*), classifier:profiles!classified_by(username)';
    let query = supabase.from('media_items').select(select, { count: 'exact' }).is('deleted_at', null).is('category_id', null);
    
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
      
    return { 
      data: (data || []) as any as MediaItem[], 
      error, 
      total: count || 0 
    };
  },

  async getTaggedMedia(page = 0, limit = 20, tagId?: string, search?: string) {
    let select = '*, content_categories(*), media_tags!inner(tag_id, tags(*))';
    let query = supabase.from('media_items').select(select, { count: 'exact' }).is('deleted_at', null);
    
    if (tagId && tagId !== 'all') {
      query = query.eq('media_tags.tag_id', tagId);
    }
    
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
      
    return { 
      data: (data || []) as any as MediaItem[], 
      error, 
      total: count || 0 
    };
  },

  async getUntaggedMedia(page = 0, limit = 20, search?: string) {
    const { data, error } = await supabase.rpc('get_untagged_media', {
      p_page: page,
      p_limit: limit,
      p_search: search || ''
    });
    
    if (error) {
      console.error('get_untagged_media error:', error);
      return { data: [], error, total: 0 };
    }
    
    const items = (data || []) as any as MediaItem[];
    const total = items.length > 0 ? Number((items[0] as any).total_count) : 0;
    
    return { data: items, error: null, total };
  },

  async updateMediaTags(mediaId: string, tagIds: string[]) {
    await supabase.from('media_tags').delete().eq('media_id', mediaId);
    if (tagIds.length > 0) {
      const inserts = tagIds.map(tag_id => ({ media_id: mediaId, tag_id }));
      return await supabase.from('media_tags').insert(inserts);
    }
    return { data: null, error: null };
  },

  async deleteAlbum(id: string) {
    // 软删除相册
    return await supabase.from('photo_albums').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  },

};
