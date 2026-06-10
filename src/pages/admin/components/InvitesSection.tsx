import React, { useState, useEffect } from 'react';
import { cn, formatBeijingTime } from '@/lib/utils';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { RedemptionCode, PermissionGroup, Profile, RedemptionLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from "sonner";
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { 
  Loader2, Trash2, Plus, Copy, Share2, Users, Key, Calendar, 
  CircleCheckBig, CircleX, RefreshCw, UserPlus, Filter, List
} from "lucide-react";

export function InvitesSection() {
  const { logAction } = useAdminLogger('invites');
  const [codes, setCodes] = useState<(RedemptionCode & { creator?: Profile })[]>([]);
  const [logs, setLogs] = useState<RedemptionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [activeTab, setActiveTab] = useState('list');
  const [newCode, setNewCode] = useState({
    code: '',
    value: '', // 用于存储绑定的 group_id
    max_uses: 1,
    expires_at: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. 获取所有邀请码
      const { data: codeData } = await supabase
        .from('redemption_codes')
        .select('*, profiles:created_by(username)')
        .eq('type', 'invite')
        .order('created_at', { ascending: false });
      
      setCodes((codeData || []) as any);

      // 2. 获取权限组列表
      const { data: groupData } = await supabase
        .from('permission_groups')
        .select('*')
        .order('name');
      setGroups(groupData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await api.getRedemptionLogs(0, 100);
      if (error) throw error;
      // 过滤只显示邀请类型的日志
      setLogs(data.filter((l: any) => l.redemption_codes?.type === 'invite'));
    } catch (e: any) {
      toast.error('获取明细失败: ' + e.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  const handleGenerateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(prev => ({ ...prev, code: result }));
  };

  const handleCreate = async () => {
    if (!newCode.code) return toast.error('请生成或输入邀请码');
    
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await api.createRedemptionCode({
        code: newCode.code,
        type: 'invite',
        value: newCode.value || null,
        max_uses: newCode.max_uses,
        expires_at: newCode.expires_at || null,
        created_by: user?.id
      });

      if (error) throw error;
      toast.success('邀请码创建成功');
      setIsCreateOpen(false);
      fetchData();
      setNewCode({ code: '', value: '', max_uses: 1, expires_at: '' });
    } catch (e: any) {
      toast.error(`创建失败: ${e.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAsync('确定要删除此邀请码吗？', { variant: 'destructive' });
    if (!confirmed) return;
    const { error } = await api.deleteRedemptionCode(id);
    if (!error) {
      toast.success('邀请码已删除');
      fetchData();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">邀请管理</h2>
          <p className="text-sm text-muted-foreground mt-1">管理系统生成的邀请码，可绑定特定的权限等级</p>
        </div>
        <Button onClick={() => { handleGenerateCode(); setIsCreateOpen(true); }} className="rounded-xl font-bold">
          <Plus className="w-4 h-4 mr-2" />
          生成邀请码
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2 rounded-2xl bg-muted/50 p-1">
          <TabsTrigger value="list" className="rounded-xl h-10 gap-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Key className="w-4 h-4" />
            邀请码列表
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-xl h-10 gap-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <List className="w-4 h-4" />
            使用明细
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" />
                    邀请码列表
                  </CardTitle>
                  <CardDescription>所有系统及用户生成的邀请码记录</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={fetchData} disabled={loading}>
                  <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">邀请码</TableHead>
                    <TableHead>绑定等级</TableHead>
                    <TableHead>使用情况</TableHead>
                    <TableHead>创建者</TableHead>
                    <TableHead>过期时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right pr-6">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && codes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-40 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground/30" />
                      </TableCell>
                    </TableRow>
                  ) : codes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                        暂无邀请码记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    codes.map((code) => {
                      const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
                      const isUsedUp = code.max_uses > 0 && (code.used_count || 0) >= code.max_uses;
                      const isActive = !isExpired && !isUsedUp;
                      const targetGroup = groups.find(g => g.id === code.value);

                      return (
                        <TableRow key={code.id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="pl-6 font-mono font-bold text-primary">
                            <div className="flex items-center gap-2">
                              {code.code}
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(code.code)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {targetGroup ? (
                              <Badge variant="secondary" className="rounded-lg bg-primary/10 text-primary border-none font-bold">
                                {targetGroup.name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">普通权限</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold">{code.used_count || 0} / {code.max_uses === 0 ? '∞' : code.max_uses}</span>
                              <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary" 
                                  style={{ width: `${code.max_uses === 0 ? 0 : Math.min(100, ((code.used_count || 0) / code.max_uses) * 100)}%` }} 
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-medium">{(code as any).profiles?.username || '系统'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {code.expires_at ? formatBeijingTime(code.expires_at) : '永不过期'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {isActive ? (
                              <Badge className="bg-green-500/10 text-green-600 border-none rounded-lg flex items-center w-fit gap-1">
                                <CircleCheckBig className="w-3 h-3" /> 有效
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-400 border-red-100 rounded-lg flex items-center w-fit gap-1">
                                <CircleX className="w-3 h-3" /> {isExpired ? '已过期' : '已用完'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(code.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <List className="w-5 h-5 text-primary" />
                    使用明细
                  </CardTitle>
                  <CardDescription>所有邀请码的使用记录明细</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={fetchLogs} disabled={loadingLogs}>
                  <RefreshCw className={cn("w-4 h-4", loadingLogs && "animate-spin")} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">邀请码</TableHead>
                    <TableHead>使用者ID/账号</TableHead>
                    <TableHead>使用时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="pr-6">关联用户</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLogs && logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-40 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground/30" />
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                        暂无使用记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="pl-6 font-mono font-bold text-primary">
                          {log.redemption_codes?.code}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{log.profiles?.username || '未知'}</span>
                            <span className="text-[10px] text-muted-foreground">{log.user_id}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatBeijingTime(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-500/10 text-green-600 border-none rounded-lg">
                            已使用
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-6">
                          <span className="text-xs font-medium">{log.profiles?.email || 'N/A'}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>生成新邀请码</DialogTitle>
            <DialogDescription>生成一个新的邀请码，并设置其可用的权限组及使用限制</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>邀请码内容</Label>
              <div className="flex gap-2">
                <Input 
                  value={newCode.code} 
                  onChange={e => setNewCode({...newCode, code: e.target.value.toUpperCase()})}
                  placeholder="请输入或生成邀请码"
                  className="rounded-xl font-mono uppercase"
                />
                <Button variant="outline" onClick={handleGenerateCode} className="rounded-xl">
                  随机
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>绑定权限等级 (可选)</Label>
              <Select value={newCode.value} onValueChange={val => setNewCode({...newCode, value: val})}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="默认权限组" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">默认权限组</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground px-1">
                使用此码注册的用户将自动分配至该权限组
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>最大使用次数</Label>
                <Input 
                  type="number" 
                  value={newCode.max_uses} 
                  onChange={e => setNewCode({...newCode, max_uses: parseInt(e.target.value) || 0})}
                  className="rounded-xl"
                  placeholder="0 表示不限制"
                />
              </div>
              <div className="space-y-2">
                <Label>过期时间 (可选)</Label>
                <Input 
                  type="date" 
                  value={newCode.expires_at} 
                  onChange={e => setNewCode({...newCode, expires_at: e.target.value})}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="rounded-xl">取消</Button>
            <Button onClick={handleCreate} disabled={creating} className="rounded-xl px-8 font-bold">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              生成并发布
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
