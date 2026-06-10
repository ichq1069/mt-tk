import React, { useEffect, useState, useCallback } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';

import { rbacApi } from '@/db/rbac';
import { supabase } from '@/db/supabase';
import type { MediaItem, UserFieldConfig, Tag, ContentCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { 
  PlayCircle, Video, Loader2, Edit2, Trash2, LogOut, Shield, ChevronUp, ChevronLeft, 
  Share2, Download, FileJson, Heart, Monitor, Bell, UserCog, CalendarCheck, 
  Trophy, Gift, Image as ImageIcon, Eye, Key, UserPlus, RefreshCw, Copy, QrCode,
  CheckCircle2, XCircle, Settings, LayoutGrid, ThumbsDown, Tag as TagIcon, 
  Zap, MessageCircle, Award, Smartphone, BarChart3, Search, Menu, ChevronRight,
  Clock, Check, FolderOpen, AlertTriangle, AlertCircle
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { cn, downloadFile } from '@/lib/utils';
import { MediaPreview } from '@/components/MediaPreview';
import { MediaCardSkeleton } from '@/components/MediaCardSkeleton';
import { useWaterfallScrollKeep } from '@/hooks/useWaterfallScrollKeep';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRealtimeMediaUpdates } from '@/hooks/useRealtimeMediaUpdates';
import { PullToRefresh } from '@/components/common/PullToRefresh';

import { format } from 'date-fns';
import { NotificationPreferencesDialog } from '@/components/NotificationPreferencesDialog';

import { CustomFieldRenderer } from './admin/components/UserFieldsSection';

import { EditMediaDialog } from '@/components/admin/EditMediaDialog';
import { StarCollectionProgress } from '@/components/StarCollectionProgress';
import { LayoutSwitcher, TimelineLayout } from '@/components/layouts';

import { ProfileHeader } from './profile/components/ProfileHeader';
import { ProfileInfo } from './profile/components/ProfileInfo';
import { cleanTitle } from './profile/profileUtils';

import { useKeywordReplacement } from '@/contexts/KeywordReplacementContext';
import { useViewState } from '@/contexts/ViewStateContext';
import { SystemText, UserText } from '@/components/common/KeywordText';

export default function Profile() {
  const { replaceUser, replaceSystem } = useKeywordReplacement();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { getViewState, saveViewState } = useViewState();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [favItems, setFavItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);
  const [activeTab, setActiveTab] = useState('all');
  const [mainTab, setMainTab] = useState<'works' | 'favorites' | 'downloads' | 'requests'>('works');
  const [downloadFilter, setDownloadFilter] = useState<'all' | 'wallpaper' | 'album'>('all');
  const [viewLayout, setViewLayout] = useState<'grid' | 'timeline'>('grid');
  const [downloadingRecordId, setDownloadingRecordId] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);

  const [invalidRecords, setInvalidRecords] = useState<Set<string>>(new Set());
  const [albumRequests, setAlbumRequests] = useState<any[]>([]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageSize = 20;

  const [ipLocation, setIpLocation] = useState('加载中...');

  useEffect(() => {
    // 组件挂载时，强制重置所有可能的滚动锁定状态
    document.body.style.overflow = '';
    document.body.classList.remove('overflow-hidden');
    // 关闭可能打开的 MediaPreview
    window.dispatchEvent(new CustomEvent('closeMediaPreview'));

    // 追踪个人中心浏览
    (window as any).pixelTrack?.('profile_view');
    
    // 使用国内更准确的 IP 定位服务 (通过 Edge Function 代理解决跨域)
    const fetchIpLocation = async () => {
      try {
        const { data, error } = await api.getIpInfo();
        if (error) throw error;
        if (data && data.addr) {
          const cleanAddr = data.addr.split(' ')[0] || '未知';
          setIpLocation(cleanAddr);
        } else {
          setIpLocation('未知');
        }
      } catch (e) {
        console.error('Fetch IP error:', e);
        setIpLocation('湖南'); // Default fallback
      }
    };
    fetchIpLocation();
  }, []);


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }

    // 处理链接绑定
    const bindCode = params.get('bind_code');
    const bindConfigId = params.get('config_id');
    if (bindCode && bindConfigId && user) {
      const autoBind = async () => {
        try {
          await api.verifyBindingCode(bindConfigId, bindCode);
          toast.success('通过链接绑定微信成功');
          fetchWechatBindings();
          if (refreshProfile) refreshProfile();
        } catch (e: any) {
          console.error('[Profile] 自动绑定失败:', e);
        }
      };
      autoBind();
    }
  }, [location, user]);

  // 编辑状态
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [updating, setUpdating] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [customFields, setCustomFields] = useState<UserFieldConfig[]>([]);

  // 个人资料编辑状态
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Record<string, any>>({});
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [isInviteListOpen, setIsInviteListOpen] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [isNotificationPreferencesOpen, setIsNotificationPreferencesOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [sysConfig, setSysConfig] = useState<any>(null);
  const [userInviteCodes, setUserInviteCodes] = useState<any[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<any[]>([]);
  const [activeInviteTab, setActiveInviteTab] = useState('codes');
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [isConfirmingCode, setIsConfirmingCode] = useState(false);
  const [forceShowInput, setForceShowInput] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isEasterEggsOpen, setIsEasterEggsOpen] = useState(false);
  const [userEggRecords, setUserEggRecords] = useState<any[]>([]);
  const [loadingEggs, setLoadingEggs] = useState(false);
  const handleRefresh = async () => {
    if (refreshProfile) await refreshProfile();
    // 触发页面内的数据重新加载
    window.location.reload(); 
  };
  const [notificationSettings, setNotificationSettings] = useState({
    audit: true,
    system: true,
    marketing: false
  });
  const [canClassify, setCanClassify] = useState(false);
  const [canBrowseAlbums, setCanBrowseAlbums] = useState(false);

  // 监听全局关闭预览事件
  useEffect(() => {
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
  useEffect(() => {
    const handleProfileUpdated = () => {
      if (refreshProfile) refreshProfile();
    };
    window.addEventListener('profileUpdated', handleProfileUpdated);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdated);
  }, [refreshProfile]);
  const [isPreferenceOpen, setIsPreferenceOpen] = useState(false);
  const [prefLoading, setPrefLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [recommendationIntensity, setRecommendationIntensity] = useState(3);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [allCategories, setAllCategories] = useState<ContentCategory[]>([]);
  const [likedTags, setLikedTags] = useState<string[]>([]);
  const [dislikedTags, setDislikedTags] = useState<string[]>([]);
  const [likedCategories, setLikedCategories] = useState<string[]>([]);
  const [dislikedCategories, setDislikedCategories] = useState<string[]>([]);

  const [downloadHistory, setDownloadHistory] = useState<any[]>([]);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // 微信绑定相关状态
  const [isWechatBindingOpen, setIsWechatBindingOpen] = useState(false);
  const [wechatBindings, setWechatBindings] = useState<any[]>([]);
  const [bindingConfigs, setBindingConfigs] = useState<any[]>([]);
  const [selectedBindingConfigId, setSelectedBindingConfigId] = useState<string>('');
  const [bindingMode, setBindingMode] = useState<'menu' | 'generate' | 'verify'>('menu');
  const [generatedBindingCode, setGeneratedBindingCode] = useState<string>('');
  const [inputBindingCode, setInputBindingCode] = useState('');
  const [bindingLoading, setBindingLoading] = useState(false);
  const [mpQrData, setMpQrData] = useState<string | null>(null);
  const [generatingMpQr, setGeneratingMpQr] = useState(false);
  const [mpQrScene, setMpQrScene] = useState<string | null>(null);
  const [mpQrPage, setMpQrPage] = useState<string | null>(null);
  const [mpTicket, setMpTicket] = useState<string | null>(null);
    const [mpDebugConfig, setMpDebugConfig] = useState<any>(null);

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [collectionToken, setCollectionToken] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [activeBindingTab, setActiveBindingTab] = useState<string>("official_account");

  // 使用 Realtime 监听用户自己内容的审核状态变化
  useRealtimeMediaUpdates({
    userId: user?.id,
    enabled: !!user,
    onApproved: (item) => {
      // 更新本地列表中的状态
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'approved' } : i));
    },
    onRejected: (item) => {
      // 更新本地列表中的状态
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'rejected', rejection_reason: item.rejection_reason } : i));
    },
    onUpdate: (item) => {
      // 处理其他更新
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...item } : i));
    }
  });

  useEffect(() => {
    let interval: any;
    if (mpTicket && isWechatBindingOpen && activeBindingTab === 'mini_program') {
      interval = setInterval(async () => {
        try {
          const { data } = await supabase
            .from('login_tickets')
            .select('status')
            .ilike('ticket', `${mpTicket}%`)
            .maybeSingle();
          if (data && (data as any).status === 'fulfilled') {
            toast.success('小程序绑定成功');
            setIsWechatBindingOpen(false);
            if (refreshProfile) refreshProfile();
            fetchWechatBindings();
            clearInterval(interval);
          }
        } catch (e) {
          console.error('[Profile] Poll ticket error:', e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [mpTicket, isWechatBindingOpen, activeBindingTab, refreshProfile]);

  useEffect(() => {
    const fetchMpDebugConfig = async () => {
      try {
        const { data } = await api.getPublicMiniProgramConfig();
        setMpDebugConfig(data);
      } catch (e) {
        console.error('Fetch mp debug config error:', e);
      }
    };
    fetchMpDebugConfig();
  }, []);

  const handleGenerateMpBindingQr = async () => {
    if (!user) return;
    setGeneratingMpQr(true);
    setMpQrData(null); // 重置二维码，显示加载状态
    try {
      const newTicket = Math.random().toString(36).substring(2, 15);
      setMpTicket(newTicket);
      
      // 创建带有当前用户 ID 的票据
      await (supabase.from('login_tickets') as any).insert({
        ticket: newTicket,
        status: 'pending',
        user_id: user.id
      });

      const mpIdentifier = sysConfig?.mp_domain_identifier || 'miaoda';
      const { data, error } = await api.generateMiniProgramQr(newTicket, 'login', undefined, mpIdentifier);
      if (error) throw error;
      if (data && data.success) {
        setMpQrData(data.qr_data);
        setMpQrScene(data.scene);
        setMpQrPage(data.page);
      } else {
        throw new Error(data?.message || '生成绑定小程序码失败');
      }
    } catch (e: any) {
      console.error('Generate MP binding QR error:', e);
      toast.error('生成小程序码失败: ' + (e.message || '请检查后台配置'));
    } finally {
      setGeneratingMpQr(false);
    }
  };

  const [userBadgesCount, setUserBadgesCount] = useState(0);

  const [digitalIdSettings, setDigitalIdSettings] = useState({
    is_enabled: true,
    is_shop_enabled: false
  });

  const fetchUserBadgesCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.getUserBadges(user.id);
      // 去重统计已获得的勋章数量
      const earnedBadgeIds = new Set((data || []).map((ub: any) => ub.badge_id));
      setUserBadgesCount(earnedBadgeIds.size);
    } catch (e) {
      console.error('[Profile] 获取勋章数量失败:', e);
    }
  }, [user]);

  const fetchUserEasterEggs = useCallback(async () => {
    if (!user) return;
    setLoadingEggs(true);
    try {
      const { data, error } = await supabase
        .from('easter_egg_records')
        .select('*, easter_egg_configs(name, message, icon_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUserEggRecords(data || []);
    } catch (e) {
      console.error('[Profile] 获取彩蛋记录失败:', e);
    } finally {
      setLoadingEggs(false);
    }
  }, [user]);

  const [hasPurchasedId, setHasPurchasedId] = useState(false);

  const checkPurchasedId = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('points_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'buy_id')
        .limit(1)
        .maybeSingle();
      setHasPurchasedId(!!data);
    } catch (e) {
      console.error('[Profile] 获取 ID 购买状态失败:', e);
    }
  }, [user]);

  const fetchWechatBindings = async () => {
    try {
      const { data } = await api.getWechatBindings();
      setWechatBindings(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBindingConfigs = async () => {
    try {
      const { data } = await api.getWechatConfigs();
      setBindingConfigs(data || []);
      if (data && data.length > 0) {
        setSelectedBindingConfigId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWechatBindings();
    }
    if (isWechatBindingOpen) {
      fetchBindingConfigs();
    }
  }, [isWechatBindingOpen, user]);
  useEffect(() => {
    if (isWechatBindingOpen && activeBindingTab === 'mini_program' && !mpQrData) {
      handleGenerateMpBindingQr();
    }
  }, [isWechatBindingOpen, activeBindingTab, mpQrData, sysConfig]);


  const handleGenerateBindingCode = async () => {
    if (!selectedBindingConfigId) return toast.error('请选择公众号');
    setBindingLoading(true);
    try {
      const { code } = await api.generateBindingCode(selectedBindingConfigId);
      setGeneratedBindingCode(code);
      setBindingMode('generate');
    } catch (e: any) {
      toast.error(`生成失败: ${e.message}`);
    } finally {
      setBindingLoading(false);
    }
  };

  const handleVerifyBindingCode = async () => {
    if (!selectedBindingConfigId) return toast.error('请选择公众号');
    if (!inputBindingCode || inputBindingCode.length !== 6) return toast.error('请输入 6 位验证码');
    setBindingLoading(true);
    try {
      await api.verifyBindingCode(selectedBindingConfigId, inputBindingCode);
      toast.success('微信绑定成功');
      setIsWechatBindingOpen(false);
      fetchWechatBindings();
      if (refreshProfile) refreshProfile();
    } catch (e: any) {
      toast.error(`验证失败: ${e.message}`);
    } finally {
      setBindingLoading(false);
    }
  };

  const handleUnbindWechat = async (id: string) => {
    setBindingLoading(true);
    try {
      await api.unbindWechat(id);
      toast.success('已解除绑定');
      fetchWechatBindings();
      if (refreshProfile) refreshProfile();
    } catch (e: any) {
      toast.error(`解绑失败: ${e.message}`);
    } finally {
      setBindingLoading(false);
    }
  };

  // 监听微信绑定成功状态 (实时更新)
  useEffect(() => {
    /*
    // 已根据用户要求移除 WSS (Realtime) 相关逻辑
    if (isWechatBindingOpen && bindingMode === 'generate' && user?.id && selectedBindingConfigId) {
      const channel = api.supabase
        .channel('wechat-binding-success')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wechat_users',
            filter: `user_id=eq.${user.id}`
          },
          (payload: any) => {
            // console.debug('[Profile] WeChat binding change detected:', payload);
            if (payload.new && (payload.new as any).config_id === selectedBindingConfigId && (payload.new as any).user_id === user.id) {
              toast.success('微信绑定成功！');
              setIsWechatBindingOpen(false);
              setBindingMode('menu');
              setGeneratedBindingCode('');
              fetchWechatBindings();
            }
          }
        )
        .subscribe();

      return () => {
        api.supabase.removeChannel(channel);
      };
    }
    */
  }, [isWechatBindingOpen, bindingMode, user?.id, selectedBindingConfigId]);

  // 监听小程序绑定成功状态 (实时更新)
  useEffect(() => {
    /*
    // 已根据用户要求移除 WSS (Realtime) 相关逻辑
    if (isWechatBindingOpen && activeBindingTab === 'mini_program' && user?.id) {
      const channel = api.supabase
        .channel('mp-binding-success')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          (payload: any) => {
            // console.debug('[Profile] MP binding change detected:', payload);
            if (payload.new && (payload.new as any).mp_openid) {
              toast.success('小程序绑定成功！');
              setIsWechatBindingOpen(false);
              if (refreshProfile) refreshProfile();
              fetchWechatBindings();
            }
          }
        )
        .subscribe();

      return () => {
        api.supabase.removeChannel(channel);
      };
    }
    */
  }, [isWechatBindingOpen, activeBindingTab, user?.id]);

  useEffect(() => {
    if (profile?.custom_fields?.preferences) {
      const prefs = profile.custom_fields.preferences;
      setLikedTags(prefs.liked_tags || []);
      setDislikedTags(prefs.disliked_tags || []);
      setLikedCategories(prefs.liked_categories || []);
      setDislikedCategories(prefs.disliked_categories || []);
      setRecommendationIntensity(prefs.recommendation_intensity ?? 3);
    }
  }, [profile]);

  const fetchPreferencesData = async () => {
    setPrefLoading(true);
    try {
      const [{ data: tags }, { data: cats }] = await Promise.all([
        api.getTags(),
        api.getCategories()
      ]);
      // 过滤掉包含 "不入" 字样的标签 (非管理员用户)
      const filteredTags = (tags || []).filter((t: any) => profile?.role === 'admin' || !t.name.includes('不入'));
      setAllTags(filteredTags);
      setAllCategories(cats || []);
    } catch (e) {
      console.error(e);
    } finally {
      setPrefLoading(false);
    }
  };

  const fetchDigitalIdSettings = useCallback(async () => {
    try {
      const { data } = await api.getSystemConfig('digital_id_settings');
      if (data && data.value) {
        setDigitalIdSettings({
          is_enabled: data.value.is_enabled !== false,
          is_shop_enabled: !!data.value.is_shop_enabled
        });
      }
    } catch (e) {
      console.error('[Profile] 获取数字 ID 设置失败:', e);
    }
  }, []);

  useEffect(() => {
    if (mainTab === 'downloads' && user) {
      fetchDownloadHistory(downloadFilter);
    }
  }, [mainTab, downloadFilter, user]);

  const handleDownloadRecord = async (record: any) => {
    const url = record.media_items?.url || record.album_photos?.url;
    if (!url) return;
    
    setDownloadingRecordId(record.id);
    const title = record.media_items?.title || record.album_photos?.photo_albums?.title || 'download';
    const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
    const filename = `${title}_${record.id}.${extension}`;

    try {
      await downloadFile(url, filename);
    } catch (e) {
      console.error('Download failed:', e);
      toast.error('下载失败，请尝试在详情页查看并保存');
    } finally {
      setDownloadingRecordId(null);
    }
  };

  const fetchDownloadHistory = async (filter?: 'all' | 'wallpaper' | 'album') => {
    if (!user) return;
    setDownloadLoading(true);
    try {
      const { data } = await api.getMediaDownloadHistory(user.id, filter || downloadFilter);
      setDownloadHistory(data || []);
    } catch (e) {
      console.error('Fetch download history error:', e);
    } finally {
      setDownloadLoading(false);
    }
  };

  const fetchAlbumRequests = async () => {
    if (!user) return;
    setRequestLoading(true);
    try {
      const { data } = await api.getMyAlbumAccessRequests(user.id);
      setAlbumRequests(data || []);
    } catch (e) {
      console.error('[Profile] 获取图集申请失败:', e);
    } finally {
      setRequestLoading(false);
    }
  };


  useEffect(() => {
    if (isPreferenceOpen) {
      fetchPreferencesData();
    }
  }, [isPreferenceOpen]);

  const clearPersonalizationData = async () => {
    if (!user) return;
    setIsClearing(true);
    try {
      await api.clearUserInteractions(user.id);
      toast.success('个性化数据已清空');
    } catch (e: any) {
      toast.error(`清空失败: ${e.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    setUpdating(true);
    try {
      const newCustomFields = {
        ...(profile?.custom_fields || {}),
        preferences: {
          liked_tags: likedTags,
          disliked_tags: dislikedTags,
          liked_categories: likedCategories,
          disliked_categories: dislikedCategories,
          recommendation_intensity: recommendationIntensity
        }
      };
      const { error } = await api.updateProfile(user.id, {
        custom_fields: newCustomFields
      });
      if (error) throw error;
      toast.success('偏好设置已更新');
      setIsPreferenceOpen(false);
    } catch (e: any) {
      toast.error(`更新失败: ${e.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const togglePreference = (type: 'liked' | 'disliked', field: 'tag' | 'cat', id: string) => {
    if (field === 'tag') {
      if (type === 'liked') {
        setLikedTags(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev.filter(i => i !== id), id]);
        setDislikedTags(prev => prev.filter(i => i !== id));
      } else {
        setDislikedTags(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev.filter(i => i !== id), id]);
        setLikedTags(prev => prev.filter(i => i !== id));
      }
    } else {
      if (type === 'liked') {
        setLikedCategories(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev.filter(i => i !== id), id]);
        setDislikedCategories(prev => prev.filter(i => i !== id));
      } else {
        setDislikedCategories(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev.filter(i => i !== id), id]);
        setLikedCategories(prev => prev.filter(i => i !== id));
      }
    }
  };

  useEffect(() => {
    const checkPerm = async () => {
      if (!user) return;
      if (profile?.role === 'admin') {
        setCanClassify(true);
        setCanBrowseAlbums(true);
      } else {
        try {
          const { permissions: p } = await rbacApi.getCurrentUserPermissions(user.id);
          setCanClassify(p?.includes('content_classification') || false);
          setCanBrowseAlbums(p?.includes('album_browse') || false);
        } catch (e) {
          console.error(e);
        }
      }
    };
    checkPerm();
  }, [user, profile]);

  useEffect(() => {
    if (profile?.custom_fields?.notification_settings) {
      setNotificationSettings({
        ...notificationSettings,
        ...profile.custom_fields.notification_settings
      });
    }
  }, [profile]);

  useEffect(() => {
    if (mainTab === 'favorites') {
      (window as any).pixelTrack?.('favorite_view');
    }
  }, [mainTab]);

  useEffect(() => {
    if (user) {
      // 优先从视图状态中恢复数据
      const cached = getViewState(`profile_works_${user.id}`);
      if (cached && cached.data && Array.isArray(cached.data) && cached.data.length > 0) {
        setItems(cached.data);
        setLoading(false);
        // 后台静默刷新
        fetchUserMedia(0, false, true);
      } else {
        fetchUserMedia();
      }

      fetchFavorites();
      fetchUnreadCount();
      fetchCustomFields();
      checkCheckInStatus();
      fetchSysConfig();
      fetchUserInviteCodes();
      fetchUserBadgesCount();
      checkPurchasedId();
      fetchDigitalIdSettings();
    }
  }, [user]);

  const checkCheckInStatus = async () => {
    if (!user) return;
    try {
      const { hasCheckedIn } = await api.getCheckInStatus(user.id);
      setHasCheckedIn(hasCheckedIn);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSysConfig = async () => {
    try {
      const { data } = await api.getStorageConfig();
      setSysConfig(data);
      
      const { data: dSettings } = await api.getSystemConfig('digital_id_settings');
      if (dSettings && dSettings.value) {
        setDigitalIdSettings(dSettings.value);
      }
    } catch (e) {
      console.error('[Profile] fetchSysConfig error:', e);
    }
  };

  const fetchUserInviteCodes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('redemption_codes')
      .select('*')
      .eq('created_by', user.id)
      .eq('type', 'invite')
      .order('created_at', { ascending: false });
    setUserInviteCodes(data || []);
    
    // 获取邀请过的用户
    const { data: invUsers } = await api.getInvitedUsers(user.id);
    setInvitedUsers(invUsers || []);
  };

  const handleGenerateInvite = async () => {
    if (!user) return;
    setGeneratingInvite(true);
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

      const { error } = await api.createRedemptionCode({
        code,
        type: 'invite',
        max_uses: 1,
        created_by: user.id
      });

      if (error) throw error;
      toast.success('邀请码已生成');
      fetchUserInviteCodes();
    } catch (e: any) {
      toast.error(`生成失败: ${e.message}`);
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('邀请码已复制');
  };

  const handleRedeem = async () => {
    if (!user || !redeemCode) return;
    setRedeeming(true);
    try {
      const { data, error } = await api.redeemCode(user.id, redeemCode);
      if (error) throw new Error(error);
      toast.success(data?.message || '兑换成功');
      setRedeemCode('');
      setIsRedeemOpen(false);
      window.location.reload(); // 刷新积分等状态
    } catch (err: any) {
      toast.error(`兑换失败: ${err.message}`);
    } finally {
      setRedeeming(false);
    }
  };

  const fetchCustomFields = async () => {
    try {
      const { data } = await api.getUserFieldConfigs();
      // 在个人中心显示的字段
      setCustomFields(data?.filter((f: UserFieldConfig) => f.is_active && f.show_in_center) || []);
      
      // 在编辑资料中显示的字段
      const editableFields = data?.filter((f: UserFieldConfig) => f.is_active && f.show_in_profile) || [];
      const initialForm: Record<string, any> = {
        username: profile?.username || '',
        avatar_url: profile?.avatar_url || '',
        cover_url: profile?.cover_url || '',
        email: profile?.email || ''
      };
      editableFields.forEach((f: UserFieldConfig) => {
        initialForm[f.field_key] = profile?.custom_fields?.[f.field_key] || '';
      });
      setProfileForm(initialForm);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setUpdating(true);
    try {
      const { username, avatar_url, cover_url, email: updatedEmail, ...customData } = profileForm;
      
      const { error } = await api.updateProfile(user.id, {
        username,
        avatar_url,
        cover_url,
        email: updatedEmail,
        custom_fields: customData
      });
      if (error) throw error;
      
      // 强制刷新 AuthContext 中的用户信息，避免缓存导致头像不更新
      if (refreshProfile) {
        // 通知 AuthContext 清除缓存并刷新
        await refreshProfile();
      }
      
      toast.success('资料已更新');
      setEditingProfile(false);
      // 由于 profile 数据可能被多处引用且有缓存，通知全站重新加载用户信息
      window.dispatchEvent(new CustomEvent('profileUpdated'));
    } catch (err: any) {
      toast.error(`更新失败: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      return toast.error('请输入有效的邮箱地址');
    }
    
    // 如果新输入的邮箱就是当前已验证的邮箱，提示无需操作
    if (newEmail === user?.email && (user as any).email_confirmed_at) {
      return toast.info('该邮箱已绑定，无需再次认证');
    }
    
    setIsVerifyingEmail(true);
    try {
      // 使用 Supabase Auth 更新邮箱，如果配置正确，这会发送 OTP 码
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      
      toast.success('验证码已发送，请前往邮箱查收');
      setShowOtpInput(true);
    } catch (err: any) {
      toast.error(`发送失败: ${err.message}`);
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      return toast.error('请输入完整的验证码');
    }

    setIsConfirmingCode(true);
    try {
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: newEmail,
        token: verificationCode,
        type: 'email_change'
      });
      
      if (verifyError) throw verifyError;

      const finalEmail = verifyData.user?.email || newEmail;
      await api.updateProfile(user!.id, { email: finalEmail });
      
      toast.success('邮箱绑定成功');
      setShowOtpInput(false);
      setNewEmail('');
      setVerificationCode('');
      
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      console.error('[Profile] 邮箱验证失败:', err);
      toast.error(`认证失败: ${err.message || '验证码错误或已过期'}`);
    } finally {
      setIsConfirmingCode(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordForm.old || !passwordForm.new || !passwordForm.confirm) {
      return toast.error('请填写完整密码信息');
    }
    if (passwordForm.new !== passwordForm.confirm) {
      return toast.error('两次输入的新密码不一致');
    }
    if (passwordForm.new.length < 6) {
      return toast.error('新密码长度不能少于 6 位');
    }

    setUpdating(true);
    try {
      // 验证原密码：尝试用原密码重新登录
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordForm.old,
      });

      if (signInError) throw new Error('当前密码验证失败');

      const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
      if (error) throw error;

      toast.success('密码修改成功');
      setIsPasswordDialogOpen(false);
      setPasswordForm({ old: '', new: '', confirm: '' });
    } catch (err: any) {
      toast.error(`修改失败: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar_url' | 'cover_url') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUpdating(true);
    try {
      // 生成符合导入链接模式的文件名
      const now = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
      const year = now.getUTCFullYear();
      const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = now.getUTCDate().toString().padStart(2, '0');
      const hours = now.getUTCHours().toString().padStart(2, '0');
      const minutes = now.getUTCMinutes().toString().padStart(2, '0');
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const timeStampName = `${year}${month}${day}${hours}${minutes}${randomSuffix}`;
      
      const path = `${user.id}/${field}-${timeStampName}.jpg`;
      const { data: url, error } = await api.uploadFile('media', path, file);
      if (error) throw error;
      setProfileForm(prev => ({ ...prev, [field]: url }));
      
      // 立即更新 Profile 表中的 avatar_url/cover_url，并刷新缓存，实现上传即生效
      await api.updateProfile(user.id, { [field]: url });
      if (refreshProfile) await refreshProfile();
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      
      toast.success('上传成功');
    } catch (err: any) {
      toast.error(`上传失败: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const { data } = await api.getNotifications(user.id);
      const count = data?.filter((n: any) => !n.is_read).length || 0;
      setUnreadCount(count);
    } catch (e) {
      console.error(e);
    }
  };

  const NotificationBadge = () => {
    if (unreadCount === 0) return null;
    return (
      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[8px] font-black rounded-full flex items-center justify-center shadow-sm shadow-primary/20 ring-2 ring-background">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    );
  };


  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportToken = async () => {
    if (!collectionToken.trim()) {
      toast.error('请输入有效的收藏口令');
      return;
    }

    setIsImporting(true);
    try {
      const { error } = await api.importCollectionToken(collectionToken.trim());
      if (error) throw error;
      
      toast.success('图集导入成功！');
      setIsImportDialogOpen(false);
      setCollectionToken('');
      // 刷新收藏列表
      if (mainTab === 'favorites') {
        fetchFavorites();
      }
    } catch (e: any) {
      toast.error('导入失败: ' + e.message);
    } finally {
      setIsImporting(false);
    }
  };

  const fetchUserMedia = async (page = 0, append = false, silent = false) => {
    if (!user) return;
    
    if (page === 0 && !silent) {
      setLoading(true);
      setItems([]);
      setCurrentPage(0);
    } else if (page > 0) {
      setLoadingMore(true);
    }
    
    try {
      const { data, error, total } = await api.getUserMedia(user.id, page, pageSize);
      if (error) throw error;
      
      setTotalItems(total);
      
      if (append) {
        setItems(prev => [...prev, ...data]);
      } else {
        setItems(data);
        // 保存到视图状态缓存
        if (page === 0) saveViewState(`profile_works_${user.id}`, { data, scrollPos: window.scrollY });
      }
      
      setCurrentPage(page);
      setHasMore(data.length === pageSize && (page + 1) * pageSize < total);
    } catch (error: any) {
      if (!silent) toast.error(`获取作品失败: ${error.message}`);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreItems = () => {
    if (!loadingMore && hasMore) {
      fetchUserMedia(currentPage + 1, true);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;
    try {
      const { data, error } = await api.getFavorites(user.id);
      if (error) throw error;
      setFavItems(data);
    } catch (error: any) {
      console.error('获取收藏失败:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAsync('确定要删除这个作品吗？', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { error } = await api.deleteMedia(id);
      if (error) throw error;
      toast.success('删除成功');
      setItems(items.filter(item => item.id !== id));
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  const openEdit = (item: MediaItem) => {
    setEditingItem(item);
  };

  const handleExportFavorites = () => {
    if (favItems.length === 0) {
      toast.error('没有可导出的收藏内容');
      return;
    }
    const data = {
      version: '1.0',
      type: 'favorites',
      mediaIds: favItems.map(item => item.id),
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my-favorites-${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('收藏内容已导出为 JSON');
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    setUpdating(true);
    try {
      const { error } = await api.updateMediaItem(editingItem.id, { title: editTitle });
      if (error) throw error;
      toast.success('修改成功');
      setItems(items.map(i => i.id === editingItem.id ? { ...i, title: editTitle } : i));
      setEditingItem(null);
    } catch (error: any) {
      toast.error(`修改失败: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleImportFavorites = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (!data.mediaIds || !Array.isArray(data.mediaIds)) {
          throw new Error('无效的 JSON 格式');
        }
        
        if (data.mediaIds.length === 0) {
          toast.info('导入文件为空');
          return;
        }
        
        const { error } = await api.importFavorites(user.id, data.mediaIds);
        if (error) throw error;
        
        toast.success(`成功导入 ${data.mediaIds.length} 项收藏`);
        fetchFavorites();
      } catch (err: any) {
        toast.error(`导入失败: ${err.message}`);
      }
    };
    reader.readAsText(file);
    // 重置 input 以允许再次选择同一文件
    event.target.value = '';
  };

  const handleEditSave = (updatedItem: MediaItem) => {
    setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
    setFavItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
    setEditingItem(null);
  };

  const renderItems = (statusFilter?: string, source: 'user' | 'favorites' = 'user') => {
    let filtered = source === 'user' ? (statusFilter ? items.filter(item => item.status === statusFilter) : items) : favItems;
    
    if (loading && source === 'user') {
      return (
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      );
    }

    if (filtered.length === 0 && source !== 'favorites') {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">
          <p>暂无作品</p>
        </div>
      );
    }

    // 时间线布局
    if (viewLayout === 'timeline' && source === 'user') {
      return (
        <TimelineLayout
          items={filtered}
          onItemClick={(item, index) => {
            const globalIndex = filtered.findIndex(i => i.id === item.id);
            setPreviewIndex(globalIndex);
          }}
          onToggleFavorite={async (itemId) => {
            if (user) {
              await api.toggleFavorite(user.id, itemId);
              fetchFavorites();
              toast.success('操作成功');
            }
          }}
          favorites={new Set(favItems.map(i => i.id))}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={loadMoreItems}
          emptyText="暂无作品"
        />
      );
    }

    // 分成两列显示瀑布流
    const columns: MediaItem[][] = [[], []];
    filtered.forEach((item, index) => {
      columns[index % 2].push(item);
    });

    const previewUI = previewIndex >= 0 && (
      <MediaPreview
        items={filtered}
        initialIndex={previewIndex}
        hasTabBar={true}
        onIndexChange={(index) => {
          const idPrefix = source === "favorites" ? "profile-favs-card-" : "profile-works-card-";
          const element = document.getElementById(`${idPrefix}${index}`);
          if (element) {
            element.scrollIntoView({ behavior: "auto", block: "center" });
          }
        }}
        onClose={(dislikedIds) => {
          setPreviewIndex(-1);
          
          // 强制清除可能残留的锁定状态
          document.body.style.overflow = '';
          document.body.classList.remove('overflow-hidden');
          
          if (dislikedIds && dislikedIds.length > 0) {
            // 如果在个人中心也触发了不喜欢，同步刷新数据
            if (source === 'favorites') fetchFavorites();
            else fetchUserMedia();
          }
        }}
      />
    );

    if (source === 'favorites') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <h3 className="text-xs font-bold text-muted-foreground flex items-center gap-2">
              <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
              我的收藏 ({favItems.length})
            </h3>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 rounded-xl text-[10px] gap-1.5 border-none bg-muted/30 font-bold"
                onClick={handleExportFavorites}
                disabled={favItems.length === 0}
              >
                <Download className="w-3.5 h-3.5" />
                导出 JSON
              </Button>
              <div className="relative">
                <input 
                  type="file" 
                  accept=".json" 
                  ref={fileInputRef}
                  className="hidden" 
                  onChange={handleImportFavorites}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 rounded-xl text-[10px] gap-1.5 border-none bg-muted/30 font-bold"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  导入
                </Button>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex gap-2 px-1 items-start overflow-hidden w-full">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex-1 space-y-2">
                  <MediaCardSkeleton />
                  <MediaCardSkeleton />
                </div>
              ))}
            </div>
          ) : favItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">
              <p>暂无收藏，快去探索吧！</p>
            </div>
          ) : (
            <div className="flex gap-2 items-start pb-24 px-1 overflow-hidden w-full">
              {columns.map((col, colIndex) => (
                <div key={colIndex} className="flex-1 flex flex-col gap-2 min-w-0 w-1/2">
                  {col.map((item) => {
                    const globalIndex = filtered.findIndex(i => i.id === item.id);
                    return (
                      <div key={item.id} id={`profile-works-card-${globalIndex}`} className="w-full">
                        <MediaItemCard 
                          item={item} 
                          isFavoriteMode={true}
                          onPreview={() => setPreviewIndex(globalIndex)}
                          onEdit={() => openEdit(item)}
                          onDelete={() => handleDelete(item.id)}
                          onToggleFavorite={async () => {
                            if (user) {
                              await api.toggleFavorite(user.id, item.id);
                              fetchFavorites();
                              toast.success('已从收藏夹移除');
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          {previewUI}
        </div>
      );
    }

    return (
      <>
        <div className="flex gap-2 items-start pb-6 px-1 overflow-hidden w-full">
          {columns.map((col, colIndex) => (
            <div key={colIndex} className="flex-1 flex flex-col gap-2 min-w-0 w-1/2">
              {col.map((item) => {
                // 在 filtered 列表中找到索引以支持预览滑动
                const globalIndex = filtered.findIndex(i => i.id === item.id);
                return (
                  <div key={item.id} id={`profile-favs-card-${globalIndex}`} className="w-full">
                    <MediaItemCard 
                      item={item} 
                      isFavoriteMode={false}
                      onPreview={() => {
                        // 传入过滤后的列表进行预览
                        setPreviewIndex(globalIndex);
                      }}
                      onEdit={() => openEdit(item)}
                      onDelete={() => handleDelete(item.id)}
                      onToggleFavorite={async () => {
                        if (user) {
                          await api.toggleFavorite(user.id, item.id);
                          fetchFavorites();
                          toast.success('已从收藏夹移除');
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        {/* 加载更多按钮 */}
        {source === 'user' && !statusFilter && hasMore && (
          <div className="w-full flex justify-center py-4 pb-20">
            <Button
              variant="outline"
              onClick={loadMoreItems}
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
                  <span className="text-xs text-muted-foreground">
                    ({items.length}/{totalItems})
                  </span>
                </>
              )}
            </Button>
          </div>
        )}
        
        {/* 已加载全部提示 */}
        {source === 'user' && !statusFilter && !hasMore && items.length > 0 && (
          <div className="w-full flex justify-center py-4 pb-20">
            <p className="text-xs text-muted-foreground">已加载全部 {totalItems} 个作品</p>
          </div>
        )}
        
        {/* 全屏预览组件使用过滤后的列表 */}
        {previewUI}
      </>
    );
  };

  return (
    <div className="w-full min-h-screen bg-background pb-20">
      <PullToRefresh onRefresh={handleRefresh}>
        <EditMediaDialog
          item={editingItem}
          isOpen={!!editingItem}
          onOpenChange={(open) => {
            if (!open) setEditingItem(null);
          }}
          onSave={handleEditSave}
        />
        {/* 顶部 Header */}
        <ProfileHeader 
          isAdmin={profile?.role === 'admin'}
          onNavigate={navigate}
          onSignOut={signOut}
          onOpenPreferences={() => setIsPreferenceOpen(true)}
          onOpenNotificationPrefs={() => setIsNotificationPreferencesOpen(true)}
          NotificationBadge={NotificationBadge}
        />

      <ProfileInfo 
        profile={profile}
        replaceUser={replaceUser}
        onEditProfile={() => setEditingProfile(true)}
        digitalIdSettings={digitalIdSettings}
        hasPurchasedId={hasPurchasedId}
        onNavigate={navigate}
      />

          {/* 数据面板 - 优化跳转逻辑 */}
          <div className="mt-4 px-4">
            <div className="flex items-center justify-between bg-white/50 backdrop-blur-md rounded-2xl p-4 border border-white/40 shadow-sm max-w-md mx-auto">
              <div className="flex flex-col gap-0.5 cursor-pointer group" onClick={() => navigate('/growth-logs')}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"><SystemText>成长等级</SystemText></span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-black text-slate-900 truncate max-w-[80px]">{replaceSystem(profile?.rank || '初出茅庐')}</span>
                  <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-600" />
                </div>
              </div>

              <div className="w-px h-8 bg-slate-200/50 shrink-0" />

              <div className="flex flex-col gap-0.5 cursor-pointer group" onClick={() => navigate('/points')}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">积分</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-black text-slate-900">{profile?.points || 0}</span>
                  <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-600" />
                </div>
              </div>

              <div className="w-px h-8 bg-slate-200/50 shrink-0" />

              <div className="flex flex-col gap-0.5 cursor-pointer group" onClick={() => navigate('/badges')}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">勋章</span>
                <div className="flex items-center gap-1">
                  <span className="text-base font-black text-slate-900">{userBadgesCount}</span>
                  <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-600" />
                </div>
              </div>
            </div>
          </div>
          <div className="hidden">
            <div className="flex items-center justify-center gap-8 min-w-max px-2 mx-auto">
              <div className="flex flex-col gap-1 cursor-pointer group" onClick={() => navigate('/growth-logs')}>
                <span className="text-xs font-bold text-slate-400"><SystemText>成长等级</SystemText></span>
                <div className="flex items-center gap-1">
                  <span className="text-base font-black text-slate-900">{replaceSystem(profile?.rank || '初出茅庐')}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600" />
                </div>
              </div>

              <div className="w-px h-8 bg-slate-100 shrink-0" />

              <div className="flex flex-col gap-1 cursor-pointer group" onClick={() => navigate('/points')}>
                <span className="text-xs font-bold text-slate-400">积分</span>
                <div className="flex items-center gap-1">
                  <span className="text-base font-black text-slate-900">{profile?.points || 0}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600" />
                </div>
              </div>

              <div className="w-px h-8 bg-slate-100 shrink-0" />

              <div className="flex flex-col gap-1 cursor-pointer group" onClick={() => navigate('/badges')}>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                    <Award className="w-3 h-3 text-white fill-white" />
                  </div>
                  <span className="text-xs font-bold text-slate-400">勋章</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-base font-black text-slate-900">{userBadgesCount}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600" />
                </div>
              </div>
            </div>

            {/* 特控⭐收集进度 */}
            <div className="px-4 md:px-0">
              <StarCollectionProgress />
            </div>
          </div>

        <div className="px-4">
          <div className="mt-4 grid grid-cols-4 gap-4 px-2">
            <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => navigate('/check-in')}>
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-active:scale-95 shadow-lg",
                  hasCheckedIn ? "bg-muted text-muted-foreground shadow-none border border-border/40" : "bg-primary/10 text-primary shadow-primary/5 border border-primary/20"
                )}>
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground tracking-tight text-center"><SystemText>签到中心</SystemText></span>
              </div>
              
              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => navigate('/badges')}>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center transition-all group-active:scale-95 shadow-lg shadow-blue-500/10 border border-blue-500/20 ring-4 ring-blue-500/5">
                  <Award className="w-6 h-6 fill-current" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground tracking-tight text-center"><SystemText>我的勋章</SystemText></span>
              </div>

              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => { fetchUserEasterEggs(); setIsEasterEggsOpen(true); }}>
                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center transition-all group-active:scale-95 shadow-lg shadow-pink-500/5 border border-pink-500/20">
                  <Gift className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground tracking-tight text-center">我的彩蛋</span>
              </div>

              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setIsRedeemOpen(true)}>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center transition-all group-active:scale-95 shadow-lg shadow-blue-500/5 border border-blue-500/20">
                  <Key className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground tracking-tight text-center">兑换中心</span>
              </div>

              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setIsInviteListOpen(true)}>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center transition-all group-active:scale-95 shadow-lg shadow-indigo-500/5 border border-indigo-500/20">
                  <UserPlus className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground tracking-tight text-center">邀请码</span>
              </div>

              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setEditingProfile(true)}>
                <div className="w-12 h-12 rounded-2xl bg-muted/40 text-muted-foreground flex items-center justify-center transition-all group-active:scale-95 shadow-lg shadow-black/5 border border-border/60">
                  <UserCog className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground tracking-tight text-center">修改资料</span>
              </div>

              {canClassify && (
                <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => navigate('/fast-organize')}>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center transition-all group-active:scale-95 shadow-lg shadow-amber-500/5 border border-amber-500/20">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground tracking-tight text-center">极速分类</span>
                </div>
              )}

              {canBrowseAlbums && (
                <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => navigate('/albums')}>
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center transition-all group-active:scale-95 shadow-lg shadow-rose-500/5 border border-rose-500/20">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground tracking-tight text-center">图集写真</span>
                </div>
              )}

              {(sysConfig?.wechat_binding_enabled !== false || sysConfig?.is_mp_bind_enabled) && (
                <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => { 
                  setIsWechatBindingOpen(true); 
                  setActiveBindingTab(sysConfig?.wechat_binding_enabled === false ? "mini_program" : "official_account"); 
                }}>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center transition-all group-active:scale-95 shadow-lg shadow-green-500/5 border border-green-500/20">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    {(wechatBindings.length > 0 || profile?.mp_openid) && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground tracking-tight text-center">微信绑定</span>
                </div>
              )}

            </div>


            {/* 自定义字段展示 */}
            {customFields.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/40">
                {customFields.map(field => {
                  const val = profile?.custom_fields?.[field.field_key];
                  if (!val) return null;
                  return (
                    <div key={field.id} className="flex items-center gap-1.5 bg-muted/40 px-3 py-1 rounded-lg border border-border/20">
                      <span className="text-[10px] text-muted-foreground font-medium">{field.field_name}:</span>
                      <span className="text-[10px] font-bold text-foreground/80">{val}</span>
                    </div>
                  );
                })}
              </div>
            )}
        </div>

        <div className="flex items-center justify-center gap-1 mb-4 bg-muted/30 p-1 rounded-2xl overflow-x-auto no-scrollbar">
          <Button 
            variant={mainTab === 'works' ? 'default' : 'ghost'} 
            className={cn("flex-none px-4 h-9 rounded-xl text-[10px] font-bold transition-all duration-300", mainTab === 'works' && "shadow-sm bg-background text-foreground hover:bg-background")}
            onClick={() => setMainTab('works')}
          >
            <SystemText>我的作品</SystemText>
          </Button>
          <Button 
            variant={mainTab === 'favorites' ? 'default' : 'ghost'} 
            className={cn("flex-none px-4 h-9 rounded-xl text-[10px] font-bold transition-all duration-300", mainTab === 'favorites' && "shadow-sm bg-background text-foreground hover:bg-background")}
            onClick={() => setMainTab('favorites')}
          >
            <SystemText>收藏夹</SystemText>
          </Button>
          <Button 
            variant={mainTab === 'downloads' ? 'default' : 'ghost'} 
            className={cn("flex-none px-4 h-9 rounded-xl text-[10px] font-bold transition-all duration-300", mainTab === 'downloads' && "shadow-sm bg-background text-foreground hover:bg-background")}
            onClick={() => {
              setMainTab('downloads');
              if (user) fetchDownloadHistory();
            }}
          >
            我的下载
          </Button>
          <Button 
            variant={mainTab === 'requests' ? 'default' : 'ghost'} 
            className={cn("flex-none px-4 h-9 rounded-xl text-[10px] font-bold transition-all duration-300", mainTab === 'requests' && "shadow-sm bg-background text-foreground hover:bg-background")}
            onClick={() => {
              setMainTab('requests');
              fetchAlbumRequests();
            }}
          >
            我的申请
          </Button>
        </div>

        {mainTab === 'favorites' && (
          <div className="pt-2 px-1">
            <div className="flex items-center justify-between mb-6 px-1">
              <h2 className="text-sm font-black flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary fill-current" />
                我的收藏
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-[10px] font-bold h-8 gap-2 border-primary/20 text-primary hover:bg-primary/5"
                onClick={() => setIsImportDialogOpen(true)}
              >
                <Key className="w-3 h-3" />
                通过口令导入
              </Button>
            </div>
            {renderItems(undefined, 'favorites')}
          </div>
        )}

        {mainTab === 'downloads' && (
          <div className="pt-2 px-1">
            {/* 类型筛选 */}
            <div className="flex items-center gap-2 mb-6 px-1">
              {[
                { label: '全部', value: 'all' },
                { label: '壁纸', value: 'wallpaper' },
                { label: '写真图集', value: 'album' }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setDownloadFilter(filter.value as any)}
                  className={cn(
                    "px-4 py-2 rounded-full text-[10px] font-bold transition-all border",
                    downloadFilter === filter.value 
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                      : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {downloadLoading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">同步下载云端数据...</span>
              </div>
            ) : downloadHistory.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1">
                {downloadHistory.map((record) => {
                  const isInvalid = invalidRecords.has(record.id);
                  const resourceUrl = record.media_items?.url || record.album_photos?.url;

                  return (
                  <div key={record.id} className={cn(
                    "bg-card border border-border rounded-3xl p-4 flex flex-col gap-4 group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden",
                    isInvalid && "opacity-80 grayscale-[0.5]"
                  )}>
                    <div className="flex gap-4">
                      {/* 缩略图区域 */}
                      <div className="w-24 h-32 rounded-2xl overflow-hidden bg-muted flex-shrink-0 relative border border-border shadow-inner">
                        {resourceUrl && !isInvalid ? (
                          <ProtectedMedia 
                            src={resourceUrl} 
                            type="image"
                            isThumbnail={true}
                            ruleKey="写-网"
                            className="w-full h-full object-contain transition-transform group-hover:scale-110 duration-700" 
                            onError={() => setInvalidRecords(prev => new Set(prev).add(record.id))}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/50">
                            {isInvalid ? (
                              <>
                                <AlertTriangle className="w-6 h-6 text-amber-500 opacity-50" />
                                <span className="text-[8px] font-bold text-amber-600/50 uppercase">资源失效</span>
                              </>
                            ) : (
                              <ImageIcon className="w-8 h-8 opacity-20 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <Badge className="text-[9px] h-4 px-2 bg-black/60 text-white backdrop-blur-md border-none font-black uppercase tracking-tighter">
                            {record.type === 'wallpaper' ? '壁纸' : '图集'}
                          </Badge>
                        </div>
                        {isInvalid && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                             <Badge variant="destructive" className="text-[8px] h-4 px-1 font-black">404</Badge>
                          </div>
                        )}
                      </div>

                      {/* 信息区域 */}
                      <div className="flex flex-col flex-1 min-w-0 justify-between py-1">
                        <div className="space-y-2">
                          <div className={cn(
                            "text-base font-black text-foreground line-clamp-2 tracking-tight leading-tight group-hover:text-primary transition-colors",
                            isInvalid && "text-muted-foreground line-through decoration-muted-foreground/30"
                          )}>
                            {record.media_items?.title || record.album_photos?.photo_albums?.title || '未命名资源'}
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold bg-muted/50 w-fit px-2 py-1 rounded-lg">
                              <Clock className="w-3 h-3 text-primary/50" />
                              {format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')}
                            </div>
                            {record.points_spent > 0 && (
                              <div className="flex items-center gap-1.5 text-[10px] text-primary font-black bg-primary/10 w-fit px-2 py-1 rounded-lg border border-primary/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                消耗 {record.points_spent} 积分
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-[9px] text-muted-foreground/30 font-black uppercase tracking-[0.2em] mt-2">
                          REF: {record.id.split('-')[0]}
                        </div>
                      </div>
                    </div>

                    {/* 操作按钮区 */}
                    <div className="flex items-center gap-2 mt-auto">
                      <Button 
                        disabled={downloadingRecordId === record.id || isInvalid}
                        className={cn(
                          "flex-1 rounded-2xl h-11 font-black text-[10px] uppercase tracking-widest transition-all shadow-sm",
                          downloadingRecordId === record.id 
                            ? "bg-primary/20 text-primary border-none" 
                            : (isInvalid ? "bg-muted text-muted-foreground/40 border-none cursor-not-allowed" : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-95 shadow-primary/20")
                        )}
                        onClick={() => handleDownloadRecord(record)}
                      >
                        {downloadingRecordId === record.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                            正在云端分流...
                          </>
                        ) : isInvalid ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 mr-2" />
                            资源已失效
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 mr-2" />
                            立即下载原件
                          </>
                        )}
                      </Button>
                      
                      {record.media_items?.id && (
                        <Button 
                          variant="outline" 
                          size="icon"
                          disabled={isInvalid}
                          className={cn(
                            "h-11 w-11 rounded-2xl border-border transition-colors",
                            isInvalid ? "opacity-30 cursor-not-allowed" : "hover:bg-muted"
                          )}
                          onClick={() => {
                            if (isInvalid) {
                              toast.error('该资源已失效，无法查看');
                              return;
                            }
                            window.open(`/discovery/${record.media_items.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4 opacity-40" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border mx-1">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Download className="w-8 h-8 text-muted-foreground/20" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">暂无相关下载记录</span>
              </div>
            )}
          </div>
        )}

        {mainTab === 'requests' && (
          <div className="pt-2 px-1">
            {/* 状态筛选 */}
            <div className="flex items-center gap-2 mb-6 px-1">
              {[
                { label: '全部', value: 'all' },
                { label: '待审核', value: 'pending' },
                { label: '已通过', value: 'approved' },
                { label: '被拒绝', value: 'rejected' }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setRequestFilter(filter.value as any)}
                  className={cn(
                    "px-4 py-2 rounded-full text-[10px] font-bold transition-all border",
                    requestFilter === filter.value 
                      ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20" 
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {requestLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-4">正在同步申请状态...</span>
              </div>
            ) : albumRequests.filter(req => requestFilter === 'all' || req.status === requestFilter).length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {albumRequests
                  .filter(req => requestFilter === 'all' || req.status === requestFilter)
                  .map((req) => (
                  <div key={req.id} className="bg-muted/30 p-5 rounded-3xl border border-border/40 hover:border-primary/20 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                          <FolderOpen className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 opacity-60">图集权限申请</div>
                          <h3 className="text-sm font-bold truncate max-w-[180px]">
                            {req.photo_albums?.title || '未知图集'}
                          </h3>
                        </div>
                      </div>
                      <Badge className={cn(
                        "rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest border shadow-sm",
                        req.status === 'approved' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        req.status === 'rejected' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                        "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse"
                      )}>
                        {req.status === 'approved' ? '已通过' : req.status === 'rejected' ? '已拒绝' : '审核中'}
                      </Badge>
                    </div>

                    <div className="space-y-3 bg-background/40 p-4 rounded-2xl border border-border/20 mb-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">申请理由</span>
                        <p className="text-[11px] text-foreground/70 leading-relaxed italic line-clamp-2">
                          "{req.reason || '未填写理由'}"
                        </p>
                      </div>
                      
                      {req.status === 'rejected' && req.rejected_reason && (
                        <div className="flex flex-col gap-1 pt-2 border-t border-border/10">
                          <span className="text-[9px] font-black uppercase tracking-widest text-rose-500/60">拒绝原因</span>
                          <p className="text-[11px] text-rose-500/80 font-medium">
                            {req.rejected_reason}
                          </p>
                        </div>
                      )}
                      
                      {req.status === 'approved' && req.approved_level && (
                        <div className="flex flex-col gap-1 pt-2 border-t border-border/10">
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60">解锁权限</span>
                          <p className="text-[11px] text-emerald-500 font-bold">
                            {req.approved_level === 'restricted' ? '限制级 (VVIP)' : req.approved_level.toUpperCase()}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground/30" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                          {format(new Date(req.created_at), 'yyyy/MM/dd HH:mm')}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
                        onClick={() => navigate(`/albums/${req.album_id}`)}
                      >
                        {req.status === 'approved' ? '立即查看' : '查看详情'}
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border mx-1">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-muted-foreground/20" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">暂无相关申请记录</span>
              </div>
            )}
          </div>
        )}

        {mainTab === 'works' && (
          <div className="pt-2">

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between gap-3 pb-2">
                <TabsList className="flex-1 flex rounded-xl bg-muted/50 p-1">
                  <TabsTrigger value="all" className="flex-1 rounded-lg text-[10px] py-2 px-2">全部</TabsTrigger>
                  <TabsTrigger value="pending" className="flex-1 rounded-lg text-[10px] py-2 px-2">审核中</TabsTrigger>
                  <TabsTrigger value="approved" className="flex-1 rounded-lg text-[10px] py-2 px-2">已通过</TabsTrigger>
                  <TabsTrigger value="archived" className="flex-1 rounded-lg text-[10px] py-2 px-2">已下架</TabsTrigger>
                  <TabsTrigger value="rejected" className="flex-1 rounded-lg text-[10px] py-2 px-2">被拒绝</TabsTrigger>
                </TabsList>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9 rounded-xl bg-muted/50 hover:bg-muted"
                  onClick={() => setViewLayout(viewLayout === 'grid' ? 'timeline' : 'grid')}
                  title={viewLayout === 'grid' ? '切换到时间线视图' : '切换到瀑布流视图'}
                >
                  {viewLayout === 'grid' ? <LayoutGrid className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </Button>
              </div>
            <div className="pt-4 px-1">
              <TabsContent value="all">{renderItems()}</TabsContent>
              <TabsContent value="pending">{renderItems('pending')}</TabsContent>
              <TabsContent value="approved">{renderItems('approved')}</TabsContent>
              <TabsContent value="archived">{renderItems('archived')}</TabsContent>
              <TabsContent value="rejected">{renderItems('rejected')}</TabsContent>
            </div>
          </Tabs>
        </div>
      )}

        {/* 返回顶部按钮 */}
        {showScrollTop && (
        <Button
          size="icon"
          className="fixed bottom-24 right-4 z-40 rounded-full shadow-lg bg-primary hover:bg-primary/90 animate-in fade-in slide-in-from-bottom-4"
          onClick={scrollToTop}
        >
          <ChevronUp className="w-6 h-6" />
        </Button>
      )}
      {/* 编辑弹窗 */}
      <Dialog open={isPreferenceOpen} onOpenChange={setIsPreferenceOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-3xl overflow-hidden p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-black">偏好设置</DialogTitle>
            <DialogDescription className="text-xs">
              告诉我们您喜欢看什么，或者想排除哪些内容。
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[70vh] overflow-y-auto px-6 py-2 space-y-6 scrollbar-thin scrollbar-thumb-muted-foreground/20">
            {prefLoading ? (
              <div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <>
                {/* 分类偏好 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-1">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-primary" />
                      内容分类偏好
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-normal">{allCategories.length} 个分类</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allCategories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/30 transition-colors">
                        <span className="text-sm font-medium truncate pr-2">{cat.name}</span>
                        <div className="flex gap-1.5 shrink-0">
                          <Button 
                            size="sm" 
                            variant={likedCategories.includes(cat.id) ? "default" : "ghost"}
                            className={cn("h-7 w-7 p-0 rounded-full", likedCategories.includes(cat.id) ? "shadow-sm shadow-primary/20" : "text-muted-foreground hover:text-primary hover:bg-primary/10")}
                            onClick={() => togglePreference('liked', 'cat', cat.id)}
                            title="喜欢"
                          >
                            <Heart className={cn("w-3.5 h-3.5", likedCategories.includes(cat.id) && "fill-current")} />
                          </Button>
                          <Button 
                            size="sm" 
                            variant={dislikedCategories.includes(cat.id) ? "destructive" : "ghost"}
                            className={cn("h-7 w-7 p-0 rounded-full", dislikedCategories.includes(cat.id) ? "shadow-sm shadow-destructive/20" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10")}
                            onClick={() => togglePreference('disliked', 'cat', cat.id)}
                            title="不感兴趣"
                          >
                            <ThumbsDown className={cn("w-3.5 h-3.5", dislikedCategories.includes(cat.id) && "fill-current")} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 标签偏好 */}
                <div className="space-y-3 pb-4">
                  <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-1">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <TagIcon className="w-4 h-4 text-primary" />
                      热门标签偏好
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-normal">{allTags.length} 个标签</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {allTags.map(tag => {
                      const isLiked = likedTags.includes(tag.id);
                      const isDisliked = dislikedTags.includes(tag.id);
                      return (
                        <div 
                          key={tag.id}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all border flex items-center gap-1.5",
                            isLiked ? "bg-primary text-primary-foreground border-primary" : 
                            isDisliked ? "bg-destructive text-destructive-foreground border-destructive" : 
                            "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
                          )}
                            onClick={() => {
                              if (isLiked) {
                                // 如果已经是喜欢,点击后变为不喜欢
                                togglePreference('disliked', 'tag', tag.id);
                              } else if (isDisliked) {
                                // 如果已经是不喜欢,点击后取消(置空)
                                setDislikedTags(prev => prev.filter(i => i !== tag.id));
                              } else {
                                // 如果是空状态,点击后变为喜欢
                                togglePreference('liked', 'tag', tag.id);
                              }
                            }}
                        >
                          {tag.name}
                          {isLiked && <Heart className="w-3 h-3 fill-current" />}
                          {isDisliked && <ThumbsDown className="w-3 h-3 fill-current" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 个性化优化配置 */}
                <div className="space-y-4 border-t border-border/10 pt-4 pb-4">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    智能推荐优化
                  </h4>
                  
                  <div className="space-y-4 px-1">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs text-muted-foreground">推荐精准度 (基于行为权重)</Label>
                        <span className="text-xs font-bold text-primary">{recommendationIntensity}x</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground shrink-0">均衡</span>
                        <input 
                          type="range" 
                          min="1" 
                          max="5" 
                          step="1"
                          value={recommendationIntensity}
                          onChange={(e) => setRecommendationIntensity(parseInt(e.target.value))}
                          className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <span className="text-[10px] text-muted-foreground shrink-0">激进</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic mt-1">
                        * 提高权重将使系统更敏感地根据您的点击、收藏等行为进行推荐。
                      </p>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-9 rounded-xl border-red-500/20 text-red-500 hover:bg-red-500/5 transition-all text-xs flex items-center justify-center gap-2"
                        onClick={clearPersonalizationData}
                        disabled={isClearing}
                      >
                        {isClearing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        重置个性化推荐数据
                      </Button>
                      <p className="text-[9px] text-muted-foreground text-center mt-2">
                        这将清空您的历史交互记录,重新开始个性化学习。



                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="p-6 pt-2">
            <Button 
              className="w-full rounded-2xl h-12 font-bold shadow-lg shadow-primary/20"
              onClick={handleSavePreferences}
              disabled={updating}
            >
              {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              保存偏好设置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑个人资料弹窗 */}
      <Dialog open={editingProfile} onOpenChange={setEditingProfile}>
        <DialogContent className="max-w-[90vw] rounded-3xl overflow-hidden p-0 border-none bg-background">
          <DialogHeader className="p-6 pb-2 text-left">
            <DialogTitle className="text-xl font-black">修改个人资料</DialogTitle>
            <DialogDescription>更新您的个人头像、背景封面以及各项基本信息</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* 头像与封面上传 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground ml-1">修改头像</Label>
                <div 
                  className="w-full aspect-square rounded-2xl bg-muted/30 border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-all overflow-hidden relative"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {profileForm.avatar_url ? (
                    <img src={profileForm.avatar_url} alt="avatar" className="w-full h-full object-contain" />
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5 text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground font-bold">上传</span>
                    </>
                  )}
                  <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'avatar_url')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground ml-1">修改封面</Label>
                <div 
                  className="w-full aspect-square rounded-2xl bg-muted/30 border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-all overflow-hidden relative"
                  onClick={() => coverInputRef.current?.click()}
                >
                  {profileForm.cover_url ? (
                    <img src={profileForm.cover_url} alt="cover" className="w-full h-full object-contain" />
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5 text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground font-bold">上传</span>
                    </>
                  )}
                  <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover_url')} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground ml-1 flex items-center justify-between">
                <span>邮箱绑定</span>
                {(user?.email && !user.email.endsWith("@miaoda.com") && user.email_confirmed_at) || (profile?.email && !profile.email.endsWith("@miaoda.com")) ? (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none text-[8px] h-4">已绑定</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-none text-[8px] h-4">未绑定</Badge>
                )}
              </Label>
              
              {((user?.email && !user.email.endsWith("@miaoda.com") && user.email_confirmed_at) || (profile?.email && !profile.email.endsWith("@miaoda.com"))) && !forceShowInput ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between bg-muted/30 px-4 py-3 rounded-xl border border-border/40">
                    <span className="text-sm font-medium">{profile?.email || user?.email}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setNewEmail('');
                        setShowOtpInput(false);
                        setForceShowInput(true);
                        toast.info('请输入新邮箱以更换绑定');
                      }}
                      className="text-xs text-primary h-7 px-2 hover:bg-primary/5"
                    >
                      更换绑定
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="输入邮箱地址" 
                      value={newEmail} 
                      onChange={(e) => setNewEmail(e.target.value)} 
                      className="rounded-xl border-muted bg-muted/30 focus:bg-background transition-all flex-1" 
                    />
                    <Button 
                      size="sm" 
                      onClick={handleVerifyEmail} 
                      disabled={isVerifyingEmail || !newEmail} 
                      className="rounded-xl h-10 px-4 shrink-0 font-bold" 
                    >
                      {isVerifyingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : "认证"}
                    </Button>
                    {forceShowInput && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setForceShowInput(false);
                          setShowOtpInput(false);
                        }}
                        className="rounded-xl h-10 px-3"
                      >
                        取消
                      </Button>
                    )}
                  </div>
                  <p className="text-[9px] text-muted-foreground ml-1">
                    绑定真实邮箱以找回密码和接收通知
                  </p>
                </div>
              )}
              
              {showOtpInput && (
                <div className="flex gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
                  <Input 
                    placeholder="6位验证码" 
                    value={verificationCode} 
                    onChange={(e) => setVerificationCode(e.target.value)} 
                    className="rounded-xl border-muted bg-primary/5 focus:bg-background transition-all flex-1 text-center tracking-widest font-mono" 
                    maxLength={6} 
                  />
                  <Button 
                    size="sm" 
                    onClick={handleConfirmOtp} 
                    disabled={isConfirmingCode || verificationCode.length < 6} 
                    className="rounded-xl h-10 px-4 shrink-0 font-bold bg-green-600 hover:bg-green-700" 
                  >
                    {isConfirmingCode ? <Loader2 className="w-3 h-3 animate-spin" /> : "确认"}
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground ml-1">用户名</Label>
              <Input 
                placeholder="输入用户名" 
                value={profileForm.username || ""}
                onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
                className="rounded-xl border-muted bg-muted/30 focus:bg-background transition-all"
              />
            </div>
            
            <div className="pt-2 pb-2">
               <Button 
                variant="outline" 
                size="sm" 
                className="w-full rounded-xl border-dashed border-primary/20 hover:border-primary/40 text-primary h-10 font-bold"
                onClick={() => {
                  setEditingProfile(false);
                  setIsPasswordDialogOpen(true);
                }}
              >
                <Key className="w-4 h-4 mr-2" />
                修改账户密码 (需验证原密码)
              </Button>
            </div>
            {customFields.filter(f => f.show_in_profile).map(field => (
              <div key={field.id} className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground ml-1">
                  {field.field_name}
                  {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
                </Label>
                <CustomFieldRenderer 
                  field={field}
                  value={profileForm[field.field_key]}
                  onChange={(val) => setProfileForm(prev => ({ ...prev, [field.field_key]: val }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter className="p-6 pt-2">
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button variant="outline" onClick={() => setEditingProfile(false)} className="rounded-xl font-bold">取消</Button>
              <Button onClick={handleUpdateProfile} disabled={updating} className="rounded-xl font-bold bg-primary text-primary-foreground">
                {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}保存
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 兑换中心弹窗 */}
      <Dialog open={isRedeemOpen} onOpenChange={setIsRedeemOpen}>
        <DialogContent className="max-w-[85vw] rounded-3xl p-6 border-none bg-background">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mx-auto mb-4">
              <Key className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-black">兑换中心</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2">请输入您的邀请码、积分码或权限兑换码</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Input 
                placeholder="输入兑换码" 
                value={redeemCode} 
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                className="rounded-xl h-12 text-center font-mono text-lg uppercase tracking-widest border-muted bg-muted/20"
                maxLength={20}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              * 兑换码区分大小写，使用后即失效
            </p>
          </div>
          <DialogFooter>
            <Button 
              className="w-full h-12 rounded-2xl font-black text-base bg-blue-500 text-white shadow-lg shadow-blue-500/20"
              onClick={handleRedeem}
              disabled={redeeming || !redeemCode}
            >
              {redeeming ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              立即兑换
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 邀请管理弹窗 */}
      <Dialog open={isInviteListOpen} onOpenChange={setIsInviteListOpen}>
        <DialogContent className="max-w-[90vw] rounded-3xl p-0 border-none bg-background overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <DialogTitle className="text-lg font-black text-foreground">邀请有礼</DialogTitle>
                  <DialogDescription className="text-[10px] text-muted-foreground">邀请好友注册，共建社区</DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div className="px-6 py-2 border-b">
            <Tabs value={activeInviteTab} onValueChange={setActiveInviteTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/30 p-1 rounded-xl h-10">
                <TabsTrigger value="codes" className="rounded-lg text-xs font-bold">邀请码</TabsTrigger>
                <TabsTrigger value="users" className="rounded-lg text-xs font-bold">已邀请 ({invitedUsers.length})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="px-6 py-4 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {activeInviteTab === 'codes' ? (
              <>
                <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-indigo-600/80">生成邀请码</span>
                    <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-400 bg-white">单次有效</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-4 leading-relaxed">每个邀请码仅限使用一次，注册成功后将永久绑定推荐关系。</p>
                  <Button 
                    className="w-full h-10 rounded-xl font-bold bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                    onClick={handleGenerateInvite}
                    disabled={generatingInvite}
                  >
                    {generatingInvite ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    生成新邀请码
                  </Button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground flex items-center gap-2 px-1">
                    历史生成记录 ({userInviteCodes.length})
                  </h3>
                  {userInviteCodes.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-muted-foreground/10">
                      <p className="text-xs">暂无邀请码记录</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {userInviteCodes.map(code => {
                        const isUsed = (code.used_count || 0) >= (code.max_uses || 1);
                        return (
                          <div key={code.id} className="flex items-center justify-between p-3 bg-card border border-border/60 rounded-2xl group transition-all hover:border-indigo-500/30">
                            <div className="flex flex-col">
                              <span className="text-sm font-black font-mono tracking-wider">{code.code}</span>
                              <span className="text-[9px] text-muted-foreground">创建于 {new Date(code.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isUsed ? (
                                <Badge className="bg-muted text-muted-foreground border-none rounded-lg text-[10px]">已使用</Badge>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 rounded-xl text-[10px] font-bold text-indigo-500 hover:bg-indigo-50"
                                  onClick={() => copyToClipboard(code.code)}
                                >
                                  <Copy className="w-3.5 h-3.5 mr-1" />
                                  复制
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground flex items-center gap-2 px-1">
                  成功邀请的用户 ({invitedUsers.length})
                </h3>
                {invitedUsers.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-muted-foreground/10">
                    <p className="text-xs">暂无邀请记录</p>
                    <p className="text-[10px] mt-1 opacity-60">分享邀请码给好友开始邀请吧</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invitedUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 bg-card border border-border/60 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 rounded-lg">
                            <AvatarImage src={u.avatar_url} />
                            <AvatarFallback className="bg-indigo-500/10 text-indigo-500 text-[10px]">{u.username?.substring(0, 1)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold">{u.username}</span>
                            <span className="text-[9px] text-muted-foreground">注册时间: {new Date(u.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] rounded-lg border-indigo-100 text-indigo-400 bg-indigo-50/50 px-2 py-0">已激活</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-6 pt-2 border-t mt-2">
            <p className="text-[9px] text-muted-foreground leading-relaxed text-center italic">
              * 邀请码可分享给好友，好友注册成功后即可绑定关系
            </p>
            <Button variant="ghost" className="w-full mt-4 text-xs h-10 rounded-xl" onClick={() => setIsInviteListOpen(false)}>
              返回中心
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* 消息通知设置弹窗 */}
      {/* 修改密码弹窗 */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-[85vw] rounded-3xl p-6 border-none bg-background">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              修改账户密码
            </DialogTitle>
            <DialogDescription>
              修改密码后，下次登录需使用新密码
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>当前密码</Label>
              <Input 
                type="password" 
                placeholder="请输入当前正在使用的密码"
                value={passwordForm.old}
                onChange={e => setPasswordForm(prev => ({ ...prev, old: e.target.value }))}
                className="rounded-xl bg-muted/30 border-none"
              />
            </div>
            <div className="space-y-2">
              <Label>新密码</Label>
              <Input 
                type="password" 
                placeholder="请输入 6 位以上的新密码"
                value={passwordForm.new}
                onChange={e => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                className="rounded-xl bg-muted/30 border-none"
              />
            </div>
            <div className="space-y-2">
              <Label>确认新密码</Label>
              <Input 
                type="password" 
                placeholder="请再次输入新密码"
                value={passwordForm.confirm}
                onChange={e => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                className="rounded-xl bg-muted/30 border-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="w-full rounded-xl font-bold h-12"
              onClick={handleUpdatePassword}
              disabled={updating}
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : '确认修改密码'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 微信绑定弹窗 */}
      <Dialog open={isWechatBindingOpen} onOpenChange={setIsWechatBindingOpen}>
        <DialogContent className="max-w-[85vw] rounded-3xl p-6 border-none bg-background">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-green-500" />
              微信关联绑定
            </DialogTitle>
            <DialogDescription>
              绑定后可通过微信接收通知和快捷登录
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Tabs 
              value={activeBindingTab} 
              onValueChange={setActiveBindingTab} 
              className="w-full"
            >
              <TabsList className={cn(
                "grid w-full rounded-2xl h-12 bg-muted/40 p-1 mb-4", 
                (sysConfig?.wechat_binding_enabled !== false && sysConfig?.is_mp_bind_enabled) ? "grid-cols-2" : "grid-cols-1"
              )}>
                {sysConfig?.wechat_binding_enabled !== false && (
                  <TabsTrigger value="official_account" className="rounded-xl font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-center">
                    公众号
                    {wechatBindings.length > 0 && <span className="ml-1.5 w-4 h-4 rounded-full bg-green-500 text-[10px] text-white flex items-center justify-center">{wechatBindings.length}</span>}
                  </TabsTrigger>
                )}
                {sysConfig?.is_mp_bind_enabled && (
                  <TabsTrigger value="mini_program" className="rounded-xl font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-center">
                    小程序
                    {profile?.mp_openid && <span className="ml-1.5 w-4 h-4 rounded-full bg-green-500 text-[10px] text-white flex items-center justify-center">1</span>}
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="mini_program" className="mt-0 space-y-4">
                <div className="space-y-4 pt-4">
                  {/* 已绑定小程序列表 */}
                  {profile?.mp_openid && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-muted-foreground px-1">已绑定小程序</h3>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl border border-border/40">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
                            <Smartphone className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold">微信小程序授权</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{profile.mp_openid.slice(0, 16)}...</span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:bg-red-50 rounded-xl h-8 text-[10px] font-bold"
                          onClick={async () => {
                            if (confirm('确定要解除小程序绑定吗？')) {
                              setBindingLoading(true);
                              try {
                                const { error } = await (supabase.from('profiles') as any).update({ mp_openid: null }).eq('id', user?.id || '');
                                if (error) throw error;
                                 fetchWechatBindings();
                                toast.success('已解除小程序绑定');
                                if (refreshProfile) refreshProfile();
                              } catch (e: any) {
                                toast.error('解绑失败: ' + e.message);
                              } finally {
                                setBindingLoading(false);
                              }
                            }
                          }}
                          disabled={bindingLoading}
                        >
                          解绑
                        </Button>
                      </div>
                    </div>
                  )}

                  {!profile?.mp_openid && (
                    <div className="flex flex-col items-center justify-center py-6 space-y-4">
                      <div className="text-center space-y-1">
                        <div className="text-sm font-bold">扫码跳转小程序完成绑定</div>
                        <div className="text-[10px] text-muted-foreground">支持扫码后自动关联当前登录账户</div>
                      </div>
                      
                      <div className="relative w-48 h-48 bg-muted/30 rounded-3xl flex items-center justify-center overflow-hidden border border-border/40">
                        {generatingMpQr ? (
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        ) : mpQrData ? (
                          <div className="flex flex-col items-center w-full">
                            <img src={mpQrData} className="w-48 h-48 object-contain" alt="绑定小程序码" />
                            {mpDebugConfig?.is_debug_enabled && (
                              <div className="w-full space-y-3 mt-4 px-4 pb-4">
                                <div className="flex flex-col gap-1 p-3 bg-muted rounded-2xl text-[10px] break-all border border-primary/20 shadow-sm relative overflow-hidden group/debug">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/30" />
                                  <div className="flex justify-between items-center text-primary font-bold border-b border-primary/10 pb-1.5 mb-1.5 uppercase tracking-wider">
                                    <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> 页面路径</span>
                                    <Button 
                                      variant="secondary" 
                                      size="sm" 
                                      className="h-6 rounded-lg px-2 text-[10px] gap-1" 
                                      onClick={() => {
                                        navigator.clipboard.writeText(mpQrPage || mpDebugConfig?.task_page_path || 'pages/user/task');
                                        toast.success('路径已复制');
                                      }}
                                    >
                                      <Copy className="h-3 w-3" />
                                      复制
                                    </Button>
                                  </div>
                                  <div className="font-mono text-foreground/80 leading-relaxed">{mpQrPage || mpDebugConfig?.task_page_path || 'pages/user/task'}</div>
                                </div>
                                
                                <div className="flex flex-col gap-1 p-3 bg-muted rounded-2xl text-[10px] break-all border border-primary/20 shadow-sm relative overflow-hidden group/debug">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/30" />
                                  <div className="flex justify-between items-center text-primary font-bold border-b border-primary/10 pb-1.5 mb-1.5 uppercase tracking-wider">
                                    <span className="flex items-center gap-1"><QrCode className="w-3 h-3" /> Scene 参数</span>
                                    <Button 
                                      variant="secondary" 
                                      size="sm" 
                                      className="h-6 rounded-lg px-2 text-[10px] gap-1" 
                                      onClick={() => {
                                        navigator.clipboard.writeText(mpQrScene || '');
                                        toast.success('参数已复制');
                                      }}
                                    >
                                      <Copy className="h-3 w-3" />
                                      复制
                                    </Button>
                                  </div>
                                  <div className="font-mono text-foreground/80 leading-relaxed">{mpQrScene || '无参数'}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center p-4">
                            <QrCode className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-20" />
                            <Button variant="ghost" size="sm" onClick={handleGenerateMpBindingQr} className="text-[10px]">重新获取</Button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-amber-500/5 px-4 py-2 rounded-xl border border-amber-500/10">
                        <Zap className="w-3 h-3 text-amber-500" />
                        扫码后请在小程序中点击“立即绑定”按钮
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="official_account" className="mt-0 space-y-4">
                <div className="space-y-4 pt-4">
              {/* 已绑定列表 */}
              {wechatBindings.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground px-1">已绑定公众号</h3>
                  <div className="space-y-2">
                    {wechatBindings.map(binding => (
                      <div key={binding.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl border border-border/40">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{binding.wechat_configs?.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{binding.openid.slice(0, 10)}...</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:bg-red-50 rounded-xl h-8 text-[10px] font-bold"
                          onClick={() => handleUnbindWechat(binding.id)}
                          disabled={bindingLoading}
                        >
                          解绑
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {wechatBindings.length < 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">选择要绑定的公众号</Label>
                    <div className="flex flex-wrap gap-2">
                      {bindingConfigs.map(config => (
                        <Badge 
                          key={config.id} 
                          variant={selectedBindingConfigId === config.id ? 'default' : 'outline'}
                          className="cursor-pointer py-1.5 px-3 rounded-xl border-indigo-500/20"
                          onClick={() => setSelectedBindingConfigId(config.id)}
                        >
                          {config.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* 公众号扫码与关注说明 */}
                  {(() => {
                    const selectedConfig = bindingConfigs.find(c => c.id === selectedBindingConfigId);
                    if (!selectedConfig) return null;
                    return (
                      <div className="flex flex-col items-center justify-center py-4 space-y-4 bg-muted/20 rounded-3xl border border-border/40 p-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="text-center space-y-1">
                          <div className="text-sm font-bold flex items-center justify-center gap-2">
                            关注公众号: 
                            <span 
                              className="text-indigo-600 cursor-pointer hover:underline flex items-center gap-1 active:scale-95 transition-transform"
                              onClick={() => {
                                navigator.clipboard.writeText(selectedConfig.name);
                                toast.success('公众号名称已复制');
                              }}
                            >
                              {selectedConfig.name}
                              <Copy className="w-3 h-3" />
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            微信搜索关注并回复“绑定”或验证码
                          </p>
                        </div>
                        
                        {selectedConfig.qr_code_url ? (
                          <div className="relative w-40 h-40 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-border/40 p-2 shadow-sm">
                            <img src={selectedConfig.qr_code_url} className="w-full h-full object-contain" alt="公众号二维码" />
                          </div>
                        ) : (
                          <div className="w-40 h-40 bg-muted/30 rounded-2xl flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border/60">
                            <QrCode className="w-10 h-10 opacity-20 mb-2" />
                            <span className="text-[10px]">暂无二维码</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-indigo-500/5 px-4 py-2 rounded-xl border border-indigo-500/10">
                          <Zap className="w-3 h-3 text-amber-500" />
                          关注后，请选择下方其中一种方式完成绑定
                        </div>
                      </div>
                    );
                  })()}

                  {bindingMode === 'menu' && (
                    <div className="grid grid-cols-1 gap-3 pt-2">
                      <Button 
                        className="rounded-2xl h-12 font-bold bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20"
                        onClick={() => setBindingMode('generate')}
                      >
                        生成绑定码（在公众号输入）
                      </Button>
                      <Button 
                        variant="outline"
                        className="rounded-2xl h-12 font-bold border-indigo-500/20 text-indigo-600"
                        onClick={() => setBindingMode('verify')}
                      >
                        输入验证码（由公众号生成）
                      </Button>
                    </div>
                  )}

                  {bindingMode === 'generate' && (
                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2">
                      <div className="text-center p-6 bg-indigo-500/5 border border-dashed border-indigo-500/30 rounded-3xl">
                        {generatedBindingCode ? (
                          <>
                            <div className="text-3xl font-black font-mono tracking-[0.2em] text-indigo-600">{generatedBindingCode}</div>
                            <p className="text-[10px] text-muted-foreground mt-3">
                              请在微信公众号发送该验证码完成绑定<br/>
                              验证码 10 分钟内有效
                            </p>
                          </>
                        ) : (
                          <Button 
                            onClick={handleGenerateBindingCode} 
                            disabled={bindingLoading}
                            className="rounded-xl"
                          >
                            {bindingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            点击生成绑定码
                          </Button>
                        )}
                      </div>
                      <Button variant="ghost" className="w-full text-xs" onClick={() => { setBindingMode('menu'); setGeneratedBindingCode(''); }}>返回选择</Button>
                    </div>
                  )}

                  {bindingMode === 'verify' && (
                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2">
                      <div className="space-y-3">
                        <Label className="text-xs font-bold">在公众号回复“绑定”获取 6 位验证码</Label>
                        <Input 
                          placeholder="请输入 6 位验证码" 
                              value={inputBindingCode}
                              onChange={e => setInputBindingCode(e.target.value)}
                              className="rounded-2xl h-12 bg-muted/30 border-none text-center text-lg font-bold font-mono tracking-widest"
                              maxLength={6}
                            />
                            <Button 
                              className="w-full rounded-2xl h-12 font-bold"
                              onClick={handleVerifyBindingCode}
                              disabled={bindingLoading}
                            >
                              {bindingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                              确认绑定
                            </Button>
                          </div>
                          <Button variant="ghost" className="w-full text-xs" onClick={() => setBindingMode('menu')}>返回选择</Button>
                        </div>
                      )}
                    </div>
                  )}

                  {wechatBindings.length >= 2 && (
                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-center">
                      <p className="text-xs text-amber-600 font-bold">您已达到绑定上限（最多 2 个公众号）</p>
                      <p className="text-[10px] text-amber-600/60 mt-1">如需绑定新账号，请先解除现有绑定</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="ghost" className="w-full rounded-xl" onClick={() => setIsWechatBindingOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 通知偏好设置对话框 */}
      <NotificationPreferencesDialog
        open={isNotificationPreferencesOpen}
        onOpenChange={setIsNotificationPreferencesOpen}
      />

      {/* 导入收藏口令对话框 */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">导入收藏口令</DialogTitle>
            <DialogDescription>
              请输入 10 位收藏口令（例如 COL-ABC123），即可将口令关联的图集批量导入您的收藏。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="token" className="text-sm font-bold">收藏口令</Label>
              <Input
                id="token"
                placeholder="请输入口令..."
                value={collectionToken}
                onChange={(e) => setCollectionToken(e.target.value.toUpperCase())}
                className="rounded-xl h-12 text-center font-mono text-lg uppercase tracking-widest"
              />
            </div>
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <p className="text-[10px] text-primary/60 font-medium leading-relaxed">
                温馨提示：导入功能会自动将口令对应的所有图片/视频加入到您的“我的收藏”列表中。如果内容已存在，将不会重复添加。
              </p>
            </div>
          </div>
          <DialogFooter className="sm:justify-start gap-2">
            <Button
              className="flex-1 rounded-xl h-12 font-bold shadow-lg shadow-primary/20"
              onClick={handleImportToken}
              disabled={isImporting || !collectionToken.trim()}
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              立即导入
            </Button>
            <Button
              variant="ghost"
              className="rounded-xl h-12 font-bold"
              onClick={() => setIsImportDialogOpen(false)}
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEasterEggsOpen} onOpenChange={setIsEasterEggsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
          <div className="bg-gradient-to-br from-pink-500/10 to-background p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <Gift className="w-5 h-5 text-pink-500" />
                我的彩蛋记录
              </DialogTitle>
              <DialogDescription>
                您在探索过程中发现的惊喜奖励
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              {loadingEggs ? (
                <div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : userEggRecords.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground/30">
                    <Gift className="w-8 h-8" />
                  </div>
                  <p>暂无中奖记录，快去探索吧！</p>
                </div>
              ) : (
                userEggRecords.map((record) => (
                  <div key={record.id} className="bg-card border border-border/60 p-4 rounded-2xl flex gap-4 items-start shadow-sm">
                    <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center shrink-0">
                      {record.easter_egg_configs?.icon_url ? (
                        <img src={record.easter_egg_configs.icon_url} alt="Egg" className="w-8 h-8 object-contain" />
                      ) : (
                        <Gift className="w-6 h-6 text-pink-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-foreground truncate">{record.easter_egg_configs?.name}</h4>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {record.reward_type === 'points' ? '积分' : record.reward_type === 'physical' ? '实物' : '优惠券'}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground/80 mt-1 font-medium">
                        {record.reward_type === 'points' && `+${record.reward_content?.amount} 积分`}
                        {record.reward_type === 'physical' && record.reward_content?.name}
                        {record.reward_type === 'coupon' && record.reward_content?.code}
                      </p>
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(record.created_at).toLocaleDateString()}
                        </span>
                        <Badge className={cn(
                          "text-[10px] h-5",
                          record.claim_status === 'claimed' ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                          record.claim_status === 'shipped' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                          "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}>
                          {record.claim_status === 'claimed' ? '已发放' : record.claim_status === 'shipped' ? '已发货' : '待处理'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter className="p-4 bg-muted/30">
            <Button onClick={() => setIsEasterEggsOpen(false)} className="w-full rounded-xl font-bold">关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </PullToRefresh>
    </div>
  );
}

function NotificationSettingsDialog({ isOpen, onOpenChange, settings, onSettingsChange, onSave, loading }: { 
  isOpen: boolean, 
  onOpenChange: (open: boolean) => void,
  settings: any,
  onSettingsChange: (s: any) => void,
  onSave: () => void,
  loading: boolean
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[85vw] rounded-3xl p-0 border-none bg-background overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-black">消息通知设置</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">设置接收各类系统消息的邮箱提醒</DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between group">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">审核通知</Label>
                <p className="text-[10px] text-muted-foreground">作品审核通过或被拒绝时发送邮件</p>
              </div>
              <Button 
                variant={settings.audit ? "default" : "outline"}
                size="sm"
                className={cn("rounded-full h-8 px-4 font-bold transition-all", settings.audit && "bg-green-500 hover:bg-green-600 border-none")}
                onClick={() => onSettingsChange({ ...settings, audit: !settings.audit })}
              >
                {settings.audit ? '开启中' : '已关闭'}
              </Button>
            </div>
            
            <div className="flex items-center justify-between group">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">系统通知</Label>
                <p className="text-[10px] text-muted-foreground">积分变动、账号安全等系统消息</p>
              </div>
              <Button 
                variant={settings.system ? "default" : "outline"}
                size="sm"
                className={cn("rounded-full h-8 px-4 font-bold transition-all", settings.system && "bg-blue-500 hover:bg-blue-600 border-none")}
                onClick={() => onSettingsChange({ ...settings, system: !settings.system })}
              >
                {settings.system ? '开启中' : '已关闭'}
              </Button>
            </div>

            <div className="flex items-center justify-between group">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">活动资讯</Label>
                <p className="text-[10px] text-muted-foreground">新功能推荐、平台热门资讯等</p>
              </div>
              <Button 
                variant={settings.marketing ? "default" : "outline"}
                size="sm"
                className={cn("rounded-full h-8 px-4 font-bold transition-all", settings.marketing && "bg-indigo-500 hover:bg-indigo-600 border-none")}
                onClick={() => onSettingsChange({ ...settings, marketing: !settings.marketing })}
              >
                {settings.marketing ? '开启中' : '已关闭'}
              </Button>
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-2xl border border-border/40">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                开启邮件提醒前请确保您已完成邮箱绑定，否则将无法接收到任何通知邮件。
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="p-6 pt-0">
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl font-bold h-11">取消</Button>
            <Button onClick={onSave} disabled={loading} className="rounded-xl font-bold h-11 bg-primary text-primary-foreground">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}保存设置
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MediaItemCard({ 
  item, 
  onPreview, 
  onEdit, 
  onDelete, 
  isFavoriteMode = false,
  onToggleFavorite
}: { 
  item: MediaItem, 
  onPreview: () => void, 
  onEdit: () => void, 
  onDelete: () => void,
  isFavoriteMode?: boolean,
  onToggleFavorite?: () => void
}) {
  const { profile } = useAuth();
  const { replaceUser, replaceSystem } = useKeywordReplacement();
  const statusColors = {
    pending: 'bg-amber-500/10 text-amber-600',
    approved: 'bg-green-500/10 text-green-600',
    rejected: 'bg-red-500/10 text-red-600',
    archived: 'bg-slate-500/10 text-slate-600',
  };

  const statusLabels = {
    pending: replaceSystem('正在审核'),
    approved: replaceSystem('审核通过'),
    rejected: replaceSystem('审核驳回'),
    archived: replaceSystem('作品下架'),
  };

  return (
    <Card className={cn(
      "overflow-hidden border-none shadow-sm rounded-xl bg-card flex flex-col group relative w-full transition-all duration-300",
      item.status === 'rejected' && "ring-1 ring-red-500/30 bg-red-500/[0.02]"
    )}>
      <div className="relative w-full overflow-hidden bg-muted/20 cursor-pointer" onClick={onPreview}>
        {item.type === 'image' ? (
          <ProtectedMedia 
            src={item.url} 
            type="image"
            alt={item.title || ""} 
            isThumbnail={true}
            ruleKey="写-网"
            className="w-full h-auto block" 
          />
        ) : (
          <div className="relative w-full aspect-video bg-muted/40 overflow-hidden flex items-center justify-center">
            {item.thumbnail_url ? (
              <img 
                src={item.thumbnail_url} 
                alt={item.title || ""} 
                className="w-full h-full object-contain" 
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2">
                 <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary/40 group-hover:scale-110 transition-transform">
                    <Video className="w-6 h-6" />
                 </div>
                 <span className="text-[10px] font-bold text-muted-foreground/60">视频</span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:bg-black/0 transition-colors">
              <PlayCircle className="text-white w-6 h-6 drop-shadow-lg opacity-40 group-hover:scale-110 transition-transform" />
            </div>
          </div>
        )}
        
        {/* 审核中蒙层 */}
        {item.status === 'pending' && (
          <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-2">
              <div className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
                <span className="text-[8px] font-bold text-yellow-500">正在审核中</span>
              </div>
            </div>
          </div>
        )}
        {!isFavoriteMode && (
          <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold shadow-sm ${statusColors[item.status]}`}>
            {statusLabels[item.status]}
          </div>
        )}
        {isFavoriteMode && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 border border-white/10"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.();
            }}
            title="取消收藏"
          >
            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
          </Button>
        )}
        {!isFavoriteMode && (
          <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 border border-white/20 shadow-xl"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-red-500/80 border border-white/20 shadow-xl"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
      <div className="p-2 bg-card">
        {item.media_tags && item.media_tags.filter(mt => mt.tags && (profile?.role === 'admin' || !mt.tags.name.includes('不入'))).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {item.media_tags.filter(mt => mt.tags && (profile?.role === 'admin' || !mt.tags.name.includes('不入'))).map((mt, idx) => (
              <span key={mt.tag_id || idx} className={cn(
                "text-[7px] font-black uppercase tracking-tighter",
                mt.tags?.name.includes('不入') ? "text-amber-500" : "text-primary"
              )}>
                #{mt.tags?.name}
              </span>
            ))}
          </div>
        )}
        <h3 className="text-[10px] font-bold truncate text-foreground/90 leading-tight">{replaceUser(cleanTitle(item.title))}</h3>
        <div className="flex items-center justify-between gap-1 mt-1">
          <div className="flex items-center gap-1 opacity-60">
            <Eye className="w-2.5 h-2.5" />
            <span className="text-[8px] font-bold tabular-nums">{item.view_count || 0}</span>
          </div>
          <span className="text-[8px] text-muted-foreground/40 tabular-nums">
            {new Date(item.created_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
          </span>
        </div>
        {item.status === 'rejected' && item.reason && !isFavoriteMode && (
          <div className="mt-1.5 p-1.5 bg-red-50 rounded-lg border border-red-100 flex flex-col gap-1">
            <p className="text-[7px] font-black text-red-600 flex items-center gap-1 uppercase tracking-tighter">
              <AlertCircle className="w-2.5 h-2.5" /> 
              拒绝原因 / 指导建议
            </p>
            <p 
              className="text-[9px] text-red-700 leading-tight italic font-medium line-clamp-2 cursor-pointer hover:bg-red-100/50 p-0.5 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                confirmAsync(item.reason || '', {
                  title: '驳回详情',
                  confirmText: '去修改',
                  cancelText: '关闭'
                }).then(res => {
                  if (res) onEdit();
                });
              }}
            >
              <UserText>{item.reason || ''}</UserText>
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="mt-0.5 text-[8px] font-black text-white bg-red-500 px-2 py-0.5 rounded shadow-sm active:scale-95 transition-all w-fit"
            >
              去修改并重新发布
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
