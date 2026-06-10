import React, { useEffect, useState, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';

// 懒加载重型组件
const MediaPreview = lazy(() => import('@/components/MediaPreview'));
const FeedView = lazy(() => import('@/components/home/FeedView'));
const TagCloud = lazy(() => import('@/components/TagCloud'));

import { confirmAsync } from '@/components/ui/confirm-dialog';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';

import type { MediaItem, Ad, ContentCategory } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  PlayCircle, 
  Video, 
  Loader2, 
  ChevronUp, 
  ChevronDown, 
  RefreshCw, 
  Heart, 
  ThumbsDown, 
  Eye, 
  Monitor, 
  X, 
  LogOut, 
  ImageIcon as ImageIconIcon, 
  RotateCcw, 
  Maximize2,
  ShieldAlert, 
  ShieldCheck, 
  Settings, 
  Flame, 
  TrendingDown, 
  Sparkles, 
  Trash2, 
  EyeOff, 
  Hash, 
  Search, 
  Plus, 
  Tags, 
  Compass, 
  Share2, 
  Clock, 
  Zap, 
  Download, 
  Music, 
  ArrowLeft, 
  Calendar,
  LayoutGrid, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  SlidersHorizontal, 
  Layers, 
  MoreVertical 
} from 'lucide-react';
import { toast } from 'sonner';
import { MediaCardSkeleton } from '@/components/MediaCardSkeleton';
import { RelatedContent } from '@/components/RelatedContent';
// TagCloud 已移动到懒加载
import { ProtectedMedia } from '@/components/common/ProtectedMedia';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { cn, downloadFile, cleanTitle, stripExtension } from '@/lib/utils';
import { useConfig } from '@/contexts/ConfigContext';
import { useRealtimeCacheStats } from '@/hooks/useRealtimeCacheStats';
import { Input } from '@/components/ui/input';
import { getFingerprint } from '@/lib/fingerprint';


import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import useEmblaCarousel from 'embla-carousel-react';
import { VideoPlayer } from '@/components/ui/video-player';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { usePreload, prefetchPage } from '@/hooks/use-preload';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { getProtectedUrl, getSecurityUrl, canUseWebp } from '@/lib/media';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutSwitcher,
  TimelineLayout,
  FolderTreeLayout,
  CalendarLayout,
  StackedCardsLayout,
  FreeformLayout,
  StarrySkyLayout,
} from '@/components/layouts';
import { useKeywordReplacement } from '@/contexts/KeywordReplacementContext';
import { useViewState } from '@/contexts/ViewStateContext';
import { homePageState, ViewMode, MediaType, ViewLayout } from '@/lib/home-state';
import { useRealtimeExplore } from '@/hooks/useRealtimeExplore';
import { EditMediaDialog } from '@/components/admin/EditMediaDialog';
import { useWaterfallScrollKeep } from '@/hooks/useWaterfallScrollKeep';
import { AdCard } from '@/components/home/AdCard';
import { MediaCard, LazyMediaCard } from '@/components/home/MediaCard';

import { HomeHeader } from './home/components/HomeHeader';
import { FilterBar } from './home/components/FilterBar';
import { FilterContent } from './home/components/FilterContent';

interface HomeSavedState {
  items: MediaItem[];
  page: number;
  hasMore: boolean;
  viewMode: ViewMode;
  mediaType: MediaType;
  categoryId: string;
  activeTagIds: string[];
  viewLayout: ViewLayout;
  feedIndex: number;
  lastPreviewIndex: number;
  lastPreviewId: string | null;
}

// 七色彩虹配色方案 (对应 index.css 中的变量)
const getRainbowColor = (index: number, isSelected: boolean = false) => {
  const colors = [
    'var(--rainbow-red)',
    'var(--rainbow-orange)',
    'var(--rainbow-yellow)',
    'var(--rainbow-green)',
    'var(--rainbow-cyan)',
    'var(--rainbow-blue)',
    'var(--rainbow-purple)',
  ];
  const color = colors[index % colors.length];

  if (isSelected) {
    return {
      backgroundColor: `hsl(${color})`,
      color: 'white',
      borderColor: `hsl(${color})`,
    };
  }

  return {
    backgroundColor: `hsla(${color}, 0.1)`,
    color: `hsl(${color})`,
    borderColor: `hsla(${color}, 0.2)`,
  };
};


export default function Home({ isVisible = true }: { isVisible?: boolean }) {
  const location = useLocation();
  const { replaceUser } = useKeywordReplacement();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, openLoginDialog, isAdmin } = useAuth();
  const { config, securityConfig } = useConfig();
  const { homeScrollTop, setHomeScrollTop } = useViewState();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const cacheStats = useRealtimeCacheStats();
  const prevPathRef = useRef(location.pathname);

  // 提取初始参数
  const initialTagId = searchParams.get('tagId');
  const initialCatId = searchParams.get('categoryId');

  const [items, setItems] = useState<MediaItem[]>(homePageState.items);
  const [loading, setLoading] = useState(!homePageState.isInitialized);
  const [loadingMore, setLoadingMore] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number>(() => {
    // 优先检查 URL 是否带了 mediaId 参数
    const mid = searchParams.get('mediaId');
    if (mid) {
      const idx = homePageState.items.findIndex(i => i.id === mid);
      if (idx !== -1) return idx;
    }
    // 不再自动从内存恢复预览状态，除非是明显的刷新或 URL 驱动
    // 修复：从“我的”切换回来时不自动打开预览
    return -1;
  });
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const prevPreviewIndexRef = useRef<number>(-1);
  const [lastPreviewIndex, setLastPreviewIndex] = useState<number>(homePageState.previewIndex);
  const [lastPreviewId, setLastPreviewId] = useState<string | null>(homePageState.lastViewedId);
  const [page, setPage] = useState(homePageState.page);
  const [hasMore, setHasMore] = useState(homePageState.hasMore);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(homePageState.viewMode);
  const [mediaType, setMediaType] = useState<MediaType>(homePageState.mediaType);
  const [viewLayout, setViewLayout] = useState<ViewLayout>(homePageState.viewLayout);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState<string>(initialCatId || homePageState.categoryId);
  const [activeTagIds, setActiveTagIds] = useState<string[]>(() => {
    if (initialTagId) return [initialTagId];
    return homePageState.activeTagIds;
  });
  const [isSearchOpen, setIsSearchOpenState] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchPreviewIndex, setSearchPreviewIndex] = useState<number>(-1);
  const [recommendTags, setRecommendTags] = useState<any[]>([]);

  useEffect(() => {
    const fetchRecommendTags = async () => {
      try {
        const { data } = await supabase
          .from('tags')
          .select('id, name, weight')
          .eq('is_visible', true)
          .order('weight', { ascending: false })
          .limit(10);
        if (data) setRecommendTags(data);
      } catch (e) {
        console.error('Fetch recommend tags error:', e);
      }
    };
    fetchRecommendTags();
  }, []);
  const [excludedTagIds, setExcludedTagIds] = useState<string[]>([]);

  const handleTagToggle = useCallback((tagId: string) => {
    setActiveTagIds(prev => {
      const next = prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId];
      homePageState.activeTagIds = next;
      return next;
    });
    setPage(0);
  }, []);

  // 核心：离开保存，回来恢复
  useEffect(() => {
    const fetchExclusions = async () => {
      const { data } = await api.getRecommendationSettings();
      if (data?.weights?.excluded_discovery_tag_ids) {
        setExcludedTagIds(data.weights.excluded_discovery_tag_ids);
      }
    };
    fetchExclusions();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScroller(el);

    // 只有在首页路径且是瀑布流模式时才执行自动恢复
    if (isVisible && location.pathname === '/' && viewLayout === 'grid' && homeScrollTop > 0) {
      // 延迟一点点，确保内容已经初步渲染且高度已撑开
      const timer = setTimeout(() => {
        if (window.scrollY !== homeScrollTop) {
          window.scrollTo(0, homeScrollTop);
          console.log('[Home] Restored scroll position:', homeScrollTop);
        }
      }, 150); // 增加延迟，确保稳定性
      return () => clearTimeout(timer);
    }
  }, [isVisible, location.pathname, viewLayout, homeScrollTop]);

  // 分成多列显示瀑布流 (响应式：移动端2列，md 3列，lg 4列，xl 5列)
  const [columnsCount, setColumnsCount] = useState(() => {
    if (typeof window === 'undefined') return 2;
    const w = window.innerWidth;
    if (w >= 1280) return 5;
    if (w >= 1024) return 4;
    if (w >= 768) return 3;
    return 2;
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 1280) setColumnsCount(5);
      else if (w >= 1024) setColumnsCount(4);
      else if (w >= 768) setColumnsCount(3);
      else setColumnsCount(2);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [pendingRemovals, setPendingRemovals] = useState<{ id: string, removeIndex: number }[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const virtuosoRefs = useRef<(VirtuosoHandle | null)[]>([]);
  const observer = useRef<IntersectionObserver | null>(null);

  // 预加载逻辑
  const [isCleared, setIsCleared] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [seenMediaIds, setSeenMediaIds] = useState<string[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<MediaItem | null>(null);

  const [browserId, setBrowserId] = useState(() => localStorage.getItem('miaoda_browser_fingerprint') || '');
  useEffect(() => {
    getFingerprint().then(setBrowserId);
  }, []);

  const fetchSeenMediaIds = useCallback(async () => {
    try {
      const { data } = await api.getSeenMediaIds(user?.id, browserId);
      if (data) setSeenMediaIds(data);
    } catch (e) {
      console.error('[Home] Fetch seen media ids error:', e);
    }
  }, [user, browserId]);

  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isSearchOpen || !searchQuery.trim()) {
      if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
      return;
    }
    
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    searchDebounceTimer.current = setTimeout(() => {
      handleSearch();
    }, 600);
    
    return () => {
      if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    };
  }, [searchQuery, isSearchOpen]);

  const handleSearch = async (query?: string) => {
    const targetQuery = (query || searchQuery || '').trim();
    if (!targetQuery) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      console.log('[Home] 开始搜索关键词:', targetQuery);
      
      // 并行执行搜索以提高性能
      const [tagsResponse, titleResponse] = await Promise.all([
        // 1. 搜索标签
        supabase.from('tags').select('id').ilike('name', `%${targetQuery}%`),
        // 2. 搜索标题和描述
        supabase
          .from('media_items')
          .select('*, media_tags(tag_id, tags(name))')
          .eq('status', 'approved')
          .or(`title.ilike.%${targetQuery}%,description.ilike.%${targetQuery}%`)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);
      
      const matchedTagIds: string[] = (tagsResponse.data as any[])?.map((t: any) => t.id) || [];
      const titleResults = titleResponse.data || [];

      // 3. 如果有匹配的标签，获取这些标签关联的作品
      let tagMediaResults: MediaItem[] = [];
      if (matchedTagIds.length > 0) {
        const { data: tagResults } = await supabase
          .from('media_items')
          .select('*, media_tags!inner(tag_id, tags(name))')
          .eq('status', 'approved')
          .in('media_tags.tag_id', matchedTagIds)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (tagResults) {
          tagMediaResults = tagResults as any;
        }
      }

      // 4. 合并去重
      const combined = [...titleResults, ...tagMediaResults];
      const uniqueMap = new Map();
      combined.forEach(item => {
        if (!uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      });

      const finalResults = Array.from(uniqueMap.values())
        .sort((a, b) => new Date((b as any).created_at).getTime() - new Date((a as any).created_at).getTime());
      
      console.log(`[Home] 搜索完成，找到 ${finalResults.length} 个结果`);
      setSearchResults(finalResults);
    } catch (e: any) {
      console.error('[Home] 搜索过程出错:', e);
      toast.error('搜索时遇到一点问题，请重试');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchSeenMediaIds();
  }, [fetchSeenMediaIds]);

  const filteredItems = useMemo(() => {
    if (isAdmin) return items;
    if (excludedTagIds.length === 0) return items;
    
    return items.filter(item => {
      // 如果作品有任何一个标签在排除列表中，则隐藏
      if (item.media_tags && Array.isArray(item.media_tags)) {
        return !item.media_tags.some((mt: any) => excludedTagIds.includes(mt.tag_id));
      }
      return true;
    });
  }, [items, excludedTagIds, isAdmin]);

  // 获取带广告的项目列表
  const itemsWithAds = useMemo(() => {
    if (filteredItems.length === 0) return filteredItems;
    
    // 从 ads 中获取 in-feed 或 waterfall 类型广告，且投放位置包含 discovery
    const flowAds = ads.filter(a => 
      (a.type === 'in-feed' || a.type === 'waterfall') && 
      a.is_active && 
      (a.placements?.includes('all') || a.placements?.includes('discovery'))
    );
    
    if (flowAds.length === 0) return filteredItems;

    const result: any[] = [];
    let adPointer = 0;
    
    // 根据当前布局确定间隔
    const defaultInterval = viewLayout === 'feed' ? 8 : 10; // 稍微增加瀑布流广告频率

    filteredItems.forEach((item, idx) => {
      result.push(item);
      
      // 使用固定的 adPointer 确保广告按顺序循环出现
      const currentAd = flowAds[adPointer % flowAds.length];
      const interval = currentAd.feed_interval || defaultInterval;
      
      // 每隔 interval 个项目尝试插入一个广告
      if (idx > 0 && (idx + 1) % interval === 0) {
        // 概率检查
        const prob = currentAd.appearance_probability ?? 100;
        // 使用伪随机种子（基于项目ID）保证滚动时广告位置稳定，或者直接使用概率
        if (prob === 100 || Math.random() * 100 <= prob) {
          result.push({
            ...currentAd,
            isAd: true,
            ad_id: currentAd.id, // 核心修复：保留真实的 UUID 供事件记录使用
            id: `ad-${currentAd.id}-${idx}-${page}`, // 确保渲染用的 ID 唯一
            type: 'ad'
          });
          adPointer++;
        }
      }
    });
    
    return result;
  }, [filteredItems, ads, viewLayout, page]);

  const scrollToGlobalIndex = useCallback((globalIndex: number, behavior: ScrollBehavior = 'auto') => {
    if (globalIndex < 0 || globalIndex >= items.length) return;
    
    // 优先尝试 DOM 定位，因为 scrollIntoView 的 centering 效果最好
    const el = document.getElementById(`media-card-${globalIndex}`);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: behavior === 'smooth' ? 'smooth' : 'auto' });
      return;
    }

    // 备选方案：通过 Virtuoso 的 scrollToIndex 定位（用于元素尚未渲染的情况）
    const colIndex = globalIndex % columnsCount;
    const itemIndexInCol = Math.floor(globalIndex / columnsCount);
    const vRef = virtuosoRefs.current[colIndex];
    if (vRef) {
      vRef.scrollToIndex({ 
        index: itemIndexInCol, 
        align: 'center', 
        behavior: behavior === 'smooth' ? 'smooth' : 'auto' 
      });
    }
  }, [items.length, columnsCount]);

  // 集成增强型滚动恢复钩子
  useWaterfallScrollKeep({
    key: `home_${viewMode}_${mediaType}_${categoryId}`,
    data: items,
    onRestore: (data) => {
      setItems(data);
      homePageState.items = data;
      homePageState.isInitialized = true;
    },
    enabled: viewLayout === 'grid' && viewMode !== 'random'
  });


  const [targetPosition, setTargetPosition] = useState<{ mediaId: string; rowNumber?: number; type: 'resume' | 'url' } | null>(() => {
    // 优先从 URL 参数中提取
    const urlMediaId = searchParams.get('mediaId');
    if (urlMediaId) return { mediaId: urlMediaId, type: 'url' };
    
    // 不再默认开启 resume 类型的 targetPosition，让位给更精准的 scrollPosition 恢复
    return null;
  });

  // 监听组件挂载及全局关闭预览事件
  useEffect(() => {
    // 页面挂载时强制重置滚动锁定
    document.body.style.overflow = '';
    document.body.classList.remove('overflow-hidden');
    homePageState.previewIndex = -1;
    
    const handleClose = () => setPreviewIndex(-1);
    window.addEventListener('closeMediaPreview', handleClose);
    return () => window.removeEventListener('closeMediaPreview', handleClose);
  }, []);
  // 监听编辑作品事件
  useEffect(() => {
    const handleOpenEdit = (e: any) => {
      const item = e.detail?.item;
      if (item) setEditingItem(item);
    };
    window.addEventListener('openEditMedia', handleOpenEdit);
    return () => window.removeEventListener('openEditMedia', handleOpenEdit);
  }, [setEditingItem]);

  // 这里的 useEffect 不再需要初始化 targetPosition，因为已经在 useState 中处理了
  // 保持对 searchParams 的监听，以便 URL 变化时能更新定位
  useEffect(() => {
    const urlMediaId = searchParams.get('mediaId');
    if (urlMediaId && (!targetPosition || targetPosition.mediaId !== urlMediaId)) {
      setTargetPosition({ mediaId: urlMediaId, type: 'url' });
    }
  }, [searchParams]);


  const prefetchUrls = useMemo(() => {
    // 性能优化：当首页处于后台隐藏状态时，完全停止预加载，释放网络资源和内存 Blob 缓存
    if (!isVisible) return [];

    // 智能预加载策略：基于网络状况调整
    // @ts-ignore - navigator.connection is experimental
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isSlowConnection = conn && (conn.effectiveType === '2g' || conn.effectiveType === '3g' || conn.saveData);

    // 如果是慢速网络，减少预加载数量以节省流量和提高首屏速度
    const preloadCount = isSlowConnection ? 4 : 12;
    const nextBatchCount = isSlowConnection ? 4 : 16;

    // 1. 预加载当前视野附近的缩略图 (限制数量，避免过度消耗带宽和主线程)
    // 假设当前正在加载第 page 页，预加载前后两页的量通常足够
    const currentIdx = page * 20; // 假设每页约 20 条
    const startIdx = Math.max(0, currentIdx - 40);
    const endIdx = currentIdx + 60;
    
    const thumbs = items.slice(startIdx, endIdx).map(item => item.thumbnail_url || item.url).filter(Boolean);
    // 2. 预加载首页前 N 项的原图
    const firstFulls = items.slice(0, preloadCount).map(item => item.url).filter(Boolean);
    // 3. 预加载后 N 项的缩略图
    const nextBatch = items.slice(items.length - nextBatchCount).map(item => item.thumbnail_url || item.url).filter(Boolean);

    return Array.from(new Set([...thumbs, ...firstFulls, ...nextBatch]));
  }, [items, isVisible]);

  usePreload(prefetchUrls);

  // 抖音模式相关状态
  const [feedIndex, setFeedIndex] = useState(homePageState.feedIndex || 0);
  const [isMuted, setIsMuted] = useState(() => storage.get(STORAGE_KEYS.VIDEO_MUTED, true));
  const [isAutoPlay, setIsAutoPlay] = useState(() => storage.get('media_auto_play', false));
  const [autoPlayInterval, setAutoPlayInterval] = useState(() => storage.get('media_auto_play_interval', 3000));
  
  // 背景音乐相关 (已移动到全局 MusicContext)
  
  useEffect(() => {
    storage.set('media_auto_play', isAutoPlay);
  }, [isAutoPlay]);

  useEffect(() => {
    storage.set('media_auto_play_interval', autoPlayInterval);
  }, [autoPlayInterval]);

  const columns = useMemo(() => {
    if (!isVisible) return [];
    
    const cols: any[][] = Array.from({ length: columnsCount }, () => []);
    const heights = new Array(columnsCount).fill(0);

    itemsWithAds.forEach((item) => {
      // 找到当前高度最小的列
      let shortestColIndex = 0;
      let minHeight = heights[0];
      for (let i = 1; i < columnsCount; i++) {
        if (heights[i] < minHeight) {
          minHeight = heights[i];
          shortestColIndex = i;
        }
      }

      // 将项目添加到最短列
      cols[shortestColIndex].push(item);

      // 计算并累加该项目的大致高度
      // 如果是广告，默认比例 3:4
      let aspectRatio = (item.isAd || item.type === 'ad') ? 3 / 4 : (item.type === 'video' ? 16 / 9 : 3 / 4);
      if (item.metadata?.width && item.metadata?.height) {
        aspectRatio = item.metadata.width / item.metadata.height;
      }
      
      const itemHeight = 1 / aspectRatio;
      heights[shortestColIndex] += itemHeight;
    });
    
    return cols;
  }, [itemsWithAds, columnsCount, isVisible]);

  // 1. 实时的内存同步与状态持久化
  useEffect(() => {
    Object.assign(homePageState, {
      items,
      page,
      hasMore,
      viewMode,
      mediaType,
      categoryId,
      activeTagIds,
      viewLayout,
      feedIndex,
      previewIndex: previewIndex, // 修复：仅保存当前的预览开启状态，避免回退时自动打开
      lastViewedId: lastPreviewId,
    });

    // 部分关键状态存入持久化存储（供跨会话使用）
    storage.set(STORAGE_KEYS.VIEW_MODE, viewMode);
    storage.set(STORAGE_KEYS.MEDIA_TYPE, mediaType);
    storage.set(STORAGE_KEYS.VIEW_LAYOUT, viewLayout);
    storage.set('home_last_viewed_id', lastPreviewId);
    storage.set('home_feed_index', feedIndex);
  }, [items, page, hasMore, viewMode, mediaType, categoryId, activeTagIds, viewLayout, feedIndex, lastPreviewIndex, lastPreviewId, previewIndex]);

  // 核心修复：当从其他页面（如发现页）返回首页时，同步筛选状态并刷新内容
  useEffect(() => {
    if (isVisible && location.pathname === '/') {
      const stateChanged = categoryId !== homePageState.categoryId || 
                          JSON.stringify(activeTagIds) !== JSON.stringify(homePageState.activeTagIds) ||
                          !homePageState.isInitialized;
      
      if (stateChanged) {
        console.log('[Home] State sync required:', {
          prevCat: categoryId, nextCat: homePageState.categoryId,
          prevTags: activeTagIds, nextTags: homePageState.activeTagIds
        });
        
        // 我们通过修改本地状态来触发加载逻辑
        setCategoryId(homePageState.categoryId);
        setActiveTagIds(homePageState.activeTagIds);
        setPage(0);
        setRefreshCount(prev => prev + 1); // 触发加载逻辑
      }
    }
  }, [isVisible, location.pathname, categoryId, activeTagIds]);

  // 3. 统一的滚动监听与状态同步
  useEffect(() => {
    // 增加一个稳定期判断，防止在页面初次挂载恢复滚动位置时，被浏览器自动触发的 scroll 事件重置为 0
    let isStable = false;
    const stableTimer = setTimeout(() => { isStable = true; }, 800);

    const handleScroll = () => {
      const el = scrollRef.current;
      if (!el) return;
      const currentScroll = window.scrollY;
      setShowScrollTop(currentScroll > 500);

      // 只有在非预览模式、已进入稳定期、首页路径且是瀑布流模式时才实时保存位置
      if (previewIndex === -1 && isStable && viewLayout === 'grid' && location.pathname === '/') {
        // 增加最小差值保存，减少状态更新频率，同时防止布局切换时的误重置 0
        if (currentScroll > 0 && Math.abs(currentScroll - homeScrollTop) > 5) {
          homePageState.scrollPosition = currentScroll;
          setHomeScrollTop(currentScroll);
        }
      }

      // Grid 模式下实时同步视野中心的作品 ID，以便在布局切换或返回时定位
      if (viewLayout === 'grid' && items.length > 0) {
        const centerX = window.innerWidth / 2;
        const centerY = Math.min(window.innerHeight / 3, 300);
        const el = document.elementFromPoint(centerX, centerY);
        const card = el?.closest('[data-media-id]');
        
        if (card) {
          const id = card.getAttribute('data-media-id');
          const indexStr = card.id.replace('media-card-', '');
          const index = parseInt(indexStr);
          
          if (!isNaN(index) && index !== feedIndex) {
            setFeedIndex(index);
            setLastPreviewIndex(index);
            if (id) {
              setLastPreviewId(id);
              homePageState.lastViewedId = id;
              storage.set('home_last_viewed_id', id);
            }
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(stableTimer);
    };
  }, [viewLayout, items.length, feedIndex, previewIndex, scroller]);


  // 记录上一次的布局模式，用于检测布局切换
  const prevLayoutRef = useRef<ViewLayout | null>(null);

  // 当布局切换回 Grid 或页面恢复时，执行平滑滚动定位
  useEffect(() => {
    // 只有从 feed 切换到 grid 时才执行自动回滚定位 (或者是页面初次挂载时的恢复)
    // 或者是从大图预览关闭时返回瀑布流，或者是从其他页面返回首页
    const isSwitchingToGrid = (prevLayoutRef.current === 'feed' || prevLayoutRef.current === null) && viewLayout === 'grid';
    const isClosingPreview = prevPreviewIndexRef.current >= 0 && previewIndex === -1 && viewLayout === 'grid';
    const isReturningToHome = prevPathRef.current !== '/' && location.pathname === '/';
    const isInitialMount = prevLayoutRef.current === null;
    
    prevLayoutRef.current = viewLayout;
    prevPreviewIndexRef.current = previewIndex;
    prevPathRef.current = location.pathname;

    if ((isSwitchingToGrid || isClosingPreview || isInitialMount || isReturningToHome) && (lastPreviewId || lastPreviewIndex !== -1)) {
      const attemptScroll = (count = 0) => {
        if (count > 10 || viewLayout !== 'grid') return;
        
        const el = document.querySelector(`[data-media-id="${lastPreviewId}"]`) || 
                   document.getElementById(`media-card-${lastPreviewIndex}`);
        
        if (el) {
          // 如果已经在视口内且不在开头（count>0），则不需要强制滚动
          const rect = el.getBoundingClientRect();
          const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
          
          if (!isVisible || count === 0) {
            el.scrollIntoView({ behavior: count === 0 ? 'auto' : 'smooth', block: 'center' });
          }
        } else {
          // 兜底：如果还没在 DOM 中，尝试估算位置跳转以触发 Virtuoso 渲染
          if (count === 0 && lastPreviewIndex !== -1) {
            const est = Math.floor(lastPreviewIndex / columnsCount) * 450;
            scroller?.scrollTo({ top: est, behavior: 'auto' });
          }
          setTimeout(() => attemptScroll(count + 1), 100);
        }
      };
      
      // 稍微延迟等待布局转换完成
      const timer = setTimeout(() => attemptScroll(0), 100);
      return () => clearTimeout(timer);
    }
  }, [viewLayout, lastPreviewId, lastPreviewIndex, columnsCount, items, previewIndex]);

  // 预加载 Feed 模式下的下一个媒体
  const nextFeedUrl = useMemo(() => {
    if (viewLayout === 'feed' && items[feedIndex + 1]) {
      return [items[feedIndex + 1].url];
    }
    return [];
  }, [viewLayout, items, feedIndex]);
  usePreload(nextFeedUrl, viewLayout === 'feed' && items[feedIndex + 1]?.type === 'video' ? 'video' : 'image');

  // 智能预加载策略：针对最新和推荐模式，根据浏览习惯预测并增加预加载数量
  useEffect(() => {
    if (!items.length || viewLayout !== 'feed') return;

    const prefetchCount = securityConfig?.prefetch_count || 5;
    const startIndex = feedIndex + 1;
    const endIndex = Math.min(startIndex + prefetchCount, items.length);

    // 延迟 500ms 执行，避免刚切换时造成主线程压力
    const timer = setTimeout(() => {
      for (let i = startIndex; i < endIndex; i++) {
        const item = items[i];
        if (item.type === 'image') {
          const mode = securityConfig?.mode || 'blob';
          const finalUseWebp = securityConfig?.enable_webp && canUseWebp();

          if (mode === 'blob') {
            getProtectedUrl(item.url, finalUseWebp, { enableBlob: true, enableCache: true, config });
          } else {
            const url = getSecurityUrl(item.url, mode, { signed_expiry: securityConfig?.signed_expiry }) as string;
            const img = new Image();
            img.src = url;
          }
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [items, feedIndex, viewLayout, securityConfig]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    axis: 'y',
    loop: false,
    skipSnaps: false,
    duration: 15,
    dragThreshold: 15, // 提高触发门槛，防止轻微晃动导致切图
    containScroll: 'trimSnaps',
    startIndex: homePageState.feedIndex || 0
  });

  // 当从瀑布流切换到 Feed 模式时，确保 Embla 滚动到指定索引
  useEffect(() => {
    if (viewLayout === 'feed' && emblaApi && feedIndex >= 0) {
      // 使用毫秒级延迟确保 Embla 已完成重绘并准备好接收滚动指令
      const timer = setTimeout(() => {
        emblaApi.scrollTo(feedIndex, true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [viewLayout, emblaApi, feedIndex]);


  useEffect(() => {
    storage.set(STORAGE_KEYS.CATEGORY_ID, categoryId);
  }, [categoryId]);

  useEffect(() => {
    fetchAds();
    fetchCategories();
    fetchTags();
    // 追踪首页浏览
    (window as any).pixelTrack?.('home_view');
  }, [profile]);

  const fetchTags = async () => {
    try {
      const { data } = await api.getTagCloud();
      // 过滤掉包含 "不入" 字样的标签 (非管理员用户)
      setAllTags((data || []).filter((t: any) => profile?.role === 'admin' || !t.name.includes('不入')));
    } catch (e) {
      console.error('Failed to fetch tags for filtering:', e);
    }
  };

  // 使用 Realtime 监听探索页面的新内容
  const { resetNewItemsCount } = useRealtimeExplore({
    enabled: true,
    onNewApprovedItem: (newItem) => {
      // 只有在“最新”模式下才自动添加到列表顶部
      if (viewMode === 'latest') {
        setItems(prev => {
          // 避免重复添加
          if (prev.some(item => item.id === newItem.id)) return prev;
          
          // 如果当前有分类或标签筛选，需要检查新条目是否符合条件
          if (categoryId !== 'all' && newItem.category_id !== categoryId) return prev;
          if (activeTagIds.length > 0) {
            const itemTagIds = newItem.tags?.map((t: any) => typeof t === 'string' ? t : t.id) || [];
            if (!activeTagIds.every(id => itemTagIds.includes(id))) return prev;
          }
          
          // 满足条件，添加到顶部
          return [newItem, ...prev];
        });
        
        // 如果用户就在顶部附近，可以考虑做一个小振动提示或静默更新
        // 如果用户在下方浏览，内容会自动堆叠在上方
      }
    }
  });

  // 实时热度同步
  useEffect(() => {
    const channel = supabase
      .channel('home-realtime-heat')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'media_items'
        },
        (payload) => {
          const updatedMedia = payload.new as MediaItem;
          if (updatedMedia.heat_score !== undefined) {
            setItems(currentItems => 
              currentItems.map(item => 
                item.id === updatedMedia.id 
                  ? { ...item, heat_score: updatedMedia.heat_score } 
                  : item
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 异步请求重试工具
  const retryRequest = async <T,>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (e: any) {
        lastError = e;
        if (i < maxRetries - 1) {
          // 指数退避重试
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          console.warn(`[Retry] Attempt ${i + 1} failed, retrying...`, e.message);
        }
      }
    }
    throw lastError;
  };


  const fetchCategories = async () => {
    const { data } = await api.getContentCategories();
    setCategories(data || []);
  };

  const fetchAds = async () => {
    const { data } = await api.getAds();
    if (data && data.length > 0) {
      // 过滤广告：必须 active，且在有效期内
      const activeAds = data.filter((a: any) => {
        if (!a.is_active) return false;
        const now = Date.now();
        if (a.start_time && new Date(a.start_time).getTime() > now) return false;
        if (a.end_time && new Date(a.end_time).getTime() < now) return false;
        return true;
      });

      setAds(activeAds);
      // 移除冗余的开屏和弹窗广告逻辑，由 AdContext 统一管理
    }
  };

  const currentPlacement = useMemo(() => {
    if (categoryId !== 'all') return 'portrait';
    if (activeTagIds.length > 0) return 'portrait';
    return 'home';
  }, [categoryId, activeTagIds]);

  const getWaterfallAd = useCallback((itemIndex: number, seed?: string) => {
    // 兼容 waterfall 和 in-feed 两种类型
    const waterfallAds = ads.filter(a => 
      (a.type === 'waterfall' || a.type === 'in-feed') && 
      a.is_active &&
      (a.placements?.includes('all') || a.placements?.includes(currentPlacement))
    );
    if (waterfallAds.length === 0) return null;
    
    // 找到符合当前索引间隔要求的广告
    const eligibleAds = waterfallAds.filter(ad => {
      const interval = ad.feed_interval || 8;
      if (itemIndex % interval !== 0) return false;
      
      // 概率检查
      const prob = ad.appearance_probability ?? 100;
      if (prob < 100) {
        // 使用 seed 或 index 作为随机种子，保证同一项对应的结果一致
        const randomSeed = seed ? seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : itemIndex;
        if ((randomSeed % 100) > prob) return false;
      }
      
      // 单页仅显示一次检查 - 移出 filter，移到渲染逻辑中处理或使用 useRef
      return true;
    });

    if (eligibleAds.length === 0) return null;
    
    // 如果提供了 seed，则通过哈希从合格广告中选择固定一个
    let selectedAd = eligibleAds[Math.floor(Math.random() * eligibleAds.length)];
    if (seed) {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
      }
      selectedAd = eligibleAds[Math.abs(hash) % eligibleAds.length];
    }
    
    // 检查是否单页仅显示一次
    if (selectedAd.show_once_per_page) {
      const key = `ad_shown_once_${selectedAd.id}`;
      if (sessionStorage.getItem(key)) return null;
    }
    
    return selectedAd;
  }, [ads, currentPlacement]);

  const fetchMedia = useCallback(async (pageNum: number, mode: ViewMode, type: MediaType, catId: string = 'all', tagIds: string[] = [], force = false) => {
    if (pageNum > 0 && !hasMore && !force) return;
    if (pageNum > 0 && loadingMore) return;

    // console.debug(`[Home] fetchMedia: page=${pageNum}, mode=${mode}, type=${type}, catId=${catId}, tagIds=${tagIds}, force=${force}`);
    try {
      if (pageNum === 0 && force) {
        setLoading(true);
        setItems([]);
      } else if (pageNum > 0) setLoadingMore(true);

      let data: MediaItem[] = [];
      let error = null;
      let total = 0;

      if (mode === "random") {
        const result = await api.getRandomMedia(user?.id, 20, type, catId, tagIds);
        data = result.data || [];
        error = result.error;
        total = data.length;
        setHasMore(false);
        setItems(data);
        setLoading(false);
        return;
      } else if (mode === "recommended") {
        // 推荐模式：每页 20 个，适配多列布局
        const result = await api.getRecommendedMedia(pageNum, 20, user?.id, type, catId, tagIds, force);
        data = result.data || [];
        error = result.error;
        total = result.total;
        setHasMore((pageNum + 1) * 20 < total);
      } else if (mode === 'popular') {
        const result = await api.getApprovedMedia(pageNum, 20, user?.id, type, catId, 'popular', tagIds, force);
        data = result.data || [];
        error = result.error;
        total = result.total;
        setHasMore((pageNum + 1) * 20 < total);
      } else {
        // 最新模式：每页 20 个
        const result = await api.getApprovedMedia(pageNum, 20, user?.id, type, catId, 'latest', tagIds, force);
        data = result.data || [];
        error = result.error;
        total = result.total;
        setHasMore((pageNum + 1) * 20 < total);
      }

      if (error) throw error;

      // 匿名限制逻辑
      if (!user && config?.anonymous_view_limit) {
        const limit = config.anonymous_view_limit;
        if (pageNum === 0) {
          data = data.slice(0, limit);
          setHasMore(false);
        } else {
          // 如果是后续分页且未登录，不返回数据
          data = [];
          setHasMore(false);
        }
      }

      if (pageNum === 0) {
        setItems(data);
        homePageState.isInitialized = true;
      } else {
        setItems(prev => {
          const newItems = [...prev];
          const existingIds = new Set(prev.map(i => i.id));
          data.forEach(item => {
            if (!existingIds.has(item.id)) {
              newItems.push(item);
              existingIds.add(item.id);
            }
          });
          return newItems;
        });
      }

      // 不再使用 ImageCache 预加载
      // 改为优先直连 Zonerama，失败时自动使用代理（在 getProtectedUrl 中处理）

            // 后台智能预取下一页数据 (仅针对最新和推荐模式，提升浏览连贯性)
      if ((mode as any) !== 'random' && data.length > 0 && hasMore) {
        setTimeout(async () => {
          try {
            const nextPage = pageNum + 1;
            const pageSize = 48;
            let nextData: MediaItem[] = [];
            if (mode === 'recommended') {
              const r = await api.getRecommendedMedia(nextPage, pageSize, user?.id, type, catId, tagIds);
              nextData = r.data || [];
            } else {
              const r = await api.getApprovedMedia(nextPage, pageSize, user?.id, type, catId, mode === 'popular' ? 'popular' : 'latest', tagIds);
              nextData = r.data || [];
            }
          } catch (e) {
            // ignore prefetch errors
          }
        }, 3000); // 延时 3s 预取，避免与首屏竞争
      }
    } catch (error: any) {
      // 优雅处理分页越界错误 (416 Range Not Satisfiable)
      if (error.status === 416 || error.code === 'PGRST103') {
        setHasMore(false);
        return;
      }
      console.error('[Home Fetch Error]', error);
      toast.error(`获取内容失败: ${error.message}`);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, config, profile, hasMore, loadingMore]);

  const handleAdminAction = async (id: string, action: 'heat_up' | 'heat_down' | 'toggle_recommend' | 'toggle_hide' | 'delete' | 'archive' | 'edit') => {
    if (profile?.role !== 'admin') return;

    const item = items.find(i => i.id === id);
    if (!item) return;

    try {
      let message = '';
      if (action === 'heat_up') {
        const { data: config } = await api.getRecommendationSettings();
        const amount = config?.weights?.manual_boost_weight || 10;
        await api.adjustMediaHeat(id, amount);
        setItems(prev => prev.map(i => i.id === id ? { ...i, heat_score: (i.heat_score || 0) + amount } : i));
        message = '已增加作品热度';
      } else if (action === 'heat_down') {
        const { data: config } = await api.getRecommendationSettings();
        const amount = (config?.weights?.manual_boost_weight || 10) * -1;
        await api.adjustMediaHeat(id, amount);
        setItems(prev => prev.map(i => i.id === id ? { ...i, heat_score: (i.heat_score || 0) + amount } : i));
        message = '已降低作品热度';
      } else if (action === 'toggle_recommend') {
        await api.updateMediaAdminStatus(id, { is_recommended: !item.is_recommended });
        setItems(prev => prev.map(i => i.id === id ? { ...i, is_recommended: !i.is_recommended } : i));
        message = !item.is_recommended ? '已设为推荐' : '已取消推荐';
      } else if (action === 'toggle_hide') {
        const newHideState = !item.is_hidden;
        await api.updateMediaAdminStatus(id, { is_hidden: newHideState });

        // PRD: 我在探索页点了图片取消显示后应该在最新 推荐 和随机都不应该出现
        if (newHideState) {
          setItems(prev => prev.filter(i => i.id !== id));
        } else {
          setItems(prev => prev.map(i => i.id === id ? { ...i, is_hidden: newHideState } : i));
        }

        message = newHideState ? '已设为不显示' : '已恢复显示';
      } else if (action === 'archive') {
        const confirmed = await confirmAsync('确定要下架此作品吗？下架后用户将不可见', { variant: 'destructive' });
    if (!confirmed) return;
        await api.updateMediaAdminStatus(id, { status: 'archived' });
        message = '作品已下架';
        setItems(prev => prev.filter(i => i.id !== id));
      } else if (action === 'delete') {
        const confirmed = await confirmAsync('确定要删除此作品吗？此操作不可逆', { variant: 'destructive' });
    if (!confirmed) return;
        await api.batchSoftDeleteMedia([id]);
        message = '作品已移入回收站';
        setItems(prev => prev.filter(i => i.id !== id));
      } else if (action === 'edit') {
        setItemToEdit(item);
        setIsEditDialogOpen(true);
        return;
      }

      toast.success(message);
    } catch (e: any) {
      toast.error('操作失败: ' + e.message);
    }
  };
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      setPage(0);
      setItems([]);
      setLoading(true);
      
      // 手动刷新时重置浏览足迹
      homePageState.lastViewedId = null;
      storage.remove('home_last_viewed_id');
      
      // 这里的 fetchMedia 会调用 API，目前已支持通过 force=true 绕过缓存
      await fetchMedia(0, viewMode, mediaType, categoryId, activeTagIds, true);
      // 根据用户要求，不再显示“列表已随机刷新”提示，以提供更平滑的体验
    } catch (e: any) {
      toast.error("刷新失败: " + e.message);
    } finally {
      setRefreshing(false);
    }
  };


  // 加载用户收藏列表
  const loadFavorites = useCallback(async () => {
    if (!user) return;
    const { data } = await api.getFavorites(user.id);
    const favSet = new Set<string>(data.map((item: any) => item.id));
    setFavorites(favSet);
  }, [user]);

  useEffect(() => {
    // 只有在未初始化或者过滤条件改变时才重新获取数据
    const shouldFullRefresh = !homePageState.isInitialized || 
        homePageState.viewMode !== viewMode || 
        homePageState.mediaType !== mediaType || 
        homePageState.categoryId !== categoryId ||
        JSON.stringify(homePageState.activeTagIds) !== JSON.stringify(activeTagIds) ||
        refreshCount > 0;

    if (shouldFullRefresh) {
      fetchMedia(0, viewMode, mediaType, categoryId, activeTagIds, true);
      homePageState.isInitialized = true;
      // 成功触发刷新后，更新缓存中的过滤条件引用，避免重复刷新
      homePageState.viewMode = viewMode;
      homePageState.mediaType = mediaType;
      homePageState.categoryId = categoryId;
      homePageState.activeTagIds = activeTagIds;
      // 重置刷新计数
      if (refreshCount > 0) setRefreshCount(0);
    } else {
      // 直接恢复状态 + 恢复滚动
      setLoading(false);
      
      // 只有在没有特定目标位置且有已保存滚动位置时才执行自动滚动恢复
      if (!targetPosition && homePageState.scrollPosition > 0) {
        setTimeout(() => {
          scroller?.scrollTo(0, homePageState.scrollPosition);
          // 增加延迟二次校验，确保在高度异步更新后依然能精准对位
          setTimeout(() => {
            if (Math.abs((scroller?.scrollTop || 0) - homePageState.scrollPosition) > 10) {
              scroller?.scrollTo(0, homePageState.scrollPosition);
            }
          }, 400);
        }, 300);
      }

      // 后台默默静默刷新第一页，以获取最新的审核通过内容
      // 仅在最新模式下执行，且不展示加载状态
      if (viewMode === 'latest') {
        fetchMedia(0, viewMode, mediaType, categoryId, activeTagIds, true);
      }
    }
  }, [viewMode, mediaType, categoryId, activeTagIds, refreshCount, targetPosition]);

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user, loadFavorites]);

  // 定期同步状态到全局缓存 (主要同步滚动相关和列表项)
  useEffect(() => {
    homePageState.items = items;
    homePageState.page = page;
    homePageState.hasMore = hasMore;
    homePageState.viewLayout = viewLayout;
    // 过滤条件和初始化状态已在获取数据的 useEffect 中精细化管理
  }, [items, page, hasMore, viewLayout]);


  // 统一的定位控制器：处理 URL 跳转、页面位置自动恢复
  useEffect(() => {
    if (!targetPosition) return;
    
    const { mediaId, rowNumber, type } = targetPosition;

    // 1. 检查当前列表中是否已存在该 ID
    const foundIndex = items.findIndex(item => item.id === mediaId);
    
    if (foundIndex !== -1) {
      // 找到了，开始滚动定位
      const scrollToEl = (attempt = 0) => {
        const el = document.querySelector(`[data-media-id="${mediaId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTargetPosition(null); // 完成定位，清空目标
          
          // 更新状态记录
          setLastPreviewId(mediaId);
          setLastPreviewIndex(foundIndex);
          homePageState.lastViewedId = mediaId;
          storage.set('home_last_viewed_id', mediaId);
        } else if (attempt < 15) {
          // 列表可能在渲染中，尝试估算滚动以触发渲染
          if (attempt === 0) {
            const est = Math.floor(foundIndex / columnsCount) * 450;
            scroller?.scrollTo({ top: est, behavior: 'auto' });
          }
          setTimeout(() => scrollToEl(attempt + 1), 200);
        } else {
          console.warn('[Home] 定位重试次数过多，放弃定位');
          setTargetPosition(null);
        }
      };
      scrollToEl();
      return;
    }

    // 2. 没找到且不在加载中，则需要拉取数据
    if (!loading && !loadingMore) {
      // 修复：如果已经加载到对应页码但还没找到，说明该内容在当前筛选下已不存在，放弃定位，避免死循环
      if (rowNumber !== undefined && rowNumber !== -1) {
        const PAGE_SIZE = 48;
        const targetPage = Math.floor(rowNumber / PAGE_SIZE);
        if (targetPage <= page) {
          console.warn('[Home] 已加载到目标页码仍未找到内容，放弃定位');
          setTargetPosition(null);
          return;
        }
      }

      const startFetching = async () => {
        try {
          let targetRow = rowNumber;
          
          // 如果不知道行号，先查行号
          if (targetRow === undefined || targetRow === -1) {
            const sortBy = viewMode === 'popular' ? 'popular' : 'latest';
            const { rowNumber: fetchedRow } = await api.getMediaRowNumber(
              mediaId, user?.id, sortBy, mediaType, categoryId, activeTagIds.length > 0 ? activeTagIds : undefined
            );
            targetRow = fetchedRow;
            // 更新行号信息，继续定位
            if (targetRow !== -1) {
              setTargetPosition(prev => prev ? { ...prev, rowNumber: targetRow } : null);
            } else {
              console.warn('[Home] 无法获取行号，内容可能在当前筛选下不存在');
              setTargetPosition(null);
              // 如果恢复失败，清理记录以免反复尝试
              if (type === 'resume') {
                homePageState.lastViewedId = null;
                storage.remove('home_last_viewed_id');
              }
            }
            return;
          }

          // 如果知道行号，且不在 items 中，说明需要加载更多页面
          const PAGE_SIZE = 48;
          const targetPage = Math.floor(targetRow / PAGE_SIZE);
          
          if (targetPage > page) {
            // 如果目标页在当前页之后，触发加载更多直到到达目标页
            // 这里我们优化下：一次性并发拉取从 page+1 到 targetPage 的所有数据
            setLoadingMore(true);
            const pageIndexes = Array.from({ length: targetPage - page }, (_, i) => page + 1 + i);
            const sortBy = viewMode === 'popular' ? 'popular' : 'latest';
            const tagParam = activeTagIds.length > 0 ? activeTagIds : undefined;

            const results = await Promise.all(
              pageIndexes.map(p => 
                api.getApprovedMedia(p, PAGE_SIZE, user?.id, mediaType, categoryId, sortBy, tagParam, true)
              )
            );

            let newItems = [...items];
            results.forEach(r => { newItems = [...newItems, ...(r.data || [])]; });
            
            setItems(newItems);
            setPage(targetPage);
            setHasMore((targetPage + 1) * PAGE_SIZE < (results[results.length - 1]?.total || 0));
            setLoadingMore(false);
          } else {
            // 如果目标页在当前页之前（理论上 items 中应该有），但 items 却是空的或被清理过
            // 这通常发生在首页刷新或重置后，需要拉取 0..targetPage
            setLoading(true);
            const pageIndexes = Array.from({ length: targetPage + 1 }, (_, i) => i);
            const sortBy = viewMode === 'popular' ? 'popular' : 'latest';
            const tagParam = activeTagIds.length > 0 ? activeTagIds : undefined;

            const results = await Promise.all(
              pageIndexes.map(p => 
                api.getApprovedMedia(p, PAGE_SIZE, user?.id, mediaType, categoryId, sortBy, tagParam, true)
              )
            );

            let newItems: MediaItem[] = [];
            const idSet = new Set();
            results.forEach(r => { 
              (r.data || []).forEach((item: MediaItem) => {
                if (!idSet.has(item.id)) {
                  newItems.push(item);
                  idSet.add(item.id);
                }
              });
            });
            
            setItems(newItems);
            setPage(targetPage);
            setHasMore((targetPage + 1) * PAGE_SIZE < (results[results.length - 1]?.total || 0));
            setLoading(false);
          }
        } catch (err) {
          console.error('[Home] 定位过程中抓取数据失败:', err);
          setTargetPosition(null);
          setLoading(false);
          setLoadingMore(false);
        }
      };
      startFetching();
    }
  }, [targetPosition, items, loading, loadingMore, columnsCount, viewMode, mediaType, categoryId, activeTagIds, user, page]);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || viewMode === 'random' || !hasMore) return;
    setPage(prevPage => {
      const nextPage = prevPage + 1;
      fetchMedia(nextPage, viewMode, mediaType, categoryId);
      return nextPage;
    });
  }, [loading, loadingMore, hasMore, fetchMedia, viewMode, mediaType, categoryId]);

  const isLowEnd = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return ((navigator as any).deviceMemory < 4 || navigator.hardwareConcurrency < 4);
  }, []);

  const virtuosoViewportOffset = isLowEnd ? 600 : 1200;

  // 最后个元素的 Ref，用于追踪到底部（自动触发加载）
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      // 当用户滚动到接近底部时（距离底部 8 个项目），自动加载下一页
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        handleLoadMore();
      }
    }, { rootMargin: '1200px' }); // 提前 1200px 触发加载，约 4-6 行，符合到达 40 个左右自动加载的要求

    if (node) observer.current.observe(node);
  }, [hasMore, loadingMore, loading, handleLoadMore]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTagClick = useCallback((tagId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveTagIds(prev => {
      const next = prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId];
      homePageState.activeTagIds = next;
      // 立即触发刷新数据
      fetchMedia(0, viewMode, mediaType, categoryId, next, true);
      return next;
    });
    setPage(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [viewMode, mediaType, categoryId, fetchMedia]);

  const handleViewModeChange = (mode: string) => {
    const newMode = mode as ViewMode;
    if (viewMode === newMode && homePageState.isInitialized) {
      // 如果模式没变，手动触发刷新
      fetchMedia(0, newMode, mediaType, categoryId, activeTagIds, true);
      return;
    }
    // 切换模式时立即清空并显示加载，提升反馈感
    setItems([]);
    setLoading(true);
    setPage(0);
    setFeedIndex(0); 
    setViewMode(newMode);
    // 立即触发数据获取，确保切换后能看到新数据
    homePageState.viewMode = newMode;
    fetchMedia(0, newMode, mediaType, categoryId, activeTagIds, true);
  };

  const handleCategoryChange = (catId: string) => {
    if (categoryId === catId && homePageState.isInitialized) {
      // 如果分类没变，手动触发刷新
      fetchMedia(0, viewMode, mediaType, catId, activeTagIds, true);
      return;
    }
    setCategoryId(catId);
    setPage(0);
    setFeedIndex(0); // 切换分类时重置 feed 索引
    // 手动触发刷新并更新同步状态，避免 useEffect 延迟或漏发
    homePageState.categoryId = catId;
    fetchMedia(0, viewMode, mediaType, catId, activeTagIds, true);
  };



  // 抖音模式无限滚动：当浏览到最后 3 个作品时加载下一页
  useEffect(() => {
    if (viewLayout === 'feed' && items.length > 0 && feedIndex >= items.length - 3 && hasMore && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMedia(nextPage, viewMode, mediaType, categoryId);
    }
  }, [viewLayout, feedIndex, items.length, hasMore, loadingMore, page, viewMode, mediaType, categoryId, fetchMedia]);
  const handleToggleFavorite = async (mediaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openLoginDialog();
      return;
    }

    // 1. 乐观更新 UI
    let isCurrentlyFavorite = false;
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mediaId)) {
        newSet.delete(mediaId);
        isCurrentlyFavorite = false;
      } else {
        newSet.add(mediaId);
        isCurrentlyFavorite = true;
      }
      return newSet;
    });

    // 2. 交互埋点与反馈
    if (isCurrentlyFavorite) {
      toast.success('已收藏');
      (window as any).pixelTrack?.('favorite', { mediaId });
      api.trackInteraction(mediaId, 'favorite', 5).catch(console.error);

      // 分发彩蛋收藏增加事件
      import('@/lib/utils').then(({ dispatchEasterEggFavoriteAdded }) => {
        dispatchEasterEggFavoriteAdded();
      });
    } else {
      toast.success('已取消收藏');
    }

    // 3. 后台异步发送请求，并带重试逻辑
    try {
      await retryRequest(() => api.toggleFavorite(user.id, mediaId));
    } catch (error: any) {
      console.error('[Async Error] Failed to toggle favorite after retries:', error);
      // PRD: 前端维持视觉反馈状态，避免界面回退造成困惑
      toast.error('网络同步延迟，系统将稍后自动重试', {
        position: 'bottom-right',
        duration: 2000
      });
    }
  };

  const handleDislike = async (mediaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('请先登录以保存您的偏好');
      return;
    }

    // 1. 乐观更新：逻辑移除
    if (viewLayout === 'feed') {
      setPendingRemovals(prev => [...prev, { id: mediaId, removeIndex: feedIndex + 2 }]);
    } else {
      setItems(prev => prev.filter(i => i.id !== mediaId));
    }
    toast.success('已减少此类内容推荐');

    // 2. 后台异步请求，带重试逻辑
    try {
      await retryRequest(() => api.toggleDislike(user.id, mediaId));
    } catch (error: any) {
      console.error('[Async Error] Failed to toggle dislike after retries:', error);
      toast.error('同步偏好失败，请稍后重试', {
        position: 'bottom-right',
        duration: 2000
      });
    }
  };

  // 延迟移除逻辑：监听 feedIndex 变化
  useEffect(() => {
    if (pendingRemovals.length === 0) return;

    const toRemove = pendingRemovals.filter(r => feedIndex >= r.removeIndex);
    if (toRemove.length > 0) {
      const idsToRemove = new Set(toRemove.map(r => r.id));
      setItems(prev => prev.filter(item => !idsToRemove.has(item.id)));
      setPendingRemovals(prev => prev.filter(r => !idsToRemove.has(r.id)));
    }
  }, [feedIndex, pendingRemovals]);

  return (
    <div 
      ref={scrollRef} 
      className={cn(
        "relative w-full min-h-screen",
        viewLayout === 'feed' ? "fixed inset-0 z-[900] overflow-hidden bg-background" : ""
      )}
      style={{
        // @ts-ignore
        "--header-offset": viewLayout === 'timeline' ? "180px" : ((categoryId !== 'all' || activeTagIds.length > 0) ? "180px" : "140px")
      } as React.CSSProperties}
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "w-full bg-background relative pt-14 pb-24",
          viewLayout === 'feed' ? "h-full overflow-hidden" : "min-h-screen"
        )}
      >
      <HomeHeader
        viewLayout={viewLayout}
        previewIndex={previewIndex}
        isCleared={isCleared}
        config={config}
        user={user}
        onBack={() => {
          if (previewIndex >= 0) {
            setPreviewIndex(-1);
            homePageState.previewIndex = -1;
            storage.set('home_preview_index', -1);
          } else {
            setViewLayout('grid');
          }
        }}
        onOpenLogin={openLoginDialog}
        onNavigate={navigate}
        onToggleLayout={() => {
          const next = viewLayout === 'grid' ? 'feed' : 'grid';
          if (next === 'feed') {
            if (previewIndex >= 0) {
              setFeedIndex(previewIndex);
              setPreviewIndex(-1);
            } else if (lastPreviewIndex !== -1) {
              setFeedIndex(lastPreviewIndex);
            }
          } else {
            setTimeout(() => {
              scrollToGlobalIndex(feedIndex);
            }, 0);
          }
          setViewLayout(next);
        }}
        onOpenSearch={() => {
          console.log('[Home] onOpenSearch triggered - attempting to open search dialog');
          setTimeout(() => {
            console.log('[Home] Setting isSearchOpen to true');
            setIsSearchOpenState(true);
          }, 200);
        }}
        onToggleCleared={() => setIsCleared(!isCleared)}
        onReset={() => {
          setCategoryId('all');
          setActiveTagIds([]);
          setMediaType('all');
          setPage(0);
          homePageState.categoryId = 'all';
          homePageState.activeTagIds = [];
          homePageState.mediaType = 'all';
          fetchMedia(0, viewMode, 'all', 'all', [], true);
        }}
        onRefresh={() => handleRefresh()}
        isAdmin={isAdmin}
        mediaType={mediaType}
        categoryId={categoryId}
        activeTagIds={activeTagIds}
        onOpenFilterSheet={(open) => {
          if (open && viewMode === 'latest') {
            fetchMedia(0, 'latest', mediaType, categoryId, activeTagIds, true);
            resetNewItemsCount();
          }
        }}
        FilterContent={() => (
          <FilterContent
            mediaType={mediaType}
            onMediaTypeChange={(t) => {
              setMediaType(t);
              setPage(0);
              homePageState.mediaType = t;
              fetchMedia(0, viewMode, t, categoryId, activeTagIds, true);
            }}
            categories={categories}
            categoryId={categoryId}
            onCategoryChange={handleCategoryChange}
            activeTagIds={activeTagIds}
            allTags={allTags}
            onTagToggle={handleTagToggle}
            onClearFilters={() => {
              setCategoryId('all');
              setActiveTagIds([]);
              setMediaType('all');
              setPage(0);
              homePageState.categoryId = 'all';
              homePageState.activeTagIds = [];
              homePageState.mediaType = 'all';
              fetchMedia(0, viewMode, 'all', 'all', [], true);
            }}
            getRainbowColor={getRainbowColor}
            onDone={() => {
              setPage(0);
              setRefreshCount(p => p + 1);
            }}
          />
        )}
      />

      <FilterBar
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        viewLayout={viewLayout}
        onLayoutChange={(newLayout) => {
          const oldLayout = viewLayout;
          setViewLayout(newLayout as ViewLayout);
          homePageState.viewLayout = newLayout as ViewLayout;
          storage.set(STORAGE_KEYS.VIEW_LAYOUT, newLayout);
          
          // 如果是从 grid/timeline/calendar/stackedCards/freeform/starrySky 之间切换，保留数据
          const sharedDataLayouts = ['grid', 'timeline', 'calendar', 'stackedCards', 'freeform', 'starrySky'];
          if (sharedDataLayouts.includes(oldLayout) && sharedDataLayouts.includes(newLayout)) {
            // 不重置数据，直接切换视图
            return;
          }

          // 否则（如切换到 feed 或其他特殊模式），按需重置
          setPage(0);
          setItems([]);
          setLoading(true);
          setRefreshCount(p => p + 1);
        }}
        previewIndex={previewIndex}
        isCleared={isCleared}
        categoryId={categoryId}
        activeTagIds={activeTagIds}
        categories={categories}
        allTags={allTags}
        onRemoveCategory={() => {
          setCategoryId('all');
          setPage(0);
          setItems([]);
          setLoading(true);
          homePageState.categoryId = 'all';
          fetchMedia(0, viewMode, mediaType, 'all', activeTagIds, true);
        }}
        onRemoveTag={(id) => {
          const next = activeTagIds.filter(pid => pid !== id);
          setActiveTagIds(next);
          setPage(0);
          setItems([]);
          setLoading(true);
          homePageState.activeTagIds = next;
          fetchMedia(0, viewMode, mediaType, categoryId, next, true);
        }}
      />
      {/* 占位符，防止内容被固定的筛选栏遮挡 - 动态计算高度以适应是否有筛选状态 */}
      {(viewLayout === 'grid' || viewLayout === 'timeline' || viewLayout === 'calendar' || viewLayout === 'stackedCards' || viewLayout === 'freeform' || viewLayout === 'starrySky') && !isCleared && (
        <div 
          className={cn(
            "w-full transition-all duration-300 shrink-0",
            viewLayout === 'timeline' ? "h-[180px]" : ((categoryId !== 'all' || activeTagIds.length > 0) ? "h-[180px]" : "h-[140px]")
          )} 
        />
      )}
      {/* 瀑布流模式 */}
      {viewLayout === 'grid' && isVisible && (
        <div className="relative">
          {loading ? (
            <div className="flex gap-1 px-1 items-start overflow-hidden">
              {Array.from({ length: columnsCount }).map((_, i) => (
                <div key={i} className="flex-1 space-y-1 md:space-y-2">
                  <MediaCardSkeleton />
                  <MediaCardSkeleton />
                  <MediaCardSkeleton />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col w-full overflow-x-hidden">
              <div className="flex gap-1.5 px-1.5 items-start relative pb-20">
              {columns.map((col, colIndex) => (
                <div key={colIndex} className="flex-1 min-w-0">
                    <Virtuoso
                      ref={(el) => { virtuosoRefs.current[colIndex] = el; }}
                      useWindowScroll={true}
                      data={col}
                      computeItemKey={(index, item) => item.id}
                      increaseViewportBy={virtuosoViewportOffset}
                      atBottomThreshold={400}
                      itemContent={(itemIndex, item: any) => {
                        const globalIndex = item.isAd ? -1 : items.findIndex(i => i.id === item.id);

                        if (item.isAd || item.type === 'ad') {
                          return (
                            <div key={item.id} className="mb-1 md:mb-2 px-0.5">
                              <AdCard ad={item} />
                            </div>
                          );
                        }

                        return (
                          <div key={item.id} className="flex flex-col gap-1 md:gap-2 mb-1 md:mb-2">
                            <div id={`media-card-${globalIndex}`} 
                              data-media-id={item.id}
                              className="w-full"
                            >
                              <LazyMediaCard 
                                globalIndex={globalIndex}
                                item={item} 
                                priority={globalIndex < 4} 
                                onClick={() => {
                                  setPreviewIndex(globalIndex);
                                  setLastPreviewIndex(globalIndex);
                                  setFeedIndex(globalIndex);
                                  setLastPreviewId(item.id);
                                  if (user) api.trackInteraction(item.id, 'click', 2).catch(console.error);
                                }}
                                isFavorite={favorites.has(item.id)}
                                onToggleFavorite={(e: any) => handleToggleFavorite(item.id, e)}
                                onDislike={(e: any) => handleDislike(item.id, e)}
                                onTagClick={handleTagClick}
                                onAdminAction={handleAdminAction}
                                isCleared={isCleared}
                              />
                            </div>
                          </div>
                        );
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* 加载更多按钮 / Sentinel */}
              {hasMore && (
                <div className="w-full flex flex-col items-center justify-center py-4 pb-20">
                  <Button
                    variant="outline"
                    onClick={() => handleLoadMore()}
                    disabled={loadingMore}
                    className="rounded-full px-6 font-bold text-sm gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        加载中...
                      </>
                    ) : (
                      <>
                        加载更多
                      </>
                    )}
                  </Button>
                  {/* 仍然保留一个小的 Sentinel 作为点击辅助，如果用户滚动到最底部且没看到按钮（极少见） */}
                  <div ref={lastElementRef} className="h-1 w-full pointer-events-none" />
                </div>
              )}

              {/* 匿名限制引导 */}
              {!user && config?.anonymous_view_limit && items.length >= config.anonymous_view_limit && (
                <div className="sticky bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-background via-background/90 to-transparent flex flex-col items-center justify-end pb-10 px-6 z-10 pointer-events-none -mt-40">
                  <div className="bg-card p-6 rounded-3xl shadow-2xl border border-primary/10 text-center animate-in slide-in-from-bottom-10 pointer-events-auto">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                      <LogOut className="w-8 h-8 rotate-180" />
                    </div>
                    <h3 className="text-lg font-bold">登录解锁更多精彩</h3>
                    <p className="text-sm text-muted-foreground mt-2 mb-6">您已达到匿名浏览上限，登录后可无限次浏览全站内容并参与互动</p>
                    <Button className="w-full rounded-xl h-12 font-bold text-base shadow-lg shadow-primary/20" onClick={() => openLoginDialog()}>
                      立即登录 / 注册
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <p className="text-lg">暂无审核通过的内容</p>
              <p className="text-sm">快去上传你的第一个作品吧！</p>
            </div>
          )}

        </div>
      )}
      {/* 抖音模式 - 垂直滚动 Feed */}
      {viewLayout === 'feed' && isVisible && (
        <div className={cn(
          "fixed inset-x-0 top-0 bg-black overflow-hidden shadow-2xl transition-all duration-500 overscroll-none",
          isCleared ? "h-[100dvh] bottom-0 z-[1001]" : "h-[calc(100dvh-5rem)] bottom-20 z-10 pt-14"
        )}>
          <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-black h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <FeedView 
              scene="douyin"
              viewMode={viewMode}
              onRefresh={() => {
                setLoading(true);
                setItems([]);
                fetchMedia(0, viewMode, mediaType, categoryId, activeTagIds, true);
              }}
              items={itemsWithAds}
              loading={loading}
              currentIndex={feedIndex}
              onIndexChange={(index) => {
                setFeedIndex(index);
                homePageState.feedIndex = index;
                storage.set('home_feed_index', index);
                // 同步更新最后查看 ID，以便返回瀑布流时定位
                const targetItem = itemsWithAds[index];
                if (targetItem && !targetItem.isAd) {
                  setLastPreviewId(targetItem.id);
                  setLastPreviewIndex(filteredItems.findIndex(i => i.id === targetItem.id));
                  homePageState.lastViewedId = targetItem.id;
                  storage.set('home_last_viewed_id', targetItem.id);

                  // 记录浏览
                  api.recordMediaView(targetItem.id, user?.id, browserId).catch(console.error);
                  if (!seenMediaIds.includes(targetItem.id)) {
                    setSeenMediaIds(prev => [...prev, targetItem.id]);
                  }
                }
              }}
              isMuted={isMuted}
              onMutedChange={setIsMuted}
              isAutoPlay={isAutoPlay}
              onAutoPlayChange={setIsAutoPlay}
              autoPlayInterval={autoPlayInterval}
              onAutoPlayIntervalChange={setAutoPlayInterval}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onDislike={handleDislike}
              onTagClick={handleTagClick}
              onAdminAction={handleAdminAction}
              emblaRef={emblaRef}
              emblaApi={emblaApi}
              isCleared={isCleared}
              setIsCleared={setIsCleared}
              onBack={() => {
                setViewLayout('grid');
                setTimeout(() => {
                  scrollToGlobalIndex(feedIndex);
                }, 0);
              }}
              onLoadMore={() => fetchMedia(page + 1, viewMode, mediaType, categoryId, activeTagIds)}
              hasMore={hasMore}
              loadingMore={loadingMore}
            />
          </Suspense>
        </div>
      )}

      {/* 时间线模式 */}
      {viewLayout === 'timeline' && isVisible && (
        <TimelineLayout
          scrollParent={scroller}
          items={filteredItems}
          onItemClick={(item, index) => {
            const globalIndex = filteredItems.findIndex(i => i.id === item.id);
            setPreviewIndex(globalIndex);
            setLastPreviewIndex(globalIndex);
            setLastPreviewId(item.id);
          }}
          onTagClick={handleTagClick}
          onToggleFavorite={handleToggleFavorite}
          favorites={favorites}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={() => handleLoadMore()}
          emptyText="暂无审核通过的内容"
        />
      )}

      {/* 文件夹树模式 */}
      {viewLayout === 'folderTree' && isVisible && (
        <FolderTreeLayout
          scrollParent={scroller}
          items={filteredItems}
          onItemClick={(item, index) => {
            const globalIndex = filteredItems.findIndex(i => i.id === item.id);
            setPreviewIndex(globalIndex);
            setLastPreviewIndex(globalIndex);
            setLastPreviewId(item.id);
          }}
          onTagClick={handleTagClick}
          loading={loading}
          emptyText="暂无审核通过的内容"
        />
      )}

      {/* 日历模式 */}
      {viewLayout === 'calendar' && isVisible && (
        <CalendarLayout
          scrollParent={scroller}
          items={filteredItems}
          onItemClick={(item, index) => {
            const globalIndex = filteredItems.findIndex(i => i.id === item.id);
            setPreviewIndex(globalIndex);
            setLastPreviewIndex(globalIndex);
            setLastPreviewId(item.id);
          }}
          onTagClick={handleTagClick}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={() => handleLoadMore()}
          emptyText="暂无审核通过的内容"
        />
      )}

      {/* 卡片叠放模式 */}
      {viewLayout === 'stackedCards' && isVisible && (
        <StackedCardsLayout
          scrollParent={scroller}
          items={filteredItems}
          onItemClick={(item, index) => {
            const globalIndex = filteredItems.findIndex(i => i.id === item.id);
            setPreviewIndex(globalIndex);
            setLastPreviewIndex(globalIndex);
            setLastPreviewId(item.id);
          }}
          onToggleFavorite={handleToggleFavorite}
          favorites={favorites}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={() => handleLoadMore()}
          emptyText="暂无审核通过的内容"
        />
      )}

      {/* 自由排版模式 */}
      {viewLayout === 'freeform' && isVisible && (
        <FreeformLayout
          scrollParent={scroller}
          items={filteredItems}
          onItemClick={(item, index) => {
            const globalIndex = filteredItems.findIndex(i => i.id === item.id);
            setPreviewIndex(globalIndex);
            setLastPreviewIndex(globalIndex);
            setLastPreviewId(item.id);
          }}
          onTagClick={handleTagClick}
          onToggleFavorite={handleToggleFavorite}
          favorites={favorites}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={() => handleLoadMore()}
          emptyText="暂无审核通过的内容"
        />
      )}

      {/* 星空探索模式 */}
      {viewLayout === 'starrySky' && isVisible && (
        <StarrySkyLayout
          scrollParent={scroller}
          items={filteredItems}
          onItemClick={(item, index) => {
            const globalIndex = filteredItems.findIndex(i => i.id === item.id);
            setPreviewIndex(globalIndex);
            setLastPreviewIndex(globalIndex);
            setLastPreviewId(item.id);
          }}
          onTagClick={handleTagClick}
          onToggleFavorite={handleToggleFavorite}
          favorites={favorites}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={() => handleLoadMore()}
          emptyText="暂无审核通过的内容"
        />
      )}

      {/* 瀑布流素材预览层 */}
      <AnimatePresence mode="wait">
        {isVisible && previewIndex >= 0 && (
          <Suspense fallback={<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-md"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <MediaPreview 
              scene="waterfall_feed"
              key={location.pathname}
              items={filteredItems} 
              initialIndex={previewIndex} 
              hasTabBar={!isCleared}
              onTagClick={handleTagClick}
              onClose={() => {
                setPreviewIndex(-1);
                homePageState.previewIndex = -1;
                storage.set('home_preview_index', -1);

                // 当预览关闭时，将瀑布流滚动到最后预览的作品位置
                if (lastPreviewIndex !== -1) {
                  setTimeout(() => {
                    scrollToGlobalIndex(lastPreviewIndex);
                  }, 50);
                }
              }} 
              onLoadMore={() => {
                if (hasMore && !loadingMore) {
                  fetchMedia(page + 1, viewMode, mediaType, categoryId, activeTagIds);
                }
              }}
              onIndexChange={(idx: number) => {
                setPreviewIndex(idx);
                setLastPreviewIndex(idx);
                setFeedIndex(idx); // 同步给抖音模式索引

                // 实时保存进度
                homePageState.previewIndex = idx;
                storage.set('home_preview_index', idx);

                if (filteredItems[idx]) {
                  const targetItem = filteredItems[idx];
                  setLastPreviewId(targetItem.id);
                  // 同步给足迹
                  homePageState.lastViewedId = targetItem.id;
                  storage.set('home_last_viewed_id', targetItem.id);
                  
                  // 记录浏览
                  api.recordMediaView(targetItem.id, user?.id, browserId).catch(console.error);
      <EditMediaDialog
        item={editingItem}
        isOpen={!!editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
        onSave={(updatedItem) => {
          setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
          setEditingItem(null);
        }}
      />
                  if (!seenMediaIds.includes(targetItem.id)) {
                    setSeenMediaIds(prev => [...prev, targetItem.id]);
                  }
                }
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* 底部悬浮按钮组 */}
      <div className={cn(
        "fixed bottom-24 right-4 z-[1002] flex flex-col gap-3 transition-all duration-500",
        (previewIndex !== -1) && "opacity-0 translate-y-10 pointer-events-none"
      )}>
        {/* 清爽模式恢复按钮 */}
        {isCleared && (
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full shadow-lg h-12 w-12 bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition-all duration-300 animate-in fade-in zoom-in"
            onClick={() => setIsCleared(false)}
            title="恢复界面"
          >
            <Maximize2 className="w-6 h-6" />
          </Button>
        )}

        {/* 刷新按钮 - 仅瀑布流和时间线模式 */}
        {(viewLayout === 'grid' || viewLayout === 'timeline') && (
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full shadow-lg h-12 w-12 bg-card/80 backdrop-blur-md border border-border/50 transition-all duration-300 relative"
            onClick={() => {
              handleRefresh();
              resetNewItemsCount();
            }}
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-6 h-6", refreshing && "animate-spin")} />
          </Button>
        )}

        {/* 返回顶部按钮 - 仅瀑布流和时间线模式 */}
        {(viewLayout === 'grid' || viewLayout === 'timeline') && showScrollTop && (
          <Button
            size="icon"
            className="rounded-full shadow-lg h-12 w-12 bg-primary hover:bg-primary/90 animate-in fade-in zoom-in transition-all duration-300"
            onClick={scrollToTop}
          >
            <ChevronUp className="w-6 h-6" />
          </Button>
        )}



        {/* 搜索对话框 */}
        <Dialog open={isSearchOpen} onOpenChange={(open) => {
          setIsSearchOpenState(open);
          if (!open) {
            setSearchQuery('');
            setSearchResults([]);
            setSearchPreviewIndex(-1);
          }
        }}>
          <DialogContent 
            className="w-full sm:max-w-4xl h-[85vh] max-h-[85dvh] rounded-none sm:rounded-[32px] p-0 overflow-hidden border-none shadow-2xl flex flex-col bg-background/95 backdrop-blur-xl fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            onPointerDownOutside={(e) => {
              if (searchPreviewIndex !== -1) {
                e.preventDefault();
                setSearchPreviewIndex(-1);
              }
            }}
            onEscapeKeyDown={(e) => {
              if (searchPreviewIndex !== -1) {
                e.preventDefault();
                setSearchPreviewIndex(-1);
              }
            }}
          >
            <DialogHeader className="sr-only">
              <DialogTitle>搜索探索</DialogTitle>
              <DialogDescription>搜索标题、描述或标签</DialogDescription>
            </DialogHeader>
            <div className="p-4 md:p-6 border-b border-border/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Search className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black tracking-tight">搜索探索</h3>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">输入关键词开启视觉旅程</p>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-12 h-12 md:h-14 rounded-2xl bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary text-sm md:text-base font-medium"
                  placeholder="搜索作品标题、描述或关键词..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  autoFocus
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              {isSearching ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                    <Search className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest text-muted-foreground/60 animate-pulse">正在深度搜索中...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">找到 {searchResults.length} 个结果</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-3 rounded-lg text-[10px] font-bold text-primary"
                      onClick={() => handleSearch()}
                    >
                      重新搜索
                    </Button>
                  </div>
                  {/* 瀑布流网格布局 */}
                  <div className="columns-2 md:columns-3 gap-3 space-y-3">
                    {searchResults.map((item, idx) => (
                      <div 
                        key={item.id}
                        className="break-inside-avoid group relative rounded-2xl overflow-hidden bg-muted/30 border border-border/10 cursor-pointer transition-all active:scale-[0.98] z-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('[Home] Search item clicked:', idx);
                          setSearchPreviewIndex(idx);
                        }}
                      >
                        <ProtectedMedia
                          src={item.url}
                          alt={item.title || ''}
                          className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
                          type={item.type}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 flex flex-col justify-end">
                          <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge className="bg-primary/20 text-primary border-none text-[8px] h-4 px-1">
                              {item.type === 'image' ? '图集' : '视频'}
                            </Badge>
                          </div>
                        </div>
                        {/* 视频标识 */}
                        {item.type === 'video' && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                            <Play className="w-3 h-3 text-white fill-current" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : searchQuery.trim() && !isSearching ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <Search className="w-10 h-10 text-muted-foreground/20" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black uppercase tracking-widest">未找到相关结果</p>
                    <p className="text-[10px] mt-1 font-bold">尝试换个关键词再搜搜看</p>
                  </div>
                </div>
              ) : (
                <div className="min-h-full flex flex-col items-center justify-start py-8 space-y-6">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center animate-pulse" />
                    <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary/40" />
                  </div>
                  <div className="text-center space-y-6 pb-8">
                    <div className="space-y-2">
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-foreground/80">开启你的视觉探索</p>
                      <div className="h-1 w-12 bg-primary mx-auto rounded-full" />
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-2 max-w-[340px] mx-auto pt-2">
                      {recommendTags.length > 0 ? recommendTags.map((tag, idx) => (
                        <Badge 
                          key={tag.id} 
                          variant="secondary" 
                          className={cn(
                            "rounded-2xl px-5 py-2.5 cursor-pointer transition-all duration-300 border border-border/40 flex items-center gap-2 group hover:scale-105 active:scale-95 shadow-sm",
                            "hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:shadow-primary/20"
                          )}
                          style={{
                            animationDelay: `${idx * 50}ms`
                          }}
                          onClick={() => {
                            setSearchQuery(tag.name);
                            setTimeout(() => handleSearch(tag.name), 10);
                          }}
                        >
                          <Hash className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:rotate-12 transition-all" />
                          <span className="font-bold text-sm tracking-tight">{tag.name}</span>
                        </Badge>
                      )) : (
                        ['热门', '风景', '插画', '生活', '艺术'].map((tag, idx) => (
                          <Badge 
                            key={tag} 
                            variant="secondary" 
                            className="rounded-2xl px-5 py-2.5 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all border border-border/40 flex items-center gap-2"
                            onClick={() => {
                              setSearchQuery(tag);
                              setTimeout(() => handleSearch(tag), 10);
                            }}
                          >
                            <Hash className="w-3 h-3 opacity-40" />
                            <span className="font-bold text-sm">{tag}</span>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-muted/20 border-t border-border/10 flex justify-center">
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                onClick={() => setIsSearchOpenState(false)}
              >
                关闭搜索界面
              </Button>
            </div>

            {/* 搜索结果大图预览 - 放置在 DialogContent 内部，使其受限于弹窗区域，并解决点击外部返回的问题 */}
            <AnimatePresence>
              {searchPreviewIndex !== -1 && (
                <div className="absolute inset-0 z-[200] bg-black rounded-[32px] overflow-hidden">
                  <Suspense fallback={<div className="h-full w-full bg-black/60 backdrop-blur-md flex items-center justify-center z-[201]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
                    <MediaPreview
                      items={searchResults}
                      initialIndex={searchPreviewIndex}
                      onClose={() => setSearchPreviewIndex(-1)}
                      onIndexChange={(idx: number) => setSearchPreviewIndex(idx)}
                      scene="general"
                    />
                  </Suspense>
                </div>
              )}
            </AnimatePresence>
          </DialogContent>
        </Dialog>

        {/* 背景音乐控制已移动到全局 GlobalMusicPlayer */}

        {/* 刷新按钮 */}

        {/* 回到顶部按钮 */}
        <AnimatePresence>
          {showScrollTop && (
            <></>
          )}
        </AnimatePresence>

        {/* 实时缓存统计推送 - 仅管理员可见且精简显示 */}
        {profile?.role === 'admin' && cacheStats && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed bottom-24 left-4 z-50 pointer-events-none"
          >
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full pl-2 pr-3 py-1 shadow-2xl flex items-center gap-2 ring-1 ring-white/20">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] text-white/40 font-black uppercase tracking-tighter">Hit</span>
                <span className="text-xs font-black text-white tabular-nums">{cacheStats.hit_rate.toFixed(1)}%</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {profile?.role === 'admin' && (
        <Suspense fallback={null}>
          <EditMediaDialog 
            item={itemToEdit}
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSave={(updated) => {
              setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
              if (itemToEdit?.id === updated.id) setItemToEdit(updated);
            }}
          />
        </Suspense>
      )}
    </motion.div>
    </div>
  );
}

