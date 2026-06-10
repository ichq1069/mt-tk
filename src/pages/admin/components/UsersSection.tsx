import React, { useState, useEffect } from 'react';
import { cn, formatBeijingTime } from '@/lib/utils';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { Profile, StorageConfig, UserFieldConfig, PermissionGroup } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { rbacApi } from "@/db/rbac";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, X, Edit2, Search, Key, Trash2, Mail, UserPlus, ShieldCheck, Download, RefreshCcw, ShieldAlert, Eye, History, Calendar as CalendarIcon
} from "lucide-react";
import { PermissionGroupsSection } from './PermissionGroupsSection';
import { WxLoginSection } from './WxLoginSection';
import { AuthStrategySection } from './AuthStrategySection';
import { BatchRepairAuthSection } from './BatchRepairAuthSection';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { EnhancedPagination } from '@/components/common/EnhancedPagination';
import * as XLSX from 'xlsx';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';

export function UsersSection() {
  const { user, refreshProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [blacklistProfiles, setBlacklistProfiles] = useState<Profile[]>([]);
  const [blacklistTotal, setBlacklistTotal] = useState(0);
  const [blacklistPage, setBlacklistPage] = useState(0);
  const { logAction } = useAdminLogger('users');
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [groupId, setGroupId] = useState('all');
  const [limit, setLimit] = useState(20);

  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    notes: '',
    points: 0,
    exp: 0,
    role: 'pt' as any,
    group_id: '',
    album_level: 'pt' as any,
    digital_id: '' as string | number,
    is_debug_enabled: false,
    mp_openid: '',
    wechat_openid: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [addUserForm, setAddUserForm] = useState<any>({ username: '', password: '', email: '', role: 'pt' });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<Profile | null>(null);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [page, debouncedSearch, activeTab, groupId, limit, blacklistPage]);

  const fetchData = async () => {
    if (activeTab === 'groups' || activeTab === 'auth') return;
    
    if (activeTab === 'blacklist') {
      setLoading(true);
      try {
        const { data, total: t } = await api.getBlacklistedProfiles(blacklistPage, limit, debouncedSearch);
        setBlacklistProfiles(data || []);
        setBlacklistTotal(t || 0);
      } catch (e: any) {
        toast.error('获取黑名单失败: ' + e.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const [{ data, total: t }, { data: groupData }] = await Promise.all([
        api.getAllProfiles(page, limit, debouncedSearch, groupId === 'all' ? undefined : groupId),
        rbacApi.getPermissionGroups()
      ]);
      
      const results = data || [];
      if (results.length === 0 && page > 0 && (t || 0) > 0) {
        setPage(Math.max(0, Math.ceil((t || 0) / limit) - 1));
        return;
      }
      
      setProfiles(results);
      setTotal(t || 0);
      setGroups(groupData || []);
    } catch (error: any) {
      toast.error(`获取数据失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroup = async (userId: string, gid: string) => {
    try {
      await rbacApi.updateUserGroup(userId, gid);
      toast.success('权限组已更新');
      fetchData();
    } catch (e: any) {
      toast.error('更新失败: ' + e.message);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.updateProfileRole(userId, newRole as any);
      toast.success('角色更新成功');
      fetchData();
    } catch (error: any) {
      toast.error(`更新失败: ${error.message}`);
    }
  };

  const handleDeleteUser = async (profile: Profile) => {
    const confirmed = await confirmAsync(`确认删除用户 ${profile.username}？`, { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { data, error } = await api.deleteUser(profile.id);
      if (error) throw error;
      if (data && (data as any).error) throw new Error((data as any).error);
      
      toast.success('用户已删除');
      fetchData();
    } catch (e: any) {
      toast.error('删除失败: ' + e.message);
    }
  };

  const handleToggleBan = async (profile: Profile) => {
    const newStatus = !profile.is_banned;
    try {
      await api.updateProfileBannedStatus(profile.id, newStatus);
      toast.success(`用户已${newStatus ? '封禁' : '解封'}`);
      fetchData();
    } catch (error: any) {
      toast.error(`操作失败: ${error.message}`);
    }
  };

  const handleToggleBlacklist = async (profile: Profile) => {
    const newStatus = !profile.is_blacklisted;
    try {
      await api.updateProfileBlacklistStatus(profile.id, newStatus);
      toast.success(`用户已${newStatus ? '加入黑名单' : '移除黑名单'}`);
      fetchData();
    } catch (error: any) {
      toast.error(`操作失败: ${error.message}`);
    }
  };

  const handleToggleDebug = async (profile: Profile) => {
    const newStatus = !profile.is_debug_enabled;
    try {
      await api.updateProfile(profile.id, { is_debug_enabled: newStatus } as any);
      toast.success(`用户调试模式已${newStatus ? '开启' : '关闭'}`);
      fetchData();
    } catch (error: any) {
      toast.error(`操作失败: ${error.message}`);
    }
  };



  const openProfileEditor = (profile: Profile) => {
    setEditingProfile(profile);
    setEditForm({
      username: profile.username || '',
      email: profile.email || '',
      notes: profile.notes || '',
      points: profile.points || 0,
      exp: profile.exp || 0,
      role: profile.role || 'pt',
      group_id: profile.group_id || '',
      album_level: profile.album_level || 'pt',
      digital_id: profile.digital_id || '',
      is_debug_enabled: !!profile.is_debug_enabled,
      mp_openid: profile.mp_openid || '',
      wechat_openid: profile.wechat_openid || '',
    });
  };

  const handleAllocateSpecialId = async (profile: Profile) => {
    const digitalId = await confirmAsync('请输入要分配给该用户的靓号 (4-10位数字)', {
      title: `为 ${profile.username} 分配靓号`,
      cancelText: '取消',
      confirmText: '确定分配',
      variant: 'default',
      isInput: true,
      inputPlaceholder: '例如: 666888'
    });
    
    if (!digitalId || typeof digitalId !== 'string') return;
    if (!/^\d{4,10}$/.test(digitalId)) {
      return toast.error('靓号必须是 4-10 位纯数字');
    }

    try {
      setLoading(true);
      const { error } = await api.updateProfile(profile.id, { digital_id: digitalId });
      if (error) throw error;
      toast.success(`成功为用户分配靓号: ${digitalId}`);
      logAction('分配靓号', { userId: profile.id, digitalId });
      if (user && profile.id === user.id) {
        await refreshProfile();
      }
      fetchData();
    } catch (e: any) {
      toast.error('分配失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleRepairAuth = async (profile: Profile) => {
    const password = await confirmAsync('请为该用户设置初始密码以完成修复', {
      title: `修复 ${profile.username} 的 Auth 账号`,
      cancelText: '取消',
      confirmText: '确认修复',
      variant: 'default',
      isInput: true,
      inputPlaceholder: '至少 6 位密码'
    });
    
    if (!password || typeof password !== 'string') return;
    if (password.length < 6) {
      return toast.error('密码长度至少为 6 位');
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('admin-auth-action', {
        body: { 
          action: 'repair_user', 
          userId: profile.id, 
          email: profile.email, 
          password: password 
        }
      });
      
      if (error) {
        let errorMsg = typeof error?.context?.text === 'function' ? await error.context.text() : null;
        if (errorMsg) {
          try {
            const parsed = JSON.parse(errorMsg);
            if (parsed.error) errorMsg = parsed.error;
          } catch (e) {}
        }
        throw new Error(errorMsg || error.message);
      }
      
      toast.success(data.message || '账号修复成功');
      logAction('修复用户 Auth 账号', { userId: profile.id });
    } catch (e: any) {
      toast.error('修复失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (profile: Profile) => {
    const newPassword = await confirmAsync('请输入该用户的新密码', {
      title: `重置 ${profile.username} 的密码`,
      cancelText: '取消',
      confirmText: '确认重置',
      variant: 'default',
      isInput: true,
      inputPlaceholder: '至少 6 位新密码'
    });
    
    if (!newPassword || typeof newPassword !== 'string') return;
    if (newPassword.length < 6) {
      return toast.error('密码长度至少为 6 位');
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('admin-auth-action', {
        body: { action: 'reset_password', userId: profile.id, password: newPassword, email: profile.email }
      });
      
      if (error) {
        let errorMsg = typeof error?.context?.text === 'function' ? await error.context.text() : null;
        let finalMessage = errorMsg || error.message;
        
        if (finalMessage) {
          try {
            const parsed = JSON.parse(finalMessage);
            if (parsed.error) finalMessage = parsed.error;
            else if (parsed.message) finalMessage = parsed.message;
          } catch (e) {}
        }
        
        throw new Error(finalMessage || '未知错误');
      }
      if (data?.error) throw new Error(data.error);
      
      toast.success('密码重置成功');
      logAction('重置用户密码', { userId: profile.id });
    } catch (e: any) {
      toast.error('重置失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };


  const handleSaveProfile = async () => {
    if (!editingProfile) return;
    setIsSaving(true);
    try {
      await api.updateProfile(editingProfile.id, {
        ...editForm,
        digital_id: editForm.digital_id === '' ? null : editForm.digital_id,
        group_id: editForm.group_id === '' ? undefined : editForm.group_id
      } as any);
      toast.success('用户信息已更新');
      setEditingProfile(null);
      if (user && editingProfile.id === user.id) {
        await refreshProfile();
      }
      fetchData();
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openUserHistory = async (p: Profile) => {
    setSelectedUserForHistory(p);
    setIsHistoryOpen(true);
    setLoadingHistory(true);
    try {
      // 这里的 openid 应该是 mp_openid 或 wechat_openid
      const openid = p.mp_openid || p.wechat_openid;
      if (!openid) {
        setUserHistory([]);
        return;
      }
      const { data, error } = await api.getDailyGalleryAccessHistory(openid);
      if (error) throw error;
      setUserHistory(data || []);
    } catch (e: any) {
      toast.error('获取历史记录失败: ' + e.message);
    } finally {
      setLoadingHistory(false);
    }
  };



  const handleAddUser = async () => {
    if (!addUserForm.username || !addUserForm.password || !addUserForm.email) {
      return toast.error('请填写完整用户信息');
    }
    setLoading(true);
    try {
      const { data, error } = await api.createUserManually(addUserForm);
      if (error) throw error;
      if (data && (data as any).error) throw new Error((data as any).error || '创建失败');
      
      toast.success('用户创建成功');
      setIsAddUserOpen(false);
      setAddUserForm({ username: '', password: '', email: '', role: 'pt' });
      fetchData();
    } catch (e: any) {
      toast.error('创建失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black">用户管理</h2>
            <p className="text-sm text-muted-foreground mt-1">管理全站用户账号、角色及权限</p>
          </div>
          <TabsList className="rounded-xl">
            <TabsTrigger value="list" className="rounded-lg">用户列表</TabsTrigger>
            <TabsTrigger value="groups" className="rounded-lg">权限组</TabsTrigger>
            <TabsTrigger value="blacklist" className="rounded-lg">黑名单</TabsTrigger>
            <TabsTrigger value="auth" className="rounded-lg">认证</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="mt-0 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="px-3 py-1 rounded-lg">共 {total} 名用户</Badge>
                <Button variant="default" size="sm" className="rounded-xl h-8 text-xs font-bold gap-1.5" onClick={() => setIsAddUserOpen(true)}>
                  <UserPlus className="w-3.5 h-3.5" /> 添加用户
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs font-bold gap-1.5" onClick={fetchData} disabled={loading}>
                  <RefreshCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> 刷新
                </Button>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger className="w-32 h-8 rounded-xl text-xs bg-muted/50 border-none">
                    <SelectValue placeholder="所有权限组" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">所有权限组</SelectItem>
                    {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative w-full md:w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="搜索用户名、邮箱、OpenID..." className="pl-9 rounded-xl h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>

            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>注册/最后在线</TableHead>
                    <TableHead>积分/成长</TableHead>
                    <TableHead>权限/角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : profiles.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-20 text-center text-muted-foreground">未发现用户</TableCell></TableRow>
                  ) : (
                    profiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 overflow-hidden">
                              {p.avatar_url ? <ProtectedMedia src={p.avatar_url} type="image" className="w-full h-full object-contain" alt="" ruleKey="后" /> : (p.username || p.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold truncate">{p.username || '未命名'}</span>
                                {p.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">{p.email || '无邮箱'}</div>
                              {p.digital_id && (
                                <div className="mt-1">
                                  <Badge variant="secondary" className="text-[9px] font-mono px-1 py-0 h-4 bg-indigo-50 text-indigo-600 border-indigo-100">
                                    ID: {p.digital_id}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5" title="注册时间">
                              <UserPlus className="w-3 h-3 opacity-60" />
                              <span>{formatBeijingTime(p.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="最后在线时间">
                              <RefreshCcw className="w-3 h-3 opacity-60" />
                              <span>{p.last_sign_in_at ? formatBeijingTime(p.last_sign_in_at) : '从未登录'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-[11px] font-mono"><span className="opacity-40">💰</span> {p.points}</div>
                            <div className="text-[11px] font-mono"><span className="opacity-40">📈</span> {p.exp}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Select value={p.group_id || 'none'} onValueChange={(val) => handleUpdateGroup(p.id, val === 'none' ? '' : val)}>
                              <SelectTrigger className="h-6 text-[10px] px-2 rounded-lg bg-secondary/50 border-none w-28"><SelectValue /></SelectTrigger>
                              <SelectContent className="rounded-xl"><SelectItem value="none">无权限组</SelectItem>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={p.role || 'pt'} onValueChange={(val) => handleRoleChange(p.id, val)}>
                              <SelectTrigger className="h-6 text-[10px] px-2 rounded-lg bg-secondary/50 border-none w-28"><SelectValue /></SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="pt">普通用户 (pt)</SelectItem>
                                <SelectItem value="vip">VIP会员 (vip)</SelectItem>
                                <SelectItem value="svip">SVIP会员 (svip)</SelectItem>
                                <SelectItem value="vvip">VVIP会员 (vvip)</SelectItem>
                                <SelectItem value="admin">管理员 (admin)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={p.is_banned ? "destructive" : "outline"} className={cn("text-[10px] py-0 cursor-pointer w-fit", !p.is_banned && "text-green-500 bg-green-50")} onClick={() => handleToggleBan(p)}>
                              {p.is_banned ? '封禁' : '正常'}
                            </Badge>
                            <Badge variant={p.is_blacklisted ? "destructive" : "secondary"} className={cn("text-[10px] py-0 cursor-pointer w-fit", p.is_blacklisted && "bg-red-500 text-white")} onClick={() => handleToggleBlacklist(p)}>
                              {p.is_blacklisted ? '黑名单' : '非黑名单'}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className="text-[10px] py-0 cursor-pointer w-fit border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                              onClick={() => handleAllocateSpecialId(p)}
                            >
                              分配靓号
                            </Badge>
                            <Badge 
                              variant={p.is_debug_enabled ? "default" : "outline"} 
                              className={cn("text-[10px] py-0 cursor-pointer w-fit", p.is_debug_enabled ? "bg-purple-500 text-white" : "text-purple-500 bg-purple-50")}
                              onClick={() => handleToggleDebug(p)}
                            >
                              {p.is_debug_enabled ? '调试中' : '调试关'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-500" onClick={() => openUserHistory(p)} title="访问历史">
                              <History className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500" onClick={() => handleRepairAuth(p)} title="修复 Auth 账号">
                              <ShieldCheck className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-500" onClick={() => handleResetPassword(p)} title="重置密码">
                              <Key className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openProfileEditor(p)}><Edit2 className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => handleDeleteUser(p)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <EnhancedPagination
                currentPage={page}
                totalPages={Math.ceil(total / limit)}
                onPageChange={setPage}
                pageSize={limit}
                onPageSizeChange={(s) => { setLimit(s); setPage(0); }}
                totalItems={total}
                className="border-t-0 shadow-none bg-transparent"
              />
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="mt-0 space-y-4">
            <PermissionGroupsSection />
          </TabsContent>

          <TabsContent value="blacklist" className="mt-0 space-y-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldAlert className="w-4 h-4 text-destructive" />
                <span>共有 {blacklistTotal} 名用户在黑名单中。黑名单用户将无法访问网站核心功能。</span>
              </div>
              <div className="relative w-full md:w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="搜索黑名单用户..." className="pl-9 rounded-xl h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>

            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>联系方式</TableHead>
                    <TableHead>加入时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : blacklistProfiles.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="py-20 text-center text-muted-foreground">黑名单为空</TableCell></TableRow>
                  ) : (
                    blacklistProfiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center font-bold text-destructive">
                              {p.avatar_url ? <ProtectedMedia src={p.avatar_url} type="image" className="w-full h-full object-contain rounded-full" ruleKey="后" /> : p.username?.charAt(0)}
                            </div>
                            <div className="font-bold">{p.username}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{p.email || '无邮箱'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatBeijingTime(p.updated_at || '')}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs font-bold" onClick={() => handleToggleBlacklist(p)}>
                            移除黑名单
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <EnhancedPagination
                currentPage={blacklistPage}
                totalPages={Math.ceil(blacklistTotal / limit)}
                onPageChange={setBlacklistPage}
                pageSize={limit}
                onPageSizeChange={(s) => { /* handle s if needed */ }}
                totalItems={blacklistTotal}
                className="border-t-0 shadow-none bg-transparent"
              />
            </Card>
          </TabsContent>

          <TabsContent value="auth" className="mt-0 space-y-6">
            <BatchRepairAuthSection />
            <AuthStrategySection />
            <WxLoginSection />
          </TabsContent>
        </Tabs>

      <Dialog open={!!editingProfile} onOpenChange={(o) => !o && setEditingProfile(null)}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader><DialogTitle>编辑用户信息</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>用户名</Label>
              <Input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>登录邮箱 (Authentication 同步)</Label>
              <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="修改此项将同步更新 Authentication 账号" />
              <p className="text-[10px] text-muted-foreground">注意：修改邮箱后，用户需使用新邮箱登录。系统会自动同步更新认证表。</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>小程序 OpenID</Label>
                <Input value={editForm.mp_openid} onChange={(e) => setEditForm({ ...editForm, mp_openid: e.target.value })} placeholder="小程序用户唯一标识" />
              </div>
              <div className="space-y-2">
                <Label>公众号 OpenID</Label>
                <Input value={editForm.wechat_openid} onChange={(e) => setEditForm({ ...editForm, wechat_openid: e.target.value })} placeholder="微信公众号用户唯一标识" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>积分</Label><Input type="number" value={editForm.points} onChange={(e) => setEditForm({ ...editForm, points: parseInt(e.target.value) || 0 })} /></div>
              <div className="space-y-2"><Label>成长值</Label><Input type="number" value={editForm.exp} onChange={(e) => setEditForm({ ...editForm, exp: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div className="space-y-2">
              <Label>角色权限</Label>
              <Select value={editForm.role} onValueChange={(val) => setEditForm({ ...editForm, role: val })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="pt">普通用户 (pt)</SelectItem>
                  <SelectItem value="vip">VIP会员 (vip)</SelectItem>
                  <SelectItem value="svip">SVIP会员 (svip)</SelectItem>
                  <SelectItem value="vvip">VVIP会员 (vvip)</SelectItem>
                  <SelectItem value="admin">管理员 (admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>写真等级</Label>
              <Select value={editForm.album_level} onValueChange={(val) => setEditForm({ ...editForm, album_level: val })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="pt">普通 (pt)</SelectItem>
                  <SelectItem value="vip">VIP专属</SelectItem>
                  <SelectItem value="svip">SVIP专属</SelectItem>
                  <SelectItem value="vvip">VVIP专属</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-dashed">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">调试模式</Label>
                <div className="text-[10px] text-muted-foreground">开启后将静默抓取该用户的操作日志与回放</div>
              </div>
              <Switch 
                checked={editForm.is_debug_enabled} 
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_debug_enabled: checked })} 
              />
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="rounded-xl" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingProfile(null)}>取消</Button>
            <Button onClick={handleSaveProfile} disabled={isSaving}>保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader><DialogTitle>添加新用户</DialogTitle><DialogDescription>手动创建一个新用户，并设置其初始密码。</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>用户名</Label>
              <Input value={addUserForm.username} onChange={(e) => setAddUserForm({ ...addUserForm, username: e.target.value })} placeholder="例如：新用户" />
            </div>
            <div className="space-y-2">
              <Label>邮箱</Label>
              <Input type="email" value={addUserForm.email} onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })} placeholder="例如：user@example.com" />
            </div>
            <div className="space-y-2">
              <Label>初始密码</Label>
              <Input type="password" value={addUserForm.password} onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })} placeholder="输入初始登录密码" />
            </div>
            <div className="space-y-2">
              <Label>权限角色</Label>
              <Select value={addUserForm.role} onValueChange={(val) => setAddUserForm({ ...addUserForm, role: val })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="pt">普通用户 (pt)</SelectItem>
                  <SelectItem value="vip">VIP会员 (vip)</SelectItem>
                  <SelectItem value="svip">SVIP会员 (svip)</SelectItem>
                  <SelectItem value="vvip">VVIP会员 (vvip)</SelectItem>
                  <SelectItem value="admin">管理员 (admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddUserOpen(false)}>取消</Button>
            <Button onClick={handleAddUser} disabled={loading}>确认添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 访问历史对话框 */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-3xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <History className="w-5 h-5 text-indigo-500" />
              图集访问历史：{selectedUserForHistory?.username || "用户"}
            </DialogTitle>
            <DialogDescription>
              显示用户在今日图集中的访问记录及密码历史
            </DialogDescription>
          </DialogHeader>
          <div className="p-6">
            <ScrollArea className="h-[400px] w-full pr-4">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
              ) : userHistory.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-2xl">
                  <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                    <Eye className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="font-bold">暂无访问历史记录</p>
                  <p className="text-xs opacity-60 mt-1">该用户尚未在图集中生成或使用过密码</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 px-4 py-2 bg-muted/50 rounded-xl text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    <div>日期</div>
                    <div>密码</div>
                    <div>来源</div>
                    <div>状态</div>
                  </div>
                  {userHistory.map((h: any, idx) => {
                    const isExpired = new Date(h.expires_at) < new Date();
                    return (
                      <div key={idx} className="grid grid-cols-4 gap-4 px-4 py-3 bg-muted/10 rounded-xl items-center border border-transparent hover:border-indigo-100 transition-colors">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-bold">{h.post_date}</span>
                        </div>
                        <div className="font-mono text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-lg w-fit">
                          {h.password}
                        </div>
                        <div>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            {h.source === "wechat" ? "微信公众号" : h.source === "backend" ? "后台生成" : "小程序"}
                          </Badge>
                        </div>
                        <div>
                          <Badge variant={isExpired ? "secondary" : "default"} className={cn("text-[9px] px-1.5 py-0", !isExpired && "bg-green-500 hover:bg-green-600")}>
                            {isExpired ? "已过期" : "有效"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter className="p-6 bg-muted/20">
            <Button onClick={() => setIsHistoryOpen(false)} className="rounded-xl font-bold">关闭窗口</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>

  );
}
