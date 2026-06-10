import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ContentCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TagCloud } from '@/components/TagCloud';
import { NativeAd } from '@/components/common/NativeAd';
import { AdCard } from '@/components/home/AdCard';
import { useAds } from '@/contexts/AdContext';
import { Sparkles, Compass, Layers, Search, Hash, X, RefreshCw, ArrowLeft, SlidersHorizontal, Folder, Image as ImageIcon, Video, Eye, Heart } from 'lucide-react';
import { cn, getRainbowColor } from '@/lib/utils';
import { homePageState, resetHomeState } from '@/lib/home-state';
import { PullToRefresh } from '@/components/common/PullToRefresh';
import { motion, AnimatePresence } from 'framer-motion';

function DiscoveryPreview({ tagIds, categoryId }: { tagIds: string[], categoryId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      if (tagIds.length === 0 && categoryId === 'all') {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const { data } = await api.getApprovedMedia(0, 6, undefined, 'all', categoryId, 'popular', tagIds);
        setItems(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [tagIds, categoryId]);

  if (tagIds.length === 0 && categoryId === 'all') return null;

  return (
    <section className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground/80">
            预计匹配结果 ({items.length}{items.length >= 6 ? '+' : ''})
          </h4>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 px-1">
          {items.map((item) => (
            <div key={item.id} className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted border border-border/50">
              <img 
                src={item.thumbnail_url || item.url} 
                alt={item.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{item.view_count || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  <span>{item.favorite_count || 0}</span>
                </div>
              </div>
              {item.type === 'video' && (
                <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md rounded-full p-1">
                  <Video className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-muted/10 border border-dashed border-border/50 rounded-3xl py-12 flex flex-col items-center justify-center text-center px-4 mx-1">
          <Search className="w-8 h-8 text-muted-foreground/30 mb-3" />
          <p className="text-xs font-bold text-muted-foreground">未找到匹配的内容，请尝试更换标签</p>
        </div>
      )}
    </section>
  );
}

export default function Discovery() {
  const { profile } = useAuth();
  const { getAdsByPlacement, refreshAds } = useAds();
  const navigate = useNavigate();
  const [allTags, setAllTags] = useState<any[]>([]);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [activeTagIds, setActiveTagIds] = useState<string[]>(homePageState.activeTagIds);
  const [categoryId, setCategoryId] = useState<string>(homePageState.categoryId);
  const [searchQuery, setSearchQuery] = useState('');

  const ads = getAdsByPlacement('discovery');
  const topAd = ads[0];

  const fetchData = async () => {
    try {
      const [tagsRes, catsRes, settingsRes] = await Promise.all([
        api.getTagCloud(),
        api.getContentCategories(),
        api.getRecommendationSettings()
      ]);
      
      const weights = settingsRes.data?.weights || {};
      const excludedTagIds = weights.excluded_discovery_tag_ids || [];
      
      // 过滤标签逻辑：
      // 1. 移除之前的硬编码 "不入" 限制（根据用户要求去除限制）
      // 2. 仅过滤管理员在后台设置的排除标签
      // 3. 始终为非管理员过滤掉特定的系统排除标签：🏷️不入今日图集、🏷️不入微信草稿库
      const filteredTags = (tagsRes.data || []).filter((t: any) => {
        if (profile?.role === 'admin') return true;
        
        // 过滤后台配置的屏蔽标签
        if (excludedTagIds.includes(t.id)) return false;
        
        // 保留特定的排除标签模式：这些标签仅用于系统逻辑，不应展示给普通用户
        const systemExclusionTags = ['🏷️不入今日图集', '今日图集', '🏷️不入微信草稿库', '微信草稿库'];
        if (systemExclusionTags.some(name => t.name.includes(name))) return false;
        
        return true;
      });

      setAllTags(filteredTags);
      setCategories(catsRes.data || []);
      if (refreshAds) await refreshAds();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // 组件挂载时，强制重置所有可能的滚动锁定状态
    document.body.style.overflow = '';
    document.body.classList.remove('overflow-hidden');
    // 关闭可能打开的 MediaPreview
    window.dispatchEvent(new CustomEvent('closeMediaPreview'));
    // 重置 homePageState 中的预览索引
    homePageState.previewIndex = -1;

    fetchData();
  }, []);

  const handleRefresh = async () => {
    await fetchData();
  };

  const handleApply = () => {
    // 更新全局状态
    homePageState.activeTagIds = activeTagIds;
    homePageState.categoryId = categoryId;
    resetHomeState();
    navigate('/');
  };

  const handleReset = () => {
    setActiveTagIds([]);
    setCategoryId('all');
  };

  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <div className="min-h-screen bg-background pb-32">
      <PullToRefresh onRefresh={handleRefresh}>
        {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-black tracking-tight">探索页</h1>
        </div>
        {(activeTagIds.length > 0 || categoryId !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary font-bold"
            onClick={handleReset}
          >
            重置
          </Button>
        )}
      </header>

      <div className="p-4 space-y-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* 内容分类区块 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-black uppercase tracking-widest text-foreground/80">内容分类</h4>
            </div>
          </div>
          
          <div className="bg-muted/20 p-4 rounded-[2rem] border border-border/50">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={categoryId === 'all' ? 'default' : 'outline'}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border-border/50",
                  categoryId === 'all' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-muted"
                )}
                onClick={() => setCategoryId('all')}
              >
                全部
              </Badge>
              {categories.filter(c => c.is_visible !== false).map((cat, idx) => (
                <Badge
                  key={cat.id}
                  variant={categoryId === cat.id ? 'default' : 'outline'}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border-border/50",
                    categoryId === cat.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-muted"
                  )}
                  onClick={() => setCategoryId(cat.id)}
                >
                  {cat.name}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* 标签发现区块 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h4 className="text-sm font-black uppercase tracking-widest text-foreground/80">热门兴趣标签</h4>
            </div>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="搜索你感兴趣的标签..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-10 bg-muted/40 border-none rounded-2xl text-sm focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          <div className="bg-muted/20 p-4 rounded-[2rem] border border-border/50">
            <TagCloud 
              activeTagIds={activeTagIds} 
              onTagClick={(tag) => {
                setActiveTagIds(prev => {
                  if (prev.includes(tag.id)) {
                    return prev.filter(id => id !== tag.id);
                  } else {
                    return [...prev, tag.id];
                  }
                });
              }} 
            />
          </div>
        </section>

        {/* 已选预览区 */}
        {(activeTagIds.length > 0 || categoryId !== 'all') && (
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 pt-2">
            <div className="flex items-center gap-2 mb-4 px-1">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <h4 className="text-[11px] font-black text-primary uppercase tracking-widest">已选筛选条件</h4>
            </div>
            <div className="flex flex-wrap gap-2 px-1">
              {categoryId !== 'all' && selectedCategory && (
                <Badge 
                  variant="outline" 
                  className="rounded-full h-8 px-3 border border-primary/20 bg-primary/5 flex items-center gap-2 text-primary"
                >
                  <Layers className="w-3 h-3" />
                  <span className="text-xs">{selectedCategory.name}</span>
                  <X 
                    className="w-3 h-3 ml-1 cursor-pointer opacity-60 hover:opacity-100 transition-opacity" 
                    onClick={() => setCategoryId('all')} 
                  />
                </Badge>
              )}
              {activeTagIds.map(id => {
                const tag = allTags.find(t => t.id === id);
                return (
                  <Badge 
                    key={id} 
                    variant="outline" 
                    className={cn(
                      "rounded-full h-8 px-3 border flex items-center gap-2",
                      getRainbowColor(id, false)
                    )}
                  >
                    <span className="text-xs">#{tag ? tag.name : '兴趣点'}</span>
                    <X 
                      className="w-3 h-3 ml-1 cursor-pointer opacity-40 hover:opacity-100 transition-opacity" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTagIds(prev => prev.filter(pid => pid !== id));
                      }} 
                    />
                  </Badge>
                );
              })}
            </div>
          </section>
        )}

        <DiscoveryPreview tagIds={activeTagIds} categoryId={categoryId} />

        {/* 赞助商横幅广告 */}
      {topAd && (
        <section className="pt-4 pb-8">
          {topAd.type === 'waterfall' ? (
            <AdCard ad={topAd} />
          ) : (
            <NativeAd 
              {...topAd} 
              type="banner" 
              className="shadow-md"
            />
          )}
        </section>
      )}
      </div>
      </PullToRefresh>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 p-4 bg-background/90 backdrop-blur-md border-t flex items-center gap-4 z-[1001] shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        <Button 
          type="button"
          variant="outline" 
          className="rounded-2xl h-12 px-6 font-bold border-border/60 hover:bg-muted text-muted-foreground"
          onClick={handleReset}
          disabled={activeTagIds.length === 0 && categoryId === 'all'}
        >
          重置全部
        </Button>
        <Button 
          type="button"
          className="rounded-2xl flex-1 h-12 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={handleApply}
        >
          确认并应用 ({activeTagIds.length + (categoryId !== 'all' ? 1 : 0)})
        </Button>
      </div>
    </div>
  );
}
