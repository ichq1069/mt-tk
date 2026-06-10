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
import { Loader2, Plus, Trash2, Trophy, Edit, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminLogger } from '@/hooks/useAdminLogger';

import { SystemText } from '@/components/common/KeywordText';

export function RanksManagementSection() {
  const { logAction } = useAdminLogger('ranks');
  const [ranks, setRanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRank, setEditingRank] = useState<any | null>(null);
  const [rankForm, setRankForm] = useState({ name: '', min_exp: 0, icon: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (editingRank) {
      setRankForm({ 
        name: editingRank.name || '', 
        min_exp: editingRank.min_exp || 0, 
        icon: editingRank.icon || '' 
      });
    } else {
      setRankForm({ name: '', min_exp: 0, icon: '' });
    }
  }, [editingRank]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ranksData, error } = await api.getRanks();
      if (error) {
        console.error('获取等级数据失败:', error);
        toast.error(`加载失败: ${error.message}`);
      }
      setRanks(ranksData || []);
    } catch (error: any) {
      console.error('获取等级数据异常:', error);
      toast.error(`加载异常: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRank = async () => {
    if (!rankForm.name) {
      return toast.error('请输入等级名称');
    }
    setSaving(true);
    try {
      let error;
      if (editingRank) {
        const { error: err } = await api.updateRank(editingRank.id, rankForm);
        error = err;
      } else {
        const { error: err } = await api.createRank(rankForm);
        error = err;
      }
      
      if (error) throw error;
      toast.success(editingRank ? '等级已更新' : '等级已添加');
      setIsDialogOpen(false);
      setEditingRank(null);
      setRankForm({ name: '', min_exp: 0, icon: '' });
      fetchData();
      logAction(editingRank ? '更新等级' : '添加等级', { ...rankForm, id: editingRank?.id });
    } catch (error: any) {
      toast.error(`保存失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRank = async (id: string) => {
    const confirmed = await confirmAsync('确定删除此等级？', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { error } = await api.deleteRank(id);
      if (error) throw error;
      toast.success('等级已删除');
      fetchData();
      logAction('删除等级', { id });
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">正在加载等级管理...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">等级划分设置</h2>
          <p className="text-muted-foreground mt-1">配置用户等级体系与<SystemText>成长值</SystemText>门槛</p>
        </div>
        <Button onClick={() => { setEditingRank(null); setIsDialogOpen(true); }} className="rounded-xl font-bold bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20">
          <Plus className="w-4 h-4 mr-2" />
          添加等级
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ranks.length > 0 ? ranks.map((rank) => (
          <Card key={rank.id} className="border-none shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 font-black text-2xl shrink-0">
                  {rank.icon || '🏆'}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setEditingRank(rank);
                      setIsDialogOpen(true);
                    }}
                    className="rounded-xl text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeleteRank(rank.id)}
                    className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <h3 className="font-black text-xl mb-2">{rank.name}</h3>
              <Badge variant="secondary" className="rounded-lg text-xs font-bold">
                需要 {rank.min_exp} <SystemText>成长值</SystemText>
              </Badge>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full text-center py-20 text-muted-foreground">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="font-bold">暂无等级，点击右上角添加</p>
          </div>
        )}
      </div>

      {/* 等级对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{editingRank ? '编辑等级' : '添加新等级'}</DialogTitle>
            <DialogDescription>配置用户等级与<SystemText>成长值</SystemText>门槛</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold">等级名称 <span className="text-red-500">*</span></Label>
              <Input 
                placeholder="例如: 筑基期3层" 
                value={rankForm.name} 
                onChange={e => setRankForm({...rankForm, name: e.target.value})}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">最低<SystemText>成长值</SystemText>要求 (EXP)</Label>
              <Input 
                type="number" 
                value={rankForm.min_exp} 
                onChange={e => setRankForm({...rankForm, min_exp: parseInt(e.target.value) || 0})}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">图标 (Emoji)</Label>
              <Input 
                placeholder="例如: 🏆" 
                value={rankForm.icon} 
                onChange={e => setRankForm({...rankForm, icon: e.target.value})}
                className="rounded-xl h-11 text-2xl"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row gap-2">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="flex-1 rounded-xl h-11">取消</Button>
            <Button onClick={handleSaveRank} disabled={saving} className="flex-1 rounded-xl h-11 bg-amber-500 hover:bg-amber-600 font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {editingRank ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
