import { PermissionGroup, Profile } from "@/types";
import { api } from "./api";
import { supabase } from "./supabase";

export const rbacApi = {
  // 权限组管理
  async getPermissionGroups() {
    const { data, error } = await supabase
      .from('permission_groups')
      .select('*')
      .order('created_at', { ascending: false });
    return { data: (data || []) as PermissionGroup[], error };
  },

  async createPermissionGroup(group: Partial<PermissionGroup>) {
    return await supabase.from('permission_groups').insert([group]).select().single();
  },

  async updatePermissionGroup(id: string, updates: Partial<PermissionGroup>) {
    return await supabase.from('permission_groups').update(updates).eq('id', id).select().single();
  },

  async deletePermissionGroup(id: string) {
    return await supabase.from('permission_groups').delete().eq('id', id);
  },

  async setDefaultGroup(id: string) {
    // 先取消所有的默认
    await supabase.from('permission_groups').update({ is_default: false }).neq('id', id);
    // 设置当前为默认
    return await supabase.from('permission_groups').update({ is_default: true }).eq('id', id);
  },

  // 用户权限组变更
  async updateUserGroup(userId: string, groupId: string) {
    return await api.updateProfile(userId, { group_id: groupId } as any);
  },

  // 获取当前用户完整权限
  async getCurrentUserPermissions(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, permission_groups(*)')
      .eq('id', userId)
      .maybeSingle();
    
    const profile = data as any;
    
    // 如果是超级管理员，授予所有可能的权限
    if (profile?.role === 'admin' || profile?.role === 'super_admin') {
      return { 
        permissions: [
          'upload', 'link_import', 'remove_watermark', 'delete_others', 'content_classification',
          'admin_dashboard', 'admin_datacenter', 'admin_ranking', 'admin_audit', 
          'admin_reports', 'admin_library', 'admin_points', 'admin_users', 
          'admin_userfields', 'admin_notifications', 'admin_storage', 'admin_ads', 
          'admin_invites', 'admin_network', 'admin_codes', 'admin_db', 'admin_tags',
          'admin_categories', 'album_browse', 'album_download', 'bypass_audit', 'audit_content'
        ], 
        group_name: profile?.permission_groups?.name || '管理员',
        error 
      };
    }

    const groupPermissions = profile?.permission_groups?.permissions || [];
    const individualPermissions = profile?.permissions || [];
    const mergedPermissions = Array.from(new Set([...groupPermissions, ...individualPermissions]));

    return { 
      permissions: mergedPermissions, 
      group_name: profile?.permission_groups?.name || '普通用户',
      error 
    };
  }
};
