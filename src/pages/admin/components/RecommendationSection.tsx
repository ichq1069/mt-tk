import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, RefreshCw, Sliders, Info, Loader2, X, Hash, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function RecommendationSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [allTags, setAllTags] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const { data } = await api.getTagManagementStats();
      setAllTags(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await api.getRecommendationSettings();
    if (error) {
      toast.error('加载推荐设置失败');
    } else {
      setSettings(data?.weights || {});
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await api.updateRecommendationSettings(settings);
    if (error) {
      toast.error('保存设置失败');
    } else {
      toast.success('推荐设置已更新');
    }
    setSaving(false);
  };

  const handleRunCalculation = async () => {
    setCalculating(true);
    try {
      const { error } = await api.triggerHeatCalculation();
      if (error) throw error;
      toast.success('热度重算任务已启动');
    } catch (e: any) {
      toast.error('任务启动失败: ' + e.message);
    } finally {
      setCalculating(false);
    }
  };

  const updateWeight = (key: string, value: string) => {
    const numValue = parseFloat(value);
    setSettings((prev: any) => ({ ...prev, [key]: isNaN(numValue) ? 0 : numValue }));
  };

  const toggleExcludedTag = (tagId: string) => {
    setSettings((prev: any) => {
      const current = prev.excluded_discovery_tag_ids || [];
      if (current.includes(tagId)) {
        return { ...prev, excluded_discovery_tag_ids: current.filter((id: string) => id !== tagId) };
      } else {
        return { ...prev, excluded_discovery_tag_ids: [...current, tagId] };
      }
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  const excludedTagIds = settings?.excluded_discovery_tag_ids || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              <CardTitle className="text-xl font-black">推荐算法与展示设置</CardTitle>
            </div>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl shadow-lg shadow-primary/20">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              保存设置
            </Button>
          </div>
          <CardDescription className="font-bold text-slate-500">
            调整推荐算法权重及控制探索页内容的展示过滤
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1">
              <Sliders className="w-4 h-4" />
              排序权重参数
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">浏览量权重 (View Weight)</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  className="rounded-xl border-slate-200 h-11"
                  value={settings?.view_weight || 0} 
                  onChange={(e) => updateWeight('view_weight', e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground font-medium">每增加一次浏览对热度的加成</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">收藏量权重 (Favorite Weight)</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  className="rounded-xl border-slate-200 h-11"
                  value={settings?.favorite_weight || 0} 
                  onChange={(e) => updateWeight('favorite_weight', e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground font-medium">每增加一次收藏对热度的加成</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">时间衰减因子 (Time Decay Factor)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  max="1"
                  min="0"
                  className="rounded-xl border-slate-200 h-11"
                  value={settings?.time_decay_factor || 0} 
                  onChange={(e) => updateWeight('time_decay_factor', e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground font-medium">随时间推移热度衰减的速度 (0-1，越小衰减越快)</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">人工加权权重 (Manual Boost Weight)</Label>
                <Input 
                  type="number" 
                  step="1"
                  className="rounded-xl border-slate-200 h-11"
                  value={settings?.manual_boost_weight || 0} 
                  onChange={(e) => updateWeight('manual_boost_weight', e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground font-medium">管理员手动提升热度时的基础分值</p>
              </div>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black uppercase tracking-widest text-rose-500 flex items-center gap-2">
                <EyeOff className="w-4 h-4" />
                探索页标签屏蔽设置
              </h3>
              <Badge variant="outline" className="rounded-full px-3 py-1 bg-rose-50 border-rose-100 text-rose-600 font-bold text-[10px]">
                已屏蔽 {excludedTagIds.length} 个
              </Badge>
            </div>
            <CardDescription className="text-[11px] font-bold text-slate-500 px-1">
              被选中的标签将不会在探索页（发现页）的标签云中显示，且对应的作品会被隐藏（仅对探索页有效）。
            </CardDescription>

            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 min-h-[120px] mx-1">
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => {
                  const isExcluded = excludedTagIds.includes(tag.id);
                  return (
                    <Badge
                      key={tag.id}
                      variant={isExcluded ? 'destructive' : 'outline'}
                      className={cn(
                        "px-3 py-1.5 rounded-xl cursor-pointer transition-all gap-1.5 select-none text-xs border-2",
                        isExcluded 
                          ? "bg-rose-500 text-white shadow-lg shadow-rose-200 border-rose-500" 
                          : "bg-white hover:bg-slate-100 border-slate-200 text-slate-600 font-bold"
                      )}
                      onClick={() => toggleExcludedTag(tag.id)}
                    >
                      <Hash className={cn("w-3 h-3", isExcluded ? "text-rose-100" : "text-slate-400")} />
                      <span>{tag.name}</span>
                      {isExcluded && <X className="w-3 h-3 ml-1" />}
                    </Badge>
                  );
                })}
                {allTags.length === 0 && (
                  <div className="w-full flex flex-col items-center justify-center py-8 opacity-40">
                    <Hash className="w-8 h-8 mb-2" />
                    <p className="text-xs font-bold">暂无可用标签</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="p-5 bg-primary/5 rounded-[2rem] border border-primary/10 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between mt-4">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Info className="w-6 h-6 text-primary" />
              </div>
              <div className="text-sm space-y-1">
                <p className="font-black text-primary text-base">热度计算公式</p>
                <div className="bg-white/50 px-3 py-2 rounded-xl border border-primary/5">
                  <p className="text-muted-foreground text-[10px] sm:text-[11px] font-black break-all uppercase tracking-tighter opacity-70">
                    Score = (Views × V_Weight + Favorites × F_Weight + Manual_Heat) × Time_Factor ^ (Hours_Old)
                  </p>
                </div>
                <p className="text-[11px] text-primary/60 font-bold mt-2 leading-relaxed">
                  提示：系统每小时会自动运行一次该公式。屏蔽标签设置实时生效，无需等待重算。
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRunCalculation} 
              disabled={calculating}
              className="w-full md:w-auto shrink-0 bg-white hover:bg-primary hover:text-white font-black text-xs h-11 px-6 rounded-2xl border-primary/20 shadow-sm transition-all duration-300"
            >
              {calculating ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              立即手动重算全站热度
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
