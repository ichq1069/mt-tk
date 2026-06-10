import React, { useState, useEffect } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { api } from '@/db/api';
import { useConfig } from '@/contexts/ConfigContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Loader2, Upload, Trash2, Image as ImageIcon, Plus, X,
  Calendar, Key, Eye, BarChart3, Settings, RefreshCw, RefreshCcw, Link, Smartphone,
  Clock, Users, TrendingUp, Download, Search, Filter, CheckCircle,
  FileSpreadsheet, Hash, PlayCircle, Zap, Copy, Bell, Info, TriangleAlert,
  MessageSquare, Heart, ChevronLeft, ChevronRight, Upload as LucideUpload, History as HistoryIcon
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { formatBeijingTime, cn, formatTimeAgo } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AnnouncementsSection } from './AnnouncementsSection';
import * as XLSX from 'xlsx';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';

export function DailyGallerySection() {
  const { refreshConfig } = useConfig();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pool');
  
  // 预览状态（新增分页）
  const [poolImages, setPoolImages] = useState<any[]>([]);
  const [usedImages, setUsedImages] = useState<any[]>([]);
  const [mediaTab, setMediaTab] = useState('available'); // 'available' (每日图集库) | 'pending' (待发布库) | 'used' (已发布库)
  const [poolPage, setPoolPage] = useState(0);
  const [poolTotal, setPoolTotal] = useState(0);
  const [usedPage, setUsedPage] = useState(0);
  const [usedTotal, setUsedTotal] = useState(0);
  const [poolSearch, setPoolSearch] = useState('');
  const [poolSelectedIds, setPoolSelectedIds] = useState<string[]>([]);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeAction, setSwipeAction] = useState<'select' | 'deselect' | null>(null);
  const poolLimit = 20;
  
  // 发布管理状态
  const [availableKeywords, setAvailableKeywords] = useState<string[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsPage, setPostsPage] = useState(0);
  const [postsTotal, setPostsTotal] = useState(0);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [manualPassword, setManualPassword] = useState('');
  const [publishDate, setPublishDate] = useState(new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [isManagingImages, setIsManagingImages] = useState(false);
  const [editingImagesPool, setEditingImagesPool] = useState<any[]>([]);
  const [editingPoolPage, setEditingPoolPage] = useState(0);
  const [editingPoolTotal, setEditingPoolTotal] = useState(0);
  const [editingPoolSearch, setEditingPoolSearch] = useState('');
  const [editingPostFullImages, setEditingPostFullImages] = useState<any[]>([]);
  const editingPoolLimit = 12;

  // 图片元数据编辑状态
  const [imageEditDialogOpen, setImageEditDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<any>(null);

  const [openidToUsername, setOpenidToUsername] = useState<Record<string, string>>({});

  const handleTriggerScheduler = async () => {
    setSchedulerLoading(true);
    try {
      const { data, error } = await api.triggerDailyGalleryScheduler();
      if (error) {
        const msg = typeof error?.context?.text === 'function' ? await error.context.text() : error?.message;
        throw new Error(msg || error.message);
      }
      if (data?.success) {
        toast.success(`调度器执行成功: ${data.message}`);
        fetchPosts();
      } else {
        toast.info(`调度器返回信息: ${data?.message || '未知'}`);
      }
    } catch (error: any) {
      toast.error(`触发调度器失败: ${error.message}`);
    } finally {
      setSchedulerLoading(false);
    }
  };
  
  // 日历筛选状态
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // 配置状态
  const [config, setConfig] = useState<any>({
    daily_count: 5,
    auto_publish: true,
    publish_time: '00:00',
    password_duration: 1,
    password_keyword: '今日图片',
    service_auth_keyword: '解锁',
    reset_limit: 1,
    enable_password: true,
    enable_wechat_password: true,
    restrict_to_wechat: false,
    enable_miniprogram_ad: false,
    enable_incentive: false,
    incentive_button_text: '激励作者',
    incentive_qr_url: '',
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
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  
  // 统计状态
  const [stats, setStats] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsStartDate, setStatsStartDate] = useState('');
  const [statsEndDate, setStatsEndDate] = useState('');

  // 访客详情状态
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(0);
  

  // 用户上传管理状态
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsPage, setSubmissionsPage] = useState(0);
  const [submissionsTotal, setSubmissionsTotal] = useState(0);
  const [submissionStatus, setSubmissionStatus] = useState('pending');
  const [submissionSelectedIds, setSubmissionSelectedIds] = useState<string[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const submissionsLimit = 15;
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [batchReviewDialogOpen, setBatchReviewDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [randomBeautyLogs, setRandomBeautyLogs] = useState<any[]>([]);
  const [loadingRandomBeauty, setLoadingRandomBeauty] = useState(false);
  const [randomBeautyPage, setRandomBeautyPage] = useState(0);
  const [totalRandomBeauty, setTotalRandomBeauty] = useState(0);

  const loadRandomBeautyLogs = async (page = 0) => {
    setLoadingRandomBeauty(true);
    try {
      const { data, total } = await api.getRandomBeautyAccessList(page, 20);
      setRandomBeautyLogs(data || []);
      setTotalRandomBeauty(total || 0);
    } catch (error) {
      console.error('Failed to load random beauty logs:', error);
    } finally {
      setLoadingRandomBeauty(false);
    }
  };

  const handleBatchReview = async (status: 'approved' | 'rejected') => {
    if (submissionSelectedIds.length === 0) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await api.supabase.auth.getUser();
      const updates: any = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id
      };
      if (status === 'rejected') {
        updates.rejection_reason = rejectionReason || '批量审核拒绝';
      }

      // 批量更新状态
      const { error } = await api.supabase
        .from('daily_gallery_submissions')
        .update(updates)
        .in('id', submissionSelectedIds);
      
      if (error) throw error;

      if (status === 'approved') {
        // 获取选中的记录详情以便插入媒体库
        const { data: approvedItems } = await api.supabase
          .from('daily_gallery_submissions')
          .select('*')
          .in('id', submissionSelectedIds);
        
        if (approvedItems && approvedItems.length > 0) {
          const mediaToInsert = [];
          for (const item of approvedItems) {
            let userId = item.user_id;
            if (!userId && item.openid) {
              const { data: ensuredId } = await api.supabase.rpc('ensure_profile_exists', {
                target_openid: item.openid,
                target_nickname: item.nickname
              });
              if (ensuredId) {
                userId = ensuredId;
                await api.supabase.from('daily_gallery_submissions').update({ user_id: userId }).eq('id', item.id);
              }
            }
            
            if (userId) {
              mediaToInsert.push({
                user_id: userId,
                url: item.image_url,
                type: 'image',
                status: 'approved',
                daily_gallery_status: 'available',
                description: `用户上传分享(批量) - ${item.id}`,
                metadata: { submission_id: item.id }
              });
            }
          }
          
          if (mediaToInsert.length > 0) {
            const { error: mediaError } = await api.supabase.from('media_items').insert(mediaToInsert);
            if (mediaError) throw mediaError;
          }
        }
        toast.success(`成功批量通过 ${submissionSelectedIds.length} 个作品`);
      } else {
        toast.success(`成功批量拒绝 ${submissionSelectedIds.length} 个作品`);
      }

      setBatchReviewDialogOpen(false);
      setSubmissionSelectedIds([]);
      setRejectionReason('');
      fetchSubmissions();
    } catch (error: any) {
      toast.error(`批量处理失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 随机/特权密码状态
  const [specialPwds, setSpecialPwds] = useState<any[]>([]);
  const [specialPwdsPage, setSpecialPwdsPage] = useState(0);
  const [specialPwdsTotal, setSpecialPwdsTotal] = useState(0);
  const [specialPwdsLoading, setSpecialPwdsLoading] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [specialPwdsFilters, setSpecialPwdsFilters] = useState({
    openid: '',
    source: 'all',
    status: 'all',
    type: 'all'
  });
  const [specialPwdDialogOpen, setSpecialPwdDialogOpen] = useState(false);
  const [taskLogs, setTaskLogs] = useState<any[]>([]);
  const [taskLogsLoading, setTaskLogsLoading] = useState(false);
  const [refillLogDialogOpen, setRefillLogDialogOpen] = useState(false);

  
  // 微信推送配置列表
  const [wechatConfigs, setWechatConfigs] = useState<any[]>([]);
  const [wechatTemplates, setWechatTemplates] = useState<any[]>([]);
  const [wechatLoading, setWechatLoading] = useState(false);
  const [wechatAccountConfigs, setWechatAccountConfigs] = useState<any[]>([]);

  const fetchWechatAccountPasswords = async () => {
    setWechatLoading(true);
    try {
      const { data, error } = await api.getWechatAccountPasswordConfigs();
      if (error) throw error;
      setWechatAccountConfigs(data || []);
    } catch (error: any) {
      toast.error(`获取公众号密码配置失败: ${error.message}`);
    } finally {
      setWechatLoading(false);
    }
  };


  const [newSpecialPwd, setNewSpecialPwd] = useState({
    password: '',
    target_date: '',
    password_type: 'one_time',
    is_one_time: true,
    expires_at: '',
    max_usages: 1,
    per_user_max_total: 0,
    per_user_max_daily: 0
  });

  const [logsTotal, setLogsTotal] = useState(0);
  const [dailyGalleryToken, setDailyGalleryToken] = useState('');
  const logsLimit = 20;
  const [archiving, setArchiving] = useState(false);

  const [userResetSearch, setUserResetSearch] = useState('');
  const [userResetPasswords, setUserResetPasswords] = useState<any[]>([]);
  const [userResetLoading, setUserResetLoading] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  const getFunctionUrl = (name: string, params: string = '') => {
    const domain = window.location.origin;
    const isLocal = domain.includes('localhost');
    const ref = isLocal ? 'local' : domain.split('.')[0].replace('https://', '').replace('http://', '');
    if (isLocal) return `http://localhost:54321/functions/v1/${name}${params}`;
    return `https://${ref}.supabase.co/functions/v1/${name}${params}`;
  };

  const handleSelectAll = () => {
    if (poolSelectedIds.length === poolImages.length && poolImages.length > 0) {
      setPoolSelectedIds([]);
    } else {
      setPoolSelectedIds(poolImages.map(img => img.id));
    }
  };

  const handleMouseUp = () => {
    setIsSwiping(false);
    setSwipeAction(null);
  };

  const fetchKeywords = async () => {
    try {
      const { data } = await api.getWechatReplies(undefined, 'keyword');
      const galleryKeywords = (data || [])
        .filter((r: any) => r.category === 'daily_gallery')
        .map((r: any) => r.keyword);
      setAvailableKeywords(Array.from(new Set(galleryKeywords)));
    } catch (error) {
      console.error('Failed to fetch keywords:', error);
    }
  };

  useEffect(() => {
    fetchKeywords();
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const limit = 20;

  useEffect(() => {
    fetchConfig(); // Always fetch config on mount
    if (activeTab === 'pool') {
      fetchAvailableImages();
    }
    else if (activeTab === 'posts') fetchPosts();
    else if (activeTab === 'stats') fetchStats();
    else if (activeTab === 'special_passwords') fetchSpecialPwds();
    else if (activeTab === 'task_logs') fetchTaskLogs();
    else if (activeTab === 'submissions') fetchSubmissions();
    else if (activeTab === 'wechat_passwords') fetchWechatAccountPasswords();
    else if (activeTab === 'config') {
      fetchConfig();
      fetchWechatConfigs();
    }
    else if (activeTab === 'random_beauty') {
      loadRandomBeautyLogs(randomBeautyPage);
    }
  }, [activeTab, mediaTab, postsPage, poolPage, usedPage, filterStartDate, filterEndDate, statsStartDate, statsEndDate, poolSearch, specialPwdsPage, specialPwdsFilters, submissionsPage, submissionStatus, randomBeautyPage]);

  const fetchWechatConfigs = async () => {
    setWechatLoading(true);
    try {
      const { data: configs } = await api.supabase.from('wechat_configs').select('id, name');
      setWechatConfigs(configs || []);
      
      const { data: templates } = await api.supabase
        .from('wechat_notification_templates')
        .select('id, title, pri_tmpl_id, config_id');
      setWechatTemplates(templates || []);
    } catch (error: any) {
      console.error('Fetch wechat configs error:', error);
    } finally {
      setWechatLoading(false);
    }
  };


  const fetchSubmissions = async () => {
    setSubmissionsLoading(true);
    try {
      const { data, total, error } = await api.getDailyGallerySubmissions(submissionsPage, submissionsLimit, submissionStatus);
      if (error) throw error;
      setSubmissions(data || []);
      setSubmissionsTotal(total || 0);
    } catch (error: any) {
      toast.error(`获取上传记录失败: ${error.message}`);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const fetchTaskLogs = async () => {
    setTaskLogsLoading(true);
    try {
      const { data, error } = await api.getScheduledTaskLogs('daily_gallery_auto_publish');
      if (error) throw error;
      setTaskLogs(data || []);
    } catch (error: any) {
      toast.error(`获取任务日志失败: ${error.message}`);
    } finally {
      setTaskLogsLoading(false);
    }
  };

  const getNextPublishTime = () => {
    if (!config.auto_publish || !config.publish_time) return '未启用自动发布';
    try {
      const [hour, minute] = config.publish_time.split(':').map(Number);
      const now = new Date();
      // 获取当前北京时间
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      });
      const parts = formatter.formatToParts(now);
      const bjDate: any = {};
      parts.forEach(p => bjDate[p.type] = p.value);
      
      let next = new Date(now);
      // 构造北京时间的“今天发布时刻”
      const todayPublish = new Date(now);
      // 这里逻辑比较绕，因为 Date 对象本身是基于 UTC 的。
      // 简单做法：构造一个北京时间的日期字符串再解析。
      const dateStr = `${bjDate.year}-${bjDate.month.padStart(2, '0')}-${bjDate.day.padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00+08:00`;
      let nextPublish = new Date(dateStr);
      
      if (nextPublish <= now) {
        nextPublish.setDate(nextPublish.getDate() + 1);
      }
      return formatBeijingTime(nextPublish);
    } catch (e) {
      return '计算失败';
    }
  };

  const fetchSpecialPwds = async () => {
    setSpecialPwdsLoading(true);
    try {
      const { data, total, error } = await api.getDailyGallerySpecialPasswords(specialPwdsPage, 30, specialPwdsFilters);
      if (error) throw error;
      setSpecialPwds(data);
      setSpecialPwdsTotal(total);

      // 提取所有唯一 openid (creator_id)
      const openids = [...new Set(data.map((p: any) => p.creator_id).filter((id: any) => !!id))] as string[];
      if (openids.length > 0) {
        const { data: profiles } = await api.supabase
          .from('profiles')
          .select('username, mp_openid, wechat_openid')
          .or(`mp_openid.in.(${openids.map(id => `"${id}"`).join(',')}),wechat_openid.in.(${openids.map(id => `"${id}"`).join(',')})`);
        
        if (profiles) {
          const mapping: Record<string, string> = {};
          profiles.forEach((p: any) => {
            if (p.mp_openid) mapping[p.mp_openid] = p.username;
            if (p.wechat_openid) mapping[p.wechat_openid] = p.username;
          });
          setOpenidToUsername(prev => ({ ...prev, ...mapping }));
        }
      }
    } catch (error: any) {
      toast.error(`获取随机密码失败: ${error.message}`);
    } finally {
      setSpecialPwdsLoading(false);
    }
  };

  const handleCreateSpecialPwd = async () => {
    if (!newSpecialPwd.password) {
      toast.error('请输入密码内容');
      return;
    }
    try {
      const payload = {
        ...newSpecialPwd,
        target_date: newSpecialPwd.target_date || null,
        expires_at: newSpecialPwd.expires_at || null,
        created_at: new Date().toISOString()
      };
      const { error } = await api.supabase.from('daily_gallery_special_passwords').insert(payload);
      if (error) throw error;
      toast.success('万能码已添加');
      setNewSpecialPwd({ 
        password: '', 
        target_date: '', 
        password_type: 'one_time', 
        is_one_time: true, 
        expires_at: '', 
        max_usages: 1, 
        per_user_max_total: 0, 
        per_user_max_daily: 0 
      });
      setSpecialPwdDialogOpen(false);
      fetchSpecialPwds();
    } catch (error: any) {
      toast.error(`添加失败: ${error.message}`);
    }
  };

  const handleReviewSubmission = async (status: 'approved' | 'rejected') => {
    if (!selectedSubmission) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await api.supabase.auth.getUser();
      const updates: any = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id
      };
      if (status === 'rejected') {
        updates.rejection_reason = rejectionReason;
      }

      const { error } = await api.updateDailyGallerySubmission(selectedSubmission.id, updates);
      if (error) throw error;

      if (status === 'approved') {
        // 如果审核通过，纳入媒体库（图集库）
        let userId = selectedSubmission.user_id;
        if (!userId && selectedSubmission.openid) {
          const { data: ensuredId } = await api.supabase.rpc('ensure_profile_exists', {
            target_openid: selectedSubmission.openid,
            target_nickname: selectedSubmission.nickname
          });
          if (ensuredId) {
            userId = ensuredId;
            // 同步更新下记录中的 user_id
            await api.supabase.from('daily_gallery_submissions').update({ user_id: userId }).eq('id', selectedSubmission.id);
          }
        }

        if (!userId) {
          throw new Error('无法确定上传者身份，且未绑定 OpenID，无法通过审核纳入媒体库。');
        }

        // 这里我们直接插入到 media_items，并标记为 daily_gallery_status = 'available'
        const { error: mediaError } = await api.supabase.from('media_items').insert({
          user_id: userId,
          url: selectedSubmission.image_url,
          type: 'image',
          status: 'approved',
          daily_gallery_status: 'available',
          description: `用户上传分享 - ${selectedSubmission.id}`,
          metadata: { submission_id: selectedSubmission.id }
        });
        if (mediaError) throw mediaError;
        toast.success('审核通过，已纳入图集库');
      } else {
        toast.success('已拒绝该上传');
      }

      setReviewDialogOpen(false);
      setSelectedSubmission(null);
      setRejectionReason('');
      fetchSubmissions();
    } catch (error: any) {
      toast.error(`处理失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSpecialPwd = async () => {
    try {
      const { error } = await api.createDailyGallerySpecialPassword({
        password: newSpecialPwd.password,
        target_date: newSpecialPwd.target_date || null,
        password_type: newSpecialPwd.password_type,
        is_one_time: newSpecialPwd.is_one_time,
        expires_at: newSpecialPwd.expires_at || null,
        max_usages: newSpecialPwd.is_one_time ? 1 : newSpecialPwd.max_usages,
        per_user_max_total: newSpecialPwd.per_user_max_total,
        per_user_max_daily: newSpecialPwd.per_user_max_daily
      });
      if (error) throw error;
      toast.success('随机密码已生成');
      setSpecialPwdDialogOpen(false);
      setNewSpecialPwd({
        password: '',
        target_date: '',
        password_type: 'one_time',
        is_one_time: true,
        expires_at: '',
        max_usages: 1,
        per_user_max_total: 0,
        per_user_max_daily: 0
      });
      fetchSpecialPwds();
    } catch (error: any) {
      toast.error(`生成失败: ${error.message}`);
    }
  };

  const handleDeleteSpecialPwd = async (id: string) => {
    const confirmed = await confirmAsync('确定删除此特权密码？', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { error } = await api.deleteDailyGallerySpecialPassword(id);
      if (error) throw error;
      toast.success('已删除');
      fetchSpecialPwds();
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewSpecialPwd({ ...newSpecialPwd, password: result });
  };
  const handleOpenSpecialPwdDialog = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewSpecialPwd({
      password: pwd,
      target_date: '',
      password_type: 'one_time',
      is_one_time: true,
      expires_at: '',
      max_usages: 1,
      per_user_max_total: 0,
      per_user_max_daily: 0
    });
    setSpecialPwdDialogOpen(true);
  };


  const handleExportSpecialPwds = () => {
    try {
      if (specialPwds.length === 0) {
        toast.error('暂无密码可导出');
        return;
      }
      
      const exportData = specialPwds.map(pwd => ({
        '密码': pwd.password,
        '生成来源': pwd.source === 'backend' ? '后台' : (pwd.source === 'wechat' ? '微信公众号' : '小程序'),
        '创建者ID': pwd.creator_id || '',
        '适用日期': pwd.target_date || '通用',
        '一次性': pwd.is_one_time ? '是' : '否',
        '最大次数': pwd.max_usages,
        '已用次数': pwd.used_count || 0,
        '状态': (pwd.is_used || (pwd.is_one_time && (pwd.used_count || 0) >= Math.max(pwd.max_usages || 0, 1))) ? '已刷完' : (pwd.expires_at && new Date(pwd.expires_at) < new Date() ? '已过期' : '有效'),
        '过期时间': pwd.expires_at ? formatBeijingTime(pwd.expires_at) : '永不过期',
        '创建时间': formatBeijingTime(pwd.created_at)
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // 设置列宽
      const wscols = [
        { wch: 15 }, // 密码
        { wch: 12 }, // 适用日期
        { wch: 10 }, // 一次性
        { wch: 10 }, // 状态
        { wch: 20 }, // 过期时间
        { wch: 20 }, // 创建时间
      ];
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "随机密码库");
      
      XLSX.writeFile(workbook, `daily_gallery_passwords_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('导出 Excel 成功');
    } catch (e) {
      console.error('Export Excel error:', e);
      toast.error('导出失败');
    }
  };

  const handleDownloadImportTemplate = () => {
    try {
      const templateData = [
        {
          "密码": "SAMPLE_PASSWORD_123",
          "适用日期": "2024-03-20",
          "一次性": "否",
          "过期时间": "2024-12-31 23:59:59"
        },
        {
          "密码": "UNIVERSAL_PWD_999",
          "适用日期": "通用",
          "一次性": "是",
          "过期时间": ""
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const wscols = [
        { wch: 25 }, // 密码
        { wch: 15 }, // 适用日期
        { wch: 10 }, // 一次性
        { wch: 25 }, // 过期时间
      ];
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "导入模板");
      XLSX.writeFile(workbook, `special_passwords_template.xlsx`);
      toast.success('模板下载成功');
    } catch (e) {
      console.error('Download template error:', e);
      toast.error('下载模板失败');
    }
  };


  const handleImportSpecialPwds = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const importedData = XLSX.utils.sheet_to_json(worksheet) as any[];
          
          if (importedData.length === 0) {
            toast.error('导入文件为空');
            return;
          }

          let successCount = 0;
          for (const item of importedData) {
            const password = item['密码'] || item['password'];
            if (!password) continue;
            
            // 简单处理日期格式
            let targetDate = item['适用日期'] || item['target_date'];
            if (targetDate === '通用' || targetDate === 'all') targetDate = null;

            const { error } = await api.createDailyGallerySpecialPassword({
              password: String(password),
              target_date: targetDate || null,
              is_one_time: (item['一次性'] === '是' || item['is_one_time'] === true),
              expires_at: item['过期时间'] || item['expires_at'] || null
            });
            if (!error) successCount++;
          }
          
          toast.success(`成功导入 ${successCount} 个密码`);
          fetchSpecialPwds();
        } catch (err) {
          console.error('Import Excel parse error:', err);
          toast.error('导入失败：解析 Excel 错误');
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (e) {
      console.error('Import Excel file error:', e);
      toast.error('导入失败');
    }
  };

  const handleSearchUserResets = async () => {
    if (!userResetSearch) {
      toast.error('请输入用户名或 OpenID');
      return;
    }
    setUserResetLoading(true);
    try {
      // 1. 先搜索 profile 看看能不能找到 openid
      const { data: profiles } = await api.supabase
        .from('profiles')
        .select('mp_openid, wechat_openid, username')
        .or(`username.ilike.%${userResetSearch}%,mp_openid.eq.${userResetSearch},wechat_openid.eq.${userResetSearch}`)
        .limit(5);

      let openids: string[] = [userResetSearch];
      if (profiles && profiles.length > 0) {
        profiles.forEach((p: any) => {
          if (p.mp_openid) openids.push(p.mp_openid);
          if (p.wechat_openid) openids.push(p.wechat_openid);
        });
      }
      
      openids = [...new Set(openids)];

      // 2. 搜索密码记录
      const { data, error } = await api.supabase
        .from('daily_gallery_special_passwords')
        .select('*')
        .in('creator_id', openids)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setUserResetPasswords(data || []);
      if (!data || data.length === 0) {
        toast.info('未找到该用户的密码记录');
      }
    } catch (error: any) {
      toast.error(`查询失败: ${error.message}`);
    } finally {
      setUserResetLoading(false);
    }
  };

  const handleClearUserResets = async (creatorId: string) => {
    const confirmed = await confirmAsync('确定要清空该用户的所有重置次数吗？清空后用户可按配置上限重新进行重置。', { variant: 'default' });
    if (!confirmed) return;
    
    try {
      const { error } = await api.clearDailyGalleryUserResets(creatorId);
      if (error) throw error;
      toast.success('已清空重置次数');
      // 刷新列表
      setUserResetPasswords(prev => prev.map(p => p.creator_id === creatorId ? { ...p, reset_count: 0 } : p));
    } catch (error: any) {
      toast.error(`清空失败: ${error.message}`);
    }
  };

  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);

  const fetchConfig = async () => {
    try {
      const [{ data }, { data: cats }, { data: tags }] = await Promise.all([
        api.getDailyGalleryConfig(),
        api.getCategories(),
        api.getTags()
      ]);
      if (data?.value) {
        const val = data.value;
        setDailyGalleryToken(val.trigger_token || '');
        // 合并默认通知配置，确保旧配置也能兼容
        const defaultMsgs = config.notification_messages;
        const mergedMsgs = { ...defaultMsgs, ...(val.notification_messages || {}) };
        setConfig({
          ...val,
          excluded_categories: Array.isArray(val.excluded_categories) ? val.excluded_categories : [],
          excluded_tags: Array.isArray(val.excluded_tags) ? val.excluded_tags : [],
          notification_messages: mergedMsgs
        });
      }
      setAllCategories(cats || []);
      setAllTags(tags || []);
    } catch (error: any) {
      toast.error(`获取配置失败: ${error.message}`);
    }
  };

  const fetchAvailableImages = async () => {
    setLoading(true);
    try {
      if (mediaTab === 'used') {
        const { data, total, error } = await api.getDailyGalleryUsedImages(poolLimit, usedPage * poolLimit, poolSearch, filterStartDate, filterEndDate);
        if (error) throw error;
        setPoolImages(Array.isArray(data) ? data : []);
        setUsedTotal(total || 0);
      } else {
        const status = mediaTab === 'available' ? 'unused' : 'pending';
        const { data, total, error } = await api.getDailyGalleryAvailableImages(poolLimit, poolPage * poolLimit, poolSearch, status);
        if (error) throw error;
        setPoolImages(Array.isArray(data) ? data : []);
        setPoolTotal(total || 0);
      }
    } catch (error: any) {
      toast.error(`获取素材失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPending = async (ids: string[], isPending: boolean) => {
    try {
      if (isPending) {
        // 获取当前待发布素材的数量
        const { total: currentPendingCount } = await api.getDailyGalleryAvailableImages(1, 0, '', 'pending');
        const limitCount = config.daily_count || 5;

        if (currentPendingCount + ids.length > limitCount) {
          toast.error(`待发布素材库数量限制为 ${limitCount} 张（由每日发布数量配置决定）。当前已有 ${currentPendingCount} 张，还可以添加 ${limitCount - currentPendingCount} 张。`);
          return;
        }
      }

      const { error } = await api.updateMediaDailyGalleryStatus(ids, isPending ? 'pending' : 'unused');
      if (error) throw error;
      toast.success(isPending ? '已加入待发布' : '已移回待使用');
      setPoolSelectedIds([]);
      fetchAvailableImages();
    } catch (error: any) {
      toast.error(`操作失败: ${error.message}`);
    }
  };

  const handleAutoRefill = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.autoRefillPendingMaterials();
      if (error) throw error;
      
      const res = data as any;
      if (res?.success) {
        toast.success(res.message || '已根据配置自动补充待发布素材库');
      } else {
        toast.error(res.message || '补充失败');
      }
      fetchAvailableImages();
    } catch (error: any) {
      toast.error(`补充失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsedImages = async () => {
    setLoading(true);
    try {
      const { data, total, error } = await api.getDailyGalleryUsedImages(poolLimit, usedPage * poolLimit, poolSearch, filterStartDate, filterEndDate);
      if (error) throw error;
      setUsedImages(Array.isArray(data) ? data : []);
      setUsedTotal(total || 0);
    } catch (error: any) {
      toast.error(`获取已用素材失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExcludeImage = async (mediaId: string) => {
    const confirmed = await confirmAsync('确定将此素材从每日图集媒体库中移除？', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { error } = await api.toggleExcludeFromDailyGallery(mediaId, true);
      if (error) throw error;
      toast.success('素材已移除');
      fetchAvailableImages();
    } catch (error: any) {
      toast.error(`移除失败: ${error.message}`);
    }
  };

  useEffect(() => {
    if (logsDialogOpen && selectedPostId) {
      fetchLogs();
    }
  }, [logsDialogOpen, selectedPostId, logsPage]);

  const fetchLogs = async () => {
    if (!selectedPostId) return;
    setLogsLoading(true);
    try {
      const { data, total } = await api.getDailyGalleryAccessLogs(selectedPostId, logsPage, logsLimit);
      setLogs(data || []);
      setLogsTotal(total || 0);
    } catch (error: any) {
      toast.error(`获取访问记录失败: ${error.message}`);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, total, error } = await api.getDailyGalleryPosts(postsPage, limit, filterStartDate || undefined, filterEndDate || undefined);
      if (error) throw error;
      setPosts(data);
      setPostsTotal(total);
    } catch (error: any) {
      toast.error(`获取发布记录失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const { data } = await api.getDailyGalleryStats(statsStartDate || undefined, statsEndDate || undefined);
      setStats(data);
    } catch (error: any) {
      toast.error(`获取统计失败: ${error.message}`);
    } finally {
      setStatsLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setLoading(true);
      const urlToken = config.trigger_token ? `?token=${config.trigger_token}` : '';
      const { data, error } = await api.supabase.functions.invoke(`daily-gallery-publish${urlToken}`, {
        method: 'POST',
        body: {
          postDate: publishDate,
          imageIds: selectedImages.length > 0 ? selectedImages : undefined,
          manualPassword: manualPassword || undefined
        }
      });
      
      if (error) {
        let errMsg = '发布失败';
        try {
          const errText = typeof error?.context?.text === 'function' ? await error.context.text() : error?.message;
          const errJson = JSON.parse(errText || '{}');
          errMsg = errJson.message || errMsg;
        } catch (e) {
          errMsg = error.message || errMsg;
        }
        throw new Error(errMsg);
      }
      
      const result = data;
      if (!result.success) throw new Error(result.message);
      
      toast.success(`发布成功！密码：${result.data.password}`);
      setPublishDialogOpen(false);
      setSelectedImages([]);
      setManualPassword('');
      
      // 成功发布后自动补充待发布库
      try {
        await api.autoRefillPendingMaterials();
      } catch (e) {
        console.error('Auto refill failed after publish:', e);
      }
      
      fetchPosts();
      fetchAvailableImages();
      fetchUsedImages();
    } catch (error: any) {
      toast.error(`发布失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    const confirmed = await confirmAsync('确定删除此发布记录？', { variant: 'destructive' });
    if (!confirmed) return;
    
    try {
      await api.deleteDailyGalleryPost(id);
      toast.success('删除成功');
      fetchPosts();
      fetchAvailableImages();
      fetchUsedImages();
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  const handleSaveConfig = async () => {
    try {
      let finalConfig = { ...config };
      
      // 处理随机关键词生成 (仅当模式为随机且当前没有今日关键词时自动补全)
      if (config.keyword_mode === 'random') {
        const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
        if (!config.daily_random_keyword || config.daily_random_keyword.date !== today) {
          const randomKeyword = Math.floor(100000 + Math.random() * 900000).toString();
          finalConfig.daily_random_keyword = {
            date: today,
            keyword: randomKeyword
          };
          setConfig(finalConfig);
        }
      }

      const { data, error } = await api.updateDailyGalleryConfig(finalConfig);
      if (error) throw error;
      
      // 更新本地状态并同步刷新全局配置
      if (data?.value) setConfig(data.value);
      
      await refreshConfig();
      toast.success('配置已保存并即时生效');
      setConfigDialogOpen(false);
    } catch (error: any) {
      toast.error(`保存失败: ${error.message}`);
    }
  };

  const handleUpdatePost = async () => {
    if (!editingPost) return;
    try {
      setLoading(true);
      const { error } = await api.updateDailyGalleryPost(editingPost.id, {
        password: editingPost.password,
        password_expires_at: editingPost.password_expires_at || null,
        is_published: editingPost.is_published,
        image_ids: editingPost.image_ids
      });
      if (error) throw error;
      toast.success('更新成功');
      setEditDialogOpen(false);
      fetchPosts();
    } catch (error: any) {
      toast.error(`更新失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 更新图片元数据
  const handleUpdateMediaItem = async () => {
    if (!editingImage) return;
    try {
      setLoading(true);
      const { error } = await api.supabase
        .from('media_items')
        .update({
          title: editingImage.title,
          description: editingImage.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingImage.id);
      if (error) throw error;
      toast.success('图片信息更新成功');
      setImageEditDialogOpen(false);
      // 刷新本地数据
      setEditingPostFullImages(prev => prev.map(img => img.id === editingImage.id ? { ...img, title: editingImage.title, description: editingImage.description } : img));
    } catch (error: any) {
      toast.error(`更新图片信息失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchEditingPoolImages = async () => {
    try {
      const { data, total, error } = await api.getDailyGalleryAvailableImages(editingPoolLimit, editingPoolPage * editingPoolLimit, editingPoolSearch, 'pending');
      setEditingImagesPool(data || []);
      setEditingPoolTotal(total || 0);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isManagingImages) {
      fetchEditingPoolImages();
    }
  }, [isManagingImages, editingPoolPage, editingPoolSearch]);

  const toggleImageForPost = (id: string) => {
    if (!editingPost) return;
    const currentIds = [...(editingPost.image_ids || [])];
    const index = currentIds.indexOf(id);
    if (index > -1) {
      currentIds.splice(index, 1);
    } else {
      currentIds.push(id);
    }
    setEditingPost({ ...editingPost, image_ids: currentIds });
  };

  const handleResetUserPasswords = async (postDate: string) => {
    const confirmed = await confirmAsync(`确定清除 ${postDate} 的所有用户专属密码吗？清除后用户再次获取时将生成新密码。`, { variant: 'destructive' });
    if (!confirmed) return;
    try {
      setLoading(true);
      const { error } = await api.clearAllDailyGalleryUserPasswords(postDate);
      if (error) throw error;
      toast.success('已清除所有用户专属密码');
    } catch (error: any) {
      toast.error(`清除失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunScheduler = async () => {
    try {
      setSchedulerLoading(true);
      const { data, error } = await api.supabase.functions.invoke('daily-gallery-scheduler');
      if (error) throw error;
      if (data.success) {
        toast.success(data.message);
        fetchPosts();
      } else {
        toast.info(data.message);
      }
    } catch (error: any) {
      toast.error(`调度失败: ${error.message}`);
    } finally {
      setSchedulerLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">每日图集管理</h2>
          <p className="text-muted-foreground mt-1">管理每日图集发布记录和访问统计 (素材来源于媒体库)</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleRunScheduler}
            disabled={schedulerLoading}
            className="rounded-xl gap-2 h-10 px-4 font-bold"
          >
            {schedulerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            自动发布检测
          </Button>
          <Button 
            onClick={() => {
              setSelectedImages(poolSelectedIds);
              setPublishDialogOpen(true);
            }}
            className="rounded-xl gap-2 h-10 px-4 font-bold"
          >
            <Calendar className="w-4 h-4" />
            立即发布
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto w-full rounded-2xl p-1 bg-muted/30">
          <TabsTrigger value="pool" className="rounded-xl font-bold gap-2 flex-1 min-w-[100px]">
            <ImageIcon className="w-4 h-4" />
            素材库管理
          </TabsTrigger>
          <TabsTrigger value="posts" className="rounded-xl font-bold gap-2 flex-1 min-w-[100px]">
            <Calendar className="w-4 h-4" />
            发布记录
          </TabsTrigger>
          <TabsTrigger value="special_passwords" className="rounded-xl font-bold gap-2 flex-1 min-w-[100px] text-xs md:text-sm">
            <Key className="w-4 h-4" />
            随机密码库
          </TabsTrigger>
          <TabsTrigger value="stats" className="rounded-xl font-bold gap-2 flex-1 min-w-[100px]">
            <BarChart3 className="w-4 h-4" />
            访问统计
          </TabsTrigger>
          <TabsTrigger value="resets" className="rounded-xl font-bold gap-2 flex-1 min-w-[100px]">
            <Users className="w-4 h-4" />
            重置管理
          </TabsTrigger>
          <TabsTrigger value="task_logs" className="rounded-xl font-bold gap-2 flex-1 min-w-[100px]">
            <Clock className="w-4 h-4" />
            定时任务
          </TabsTrigger>
          <TabsTrigger value="random_beauty" className="rounded-xl font-bold gap-2 flex-1 min-w-[100px]">
            <Heart className="w-4 h-4" />
            随机美图记录
          </TabsTrigger>
          <TabsTrigger value="announcements" className="rounded-xl font-bold gap-2 flex-1 min-w-[100px]">
            <Bell className="w-4 h-4" />
            公告管理
          </TabsTrigger>
          <TabsTrigger value="submissions" className="rounded-xl font-bold gap-2 flex-1 min-w-[100px]">
            <LucideUpload className="w-4 h-4" />
            用户分享
          </TabsTrigger>
          <TabsTrigger value="config" className="rounded-xl font-bold gap-2 flex-1 min-w-[100px]">
            <Settings className="w-4 h-4" />
            系统配置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="random_beauty" className="space-y-4 mt-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white/50 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-blue-500/10 to-transparent">
              <div>
                <CardTitle className="text-sm font-bold">随机美图访问记录</CardTitle>
                <CardDescription>查看用户访问随机美图的统计数据</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="w-8 h-8 rounded-lg"
                  disabled={randomBeautyPage === 0 || loadingRandomBeauty}
                  onClick={() => {
                    const newPage = randomBeautyPage - 1;
                    setRandomBeautyPage(newPage);
                    loadRandomBeautyLogs(newPage);
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium">第 {randomBeautyPage + 1} 页</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="w-8 h-8 rounded-lg"
                  disabled={(randomBeautyPage + 1) * 20 >= totalRandomBeauty || loadingRandomBeauty}
                  onClick={() => {
                    const newPage = randomBeautyPage + 1;
                    setRandomBeautyPage(newPage);
                    loadRandomBeautyLogs(newPage);
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase whitespace-nowrap">用户名</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase whitespace-nowrap">OpenID / ID</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase whitespace-nowrap">查看日期</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-600 text-xs uppercase whitespace-nowrap">查看数量</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-600 text-xs uppercase whitespace-nowrap">最后更新</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loadingRandomBeauty ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                            加载中...
                          </td>
                        </tr>
                      ) : randomBeautyLogs.length > 0 ? (
                        randomBeautyLogs.map((log: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-700">{log.username}</td>
                            <td className="px-4 py-3 font-mono text-[10px] text-slate-400 truncate max-w-[150px]">{log.openid}</td>
                            <td className="px-4 py-3 text-slate-500">{log.visit_date}</td>
                            <td className="px-4 py-3 text-right">
                              <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-black">
                                {log.count}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-slate-400">{formatTimeAgo(log.updated_at || log.created_at)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">暂无记录</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 素材库 */}
        <TabsContent value="pool" className="space-y-4 mt-6">
          <div className="bg-amber-500/5 text-amber-600 text-[10px] px-3 py-2 rounded-xl border border-amber-500/10 flex items-center gap-2">
            <Info className="w-3.5 h-3.5" />
            <span className="font-bold">库流转规则：[每日图集库] 是全部备选池；[待发布库] 是从池子选取的预发布素材(配置: {config.daily_count || 5}张)；[已发布库] 是历史汇总。删除发布记录后图片自动回到图集库。</span>
          </div>
          {mediaTab === 'pending' && (
          <div className="bg-primary/5 text-primary text-[10px] px-3 py-1.5 rounded-xl border border-primary/10 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span className="font-bold">此处为待发布的备选素材，当数量不足时，系统或管理员可从图集库(Pool)进行补充。</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-2xl w-fit">
              <Button 
                variant={mediaTab === 'available' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => { setMediaTab('available'); setPoolSelectedIds([]); setPoolPage(0); }}
                className="h-8 rounded-xl text-xs px-4 font-bold"
              >
                每日图集库 (Pool)
              </Button>
              <Button 
                variant={mediaTab === 'pending' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => { setMediaTab('pending'); setPoolSelectedIds([]); setPoolPage(0); }}
                className="h-8 rounded-xl text-xs px-4 font-bold relative"
              >
                待发布库 (Pending)
                <Badge className="ml-2 bg-primary/20 text-primary border-none text-[10px] px-1.5 h-4">
                  目标{config.daily_count || 5}张
                </Badge>
              </Button>
              <Button 
                variant={mediaTab === 'used' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => { setMediaTab('used'); setPoolSelectedIds([]); setPoolPage(0); }}
                className="h-8 rounded-xl text-xs px-4 font-bold"
              >
                已发布库 (Published)
              </Button>
            </div>
            
            <div className="flex flex-1 items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAll}
                className="h-10 rounded-xl text-xs gap-2 font-bold px-4"
              >
                {poolSelectedIds.length === poolImages.length && poolImages.length > 0 ? '取消全选' : '全选'}
              </Button>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="搜索素材标题..." 
                    value={poolSearch}
                    onChange={(e) => {
                      setPoolSearch(e.target.value);
                      setPoolPage(0);
                      setUsedPage(0);
                    }}
                    className="pl-9 h-10 rounded-xl bg-muted/20 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
                  />
              </div>

              {mediaTab === 'used' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-muted/20 px-3 py-1 rounded-xl border border-border/50">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => { setFilterStartDate(e.target.value); setUsedPage(0); }}
                      className="bg-transparent border-none p-0 h-8 text-xs focus-visible:ring-0 w-[120px]"
                    />
                    <span className="text-muted-foreground text-xs">至</span>
                    <Input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => { setFilterEndDate(e.target.value); setUsedPage(0); }}
                      className="bg-transparent border-none p-0 h-8 text-xs focus-visible:ring-0 w-[120px]"
                    />
                    {(filterStartDate || filterEndDate) && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground"
                        onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setUsedPage(0); }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAutoRefill} 
                  className="h-10 rounded-xl text-xs gap-2 font-bold px-4 bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                >
                  <Zap className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  自动补充待发布库
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => {
                    fetchTaskLogs();
                    setRefillLogDialogOpen(true);
                  }} 
                  className="h-10 w-10 rounded-xl bg-muted/50 border-border/50 hover:bg-muted"
                  title="查看补充日志"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </Button>
              </div>
              {mediaTab === 'used' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    const confirmed = await confirmAsync('确定释放所有无发布记录的图片回到待使用库？', { variant: 'destructive' });
    if (!confirmed) return;
                    try {
                      setLoading(true);
                      const { data, error } = await api.releaseOrphanedMaterials();
                      if (error) throw error;
                      const res = data as any;
                      if (res?.success) {
                        toast.success(res.message || '释放成功');
                      } else {
                        toast.error(res.message || '释放失败');
                      }
                      fetchAvailableImages();
                    } catch (e: any) {
                      toast.error('释放失败: ' + e.message);
                    } finally {
                      setLoading(false);
                    }
                  }} 
                  className="h-10 rounded-xl text-xs gap-2 font-bold px-4 bg-orange-500/5 text-orange-600 border-orange-500/20 hover:bg-orange-500/10"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  释放无发布记录图片
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchAvailableImages} 
                className="h-10 rounded-xl text-xs gap-2 font-bold px-4"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                刷新列表
              </Button>
            </div>
          </div>

          {poolSelectedIds.length > 0 && (
            <div className="flex items-center justify-between gap-4 bg-primary/5 p-4 rounded-3xl border border-primary/10 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary text-white font-black px-3 py-1 rounded-full">{poolSelectedIds.length}</Badge>
                <span className="text-sm font-bold text-primary">已选择素材</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPoolSelectedIds([])}
                  className="rounded-xl font-bold h-9 px-4"
                >
                  取消
                </Button>
                
                {mediaTab === 'available' && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => handleMarkAsPending(poolSelectedIds, true)}
                    className="rounded-xl font-bold h-9 px-4 bg-blue-500 hover:bg-blue-600"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    选入待发布库
                  </Button>
                )}

                {mediaTab === 'pending' && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => handleMarkAsPending(poolSelectedIds, false)}
                    className="rounded-xl font-bold h-9 px-4 bg-orange-500 hover:bg-orange-600"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    移回每日图集库
                  </Button>
                )}

                {(mediaTab === 'available' || mediaTab === 'pending') && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={async () => {
                      const confirmed = await confirmAsync(`确定将选中的 ${poolSelectedIds.length} 个素材从每日图集媒体库中移除？`, { variant: 'destructive' });
    if (!confirmed) return;
                      try {
                        setLoading(true);
                        const { error } = await api.batchExcludeFromDailyGallery(poolSelectedIds, true);
                        if (error) throw error;
                        toast.success('批量移除成功');
                        setPoolSelectedIds([]);
                        fetchAvailableImages();
                      } catch (error: any) {
                        toast.error(`批量移除失败: ${error.message}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="rounded-xl font-bold h-9 px-4 bg-red-500 hover:bg-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    批量移除
                  </Button>
                )}

                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => {
                    setSelectedImages(poolSelectedIds);
                    setPublishDialogOpen(true);
                  }}
                  className="rounded-xl font-bold h-9 px-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  使用选中发布
                </Button>
              </div>
            </div>
          )}
          
          <Card className="rounded-3xl border-none shadow-sm bg-muted/20">
            <CardContent className="p-6">
              {loading && poolImages.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : poolImages.length > 0 ? (
                <>
                  <div 
                    className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 select-none"
                    onMouseLeave={() => { setIsSwiping(false); setSwipeAction(null); }}
                    onMouseUp={() => { setIsSwiping(false); setSwipeAction(null); }}
                  >
                    {poolImages.map((img) => {
                      const isSelected = poolSelectedIds.includes(img.id);
                      
                      const handleSelection = (id: string, action: 'select' | 'deselect') => {
                        setPoolSelectedIds(prev => {
                          if (action === 'select' && !prev.includes(id)) return [...prev, id];
                          if (action === 'deselect' && prev.includes(id)) return prev.filter(i => i !== id);
                          return prev;
                        });
                      };

                      return (
                        <div 
                          key={img.id} 
                          className={`relative group cursor-pointer transition-all duration-300 rounded-2xl overflow-hidden ${isSelected ? 'ring-4 ring-primary ring-offset-2 scale-[0.98]' : 'hover:scale-[1.02]'}`}
                          onMouseDown={(e) => {
                            if (e.button !== 0) return; // Only left click
                            setIsSwiping(true);
                            const newAction = isSelected ? 'deselect' : 'select';
                            setSwipeAction(newAction);
                            handleSelection(img.id, newAction);
                          }}
                          onMouseEnter={() => {
                            if (isSwiping && swipeAction) {
                              handleSelection(img.id, swipeAction);
                            }
                          }}
                        >
                          <div className="aspect-square rounded-2xl overflow-hidden bg-muted border border-border/50 relative group z-0">
                            <ProtectedMedia 
                              src={img.url} 
                              alt={img.title || '图片'} 
                              ruleKey="审核"
                              className={cn(
                                "w-full h-full object-contain transition-transform duration-500",
                                isSelected ? 'scale-110 blur-[1px]' : 'group-hover:scale-110'
                              )}
                              type="image"
                            />
                            {/* 日期和标识 (始终可见) */}
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10">
                              <div className="flex items-center justify-between gap-1">
                                {mediaTab === 'used' && img.post_date ? (
                                  <span className="text-[10px] text-white font-bold">{img.post_date}</span>
                                ) : (
                                  <span className="text-[10px] text-white/70 truncate">{img.title || '未命名'}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* 状态徽章 */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
                            {img.daily_gallery_status === 'pending' && (
                              <Badge className="bg-blue-500/90 text-[10px] px-1.5 h-4 flex items-center justify-center border-none backdrop-blur-sm">待发布</Badge>
                            )}
                            {img.daily_gallery_status === 'used' && (
                              <Badge className={`text-[10px] px-1.5 h-4 flex items-center justify-center border-none backdrop-blur-sm ${img.has_record === false ? 'bg-orange-500/90' : 'bg-slate-500/90'}`}>
                                {img.has_record === false ? '无发布记录' : '已使用'}
                              </Badge>
                            )}
                          </div>

                          {/* 快速移除按钮 (待发布/已使用状态显示) */}
                          {(img.daily_gallery_status === 'pending' || img.daily_gallery_status === 'used') && (
                            <Button 
                              variant="destructive" 
                              size="icon" 
                              className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-red-500/80 hover:bg-red-600 shadow-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('确定将此图片移回待使用素材？')) {
                                  handleMarkAsPending([img.id], false);
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          {/* 选中标记 */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 z-20 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white shadow-lg animate-in zoom-in-50">
                              <Plus className="w-4 h-4 rotate-45" />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-3 gap-2 z-10">
                            {mediaTab === 'available' ? (
                              <>
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  onClick={(e) => { e.stopPropagation(); handleExcludeImage(img.id); }}
                                  className="h-8 rounded-xl text-[10px] gap-1 px-3 bg-red-500/90 hover:bg-red-500 font-bold"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  移除
                                </Button>
                                <div className="absolute bottom-2 left-2 right-2 text-white text-[9px] line-clamp-1 opacity-80 pointer-events-none">
                                  {img.title || '无标题'}
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-white">
                                <Badge className={`${img.has_record === false ? 'bg-orange-500/90' : 'bg-primary/90'} text-white border-none text-[9px]`}>
                                  {img.has_record === false ? '无发布记录' : '已使用'}
                                </Badge>
                                {img.post_date && <span className="text-[10px] font-bold">{img.post_date}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* 分页控制 */}
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <div className="text-sm text-muted-foreground">
                      共 {mediaTab === 'used' ? usedTotal : poolTotal} 张图片，
                      当前第 {(mediaTab === 'used' ? usedPage : poolPage) + 1} / {Math.ceil((mediaTab === 'used' ? usedTotal : poolTotal) / poolLimit) || 1} 页
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => mediaTab === 'used' ? setUsedPage(Math.max(0, usedPage - 1)) : setPoolPage(Math.max(0, poolPage - 1))}
                        disabled={(mediaTab === 'used' ? usedPage : poolPage) === 0}
                        className="rounded-xl"
                      >
                        上一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => mediaTab === 'used' ? setUsedPage(usedPage + 1) : setPoolPage(poolPage + 1)}
                        disabled={(mediaTab === 'used' ? usedPage : poolPage) >= Math.ceil((mediaTab === 'used' ? usedTotal : poolTotal) / poolLimit) - 1}
                        className="rounded-xl"
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                  <div className="text-center py-20 text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-bold">暂无{mediaTab === 'available' ? '每日图集' : mediaTab === 'pending' ? '待发布' : '已发布'}库素材</p>
                    <p className="text-xs mt-1 mb-4">
                      {mediaTab === 'available' 
                        ? '请确保媒体库中有已通过审核且未隐藏的图片' 
                        : mediaTab === 'pending'
                        ? '点击下方按钮根据配置自动从每日图集库补充'
                        : '发布记录中使用的图片将会显示在这里'}
                    </p>
                    {mediaTab === 'pending' && (
                      <Button onClick={handleAutoRefill} disabled={loading} className="rounded-full px-6">
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        立即自动补充
                      </Button>
                    )}
                    {typeof window !== 'undefined' && localStorage.getItem('custom_supabase_url') && (
                      <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left max-w-sm mx-auto">
                        <div className="flex items-center gap-2 mb-2">
                          <TriangleAlert className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-bold text-amber-600">检测到自定义数据源</span>
                        </div>
                        <p className="text-[10px] text-amber-700 leading-relaxed mb-3">
                          当前正使用第三方 Supabase 数据源,若该服务器上没有对应的图片数据,此处将显示为空。
                        </p>
                        <code className="text-[10px] bg-white/60 p-1.5 rounded-md block break-all font-mono opacity-80">
                          URL: {localStorage.getItem('custom_supabase_url')}
                        </code>
                      </div>
                    )}

                  </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 发布记录 */}
        <TabsContent value="posts" className="space-y-4 mt-6">
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold text-muted-foreground">从</Label>
              <Input 
                type="date" 
                value={filterStartDate} 
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setPostsPage(0);
                }}
                className="h-9 rounded-xl text-xs w-[140px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold text-muted-foreground">至</Label>
              <Input 
                type="date" 
                value={filterEndDate} 
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setPostsPage(0);
                }}
                className="h-9 rounded-xl text-xs w-[140px]"
              />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
              className="h-9 rounded-xl text-xs"
            >
              重置
            </Button>
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 rounded-xl text-xs font-bold gap-1.5"
                onClick={handleTriggerScheduler}
                disabled={schedulerLoading}
              >
                {schedulerLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                触发自动发布调度
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="h-9 rounded-xl text-xs font-bold gap-1.5" 
                onClick={() => setPublishDialogOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" /> 手动发布
              </Button>

            </div>
          </div>

          <Card className="rounded-3xl border-none shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-black">发布日期</TableHead>
                    <TableHead className="font-black">图片数量</TableHead>
                    <TableHead className="font-black">访问密码</TableHead>
                    <TableHead className="font-black">密码有效期</TableHead>
                    <TableHead className="font-black">浏览/访客</TableHead>
                    <TableHead className="font-black">状态</TableHead>
                    <TableHead className="font-black text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : posts.length > 0 ? posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-bold">{post.post_date}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold">
                          {post.image_ids?.length || 0} 张
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{post.password}</code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatBeijingTime(post.password_expires_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold">{post.view_count}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-primary font-bold">{post.unique_visitor_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {post.is_published ? (
                          <Badge className="bg-green-500">已发布</Badge>
                        ) : (
                          <Badge variant="outline">草稿</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              const domain = window.location.origin;
                               const cleanDate = post.post_date.replace(/-/g, '');
                               const url = `${domain}/daily-gallery?date=${cleanDate}&p=${post.password}`;
                              navigator.clipboard.writeText(url);
                              toast.success('图集链接已复制');
                            }}
                            className="text-primary hover:text-primary hover:bg-primary/10"
                            title="复制链接"
                          >
                            <Link className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setSelectedPostId(post.id);
                              setLogsPage(0);
                              setLogsDialogOpen(true);
                            }}
                            className="text-primary hover:text-primary hover:bg-primary/10"
                            title="查看访客详情"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={async () => {
                              const pData = {
                                ...post,
                                password_expires_at: post.password_expires_at ? new Date(post.password_expires_at).toISOString().slice(0, 16) : ''
                              };
                              setEditingPost(pData);
                              setEditDialogOpen(true);
                              // 立即获取当前已关联的完整图片信息
                              if (post.image_ids?.length > 0) {
                                try {
                                  const { data } = await api.supabase
                                    .from('media_items')
                                    .select('*')
                                    .in('id', post.image_ids);
                                  setEditingPostFullImages(data || []);
                                } catch (e) {
                                  console.error(e);
                                }
                              } else {
                                setEditingPostFullImages([]);
                              }
                            }}
                            className="text-primary hover:text-primary hover:bg-primary/10"
                            title="编辑发布"
                          >
                            <Plus className="w-4 h-4 rotate-45" /> {/* Use Plus rotated for Edit icon or similar */}
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="重置该日期的所有用户密码"
                            onClick={() => handleResetUserPasswords(post.post_date)}
                            className="text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeletePost(post.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="font-bold">暂无发布记录</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {postsTotal > limit && (
            <div className="flex items-center justify-center gap-2">
              <Button 
                variant="ghost" 
                disabled={postsPage === 0} 
                onClick={() => setPostsPage(p => p - 1)}
                className="rounded-xl"
              >
                上一页
              </Button>
              <span className="text-xs text-muted-foreground">
                第 {postsPage + 1} / {Math.ceil(postsTotal / limit)} 页
              </span>
              <Button 
                variant="ghost" 
                disabled={(postsPage + 1) * limit >= postsTotal} 
                onClick={() => setPostsPage(p => p + 1)}
                className="rounded-xl"
              >
                下一页
              </Button>
            </div>
          )}
        </TabsContent>

        {/* 随机密码库 */}
        <TabsContent value="special_passwords" className="space-y-4 mt-6">
          <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">随机/特权密码库</CardTitle>
                  <CardDescription>用于在微信回复失败或特殊场景下给用户的紧急密码</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                  <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="rounded-xl gap-2 font-bold h-10 px-4 w-full sm:w-auto">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="whitespace-nowrap">导入 Excel</span>
                  </Button>
                  <Button variant="outline" onClick={handleExportSpecialPwds} className="rounded-xl gap-2 font-bold h-10 px-4 w-full sm:w-auto">
                    <Download className="w-4 h-4" />
                    <span className="whitespace-nowrap">导出 Excel</span>
                  </Button>
                  <Button onClick={handleOpenSpecialPwdDialog} className="rounded-xl gap-2 font-bold h-10 px-4 w-full sm:w-auto">
                    <Plus className="w-4 h-4" />
                    <span className="whitespace-nowrap">生成随机密码</span>
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <div className="relative w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="按OpenID搜索" 
                    value={specialPwdsFilters.openid}
                    onChange={(e) => setSpecialPwdsFilters(f => ({ ...f, openid: e.target.value }))}
                    className="pl-9 h-10 rounded-xl"
                  />
                </div>
                
                <Select value={specialPwdsFilters.source} onValueChange={(v) => setSpecialPwdsFilters(f => ({ ...f, source: v }))}>
                  <SelectTrigger className="w-[140px] h-10 rounded-xl">
                    <SelectValue placeholder="生成方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部生成方式</SelectItem>
                    <SelectItem value="backend">后台生成</SelectItem>
                    <SelectItem value="wechat">微信公众号</SelectItem>
                    <SelectItem value="miniprogram">小程序生成</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={specialPwdsFilters.type} onValueChange={(v) => setSpecialPwdsFilters(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="w-[140px] h-10 rounded-xl">
                    <SelectValue placeholder="密码类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="one_time">一次性</SelectItem>
                    <SelectItem value="periodic">定期密码</SelectItem>
                    <SelectItem value="multi_use">可多次使用</SelectItem>
                    <SelectItem value="permanent">长期有效</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={specialPwdsFilters.status} onValueChange={(v) => setSpecialPwdsFilters(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="w-[140px] h-10 rounded-xl">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="active">有效</SelectItem>
                    <SelectItem value="used">已刷完/已用</SelectItem>
                    <SelectItem value="expired">已过期</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setSpecialPwdsFilters({
                      openid: '',
                      source: 'all',
                      status: 'all',
                      type: 'all'
                    });
                    setSpecialPwdsPage(0);
                  }}
                  className="rounded-full hover:bg-muted"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold">密码</TableHead>
                    <TableHead className="font-bold">生成来源</TableHead>
                    <TableHead className="font-bold">适用日期</TableHead>
                    <TableHead className="font-bold">类型</TableHead>
                    <TableHead className="font-bold">频率限制</TableHead>
                    <TableHead className="font-bold">状态</TableHead>
                    <TableHead className="font-bold">创建时间</TableHead>
                    <TableHead className="font-bold text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specialPwdsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-40 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : specialPwds.length > 0 ? (
                    specialPwds.map((pwd) => (
                      <TableRow key={pwd.id}>
                        <TableCell className="font-mono font-bold text-primary">{pwd.password}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={cn(
                              "w-fit",
                              pwd.source === 'backend' ? "bg-blue-500/10 text-blue-600 border-none" : 
                              pwd.source === 'wechat' ? "bg-green-500/10 text-green-600 border-none" :
                              "bg-purple-500/10 text-purple-600 border-none"
                            )}>
                              {pwd.source === 'backend' ? '后台生成' : 
                               pwd.source === 'wechat' ? '微信公众号' : '小程序生成'}
                            </Badge>
                            {pwd.creator_id && (
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-indigo-600 truncate max-w-[120px]">
                                  {openidToUsername[pwd.creator_id] || '未知用户'}
                                </span>
                                <span className="text-[9px] text-muted-foreground truncate max-w-[120px]" title={pwd.creator_id}>
                                  ID: {pwd.creator_id}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {pwd.target_date ? (
                            <Badge variant="outline" className="gap-1 border-primary/20 text-primary">
                              <Calendar className="w-3 h-3" />
                              {pwd.target_date}
                            </Badge>
                          ) : (
                            <Badge className="bg-purple-500/10 text-purple-600 border-none">全部日期通用</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {pwd.password_type === 'periodic_single_user' ? (
                              <Badge variant="outline" className="text-purple-600 border-purple-200">定期·单用户</Badge>
                            ) : pwd.password_type === 'periodic_multi_user' ? (
                              <Badge variant="outline" className="text-pink-600 border-pink-200">定期·多用户</Badge>
                            ) : pwd.password_type === 'long_term' ? (
                              <Badge variant="outline" className="text-blue-600 border-blue-200">长期使用</Badge>
                            ) : pwd.password_type === 'one_time' ? (
                              <Badge variant="outline" className="text-orange-500 border-orange-200">一次性</Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-500 border-green-200">限 {pwd.max_usages} 次</Badge>
                            )}
                            {(pwd.password_type === 'periodic_single_user' || pwd.password_type === 'periodic_multi_user') && pwd.browser_id && (
                              <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                <Smartphone className="w-2.5 h-2.5" /> 浏览器锁定
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {(!pwd.per_user_max_daily && !pwd.per_user_max_total) ? (
                              <span className="text-[10px] text-muted-foreground">无限制</span>
                            ) : (
                              <>
                                {pwd.per_user_max_daily > 0 && (
                                  <Badge variant="outline" className="text-[9px] h-5 border-blue-100 bg-blue-50/50">
                                    每日限 {pwd.per_user_max_daily} 次
                                  </Badge>
                                )}
                                {pwd.per_user_max_total > 0 && (
                                  <Badge variant="outline" className="text-[9px] h-5 border-indigo-100 bg-indigo-50/50">
                                    累计限 {pwd.per_user_max_total} 次
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {((pwd.used_count || 0) >= (pwd.max_usages || (pwd.is_one_time ? 1 : 999999))) || (pwd.expires_at && new Date(pwd.expires_at) < new Date()) ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant="secondary" className="opacity-50">已失效</Badge>
                              {pwd.expires_at && new Date(pwd.expires_at) < new Date() && (
                                <span className="text-[10px] text-red-500 ml-1">已过期</span>
                              )}
                              {(pwd.used_count || 0) >= (pwd.max_usages || (pwd.is_one_time ? 1 : 999999)) && (
                                <span className="text-[10px] text-muted-foreground ml-1">额度用尽</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Badge className="bg-green-500 text-white border-none">有效</Badge>
                              <span className="text-[10px] text-muted-foreground ml-1">已用 {pwd.used_count || 0}/{pwd.max_usages >= 999999 ? '∞' : pwd.max_usages}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatBeijingTime(pwd.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteSpecialPwd(pwd.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-40 text-center text-muted-foreground">
                        <Key className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>暂无记录</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {specialPwdsTotal > 30 && (
                <div className="flex items-center justify-center gap-2 p-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={specialPwdsPage === 0} 
                    onClick={() => setSpecialPwdsPage(p => p - 1)}
                  >
                    上一页
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={(specialPwdsPage + 1) * 30 >= specialPwdsTotal} 
                    onClick={() => setSpecialPwdsPage(p => p + 1)}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 访问统计 */}
        <TabsContent value="stats" className="space-y-4 mt-6">
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold text-muted-foreground">统计周期</Label>
              <Input 
                type="date" 
                value={statsStartDate} 
                onChange={(e) => setStatsStartDate(e.target.value)}
                className="h-9 rounded-xl text-xs w-[140px]"
              />
              <span className="text-muted-foreground">~</span>
              <Input 
                type="date" 
                value={statsEndDate} 
                onChange={(e) => setStatsEndDate(e.target.value)}
                className="h-9 rounded-xl text-xs w-[140px]"
              />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setStatsStartDate(''); setStatsEndDate(''); }}
              className="h-9 rounded-xl text-xs"
            >
              全部
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchStats}
              className="h-9 rounded-xl text-xs gap-2 ml-auto"
            >
              <RefreshCw className={`w-3 h-3 ${statsLoading ? 'animate-spin' : ''}`} />
              刷新数据
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="rounded-3xl border-none shadow-sm bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm flex items-center gap-2 text-primary">
                  <Zap className="w-4 h-4" />
                  今日实时浏览
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-black text-primary">
                  {stats.filter(s => s.post_date === new Date().toISOString().split('T')[0]).reduce((sum, s) => sum + (s.view_count || 0), 0) || stats[0]?.today_view_count || 0}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">仅统计今日发布或今日产生的浏览</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  总浏览量
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-black">
                  {stats.reduce((sum, s) => sum + (s.view_count || 0), 0)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">全站历史累计数据</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  独立访客
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-black">
                  {stats.reduce((sum, s) => sum + (s.unique_visitor_count || 0), 0)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">去重后的访客总数</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  发布天数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-black">{stats.length}</p>
                <p className="text-[10px] text-muted-foreground mt-1">已发布图集的总天数</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">每日统计详情</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : stats.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日期</TableHead>
                      <TableHead>图片数</TableHead>
                      <TableHead>浏览量</TableHead>
                      <TableHead>独立访客</TableHead>
                      <TableHead>密码</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.map((stat) => (
                      <TableRow key={stat.post_id}>
                        <TableCell className="font-bold">{stat.post_date}</TableCell>
                        <TableCell>{stat.image_count}</TableCell>
                        <TableCell>{stat.view_count}</TableCell>
                        <TableCell className="text-primary font-bold">{stat.unique_visitor_count}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">{stat.password}</code>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>暂无统计数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* 用户重置管理 */}
        <TabsContent value="resets" className="space-y-4 mt-6">
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    用户重置管理
                  </CardTitle>
                  <CardDescription>搜索指定用户，清空其在特定日期或所有日期的密码重置次数</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="搜索用户名 / OpenID" 
                      className="pl-10 h-10 rounded-xl"
                      value={userResetSearch}
                      onChange={(e) => setUserResetSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchUserResets()}
                    />
                  </div>
                  <Button 
                    onClick={handleSearchUserResets} 
                    disabled={userResetLoading}
                    className="rounded-xl h-10 gap-2 font-bold shrink-0"
                  >
                    {userResetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    搜索
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {userResetPasswords.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-muted/50">
                        <TableHead className="font-black text-xs py-4 pl-6">用户标识 (OpenID)</TableHead>
                        <TableHead className="font-black text-xs py-4">适用日期</TableHead>
                        <TableHead className="font-black text-xs py-4">当前重置次数</TableHead>
                        <TableHead className="font-black text-xs py-4">密码状态</TableHead>
                        <TableHead className="font-black text-xs py-4">创建时间</TableHead>
                        <TableHead className="font-black text-xs py-4 text-right pr-6">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userResetPasswords.map((pwd) => (
                        <TableRow key={pwd.id} className="group hover:bg-muted/30 transition-colors border-muted/50">
                          <TableCell className="py-4 pl-6">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-sm font-mono truncate max-w-[120px]" title={pwd.creator_id}>{pwd.creator_id}</span>
                              <span className="text-[10px] text-muted-foreground">{openidToUsername[pwd.creator_id] || '未知用户名'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 font-bold text-sm">
                            {pwd.target_date || '通用密码'}
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant={pwd.reset_count > 0 ? "destructive" : "secondary"} className="rounded-lg font-black h-6">
                              {pwd.reset_count || 0} 次
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            {pwd.is_used ? (
                              <Badge variant="outline" className="text-muted-foreground border-muted/50 rounded-lg h-6">已使用</Badge>
                            ) : (
                              <Badge className="bg-green-500/10 text-green-600 border-none rounded-lg h-6">有效</Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-xs text-muted-foreground">
                            {formatBeijingTime(pwd.created_at)}
                          </TableCell>
                          <TableCell className="py-4 text-right pr-6">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-primary hover:text-primary hover:bg-primary/10 rounded-xl h-9 gap-2 font-bold"
                              onClick={() => handleClearUserResets(pwd.creator_id)}
                              disabled={pwd.reset_count === 0}
                            >
                              <RefreshCcw className="w-4 h-4" />
                              清空重置
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-24 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-4 opacity-50">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-bold">暂无查询结果</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">请输入用户 OpenID 或用户名进行精准搜索</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="task_logs" className="space-y-4 mt-6">
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden mb-4 bg-orange-50/10 border border-orange-200/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-orange-600">
                <Zap className="w-4 h-4 text-orange-500" />
                系统自动化触发 (HTTP API)
              </CardTitle>
              <CardDescription className="text-xs">支持通过第三方定时任务工具手动或自动触发图集发布</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-2xl bg-card/50">
                <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                  通过调用以下 HTTP GET/POST 链接，可以远程触发当日图集的发布逻辑。适合集成在服务器 Cron 或宝塔任务中。
                </p>
                <div className="flex flex-col gap-2">
                  <div className="bg-muted p-2 rounded-lg text-[10px] font-mono break-all text-muted-foreground border border-border/40">
                    {getFunctionUrl('daily-gallery-publish', `?token=${dailyGalleryToken}`)}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 rounded-xl text-[10px] font-bold"
                      onClick={async () => {
                        const newToken = 'dg-' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
                        try {
                          await api.updateDailyGalleryConfig({ ...config, trigger_token: newToken });
                          setDailyGalleryToken(newToken);
                          setConfig({ ...config, trigger_token: newToken });
                          toast.success('API 令牌已更新');
                        } catch (e: any) {
                          toast.error('更新令牌失败: ' + e.message);
                        }
                      }}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      更新令牌
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 rounded-xl text-[10px] font-bold"
                      onClick={() => copyToClipboard(getFunctionUrl('daily-gallery-publish', `?token=${dailyGalleryToken}`))}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      复制 API 链接
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card className="rounded-3xl border-none shadow-sm bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-primary" />
                  任务调度状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">自动发布配置</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${config.auto_publish ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className="font-black">{config.auto_publish ? '正在运行' : '已停止'}</span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xs text-muted-foreground">设定时刻 (北京时间)</p>
                    <p className="font-black text-primary">{config.publish_time || '未配置'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm bg-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent-foreground" />
                  预计下次执行
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">下个执行窗口</p>
                    <p className="font-black text-sm">{getNextPublishTime()}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={schedulerLoading}
                    onClick={handleRunScheduler}
                    className="rounded-xl h-9 text-xs gap-2"
                  >
                    {schedulerLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlayCircle className="w-3 h-3" />}
                    手动触发一次
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  定时发布任务记录
                </CardTitle>
                <CardDescription>展示最近10次定时自动发布任务的执行情况</CardDescription>
              </div>

            </CardHeader>
            <CardContent className="p-0">
              {taskLogsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : taskLogs.length > 0 ? (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-bold">任务名称</TableHead>
                      <TableHead className="font-bold">状态</TableHead>
                      <TableHead className="font-bold">执行时间</TableHead>
                      <TableHead className="font-bold">耗时</TableHead>
                      <TableHead className="font-bold">详情</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taskLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium text-xs">
                          {log.task_name === 'daily_gallery_auto_publish' ? '每日图集自动发布' : log.task_name}
                        </TableCell>
                        <TableCell>
                          {log.status === 'success' ? (
                            <Badge className="bg-green-500/10 text-green-600 border-none hover:bg-green-500/20 text-[10px] py-0 px-2 h-5">
                              <CheckCircle className="w-3 h-3 mr-1" /> 成功
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-600 border-none hover:bg-red-500/20 text-[10px] py-0 px-2 h-5">
                              失败
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatBeijingTime(log.execution_time)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {log.message || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-bold">暂无任务记录</p>
                  <p className="text-xs mt-1">当定时任务执行后，相关记录将在此展示</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 系统公告 */}
        <TabsContent value="announcements" className="space-y-4 mt-6">
          <AnnouncementsSection />
        </TabsContent>

        <TabsContent value="submissions" className="space-y-4 mt-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <LucideUpload className="w-5 h-5 text-primary" /> 用户上传记录
                  </CardTitle>
                  <CardDescription>管理用户提交的每日图集分享图片</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {submissionSelectedIds.length > 0 && (
                    <div className="flex items-center gap-2 mr-4 bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">
                      <span className="text-xs font-bold text-primary">已选 {submissionSelectedIds.length} 项</span>
                      <Button size="sm" className="h-7 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-[10px]" onClick={() => handleBatchReview('approved')}>批量通过</Button>
                      <Button size="sm" variant="outline" className="h-7 px-3 rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-[10px]" onClick={() => setBatchReviewDialogOpen(true)}>批量拒绝</Button>
                    </div>
                  )}
                  <Select value={submissionStatus} onValueChange={setSubmissionStatus}>
                    <SelectTrigger className="w-[120px] rounded-xl h-9">
                      <SelectValue placeholder="状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="pending">待审核</SelectItem>
                      <SelectItem value="approved">已通过</SelectItem>
                      <SelectItem value="rejected">已拒绝</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-none">
                    <TableHead className="w-12 px-2 first:rounded-l-xl">
                      <Checkbox 
                        checked={submissions.length > 0 && submissionSelectedIds.length === submissions.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSubmissionSelectedIds(submissions.map(s => s.id));
                          } else {
                            setSubmissionSelectedIds([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="font-bold">预览</TableHead>
                    <TableHead className="font-bold">上传人/OpenID</TableHead>
                    <TableHead className="font-bold">状态</TableHead>
                    <TableHead className="font-bold">提交时间</TableHead>
                    <TableHead className="font-bold last:rounded-r-xl">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : submissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                        暂无记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    submissions.map((item) => (
                      <TableRow key={item.id} className="group hover:bg-muted/20 border-b border-muted/30 transition-colors">
                        <TableCell className="px-2">
                          <Checkbox 
                            checked={submissionSelectedIds.includes(item.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSubmissionSelectedIds([...submissionSelectedIds, item.id]);
                              } else {
                                setSubmissionSelectedIds(submissionSelectedIds.filter(id => id !== item.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-sm border border-muted bg-muted/20">
                            <ProtectedMedia 
                              src={item.image_url} 
                              type="image" 
                              className="w-full h-full object-cover" 
                              ruleKey="none"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center cursor-zoom-in" onClick={() => setPreviewImageUrl(item.image_url)}>
                              <ImageIcon className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-bold">{item.nickname || item.profiles?.username || '匿名用户'}</p>
                            {item.openid ? (
                              <p className="text-[10px] text-primary font-mono bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 truncate w-32" title={item.openid}>
                                {item.openid}
                              </p>
                            ) : (
                              <p className="text-[10px] text-muted-foreground truncate w-24">UID: {item.user_id?.slice(0, 8)}...</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={cn(
                              "rounded-lg px-2 py-0.5 text-[10px] font-bold",
                              item.status === 'pending' ? "bg-amber-100 text-amber-600" :
                              item.status === 'approved' ? "bg-green-100 text-green-600" :
                              "bg-rose-100 text-rose-600"
                            )}
                          >
                            {item.status === 'pending' ? '待审核' : item.status === 'approved' ? '已通过' : '已拒绝'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium">{formatBeijingTime(item.created_at).split(' ')[0]}</span>
                            <span className="text-[10px] text-muted-foreground">{formatBeijingTime(item.created_at).split(' ')[1]}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.status === 'pending' ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 rounded-xl border-primary/20 text-primary hover:bg-primary/5 font-bold"
                              onClick={() => {
                                setSelectedSubmission(item);
                                setReviewDialogOpen(true);
                              }}
                            >
                              审核
                            </Button>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-muted-foreground">
                                已于 {item.reviewed_at ? formatBeijingTime(item.reviewed_at).split(' ')[0] : '未知'} 审核
                              </span>
                              {item.status === 'rejected' && item.rejection_reason && (
                                <span className="text-[10px] text-rose-500 max-w-[120px] truncate" title={item.rejection_reason}>
                                  理由: {item.rejection_reason}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              <div className="mt-6 flex items-center justify-between px-2">
                <p className="text-xs text-muted-foreground">共 {submissionsTotal} 条记录</p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={submissionsPage === 0} 
                    onClick={() => setSubmissionsPage(p => p - 1)}
                    className="h-8 w-8 p-0 rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-bold w-8 text-center">{submissionsPage + 1}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={(submissionsPage + 1) * submissionsLimit >= submissionsTotal} 
                    onClick={() => setSubmissionsPage(p => p + 1)}
                    className="h-8 w-8 p-0 rounded-lg"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="config" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-3xl border-none shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  基础发布配置
                </CardTitle>
                <CardDescription>配置每日自动发布的基本规则</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">每日发布数量</Label>
                    <Input 
                      type="number" 
                      value={config.daily_count} 
                      onChange={(e) => setConfig({ ...config, daily_count: parseInt(e.target.value) })}
                      className="rounded-xl h-10"
                    />
                    <p className="text-[10px] text-muted-foreground">每次自动发布时从库中随机抽取的图片张数</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">发布时间</Label>
                    <Input 
                      type="time" 
                      value={config.publish_time} 
                      onChange={(e) => setConfig({ ...config, publish_time: e.target.value })}
                      className="rounded-xl h-10"
                    />
                    <p className="text-[10px] text-muted-foreground">系统每天执行自动发布的时刻 (北京时间)</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">启用自动发布</Label>
                    <p className="text-xs text-muted-foreground">开启后系统将按定时器自动发布，关闭则需手动发布</p>
                  </div>
                  <Switch 
                    checked={config.auto_publish ?? true} 
                    onCheckedChange={(checked) => setConfig({ ...config, auto_publish: checked })} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">启用小程序广告解锁</Label>
                    <p className="text-xs text-muted-foreground">通过扫码看一段视频广告解锁每日图集</p>
                  </div>
                  <Switch 
                    checked={config.enable_miniprogram_ad ?? false} 
                    onCheckedChange={(checked) => setConfig({ ...config, enable_miniprogram_ad: checked })} 
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    激励作者配置
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">启用激励作者</Label>
                      <p className="text-xs text-muted-foreground">在图集页显示“激励作者”按钮，引导扫码看广告</p>
                    </div>
                    <Switch 
                      checked={config.enable_incentive ?? false} 
                      onCheckedChange={(checked) => setConfig({ ...config, enable_incentive: checked })} 
                    />
                  </div>
                  {config.enable_incentive && (
                    <div className="grid grid-cols-1 gap-4 p-4 border rounded-2xl bg-muted/10">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold">激励小程序码 URL</Label>
                        <Input 
                          placeholder="小程序激励广告码图片地址" 
                          value={config.incentive_qr_url || ''} 
                          onChange={(e) => setConfig({ ...config, incentive_qr_url: e.target.value })}
                          className="rounded-xl h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold">按钮文本</Label>
                        <Input 
                          placeholder="激励作者" 
                          value={config.incentive_button_text || '激励作者'} 
                          onChange={(e) => setConfig({ ...config, incentive_button_text: e.target.value })}
                          className="rounded-xl h-10"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    随机推荐入口 (随机美图)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">触发张数</Label>
                      <Input 
                        type="number"
                        min="1"
                        value={config.rb_trigger_view_count ?? 20} 
                        onChange={(e) => setConfig({ ...config, rb_trigger_view_count: parseInt(e.target.value) || 0 })}
                        className="rounded-xl h-10"
                      />
                      <p className="text-[10px] text-muted-foreground">用户至少看完多少张图后尝试触发</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">触发概率 (%)</Label>
                      <Input 
                        type="number"
                        min="0"
                        max="100"
                        value={config.rb_trigger_probability ?? 100} 
                        onChange={(e) => setConfig({ ...config, rb_trigger_probability: parseInt(e.target.value) || 0 })}
                        className="rounded-xl h-10"
                      />
                      <p className="text-[10px] text-muted-foreground">满足张数后跳转随机美图的概率</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">触发后提示语</Label>
                    <Input 
                      placeholder="恭喜发现隐藏惊喜，正在为您加载随机美图..."
                      value={config.rb_trigger_message || ''} 
                      onChange={(e) => setConfig({ ...config, rb_trigger_message: e.target.value })}
                      className="rounded-xl h-10"
                    />
                    <p className="text-[10px] text-muted-foreground">触发跳转时的 Toast 提示文字</p>
                  </div>
                </div>

                {config.enable_miniprogram_ad && (
                  <div className="p-4 border rounded-2xl bg-muted/10 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        解锁模式
                      </Label>
                      <Select 
                        value={config.ad_unlock_mode || 'direct'} 
                        onValueChange={(val) => setConfig({ ...config, ad_unlock_mode: val })}
                      >
                        <SelectTrigger className="rounded-xl h-10 bg-white">
                          <SelectValue placeholder="选择解锁模式" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">直接解锁 (看完即开)</SelectItem>
                          <SelectItem value="password">发放密码 (系统自动生成)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground leading-relaxed px-1">
                        {config.ad_unlock_mode === 'password' 
                          ? '💡 模式说明：广告完成后系统生成 6 位随机密码并在小程序展示，用户需在图集页手动输入解锁内容。' 
                          : '💡 模式说明：广告完成后系统记录解锁状态，用户点击“我已解锁”即可直接进入。'
                        }
                      </p>
                    </div>
                  </div>
                )}

                <Button onClick={handleSaveConfig} className="rounded-xl gap-2 font-bold w-full h-11">
                  <Settings className="w-4 h-4" />
                  保存基础配置
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  访问控制配置
                </CardTitle>
                <CardDescription>配置访客验证、排除规则和通用密码</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-primary/5 transition-all hover:border-primary/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-primary" />
                      仅限微信 App 访问
                    </Label>
                    <p className="text-xs text-muted-foreground">开启后，非微信内置浏览器将显示引导二维码并禁止直接访问内容</p>
                  </div>
                  <Switch 
                    checked={config.restrict_to_wechat || false} 
                    onCheckedChange={(checked) => setConfig({ ...config, restrict_to_wechat: checked })} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-primary/5 transition-all hover:border-primary/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      启用公众号获取密码
                    </Label>
                    <p className="text-xs text-muted-foreground">开启后，用户可以通过发送关键词获取图集访问密码</p>
                  </div>
                  <Switch 
                    checked={config.enable_wechat_password ?? true} 
                    onCheckedChange={(checked) => setConfig({ ...config, enable_wechat_password: checked })} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-primary/5 transition-all hover:border-primary/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      允许多用户共享浏览器
                    </Label>
                    <p className="text-xs text-muted-foreground">开启后，多个用户可在同一手机/浏览器访问图集，只要 openid 和密码匹配即可</p>
                  </div>
                  <Switch 
                    checked={config.allow_multiple_users_per_browser ?? false} 
                    onCheckedChange={(checked) => setConfig({ ...config, allow_multiple_users_per_browser: checked })} 
                  />
                </div>

                <div className="space-y-2 p-4 bg-muted/20 rounded-2xl border border-primary/5">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-primary" />
                    单日密码最大重置次数
                  </Label>
                  <Input 
                    type="number" 
                    value={config.reset_limit ?? 1} 
                    onChange={(e) => setConfig({ ...config, reset_limit: parseInt(e.target.value) || 0 })}
                    className="rounded-xl h-10 bg-white"
                  />
                  <p className="text-[10px] text-muted-foreground">用户在单日图集页内手动点击重置或通过公众号指令重置的上限次数。设为 0 则禁用重置。</p>
                </div>


                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">启用密码验证</Label>
                    <p className="text-xs text-muted-foreground">开启后，用户需输入验证码才能访问每日图集</p>
                  </div>
                  <Switch 
                    checked={config.enable_password ?? true} 
                    onCheckedChange={(checked) => setConfig({ ...config, enable_password: checked })} 
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Filter className="w-4 h-4 text-primary" />
                    排除规则 & 通用密码
                  </h3>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-2 text-muted-foreground">
                      <Key className="w-3 h-3" />
                      系统通用密码 (万能密码)
                    </Label>
                    <Input 
                      placeholder="设置后用户输入此密码也可访问 (不限时且长期有效)" 
                      value={config.universal_password || ''} 
                      onChange={(e) => setConfig({ ...config, universal_password: e.target.value })}
                      className="rounded-xl h-10 text-sm"
                    />
                  </div>
                </div>

                {config.enable_password && (
                  <div className="space-y-4 p-4 border rounded-2xl bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-bold">关键词模式</Label>
                        <p className="text-[10px] text-muted-foreground">选择公众号获取图集的关键词方式</p>
                      </div>
                      <div className="flex items-center gap-2 bg-muted p-1 rounded-xl">
                        <Button 
                          variant={config.keyword_mode === 'random' ? 'default' : 'ghost'} 
                          size="sm" 
                          onClick={() => setConfig({ ...config, keyword_mode: 'random' })}
                          className="rounded-lg h-7 text-[10px] px-2 font-bold"
                        >
                          随机数字
                        </Button>
                        <Button 
                          variant={config.keyword_mode !== 'random' ? 'default' : 'ghost'} 
                          size="sm" 
                          onClick={() => setConfig({ ...config, keyword_mode: 'fixed' })}
                          className="rounded-lg h-7 text-[10px] px-2 font-bold"
                        >
                          固定模式
                        </Button>
                      </div>
                    </div>

                    {config.keyword_mode === 'random' ? (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between bg-primary/5 p-3 rounded-xl border border-primary/10">
                          <span className="text-xs font-bold text-primary">今日随机关键词</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-primary tracking-widest text-lg">
                              {(() => {
                                const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
                                if (config.daily_random_keyword?.date === today) return config.daily_random_keyword.keyword;
                                return '未生成';
                              })()}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-primary hover:bg-primary/10 rounded-full"
                              onClick={() => {
                                const randomKeyword = Math.floor(100000 + Math.random() * 900000).toString();
                                const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
                                setConfig({
                                  ...config,
                                  daily_random_keyword: {
                                    date: today,
                                    keyword: randomKeyword
                                  }
                                });
                                toast.success('已生成新随机关键词，请记得保存配置');
                              }}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                          💡 随机模式下，点击刷新图标可生成新数字。生成后必须点击下方的“保存基础配置”按钮才会正式生效。
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold">主要获取关键词</Label>
                          <Input 
                            value={config.password_keyword} 
                            onChange={(e) => setConfig({ ...config, password_keyword: e.target.value })}
                            placeholder="今日图片"
                            className="rounded-xl h-9 bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold">服务号专属链接关键词 (限服务号)</Label>
                          <Input 
                            value={config.service_auth_keyword || '解锁'} 
                            onChange={(e) => setConfig({ ...config, service_auth_keyword: e.target.value })}
                            placeholder="解锁"
                            className="rounded-xl h-9 bg-white"
                          />
                        </div>
                        {availableKeywords.length > 0 && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground">已在微信回复中设置的关键词：</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {availableKeywords.map(k => (
                                <Badge key={k} variant="secondary" className="rounded-lg px-2 py-0 text-[10px] font-bold bg-muted-foreground/10">
                                  {k}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-xs font-bold">密码有效期 (小时)</Label>
                      <Input 
                        type="number" 
                        value={config.password_duration} 
                        onChange={(e) => setConfig({ ...config, password_duration: parseInt(e.target.value) })}
                        className="rounded-xl h-9 bg-white"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold flex items-center gap-1 text-red-500">
                      <Filter className="w-3 h-3" />
                      素材入库排除分类
                    </Label>
                    <ScrollArea className="h-32 rounded-xl border p-3 bg-muted/5">
                      <div className="grid grid-cols-2 gap-3">
                        {allCategories.map(cat => (
                          <div key={cat.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`tab-cat-${cat.id}`}
                              checked={config.excluded_categories?.includes(cat.id)}
                              onCheckedChange={(checked) => {
                                const list = config.excluded_categories || [];
                                if (checked) setConfig({ ...config, excluded_categories: [...list, cat.id] });
                                else setConfig({ ...config, excluded_categories: list.filter((id: string) => id !== cat.id) });
                              }}
                            />
                            <Label htmlFor={`tab-cat-${cat.id}`} className="text-xs truncate">{cat.name}</Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="space-y-4 pt-4 border-t">

            <Card className="rounded-3xl border-none shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LucideUpload className="w-5 h-5 text-primary" />
                  用户上传配置
                </CardTitle>
                <CardDescription>配置用户在图集页的分享上传权限与限制</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-primary/5 transition-all hover:border-primary/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      启用用户上传分享
                    </Label>
                    <p className="text-xs text-muted-foreground">开启后，用户可在图集页点击上传按钮分享图片</p>
                  </div>
                  <Switch 
                    checked={config.enable_user_upload ?? false} 
                    onCheckedChange={(checked) => setConfig({ ...config, enable_user_upload: checked })} 
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-primary" />
                      支持的图片格式
                    </Label>
                    <Input 
                      placeholder="例如: image/jpeg,image/png,image/gif" 
                      value={config.allowed_formats || ''} 
                      onChange={(e) => setConfig({ ...config, allowed_formats: e.target.value })}
                      className="rounded-xl h-10 text-sm bg-white"
                    />
                    <p className="text-[10px] text-muted-foreground">多个格式请用英文逗号分隔</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <Hash className="w-4 h-4 text-primary" />
                      单张最大文件大小 (字节)
                    </Label>
                    <Input 
                      type="number"
                      placeholder="5242880 (即 5MB)" 
                      value={config.max_file_size || 0} 
                      onChange={(e) => setConfig({ ...config, max_file_size: parseInt(e.target.value) || 0 })}
                      className="rounded-xl h-10 text-sm bg-white"
                    />
                    <p className="text-[10px] text-muted-foreground">5MB = 5 * 1024 * 1024 = 5242880 字节</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <RefreshCcw className="w-4 h-4 text-primary" />
                      单日最大上传数量
                    </Label>
                    <Input 
                      type="number"
                      value={config.max_files_per_day || 3} 
                      onChange={(e) => setConfig({ ...config, max_files_per_day: parseInt(e.target.value) || 0 })}
                      className="rounded-xl h-10 text-sm bg-white"
                    />
                    <p className="text-[10px] text-muted-foreground">每个用户每日允许提交审核的图片上限</p>
                  </div>
                </div>
              </CardContent>
            </Card>

                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      浏览量统计显示配置
                    </h3>
                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-bold">显示浏览量统计</Label>
                        <p className="text-xs text-muted-foreground">总开关，关闭后前端将不显示任何浏览统计信息</p>
                      </div>
                      <Switch 
                        checked={config.show_view_stats ?? true} 
                        onCheckedChange={(checked) => setConfig({ ...config, show_view_stats: checked })} 
                      />
                    </div>
                    {config.show_view_stats !== false && (
                      <div className="grid grid-cols-1 gap-4 p-4 border rounded-2xl bg-muted/10">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold">显示当前一起查看人数</Label>
                          <Switch 
                            checked={config.show_current_viewers ?? true} 
                            onCheckedChange={(checked) => setConfig({ ...config, show_current_viewers: checked })} 
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold">显示累计查看人数</Label>
                          <Switch 
                            checked={config.show_cumulative_views ?? true} 
                            onCheckedChange={(checked) => setConfig({ ...config, show_cumulative_views: checked })} 
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold">显示今日查看人数</Label>
                          <Switch 
                            checked={config.show_today_views ?? true} 
                            onCheckedChange={(checked) => setConfig({ ...config, show_today_views: checked })} 
                          />
                        </div>
                      </div>
                    )}
                  </div>


                  <div className="space-y-2">
                    <Label className="text-sm font-bold flex items-center gap-1 text-red-500">
                      <Hash className="w-3 h-3" />
                      素材入库排除标签
                    </Label>
                    <ScrollArea className="h-32 rounded-xl border p-3 bg-muted/5">
                      <div className="grid grid-cols-2 gap-3">
                        {allTags.map(tag => (
                          <div key={tag.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`tab-tag-${tag.id}`}
                              checked={config.excluded_tags?.includes(tag.name)}
                              onCheckedChange={(checked) => {
                                const list = config.excluded_tags || [];
                                if (checked) setConfig({ ...config, excluded_tags: [...list, tag.name] });
                                else setConfig({ ...config, excluded_tags: list.filter((n: string) => n !== tag.name) });
                              }}
                            />
                            <Label htmlFor={`tab-tag-${tag.id}`} className={cn("text-xs truncate", tag.name.includes('不入') ? "text-amber-600 font-bold" : "")}>{tag.name}</Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold flex items-center gap-1 text-slate-500">
                      系统通用密码 (万能密码)
                    </Label>
                    <Input 
                      value={config.universal_password} 
                      onChange={(e) => setConfig({ ...config, universal_password: e.target.value })}
                      placeholder="设置一个全局通用的万能密码..."
                      className="rounded-xl h-10"
                    />
                    <p className="text-[10px] text-muted-foreground">该密码可用于访问任意日期的每日图集，且不会在记录中产生锁定标识</p>
                  </div>
                </div>

                <Button onClick={handleSaveConfig} variant="secondary" className="rounded-xl gap-2 font-bold w-full h-11">
                  <CheckCircle className="w-4 h-4" />
                  保存安全配置
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  通知文案配置
                </CardTitle>
                <CardDescription>自定义前端各类提示和错误文案内容</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {(() => {
                  const msgs = config.notification_messages || {};
                  const msgFields = [
                    { key: 'browser_locked_title', label: '浏览器锁定提示标题', desc: '当用户密码被锁定到其他浏览器时，Toast 弹出的标题文案' },
                    { key: 'browser_locked_desc', label: '浏览器锁定提示详情', desc: '浏览器锁定 Toast 的详情描述文案' },
                    { key: 'wechat_exclusive_title', label: '专属密码提示标题', desc: '当用户使用不属于他的微信公众号专属密码时的 Toast 标题' },
                    { key: 'wechat_exclusive_desc', label: '专属密码提示详情', desc: '专属密码错误时的 Toast 详情描述文案' },
                    { key: 'date_mismatch_title', label: '日期不匹配提示标题', desc: '当密码日期与当前图集日期不符时的 Toast 标题' },
                    { key: 'date_mismatch_desc', label: '日期不匹配提示详情', desc: '日期不匹配时的 Toast 详情描述文案' },
                    { key: 'password_expired_title', label: '密码过期提示标题', desc: '当密码已过期时的 Toast 标题文案' },
                    { key: 'password_expired_desc', label: '密码过期提示详情', desc: '密码过期时的 Toast 详情描述文案' },
                    { key: 'invalid_password_title', label: '验证失败提示标题', desc: '通用验证失败时的 Toast 标题文案' },
                    { key: 'invalid_password_desc', label: '验证失败提示详情', desc: '通用验证失败时的 Toast 详情描述文案' },
                    { key: 'empty_password', label: '空密码提示', desc: '用户未输入密码直接点击解锁时的提示文案' },
                    { key: 'concurrent_request', label: '并发请求提示', desc: '系统检测到并发请求冲突时的提示文案' },
                    { key: 'processing_request', label: '处理中提示', desc: '上一个请求还在处理中时的提示文案' },
                    { key: 'non_2xx_error', label: '网络错误提示', desc: '后端返回非 2xx 状态码时的提示文案' },
                    { key: 'welcome_unlocked', label: '广告解锁欢迎提示', desc: '用户通过广告解锁(BYPASS)成功后显示的欢迎文案' },
                    { key: 'welcome_verified', label: '密码验证成功提示', desc: '用户通过密码验证成功后的提示文案' },
                    { key: 'page_title', label: '页面大标题', desc: '每日图集密码输入页的标题文案' },
                    { key: 'page_subtitle', label: '页面副标题', desc: '每日图集密码输入页的副标题/说明文案' },
                    { key: 'announcement_title', label: '公告栏标题', desc: '密码输入页官方公告栏的标题文案' },
                    { key: 'bottom_hint', label: '底部提示文案', desc: '密码输入页底部的小字提示文案' },
                  ];
                  return (
                    <div className="grid grid-cols-1 gap-4">
                      {msgFields.map((f) => (
                        <div key={f.key} className="space-y-1.5">
                          <Label className="text-xs font-bold flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-muted-foreground" />
                            {f.label}
                          </Label>
                          <Input
                            value={msgs[f.key] || ''}
                            onChange={(e) => {
                              const newMsgs = { ...msgs, [f.key]: e.target.value };
                              setConfig({ ...config, notification_messages: newMsgs });
                            }}
                            className="rounded-xl h-9 text-sm"
                          />
                          <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <Button onClick={handleSaveConfig} variant="secondary" className="rounded-xl gap-2 font-bold w-full h-11">
                  <CheckCircle className="w-4 h-4" />
                  保存通知配置
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={refillLogDialogOpen} onOpenChange={setRefillLogDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              自动补充分析日志
            </DialogTitle>
            <DialogDescription>
              分析最近几次自动补充待发布库的执行详情。
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                当前配置要求: <span className="font-bold text-foreground">{config.daily_count || 5}</span> 张/日
              </div>
              <Button size="sm" variant="ghost" onClick={fetchTaskLogs} disabled={taskLogsLoading} className="h-8 gap-1">
                <RefreshCw className={cn("w-3.5 h-3.5", taskLogsLoading && "animate-spin")} />
                刷新日志
              </Button>
            </div>

            <ScrollArea className="flex-1 border rounded-xl bg-muted/30">
              <div className="p-4 space-y-4">
                {taskLogsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">正在加载分析数据...</p>
                  </div>
                ) : taskLogs.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <HistoryIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    暂无自动补充记录
                  </div>
                ) : (
                  <div className="space-y-3">
                    {taskLogs.map((log) => {
                      // 尝试解析消息： "待发布库补充分析 - 总数:20, 合格:10, 清理失效:10, 实际补齐:10 (目标:20, 需补:10)"
                      const totalMatch = log.message?.match(/总数:(\d+)/);
                      const validMatch = log.message?.match(/合格:(\d+)/);
                      const invalidMatch = log.message?.match(/清理失效:(\d+)/);
                      const refilledMatch = log.message?.match(/实际补齐:(\d+)/);
                      const targetMatch = log.message?.match(/目标:(\d+)/);
                      const neededMatch = log.message?.match(/需补:(\d+)/);
                      
                      const totalCount = totalMatch ? parseInt(totalMatch[1]) : 0;
                      const validCount = validMatch ? parseInt(validMatch[1]) : 0;
                      const invalidCount = invalidMatch ? parseInt(invalidMatch[1]) : 0;
                      const refilledCount = refilledMatch ? parseInt(refilledMatch[1]) : 0;
                      const targetCount = targetMatch ? parseInt(targetMatch[1]) : (config.daily_count || 5);
                      const neededCount = neededMatch ? parseInt(neededMatch[1]) : 0;
                      
                      const isShortfall = neededCount > 0 && refilledCount < neededCount;
                      
                      return (
                        <div key={log.id} className="p-4 rounded-xl border bg-card hover:border-primary/30 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="h-5 px-1.5 text-[10px]">
                                {log.status === 'success' ? '成功' : '失败'}
                              </Badge>
                              <span className="text-xs font-medium text-muted-foreground">
                                {formatBeijingTime(log.execution_time)}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              耗时: {log.duration_ms}ms
                            </span>
                          </div>
                          
                          <div className="text-sm font-medium mb-3">
                            {log.message}
                          </div>

                          {log.status === 'success' && (
                            <div className="grid grid-cols-4 gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">库总数</p>
                                <p className="text-sm font-black">{totalCount}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">合格</p>
                                <p className="text-sm font-black text-green-600">{validCount}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">已清理</p>
                                <p className="text-sm font-black text-amber-600">{invalidCount}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">实际补齐</p>
                                <p className={cn("text-sm font-black", isShortfall ? "text-amber-500" : "text-green-600")}>
                                  {refilledCount}
                                </p>
                              </div>
                              {isShortfall && (
                                <div className="col-span-4 pt-2 mt-1 border-t border-border/50">
                                  <div className="flex items-start gap-2 text-[11px] text-amber-600 leading-relaxed">
                                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <p>
                                      补充未达标（目标 {targetCount}，需补 {neededCount}，仅补充 {refilledCount}）。
                                      请检查图集库(Pool)是否有足够符合条件的备选素材。
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefillLogDialogOpen(false)} className="rounded-xl">
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* 随机密码生成对话框 */}
      <Dialog open={specialPwdDialogOpen} onOpenChange={setSpecialPwdDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>生成随机/特权密码</DialogTitle>
            <DialogDescription>用于在特殊场景下提供给用户的紧急访问密码</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>密码内容</Label>
              <div className="flex gap-2">
                <Input 
                  value={newSpecialPwd.password} 
                  onChange={(e) => setNewSpecialPwd({ ...newSpecialPwd, password: e.target.value })}
                  placeholder="请输入或点击生成"
                  className="rounded-xl flex-1 font-mono font-bold"
                />
                <Button variant="outline" size="icon" onClick={generateRandomPassword} className="rounded-xl">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>限定日期 (可选)</Label>
              <Input 
                type="date" 
                value={newSpecialPwd.target_date} 
                onChange={(e) => setNewSpecialPwd({ ...newSpecialPwd, target_date: e.target.value })}
                className="rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground pl-1">若留空，则该密码可查看任意日期的每日图集</p>
            </div>
            <div className="space-y-2">
              <Label>过期时间 (可选)</Label>
              <Input 
                type="datetime-local" 
                value={newSpecialPwd.expires_at} 
                onChange={(e) => setNewSpecialPwd({ ...newSpecialPwd, expires_at: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>密码类型</Label>
              <Select 
                value={newSpecialPwd.password_type} 
                onValueChange={(v) => {
                  const isOneTime = v === 'one_time';
                  const isPeriodic = v === 'periodic_single_user' || v === 'periodic_multi_user';
                  const maxUsages = isPeriodic || v === 'long_term' ? 999999 : (isOneTime ? 1 : 10);
                  setNewSpecialPwd({ 
                    ...newSpecialPwd, 
                    password_type: v, 
                    is_one_time: isOneTime,
                    max_usages: maxUsages
                  });
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="选择密码类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">1. 一次性使用 (用完即毁)</SelectItem>
                  <SelectItem value="periodic_single_user">2. 定期密码 (单用户，有效期内无限使用，首个浏览器锁定)</SelectItem>
                  <SelectItem value="periodic_multi_user">3. 定期密码 (多用户，有效期内无限使用，每个用户首个浏览器锁定)</SelectItem>
                  <SelectItem value="multi_use">4. 多次使用 (限次数，不限制浏览器)</SelectItem>
                  <SelectItem value="long_term">5. 长期使用 (有限期限内，不限制浏览器)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newSpecialPwd.password_type === 'multi_use' && (
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">限制使用次数</Label>
                  <p className="text-xs text-muted-foreground">该密码最多可被多少个不同标识验证</p>
                </div>
                <Input 
                  type="number" 
                  min={1}
                  value={newSpecialPwd.max_usages} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setNewSpecialPwd({ ...newSpecialPwd, max_usages: isNaN(val) ? 1 : Math.max(1, val) });
                  }}
                  className="w-20 h-8 rounded-lg text-center"
                />
              </div>
            )}

            <div className="space-y-4 pt-2 border-t mt-2">
              <p className="text-xs font-bold text-primary flex items-center gap-1">
                <Users className="w-3 h-3" />
                单用户频率限制
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold">单人单日限制 (次)</Label>
                  <Input 
                    type="number" 
                    min={0}
                    value={newSpecialPwd.per_user_max_daily} 
                    onChange={(e) => setNewSpecialPwd({ ...newSpecialPwd, per_user_max_daily: parseInt(e.target.value) || 0 })}
                    className="rounded-xl h-9"
                  />
                  <p className="text-[9px] text-muted-foreground">0 为不限制</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold">单人累计限制 (次)</Label>
                  <Input 
                    type="number" 
                    min={0}
                    value={newSpecialPwd.per_user_max_total} 
                    onChange={(e) => setNewSpecialPwd({ ...newSpecialPwd, per_user_max_total: parseInt(e.target.value) || 0 })}
                    className="rounded-xl h-9"
                  />
                  <p className="text-[9px] text-muted-foreground">0 为不限制</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSpecialPwdDialogOpen(false)} className="rounded-xl">
              取消
            </Button>
            <Button onClick={handleCreateSpecialPwd} disabled={loading} className="rounded-xl gap-2 font-bold">
              <CheckCircle className="w-4 h-4" />
              生成密码
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 发布对话框 */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>发布每日图集</DialogTitle>
            <DialogDescription>选择发布日期和图片，系统将自动生成访问密码</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>发布日期</Label>
              <Input 
                type="date" 
                value={publishDate} 
                onChange={(e) => setPublishDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>自定义密码（可选）</Label>
              <Input 
                value={manualPassword} 
                onChange={(e) => setManualPassword(e.target.value)}
                placeholder="留空自动生成6位数字密码"
                className="rounded-xl"
              />
            </div>
            <div className="p-4 bg-muted/30 rounded-2xl space-y-2">
              <p className="text-xs font-bold">发布说明</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• 系统将自动从媒体库中随机选择 {config.daily_count} 张符合条件的图片 (排除限制级)</li>
                <li>• 密码有效期为 {config.password_duration} 小时</li>
                <li>• 用户通过微信公众号发送"{config.password_keyword}"获取密码</li>
                <li>• 服务号用户发送"{config.service_auth_keyword || '解锁'}"获取专属访问链接</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPublishDialogOpen(false)} className="rounded-xl">
              取消
            </Button>
            <Button onClick={handlePublish} disabled={loading} className="rounded-xl gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              立即发布
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 访客详情对话框 */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col rounded-3xl p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              访客详情
            </DialogTitle>
            <DialogDescription>
              查看该发布日期的所有访问记录和用户信息
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {logsLoading && logs.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : logs.length > 0 ? (
              <div className="space-y-4">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-bold">访问者</TableHead>
                      <TableHead className="font-bold">绑定状态</TableHead>
                      <TableHead className="font-bold">OpenID</TableHead>
                      <TableHead className="font-bold">访问密码</TableHead>
                      <TableHead className="font-bold">访问时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {log.profile_username ? (
                              <>
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden ring-1 ring-primary/20">
                                  {log.profile_avatar_url ? (
                                    <ProtectedMedia 
                                      src={log.profile_avatar_url} 
                                      alt="" 
                                      className="w-full h-full object-cover" 
                                      type="image"
                                      ruleKey="审核"
                                    />
                                  ) : (
                                    log.profile_username[0]
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold">{log.profile_username}</span>
                                  <span className="text-[10px] text-muted-foreground truncate w-24">
                                    {log.is_linked ? '正式用户' : '微信粉丝'}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground italic text-xs">
                                <Users className="w-4 h-4" />
                                游客访问
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.is_linked ? (
                            <Badge className="bg-green-500/10 text-green-600 border-none hover:bg-green-500/20 text-[10px] py-0 px-2 h-5">已绑定</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 px-2 h-5 opacity-50">未绑定</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground">
                          {log.user_openid ? (
                            <div className="flex items-center gap-1 group">
                              <span title={log.user_openid}>{log.user_openid.substring(0, 8)}...{log.user_openid.substring(log.user_openid.length - 4)}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  navigator.clipboard.writeText(log.user_openid);
                                  toast.success('OpenID 已复制');
                                }}
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{log.password_used || '-'}</code>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatBeijingTime(log.accessed_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {logsTotal > logsLimit && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={logsPage === 0} 
                      onClick={() => setLogsPage(p => p - 1)}
                      className="h-8 rounded-xl text-xs"
                    >
                      上一页
                    </Button>
                    <span className="text-[10px] text-muted-foreground">
                      第 {logsPage + 1} / {Math.ceil(logsTotal / logsLimit)} 页
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={(logsPage + 1) * logsLimit >= logsTotal} 
                      onClick={() => setLogsPage(p => p + 1)}
                      className="h-8 rounded-xl text-xs"
                    >
                      下一页
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-bold">暂无访客记录</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-black">编辑每日图集</DialogTitle>
            <DialogDescription>修改发布日期为 {editingPost?.post_date} 的发布记录</DialogDescription>
          </DialogHeader>
          {editingPost && (
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold">访问密码</Label>
                <Input 
                  value={editingPost.password} 
                  onChange={(e) => setEditingPost({ ...editingPost, password: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold">密码有效期至</Label>
                <Input 
                  type="datetime-local" 
                  value={editingPost.password_expires_at} 
                  onChange={(e) => setEditingPost({ ...editingPost, password_expires_at: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="is_published" 
                  checked={editingPost.is_published}
                  onCheckedChange={(checked) => setEditingPost({ ...editingPost, is_published: !!checked })}
                />
                <Label htmlFor="is_published" className="text-sm font-bold cursor-pointer">已发布</Label>
              </div>
              <div className="p-4 bg-muted/30 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold">已选图片 ({editingPost.image_ids?.length || 0})</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsManagingImages(true)}
                    className="h-7 rounded-xl text-[10px] font-bold"
                  >
                    管理素材库
                  </Button>
                </div>
                {editingPost.image_ids?.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {editingPost.image_ids.map((id: string) => {
                      const img = editingPostFullImages.find(i => i.id === id);
                      return (
                        <div key={id} className="relative aspect-square rounded-lg overflow-hidden border border-border/50 group">
                          <ProtectedMedia 
                            src={img?.url || id}
                            type="image"
                            alt="Thumbnail"
                            className="w-full h-full object-cover"
                            isThumbnail
                            ruleKey="审核"
                          />
                          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <button 
                              onClick={() => {
                                setEditingImage({ ...img, id });
                                setImageEditDialogOpen(true);
                              }}
                              className="p-0.5 bg-primary/90 hover:bg-primary text-white rounded-full shadow-sm"
                              title="编辑图片信息"
                            >
                              <Settings className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => toggleImageForPost(id)}
                              className="p-0.5 bg-red-500/90 hover:bg-red-500 text-white rounded-full shadow-sm"
                              title="从图集移除"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic py-4 text-center">暂无图片，请从素材库选择</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="p-6 pt-2 border-t bg-muted/10">
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)} className="rounded-xl">
              取消
            </Button>
            <Button onClick={handleUpdatePost} disabled={loading} className="rounded-xl gap-2 font-bold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 管理素材库对话框 (用于编辑现有发布) */}
      <Dialog open={isManagingImages} onOpenChange={setIsManagingImages}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              管理图集图片
            </DialogTitle>
            <DialogDescription>
              从素材库中选择或取消选择图片。已发布的图集至少需要一张图片。
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
            <div className="flex items-center gap-4 bg-muted/30 p-3 px-4 rounded-2xl">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input 
                placeholder="搜索素材库..." 
                className="border-none bg-transparent h-6 focus-visible:ring-0 text-xs p-0 flex-1"
                value={editingPoolSearch}
                onChange={(e) => {
                  setEditingPoolSearch(e.target.value);
                  setEditingPoolPage(0);
                }}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAutoRefill}
                disabled={loading}
                className="h-8 rounded-xl text-[10px] font-bold gap-1.5 shrink-0 bg-white"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 text-primary" />}
                一键补齐
              </Button>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {editingImagesPool.map((img) => {
                const isSelected = editingPost?.image_ids?.includes(img.id);
                return (
                  <div 
                    key={img.id}
                    onClick={() => {
                      toggleImageForPost(img.id);
                      if (!editingPost?.image_ids?.includes(img.id)) {
                        setEditingPostFullImages(prev => [...prev, img]);
                      }
                    }}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-primary ring-2 ring-primary/20 scale-[0.98]' : 'border-transparent opacity-80 hover:opacity-100 hover:scale-[1.02]'}`}
                  >
                    <ProtectedMedia 
                      src={img.url} 
                      type="image" 
                      alt="" 
                      className="w-full h-full object-cover" 
                      isThumbnail 
                      ruleKey="审核"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {editingPoolTotal > editingPoolLimit && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditingPoolPage(prev => Math.max(0, prev - 1))}
                  disabled={editingPoolPage === 0}
                  className="rounded-xl h-8 px-4"
                >
                  上一页
                </Button>
                <span className="text-xs font-bold text-muted-foreground">
                  第 {editingPoolPage + 1} 页 / 共 {Math.ceil(editingPoolTotal / editingPoolLimit)} 页
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditingPoolPage(prev => prev + 1)}
                  disabled={(editingPoolPage + 1) * editingPoolLimit >= editingPoolTotal}
                  className="rounded-xl h-8 px-4"
                >
                  下一页
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 bg-muted/10 border-t border-border/40">
            <Button variant="default" onClick={() => setIsManagingImages(false)} className="rounded-xl font-bold px-8 shadow-lg shadow-primary/20">
              完成选择
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">批量导入密码</DialogTitle>
            <DialogDescription>
              下载模板并按照格式填写后上传 Excel 文件进行批量导入
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6 text-center">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet className="w-10 h-10 text-primary" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-2xl text-left space-y-2">
                <p className="text-xs font-bold flex items-center gap-2">
                  <Info className="w-3 h-3" />
                  导入提示
                </p>
                <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-1">
                  <li>必须包含“密码”列</li>
                  <li>“适用日期”可选格式为 YYYY-MM-DD，留空为通用</li>
                  <li>“一次性”列填写“是”或“否”</li>
                  <li>导入后将立即生效</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleDownloadImportTemplate}
                  className="w-full rounded-2xl h-12 gap-2 border-primary/20 hover:bg-primary/5 font-bold"
                >
                  <Download className="w-4 h-4" />
                  下载 Excel 导入模板
                </Button>
                
                <div className="relative">
                  <input
                    type="file"
                    id="import-special-pwds-dialog"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".xlsx, .xls"
                    onChange={(e) => {
                      handleImportSpecialPwds(e);
                      setImportDialogOpen(false);
                    }}
                  />
                  <Button 
                    type="button"
                    onClick={() => document.getElementById('excel-upload-input')?.click()}
                    className="w-full rounded-2xl h-12 gap-2 font-bold"
                  >
                    <Upload className="w-4 h-4" />
                    选择并上传 Excel 文件
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 图片元数据编辑对话框 */}
      <Dialog open={imageEditDialogOpen} onOpenChange={setImageEditDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>编辑图片信息</DialogTitle>
            <DialogDescription>修改图集中该图片的标题和描述</DialogDescription>
          </DialogHeader>
          {editingImage && (
            <div className="space-y-4">
              <div className="aspect-square rounded-2xl overflow-hidden border border-border/50">
                <ProtectedMedia 
                  src={editingImage.url}
                  type="image"
                  alt="Preview"
                  className="w-full h-full object-cover"
                  isThumbnail
                  ruleKey="审核"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">标题</Label>
                <Input 
                  value={editingImage.title || ''} 
                  onChange={(e) => setEditingImage({ ...editingImage, title: e.target.value })}
                  placeholder="图片标题"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">描述</Label>
                <Input 
                  value={editingImage.description || ''} 
                  onChange={(e) => setEditingImage({ ...editingImage, description: e.target.value })}
                  placeholder="图片描述"
                  className="rounded-xl"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImageEditDialogOpen(false)} className="rounded-xl">
              取消
            </Button>
            <Button onClick={handleUpdateMediaItem} disabled={loading} className="rounded-xl gap-2 font-bold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 审核弹窗 */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle>审核用户分享</DialogTitle>
            <DialogDescription>请确认图片内容是否符合发布标准</DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4 py-4">
              <div className="aspect-square rounded-2xl overflow-hidden border border-muted shadow-sm">
                <ProtectedMedia 
                  src={selectedSubmission.image_url} 
                  type="image" 
                  className="w-full h-full object-contain bg-black" 
                  ruleKey="none"
                />
              </div>
              <div className="bg-muted/30 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">上传用户:</span>
                  <span className="font-bold">{selectedSubmission.profiles?.username || '未知'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">提交日期:</span>
                  <span className="font-bold">{formatBeijingTime(selectedSubmission.created_at)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejection-reason" className="text-xs font-bold text-muted-foreground ml-1">拒绝理由（选填）</Label>
                <Textarea 
                  id="rejection-reason"
                  placeholder="如果拒绝，请说明原因..."
                  className="rounded-2xl bg-muted/20 border-none min-h-[80px]"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              className="flex-1 rounded-2xl border-rose-200 text-rose-500 hover:bg-rose-50"
              onClick={() => handleReviewSubmission('rejected')}
              disabled={loading}
            >
              拒绝
            </Button>
            <Button 
              className="flex-1 rounded-2xl bg-green-500 hover:bg-green-600 text-white"
              onClick={() => handleReviewSubmission('approved')}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              通过并发布
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 图片大图预览 */}
      <Dialog open={!!previewImageUrl} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-transparent border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            {previewImageUrl && (
              <ProtectedMedia 
                src={previewImageUrl} 
                type="image" 
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" 
                ruleKey="none"
              />
            )}
            <Button 
              size="icon" 
              variant="secondary" 
              className="absolute top-4 right-4 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={() => setPreviewImageUrl(null)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 批量拒绝原因弹窗 */}
      <Dialog open={batchReviewDialogOpen} onOpenChange={setBatchReviewDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">批量拒绝审核</DialogTitle>
            <DialogDescription className="text-xs">
              请说明拒绝这 {submissionSelectedIds.length} 个作品的原因，该信息将反馈给用户。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold">拒绝理由</Label>
              <Textarea 
                placeholder="请输入拒绝理由..." 
                className="rounded-2xl min-h-[100px]"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <div className="bg-rose-50 p-3 rounded-2xl flex items-start gap-3">
              <Info className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-rose-600 leading-relaxed">
                拒绝后用户可以在“我的记录”中看到失败原因。
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setBatchReviewDialogOpen(false)} disabled={loading}>取消</Button>
            <Button 
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
              onClick={() => handleBatchReview('rejected')}
              disabled={loading || !rejectionReason}
            >
              确认批量拒绝
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
