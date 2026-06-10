import React, { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Edit2, Trash2, Gift, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { formatBeijingTime } from '@/lib/utils';
import { EnhancedPagination } from '@/components/common/EnhancedPagination';
import { confirmAsync } from '@/components/ui/confirm-dialog';

interface EasterEgg {
  id: string;
  name: string;
  reward_type: 'points' | 'physical' | 'coupon';
  reward_content: any;
  trigger_condition: any;
  icon_url?: string;
  message?: string;
  start_at?: string;
  end_at?: string;
  max_winners: number;
  max_wins_per_user: number;
  current_winners: number;
  status: 'active' | 'paused' | 'ended';
  page_paths: string[];
  stay_duration: number;
  created_at: string;
  updated_at: string;
}

interface EasterEggRecord {
  id: string;
  egg_id: string;
  user_id: string;
  reward_type: string;
  reward_content: any;
  claim_status: 'pending' | 'claimed' | 'shipped';
  created_at: string;
  profiles?: { username: string };
  easter_egg_configs?: { name: string };
}


const SYSTEM_ROUTES = [
  { label: '探索页 (/)', value: '/' },
  { label: '探索页 (/explore)', value: '/explore' },
  { label: '个人中心 (/profile)', value: '/profile' },
  { label: '图集列表 (/album)', value: '/album' },
  { label: '图集详情 (/album/:id)', value: '/album/:id' },
  { label: '极速整理 (/gallery)', value: '/gallery' },
  { label: '排行榜 (/ranking)', value: '/ranking' },
  { label: '签到中心 (/checkin)', value: '/checkin' },
  { label: '消息通知 (/notifications)', value: '/notifications' },
  { label: '媒体详情 (/media/:id)', value: '/media/:id' },
  { label: '作品上传 (/upload)', value: '/upload' },
  { label: '分类浏览 (/category)', value: '/category' },
  { label: '勋章展馆 (/medals)', value: '/medals' },
  { label: '积分商城 (/shop)', value: '/shop' },
  { label: '邀请管理 (/invite)', value: '/invite' },
  { label: '设置中心 (/settings)', value: '/settings' },
];

export function EasterEggManagement() {
  const [activeTab, setActiveTab] = useState('configs');
  const [eggs, setEggs] = useState<EasterEgg[]>([]);
  const [records, setRecords] = useState<EasterEggRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingEgg, setEditingEgg] = useState<EasterEgg | null>(null);
  const [manualPath, setManualPath] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [formData, setFormData] = useState<any>({
    name: '',
    reward_type: 'points' as 'points' | 'physical' | 'coupon',
    reward_content: { amount: 0 },
    trigger_condition: { 
      type: 'stay', 
      probability: 0.1,
      target_event: '',
      target_count: 0
    },
    icon_url: '',
    message: '恭喜您获得彩蛋奖励！',
    start_at: '',
    end_at: '',
    max_winners: 100,
    max_wins_per_user: 1,
    status: 'active' as 'active' | 'paused' | 'ended',
    page_paths: [],
    stay_duration: 0
  });

  useEffect(() => {
    if (activeTab === 'configs') fetchEggs();
    if (activeTab === 'records') fetchRecords();
  }, [activeTab, page]);

  const fetchEggs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('easter_egg_configs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setEggs(data || []);
    } catch (e: any) {
      toast.error('获取彩蛋配置失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error, count } = await supabase
        .from('easter_egg_records')
        .select('*, profiles(username), easter_egg_configs(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);
      
      if (error) throw error;
      setRecords(data || []);
      setTotal(count || 0);
    } catch (e: any) {
      toast.error('获取中奖记录失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const payload = {
        ...formData,
        start_at: formData.start_at || null,
        end_at: formData.end_at || null,
      };

      if (editingEgg) {
        const { error } = await (supabase
          .from('easter_egg_configs') as any)
          .update(payload)
          .eq('id', editingEgg.id);
        
        if (error) throw error;
        toast.success('彩蛋配置已更新');
      } else {
        const { error } = await (supabase
          .from('easter_egg_configs') as any)
          .insert([payload]);
        
        if (error) throw error;
        toast.success('彩蛋配置已创建');
      }
      
      setDialogOpen(false);
      setEditingEgg(null);
      fetchEggs();
    } catch (e: any) {
      toast.error('保存失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAsync('确定要删除这个彩蛋配置吗？'))) return;
    
    try {
      const { error } = await supabase
        .from('easter_egg_configs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('彩蛋配置已删除');
      fetchEggs();
    } catch (e: any) {
      toast.error('删除失败: ' + e.message);
    }
  };

  const handleEdit = (egg: EasterEgg) => {
    setEditingEgg(egg);
    setFormData({
      name: egg.name,
      reward_type: egg.reward_type,
      reward_content: egg.reward_content,
      trigger_condition: {
        type: egg.trigger_condition?.type || 'stay',
        probability: egg.trigger_condition?.probability || 0.1,
        target_event: egg.trigger_condition?.target_event || '',
        target_count: egg.trigger_condition?.target_count || 0
      },
      icon_url: egg.icon_url || '',
      message: egg.message || '恭喜您获得彩蛋奖励！',
      start_at: egg.start_at || '',
      end_at: egg.end_at || '',
      max_winners: egg.max_winners,
      max_wins_per_user: egg.max_wins_per_user || 1,
      status: egg.status,
      page_paths: egg.page_paths || [],
      stay_duration: egg.stay_duration || 0
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingEgg(null);
    setFormData({
      name: '',
      reward_type: 'points',
      reward_content: { amount: 0 },
      trigger_condition: { 
        type: 'stay', 
        probability: 0.1,
        target_event: '',
        target_count: 0
      },
      icon_url: '',
      message: '恭喜您获得彩蛋奖励！',
      start_at: '',
      end_at: '',
      max_winners: 100,
      max_wins_per_user: 1,
      status: 'active',
      page_paths: [],
      stay_duration: 0
    });
    setDialogOpen(true);
  };

  const addPath = () => {
    const val = manualPath.trim();
    if (val && !formData.page_paths.includes(val)) {
      setFormData({ ...formData, page_paths: [...formData.page_paths, val] });
      setManualPath('');
    }
  };

  const updateClaimStatus = async (recordId: string, status: 'pending' | 'claimed' | 'shipped') => {
    try {
      const { error } = await (supabase
        .from('easter_egg_records') as any)
        .update({ claim_status: status })
        .eq('id', recordId);
      
      if (error) throw error;
      toast.success('领取状态已更新');
      fetchRecords();
    } catch (e: any) {
      toast.error('更新失败: ' + e.message);
    }
  };

  const getRewardTypeLabel = (type: string) => {
    const map: any = { points: '虚拟积分', physical: '实物', coupon: '优惠券' };
    return map[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const map: any = {
      active: { label: '进行中', className: 'bg-green-500/20 text-green-500' },
      paused: { label: '已暂停', className: 'bg-yellow-500/20 text-yellow-500' },
      ended: { label: '已结束', className: 'bg-gray-500/20 text-gray-500' }
    };
    const { label, className } = map[status] || { label: status, className: '' };
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">全局彩蛋管理</h2>
          <p className="text-sm text-muted-foreground mt-1">配置全站彩蛋投放与中奖记录管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)} className="rounded-xl font-bold">
            效果预览
          </Button>
          <Button onClick={handleNew} className="rounded-xl px-6 font-bold shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            新增彩蛋
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="configs" className="rounded-lg px-6 font-bold">彩蛋配置</TabsTrigger>
          <TabsTrigger value="records" className="rounded-lg px-6 font-bold">中奖记录</TabsTrigger>
          <TabsTrigger value="stats" className="rounded-lg px-6 font-bold">数据统计</TabsTrigger>
        </TabsList>

        <TabsContent value="configs" className="pt-4">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : eggs.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">暂无彩蛋配置</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>彩蛋名称</TableHead>
                      <TableHead>奖励类型</TableHead>
                      <TableHead>奖励内容</TableHead>
                      <TableHead>触发条件</TableHead>
                      <TableHead>生效页面</TableHead>
                      <TableHead>中奖统计</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eggs.map((egg) => (
                      <TableRow key={egg.id}>
                        <TableCell className="font-medium">{egg.name}</TableCell>
                        <TableCell>{getRewardTypeLabel(egg.reward_type)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {egg.reward_type === 'points' && `${egg.reward_content?.amount || 0} 积分`}
                          {egg.reward_type === 'physical' && egg.reward_content?.name}
                          {egg.reward_type === 'coupon' && egg.reward_content?.code}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {egg.trigger_condition?.type === 'stay' && `停留触发 (${egg.stay_duration || 0}s)`}
                          {egg.trigger_condition?.type === 'click' && `点击触发 (${egg.trigger_condition?.target_event || '未设置'})`}
                          {egg.trigger_condition?.type === 'navigation' && `翻页触发 (≥${egg.trigger_condition?.target_count || 0}次)`}
                          {egg.trigger_condition?.type === 'favorites' && `收藏触发 (≥${egg.trigger_condition?.target_count || 0}次)`}
                          {` / 概率: ${(egg.trigger_condition?.probability * 100).toFixed(1)}%`}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {!egg.page_paths || egg.page_paths.length === 0 ? '全站' : egg.page_paths.join(', ')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold">{egg.current_winners} / {egg.max_winners}</span>
                            <span className="text-[10px] text-muted-foreground">单人上限: {egg.max_wins_per_user || 1}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(egg.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(egg)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(egg.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="records" className="pt-4">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : records.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">暂无中奖记录</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>彩蛋名称</TableHead>
                        <TableHead>中奖用户</TableHead>
                        <TableHead>奖励类型</TableHead>
                        <TableHead>奖励内容</TableHead>
                        <TableHead>中奖时间</TableHead>
                        <TableHead>领取状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.easter_egg_configs?.name || '未知'}</TableCell>
                          <TableCell>{record.profiles?.username || '未知用户'}</TableCell>
                          <TableCell>{getRewardTypeLabel(record.reward_type)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {record.reward_type === 'points' && `${record.reward_content?.amount || 0} 积分`}
                            {record.reward_type === 'physical' && record.reward_content?.name}
                            {record.reward_type === 'coupon' && record.reward_content?.code}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatBeijingTime(record.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              record.claim_status === 'claimed' ? 'bg-green-500/20 text-green-500' :
                              record.claim_status === 'shipped' ? 'bg-blue-500/20 text-blue-500' :
                              'bg-yellow-500/20 text-yellow-500'
                            }>
                              {record.claim_status === 'claimed' ? '已到账' : record.claim_status === 'shipped' ? '已发货' : '待领取'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.reward_type !== 'points' && (
                              <Select value={record.claim_status} onValueChange={(v: any) => updateClaimStatus(record.id, v)}>
                                <SelectTrigger className="h-8 w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">待领取</SelectItem>
                                  <SelectItem value="claimed">已领取</SelectItem>
                                  <SelectItem value="shipped">已发货</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {total > limit && (
                  <EnhancedPagination
                    currentPage={page}
                    totalPages={Math.ceil(total / limit)}
                    onPageChange={setPage}
                    pageSize={limit}
                    onPageSizeChange={() => {}}
                    totalItems={total}
                    showPageSizeSelector={false}
                    className="bg-transparent border-none p-4"
                  />
                )}
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" />
                  总彩蛋数
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-3xl font-black text-primary">{eggs.length}</div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-500" />
                  总中奖人数
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-3xl font-black text-green-500">
                  {eggs.reduce((sum, egg) => sum + egg.current_winners, 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                  平均中奖率
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-3xl font-black text-orange-500">
                  {eggs.length > 0 ? ((eggs.reduce((sum, egg) => sum + egg.current_winners, 0) / eggs.reduce((sum, egg) => sum + egg.max_winners, 0)) * 100).toFixed(1) : 0}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEgg ? '编辑彩蛋配置' : '新增彩蛋配置'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>彩蛋名称</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：新春福袋"
              />
            </div>

            <div className="space-y-2">
              <Label>奖励类型</Label>
              <Select value={formData.reward_type} onValueChange={(v: any) => setFormData({ ...formData, reward_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="points">虚拟积分</SelectItem>
                  <SelectItem value="physical">实物</SelectItem>
                  <SelectItem value="coupon">优惠券</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.reward_type === 'points' && (
              <div className="space-y-2">
                <Label>积分数量</Label>
                <Input
                  type="number"
                  value={formData.reward_content.amount || 0}
                  onChange={(e) => setFormData({ ...formData, reward_content: { amount: parseInt(e.target.value) || 0 } })}
                />
              </div>
            )}

            {formData.reward_type === 'physical' && (
              <div className="space-y-2">
                <Label>实物名称</Label>
                <Input
                  value={formData.reward_content?.name || ''}
                  onChange={(e) => setFormData({ ...formData, reward_content: { ...formData.reward_content, name: e.target.value } })}
                  placeholder="例如：定制马克杯"
                />
              </div>
            )}

            {formData.reward_type === 'coupon' && (
              <div className="space-y-2">
                <Label>优惠券代码</Label>
                <Input
                  value={formData.reward_content?.code || ''}
                  onChange={(e) => setFormData({ ...formData, reward_content: { ...formData.reward_content, code: e.target.value } })}
                  placeholder="例如：SPRING2026"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>触发类型</Label>
              <Select 
                value={formData.trigger_condition?.type || 'stay'} 
                onValueChange={(v: any) => setFormData({ 
                  ...formData, 
                  trigger_condition: { ...formData.trigger_condition, type: v },
                  stay_duration: v === 'stay' ? formData.stay_duration : 0
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择触发方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stay">页面停留 (Stay)</SelectItem>
                  <SelectItem value="click">按钮点击 (Click)</SelectItem>
                  <SelectItem value="navigation">连续翻页 (Navigation)</SelectItem>
                  <SelectItem value="favorites">收藏达标 (Favorites)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.trigger_condition?.type === 'stay' && (
              <div className="space-y-2">
                <Label>页面停留时长 (秒)</Label>
                <Input
                  type="number"
                  value={formData.stay_duration}
                  onChange={(e) => setFormData({ ...formData, stay_duration: parseInt(e.target.value) || 0 })}
                  placeholder="用户在该页面（或查看图片时）停留多久后触发检查"
                />
              </div>
            )}

            {formData.trigger_condition?.type === 'click' && (
              <div className="space-y-2">
                <Label>目标事件名称 (Event Name)</Label>
                <Input
                  value={formData.trigger_condition?.target_event || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    trigger_condition: { ...formData.trigger_condition, target_event: e.target.value } 
                  })}
                  placeholder="例如：click_reward_button"
                />
                <p className="text-[10px] text-muted-foreground italic">前端需分发名为此字符串的自定义事件</p>
              </div>
            )}

            {(formData.trigger_condition?.type === 'navigation' || formData.trigger_condition?.type === 'favorites') && (
              <div className="space-y-2">
                <Label>{formData.trigger_condition?.type === 'navigation' ? '目标翻页次数' : '目标收藏总数'}</Label>
                <Input
                  type="number"
                  value={formData.trigger_condition?.target_count || 0}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    trigger_condition: { ...formData.trigger_condition, target_count: parseInt(e.target.value) || 0 } 
                  })}
                  placeholder="达到此数量后触发检查"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>触发概率 (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={(formData.trigger_condition?.probability || 0.1) * 100}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  trigger_condition: { ...formData.trigger_condition, probability: parseFloat(e.target.value) / 100 || 0.1 } 
                })}
              />
            </div>

            <div className="space-y-2">
              <Label>中奖提示文案</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="恭喜您获得彩蛋奖励！"
              />
            </div>

            <div className="space-y-2">
              <Label>中奖上限 (总计)</Label>
              <Input
                type="number"
                value={formData.max_winners}
                onChange={(e) => setFormData({ ...formData, max_winners: parseInt(e.target.value) || 100 })}
              />
            </div>

            <div className="space-y-2">
              <Label>单人中奖上限</Label>
              <Input
                type="number"
                value={formData.max_wins_per_user}
                onChange={(e) => setFormData({ ...formData, max_wins_per_user: parseInt(e.target.value) || 1 })}
                placeholder="每个用户最多可中奖次数"
              />
            </div>

            <div className="space-y-2">
              <Label>生效页面 (支持带参数路径如 /album/:id)</Label>
              <div className="flex flex-wrap gap-2 mb-2 min-h-[40px] p-2 rounded-xl bg-muted/30 border border-dashed border-muted-foreground/20">
                {formData.page_paths?.length === 0 && <span className="text-xs text-muted-foreground italic">全站生效</span>}
                {formData.page_paths?.map((path: string) => (
                  <Badge key={path} variant="secondary" className="flex items-center gap-1 pr-1 py-1 rounded-lg">
                    {path}
                    <button onClick={() => setFormData({ 
                      ...formData, 
                      page_paths: formData.page_paths.filter((p: string) => p !== path) 
                    })} className="hover:bg-red-500/20 p-0.5 rounded">
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Select onValueChange={(v) => {
                  if (v && !formData.page_paths.includes(v)) {
                    setFormData({ ...formData, page_paths: [...formData.page_paths, v] });
                  }
                }}>
                  <SelectTrigger className="flex-1 rounded-xl">
                    <SelectValue placeholder="从常用路径选择" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {SYSTEM_ROUTES.map(route => (
                      <SelectItem key={route.value} value={route.value} className="rounded-lg">{route.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-[1.5] gap-1">
                  <Input 
                    value={manualPath}
                    onChange={(e) => setManualPath(e.target.value)}
                    placeholder="手动输入路径 (e.g. /custom)" 
                    className="rounded-xl"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addPath();
                        e.preventDefault();
                      }
                    }}
                  />
                  <Button type="button" size="sm" onClick={addPath} className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 border-none shrink-0">
                    确定
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 italic px-1">
                支持动态路径匹配，如 /album/:id 匹配所有图集页。
              </p>
            </div>

            <div className="space-y-2">
              <Label>开始时间</Label>
              <Input
                type="datetime-local"
                value={formData.start_at ? new Date(formData.start_at).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>结束时间</Label>
              <Input
                type="datetime-local"
                value={formData.end_at ? new Date(formData.end_at).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 bg-background pt-2 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">取消</Button>
            <Button onClick={handleSave} disabled={loading} className="rounded-xl px-8 font-bold">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 效果预览弹窗 */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl bg-white dark:bg-slate-900">
          <div className="p-8 space-y-6 text-center">
            <div className="flex justify-center">
              <div className="relative">
                {formData.icon_url ? (
                  <img referrerPolicy="no-referrer" src={formData.icon_url} className="w-24 h-24 object-contain animate-bounce" alt="Egg" />
                ) : (
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-xl shadow-primary/20 animate-bounce">
                    <Gift className="w-12 h-12 text-white" />
                  </div>
                )}
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  NEW!
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-foreground">彩蛋中奖啦！</h3>
              <p className="text-muted-foreground text-sm px-4">{formData.message || '恭喜您获得奖励'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/50 border border-muted-foreground/10">
              <div className="text-xs text-muted-foreground mb-1">获得奖励</div>
              <div className="text-xl font-bold text-primary">
                {formData.reward_type === 'points' && `${formData.reward_content?.amount || 0} 虚拟积分`}
                {formData.reward_type === 'physical' && formData.reward_content?.name}
                {formData.reward_type === 'coupon' && `优惠券: ${formData.reward_content?.code}`}
              </div>
            </div>

            <Button onClick={() => setPreviewOpen(false)} className="w-full rounded-2xl h-12 font-bold shadow-lg shadow-primary/20">
              太棒了，立即领取
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
