import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { uploadToStorage } from '@/lib/upload';


import { useConfig } from '@/contexts/ConfigContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Lock, Image as ImageIcon, Calendar as CalendarIcon, Clock, AlertCircle, CheckCircle, Download, RefreshCw, RefreshCcw, QrCode, Copy, ChevronLeft, ChevronRight, Calendar as LucideCalendar, Smartphone, LayoutGrid, X, Megaphone, Globe, ExternalLink, TriangleAlert, PlayCircle, Heart, Key, Scan, Send, Users, Trophy, Upload as LucideUpload, Info, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { formatBeijingTime, isWechat as checkWechat, downloadFile } from '@/lib/utils';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';
import { ImageCache } from '@/lib/image-cache';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { NativeAd } from '@/components/common/NativeAd';
import { useAds } from '@/contexts/AdContext';
import { encodeOpenId, decodeOpenId } from '@/lib/crypto';

import { logCollector } from '@/lib/logCollector';

import { ReadingRanking } from '@/components/ReadingRanking';

type ViewerMode = 'gallery' | 'book' | 'ranking';

import { DailyGalleryDialogs } from './daily-gallery/DailyGalleryDialogs';
import { DailyGalleryPassword } from './daily-gallery/components/DailyGalleryPassword';
import { DailyGalleryRestricted } from './daily-gallery/components/DailyGalleryRestricted';
import { DailyGalleryGuide } from './daily-gallery/components/DailyGalleryGuide';
import { WallpaperPreview } from './daily-gallery/components/WallpaperPreview';
import { useWaterfallScrollKeep } from '@/hooks/useWaterfallScrollKeep';
import { getFingerprint } from '@/lib/fingerprint';


export default function DailyGalleryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { config } = useConfig();
  const { user, profile, openLoginDialog } = useAuth();
  const { getAdsByPlacement } = useAds();

  const dailyAds = getAdsByPlacement('daily');
  const rawDateParam = searchParams.get('date');
  const dateParam = useMemo(() => {
    const now = new Date();
    // 默认使用北京时间今日
    const today = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
    const val = rawDateParam || today;
    // 统一格式化为 YYYY-MM-DD 内部使用
    if (val && /^\d{8}$/.test(val)) {
      return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
    }
    return val;
  }, [rawDateParam]);
    
  const rawOpenidParam = searchParams.get('openid') || searchParams.get('mp_openid');
  const openidParam = useMemo(() => rawOpenidParam ? decodeOpenId(rawOpenidParam) : null, [rawOpenidParam]);
  const passwordFromUrl = useMemo(() => searchParams.get('p') || searchParams.get('password') || '', [searchParams.get('p'), searchParams.get('password')]);
  
  // 用于防止重复处理 URL 参数的 ref
  const lastProcessedPasswordRef = useRef('');
  const lastProcessedOpenidRef = useRef('');
  
  // 1.5 验证 OpenID 与登录用户的匹配性（如果开启了强制校验）
  // 注意：这里不再使用 config.restrict_to_wechat，因为该字段不存在于 StorageConfig
  // 如果需要此功能，应从 daily_gallery_config 中读取
  useEffect(() => {
    // 暂时移除此校验，或者从 daily_gallery_config 中读取
    // if (config?.restrict_to_wechat && openidParam && profile) {
    //   if (profile.wechat_openid && profile.wechat_openid !== openidParam && profile.mp_openid !== openidParam) {
    //     toast.error('访问受限：身份不匹配', {
    //        description: '该链接为专属访问，请使用原本获取链接的微信号打开。'
    //     });
    //   }
    // }
  }, [openidParam, profile]);

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const verifyingRef = useRef(false);
  const lastFailedPasswordRef = useRef<string | null>(null);
  const lastFailedTimeRef = useRef<number>(0);
  const lastVerifyTimeRef = useRef<number>(0);
  const [password, setPassword] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const isVerifiedRef = useRef(false);
  const [images, setImages] = useState<any[]>([]);

  const [postInfo, setPostInfo] = useState<any>(null);
  const [mode, setMode] = useState<ViewerMode>('gallery');

  // 1. 集成滚动保持逻辑 (针对图集列表模式)
  useWaterfallScrollKeep({
    key: `daily_gallery_${dateParam}`,
    data: images,
    onRestore: (data) => {
      if (data && Array.isArray(data) && data.length > 0) {
        setImages(data);
        setIsVerified(true); // 恢复数据即代表已验证
      }
    },
    debounceTime: 500,
    enabled: mode === 'gallery'
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [showWallpaperPreview, setShowWallpaperPreview] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [autoPlayProgress, setAutoPlayProgress] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isWechat, setIsWechat] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(dateParam));
  const [publishedDates, setPublishedDates] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [readDates, setReadDates] = useState<string[]>([]);
  const [isDatesLoaded, setIsDatesLoaded] = useState(false);
  const [storageConfig, setStorageConfig] = useState<any>(null);
  const isTriggeringRef = useRef(false);

  const [seenMediaIds, setSeenMediaIds] = useState<string[]>([]);
  const [hideSeen, setHideSeen] = useState(true);
  const [onlineCount, setOnlineCount] = useState(1);
  const [cumulativeViews, setCumulativeViews] = useState(0);
  const [todayViews, setTodayViews] = useState(0);

  const [showWechatGuide, setShowWechatGuide] = useState(false);
  const [guideQrUrl, setGuideQrUrl] = useState<string | null>(null);
  const [loadingGuideQr, setLoadingGuideQr] = useState(false);

  // 微信公众号信息
  const [wechatConfigs, setWechatConfigs] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [wechatConfig, setWechatConfig] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [loadingQr, setLoadingQr] = useState(false);
  // 浏览器指纹 ID (存放在 localStorage)
  const [browserId, setBrowserId] = useState(() => localStorage.getItem('miaoda_browser_fingerprint') || '');

  useEffect(() => {
    getFingerprint().then(setBrowserId);
  }, []);

  const [mpQrUrl, setMpQrUrl] = useState<string | null>(null);
  const [loadingMpQr, setLoadingMpQr] = useState(false);
  const [isMpUnlocked, setIsMpUnlocked] = useState(false);
  const isMpUnlockedRef = useRef(false);

  const [itemRuleKeys, setItemRuleKeys] = useState<Map<string, string>>(new Map());

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const [readingRanking, setReadingRanking] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<any>(null);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [rankingType, setRankingType] = useState<'continuous' | 'total'>('continuous');

  const [nickname, setNickname] = useState('');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadSubmission = async () => {
    if (uploadFiles.length === 0) {
      toast.error('请选择要上传的图片');
      return;
    }

    setIsUploading(true);
    try {
      const results = [];
      const currentUserId = user?.id || null;
      const currentNickname = user ? (profile?.username || user.email?.split('@')[0]) : nickname;
      
      let effectiveUserId = currentUserId;
      if (!effectiveUserId && openidParam) {
        const { data: ensuredId, error: ensureError } = await api.supabase.rpc('ensure_profile_exists', {
          target_openid: openidParam,
          target_nickname: currentNickname
        });
        if (!ensureError && ensuredId) effectiveUserId = ensuredId;
      }

      for (const file of uploadFiles) {
        // 校验大小
        if (dgConfig.max_file_size && file.size > dgConfig.max_file_size) {
          throw new Error(`文件 "${file.name}" 超过限制大小 (${(dgConfig.max_file_size / 1024 / 1024).toFixed(1)}MB)`);
        }
        
        // 校验格式
        if (dgConfig.allowed_formats && !dgConfig.allowed_formats.includes(file.type)) {
          throw new Error(`文件 "${file.name}" 格式不支持`);
        }

        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_').replace(/_+/g, '_');
        const filePath = `daily_gallery/${effectiveUserId || 'anonymous'}/${Date.now()}_${sanitizedFileName}`;
        
        const uploadRes = await uploadToStorage({
          file,
          path: filePath,
          storageConfig
        });

        if (!uploadRes?.success || !uploadRes?.url) {
          throw new Error(uploadRes?.error || '存储上传失败');
        }

        const publicUrl = uploadRes.url;

        const res = await api.submitDailyGalleryImage(effectiveUserId, publicUrl, {}, openidParam, currentNickname);
        if (res.error) throw res.error;
        results.push(res.data);
      }

      toast.success('上传成功，请等待管理员审核');
      setShowUploadModal(false);
      setUploadFiles([]);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('上传失败: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const fetchRanking = useCallback(async () => {
    setLoadingRanking(true);
    try {
      const { data: ranking } = await api.getReadingRanking(10, rankingType);
      setReadingRanking(ranking || []);

      const localOpenid = localStorage.getItem('daily_gallery_openid');
      const identityForRank = (openidParam && (openidParam === localOpenid || !localOpenid)) ? openidParam : (localOpenid || null);

      if (user?.id || identityForRank) {
        const rankInfo = await api.getUserReadingRank(user?.id, rankingType, identityForRank);
        setUserRank(rankInfo);
      }
    } catch (e) {
      console.error('Fetch ranking error:', e);
    } finally {
      setLoadingRanking(false);
    }
  }, [user?.id, openidParam, rankingType]);

  useEffect(() => {
    fetchRanking();
  }, [rankingType, fetchRanking]);

  const [collectingLogs, setCollectingLogs] = useState<any[]>([]);

  useEffect(() => {
    if (isVerified && (user?.id || openidParam)) {
      const localOpenid = localStorage.getItem('daily_gallery_openid');
      const identityForStats = (openidParam && (openidParam === localOpenid || !localOpenid)) ? openidParam : (localOpenid || null);
      
      api.updateReadingStats(user?.id, identityForStats).then(() => {
        // 更新完后直接拉取排行榜以反映最新状态
        fetchRanking();
      });
    }
  }, [isVerified, user?.id, openidParam, fetchRanking]);

  useEffect(() => {
    if (!isVerified) return;

    const channel = supabase
      .channel('reading_ranking_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          // 当 profiles 表有更新时，重新获取排行榜
          // 使用 debounce 避免频繁更新
          fetchRanking();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isVerified, fetchRanking]);

  // 新用户修改密码弹窗状态
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [newUserInfo, setNewUserInfo] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  // 初始化规则
  useEffect(() => {
    if (images.length > 0) {
      setItemRuleKeys(prev => {
        const next = new Map(prev);
        let changed = false;
        images.forEach(img => {
          if (!next.has(img.id)) {
            next.set(img.id, '每日');
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [images]);

  const [mpQrScene, setMpQrScene] = useState<string | null>(null);
  const [mpQrPage, setMpQrPage] = useState<string | null>(null);
  
  // 同步 Refs
  useEffect(() => { verifyingRef.current = verifying; }, [verifying]);
  useEffect(() => { isVerifiedRef.current = isVerified; }, [isVerified]);
  useEffect(() => { isMpUnlockedRef.current = isMpUnlocked; }, [isMpUnlocked]);
  const pollIntervalRef = useRef<any>(null);

  const ignoreOldStatusRef = useRef(true);
  const mpQrGeneratedAtRef = useRef<number>(0);

  // 统一重置逻辑
  const resetMpState = useCallback(() => {
    console.log('[DailyGallery] Resetting MP state...');

    // 清除轮询
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // 清空状态
    setMpQrUrl(null);
    setMpQrScene(null);
    setMpQrPage(null);
    setIsMpUnlocked(false);
    setPassword('');
    updateManualInput(false);

    // 关键：开启忽略旧状态，直到产生新的观看或解锁记录
    ignoreOldStatusRef.current = true;
    mpQrGeneratedAtRef.current = 0;

    // 清除缓存
    localStorage.removeItem(`daily_gallery_${dateParam}`);
    sessionStorage.removeItem(`daily_gallery_verified_${dateParam}`);
  }, [dateParam]);

  // 增加浏览量并获取统计数据
  useEffect(() => {
    const postId = postInfo?.postId || postInfo?.id;
    if (isVerified && postId) {
      // 增加浏览量
      api.supabase.rpc('increment_daily_gallery_views', { p_post_id: postId }).then(() => {
        // 获取最新统计数据
        api.supabase.from('daily_gallery_posts').select('view_count, today_view_count').eq('id', postId).maybeSingle().then(({ data }: { data: any }) => {
          if (data) {
            setCumulativeViews(data.view_count || 0);
            setTodayViews(data.today_view_count || 0);
          }
        });
      });

      // 实时在线人数 (Realtime Presence)
      const channel = api.supabase.channel(`gallery_presence_${postId}`, {
        config: {
          presence: {
            key: user?.id || browserId,
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const count = Object.keys(state).length;
          setOnlineCount(count > 0 ? count : 1);
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ online_at: new Date().toISOString() });
          }
        });

      return () => {
        channel.unsubscribe();
      };
    }
  }, [isVerified, postInfo, user?.id, browserId]);

  const [dgConfig, setDgConfig] = useState<any>({
    enable_password: true,
    enable_wechat_password: true,
    enable_miniprogram_ad: false,
    restrict_to_wechat: false,
    ad_unlock_mode: 'direct',
    enable_incentive: false,
    rb_trigger_probability: 0,
    rb_trigger_view_count: 20,
    rb_trigger_message: '恭喜发现隐藏惊喜，正在为您加载随机美图...',
    notification_messages: {
      browser_locked_title: '访问受限：浏览器已锁定',
      browser_locked_desc: '该密码已在其他设备或浏览器中使用，专属密码仅支持首个打开的设备。',
      wechat_exclusive_title: '访问受限：需专属链接',
      wechat_exclusive_desc: '该内容为专属访问，请通过公众号发送的专属链接打开。',
      date_mismatch_title: '访问受限：日期不匹配',
      date_mismatch_desc: '该密码不适用于当前日期的图集，请获取今日正确密码。',
      password_expired_title: '访问受限：凭据已过期',
      password_expired_desc: '访问凭据已过期，请重新向公众号获取。',
      invalid_password_title: '验证失败',
      invalid_password_desc: '密码不正确，请重新获取今日访问凭证',
      empty_password: '请输入访问密码',
      concurrent_request: '并发请求冲突，请 1 秒后重试',
      processing_request: '系统正在处理您的上一个请求，请稍后。',
      non_2xx_error: '密码验证失败，请确认密码是否正确',
      welcome_unlocked: '欢迎回来，今日内容已解锁',
      welcome_verified: '验证成功！',
      page_title: '每日图集',
      page_subtitle: '请输入访问密码查看今日图片',
      announcement_title: '官方公告',
      bottom_hint: '支持每日密码、通用密码或特权码',
    }
  });

  const [resetting, setResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [newPasswordAfterReset, setNewPasswordAfterReset] = useState('');
  const [showResetOption, setShowResetOption] = useState(false);
  const [mpDebugConfig, setMpDebugConfig] = useState<any>(null);

  const [resetQrUrl, setResetQrUrl] = useState<string>('');
  const [loadingResetQr, setLoadingResetQr] = useState(false);

  const [incentiveDialogOpen, setIncentiveDialogOpen] = useState(false);
  const [incentiveStep, setIncentiveStep] = useState<'qr' | 'thanks'>('qr');
  const [loadingIncentiveQr, setLoadingIncentiveQr] = useState(false);
  const [incentiveQrUrl, setIncentiveQrUrl] = useState<string | null>(null);
  const incentiveQrGeneratedAtRef = useRef<number>(0);
  const incentivePollIntervalRef = useRef<any>(null);

  const [manualInput, setManualInput] = useState(false);
  const manualInputRef = useRef(false);
  const updateManualInput = (val: boolean) => {
    setManualInput(val);
    manualInputRef.current = val;
  };
  const passwordRef = useRef('');
  useEffect(() => { passwordRef.current = password; }, [password]);

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [currentAnn, setCurrentAnn] = useState<any>(null);

  const logAccess = useCallback(async (postId: string, usedPassword: string, passwordType: string = 'view') => {
    try {
      await api.logDailyGalleryAccess({
        post_id: postId,
        user_openid: openidParam || null,
        user_id: user?.id || null,
        ip_address: null,
        user_agent: navigator.userAgent,
        password_used: usedPassword,
        browser_fingerprint: browserId,
        access_type: passwordType
      });
    } catch (error) {
      console.error('Log access error:', error);
    }
  }, [openidParam, user, browserId]);

  // 静默关联用户画像：当用户登录且有 openid 时，自动建立 openid ↔ user_id 关联
  useEffect(() => {
    const linkUserProfile = async () => {
      if (!user?.id) return;
      let openid: string | null = null;
      try {
        openid = localStorage.getItem('daily_gallery_openid') || localStorage.getItem('openid') || null;
      } catch (e) {}
      if (!openid || openid === 'unknown_user') return;

      try {
        // 静默更新 analytics_visitors 表中的 user_id
        const { error } = await api.supabase
          .from('analytics_visitors')
          .update({ user_id: user.id, openid: openid })
          .eq('openid', openid)
          .is('user_id', null);
        if (error) {
          console.warn('[DailyGallery] Failed to link openid to user:', error);
        } else {
          console.log('[DailyGallery] Linked openid to user profile silently');
        }
      } catch (e) {
        console.warn('[DailyGallery] Link profile error:', e);
      }
    };
    linkUserProfile();
  }, [user?.id]);

  const handleFeedback = useCallback(async () => {
    if (!feedbackContent.trim()) {
      toast.error('请输入反馈内容');
      return;
    }
    setIsSubmittingFeedback(true);
    try {
      const success = await logCollector.submitFullSession(feedbackContent);
      if (success) {
        toast.success('提交成功');
        setShowFeedbackModal(false);
        setFeedbackContent('');
      } else {
        throw new Error('提交失败');
      }
    } catch (e: any) {
      console.error(e);
      toast.error('提交反馈失败: ' + (e.message || '未知错误'));
    } finally {
      setIsSubmittingFeedback(false);
    }
  }, [feedbackContent]);

  const handleVerify = useCallback(async (pwd?: string, cachedOpenid?: string | null) => {
    if (verifyingRef.current) return;
    
    // 防止过于频繁的并发请求
    if (Date.now() - lastVerifyTimeRef.current < 1500) {
      console.log('[DailyGallery] Verifying too frequent, ignoring...');
      return;
    }
    
    const passwordToVerify = pwd !== undefined ? pwd : password;
    
    console.log(`[DailyGallery] 开始验证密码... 日期: ${dateParam}, 密码: ${passwordToVerify ? '***' : '空'}, 是否微信: ${isWechat}`);
    
    if (!passwordToVerify.trim() && dgConfig.enable_password !== false) {
      toast.error((dgConfig.notification_messages?.empty_password) || '请输入访问密码');
      return;
    }

    // 优先使用 URL 中的 openid（用户从公众号或他人分享链接进入时携带）
    let effectiveOpenid = openidParam || cachedOpenid || null;
    
    // 其次尝试读取全局 openid 缓存（浏览器级持久化，不绑定日期）
    if (!effectiveOpenid) {
      try {
        const globalOpenid = localStorage.getItem('daily_gallery_openid');
        if (globalOpenid && globalOpenid !== 'unknown_user') {
          effectiveOpenid = globalOpenid;
          console.log('[DailyGallery] Using global cached openid from localStorage');
        }
      } catch (e) {
        console.error('[DailyGallery] Failed to read global openid:', e);
      }
    }
    
    // 最后尝试读取日期绑定的缓存 openid（兼容旧逻辑）
    if (!effectiveOpenid) {
      try {
        const cached = localStorage.getItem(`daily_gallery_${dateParam}`);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          if (parsedCache.password === passwordToVerify && parsedCache.openid) {
            if (parsedCache.browserId && parsedCache.browserId !== browserId) {
              console.log('[DailyGallery] Cached browserId mismatch, clearing cache');
              localStorage.removeItem(`daily_gallery_${dateParam}`);
            } else {
              effectiveOpenid = parsedCache.openid;
              console.log('[DailyGallery] Using cached openid from localStorage for matching password');
            }
          }
        }
      } catch (e) {
        console.error('[DailyGallery] Failed to read cached openid:', e);
      }
    }

    // 如果 URL 中带有 openid，将其持久化到浏览器，便于下次自动使用
    if (openidParam) {
      try {
        localStorage.setItem('daily_gallery_openid', openidParam);
        console.log('[DailyGallery] Saved openid from URL to localStorage');
      } catch (e) {
        console.error('[DailyGallery] Failed to save openid:', e);
      }
    }

    lastVerifyTimeRef.current = Date.now();
    setVerifying(true);
    try {
      const { data, error } = await api.supabase.functions.invoke('daily-gallery-verify', {
        body: {
          postDate: dateParam,
          password: passwordToVerify,
          openid: isWechat ? effectiveOpenid : effectiveOpenid,
          browserId: browserId,
          userId: user?.id
        }
      });

      const msgs = dgConfig.notification_messages || {};
      if (error) {
        let message = '网络或系统异常，请稍后重试';
        try {
          const errorText = typeof error?.context?.text === 'function' ? await error.context.text() : error?.message;
          // 处理 Lock broken 错误，将其转换为用户友好的提示
          if (errorText?.includes('Lock broken by another request')) {
             message = msgs.concurrent_request || '并发请求冲突，请 1 秒后重试';
             toast.error(message);
             return;
          }
          
          const errJson = JSON.parse(errorText || '{}');
          message = errJson.message || message;
          
          if (errJson.errorCode === 'BROWSER_LOCKED') {
            setShowResetOption(true);
            toast.error(msgs.browser_locked_title || '访问受限：浏览器已锁定', {
              description: errJson.message || (msgs.browser_locked_desc || '该密码已在其他浏览器中使用，专属密码仅支持首个打开的浏览器。'),
              duration: 5000
            });
            return;
          }

          if (errJson.errorCode === 'WECHAT_EXCLUSIVE_PASSWORD') {
            toast.error(msgs.wechat_exclusive_title || '访问受限：需专属链接', {
              description: errJson.message || (msgs.wechat_exclusive_desc || '该内容为专属访问，请通过公众号发送的专属链接打开。'),
              duration: 6000
            });
            return;
          }

          if (errJson.errorCode === 'DATE_MISMATCH') {
            toast.error(msgs.date_mismatch_title || '访问受限：日期不匹配', {
              description: errJson.message || (msgs.date_mismatch_desc || '该密码不适用于当前日期的图集，请获取今日正确密码。'),
              duration: 5000
            });
            return;
          }

          if (errJson.errorCode === 'PASSWORD_EXPIRED') {
            toast.error(msgs.password_expired_title || '访问受限：凭据已过期', {
              description: errJson.message || (msgs.password_expired_desc || '访问凭据已过期，请重新向公众号获取。'),
              duration: 5000
            });
            return;
          }
        } catch (e) {
          console.error('Parse error text failed:', e);
          if (error.message?.includes('Lock broken')) {
            message = msgs.processing_request || '系统正在处理您的上一个请求，请稍后。';
          } else if (error.message?.includes('non-2xx')) {
            message = msgs.non_2xx_error || '密码验证失败，请确认密码是否正确';
          } else {
            message = error.message || message;
          }
        }
        
        toast.error(`${msgs.invalid_password_title || '验证失败'}: ${message}`);
        return;
      }

      const result = data;
      
      // 后端返回 ok 或 success 为 true 均视为成功
      if (result.status === 'ok' || result.success) {
        if (!isVerified) {
          const alreadyToast = sessionStorage.getItem(`daily_gallery_verified_${dateParam}`);
          if (!alreadyToast) {
            if (passwordToVerify === 'BYPASS_MP_UNLOCK') {
              toast.success(msgs.welcome_unlocked || '欢迎回来，今日内容已解锁', { duration: 2000 });
            } else {
              toast.success(msgs.welcome_verified || '验证成功！', { duration: 500 });
            }
          }
        }
        
        setIsVerified(true);
        const images = result.data?.images || [];
        setImages(images);
        console.log('[DailyGallery] 验证通过，已解锁图集内容', { imageCount: images.length });
        
        setPostInfo({
          postId: result.data?.postId,
          expiresAt: result.data?.expiresAt
        });

        localStorage.setItem(`daily_gallery_${dateParam}`, JSON.stringify({
          password: passwordToVerify,
          expiresAt: result.data?.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          openid: effectiveOpenid,
          timestamp: Date.now(),
          images
        }));

        // 将 openid 持久化到浏览器全局缓存，跨日期复用
        if (effectiveOpenid) {
          try {
            localStorage.setItem('daily_gallery_openid', effectiveOpenid);
          } catch (e) {
            console.error('[DailyGallery] Failed to save global openid:', e);
          }
        }
        
        sessionStorage.setItem(`daily_gallery_verified_${dateParam}`, 'true');

        await logAccess(result.data?.postId, passwordToVerify, result.data?.passwordType);
        
        /* 
        // 自动创建逻辑已取消
        if (result.is_new_user && result.user_info) {
          setNewUserInfo(result.user_info);
          setNewPassword('');
          setConfirmPassword('');
          setShowChangePasswordDialog(true);
          toast.success('游客账户已创建成功！默认密码为 123456，建议您立即修改密码', { duration: 5000 });
        }
        */
        
        // 验证成功后，刷新已读记录
        if (typeof fetchReadHistory === 'function') fetchReadHistory();
        if (typeof fetchSeenMediaIds === 'function') fetchSeenMediaIds();
        return;
      }
      
      if (!result.success) {
        console.warn('[DailyGallery] 验证未通过:', result.message, { errorCode: result.errorCode });
        // 记录失败的密码和时间，避免频繁自动重试导致 UI 震荡
        lastFailedPasswordRef.current = passwordToVerify;
        lastFailedTimeRef.current = Date.now();

        if (passwordToVerify === 'BYPASS_MP_UNLOCK') {
          console.log('[DailyGallery] Silent MP unlock check returned success:false');
          return;
        }

        const pageMsgs = dgConfig.notification_messages || {};
        if (result.errorCode === 'BROWSER_LOCKED') {
          setShowResetOption(true);
          toast.error(pageMsgs.browser_locked_title || '当前密码已被锁定在其他浏览器', {
            description: pageMsgs.browser_locked_desc || '请在原浏览器打开，或联系管理员重置。'
          });
        } else if (result.errorCode === 'SECURITY_ALERT') {
          toast.error('身份验证异常', {
            description: '检测到 OpenID 与当前登录账户不匹配，请勿修改 URL 参数或尝试重新登录。',
            duration: 5000
          });
        } else if (result.isExpired || result.errorCode === 'PASSWORD_USED' || result.message?.includes('已使用') || result.message?.includes('已失效')) {
          toast.error(result.message || (pageMsgs.password_expired_desc || '密码已过期或已使用，请重新获取'));
          // 清除失效的密码和小程序码状态
          setPassword('');
          setMpQrUrl(null);
          setIsMpUnlocked(false);
          setManualInput(false);
          localStorage.removeItem(`daily_gallery_${dateParam}`);
          // 如果启用了小程序广告，自动重新生成小程序码
          if (dgConfig.enable_miniprogram_ad) {
            setTimeout(() => {
              handleGenerateMpQr();
            }, 500);
          }
        } else if (result.errorCode === 'OPENID_NOT_FOUND') {
          toast.error(result.message || '该链接与公众号发送链接不符', {
            description: '请通过官方公众号获取专属访问链接'
          });
          // 清除 URL 中的参数以防止循环报错
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('openid');
          newParams.delete('p');
          newParams.delete('password');
          navigate(`/daily-gallery?${newParams.toString()}`, { replace: true });
        } else {
          toast.error(result.message || (pageMsgs.invalid_password_desc || '密码错误'));
        }
        return;
      }
    } catch (error: any) {
      console.error('Verify error:', error);
      const catchMsgs = dgConfig.notification_messages || {};
      toast.error(`${catchMsgs.invalid_password_title || '验证失败'}: ${error.message}`);
    } finally {
      setVerifying(false);
    }
  }, [password, dgConfig.enable_password, dgConfig.restrict_to_wechat, dateParam, isWechat, openidParam, browserId, isVerified, logAccess, user]);

  const handleSyncToFavorites = async () => {
    if (!user) {
      toast.error('请先登录后收藏');
      openLoginDialog();
      return;
    }
    if (!images || images.length === 0) return;
    
    setIsSyncing(true);
    try {
      const mediaIds = images.map(img => img.id);
      const { error } = await api.addBatchToFavorites(mediaIds);
      if (error) throw error;
      
      // 分发彩蛋收藏增加事件
      import('@/lib/utils').then(({ dispatchEasterEggFavoriteAdded }) => {
        dispatchEasterEggFavoriteAdded();
      });

      toast.success('已将今日图集同步至我的收藏');
    } catch (e: any) {
      toast.error('同步失败: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerateToken = async () => {
    if (!images || images.length === 0) return;
    
    setIsGeneratingToken(true);
    try {
      const mediaIds = images.map(img => img.id);
      const { data, error } = await api.generateCollectionToken(mediaIds);
      if (error) throw error;
      
      const token = data.token;
      await navigator.clipboard.writeText(token);
      toast.success('收藏口令已生成并复制', {
        description: `口令：${token}，有效期 7 天。`,
        duration: 5000
      });
    } catch (e: any) {
      toast.error('生成口令失败: ' + e.message);
    } finally {
      setIsGeneratingToken(false);
    }
  };


  // 修改默认密码：先用默认密码登录，再修改密码
  const handleChangePassword = async () => {
    if (!newUserInfo?.email) return;
    if (!newPassword || newPassword.length < 6) {
      toast.error('新密码至少6位字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    
    setChangePasswordLoading(true);
    try {
      // 如果当前已有其他用户登录，先退出
      if (user && user.id !== newUserInfo.user_id) {
        await supabase.auth.signOut();
      }
      
      // 用默认密码登录新账户
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: newUserInfo.email,
        password: newUserInfo.default_password || '123456'
      });
      
      if (signInError) throw new Error('登录失败：' + signInError.message);
      
      // 登录成功后修改密码
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) throw new Error('修改密码失败：' + updateError.message);
      
      toast.success('密码修改成功！已自动为您登录');
      setShowChangePasswordDialog(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || '密码修改失败');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const isFetchingMpUnlock = useRef(false);
  const fetchMpUnlockStatus = useCallback(async () => {
    // 如果已经验证通过了，清理轮询并停止请求
    if (isVerifiedRef.current) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // 如果没有显示小程序码（即用户还没点击扫码解锁），或者不是正在轮询中，则不执行状态检查
    // 这避免了页面聚焦或可见性变化时产生不必要的网络请求
    if (!mpQrUrl && !pollIntervalRef.current) {
      return;
    }

    if (isFetchingMpUnlock.current) return;

    try {
      isFetchingMpUnlock.current = true;
      
      // 各个渠道各自独立：小程序解锁状态检查仅使用当前浏览器标识或当前登录用户 ID，
      // 不受 URL 中 openid 参数（通常代表公众号来源或分享人身份）的影响。
      const identifierForCheck = browserId;

      const result = await api.checkAdUnlockStatus(dateParam, 'daily_gallery', identifierForCheck, user?.id);
      
      const isActuallyUnlocked = result.status === 'unlocked' || result.unlocked;
      
      // 核心逻辑：如果是刷新操作，且检测到有效的解锁记录
      if (ignoreOldStatusRef.current) {
        if (isActuallyUnlocked) {
          // 如果是已解锁记录，只要在 2 小时内，我们就接受它（实现 2 小时免密访问）
          const unlockTime = new Date(result.unlocked_at || result.created_at).getTime();
          if (Date.now() - unlockTime <= 2 * 60 * 60 * 1000) {
            console.log('[DailyGallery] Found valid recent unlock record (2h session), stopping ignore flag');
            ignoreOldStatusRef.current = false;
          } else {
             console.log('[DailyGallery] Ignoring old expired unlock record:', result.unlocked_at);
             return;
          }
        } else if (result.status === 'watching' || result.status === 'started' || result.status === 'scanned') {
           // 对于正在观看状态，只接受本次扫码产生的记录
           const createTime = new Date(result.created_at).getTime();
           
           // 如果还没有生成小程序码，或者记录太旧，则忽略
           if (mpQrGeneratedAtRef.current === 0 || createTime < mpQrGeneratedAtRef.current - 5000) {
              return;
           }
           ignoreOldStatusRef.current = false;
        } else {
           return;
        }
      }
      
      if (isActuallyUnlocked) {
        console.log('[DailyGallery] Ad unlocked! Mode:', dgConfig.ad_unlock_mode, 'Password:', result.password);
        // 直接解锁模式：自动验证
        if (dgConfig.ad_unlock_mode !== 'password') {
          setIsMpUnlocked(true);
          
          // 容错处理：如果上一次自动验证失败（5s内），不再自动触发
          const isRecentlyFailed = lastFailedPasswordRef.current === 'BYPASS_MP_UNLOCK' && (Date.now() - lastFailedTimeRef.current < 5000);
          
          // 如果 URL 中带有密码参数，优先由密码验证逻辑处理，但在小程序解锁成功时仍允许自动触发 bypass
          const urlPwd = searchParams.get('p') || searchParams.get('password');

          if (!isVerifiedRef.current && !verifyingRef.current && !isRecentlyFailed) {
            console.log('[DailyGallery] Found existing unlock record, auto-verifying...');
            handleVerify('BYPASS_MP_UNLOCK');
          }
        } else if (result.password) {
          // 密码模式：显示密码
          setIsMpUnlocked(true);
          setMpQrUrl('PASSWORD_READY'); // 特殊标记，表示密码已生成
          console.log('[DailyGallery] Ad finished, password received:', result.password);

          // 优化：只要不是用户已经输入了有效的其他 6 位密码，就自动填充
          const currentPassword = passwordRef.current || '';
          const shouldAutoFill = !manualInputRef.current || currentPassword.length < 6 || currentPassword === result.password;

          if (shouldAutoFill) {
            setPassword(result.password);
            updateManualInput(false); // 填充后重置为非手动模式
            
            // 2 小时免密体验增强：如果检测到有效的解锁密码，且当前尚未验证通过，则自动调用验证
            const isRecentlyFailed = lastFailedPasswordRef.current === result.password && (Date.now() - lastFailedTimeRef.current < 5000);
            
            if (!isVerifiedRef.current && !verifyingRef.current && !isRecentlyFailed) {
              console.log('[DailyGallery] Auto-verifying with new password...');
              handleVerify(result.password);
            }
          }
        } else if (dgConfig.ad_unlock_mode === 'password') {
           // 兜底：如果状态是已解锁但没有返回密码（可能接口没传），尝试使用通用的 BYPASS_MP_UNLOCK
           console.warn('[DailyGallery] Ad status is unlocked but no password returned');
           setIsMpUnlocked(true);
           setMpQrUrl('PASSWORD_READY');
           
           if (!isVerifiedRef.current && !verifyingRef.current) {
              console.log('[DailyGallery] Using bypass verify as fallback for missing password...');
              handleVerify('BYPASS_MP_UNLOCK');
           }
        }
      } else if (result.status === 'watching' || result.status === 'started' || result.status === 'scanned') {
        // 用户已扫码，正在观看广告
        console.log('[DailyGallery] User is watching ad...');
        setIsMpUnlocked(false);
        setMpQrUrl('WATCHING'); // 特殊标记，表示正在观看
      }
    } catch (e) {
      console.error('Check MP unlock error:', e);
    } finally {
      isFetchingMpUnlock.current = false;
    }
  }, [dateParam, openidParam, browserId, handleVerify, dgConfig.ad_unlock_mode, user, setPassword]);

  const fetchMpUnlockStatusRef = useRef(fetchMpUnlockStatus);
  useEffect(() => {
    fetchMpUnlockStatusRef.current = fetchMpUnlockStatus;
  }, [fetchMpUnlockStatus]);

  const lastMpQrAttemptRef = useRef<number>(0);
  const handleGenerateMpQr = useCallback(async () => {
    if (!dgConfig.enable_miniprogram_ad) return;

    const now = Date.now();
    if (now - lastMpQrAttemptRef.current < 3000) {
      toast.error('操作频繁，请3秒后再试');
      return;
    }
    lastMpQrAttemptRef.current = now;

    // 先重置
    resetMpState();
    setLoadingMpQr(true);

    try {
      const { data, error } = await api.generateMiniProgramQr(
        dateParam,
        'daily_gallery',
        undefined,
        window.location.origin,
        browserId,
        openidParam || undefined,
        user?.id
      );

      if (error) throw error;
      if (!data?.qr_data) throw new Error('未返回二维码');

      setMpQrUrl(data.qr_data);
      setMpQrScene(data.scene);
      setMpQrPage(data.page);
      mpQrGeneratedAtRef.current = Date.now();

      // 开启轮询
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        fetchMpUnlockStatusRef.current();
      }, 1500);

    } catch (e) {
      console.error(e);
      toast.error('生成小程序码失败');
    } finally {
      setLoadingMpQr(false);
    }
  }, [dgConfig.enable_miniprogram_ad, dateParam, browserId, openidParam, user?.id, resetMpState]);

  const fetchIncentiveStatus = useCallback(async () => {
    try {
      // 激励支持也是独立渠道，使用当前浏览器标识
      const result = await api.checkAdUnlockStatus(dateParam, 'incentive', browserId, user?.id);
      
      if (result.status === 'unlocked' && result.unlocked) {
        // 检查是否是本次生成的记录
        const logTime = new Date(result.created_at).getTime();
        if (logTime >= incentiveQrGeneratedAtRef.current - 5000) {
          if (incentivePollIntervalRef.current) {
            clearInterval(incentivePollIntervalRef.current);
            incentivePollIntervalRef.current = null;
          }
          setIncentiveStep('thanks');
          toast.success('感谢支持！');
        }
      }
    } catch (e) {
      console.error('Fetch incentive status error:', e);
    }
  }, [dateParam, user]);

  const handleGenerateIncentiveQr = useCallback(async () => {
    setLoadingIncentiveQr(true);
    try {
      const { data, error } = await api.generateMiniProgramQr(
        dateParam, 
        'incentive', 
        undefined, 
        window.location.origin,
        browserId,
        profile?.mp_openid || profile?.wechat_openid,
        profile?.id
      );
      
      if (error) {
        const msg = typeof error?.context?.text === 'function' ? await error.context.text() : error?.message;
        throw new Error(msg || error.message);
      }

      if (data?.qr_data) {
        setIncentiveQrUrl(data.qr_data);
        incentiveQrGeneratedAtRef.current = Date.now();
        
        if (incentivePollIntervalRef.current) {
          clearInterval(incentivePollIntervalRef.current);
        }
        incentivePollIntervalRef.current = setInterval(() => {
          fetchIncentiveStatus();
        }, 1500);
      }
    } catch (e: any) {
      console.error('Generate incentive qr error:', e);
      toast.error('加载激励码失败: ' + e.message);
    } finally {
      setLoadingIncentiveQr(false);
    }
  }, [dateParam, browserId, fetchIncentiveStatus]);

  useEffect(() => {
    if (incentiveDialogOpen && incentiveStep === 'qr') {
      handleGenerateIncentiveQr();
    }
    return () => {
      if (incentivePollIntervalRef.current) {
        clearInterval(incentivePollIntervalRef.current);
        incentivePollIntervalRef.current = null;
      }
    };
  }, [incentiveDialogOpen, incentiveStep, handleGenerateIncentiveQr]);

  const generateGuideQr = useCallback(async () => {
    setLoadingGuideQr(true);
    try {
      // 这里的小程序码是指向每日图集的路径
      // 这里的 page 应当是在小程序中的每日图集详情页路径
      const { data, error } = await api.generateMiniProgramQr(
        dateParam,
        'daily_gallery',
        undefined,
        window.location.origin,
        browserId
      );
      if (data?.qr_data) {
        setGuideQrUrl(data.qr_data);
      }
    } catch (e) {
      console.error('Generate guide qr error:', e);
    } finally {
      setLoadingGuideQr(false);
    }
  }, [dateParam, browserId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      // 只有在已启用小程序广告解锁，且用户尚未验证，且当前正在查看小程序码状态（有 mpQrUrl）时，才在页面可见时触发立即检查
      if (document.visibilityState === 'visible' && !isVerifiedRef.current && dgConfig.enable_miniprogram_ad && mpQrUrl) {
        console.log('[DailyGallery] Page became visible, checking unlock status immediately...');
        fetchMpUnlockStatusRef.current();
      }
    };

    const handleFocus = () => {
      // 同样增加 mpQrUrl 的判断，避免无谓的请求
      if (!isVerifiedRef.current && dgConfig.enable_miniprogram_ad && mpQrUrl) {
        fetchMpUnlockStatusRef.current();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [dgConfig.enable_miniprogram_ad, mpQrUrl]);

  // 获取已读记录
  const isFetchingReadHistory = useRef(false);
  const fetchReadHistory = useCallback(async () => {
    if (isFetchingReadHistory.current) return;
    try {
      isFetchingReadHistory.current = true;
      
      const localOpenid = localStorage.getItem('daily_gallery_openid');
      const identifierForHistory = (openidParam && openidParam === localOpenid) ? openidParam : (localOpenid || null);

      const { data, error } = await api.getDailyGalleryUserReadHistory({
        user_id: user?.id,
        openid: identifierForHistory,
        browser_fingerprint: browserId
      });
      
      if (!error && data) {
        setReadDates(data.map((h: any) => h.publish_date));
        setIsDatesLoaded(true);
      }
    } catch (e) {
      console.error('Fetch read history error:', e);
    } finally {
      isFetchingReadHistory.current = false;
    }
  }, [openidParam, user]);

  const fetchSeenMediaIds = useCallback(async () => {
    try {
      const { data } = await api.getSeenMediaIds(user?.id, browserId);
      if (data) {
        setSeenMediaIds(data);
      }
    } catch (e) {
      console.error('Fetch seen media ids error:', e);
    }
  }, [user, browserId]);

  useEffect(() => {
    fetchReadHistory();
    fetchSeenMediaIds();
  }, [fetchReadHistory, fetchSeenMediaIds]);


  useEffect(() => {
    const shouldGen =
      dgConfig.enable_miniprogram_ad &&
      !mpQrUrl &&
      !loadingMpQr &&
      !isVerified &&
      !isMpUnlocked &&
      isDatesLoaded &&
      dgConfig.enable_miniprogram_ad === true; // 冗余检查确保类型正确

    if (shouldGen) {
      console.log('[DailyGallery] Conditions met, generating MP QR...');
      handleGenerateMpQr();
    }
  }, [
    dgConfig.enable_miniprogram_ad,
    mpQrUrl,
    loadingMpQr,
    isVerified,
    isMpUnlocked,
    isDatesLoaded,
    handleGenerateMpQr,
    dateParam
  ]);

  const fetchAnnouncements = async () => {
    try {
      const { data } = await api.getActiveAnnouncements();
      if (data && data.length > 0) {
        setAnnouncements(data);
        const modalAnn = data.find((a: any) => a.type === 'modal');
        if (modalAnn) {
          const shown = localStorage.getItem(`ann_shown_${modalAnn.id}`);
          if (!shown) {
            // 如果是强制性的，尝试从数据库获取确认记录 (如果已登录或有 openid)
            if (modalAnn.is_mandatory && (user || profile || openidParam)) {
              const { data: acks } = await api.getAnnouncementAcknowledgments(user?.id || profile?.id, openidParam);
              const isAcked = acks?.some((ack: any) => ack.announcement_id === modalAnn.id);
              if (isAcked) {
                localStorage.setItem(`ann_shown_${modalAnn.id}`, 'true');
                return;
              }
            }
            setCurrentAnn(modalAnn);
            setShowAnnModal(true);
            // 只有非强制性的才在显示时立即设置 localStorage，强制性的由用户点击确认时设置
            if (!modalAnn.is_mandatory) {
              localStorage.setItem(`ann_shown_${modalAnn.id}`, 'true');
            }
          }
        }
      }
    } catch (e) {
      console.error('Fetch announcements error:', e);
    }
  };
  const fetchDgConfig = async () => {
    try {
      const [{ data, error }, { data: storageData }] = await Promise.all([
        api.getDailyGalleryConfig(),
        api.getStorageConfig()
      ]);
      if (error) {
        console.error('Fetch daily gallery config error:', error);
        return;
      }
      if (storageData) {
        setStorageConfig(storageData);
      }
      if (data && data.value) {
        const value = data.value;
        setDgConfig((prev: any) => {
          const mergedMsgs = { ...prev.notification_messages, ...(value.notification_messages || {}) };
          return { 
            ...prev, 
            ...value,
            // 确保布尔字段有正确的默认值
            enable_password: value.enable_password !== false,
            enable_wechat_password: value.enable_wechat_password !== false,
            enable_miniprogram_ad: value.enable_miniprogram_ad === true,
            restrict_to_wechat: value.restrict_to_wechat === true,
            enable_incentive: value.enable_incentive === true,
            ad_unlock_mode: value.ad_unlock_mode || 'direct',
            notification_messages: mergedMsgs
          };
        });
      }
      return data;
    } catch (e) {
      console.error('Fetch daily gallery config error:', e);
    }
  };

  const fetchPublishedDates = async () => {
    try {
      const { data } = await api.getDailyGalleryPublishedDates();
      if (data && data.length > 0) {
        setPublishedDates(data);
        // 如果 URL 中没有日期且当前加载的是今天，但今天没有发布，则自动跳转到最近的一个发布日期
        const urlDate = searchParams.get('date');
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        if (!urlDate && !data.includes(todayStr)) {
          const cleanDate = data[0].replace(/-/g, '');
          navigate(`/daily-gallery?date=${cleanDate}`, { replace: true });
        }
      }
    } catch (e) {
      console.error('Fetch daily gallery published dates error:', e);
    } finally {
      setIsDatesLoaded(true);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchDgConfig();
      await fetchPublishedDates();
      await fetchAnnouncements();
      
      try {
        const { data } = await api.getPublicMiniProgramConfig();
        setMpDebugConfig(data);
      } catch (e) {
        console.error('Fetch mp debug config error:', e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    // 获取所有激活的微信配置
    api.supabase.from('wechat_configs').select('*').eq('is_active', true).order('created_at', { ascending: true })
      .then(({ data }: { data: any }) => {
        if (data && data.length > 0) {
          setWechatConfigs(data || []);
          const cid = searchParams.get('config_id');
          if (cid && data.some((c: any) => c.id === cid)) {
            setSelectedConfigId(cid);
          } else {
            setSelectedConfigId(data[0].id);
          }
        }
      });
  }, []);

  useEffect(() => {
    if (selectedConfigId && wechatConfigs.length > 0) {
      setWechatConfig(wechatConfigs.find((c: any) => c.id === selectedConfigId));
    }
  }, [selectedConfigId, wechatConfigs]);

  useEffect(() => {
    if (wechatConfig) {
      if (wechatConfig.type === 'service_auth') {
        setLoadingQr(true);
        api.supabase.functions.invoke('wechat-qr', {
          body: { 
            config_id: wechatConfig.id, 
            scene_str: `gallery:${dateParam}` 
          }
        }).then(({ data, error }: { data: any; error: any }) => {
          if (!error && data?.success) {
            setQrUrl(data.qr_url);
          } else {
            setQrUrl(wechatConfig.qr_code_url || '');
          }
        }).finally(() => {
          setLoadingQr(false);
        });
      } else {
        setQrUrl(wechatConfig.qr_code_url || '');
      }
    }
  }, [wechatConfig, dateParam]);

  const handleCopyKeyword = () => {
    const keyword = dateParam.replace(/-/g, '').slice(4); // 0320
    navigator.clipboard.writeText(keyword);
    toast.success(`关键词 ${keyword} 已复制`);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCalendarDate(date);
      const cleanDate = format(date, 'yyyyMMdd');
      navigate(`/daily-gallery?date=${cleanDate}`);
      setShowDatePicker(false);
    }
  };

  useEffect(() => {
    // 全局微信禁止访问拦截
    if (config?.wechat_forbidden && isWechat) {
      setShowWechatGuide(true);
      if (!guideQrUrl && !loadingGuideQr) {
        generateGuideQr();
      }
    } else {
      setShowWechatGuide(false);
    }
  }, [config?.wechat_forbidden, isWechat, guideQrUrl, loadingGuideQr, generateGuideQr]);

  useEffect(() => {
    setIsVerified(false);
    setImages([]);
    setPostInfo(null);
    setPassword('');
    setShowResetOption(false);
    setCalendarDate(new Date(dateParam));
    setMpQrUrl(null);
    setIsMpUnlocked(false);
    
    // 监听日志收集
    const unsubscribe = logCollector.subscribe((logs: any[]) => {
      setCollectingLogs(logs.slice(0, 50));
    });
    
    // 清除旧的轮询定时器，确保切换日期后不会继续检查旧日期的解锁状态
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    return () => unsubscribe();
  }, [dateParam, openidParam]);

  useEffect(() => {
    // 微信环境检测
    const isInWechat = checkWechat();
    setIsWechat(isInWechat);

    // 只有在未验证通过时，才尝试自动检测
    if (!isVerified) {
      // 1. 检查 URL 中的密码参数（使用 ref 防止重复处理相同参数导致的循环）
      if (passwordFromUrl && passwordFromUrl !== lastProcessedPasswordRef.current) {
        lastProcessedPasswordRef.current = passwordFromUrl;
        if (!verifyingRef.current) {
          setPassword(passwordFromUrl);
          handleVerify(passwordFromUrl, openidParam);
        }
      }

      // 2. 检查本地缓存 (根据 expiresAt 判断有效期，默认 24 小时)
      const cached = localStorage.getItem(`daily_gallery_${dateParam}`);
      if (cached) {
        try {
          const { password: cachedPwd, expiresAt, timestamp, openid: cachedOpenid } = JSON.parse(cached);
          const isExpired = expiresAt ? new Date(expiresAt) < new Date() : (timestamp && Date.now() - timestamp > 24 * 60 * 60 * 1000);
          
          if (!isExpired && cachedPwd && !verifyingRef.current && !password) {
            console.log('[DailyGallery] Found valid local cache, auto-verifying with cached openid...');
            setPassword(cachedPwd);
            handleVerify(cachedPwd, cachedOpenid);
          } else if (isExpired) {
            console.log('[DailyGallery] Cache expired, removing...');
            localStorage.removeItem(`daily_gallery_${dateParam}`);
          }
        } catch (e) {
          console.error('[DailyGallery] Parse cache error:', e);
          localStorage.removeItem(`daily_gallery_${dateParam}`);
        }
      }

      // 3. 自动检查小程序解锁状态
      if (dgConfig.enable_miniprogram_ad) {
        console.log('[DailyGallery] Auto-checking MP unlock status...');
        fetchMpUnlockStatusRef.current();
      }
    }
  }, [dateParam, dgConfig.enable_miniprogram_ad, isVerified, isWechat, passwordFromUrl, openidParam, isDatesLoaded, password]);

  // 自动验证 (已禁用，要求用户手动点击确认以符合日期独立解锁逻辑)
  /*
  useEffect(() => {
    const isNumeric = /^\d+$/.test(password);
    if (isNumeric && password.length === 6 && !isVerified && !verifying && (!dgConfig.restrict_to_wechat || isWechat)) {
      handleVerify();
    }
  }, [password, isVerified, verifying, handleVerify, isWechat, dgConfig.restrict_to_wechat]);
  */


  const handleReset = async () => {
    if (!wechatConfig) {
      toast.error('未加载微信配置');
      return;
    }
    
    setLoadingResetQr(true);
    try {
      if (wechatConfig.type === 'service_auth') {
        const { data, error } = await api.supabase.functions.invoke('wechat-qr', {
          body: { 
            config_id: wechatConfig.id, 
            scene_str: `reset:${dateParam}` 
          }
        });
        if (!error && data?.success) {
          setResetQrUrl(data.qr_url);
          setResetDialogOpen(true);
        } else {
          toast.error('获取重置二维码失败');
        }
      } else {
        // 订阅号显示关键词
        setResetQrUrl('');
        setResetDialogOpen(true);
      }
    } catch (e: any) {
      toast.error('获取重置信息异常');
    } finally {
      setLoadingResetQr(false);
    }
  };


  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);



  // 自动播放逻辑
  useEffect(() => {
    let timer: any;
    let progressTimer: any;
    
    if (isAutoPlay && showWallpaperPreview) {
      const interval = 5000; // 5秒切换一次
      const step = 100; // 每100ms更新一次进度
      
      setAutoPlayProgress(0);
      
      timer = setInterval(() => {
        handleNext();
        setAutoPlayProgress(0);
      }, interval);
      
      progressTimer = setInterval(() => {
        setAutoPlayProgress(prev => Math.min(prev + (step / interval) * 100, 100));
      }, step);
    } else {
      setAutoPlayProgress(0);
    }
    
    return () => {
      if (timer) clearInterval(timer);
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [isAutoPlay, showWallpaperPreview, images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'book' || !isVerified) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') handlePrev();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') handleNext();
      if (e.key === 'Escape') setMode('gallery');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isVerified, currentIndex, images.length]);

  // 智能预加载：当在浏览模式下，自动预加载后续 2 张图片，提升切换流畅度

  // 记录已看图片
  useEffect(() => {
    if (mode === 'book' && images.length > 0 && isVerified && images[currentIndex]) {
      const currentMediaId = images[currentIndex].id;
      if (currentMediaId && !seenMediaIds.includes(currentMediaId)) {
        api.recordMediaView(currentMediaId, user?.id, browserId).then(() => {
           setSeenMediaIds(prev => [...prev, currentMediaId]);
        }).catch(console.error);
      }
    }
  }, [currentIndex, mode, images, isVerified, user, browserId, seenMediaIds]);


  // 自动跳转到第一个未读图片
  useEffect(() => {
    if (images.length > 0 && seenMediaIds.length > 0 && currentIndex === 0 && mode === 'gallery') {
       // 只有当当前在第一张且还没开始看时，尝试跳转
       const firstUnseenIndex = images.findIndex(img => !seenMediaIds.includes(img.id));
       if (firstUnseenIndex !== -1 && firstUnseenIndex !== 0) {
         console.log('[DailyGallery] Auto-resuming to first unseen image at index:', firstUnseenIndex);
         setCurrentIndex(firstUnseenIndex);
       }
    }
  }, [images, seenMediaIds, currentIndex, mode]);

  const filteredImages = useMemo(() => {
    if (!hideSeen) return images;
    // 如果是正在观看某张图片，不应该让它突然消失，所以如果是 book 模式，我们不实时过滤掉当前图片
    return images.filter(img => !seenMediaIds.includes(img.id));
  }, [images, seenMediaIds, hideSeen]);

  // 智能预加载：当在浏览模式下，自动预加载后续 2 张图片，提升切换流畅度
  useEffect(() => {
    if (mode === 'book' && images.length > 0 && isVerified) {
      // 预加载当前图片之后 2 张
      const preloadIndices = [currentIndex + 1, currentIndex + 2];
      const urlsToPreload = preloadIndices
        .filter(idx => idx < images.length)
        .map(idx => images[idx].url);
      
      if (urlsToPreload.length > 0) {
        // 使用缓存系统进行静默预取
        ImageCache.prefetch(urlsToPreload);
      }
    }
  }, [currentIndex, mode, images, isVerified]);

  const handleImageClick = (image: any, index: number) => {
    setCurrentIndex(index);
    setMode('book');
  };

  const handleDownload = async (imageUrl: string, title: string) => {
    if (!imageUrl) {
      toast.error('图片地址无效');
      return;
    }

    const t = toast.loading('正在准备下载...');
    try {
      const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const filename = `${title || 'daily-gallery'}.${extension}`;
      await downloadFile(imageUrl, filename);
      toast.dismiss(t);
      toast.success('下载已开始');
    } catch (error) {
      toast.dismiss(t);
      console.error('Download failed:', error);
      toast.error('下载失败，请尝试长按图片保存');
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = async () => {
    if (currentIndex < images.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
    } else {
      // 触发张数，概率和提示语从配置中读取
      const triggerCount = dgConfig.rb_trigger_view_count ?? 20;
      const triggerProb = dgConfig.rb_trigger_probability ?? 0;
      const triggerMsg = dgConfig.rb_trigger_message || '恭喜发现隐藏惊喜，正在为您加载随机美图...';
      
      console.log(`[DailyGallery] End reached. images=${images.length}, triggerCount=${triggerCount}, prob=${triggerProb}`);

      if (images.length >= triggerCount && triggerProb > 0) {
        // 检查今日是否已触发 (北京时间)
        const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        if (isTriggeringRef.current) return;
        isTriggeringRef.current = true;
        
        try {
          const usageId = openidParam || (user?.id ? `user:${user.id}` : 'guest_visitor');
          console.log(`[DailyGallery] Checking trigger for usageId=${usageId}`);

          let query = (supabase.from('daily_gallery_rb_triggers') as any).select('id').eq('trigger_date', today);
          if (user?.id) {
            query = query.eq('user_id', user.id);
          } else if (openidParam) {
            query = query.eq('openid', openidParam);
          } else {
            query = query.eq('openid', 'guest_visitor');
          }
          
          const { data: existingTrigger } = await query.maybeSingle();
          const rand = Math.floor(Math.random() * 100);
          console.log(`[DailyGallery] Rand check: rand=${rand}, prob=${triggerProb}`);

          if (rand < triggerProb) {
            // 记录触发 (如果是新触发)
            if (!existingTrigger) {
              await (supabase.from('daily_gallery_rb_triggers') as any).insert({
                user_id: user?.id || null,
                openid: openidParam || (user?.id ? null : 'guest_visitor'),
                trigger_date: today
              });
            }

            console.log('[DailyGallery] Conditions met. Showing toast...');
            toast.success(triggerMsg, {
              description: '由于您已看完全部图集，系统特别为您推荐一份随机礼物。',
              duration: 5000 
            });
            setTimeout(async () => {
              const nickname = profile?.username || '用户';
              
              // 获取配置
              let limit = 8;
              let usedCount = 0;
              let isInfinite = false;
              try {
                const { data: config } = await api.getRandomBeautyConfigs();
                if (config) {
                  const groupId = profile?.group_id || profile?.role || 'pt';
                  const rawLimit = config.group_limits?.[groupId] ?? config.default_limit ?? 8;
                  limit = rawLimit;
                  isInfinite = rawLimit === 0;
                  
                  const usageId = openidParam || (profile?.id ? `user:${profile.id}` : 'guest_visitor');
                  const { data: usage } = await api.getRandomBeautyUsage(usageId);
                  usedCount = usage?.count || 0;
                }
              } catch (e) {
                console.warn('Failed to fetch beauty info:', e);
              }

              const remainingCount = isInfinite ? '∞' : Math.max(0, limit - usedCount);
              const limitDisplay = isInfinite ? '无限' : limit;
              
              const confirmed = await confirmAsync(
                `${nickname} 您好，今日随机图片共有 ${limitDisplay} 张，目前您还剩 ${remainingCount} 张未看，是否前往？`,
                {
                  title: '随机礼物推荐',
                  confirmText: '立即前往',
                  cancelText: '留在本页'
                }
              );

              if (confirmed) {
                const currentUrl = new URL(window.location.href);
                const redirectOpenid = currentUrl.searchParams.get('openid') || currentUrl.searchParams.get('mp_openid');
                navigate(`/refresh-image${redirectOpenid ? `?openid=${redirectOpenid}` : ''}`);
              }
              isTriggeringRef.current = false;
            }, 1000);
          } else {
            isTriggeringRef.current = false;
          }
        } catch (e) {
          console.error('[DailyGallery] Trigger flow error:', e);
          isTriggeringRef.current = false;
        }
      }
    }
  };

  const currentImage = images[currentIndex];



  // 渲染主内容区域
  const renderMainContent = () => (
    <div className="flex-1 flex flex-col overflow-hidden select-none text-white">
      {/* 顶部公告栏 */}
      {announcements.filter(a => a.type === 'bar').length > 0 && (
        <div className="fixed top-0 inset-x-0 z-[100] bg-primary text-primary-foreground px-4 py-1.5 flex items-center justify-center gap-2 overflow-hidden animate-in fade-in slide-in-from-top duration-500">
          <Megaphone className="w-3.5 h-3.5 shrink-0 opacity-80" />
          <div className="text-[10px] md:text-xs font-black tracking-tight flex items-center gap-4 overflow-hidden relative w-full">
            <div className={cn(
              "whitespace-nowrap flex items-center gap-8",
              announcements.filter(a => a.type === 'bar').length > 1 && "animate-marquee"
            )}>
              {announcements.filter(a => a.type === 'bar').map((a, i) => (
                <span key={a.id} className="flex items-center gap-2">
                  {i > 0 && <span className="opacity-30">•</span>}
                  {a.content}
                </span>
              ))}
              {/* 重复一次以实现无缝滚动 */}
              {announcements.filter(a => a.type === 'bar').length > 1 && announcements.filter(a => a.type === 'bar').map((a) => (
                <span key={`${a.id}-clone`} className="flex items-center gap-2">
                  <span className="opacity-30">•</span>
                  {a.content}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 顶部工具栏 */}
      <header className={cn(
        "fixed inset-x-0 z-50 p-3 md:p-4 bg-black/40 backdrop-blur-2xl border-b border-white/5 flex items-center gap-3 transition-all duration-300",
        announcements.filter(a => a.type === 'bar').length > 0 ? "top-8" : "top-0"
      )}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full bg-white/5 backdrop-blur-md hover:bg-white/10 transition-colors w-9 h-9 shrink-0"
          onClick={() => navigate('/daily-gallery')}
        >
          <ChevronLeft className="w-5 h-5 text-white/80" />
        </Button>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="bg-black/40 backdrop-blur-md rounded-full p-1 flex items-center gap-1 border border-white/10 shadow-inner shrink-0">
            <Button 
              variant={mode === 'gallery' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setMode('gallery')}
              className={cn(
                "rounded-full h-8 px-2 md:px-3 text-[10px] font-black transition-all gap-1.5",
                mode === 'gallery' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">网格</span>
            </Button>
            <Button 
              variant={mode === 'book' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setMode('book')}
              className={cn(
                "rounded-full h-8 px-2 md:px-3 text-[10px] font-black transition-all gap-1.5",
                mode === 'book' ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
              )}
            >
              <LucideCalendar className="w-3.5 h-3.5" />
              <span className="hidden md:inline">阅读</span>
            </Button>
            <Button 
              variant={mode === 'ranking' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setMode('ranking')}
              className={cn(
                "rounded-full h-8 px-2 md:px-3 text-[10px] font-black transition-all gap-1.5",
                mode === 'ranking' ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
              )}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span className="hidden md:inline">榜单</span>
            </Button>
          </div>

          <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
            {announcements.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full bg-white/5 backdrop-blur-md h-9 w-9 text-amber-400 hover:bg-white/10 shrink-0"
                onClick={() => {
                  const modalAnn = announcements.find((a: any) => a.type === 'modal') || announcements[0];
                  setCurrentAnn(modalAnn);
                  setShowAnnModal(true);
                }}
                title="查看公告"
              >
                <Megaphone className="w-4.5 h-4.5" />
              </Button>
            )}

            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full bg-white/5 backdrop-blur-md h-9 w-9 text-blue-400 hover:bg-white/10 shrink-0"
              onClick={() => setShowFeedbackModal(true)}
              title="意见反馈"
            >
              <Send className="w-4.5 h-4.5" />
            </Button>

            {dgConfig.enable_user_upload && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full bg-white/5 backdrop-blur-md h-9 w-9 text-blue-400 hover:bg-white/10 shrink-0"
                onClick={() => setShowUploadModal(true)}
                title="分享图片"
              >
                <LucideUpload className="w-5 h-5" />
              </Button>
            )}
            {mode === 'book' && currentImage && (
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                <button 
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 text-white shadow-lg active:scale-95 transition-all hover:bg-white/20 backdrop-blur-md border border-white/10 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowWallpaperPreview(true);
                  }}
                  title="壁纸预览"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button 
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-blue-600/90 text-white shadow-lg active:scale-95 transition-all hover:bg-blue-500 backdrop-blur-md border border-white/10 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDownload(currentImage.url, currentImage.title || `image_${currentIndex + 1}`);
                  }}
                  title="下载图片"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full bg-white/5 backdrop-blur-md h-9 w-9 text-blue-400 hover:bg-white/10 shrink-0"
              onClick={() => setShowUploadModal(true)}
              title="每日图集上传"
            >
              <LucideUpload className="w-5 h-5" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "rounded-full bg-white/5 backdrop-blur-md h-9 w-9 transition-all shrink-0",
                showInfo ? "bg-primary text-primary-foreground" : "hover:bg-white/10"
              )}
              onClick={() => setShowInfo(!showInfo)}
              title="查看日历与图集信息"
            >
              <CalendarIcon className="w-4.5 h-4.5" />
            </Button>

          </div>
        </div>
      </header>

      <AnimatePresence>
        {showInfo && postInfo?.expiresAt && (
          <>
            {/* 点击背景关闭 */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfo(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md pointer-events-auto"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6 w-full max-w-sm pointer-events-auto ring-1 ring-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-tight">访问信息</h3>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Access Details</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10"
                    onClick={() => setShowInfo(false)}
                  >
                    <X className="w-5 h-5 text-white/60" />
                  </Button>
                </div>
                <div className="space-y-3">
                  {profile && (
                    <div className="p-4 bg-white/5 rounded-3xl flex items-center justify-between border border-white/5">
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">当前账户</span>
                      <div className="flex items-center gap-2">
                        {profile.auto_created && (
                          <Badge variant="secondary" className="bg-primary/20 text-primary text-[9px] px-1.5 py-0 border-none">游客账户</Badge>
                        )}
                        <span className="text-[11px] font-black">{profile.username}</span>
                      </div>
                    </div>
                  )}
                  {profile?.mp_openid && (
                    <div className="p-4 bg-white/5 rounded-3xl flex items-center justify-between border border-white/5">
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">微信绑定</span>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[11px] font-black">已绑定</span>
                        <span className="text-[8px] text-white/40 font-mono truncate max-w-[120px]">{profile.mp_openid}</span>
                      </div>
                    </div>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="p-4 bg-white/5 rounded-3xl flex items-center justify-between border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">当前日期</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black">{dateParam}</span>
                          <LucideCalendar className="w-4 h-4 text-primary" />
                        </div>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl bg-slate-900 border-white/10 shadow-2xl z-[70]" align="center">
                      <Calendar
                        mode="single"
                        selected={calendarDate}
                        onSelect={(date) => {
                          handleDateSelect(date);
                          setShowInfo(false);
                        }}
                        initialFocus
                        locale={zhCN}
                        className="rounded-2xl border-none"
                        modifiers={{
                          unpublished: (date) => isDatesLoaded && !publishedDates.includes(format(date, 'yyyy-MM-dd'))
                        }}
                        modifiersStyles={{
                          unpublished: { color: 'gray', opacity: 0.5 }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="p-4 bg-white/5 rounded-3xl flex items-center justify-between border border-white/5">
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">有效期至</span>
                    <span className="text-sm font-black text-primary">{formatBeijingTime(postInfo.expiresAt)}</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-3xl flex items-center justify-between border border-white/5">
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">图片数量</span>
                    <span className="text-sm font-black">{images.length} 张</span>
                  </div>
                </div>

                {/* 快捷操作 */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    className="h-12 rounded-2xl font-black text-xs gap-2 bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95"
                    onClick={handleSyncToFavorites}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Heart className="w-4 h-4 fill-current" />
                    )}
                    一键收藏
                  </Button>
                  <Button
                    className="h-12 rounded-2xl font-black text-xs gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-xl transition-all active:scale-95"
                    onClick={handleGenerateToken}
                    disabled={isGeneratingToken}
                  >
                    {isGeneratingToken ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4" />
                    )}
                    生成口令
                  </Button>
                </div>
                <div className="flex flex-col gap-3">
                  <Button 
                    className="w-full h-12 rounded-2xl font-black text-sm shadow-xl shadow-primary/20"
                    onClick={() => setShowInfo(false)}
                  >
                    我知道了
                  </Button>
                  <Button 
                    variant="ghost"
                    className="w-full h-10 rounded-2xl font-bold text-xs text-white/40 hover:text-white/60 hover:bg-white/5"
                    onClick={() => {
                      setShowInfo(false);
                      setShowFeedbackModal(true);
                    }}
                  >
                    <TriangleAlert className="w-4 h-4 mr-2 opacity-50" />
                    反馈故障 / 提交建议
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className={cn(
        "flex-1 relative overflow-hidden flex flex-col transition-all duration-300",
        announcements.filter(a => a.type === 'bar').length > 0 ? "pt-24" : "pt-16"
      )}>
        {mode === 'gallery' ? (
          <div className="flex-1 overflow-y-auto pt-6 pb-20 px-4 scrollbar-hide">
            {/* 浏览量统计 */}
            {(dgConfig?.show_view_stats !== false) && (
              <div className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-center gap-3 px-2">
                {(dgConfig?.show_current_viewers !== false) && (
                  <motion.div 
                    key={onlineCount}
                    initial={{ scale: 1.1, backgroundColor: 'rgba(var(--primary), 0.2)' }}
                    animate={{ scale: 1, backgroundColor: 'rgba(var(--primary), 0.1)' }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]"
                  >
                    <div className="relative">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <div className="absolute inset-0 w-2 h-2 rounded-full bg-primary animate-ping opacity-75" />
                    </div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-wider flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {onlineCount} 人正在一起看
                    </span>
                  </motion.div>
                )}
                {(dgConfig?.show_cumulative_views !== false) && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                    <Globe className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      累计 {cumulativeViews} 次查看
                    </span>
                  </div>
                )}
                {(dgConfig?.show_today_views !== false) && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      今日 {todayViews} 次查看
                    </span>
                  </div>
                )}
                {dgConfig.enable_incentive && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setIncentiveStep('qr');
                      setIncentiveDialogOpen(true);
                    }}
                    className="h-8 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 px-4 flex items-center gap-2"
                  >
                    <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{dgConfig.incentive_button_text || '激励作者'}</span>
                  </Button>
                )}
              </div>
            )}

            {seenMediaIds.length > 0 && (
              <div className="max-w-7xl mx-auto mb-4 flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors"
                  onClick={() => setHideSeen(!hideSeen)}
                >
                  {hideSeen ? "显示已看内容" : "隐藏已看内容"} ({seenMediaIds.length})
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto items-center justify-center">
              {filteredImages.map((image, index) => {
                const realIndex = images.findIndex(img => img.id === image.id);
                const showAd = (index + 1) % 6 === 0;
                return (
                  <React.Fragment key={image.id}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "aspect-square rounded-3xl overflow-hidden cursor-pointer bg-white/5 border border-white/10 group relative",
                        currentIndex === realIndex && "ring-2 ring-primary"
                      )}
                      onClick={() => handleImageClick(image, realIndex)}
                    >
                      <ProtectedMedia
                        src={image.url}
                        type="image"
                        alt={image.title || `图片 ${realIndex + 1}`}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        ruleKey="每日"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Badge className="bg-black/60 backdrop-blur-md border-none text-[10px] h-5 rounded-lg px-2">
                          {realIndex + 1}
                        </Badge>
                      </div>

                      {/* 快捷预览按钮 */}
                      <button 
                        className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60 border border-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentIndex(realIndex);
                          setShowWallpaperPreview(true);
                        }}
                        title="壁纸预览"
                      >
                        <Smartphone className="w-4 h-4" />
                      </button>

                      {currentIndex === realIndex && (
                        <div className="absolute inset-0 bg-primary/10 border-2 border-primary rounded-3xl pointer-events-none" />
                      )}
                    </motion.div>
                    {showAd && dailyAds.length > 0 && (
                      <motion.div
                        key={`ad-${index}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (index + 0.5) * 0.05 }}
                        className="aspect-square"
                      >
                        <NativeAd {...(dailyAds[index % dailyAds.length] || dailyAds[0])} className="rounded-3xl" />
                      </motion.div>
                    )}
                  </React.Fragment>
                );
              })}
              {/* 上传入口卡片 */}
              {dgConfig.enable_user_upload && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (filteredImages.length + 1) * 0.05 }}
                  className="aspect-square rounded-[2rem] overflow-hidden cursor-pointer bg-blue-500/5 border border-dashed border-blue-500/20 group relative flex flex-col items-center justify-center gap-3 p-4 transition-all hover:bg-blue-500/10"
                  onClick={() => setShowUploadModal(true)}
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-black text-blue-500">分享图片</p>
                    <p className="text-[10px] text-blue-500/40 font-bold uppercase tracking-widest">上传你的精选内容</p>
                  </div>
                </motion.div>
              )}
            </div>
            {hideSeen && images.length > 0 && filteredImages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-primary/40" />
                </div>
                <div className="space-y-1">
                  <p className="text-white/60 font-bold">已看完今日所有图片</p>
                  <Button variant="link" size="sm" onClick={() => setHideSeen(false)} className="text-primary text-xs">查看已看内容</Button>
                </div>
              </div>
            )}

            {/* 阅读排行榜 (图集模式) - 移除，改为独立榜单模式 */}

          </div>
        ) : mode === 'ranking' ? (
          <div className="flex-1 overflow-y-auto pt-8 pb-24 px-4 scrollbar-hide">
            <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ReadingRanking 
                ranking={readingRanking} 
                userRank={userRank} 
                activeType={rankingType}
                onTypeChange={setRankingType}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              {currentImage && (
                <motion.div
                  key={currentImage.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full h-full flex items-center justify-center p-4 md:p-8"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 50) handlePrev();
                    else if (info.offset.x < -50) handleNext();
                  }}
                >
                  <div className="relative max-w-full max-h-full flex flex-col items-center justify-center select-none">
                    {/* 图片顶部信息 - 已根据需求隐藏 */}
                    {false && (
                      <div className="mb-6 flex flex-col items-center gap-2 px-6 text-center">
                        <h4 className="text-base font-black text-white drop-shadow-md">
                          {currentImage.title || `图集图片 ${currentIndex + 1}`}
                        </h4>
                        {currentImage.description && (
                          <p className="text-xs text-white/60 line-clamp-2 leading-relaxed max-w-[280px]">
                            {currentImage.description}
                          </p>
                        )}
                        {currentImage.media_tags && currentImage.media_tags.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                            {currentImage.media_tags.map((mt: any) => (
                              <span 
                                key={mt.tag_id}
                                className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20"
                              >
                                #{mt.tags?.name || '标签'}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-2">
                          P {currentIndex + 1} / {images.length}
                        </p>
                      </div>
                    )}

                    <div className="relative flex items-center justify-center overflow-hidden rounded-2xl shadow-2xl bg-black/20 w-full">
                      <ProtectedMedia
                        src={currentImage.url}
                        type="image"
                        alt={currentImage.title || '图片'}
                        className="max-w-full max-h-[85vh] md:max-h-[80vh] w-auto h-auto object-contain pointer-events-auto"
                        ruleKey={itemRuleKeys.get(currentImage.id) || '每日'}
                      />
                      
                      {/* 查看原图与壁纸预览按钮 */}
                      {!showWallpaperPreview && (
                        <div className="absolute bottom-4 right-4 z-50 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                          {/* 壁纸预览按钮 */}
                          <div className="flex flex-col items-center gap-1">
                            <Button
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowWallpaperPreview(true);
                              }}
                              className="w-12 h-12 rounded-2xl shadow-xl bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border-2 border-white/20"
                            >
                              <Smartphone className="w-6 h-6" />
                            </Button>
                            <span className="text-[10px] text-white/60 font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] bg-black/40 px-1.5 py-0.5 rounded uppercase tracking-tighter">壁纸预览</span>
                          </div>

                          {/* 原图按钮 */}
                          {itemRuleKeys.get(currentImage.id) !== 'none' && (
                            <div className="flex flex-col items-center gap-1">
                              <Button
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const id = currentImage.id;
                                  setItemRuleKeys(prev => new Map(prev).set(id, 'none'));
                                }}
                                className="w-12 h-12 rounded-2xl shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 backdrop-blur-sm border-2 border-white/20"
                              >
                                <Scan className="w-6 h-6" />
                              </Button>
                              <span className="text-[10px] text-primary font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] bg-black/40 px-1.5 py-0.5 rounded uppercase tracking-tighter">原图 100%</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 左右侧点击导航区域 */}
            <div className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-w-resize pointer-events-auto" onClick={() => handlePrev()} />
            <div className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-e-resize pointer-events-auto" onClick={() => handleNext()} />
          </div>
        )}
      </main>

      {/* 底部控制器 (阅读模式) */}
      <AnimatePresence>
        {mode === 'book' && (
          <motion.footer 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-8 pb-12 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-6"
          >
            <div className="w-full max-w-md space-y-4">
              <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-white/40 uppercase">
                <span>START</span>
                <span className="text-primary">{currentIndex + 1} / {images.length}</span>
                <span>END</span>
              </div>
              <div className="relative h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="absolute inset-y-0 left-0 bg-primary"
                  animate={{ width: `${((currentIndex + 1) / images.length) * 100}%` }}
                />
              </div>
              {dgConfig.enable_incentive && (
                <div className="pt-2 flex justify-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setIncentiveStep('qr');
                      setIncentiveDialogOpen(true);
                    }}
                    className="h-8 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 px-4 flex items-center gap-2"
                  >
                    <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{dgConfig.incentive_button_text || '激励作者'}</span>
                  </Button>
                </div>
              )}
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className={cn(
      "min-h-screen w-full flex flex-col",
      isVerified ? "bg-black" : "bg-gradient-to-br from-background via-background to-muted/20"
    )}>
      {(!isVerified) ? (
        <DailyGalleryPassword 
          loading={loading}
          password={password}
          setPassword={setPassword}
          handleVerify={handleVerify}
          dgConfig={dgConfig}
          mpQrUrl={mpQrUrl}
          loadingMpQr={loadingMpQr}
          handleGenerateMpQr={handleGenerateMpQr}
          resetMpState={resetMpState}
          mpDebugConfig={mpDebugConfig}
          mpQrPage={mpQrPage}
          mpQrScene={mpQrScene}
          wechatConfig={wechatConfig}
          qrUrl={qrUrl}
          loadingQr={loadingQr}
          dateParam={dateParam}
          handleDateSelect={handleDateSelect}
          updateManualInput={updateManualInput}
          announcements={announcements}
          onShowAnn={() => {
            const modalAnn = announcements.find((a: any) => a.type === 'modal') || announcements[0];
            setCurrentAnn(modalAnn);
            setShowAnnModal(true);
          }}
        />
      ) : (isVerified && isWechat && config?.wechat_forbidden) ? (
        <DailyGalleryRestricted />
      ) : (showWechatGuide) ? (
        <DailyGalleryGuide 
          guideQrUrl={guideQrUrl}
          loadingGuideQr={loadingGuideQr}
        />
      ) : (
        renderMainContent()
      )}
      
      <DailyGalleryDialogs 
        showAnnModal={showAnnModal} setShowAnnModal={setShowAnnModal} currentAnn={currentAnn}
        resetDialogOpen={resetDialogOpen} setResetDialogOpen={setResetDialogOpen} wechatConfig={wechatConfig} resetQrUrl={resetQrUrl} dateParam={dateParam}
        incentiveDialogOpen={incentiveDialogOpen} setIncentiveDialogOpen={setIncentiveDialogOpen} incentiveStep={incentiveStep} setIncentiveStep={setIncentiveStep} loadingIncentiveQr={loadingIncentiveQr} incentiveQrUrl={incentiveQrUrl} handleGenerateIncentiveQr={handleGenerateIncentiveQr}
        showFeedbackModal={showFeedbackModal} setShowFeedbackModal={setShowFeedbackModal} feedbackContent={feedbackContent} setFeedbackContent={setFeedbackContent} collectingLogs={collectingLogs} isSubmittingFeedback={isSubmittingFeedback} handleFeedback={handleFeedback}
        showUploadModal={showUploadModal} setShowUploadModal={setShowUploadModal} isUploading={isUploading} uploadFiles={uploadFiles} setUploadFiles={setUploadFiles} handleUploadSubmission={handleUploadSubmission} dgConfig={dgConfig}
        nickname={nickname} setNickname={setNickname}
      />

      {showWallpaperPreview && currentImage && (
        <WallpaperPreview 
          imageUrl={currentImage.url}
          onClose={() => setShowWallpaperPreview(false)}
          onDownload={() => downloadFile(currentImage.url, `wallpaper_${currentImage.id}.jpg`)}
          onRefresh={() => handleNext()}
          isAutoPlay={isAutoPlay}
          onToggleAutoPlay={() => setIsAutoPlay(!isAutoPlay)}
          progress={autoPlayProgress}
        />
      )}

      {/* 新用户修改密码弹窗 */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-balance">
              <CheckCircle className="w-5 h-5 text-green-500" />
              账户已创建
            </DialogTitle>
            <DialogDescription className="text-pretty">
              您的账户已创建成功，默认用户名为 <span className="font-semibold text-foreground">{newUserInfo?.username}</span>，默认密码为 <span className="font-semibold text-foreground">{newUserInfo?.default_password || '123456'}</span>。
              为了账户安全，建议您立即修改默认密码。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-pwd">新密码</Label>
              <Input
                id="new-pwd"
                type="password"
                placeholder="请输入新密码（至少6位）"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pwd">确认密码</Label>
              <Input
                id="confirm-pwd"
                type="password"
                placeholder="请再次输入新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="flex-col gap-2">
            <Button 
              onClick={handleChangePassword} 
              disabled={changePasswordLoading}
              className="w-full"
            >
              {changePasswordLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  修改中...
                </>
              ) : (
                '立即修改密码'
              )}
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowChangePasswordDialog(false);
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="w-full"
            >
              稍后修改（保持默认密码）
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
