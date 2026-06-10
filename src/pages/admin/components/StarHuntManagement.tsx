import React, { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from "framer-motion";
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Edit2, Trash2, Star, TrendingUp, Users, BarChart3, Settings } from 'lucide-react';
import { formatBeijingTime } from '@/lib/utils';
import { EnhancedPagination } from '@/components/common/EnhancedPagination';

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

interface StarHuntActivity {
  id: string;
  name: string;
  description?: string;
  page_paths: string[];
  total_stars: number;
  target_count: number;
  reward_type: 'points' | 'physical' | 'coupon';
  reward_content: any;
  start_at: string;
  end_at?: string;
  star_icon_url?: string;
  bottle_icon_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  probability?: number;
  show_partially?: boolean;
  per_user_max_total?: number;
  per_user_max_daily?: number;
}

export function StarHuntManagement() {
  const [activeTab, setActiveTab] = useState('activities');
  const [activities, setActivities] = useState<StarHuntActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<StarHuntActivity | null>(null);
  const [manualPath, setManualPath] = useState('');
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    page_paths: ['/explore'],
    total_stars: 3,
    target_count: 10,
    reward_type: 'points',
    reward_content: { amount: 50 },
    start_at: new Date().toISOString().slice(0, 16),
    end_at: '',
    star_icon_url: '',
    bottle_icon_url: '',
    is_active: true,
    probability: 1.0,
    show_partially: false,
    per_user_max_total: 1,
    per_user_max_daily: 1
  });

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('star_hunt_activity_configs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setActivities(data || []);
    } catch (e: any) {
      toast.error('获取活动配置失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload = {
        ...formData,
        start_at: new Date(formData.start_at).toISOString(),
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
      };

      if (editingActivity) {
        const { error } = await (supabase
          .from('star_hunt_activity_configs') as any)
          .update(payload)
          .eq('id', editingActivity.id);
        
        if (error) throw error;
        toast.success('活动已更新');
      } else {
        const { error } = await (supabase
          .from('star_hunt_activity_configs') as any)
          .insert([payload]);
        
        if (error) throw error;
        toast.success('活动已创建');
      }
      
      setDialogOpen(false);
      setEditingActivity(null);
      fetchActivities();
    } catch (e: any) {
      toast.error('保存失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个活动吗？这将删除所有相关的收集记录。')) return;
    
    try {
      const { error } = await supabase
        .from('star_hunt_activity_configs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('活动已删除');
      fetchActivities();
    } catch (e: any) {
      toast.error('删除失败: ' + e.message);
    }
  };

  const handleEdit = (activity: StarHuntActivity) => {
    setEditingActivity(activity);
    setFormData({
      name: activity.name,
      description: activity.description || '',
      page_paths: activity.page_paths || [],
      total_stars: activity.total_stars,
      target_count: activity.target_count,
      reward_type: activity.reward_type,
      reward_content: activity.reward_content,
      start_at: new Date(activity.start_at).toISOString().slice(0, 16),
      end_at: activity.end_at ? new Date(activity.end_at).toISOString().slice(0, 16) : '',
      star_icon_url: activity.star_icon_url || '',
      bottle_icon_url: activity.bottle_icon_url || '',
      is_active: activity.is_active,
      probability: activity.probability ?? 1.0,
      show_partially: activity.show_partially ?? false,
      per_user_max_total: activity.per_user_max_total ?? 1,
      per_user_max_daily: activity.per_user_max_daily ?? 1
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingActivity(null);
    setFormData({
      name: '',
      description: '',
      page_paths: ['/explore'],
      total_stars: 3,
      target_count: 10,
      reward_type: 'points',
      reward_content: { amount: 50 },
      start_at: new Date().toISOString().slice(0, 16),
      end_at: '',
      star_icon_url: '',
      bottle_icon_url: '',
      is_active: true,
      probability: 1.0,
      show_partially: false,
      per_user_max_total: 1,
      per_user_max_daily: 1
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

  const handlePreview = () => {
    setPreviewOpen(true);
  };

  const [previewStars, setPreviewStars] = useState<any[]>([]);
  useEffect(() => {
    if (previewOpen) {
      const newStars = [];
      const count = formData.total_stars || 3;
      for (let i = 0; i < count; i++) {
        newStars.push({
          id: i,
          x: Math.random() * 80 + 10,
          y: Math.random() * 80 + 10,
          scale: Math.random() * 0.4 + 0.8,
          rotation: Math.random() * 360,
          opacity: formData.show_partially ? (Math.random() > 0.5 ? 1 : 0.4) : 1
        });
      }
      setPreviewStars(newStars);
    }
  }, [previewOpen, formData.total_stars, formData.show_partially]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Star className="w-7 h-7 text-yellow-500 fill-yellow-500" />
            寻找特控⭐管理
          </h2>
          <p className="text-sm text-muted-foreground mt-1">配置全站特控⭐收集活动与进度管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePreview} className="rounded-xl font-bold">
            <TrendingUp className="w-4 h-4 mr-2" />
            效果预览
          </Button>
          <Button onClick={handleNew} className="rounded-xl px-6 font-bold shadow-lg shadow-primary/20 bg-gradient-to-r from-yellow-500 to-orange-500 border-none">
            <Plus className="w-4 h-4 mr-2" />
            新增活动
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>活动名称</TableHead>
                <TableHead>投放页面</TableHead>
                <TableHead>目标数量</TableHead>
                <TableHead>奖励内容</TableHead>
                <TableHead>活动状态</TableHead>
                <TableHead>有效期</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">暂无活动配置</TableCell>
                </TableRow>
              ) : (
                activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-bold">{activity.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {activity.page_paths?.slice(0, 2).map(p => (
                          <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                        ))}
                        {activity.page_paths?.length > 2 && <Badge variant="outline" className="text-[10px]">+{activity.page_paths.length - 2}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-black text-primary">{activity.target_count}</span> 个
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {activity.reward_type === 'points' && `${activity.reward_content?.amount || 0} 积分`}
                      {activity.reward_type === 'physical' && activity.reward_content?.name}
                      {activity.reward_type === 'coupon' && `优惠券: ${activity.reward_content?.code}`}
                    </TableCell>
                    <TableCell>
                      <Badge className={activity.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}>
                        {activity.is_active ? '进行中' : '已结束'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground tabular-nums">
                      {formatBeijingTime(activity.start_at).slice(5)}
                      {activity.end_at && ` ~ ${formatBeijingTime(activity.end_at).slice(5)}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEdit(activity)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-red-500" onClick={() => handleDelete(activity.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{editingActivity ? '编辑活动' : '创建特控⭐活动'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>活动名称</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：特控星收集大作战"
                />
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={formData.is_active ? 'active' : 'inactive'} onValueChange={(v) => setFormData({ ...formData, is_active: v === 'active' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>活动描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="简述活动内容与规则"
              />
            </div>

            <div className="space-y-2">
              <Label>生效页面 (支持动态路径)</Label>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>每页随机星数量</Label>
                <Input
                  type="number"
                  value={formData.total_stars}
                  onChange={(e) => setFormData({ ...formData, total_stars: parseInt(e.target.value) || 1 })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>单次目标收集总数</Label>
                <Input
                  type="number"
                  value={formData.target_count}
                  onChange={(e) => setFormData({ ...formData, target_count: parseInt(e.target.value) || 10 })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t mt-2">
              <div className="space-y-2">
                <Label className="text-primary font-bold">单人每日完成上限 (次)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.per_user_max_daily}
                  onChange={(e) => setFormData({ ...formData, per_user_max_daily: parseInt(e.target.value) || 0 })}
                  className="rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground">0 为不限制，每完成一次任务即计数一次</p>
              </div>
              <div className="space-y-2">
                <Label className="text-primary font-bold">单人累计完成上限 (次)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.per_user_max_total}
                  onChange={(e) => setFormData({ ...formData, per_user_max_total: parseInt(e.target.value) || 0 })}
                  className="rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground">0 为不限制</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>出现率 (0.0 - 1.0)</Label>
                  <span className="text-xs font-bold text-primary">{Math.round((formData.probability || 0) * 100)}%</span>
                </div>
                <Input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: parseFloat(e.target.value) })}
                  className="h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
              <div className="space-y-2">
                <Label>显示样式</Label>
                <div className="flex items-center space-x-2 h-10 px-3 rounded-xl border border-input bg-background">
                  <input
                    type="checkbox"
                    id="show_partially"
                    checked={formData.show_partially}
                    onChange={(e) => setFormData({ ...formData, show_partially: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="show_partially" className="text-sm font-medium cursor-pointer">

      {/* 效果预览弹窗 */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl bg-slate-900/90 backdrop-blur-xl">
          <div className="relative aspect-video w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950 flex flex-col items-center justify-center p-8">
            <div className="absolute inset-0 overflow-hidden opacity-30">
              <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-primary/20 blur-2xl" />
              <div className="absolute bottom-20 right-20 w-32 h-32 rounded-full bg-blue-500/20 blur-3xl" />
            </div>
            
            <div className="z-10 text-center space-y-4 max-w-md">
              <h3 className="text-3xl font-black text-white">{formData.name || '特控⭐预览'}</h3>
              <p className="text-slate-400 text-sm">模拟星星在页面中的显示效果，星星会随内容滚动且支持透明度随机化。</p>
            </div>

            {/* 模拟星星 */}
            {previewStars.map(star => (
              <motion.div
                key={star.id}
                initial={{ scale: 0 }}
                animate={{ 
                  scale: star.scale, 
                  rotate: star.rotation,
                  y: [0, -15, 0]
                }}
                transition={{ 
                  y: { duration: 3 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" },
                  scale: { duration: 0.5 }
                }}
                className="absolute pointer-events-none"
                style={{ 
                  left: `${star.x}%`, 
                  top: `${star.y}%`,
                  opacity: star.opacity 
                }}
              >
                {formData.star_icon_url ? (
                  <img referrerPolicy="no-referrer" src={formData.star_icon_url} className="w-12 h-12 object-contain" alt="Star" />
                ) : (
                  <div className="p-2 rounded-full bg-yellow-400/20 border border-yellow-400/50 shadow-[0_0_20px_rgba(254,240,138,0.4)]">
                    <Star className="w-10 h-10 text-yellow-500 fill-yellow-500" />
                  </div>
                )}
              </motion.div>
            ))}

            <div className="absolute bottom-6 right-6 z-20">
              <Badge className="bg-white/10 text-white backdrop-blur-md border-white/20 px-4 py-1">
                预览模式: {formData.page_paths?.[0] || '/'}
              </Badge>
            </div>
          </div>
          <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end">
            <Button onClick={() => setPreviewOpen(false)} className="rounded-xl px-8 font-bold">关闭预览</Button>
          </div>
        </DialogContent>
      </Dialog>

                    支持部分显示 (随机透明度/偏移)
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h4 className="font-bold text-sm">奖励配置</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>奖励类型</Label>
                  <Select value={formData.reward_type} onValueChange={(v: any) => setFormData({ ...formData, reward_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="points">积分奖励</SelectItem>
                      <SelectItem value="physical">实物奖励</SelectItem>
                      <SelectItem value="coupon">优惠券</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.reward_type === 'points' && (
                  <div className="space-y-2">
                    <Label>积分数值</Label>
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
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>开始时间</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_at}
                  onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>结束时间 (可选)</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_at}
                  onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>特控⭐图标 (URL)</Label>
                <Input
                  value={formData.star_icon_url}
                  onChange={(e) => setFormData({ ...formData, star_icon_url: e.target.value })}
                  placeholder="留空使用默认星星"
                />
              </div>
              <div className="space-y-2">
                <Label>收集瓶图标 (URL)</Label>
                <Input
                  value={formData.bottle_icon_url}
                  onChange={(e) => setFormData({ ...formData, bottle_icon_url: e.target.value })}
                  placeholder="留空使用默认瓶子"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">取消</Button>
            <Button onClick={handleSave} disabled={loading} className="rounded-xl px-8 font-bold">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              保存活动
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
