import React, { useState, useEffect } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Trash2, Zap, CircleCheckBig, Search, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@/types';
import { cn } from '@/lib/utils';

export function SpecialIdsManagementSection() {
  const { user, refreshProfile } = useAuth();
  const { logAction } = useAdminLogger('special-ids');
  const [specialIds, setSpecialIds] = useState<any[]>([]);
  const [ranks, setRanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddIdOpen, setIsAddIdOpen] = useState(false);
  const [idForm, setIdForm] = useState({ digital_id: '', price: 100, required_rank: '' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'available' | 'sold'>('all');

  const [isUserSelectorOpen, setIsUserSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [currentSpecialId, setCurrentSpecialId] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: ids }, { data: ranksData }] = await Promise.all([
        api.getSpecialDigitalIds(),
        api.getRanks()
      ]);
      setSpecialIds(ids || []);
      setRanks(ranksData || []);
      if (ranksData && ranksData.length > 0) {
        setIdForm(prev => ({ ...prev, required_rank: ranksData[0].name }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpecialId = async () => {
    if (!idForm.digital_id || idForm.digital_id.length < 4) {
      return toast.error('请输入至少 4 位数字的靓号');
    }
    setSaving(true);
    try {
      const { error } = await api.createSpecialDigitalId(idForm);
      if (error) throw error;
      toast.success('靓号已添加');
      setIsAddIdOpen(false);
      setIdForm({ digital_id: '', price: 100, required_rank: ranks[0]?.name || '' });
      fetchData();
      logAction('添加靓号', idForm);
    } catch (error: any) {
      toast.error(`添加失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSpecialId = async (id: string) => {
    const confirmed = await confirmAsync('确定删除此靓号？', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { error } = await api.deleteSpecialDigitalId(id);
      if (error) throw error;
      toast.success('靓号已删除');
      fetchData();
      logAction('删除靓号', { id });
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery) return;
    setSearching(true);
    try {
      const { data } = await api.searchProfiles(searchQuery);
      setFoundUsers(data || []);
      if (data && data.length === 1) {
        setSelectedUser(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleGrantSpecialId = async (specialIdObj: any) => {
    if (specialIdObj.is_sold) return toast.error('该靓号已被占用，不可重复授予');
    setCurrentSpecialId(specialIdObj);
    setSearchQuery('');
    setFoundUsers([]);
    setSelectedUser(null);
    setIsUserSelectorOpen(true);
  };

  const executeGrant = async () => {
    if (!selectedUser || !currentSpecialId) return;
    
    const confirmed = await confirmAsync(`确定要将靓号 ${currentSpecialId.digital_id} 授予用户 ${selectedUser.username} 吗？`);
    if (!confirmed) return;

    setSaving(true);
    try {
      // 1. 更新用户信息中的靓号
      const { error: profileError } = await api.updateProfile(selectedUser.id, { digital_id: currentSpecialId.digital_id });
      if (profileError) throw profileError;

      // 2. 将靓号状态设为已售
      const { error: idError } = await api.updateSpecialDigitalId(currentSpecialId.id, { is_sold: true });
      if (idError) throw idError;

      toast.success(`成功授予靓号 ${currentSpecialId.digital_id} 给用户 ${selectedUser.username}`);
      logAction('授予靓号', { digital_id: currentSpecialId.digital_id, userId: selectedUser.id });
      
      if (user && selectedUser.id === user.id) {
        await refreshProfile();
      }
      
      setIsUserSelectorOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error('授予失败: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">正在加载靓号管理...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">靓号池管理</h2>
          <p className="text-muted-foreground mt-1">管理可供用户使用积分购买的特殊数字 ID</p>
        </div>
        <Button onClick={() => setIsAddIdOpen(true)} className="rounded-xl font-bold bg-primary shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" />
          添加靓号
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">靓号列表</CardTitle>
            <div className="flex bg-background p-1 rounded-xl border border-border/50">
              <Button 
                variant={filter === 'all' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setFilter('all')}
                className="rounded-lg h-8 text-[10px] font-bold px-3"
              >
                全部 ({specialIds.length})
              </Button>
              <Button 
                variant={filter === 'available' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setFilter('available')}
                className="rounded-lg h-8 text-[10px] font-bold px-3"
              >
                待售 ({specialIds.filter(i => !i.is_sold).length})
              </Button>
              <Button 
                variant={filter === 'sold' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setFilter('sold')}
                className="rounded-lg h-8 text-[10px] font-bold px-3"
              >
                已授予 ({specialIds.filter(i => i.is_sold).length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/10 border-b border-border/10">
                <tr>
                  <th className="px-6 py-4 font-black text-xs text-muted-foreground uppercase tracking-widest">数字 ID</th>
                  <th className="px-6 py-4 font-black text-xs text-muted-foreground uppercase tracking-widest">价格 / 等级</th>
                  <th className="px-6 py-4 font-black text-xs text-muted-foreground uppercase tracking-widest">状态 / 归属</th>
                  <th className="px-6 py-4 font-black text-xs text-muted-foreground uppercase tracking-widest text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {specialIds.filter(item => {
                  if (filter === 'available') return !item.is_sold;
                  if (filter === 'sold') return item.is_sold;
                  return true;
                }).length > 0 ? specialIds.filter(item => {
                  if (filter === 'available') return !item.is_sold;
                  if (filter === 'sold') return item.is_sold;
                  return true;
                }).map((item) => (
                  <tr key={item.id} className="group hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-2xl font-black font-mono tracking-widest text-primary">
                        {item.digital_id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="rounded-lg font-bold text-orange-600 w-fit text-[10px]">
                          {item.price} 积分
                        </Badge>
                        <span className="text-[10px] font-bold text-muted-foreground ml-1">{item.required_rank}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.is_sold ? (
                        <div className="flex flex-col gap-1">
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] w-fit">
                            <CircleCheckBig className="w-3 h-3 mr-1" />
                            已授予
                          </Badge>
                          {item.profiles?.username && (
                            <span className="text-[10px] font-bold text-muted-foreground ml-1">
                              👤 {item.profiles.username}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="rounded-lg text-[10px] text-muted-foreground bg-muted/20">
                          待售
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!item.is_sold && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleGrantSpecialId(item)}
                            className="rounded-xl text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8 text-xs font-bold"
                          >
                            <Zap className="w-3 h-3 mr-1" />
                            授予
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteSpecialId(item.id)}
                          className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-muted-foreground">
                      <Zap className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="font-bold text-sm">暂无符合条件的靓号</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 添加靓号对话框 */}
      <Dialog open={isAddIdOpen} onOpenChange={setIsAddIdOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">添加新靓号</DialogTitle>
            <DialogDescription>配置一个新的特殊数字 ID 供用户购买</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold">数字 ID <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="例如: 666666" 
                value={idForm.digital_id} 
                onChange={e => setIdForm({...idForm, digital_id: e.target.value})}
                className="rounded-xl h-11 font-mono text-lg tracking-widest"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">价格 (积分)</Label>
              <Input 
                type="number" 
                value={idForm.price} 
                onChange={e => setIdForm({...idForm, price: parseInt(e.target.value) || 100})}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">所需等级</Label>
              <Select value={idForm.required_rank} onValueChange={val => setIdForm({...idForm, required_rank: val})}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder="选择等级门槛" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {ranks.map(r => (
                    <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex flex-row gap-2">
            <Button variant="ghost" onClick={() => setIsAddIdOpen(false)} className="flex-1 rounded-xl h-11">取消</Button>
            <Button onClick={handleAddSpecialId} disabled={saving} className="flex-1 rounded-xl h-11 bg-primary font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 用户选择对话框 */}
      <Dialog open={isUserSelectorOpen} onOpenChange={setIsUserSelectorOpen}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">选择要授予的用户</DialogTitle>
            <DialogDescription>为靓号 {currentSpecialId?.digital_id} 匹配正确的归属人</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input 
                placeholder="搜索用户名/邮箱/ID..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchUsers()}
                className="rounded-xl h-11"
              />
              <Button onClick={handleSearchUsers} disabled={searching} className="rounded-xl h-11 px-4">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            <ScrollArea className="h-[300px] rounded-2xl border border-border/40 p-2">
              <div className="space-y-2">
                {foundUsers.length > 0 ? foundUsers.map((u) => (
                  <div 
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-2",
                      selectedUser?.id === u.id ? "border-primary bg-primary/5 shadow-sm" : "border-transparent hover:bg-muted/50"
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {u.avatar_url ? (
                        <img referrerPolicy="no-referrer" src={u.avatar_url} alt={u.username} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">{u.username?.[0]}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm flex items-center gap-1.5">
                        {u.username}
                        {u.digital_id && <Badge variant="secondary" className="text-[10px] h-4 px-1">{u.digital_id}</Badge>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{u.email || '无邮箱'}</div>
                    </div>
                    {selectedUser?.id === u.id && <UserCheck className="w-5 h-5 text-primary" />}
                  </div>
                )) : searchQuery && !searching ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">未找到相关用户</div>
                ) : (
                  <div className="py-10 text-center text-muted-foreground text-sm italic">请输入关键词进行搜索</div>
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="flex flex-row gap-2">
            <Button variant="ghost" onClick={() => setIsUserSelectorOpen(false)} className="flex-1 rounded-xl h-11">取消</Button>
            <Button 
              onClick={executeGrant} 
              disabled={!selectedUser || saving} 
              className="flex-1 rounded-xl h-11 bg-primary font-bold shadow-lg shadow-primary/20"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              确认授予
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
