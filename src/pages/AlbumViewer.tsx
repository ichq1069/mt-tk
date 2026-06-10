import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/db/api';
import { cn, compressImage } from '@/lib/utils';
import { applyZoneramaPhotoApiSync, getImageUrl } from '@/lib/media';
import { useAuth } from '@/contexts/AuthContext';
import { useConfig } from '@/contexts/ConfigContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, ChevronLeft, LayoutGrid, BookOpen, Smartphone, Info, Share2, 
  Lock, X, ChevronRight, ChevronUp, ChevronDown, Upload, CheckCircle2, Shield,
  Image as ImageIcon, Type, List, Calendar, Tag, RefreshCw, Search, PlayCircle, Scan, Maximize
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { NativeAd } from '@/components/common/NativeAd';
import { useAds } from '@/contexts/AdContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { PhotoAlbum, AlbumPhoto, PhotoAlbumRequest, AlbumCustomField, AlbumPermissionLevel } from '@/types';
import { getFingerprint } from '@/lib/fingerprint';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';

import { AlbumHeader } from './album-viewer/components/AlbumHeader';
import { AccessRequestDialog } from './album-viewer/components/AccessRequestDialog';
import { ProgressRestoreDialog } from './album-viewer/components/ProgressRestoreDialog';
import { AlbumInfoSidebar } from './album-viewer/components/AlbumInfoSidebar';
import { AutoPlayControls } from './album-viewer/components/AutoPlayControls';
import { ViewerModeSwitcher } from './album-viewer/components/ViewerModeSwitcher';
import { levelWeightMap, checkHasAlbumAccess as checkHasAlbumAccessUtil } from './album-viewer/utils/albumUtils';

type ViewerMode = 'gallery' | 'book' | 'tiktok';

export default function AlbumViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, permissions, openLoginDialog } = useAuth();
  const { config } = useConfig();
  const { getAdsByPlacement } = useAds();
  const albumAds = getAdsByPlacement('albums');
  
  const [album, setAlbum] = useState<PhotoAlbum | null>(null);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(6);
  const [total, setTotal] = useState(0);
  const [mode, setMode] = useState<ViewerMode>('gallery');
  const [currentIndex, setCurrentIndex] = useState(0); // 当前页内的索引
  const [magnifyLevel, setMagnifyLevel] = useState(() => {
    const saved = localStorage.getItem('magnify_level');
    return saved ? parseInt(saved) : 3;
  });
  const [isMagnifierMode, setIsMagnifierMode] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(() => {
    return localStorage.getItem('album_auto_play') === 'true';
  });
  const [autoPlayInterval, setAutoPlayInterval] = useState(() => {
    const saved = localStorage.getItem('album_auto_play_interval');
    return saved ? parseInt(saved) : 5000;
  });
  const [autoPlayProgress, setAutoPlayProgress] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    localStorage.setItem('album_auto_play', String(isAutoPlay));
  }, [isAutoPlay]);

  const [magnifierType, setMagnifierType] = useState<'lens' | 'navigator'>('lens');
  const [magnifier, setMagnifier] = useState<{ 
    active: boolean; 
    x: number; 
    y: number; 
    px: number; 
    py: number; 
    show: boolean; 
    transform: string;
    imgW: number;
    imgH: number;
    imgOffsetLeft: number;
    imgOffsetTop: number;
    longPressTimer?: NodeJS.Timeout | null;
  }>({ 
    active: false, 
    x: 0, 
    y: 0, 
    px: 0.5, 
    py: 0.5, 
    show: false, 
    transform: 'translate(-50%, -50%)',
    imgW: 0,
    imgH: 0,
    imgOffsetLeft: 0,
    imgOffsetTop: 0,
    longPressTimer: null
  });

  // 双手缩放状态
  const [pinch, setPinch] = useState({
    scaling: false,
    scale: 1,
    initialDistance: 0,
    lastScale: 1,
    centerX: 0,
    centerY: 0,
    translateX: 0,
    translateY: 0,
    lastTranslateX: 0,
    lastTranslateY: 0,
    startClientX: 0,
    startClientY: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0
  });

  // 放大模式选择：'magnifier' 单指放大镜 | 'pinch' 双指缩放
  const [zoomMode, setZoomMode] = useState<'magnifier' | 'pinch'>(() => {
    const saved = localStorage.getItem('album_zoom_mode');
    return (saved === 'pinch' || saved === 'magnifier') ? saved : 'magnifier';
  });

  useEffect(() => {
    localStorage.setItem('album_zoom_mode', zoomMode);
  }, [zoomMode]);

  const magnifierTimer = useRef<NodeJS.Timeout | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Map<string, string>>(new Map());
  const handleUrlResolved = useCallback((id: string, url: string) => {
    setResolvedUrls(prev => {
      if (prev.get(id) === url) return prev;
      const next = new Map(prev);
      next.set(id, url);
      return next;
    });
  }, []);


  useEffect(() => {
    localStorage.setItem('magnify_level', magnifyLevel.toString());
  }, [magnifyLevel]);

  // 模式发生变化时重置
  useEffect(() => {
    if (!isMagnifierMode) {
      setMagnifier(prev => ({ ...prev, active: false, show: false, transform: 'translate(-50%, -50%)' }));
    }
  }, [isMagnifierMode]);

  const emblaApiRef = useRef<any>(null);

  // 监听缩放或移动，如果菜单开启则关闭它 (这里虽然没有 DropdownMenu，但可能有其他的层需要注意)
  useEffect(() => {
    if (magnifier.active || pinch.scaling) {
      // 如果有任何弹窗开启，可以在这里关闭
    }
  }, [magnifier.active, pinch.scaling]);

  // 当切换图片或模式时，重置放大镜
  useEffect(() => {
    setMagnifier(prev => ({ ...prev, active: false, show: false }));
  }, [currentIndex, page, mode]);

  const [showInfo, setShowInfo] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [canSaveProgress, setCanSaveProgress] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [savedIndex, setSavedIndex] = useState<number | null>(null);
  const [savedMode, setSavedMode] = useState<ViewerMode | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestAttachment, setRequestAttachment] = useState<File | null>(null);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [albumPermission, setAlbumPermission] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [levelCounts, setLevelCounts] = useState<any>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [customFieldConfigs, setCustomFieldConfigs] = useState<any[]>([]);

  const [itemRuleKeys, setItemRuleKeys] = useState<Map<string, string>>(new Map());

  // 根据场景初始化默认规则
  useEffect(() => {
    if (photos.length > 0) {
      setItemRuleKeys(prev => {
        const next = new Map(prev);
        let changed = false;
        photos.forEach(item => {
          // 仅初始化不存在的项，避免覆盖用户手动切换的 'none' (原图)
          if (!next.has(item.id)) {
            const targetRule = mode === 'tiktok' ? '抖音' : '写-网';
            next.set(item.id, targetRule);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [photos, mode]);

  const [seenMediaIds, setSeenMediaIds] = useState<string[]>([]);
  const [hideSeen, setHideSeen] = useState(true);
  const [browserId, setBrowserId] = useState(() => localStorage.getItem('miaoda_browser_fingerprint') || '');
  useEffect(() => {
    getFingerprint().then(setBrowserId);
  }, []);

  // 将函数提升至顶部并改为 function 声明以解决 Hoisting 问题
  async function fetchMyRequests(silent = true) {
    if (!profile?.id) return;
    try {
      const { data } = await api.getMyAlbumAccessRequests(profile.id);
      if (data) {
        setMyRequests(data);
        const approvedReq = data.find((r: any) => r.album_id === id && r.status === 'approved');
        if (approvedReq) {
          const { data: permData } = await api.getAlbumUserPermission(id!, profile.id);
          if (permData) {
            setAlbumPermission(permData.level);
          }
          setShowRequestModal(false);
          if (!silent) toast.success('权限申请已通过，您可以查看内容了');
          return;
        }

        const pendingReq = data.find((r: any) => r.album_id === id && r.status === 'pending');
        if (!silent) {
          if (pendingReq) {
            toast.info('状态已刷新：您的申请仍在审核中');
          } else {
            const rejectedReq = data.find((r: any) => r.album_id === id && r.status === 'rejected');
            if (rejectedReq) {
              toast.error('状态已刷新：您的申请已被驳回');
            } else if (!checkHasAlbumAccess(album)) {
              toast.info('状态已刷新：请提交权限申请');
            } else {
              toast.success('状态已刷新：您已拥有访问权限');
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      if (!silent) toast.error('刷新状态失败');
    }
  }

  const fetchSeenMediaIds = useCallback(async () => {
    try {
      const { data } = await api.getSeenMediaIds(user?.id, browserId);
      if (data) setSeenMediaIds(data);
    } catch (e) {
      console.error('Fetch seen media ids error:', e);
    }
  }, [user, browserId]);

  useEffect(() => {
    fetchSeenMediaIds();
  }, [fetchSeenMediaIds]);

  // 记录已看图片
  useEffect(() => {
    if (mode === 'book' && photos.length > 0 && photos[currentIndex]) {
      if (id && user?.id) {
         api.updateAlbumViewingHistory(user.id, id, currentIndex, mode);
      }
    }
  }, [currentIndex, mode, photos, id, user]);

  // 当权限发生变化时，如果已经有权限了，自动关闭申请弹窗
  useEffect(() => {
    if (album && checkHasAlbumAccess(album) && showRequestModal) {
      setShowRequestModal(false);
    }
  }, [albumPermission, profile?.album_level, album, showRequestModal]);

  async function fetchAlbumBaseData(albumId: string) {
    try {
      const [{ data: albumData }, { data: countsData }, { data: permData }, { data: fieldsData }] = await Promise.all([
        api.getPhotoAlbum(albumId),
        api.getAlbumPhotoLevelCounts(albumId),
        profile?.id ? api.getAlbumUserPermission(albumId, profile.id) : Promise.resolve({ data: null, error: null }),
        api.getAlbumCustomFields()
      ]);
      
      if (albumData) {
        setAlbum(albumData);
        setLevelCounts(countsData);
        if (permData) setAlbumPermission(permData.level);
        if (fieldsData) setCustomFieldConfigs(fieldsData);
        if (albumData.is_public === false && profile?.id) {
          api.joinAlbum(profile.id, albumId).catch(console.error);
        }
      } else {
        toast.error('图集未找到');
        navigate('/albums');
      }
    } catch (e) {
      console.error(e);
    }
  }

  const levelWeightMap = useMemo<Record<string, number>>(() => ({ 
    'normal': 1, 'pt': 1, 'vip': 2, 'svip': 3, 'restricted': 4, 'vvip': 4 
  }), []);

  // 计算当前用户的“有效等级”
  // 逻辑：
  // 1. 图集开启申请模式：仅使用管理员授予该用户的图集内专属等级 (albumPermission)
  // 2. 图集未开启申请模式：优先使用图集专属等级（如果存在），否则使用账户全局等级
  const effectiveUserLevel = useMemo(() => {
    if (profile?.role === 'admin') return 'vvip';
    if (album?.apply_switch) {
      return albumPermission || 'pt';
    }
    return albumPermission || profile?.album_level || 'pt';
  }, [profile, albumPermission, album?.apply_switch]);

  const allowedLevels = useMemo(() => {
    if (profile?.role === 'admin') return ['normal', 'pt', 'vip', 'svip', 'vvip', 'restricted'];
    
    const levels = ['normal', 'pt'];
    const perms = permissions || [];

    // 逻辑：发生冲突时优先写真图集内的用户管理权限最高级，其次权限组
    if (albumPermission) {
      // 1. 如果有专属授权，严格按专属等级判定，不看权限点
      const userW = levelWeightMap[albumPermission as any] || 1;
      if (userW >= 2) levels.push('vip');
      if (userW >= 3) levels.push('svip');
      if (userW >= 4) levels.push('vvip', 'restricted');
    } else {
      // 2. 没有专属授权，合并账户全局等级和权限组权限点
      const userW = levelWeightMap[effectiveUserLevel as any] || 1;
      if (userW >= 2) levels.push('vip');
      if (userW >= 3) levels.push('svip');
      if (userW >= 4) levels.push('vvip', 'restricted');
      
      // 权限点额外补充
      if (perms.includes('album_level_vip') && !levels.includes('vip')) levels.push('vip');
      if (perms.includes('album_level_svip') && !levels.includes('svip')) levels.push('svip');
      if (perms.includes('album_level_vvip')) {
        if (!levels.includes('vvip')) levels.push('vvip');
        if (!levels.includes('restricted')) levels.push('restricted');
      }
    }
    
    return Array.from(new Set(levels));
  }, [profile?.role, effectiveUserLevel, albumPermission, permissions, levelWeightMap]);

  async function fetchPhotos(albumId: string, pageNum: number, limit: number, level?: string, append = false) {
    if (fetchingBatch) return;
    if (!append) setLoading(true);
    setFetchingBatch(true);
    try {
      // 使用服务器端过滤，确保分页和总数一致
      const res = await api.getAlbumPhotos(albumId, pageNum, limit, level, true, allowedLevels);
      if (res.data) {
        const data = res.data || [];
        if (append) {
          setPhotos(prev => {
            const existingIds = new Set(prev.map((p: any) => p.id));
            const newPhotos = data.filter((p: any) => !existingIds.has(p.id));
            return [...prev, ...newPhotos];
          });
        } else {
          setPhotos(data);
        }
        setTotal(res.total || 0);
        setHasMore(data.length === limit);
        if (!append && currentIndex >= data.length) {
          setCurrentIndex(0);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setFetchingBatch(false);
    }
  }


  const checkHasAlbumAccess = useCallback((targetAlbum: PhotoAlbum | null) => {
    return checkHasAlbumAccessUtil(targetAlbum, profile, albumPermission, levelWeightMap, effectiveUserLevel);
  }, [profile, albumPermission, effectiveUserLevel]);

  function checkPhotoAccess(photo: AlbumPhoto) {
    if (!photo || !album) return false;
    if (profile?.role === 'admin') return true;
    if (!checkHasAlbumAccess(album)) return false;
    if (photo.level === 'normal') return true;
    if (!profile) return false;
    
    return !!photo.level && allowedLevels.includes(photo.level);
  }

  const zonePhotoUrl = useMemo(() => {
    if (!album?.custom_field_values || !customFieldConfigs.length) return null;
    const values = album.custom_field_values as any;
    if (values.zonephoto) return values.zonephoto;
    const field = customFieldConfigs.find(f => f.name.toLowerCase() === 'zonephoto');
    return field && values[field.id] ? values[field.id] : null;
  }, [album, customFieldConfigs]);

  const handleLevelChange = (newLevel: string) => {
    setSelectedLevel(newLevel);
    setPage(0);
    setCurrentIndex(0);
  };

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingBatch, setFetchingBatch] = useState(false);

  function renderCustomField(field: any, val: any) {
    if (val === null || val === undefined || val === '') return null;
    if (Array.isArray(val) && val.length === 0) return null;
    const isArray = Array.isArray(val);
    const displayValues = isArray ? val : [val];
    let icon = <Type className="w-3 h-3" />;
    let colorClass = "bg-slate-500/10 text-slate-400 border-slate-500/20";
    switch (field.type) {
      case 'select': icon = <List className="w-3 h-3" />; colorClass = "bg-blue-500/10 text-blue-400 border-blue-500/20"; break;
      case 'date': icon = <Calendar className="w-3 h-3" />; colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"; break;
      case 'multi_tag': icon = <Tag className="w-3 h-3" />; colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20"; break;
    }
    return (
      <div key={field.id} className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold opacity-30 uppercase tracking-tight flex items-center gap-1.5">{icon}{field.name}</span>
        <div className="flex flex-wrap gap-1.5">
          {displayValues.map((v: string, idx: number) => (
            <Badge key={idx} variant="outline" className={cn("px-2 py-0.5 rounded-lg text-[11px] font-bold border", colorClass)}>{v}</Badge>
          ))}
        </div>
      </div>
    );
  }

  const globalIndex = currentIndex;

  useEffect(() => {
    if (id && total > 0 && initialLoaded && canSaveProgress) {
      // 只有在非列表模式，或者明确点击了某个项目时才更新进度
      // 避免单纯的列表滚动导致 page 增加而 currentIndex 没变产生的索引跳跃
      if (mode !== 'gallery') {
        const progressKey = user ? `album_progress_${id}_${user.id}` : `album_progress_${id}_guest`;
        localStorage.setItem(progressKey, globalIndex.toString());
        localStorage.setItem(`${progressKey}_mode`, mode);
        localStorage.setItem(`${progressKey}_level`, selectedLevel);
        if (user) api.updateAlbumViewingHistory(user.id, id, globalIndex, `${mode}:${selectedLevel}`).catch(console.error);
      }
    }
  }, [id, globalIndex, total, initialLoaded, user, canSaveProgress, selectedLevel, mode]);

  useEffect(() => {
    async function checkProgress() {
      if (id && total > 0 && !initialLoaded) {
        let foundIndex: number | null = null;
        let foundLevel: string | null = null;
        if (user) {
          const { data } = await api.getAlbumViewingHistory(user.id, id);
          if (data && data.last_photo_index >= 0) {
            foundIndex = data.last_photo_index;
            if (data.last_mode?.includes(':')) {
              const [m, l] = data.last_mode.split(':');
              setSavedMode(m as ViewerMode);
              foundLevel = l;
            } else {
              setSavedMode(data.last_mode as ViewerMode);
            }
          }
        }
        if (foundIndex === null) {
          const progressKey = user ? `album_progress_${id}_${user.id}` : `album_progress_${id}_guest`;
          const savedProgress = localStorage.getItem(progressKey);
          if (savedProgress) {
            const index = parseInt(savedProgress);
            if (!isNaN(index) && index >= 0 && index < total) {
              foundIndex = index;
              const modeKey = `${progressKey}_mode`;
              const savedModeVal = localStorage.getItem(modeKey);
              if (savedModeVal) setSavedMode(savedModeVal as ViewerMode);
              
              const levelKey = `${progressKey}_level`;
              const savedLevelVal = localStorage.getItem(levelKey);
              if (savedLevelVal) foundLevel = savedLevelVal;
            }
          }
        }
        if (foundIndex !== null) {
          setSavedIndex(foundIndex);
          if (foundLevel) setSelectedLevel(foundLevel);
          // 优化：恢复提示，询问用户是否从上次位置开始
          setShowProgressModal(true);
          if (savedMode) setSavedMode(savedMode);
          else setSavedMode('book');
          setCanSaveProgress(true);
        } else {
          setCanSaveProgress(true);
        }
        setInitialLoaded(true);
      }
    }
    checkProgress();
  }, [id, total, initialLoaded, user]);

  function handleContinueReading() {
    if (savedIndex !== null) {
      goToGlobalIndex(savedIndex);
      if (savedMode) setMode(savedMode);
      else setMode('book');
      setShowProgressModal(false);
      setCanSaveProgress(true);
    }
  }

  function handleStartOver() {
    setShowProgressModal(false);
    setCanSaveProgress(true);
  }

  useEffect(() => {
    if (mode === 'gallery' && gridContainerRef.current) {
      setTimeout(() => {
        const activeItem = gridContainerRef.current?.querySelector(`[data-index="${currentIndex}"]`);
        if (activeItem) activeItem.scrollIntoView({ behavior: 'auto', block: 'center' });
      }, 100);
    }
  }, [mode, currentIndex]);

  function goToGlobalIndex(index: number) {
    if (index < 0 || (total > 0 && index >= total)) return;
    setLoadProgress(0);
    
    // 如果目标索引已经加载在内存中
    if (index < photos.length) {
      setCurrentIndex(index);
    } 
    // 如果目标索引超出了当前已加载的范围，且还有更多数据
    else if (hasMore && !fetchingBatch) {
      // 触发加载下一页，加载完成后数据会自动追加到 photos 数组中
      setPage(prev => prev + 1);
      // 同时设置当前索引，这样数据一旦加载，页面就会显示对应的项
      setCurrentIndex(index);
    }
  }

  useEffect(() => {
    if (id) {
      fetchAlbumBaseData(id);
    }
  }, [id, profile?.id]);

  const getPhotoUrl = (photo: any) => {
    return photo?.url || '';
  };

  const isApproved = useMemo(() => {
    if (!album) return false;
    return checkHasAlbumAccess(album);
  }, [albumPermission, myRequests, id, album, permissions, profile?.album_level, profile?.group_id]);

  useEffect(() => {
    if (id) {
      // 只要 page 为 0，就应该是重置加载，而不是追加
      const isAppend = page > 0;
      fetchPhotos(id, page, pageSize, selectedLevel, isAppend);
    }
    if (profile?.id) fetchMyRequests();
  }, [id, page, pageSize, profile?.id, selectedLevel, isApproved, effectiveUserLevel]);

  useEffect(() => {
    if (mode !== 'gallery') return;
    const observer = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !fetchingBatch && photos.length > 0) setPage(prev => prev + 1);
    }, { threshold: 0.1 });
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [mode, hasMore, fetchingBatch, photos.length]);

  async function handleSubmitRequest() {
    if (!profile) {
      const from = encodeURIComponent(window.location.pathname + window.location.search);
      navigate(`/login?from=${from}`);
      return;
    }
    if (!requestReason) { toast.error('请填写申请理由'); return; }
    setRequestSubmitting(true);
    try {
      let attachmentUrl = '';
      if (requestAttachment) {
        const processedFile = await compressImage(requestAttachment);
        const { data: uploadRes, error: uploadError } = await api.uploadToR2(
          processedFile, `requests/${profile.id}/${Date.now()}_${requestAttachment.name}`
        );
        if (uploadError) throw uploadError;
        attachmentUrl = uploadRes?.publicUrl || '';
      }
      const { error } = await api.submitAlbumAccessRequest(profile.id, id!, requestReason, attachmentUrl);
      if (error) throw error;
      toast.success('申请已提交，请等待管理员审核');
      setShowRequestModal(false);
      setRequestReason('');
      setRequestAttachment(null);
      if (id) {
        fetchAlbumBaseData(id);
        fetchMyRequests();
      }
    } catch (e: any) {
      toast.error('提交申请失败: ' + e.message);
    } finally {
      setRequestSubmitting(false);
    }
  }

  const currentPhoto = photos[currentIndex];

  const handlePrev = () => {
    if (isMagnifierMode) return;
    if (globalIndex > 0) goToGlobalIndex(globalIndex - 1);
  };

  const handleNext = () => {
    if (isMagnifierMode) return;
    if (globalIndex < total - 1) goToGlobalIndex(globalIndex + 1);
  };

  // 自动播放定时器
  useEffect(() => {
    // 增加细节模式判断：如果是放大镜模式或处于缩放模式，不进行翻页
    // 如果图片尚未加载完成 (loadProgress > 0 && loadProgress < 100)，也暂停计时
    if (!isAutoPlay || mode === 'gallery' || isMagnifierMode || (loadProgress > 0 && loadProgress < 100)) {
      setAutoPlayProgress(0);
      return;
    }

    const currentPhoto = photos[currentIndex];
    // 写真图集目前均为图片，适当增加 0.5 秒展示时间
    const isImage = true; 
    const interval = autoPlayInterval + (isImage ? 500 : 0);
    const startTime = Date.now();
    
    let animationFrame: number;
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / interval) * 100, 100);
      setAutoPlayProgress(progress);
      
      if (progress < 100) {
        animationFrame = requestAnimationFrame(updateProgress);
      }
    };
    
    animationFrame = requestAnimationFrame(updateProgress);

    const timer = setTimeout(() => {
      if (globalIndex < total - 1) {
        handleNext();
      } else {
        // 如果是最后一页，回到第一页循环播放
        goToGlobalIndex(0);
      }
    }, interval);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationFrame);
    };
  }, [isAutoPlay, globalIndex, autoPlayInterval, mode, total, isMagnifierMode, photos, currentIndex, loadProgress]);

  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col overflow-hidden select-none text-white">
      {/* 底部全屏自动播放进度条 */}
      {isAutoPlay && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/5 z-[110] pointer-events-none overflow-hidden">
          <motion.div 
            className="h-full bg-primary shadow-[0_0_15px_rgba(59,130,246,0.6)]"
            initial={{ width: 0 }}
            animate={{ width: `${autoPlayProgress}%` }}
            transition={{ type: "tween", ease: "linear", duration: 0.1 }}
          />
        </div>
      )}
      {/* 顶部工具栏 */}
      <AlbumHeader 
        album={album}
        mode={mode}
        onModeChange={setMode}
        onBack={() => {
          if (mode !== 'gallery') {
            setMode('gallery');
          } else {
            navigate(-1);
          }
        }}
        onShowInfo={() => setShowInfo(true)}
        isScrolled={isScrolled}
      />

      <main className="flex-1 relative overflow-hidden flex flex-col">
        <header className="fixed top-0 inset-x-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            {/* 快捷返回已经在 AlbumHeader 中 */}
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <AutoPlayControls 
              isAutoPlay={isAutoPlay}
              onAutoPlayChange={setIsAutoPlay}
              autoPlayInterval={autoPlayInterval}
              onIntervalChange={(t) => {
                setAutoPlayInterval(t);
                localStorage.setItem('album_auto_play_interval', String(t));
              }}
              mode={mode}
            />

            <ViewerModeSwitcher 
              mode={mode}
              onModeChange={(m) => {
                setMode(m);
                setIsMagnifierMode(false);
              }}
            />

            {!checkHasAlbumAccess(album) && !loading && (
              <Button 
                variant="default" 
                size="sm" 
                className={cn(
                  "rounded-full h-8 font-bold text-[10px] px-3 gap-1 shadow-lg animate-in fade-in zoom-in duration-300",
                  myRequests.some(r => r.album_id === id && r.status === 'pending') 
                    ? "bg-amber-500 hover:bg-amber-600 text-white" 
                    : "bg-primary text-white shadow-primary/20"
                )}
                onClick={() => {
                  if (!profile) {
                    openLoginDialog?.();
                    return;
                  }
                  setShowRequestModal(true);
                }}
              >
                <Lock className="w-3 h-3" />
                {(() => {
                  const req = myRequests.find(r => r.album_id === id);
                  if (req?.status === 'pending') return '审核中';
                  if (req?.status === 'rejected') return '重新申请';
                  return '申请权限';
                })()}
              </Button>
            )}
          </div>
        </header>

        {loading && !photos.length ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs font-bold mt-4 opacity-50 uppercase tracking-widest">
              正在加载...
            </p>
          </div>
        ) : (
          <>
            {/* Grid / Gallery Mode */}
            {mode === 'gallery' && (
              <div ref={gridContainerRef} className="flex-1 overflow-y-auto p-4 pt-20 custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {photos.length === 0 && !loading && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-white/20">
                      <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm font-bold">该等级暂无图片</p>
                      {selectedLevel !== 'all' && (
                        <Button 
                          variant="link" 
                          className="mt-2 text-primary"
                          onClick={() => handleLevelChange('all')}
                        >
                          清除筛选
                        </Button>
                      )}
                    </div>
                  )}
                  {photos.map((photo, i) => {
                    const showAd = (i + 1) % 12 === 0;
                    return (
                      <React.Fragment key={photo.id}>
                        <motion.div 
                          data-index={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        "aspect-[3/4] rounded-2xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer relative group transition-all duration-300",
                        currentIndex === i ? "ring-2 ring-primary ring-offset-2 ring-offset-slate-950 scale-[1.02]" : "hover:scale-[1.02]"
                      )}
                      onClick={() => {
                        setCurrentIndex(i);
                        setMode('book');
                      }}
                    >
                      <ProtectedMedia 
                        src={getPhotoUrl(photo)} 
                        isThumbnail={true}
                        authToken={zonePhotoUrl}
                        albumId={album?.id}
                        className={cn(
                          "w-full h-full object-contain transition-all duration-300",
                          currentIndex === i ? "scale-105" : "",
                          !checkPhotoAccess(photo) && "blur-xl grayscale opacity-50"
                        )} 
                        type="image"
                        ruleKey={itemRuleKeys.get(photo.id) === 'none' ? 'none' : '写-网'}
                      />
                      {!checkPhotoAccess(photo) && (
                        <div 
                          className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity group-hover:bg-black/40"
                          onClick={(e) => {
                            e.stopPropagation();
                            const photoLevel = photo.level || 'normal';
                            const userW = levelWeightMap[effectiveUserLevel as any] || 1;
                            const photoW = levelWeightMap[photoLevel as any] || 1;

                            // 只有等级不足时才弹出申请框
                            if (userW < photoW) {
                              setShowRequestModal(true);
                            } else {
                              toast.info('此图片为专属内容，暂不开放申请');
                            }
                          }}
                        >
                          <Lock className="w-6 h-6 text-white/60 mb-2" />
                          <span className="text-[10px] font-bold text-white/40">
                            {(() => {
                              const photoLevel = photo.level || 'normal';
                              const userW = levelWeightMap[effectiveUserLevel as any] || 1;
                              const photoW = levelWeightMap[photoLevel as any] || 1;

                              if (userW < photoW) {
                                return myRequests.some(r => r.album_id === id && r.status === 'pending') ? '审核中' : '点击申请权限';
                              }
                              return '专属内容';
                            })()}
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Badge variant="secondary" className="bg-black/60 text-[10px]">{i + 1}</Badge>
                      </div>
                      </motion.div>
                      {showAd && albumAds.length > 0 && (
                        <motion.div
                          key={`ad-${i}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (i + 0.5) * 0.05 }}
                          className="aspect-[3/4]"
                        >
                          <NativeAd {...(albumAds[i % albumAds.length] || albumAds[0])} className="rounded-2xl" />
                        </motion.div>
                      )}
                    </React.Fragment>
                  );
                })}
                </div>

                {/* 加载更多指示器 / Sentinel */}
                <div 
                  ref={loadMoreRef} 
                  className="py-12 flex flex-col items-center justify-center text-white/40"
                >
                  {fetchingBatch ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">
                        正在加载下一批...
                      </span>
                    </div>
                  ) : hasMore ? (
                    <div className="flex flex-col items-center gap-2 opacity-50">
                       <ChevronDown className="w-4 h-4 animate-bounce" />
                       <span className="text-[10px] font-bold">向下滑动加载更多</span>
                    </div>
                  ) : photos.length > 0 && (
                    <div className="flex flex-col items-center gap-2 opacity-30">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                       <span className="text-[10px] font-bold">已加载全部 {total} 张图片</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Book / TikTok Mode */}
            {(mode === 'book' || mode === 'tiktok') && (
              <div className="flex-1 relative flex flex-col items-center justify-center bg-black overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${page}-${currentIndex}`}
                    initial={mode === 'book' ? { opacity: 0, x: 100 } : { opacity: 0, y: "100%" }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={mode === 'book' ? { opacity: 0, x: -100 } : { opacity: 0, y: "-100%" }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 260, 
                      damping: 26,
                      opacity: { duration: 0.2 }
                    }}
                    drag={(isMagnifierMode || pinch.scale > 1.1) ? false : (mode === 'tiktok' ? "y" : "x")}
                    dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
                    dragElastic={isMagnifierMode ? 0 : 0.6}
                    onDragEnd={(_, info) => {
                      if (isMagnifierMode || pinch.scale > 1.1) return;
                      if (mode === 'tiktok') {
                        if (info.offset.y < -120 || info.velocity.y < -800) handleNext();
                        else if (info.offset.y > 120 || info.velocity.y > 800) handlePrev();
                      } else {
                        if (info.offset.x < -120 || info.velocity.x < -800) handleNext();
                        else if (info.offset.x > 120 || info.velocity.x > 800) handlePrev();
                      }
                    }}
                    className={cn(
                      "w-full h-full flex items-center justify-center p-4 relative touch-none",
                      isMagnifierMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
                    )}
                    onPointerDown={(e) => {
                      if (!currentPhoto) return;
                      
                      const imgElement = e.currentTarget.querySelector('img') || e.currentTarget.querySelector('canvas');
                      if (!imgElement) return;

                      const imgRect = imgElement.getBoundingClientRect();
                      const containerRect = e.currentTarget.getBoundingClientRect();

                      const imgOffsetLeft = imgRect.left - containerRect.left;
                      const imgOffsetTop = imgRect.top - containerRect.top;

                      const px = (e.clientX - imgRect.left) / imgRect.width;
                      const py = (e.clientY - imgRect.top) / imgRect.height;

                      const coords = {
                        x: e.clientX - containerRect.left, 
                        y: e.clientY - containerRect.top, 
                        px, 
                        py, 
                        imgW: imgRect.width,
                        imgH: imgRect.height,
                        imgOffsetLeft,
                        imgOffsetTop,
                      };

                      if (isMagnifierMode && zoomMode === 'magnifier') {
                        e.preventDefault();
                        setMagnifier(prev => ({ 
                          ...prev,
                          active: true, 
                          ...coords,
                          show: true, 
                          transform: 'translate(-50%, -50%)',
                          longPressTimer: null
                        }));
                      } else {
                        // 如果不是放大镜模式，或者当前是双指缩放模式，则长按进入放大镜
                        const timer = setTimeout(() => {
                          setIsMagnifierMode(true);
                          setZoomMode('magnifier');
                          setMagnifier(prev => ({ 
                            ...prev, 
                            active: true, 
                            ...coords,
                            show: true, 
                            transform: 'translate(-50%, -50%)' 
                          }));
                        }, 600);
                        setMagnifier(prev => ({ ...prev, longPressTimer: timer }));
                      }
                    }}
                    onPointerMove={(e) => {
                      if (magnifier.active && zoomMode === 'magnifier') {
                        e.preventDefault();
                        
                        const imgElement = e.currentTarget.querySelector('img') || e.currentTarget.querySelector('canvas');
                        if (!imgElement) return;

                        const imgRect = imgElement.getBoundingClientRect();
                        const containerRect = e.currentTarget.getBoundingClientRect();

                        const px = (e.clientX - imgRect.left) / imgRect.width;
                        const py = (e.clientY - imgRect.top) / imgRect.height;

                        const RADIUS = 112;
                        const maxX = containerRect.width - RADIUS;
                        const maxY = containerRect.height - RADIUS;
                        const minX = RADIUS;
                        const minY = RADIUS;

                        const finalX = Math.max(minX, Math.min(maxX, e.clientX - containerRect.left));
                        const finalY = Math.max(minY, Math.min(maxY, e.clientY - containerRect.top));

                        setMagnifier(prev => ({
                          ...prev,
                          x: finalX,
                          y: finalY,
                          px,
                          py,
                          imgW: imgRect.width,
                          imgH: imgRect.height,
                        }));
                      }
                      
                    }}
                    onPointerUp={() => {
                      if (magnifier.longPressTimer) {
                        clearTimeout(magnifier.longPressTimer);
                      }
                      setMagnifier(prev => ({ ...prev, active: false, show: false, longPressTimer: null }));
                    }}
                    onPointerLeave={() => {
                      if (magnifier.longPressTimer) {
                        clearTimeout(magnifier.longPressTimer);
                      }
                      setMagnifier(prev => ({ ...prev, active: false, show: false, longPressTimer: null }));
                    }}
                    onPointerCancel={() => {
                      if (magnifier.longPressTimer) {
                        clearTimeout(magnifier.longPressTimer);
                      }
                      setMagnifier(prev => ({ ...prev, active: false, show: false, longPressTimer: null }));
                    }}
                    onTouchStart={(e) => {
                      // 双指缩放：自动进入细节模式（如果还没进入）
                      if (e.touches.length === 2) {
                        e.stopPropagation(); 
                        if (!isMagnifierMode) {
                          setIsMagnifierMode(true);
                          setZoomMode('pinch');
                        }
                        const t1 = e.touches[0];
                        const t2 = e.touches[1];
                        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                        const centerX = (t1.clientX + t2.clientX) / 2;
                        const centerY = (t1.clientY + t2.clientY) / 2;
                        setPinch(prev => ({
                          ...prev,
                          scaling: true,
                          initialDistance: dist,
                          centerX,
                          centerY,
                          startClientX: centerX,
                          startClientY: centerY,
                          dragging: false
                        }));
                      }
                      // 单指拖动：仅在细节模式且已缩放时启用
                      else if (e.touches.length === 1 && isMagnifierMode && zoomMode === 'pinch' && pinch.scale > 1) {
                        e.stopPropagation();
                        const touch = e.touches[0];
                        setPinch(prev => ({
                          ...prev,
                          dragging: true,
                          dragStartX: touch.clientX,
                          dragStartY: touch.clientY
                        }));
                      }
                    }}
                    onTouchMove={(e) => {
                      // 双指缩放
                      if (e.touches.length === 2 && pinch.scaling) {
                        e.preventDefault();
                        e.stopPropagation();
                        const t1 = e.touches[0];
                        const t2 = e.touches[1];
                        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                        const centerX = (t1.clientX + t2.clientX) / 2;
                        const centerY = (t1.clientY + t2.clientY) / 2;
                        
                        const newScale = Math.max(1, Math.min(6, (dist / pinch.initialDistance) * pinch.lastScale));
                        const deltaX = centerX - pinch.startClientX;
                        const deltaY = centerY - pinch.startClientY;
                        
                        setPinch(prev => ({
                          ...prev,
                          scale: newScale,
                          translateX: prev.lastTranslateX + deltaX,
                          translateY: prev.lastTranslateY + deltaY
                        }));
                      }
                      // 单指拖动
                      else if (e.touches.length === 1 && pinch.dragging) {
                        e.preventDefault();
                        e.stopPropagation();
                        const touch = e.touches[0];
                        const deltaX = touch.clientX - pinch.dragStartX;
                        const deltaY = touch.clientY - pinch.dragStartY;
                        
                        setPinch(prev => ({
                          ...prev,
                          translateX: prev.lastTranslateX + deltaX,
                          translateY: prev.lastTranslateY + deltaY
                        }));
                      }
                    }}
                    onTouchEnd={(e) => {
                      if (pinch.scaling) {
                        setPinch(prev => ({
                          ...prev,
                          scaling: false,
                          lastScale: prev.scale,
                          lastTranslateX: prev.translateX,
                          lastTranslateY: prev.translateY
                        }));
                      }
                      if (pinch.dragging && e.touches.length === 0) {
                        setPinch(prev => ({
                          ...prev,
                          dragging: false,
                          lastTranslateX: prev.translateX,
                          lastTranslateY: prev.translateY
                        }));
                      }
                    }}
                  >
                    {currentPhoto ? (
                      <>
                      <div className="w-full h-full relative overflow-hidden">
                        <div 
                          className="w-full h-full flex items-center justify-center relative bg-black select-none touch-none"
                        style={{
                          transform: `scale(${pinch.scale}) translate(${pinch.translateX / pinch.scale}px, ${pinch.translateY / pinch.scale}px)`,
                          transformOrigin: 'center center',
                          transition: (pinch.scaling || pinch.dragging) ? 'none' : 'transform 0.1s ease-out'
                        }}
                      >
                        <ProtectedMedia 
                          src={getPhotoUrl(currentPhoto)} 
                          thumbnailSrc={getPhotoUrl(currentPhoto)} 
                          priority={true}
                          authToken={zonePhotoUrl}
                          albumId={album?.id}
                          className={cn(
                            "max-w-full max-h-full object-contain shadow-2xl pointer-events-none select-none",
                            currentPhoto && !checkPhotoAccess(currentPhoto) && "blur-2xl opacity-50"
                          )} 
                          type="image"
                          showLoadingTooltip={false}
                          onProgress={setLoadProgress}
                          onUrlResolved={(url) => {
                            if (currentPhoto) {
                              handleUrlResolved(currentPhoto.id, url);
                            }
                          }}
                          ruleKey={currentPhoto && itemRuleKeys.get(currentPhoto.id) === 'none' ? 'none' : (mode === 'tiktok' ? '抖音' : '写book')}
                        />
                      </div>

                      {/* 放大镜效果 - 使用 Portal 确保完全独立于缩放容器，防止跟随缩放 */}
                      {isMagnifierMode && zoomMode === 'magnifier' && magnifier.show && typeof document !== 'undefined' && createPortal(
                        <div className="fixed inset-0 pointer-events-none z-[9999]">
                          {(() => {
                            const level = magnifyLevel;
                            const imgW = magnifier.imgW;
                            const imgH = magnifier.imgH;
                            
                            return (
                              <motion.div 
                                initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
                                animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
                                className="fixed left-1/2 top-1/2 w-64 h-64 rounded-full border-4 border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden bg-black z-[10000]"
                                style={{ 
                                  boxShadow: '0 0 40px hsl(var(--primary) / 0.4)',
                                }}
                              >
                                <div 
                                  className="w-full h-full relative"
                                  style={{
                                    backgroundImage: `url(${resolvedUrls.get(currentPhoto?.id || '')}), url(${getPhotoUrl(currentPhoto)})`,
                                    backgroundPosition: `${-(magnifier.px * imgW * level) + 128}px ${-(magnifier.py * imgH * level) + 128}px`,
                                    backgroundSize: `${imgW * level}px auto`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundColor: 'black'
                                  }}
                                >
                                  <div className="absolute inset-0 flex items-center justify-center opacity-40">
                                    <div className="w-10 h-[2px] bg-primary" />
                                    <div className="h-10 w-[2px] bg-primary" />
                                    <div className="w-3 h-3 rounded-full border-2 border-primary" />
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })()}
                        </div>,
                        document.body
                      )}
                    </div>
                        
                      {currentPhoto && !checkPhotoAccess(currentPhoto) && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-10 p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                              <Lock className="w-8 h-8 text-white/60" />
                            </div>
                            <h3 className="text-lg font-black mb-2">权限不足</h3>
                            <p className="text-sm text-white/40 max-w-[280px] mb-6">
                              {(() => {
                                const req = myRequests.find(r => r.album_id === id);
                                if (req?.status === 'pending') {
                                  return "您的申请正在审核中，审核通过后即可查看全部内容";
                                }
                                if (req?.status === 'rejected') {
                                  return `申请已被拒绝。原因：${req.rejected_reason || '无具体说明'}。您可以重新修改申请后提交。`;
                                }
                                return "此内容需要特定权限或申请通过后方可查看";
                              })()}
                            </p>
                            <Button 
                              className="rounded-full px-8 bg-white text-black font-black hover:bg-white/90"
                              onClick={() => setShowRequestModal(true)}
                            >
                              {(() => {
                                const req = myRequests.find(r => r.album_id === id);
                                if (req?.status === 'pending') return '查看申请状态';
                                if (req?.status === 'rejected') return '重新申请解锁';
                                return '立即申请解锁';
                              })()}
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-4 py-20">
                        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
                        <span className="text-xs font-black opacity-20 uppercase tracking-widest animate-pulse">正在准备资源...</span>
                      </div>
                    )}
                    
                    {/* Interaction Areas */}
                    <div className={cn("absolute inset-0 flex", isMagnifierMode ? "pointer-events-none" : "pointer-events-auto")}>
                      {mode === 'book' ? (
                        /* Horizontal Flip - Left 40%, Middle 20%, Right 40% */
                        (<div className="flex-1 flex">
                          <div className="w-[40%] h-full cursor-west-resize" onClick={handlePrev} />
                          <div className="w-[20%] h-full" /> {/* Middle Space */}
                          <div className="w-[40%] h-full cursor-east-resize" onClick={handleNext} />
                        </div>)
                      ) : (
                        /* Vertical Scroll (TikTok Style) - just visual guides now as drag is primary */
                        (<div className="flex-1 flex flex-col pointer-events-none">
                          <div className="h-1/2 w-full flex items-start justify-center pt-20">
                             <ChevronUp className="w-8 h-8 opacity-10 animate-bounce" />
                          </div>
                          <div className="h-1/2 w-full flex items-end justify-center pb-40">
                             <ChevronDown className="w-8 h-8 opacity-10 animate-bounce" />
                          </div>
                        </div>)
                      )}
                    </div>

                    {/* TikTok/Book Mode Info Overlay - 已根据需求隐藏 */}
                    {false && (mode === 'tiktok' || mode === 'book') && currentPhoto && (
                      <div className="absolute left-4 top-24 right-16 z-50 flex flex-col gap-2 pointer-events-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                        <h3 className="text-white font-black text-lg line-clamp-2 leading-tight">
                          {album?.title} 
                          <span className="ml-2 text-[10px] opacity-60 font-medium bg-white/10 px-1.5 py-0.5 rounded">
                            P {currentIndex + 1}
                          </span>
                        </h3>
                        {album?.description && (
                          <p className="text-white/80 text-sm line-clamp-3 leading-relaxed whitespace-pre-wrap">
                            {album?.description || ''}
                          </p>
                        )}
                        {album && (album as any).tags && (album as any).tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {(album as any).tags.map((tag: any, idx: number) => (
                              <span 
                                key={idx}
                                className="text-[10px] font-black text-primary uppercase tracking-widest bg-black/40 backdrop-blur-md px-2 py-0.5 rounded border border-white/5"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
              </motion.div>
                </AnimatePresence>

                {/* Magnifier Controls - Always show toggles in book or tiktok mode - MOVED OUTSIDE ANIMATEPRESENCE TO PREVENT DISPLACEMENT */}
                {(mode === 'book' || mode === 'tiktok') && !showInfo && (
                  <div className="absolute bottom-24 right-2 z-[100] flex flex-col items-center gap-4 pointer-events-auto w-12">
                    <AnimatePresence>
                      {isMagnifierMode && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.9 }}
                          className="flex flex-col gap-2 p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl mb-2"
                        >
                          {/* 缩放模式切换 */}
                          <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-1">
                            {[
                              { id: 'magnifier', icon: Search },
                              { id: 'pinch', icon: Maximize }
                            ].map((m) => (
                              <Button
                                key={m.id}
                                variant={zoomMode === m.id ? "default" : "ghost"}
                                size="sm"
                                className={cn(
                                  "flex-1 h-8 px-2 rounded-lg transition-all",
                                  zoomMode === m.id ? "bg-primary text-white" : "text-white/40 hover:text-white"
                                )}
                                onClick={() => setZoomMode(m.id as any)}
                              >
                                <m.icon className="w-3.5 h-3.5" />
                              </Button>
                            ))}
                          </div>

                          {/* 倍率切换 - 仅在放大镜模式下显示 */}
                          {zoomMode === 'magnifier' && (
                            <div className="flex flex-col gap-2">
                              {[3, 6].map((lvl) => (
                                <Button
                                  key={lvl}
                                  variant={magnifyLevel === lvl ? "default" : "ghost"}
                                  size="sm"
                                  className={cn(
                                    "rounded-xl h-8 w-8 text-[10px] font-bold p-0 transition-all",
                                    magnifyLevel === lvl ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30" : "text-white/40 hover:text-white"
                                  )}
                                  onClick={() => setMagnifyLevel(lvl)}
                                >
                                  {lvl}x
                                </Button>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 查看原图按钮 */}
                    {currentPhoto && itemRuleKeys.get(currentPhoto.id) !== 'none' && (
                      <div className="flex flex-col items-center gap-1 animate-in fade-in zoom-in duration-300">
                        <Button
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            const id = currentPhoto.id;
                            setItemRuleKeys(prev => new Map(prev).set(id, 'none'));
                          }}
                          className="w-12 h-12 rounded-2xl shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 backdrop-blur-md border-2 border-white/20"
                        >
                          <Scan className="w-6 h-6" />
                        </Button>
                        <span className="text-[10px] text-primary font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] bg-black/40 px-1.5 py-0.5 rounded uppercase tracking-tighter">原图 100%</span>
                      </div>
                    )}

                    <Button
                      variant={isMagnifierMode ? "default" : "ghost"}
                      size="icon"
                      className={cn(
                        "w-12 h-12 rounded-2xl transition-all duration-300 shadow-xl",
                        isMagnifierMode 
                          ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30" 
                          : "bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60"
                      )}
                      onClick={() => setIsMagnifierMode(!isMagnifierMode)}
                    >
                      {isMagnifierMode ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                    </Button>
                  </div>
                )}

                {/* Info Button Overlay for non-gallery modes */}
                <div className="absolute top-20 right-2 z-50">

                </div>

                {/* Bottom Progress Controls */}
                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black to-transparent flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black opacity-40 tabular-nums">{globalIndex + 1}</span>
                    <Slider 
                      value={[globalIndex]} 
                      max={total - 1} 
                      step={1} 
                      onValueChange={([val]) => goToGlobalIndex(val)}
                      className="flex-1"
                    />
                    <span className="text-[10px] font-black opacity-40 tabular-nums">{total}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Button variant="ghost" size="sm" className="rounded-full h-8 px-3 text-xs" onClick={() => {
                         setMode('gallery');
                         setIsMagnifierMode(false);
                       }}>
                         <LayoutGrid className="w-3.5 h-3.5 mr-2" /> 网格
                       </Button>
                       <Badge variant="outline" className="text-[10px] border-white/10 uppercase tracking-tighter">
                         P {globalIndex + 1} / {total}
                       </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      {/* Info Sidebar */}
      <AlbumInfoSidebar 
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        album={album}
        effectiveUserLevel={effectiveUserLevel}
        levelCounts={levelCounts}
        allowedLevels={allowedLevels}
        selectedLevel={selectedLevel}
        onLevelChange={handleLevelChange}
        customFieldConfigs={customFieldConfigs}
        photos={photos}
        currentIndex={currentIndex}
        mode={mode}
        total={total}
        globalIndex={globalIndex}
        user={user}
        renderCustomField={renderCustomField}
      />

      <AccessRequestDialog 
        isOpen={showRequestModal}
        onOpenChange={setShowRequestModal}
        myRequests={myRequests}
        profile={profile}
        id={id}
        requestReason={requestReason}
        onRequestReasonChange={setRequestReason}
        requestAttachment={requestAttachment}
        onRequestAttachmentChange={setRequestAttachment}
        requestSubmitting={requestSubmitting}
        onSubmit={handleSubmitRequest}
        onRefreshRequests={() => fetchMyRequests(false)}
        onOpenLogin={openLoginDialog}
      />

      {/* 浏览进度恢复提示 */}
      <ProgressRestoreDialog 
        isOpen={showProgressModal}
        onOpenChange={setShowProgressModal}
        savedIndex={savedIndex}
        onContinue={handleContinueReading}
        onStartOver={handleStartOver}
      />

    </div>
  );
}
