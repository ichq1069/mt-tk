import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NativeAd } from '@/components/common/NativeAd';
import { 
  Plus, 
  Trash2, 
  ExternalLink, 
  Image as ImageIcon, 
  Monitor, 
  Clock, 
  Edit,
  Megaphone,
  Save,
  Loader2,
  BarChart3,
  Eye,
  MousePointer,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PLACEMENT_OPTIONS = [
  { value: 'all', label: '全站通用' },
  { value: 'discovery', label: '探索页' },
  { value: 'daily', label: '每日图集' },
  { value: 'albums', label: '写真图集' },
];

const LEVEL_OPTIONS = [
  { value: 'all', label: '所有用户' },
  { value: 'pt', label: '普通用户' },
  { value: 'vip', label: 'VIP会员' },
  { value: 'svip', label: 'SVIP会员' },
  { value: 'vvip', label: 'VVIP会员' },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function AdsSection() {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [adEvents, setAdEvents] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    cta_text: '了解更多',
    cta_url: '',
    type: 'in-feed',
    placements: ['all'],
    target_levels: ['all'],
    display_duration: 5,
    is_active: true,
    start_time: '',
    end_time: '',
    frequency_type: 'always',
    allow_skip: true,
    appearance_probability: 100,
    feed_interval: 10,
    show_once_per_page: false,
    badge_text: '广告位',
    theme_color: '',
    badge_position: 'top-right',
    image_rule: '写-封'
  });

  useEffect(() => {
    fetchAds();
    fetchAdStats();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const { data } = await api.getAllAdsAdmin();
      if (data) setAds(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdStats = async () => {
    try {
      const { data } = await api.getAdStats();
      if (data) setAdEvents(data);
    } catch (e) {
      console.error(e);
    }
  };

  const getAdStatsById = (adId: string) => {
    const events = adEvents.filter(e => e.ad_id === adId);
    const impressions = events.filter(e => e.event_type === 'impression').length;
    const clicks = events.filter(e => e.event_type === 'click').length;
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
    return { impressions, clicks, ctr };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (name: string, value: string) => {
    setFormData(prev => {
      const current = prev[name as keyof typeof prev] as string[];
      if (current.includes(value)) {
        const filtered = current.filter(v => v !== value);
        return { ...prev, [name]: filtered.length > 0 ? filtered : ['all'] };
      } else {
        const newValues = value === 'all' ? ['all'] : [...current.filter(v => v !== 'all'), value];
        return { ...prev, [name]: newValues };
      }
    });
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, is_active: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image_url || !formData.title) {
      toast.error('请填写广告图和标题');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        start_time: formData.start_time ? new Date(formData.start_time).toISOString() : null,
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null
      };

      if (editingAd) {
        const { error } = await api.updateAd(editingAd.id, dataToSave);
        if (error) throw error;
        toast.success('广告已更新');
      } else {
        const { error } = await api.createAd(dataToSave);
        if (error) throw error;
        toast.success('广告已发布');
      }
      setShowAddDialog(false);
      setEditingAd(null);
      resetForm();
      fetchAds();
    } catch (e: any) {
      toast.error('操作失败: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      cta_text: '了解更多',
      cta_url: '',
      type: 'in-feed',
      placements: ['all'],
      target_levels: ['all'],
      display_duration: 5,
      is_active: true,
      start_time: '',
      end_time: '',
      frequency_type: 'always',
      allow_skip: true,
      appearance_probability: 100,
      feed_interval: 10,
      show_once_per_page: false,
      badge_text: '广告位',
      theme_color: '',
      badge_position: 'top-right',
      image_rule: '写-封'
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此广告吗？')) return;
    const { error } = await api.deleteAd(id);
    if (error) {
      toast.error('删除失败');
    } else {
      toast.success('已删除');
      fetchAds();
    }
  };

  const handleEdit = (ad: any) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      description: ad.description || '',
      image_url: ad.image_url,
      cta_text: ad.cta_text || '了解更多',
      cta_url: ad.cta_url || '',
      type: ad.type,
      placements: ad.placements || ['all'],
      target_levels: ad.target_levels || ['all'],
      display_duration: ad.display_duration || 5,
      is_active: ad.is_active,
      start_time: ad.start_time ? format(new Date(ad.start_time), "yyyy-MM-dd'T'HH:mm") : '',
      end_time: ad.end_time ? format(new Date(ad.end_time), "yyyy-MM-dd'T'HH:mm") : '',
      frequency_type: ad.frequency_type || 'always',
      allow_skip: ad.allow_skip !== false,
      appearance_probability: ad.appearance_probability || 100,
      feed_interval: ad.feed_interval || 10,
      show_once_per_page: ad.show_once_per_page || false,
      badge_text: ad.badge_text || '广告位',
      theme_color: ad.theme_color || '',
      badge_position: ad.badge_position || 'top-right',
      image_rule: ad.image_rule || '写-封'
    });
    setShowAddDialog(true);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'splash': return '开屏广告';
      case 'popup': return '弹窗广告';
      case 'in-feed': return '内插广告';
      default: return type;
    }
  };

  const getPlacementLabel = (placement: string) => {
    if (placement === '/tags' || placement === 'tags' || placement === 'discovery') return '探索页';
    return PLACEMENT_OPTIONS.find(p => p.value === placement)?.label || placement;
  };

  // Statistics calculations
  const totalImpressions = adEvents.filter(e => e.event_type === 'impression').length;
  const totalClicks = adEvents.filter(e => e.event_type === 'click').length;
  const overallCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  const adPerformanceData = ads.map(ad => {
    const stats = getAdStatsById(ad.id);
    return {
      name: ad.title.substring(0, 10) + '...',
      展示: stats.impressions,
      点击: stats.clicks
    };
  }).slice(0, 5);

  const typeDistribution = ads.reduce((acc: any[], ad) => {
    const existing = acc.find(item => item.name === getTypeLabel(ad.type));
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: getTypeLabel(ad.type), value: 1 });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            广告位管理
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            设置广告展示的位置、媒体地址和跳转链接
          </p>
        </div>
        <Button onClick={() => { resetForm(); setEditingAd(null); setShowAddDialog(true); }} className="rounded-xl font-bold px-6 gap-2">
          <Plus className="w-4 h-4" />
          新增广告位
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 rounded-2xl">
          <TabsTrigger value="list" className="rounded-xl">广告列表</TabsTrigger>
          <TabsTrigger value="stats" className="rounded-xl">数据统计</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-xl">事件流水</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative min-h-[400px]">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-80 bg-slate-100 animate-pulse rounded-[2.5rem]" />
              ))
            ) : ads.length === 0 ? (
              <div className="col-span-full py-32 text-center space-y-4">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                  <Megaphone className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold">暂无广告位配置，点击上方按钮新增</p>
              </div>
            ) : (
              ads.map((ad) => {
                const stats = getAdStatsById(ad.id);
                return (
                  <Card key={ad.id} className={cn(
                    "rounded-[2.5rem] border-none shadow-sm overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 relative",
                    !ad.is_active && "opacity-60 grayscale"
                  )}>
                    <div className="relative aspect-[16/9] bg-slate-100">
                      <img referrerPolicy="no-referrer" src={ad.image_url} alt={ad.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-30">
                        <Button size="icon" variant="secondary" className="rounded-full w-9 h-9 bg-white/90 backdrop-blur-md shadow-xl" onClick={() => handleEdit(ad)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="destructive" className="rounded-full w-9 h-9 shadow-xl" onClick={() => handleDelete(ad.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                        <Badge className="bg-black/60 backdrop-blur-md border-none text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">
                          {getTypeLabel(ad.type)}
                        </Badge>
                        {ad.placements?.slice(0, 2).map((p: string) => (
                          <Badge key={p} className="bg-primary/90 backdrop-blur-md border-none text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">
                            {getPlacementLabel(p)}
                          </Badge>
                        ))}
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                    </div>

                    <CardContent className="p-6 bg-white relative space-y-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-black text-lg text-slate-800 line-clamp-1 flex-1">{ad.title}</h3>
                        <Switch 
                          checked={ad.is_active} 
                          onCheckedChange={async (checked) => {
                            await api.updateAd(ad.id, { is_active: checked });
                            fetchAds();
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px] font-medium">{ad.description || '暂无详细描述信息'}</p>
                      
                      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-1">
                            <Eye className="w-3 h-3" />
                            展示
                          </div>
                          <div className="text-sm font-black text-slate-700">{stats.impressions}</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-1">
                            <MousePointer className="w-3 h-3" />
                            点击
                          </div>
                          <div className="text-sm font-black text-primary">{stats.clicks}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-slate-400 mb-1">CTR</div>
                          <div className="text-sm font-black text-green-600">{stats.ctr}%</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            {ad.type === 'in-feed' ? `每 ${ad.feed_interval || 10} 项` : `${ad.display_duration}S`}
                          </div>
                          {ad.appearance_probability < 100 && (
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500">
                              <Sparkles className="w-3.5 h-3.5" />
                              {ad.appearance_probability}% 概率
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[9px] font-black px-2 gap-1 rounded-lg border-primary/20 text-primary hover:bg-primary/10"
                            onClick={() => {
                              const path = ad.placements?.includes('all') ? '/' : 
                                          ad.placements?.includes('discovery') ? '/discovery' :
                                          ad.placements?.includes('daily') ? '/daily' : '/';
                              window.open(path, '_blank');
                            }}
                          >
                            <ExternalLink className="w-3 h-3" />
                            预览
                          </Button>
                          {ad.cta_url && (
                            <a href={ad.cta_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-black text-primary hover:underline">
                              {ad.cta_text}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-[2.5rem] border-none shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <Eye className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">总展示次数</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{totalImpressions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                    <MousePointer className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">总点击次数</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{totalClicks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">整体点击率</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{overallCTR}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-[2.5rem] border-none shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-black mb-6">广告效果对比 (Top 5)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={adPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ paddingTop: 20 }} />
                    <Bar dataKey="展示" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="点击" fill="#10b981" radius={[8, 8, 0, 0]} />
        <TabsContent value="logs" className="mt-6">
          <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="pl-6">广告标题</TableHead>
                    <TableHead>事件类型</TableHead>
                    <TableHead>用户标识 (OpenID)</TableHead>
                    <TableHead>用户ID</TableHead>
                    <TableHead className="pr-6">触发时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center text-muted-foreground">暂无事件记录</TableCell>
                    </TableRow>
                  ) : (
                    adEvents.slice(0, 100).map((event) => {
                      const ad = ads.find(a => a.id === event.ad_id);
                      return (
                        <TableRow key={event.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="pl-6 font-bold truncate max-w-[200px]">{ad?.title || '未知广告'}</TableCell>
                          <TableCell>
                            <Badge variant={event.event_type === 'click' ? 'default' : 'secondary'} className={cn("text-[10px]", event.event_type === 'click' && "bg-green-500 hover:bg-green-600")}>
                              {event.event_type === 'click' ? '点击' : '曝光'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {event.openid ? (
                              <span title={event.openid}>{event.openid.slice(0, 8)}...{event.openid.slice(-4)}</span>
                            ) : (
                              <span className="text-muted-foreground italic">匿名/未记录</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {event.user_id ? event.user_id.slice(0, 8) : '-'}
                          </TableCell>
                          <TableCell className="pr-6 text-[10px] text-muted-foreground">
                            {format(new Date(event.created_at), 'yyyy-MM-dd HH:mm:ss')}
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

                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-black mb-6">广告类型分布</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={typeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto rounded-[2.5rem] p-0 border-none shadow-2xl">
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-center">{editingAd ? '编辑广告位' : '新增广告位'}</DialogTitle>
              <DialogDescription className="text-center">设置广告展示的位置、媒体地址和跳转链接</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">广告类型</Label>
                  <Select value={formData.type} onValueChange={(v) => handleSelectChange('type', v)}>
                    <SelectTrigger className="rounded-2xl h-12 bg-slate-50 border-none focus:ring-2 ring-primary/20">
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="splash">开屏广告 (启动全屏)</SelectItem>
                      <SelectItem value="popup">弹窗广告 (首页展示)</SelectItem>
                      <SelectItem value="in-feed">内插广告 (列表流内)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">
                    {formData.type === 'in-feed' ? '展示权重' : '显示时长 (秒)'}
                  </Label>
                  {formData.type === 'in-feed' ? (
                    <div className="flex items-center gap-3 px-4 h-12 bg-slate-50 rounded-2xl">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold">由插入间隔决定</span>
                    </div>
                  ) : (
                    <Input 
                      type="number" 
                      name="display_duration"
                      value={formData.display_duration}
                      onChange={handleInputChange}
                      className="rounded-2xl h-12 bg-slate-50 border-none focus:ring-2 ring-primary/20"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">展示场景 (可多选)</Label>
                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl">
                  {PLACEMENT_OPTIONS.map(opt => (
                    <Badge
                      key={opt.value}
                      variant={formData.placements.includes(opt.value) ? 'default' : 'outline'}
                      className="cursor-pointer px-4 py-2 rounded-xl transition-all"
                      onClick={() => handleMultiSelectChange('placements', opt.value)}
                    >
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">目标用户等级 (可多选)</Label>
                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl">
                  {LEVEL_OPTIONS.map(opt => (
                    <Badge
                      key={opt.value}
                      variant={formData.target_levels.includes(opt.value) ? 'default' : 'outline'}
                      className="cursor-pointer px-4 py-2 rounded-xl transition-all"
                      onClick={() => handleMultiSelectChange('target_levels', opt.value)}
                    >
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">广告图片地址</Label>
                <Input 
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleInputChange}
                  placeholder="https://..."
                  className="rounded-2xl h-12 bg-slate-50 border-none focus:ring-2 ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">主标题内容</Label>
                <Input 
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="填写吸引人的标题"
                  className="rounded-2xl h-12 bg-slate-50 border-none focus:ring-2 ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">广告描述/详情</Label>
                <Textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="详情内容..."
                  className="rounded-2xl min-h-[100px] bg-slate-50 border-none focus:ring-2 ring-primary/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">按钮文本</Label>
                  <Input 
                    name="cta_text"
                    value={formData.cta_text}
                    onChange={handleInputChange}
                    className="rounded-2xl h-12 bg-slate-50 border-none focus:ring-2 ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">跳转链接 (可选)</Label>
                  <Input 
                    name="cta_url"
                    value={formData.cta_url}
                    onChange={handleInputChange}
                    placeholder="https://..."
                    className="rounded-2xl h-12 bg-slate-50 border-none focus:ring-2 ring-primary/20"
                  />
                </div>
              </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">标签文本 (DIY)</Label>
                   <Input 
                     name="badge_text"
                     value={formData.badge_text}
                     onChange={handleInputChange}
                     placeholder="例如: 广告位、推荐"
                     className="rounded-2xl h-12 bg-slate-50 border-none focus:ring-2 ring-primary/20"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">主题颜色 (DIY)</Label>
                   <Input 
                     name="theme_color"
                     value={formData.theme_color}
                     onChange={handleInputChange}
                     placeholder="例如: #ff0000"
                     className="rounded-2xl h-12 bg-slate-50 border-none focus:ring-2 ring-primary/20"
                   />
                 </div>
               </div>

               <div className="space-y-2">
                 <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">标签位置 (DIY)</Label>
                 <Select value={formData.badge_position} onValueChange={(v) => handleSelectChange('badge_position', v)}>
                   <SelectTrigger className="rounded-2xl h-12 bg-slate-50 border-none focus:ring-2 ring-primary/20">
                     <SelectValue placeholder="选择标签显示位置" />
                   </SelectTrigger>
                   <SelectContent className="rounded-2xl">
                     <SelectItem value="top-left">左上角 (Top-Left)</SelectItem>
                     <SelectItem value="top-right">右上角 (Top-Right)</SelectItem>
                     <SelectItem value="bottom-left">左下角 (Bottom-Left)</SelectItem>
                     <SelectItem value="bottom-right">右下角 (Bottom-Right)</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

               <div className="space-y-2">
                 <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">图片处理规则 (优化性能)</Label>
                 <Select value={formData.image_rule} onValueChange={(v) => handleSelectChange('image_rule', v)}>
                   <SelectTrigger className="rounded-2xl h-12 bg-slate-50 border-none focus:ring-2 ring-primary/20">
                     <SelectValue placeholder="选择处理规则" />
                   </SelectTrigger>
                   <SelectContent className="rounded-2xl">
                     <SelectItem value="写-封">写真封面 (小图)</SelectItem>
                     <SelectItem value="首瀑">瀑布流 (中图)</SelectItem>
                     <SelectItem value="大图">高清原图 (加载较慢)</SelectItem>
                     <SelectItem value="毫秒级优化">毫秒级优化 (平衡清晰度与速度)</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

              {(formData.type === 'splash' || formData.type === 'popup') && (
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">展示频率</Label>
                  <Select value={formData.frequency_type} onValueChange={(v) => handleSelectChange('frequency_type', v)}>
                    <SelectTrigger className="rounded-2xl h-12 bg-slate-50 border-none focus:ring-2 ring-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="always">每次访问 (启动即显)</SelectItem>
                      <SelectItem value="session">每会话一次 (关闭网页重开即显)</SelectItem>
                      <SelectItem value="daily">每天一次 (24小时内仅显示一次)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.type === 'in-feed' && (
                <>
                  <div className="space-y-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-sm">出现概率</Label>
                      <span className="text-lg font-black text-primary">{formData.appearance_probability}%</span>
                    </div>
                    <Slider 
                      value={[formData.appearance_probability]} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, appearance_probability: v[0] }))}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-[10px] text-muted-foreground">控制广告在列表流中的出现概率，100% 表示必定出现</p>
                  </div>

                  <div className="space-y-3 p-4 bg-blue-50 rounded-2xl border border-blue-200">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-sm">插入间隔</Label>
                      <span className="text-lg font-black text-primary">每 {formData.feed_interval} 项</span>
                    </div>
                    <Slider 
                      value={[formData.feed_interval]} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, feed_interval: v[0] }))}
                      min={3}
                      max={30}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-[10px] text-muted-foreground">设置广告在列表流中每隔多少个内容项出现一次</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-200">
                    <div className="space-y-1">
                      <Label className="font-bold text-sm">单页仅显示一次</Label>
                      <p className="text-[10px] text-muted-foreground">开启后，同一用户在当前页面只会看到一次该广告</p>
                    </div>
                    <Checkbox 
                      checked={formData.show_once_per_page} 
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_once_per_page: !!checked }))}
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">上线时间</Label>
                  <Input 
                    type="datetime-local" 
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    className="rounded-2xl h-12 bg-slate-50 border-none focus:ring-2 ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">下线时间</Label>
                  <Input 
                    type="datetime-local" 
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    className="rounded-2xl h-12 bg-slate-50 border-none focus:ring-2 ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl">
                <Label className="font-bold">投放状态</Label>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest">{formData.is_active ? '开启中' : '已暂停'}</span>
                  <Switch checked={formData.is_active} onCheckedChange={handleSwitchChange} />
                </div>
              </div>

              {(formData.type === 'splash' || formData.type === 'popup') && (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <Label className="font-bold">允许跳过/关闭</Label>
                  <Switch 
                    checked={formData.allow_skip} 
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_skip: checked }))} 
                  />
                </div>
              )}

              <div className="space-y-4 pt-6">
                <div className="flex items-center gap-2 px-1">
                  <Eye className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-black uppercase tracking-widest text-foreground/80">样式实时预览</h4>
                </div>
                
                <div className="p-6 bg-slate-100/50 rounded-[2.5rem] border border-dashed border-slate-300">
                  {formData.type === 'in-feed' ? (
                    <div className="max-w-sm mx-auto bg-white rounded-3xl overflow-hidden shadow-sm">
                      <NativeAd id="preview" {...(formData as any)} />
                    </div>
                  ) : formData.type === 'popup' ? (
                    <div className="max-w-xs mx-auto aspect-[4/5] relative rounded-[2rem] overflow-hidden shadow-2xl">
                      <img referrerPolicy="no-referrer" src={formData.image_url || 'https://via.placeholder.com/400x500'} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-6 flex flex-col justify-end text-white">
                        <Badge className="w-fit mb-2 bg-primary border-none" style={formData.theme_color ? { backgroundColor: formData.theme_color } : {}}>{formData.badge_text || '精彩推荐'}</Badge>
                        <h3 className="text-xl font-bold">{formData.title || '广告标题'}</h3>
                        <p className="text-xs opacity-80 mt-1">{formData.description || '广告描述内容'}</p>
                        <Button type="button" onClick={() => {}} className="w-full mt-4 h-10 rounded-xl bg-white text-black font-black hover:bg-slate-100">{formData.cta_text}</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-xs mx-auto aspect-[9/16] relative rounded-[2rem] overflow-hidden shadow-2xl bg-black">
                      <img referrerPolicy="no-referrer" src={formData.image_url || 'https://via.placeholder.com/400x700'} className="w-full h-full object-cover" />
                      <div className="absolute top-4 left-4">
                        <Badge 
                          className="bg-primary border-none font-black text-[10px] tracking-widest px-2 h-5 rounded-lg uppercase shadow-lg"
                          style={formData.theme_color ? { backgroundColor: formData.theme_color } : {}}
                        >
                          {formData.badge_text || '广告'}
                        </Badge>
                      </div>
                      <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-full font-bold">跳过 {formData.display_duration}s</div>
                      <div className="absolute bottom-12 inset-x-0 p-6 text-center text-white space-y-2">
                        <h3 className="text-xl font-black drop-shadow-lg">{formData.title || '广告标题'}</h3>
                        <p className="text-xs opacity-80">{formData.description || '描述信息'}</p>
                        <Button type="button" onClick={() => {}} className="mt-4 rounded-full bg-white text-black font-black px-8">{formData.cta_text}</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-6">
                <Button type="submit" disabled={saving} className="w-full h-14 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 bg-primary hover:brightness-110 transition-all gap-2">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  确定发布广告
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
