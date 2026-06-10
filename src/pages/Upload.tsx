import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Tesseract from 'tesseract.js';

import { api } from '@/db/api';
import { cn, sanitizeFileName } from '@/lib/utils';
import SparkMD5 from 'spark-md5';

import { rbacApi } from '@/db/rbac';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ImagePlus, Video, X, Loader2, CheckCircle2, AlertCircle, Link as LinkIcon, Download, Info, ShieldAlert, PlayCircle, RefreshCw, Settings, Search, Image as ImageIcon, Upload as LucideUpload, Layers, BookOpen, FolderPlus, Edit3, Plus, Minus, FolderOpen, CheckSquare, Trash2 } from 'lucide-react';
import { Zap as LucideZap } from 'lucide-react';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check } from 'lucide-react';



import { CircularProgress } from '@/components/ui/circular-progress';
import { extractVideoFrame, getZoneramaProxyUrl, extractZoneramaAlbumId, extractZoneramaPhotoId, getZoneramaOriginalUrl, optimizeXiaohongshuUrl, initZoneramaPhotoApi } from '@/lib/media';
import { useRealtimeMediaUpdates } from '@/hooks/useRealtimeMediaUpdates';

// 导入重构后的子组件
import { AlbumConfig } from './upload/components/AlbumConfig';
import { TagSelector, QuickTagGroup } from './upload/components/TagSelectors';
import { FilePreviewCard } from './upload/components/FilePreviewCard';
import { StorageSelector } from './upload/components/StorageSelector';
import { UploadDialogs } from './upload/components/UploadDialogs';
import { 
  calculateFileMD5, 
  runWithLimit, 
  extractVideoThumbnail, 
  generateImageThumbnail, 
  generateDefaultTitle,
  checkZoneramaExistence,
  checkUrlExistence,
  checkMd5Existence
} from './upload/uploadUtils';

// 批量检查 Zonerama 图片是否已存在于数据库
const getZoneramaIdFromUrl = (url: string) => {
  return extractZoneramaPhotoId(url) || null;
};



// 限制并发执行的工具函数



export default function Upload() {
  useEffect(() => {
    (window as any).pixelTrack?.('upload_view');
  }, []);

  const [files, setFiles] = useState<{ 
    file: File; 
    preview: string; 
    id: string; 
    status: 'idle' | 'uploading' | 'success' | 'error' | 'duplicate'; 
    progress: number; 
    errorMsg?: string;
    thumbnailBlob?: Blob; // 视频自动截取的缩略图
    thumbnailPreview?: string; // 缩略图预览
    manualThumbnailBlob?: Blob; // 用户手动上传的封面
    thumbnailOptions?: string[]; // 可选缩略图预览
    thumbnailBlobs?: Blob[]; // 可选缩略图数据
    md5?: string; // 文件 MD5 哈希值
    contentHash?: string; // 图片内容哈希值
  }[]>([]);

  // 计算图片视觉哈希 (Average Hash)
  const calculateVisualHash = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        resolve('');
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          return reject(new Error('Canvas error'));
        }
        
        const size = 8;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        const grays = new Uint8Array(size * size);
        
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          // 灰度公式: 0.299R + 0.587G + 0.114B
          const gray = Math.floor(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          grays[i / 4] = gray;
          sum += gray;
        }
        
        const avg = sum / (size * size);
        let hash = "";
        for (const g of grays) {
          hash += g >= avg ? "1" : "0";
        }
        
        let hex = "";
        for (let i = 0; i < hash.length; i += 4) {
          hex += parseInt(hash.substring(i, i + 4), 2).toString(16);
        }
        
        URL.revokeObjectURL(url);
        resolve(hex);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片加载失败'));
      };
      
      img.src = url;
    });
  };

  // 使用 Ref 追踪最新的 files 状态，解决并发上传时的闭包陈旧数据问题
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  const [batchCategory, setBatchCategory] = useState<string>('all');
  const [batchTags, setBatchTags] = useState<string>('');
  const [categories, setCategories] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAllSuccess, setIsAllSuccess] = useState(false);
  const [isAnyUploading, setIsAnyUploading] = useState(false);
  const [batchUrls, setBatchUrls] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showIframeUpload, setShowIframeUpload] = useState(false);
  const [iframeLoadFailed, setIframeLoadFailed] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [clipboardLinks, setClipboardLinks] = useState<string[]>([]);
  const [importPreviews, setImportPreviews] = useState<{
    id?: string;
    url: string;
    type: 'image' | 'video' | 'unknown';
    thumbnailBlob?: Blob;
    thumbnailPreview?: string;
    remoteThumbnailUrl?: string; // 远程封面 URL
    isCover?: boolean; // 是否是封面资源
    loading: boolean;
    previewUrl?: string;
    exists?: boolean;
    photo_id?: string;
    standardizedUrl?: string;
  }[]>([]);
  const [selectedImportUrls, setSelectedImportUrls] = useState<Set<string>>(new Set());
  const [permissions, setPermissions] = useState<string[]>([]);
  const [canLinkImport, setCanLinkImport] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(true);
  const [storageConfig, setStorageConfig] = useState<any>(null);
  const [thumbnailSelectFileId, setThumbnailSelectFileId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [superbedConfig, setSuperbedConfig] = useState<any>(null);
  const [selectedStorage, setSelectedStorage] = useState<'r2' | 'superbed'>('r2');
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isWorkerEnabled, setIsWorkerEnabled] = useState(false);
  const [isR2S3Enabled, setIsR2S3Enabled] = useState(false);
  const [isUploadAvailable, setIsUploadAvailable] = useState(true);

  const [bloggerImage, setBloggerImage] = useState<string | null>(null);

  // 使用 Realtime 监听用户上传内容的审核状态
  useRealtimeMediaUpdates({
    userId: user?.id,
    enabled: !!user
    // 通知已经在 hook 内部自动显示了
  });

  useEffect(() => {
    if (!user) {
      toast.info('上传功能需要先登录');
      const from = encodeURIComponent(window.location.pathname + window.location.search);
      navigate(`/login?from=${from}`);
    }
  }, [user, navigate]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadMode, setUploadMode] = useState<'wallpaper' | 'album'>('wallpaper');
  const [albums, setAlbums] = useState<any[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('new');
  const [albumId, setAlbumId] = useState<string>('');
  const [newAlbumData, setNewAlbumData] = useState<any>({
    title: '',
    album_type: '',
    description: '',
    cover_url: '',
    auto_pdf_enabled: false,
    level: 'pt'
  });
  const [albumPhotoLevels, setAlbumPhotoLevels] = useState<Record<string, 'normal' | 'non_restricted' | 'restricted'>>({});
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [parseUrl, setParseUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [activeTab, setActiveTab] = useState('local');

  const location = useLocation();

  // 处理 URL 参数，支持自动填充解析链接
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const url = params.get('url');
    
    if (tab === 'parse' || tab === 'link') {
      setActiveTab('parse');
      if (url) {
        setParseUrl(decodeURIComponent(url));
        // 自动聚焦输入框
        setTimeout(() => {
          const input = document.getElementById('parse-url');
          if (input) input.focus();
        }, 500);
      }
    } else if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  // 从对象中根据路径获取值的辅助函数
  const getValueByPath = (obj: any, path: string): any => {
    if (!path || !obj) return null;
    
    // 支持多路径，使用逗号分隔
    if (path.includes(',')) {
      const paths = path.split(',').map(p => p.trim());
      const results = paths.map(p => {
        const val = getValueByPath(obj, p);
        if (val !== null && val !== undefined) return val;
        // 如果路径解析不到且不包含点(表示不是复杂路径)，且不以 [ 开头，则视为字面量字符串
        if (!p.includes('.') && !p.startsWith('[')) return p;
        return null;
      }).filter(v => v !== null && v !== undefined);
      if (results.length === 0) return null;
      // 如果全是数组，则展开合并；否则转为字符串并用逗号拼接
      if (results.every(r => Array.isArray(r))) {
        return results.flat();
      }
      return results.map(r => String(r)).join(',');
    }

    return path.split('.').reduce((acc, part) => {
      if (acc === null || acc === undefined) return undefined;
      const arrayMatch = part.match(/(.+)\[(\d+)\]/);
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch;
        const array = acc[arrayName];
        return Array.isArray(array) ? array[parseInt(index)] : undefined;
      }
      return acc[part];
    }, obj);
  };

  // 数据清理与替换辅助函数
  const applyCleaningRules = (value: any, field: string, rules: any[]) => {
    if (!value || !rules || rules.length === 0) return value;
    
    let result = value;
    const fieldRules = rules.filter(r => r.field === field);
    
    for (const rule of fieldRules) {
      if (typeof result === 'string') {
        if (rule.use_regex) {
          try {
            const regex = new RegExp(rule.pattern, 'g');
            result = result.replace(regex, rule.replacement);
          } catch (e) {
            console.error('Regex error:', e);
          }
        } else {
          // 通配符处理：简单的 * 替换
          const pattern = rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
          if (rule.pattern.includes('*')) {
            try {
              const regex = new RegExp(pattern, 'g');
              result = result.replace(regex, rule.replacement);
            } catch (e) {
              result = result.split(rule.pattern).join(rule.replacement);
            }
          } else {
            result = result.split(rule.pattern).join(rule.replacement);
          }
        }
      } else if (Array.isArray(result)) {
        result = result.map(v => applyCleaningRules(v, field, [rule]));
      }
    }
    return result;
  };

  const handleParseImport = async () => {
    let targetUrlInput = parseUrl.trim();
    
    // 如果没有输入，尝试从剪贴板粘贴
    if (!targetUrlInput) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          targetUrlInput = text.trim();
          setParseUrl(targetUrlInput);
          toast.success('已自动从剪贴板获取内容');
        } else {
          toast.error('请输入解析网址或确保剪贴板有内容');
          return;
        }
      } catch (err) {
        toast.error('请输入需要解析的网址');
        return;
      }
    }

    // 提取所有真正的 URL，支持批量
    const extractUrls = (text: string) => {
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const matches = text.match(urlRegex);
      return matches ? Array.from(new Set(matches)) : [];
    };
    
    const urlsToParse = extractUrls(targetUrlInput);
    if (urlsToParse.length === 0) {
      toast.error('未在输入内容中发现有效的网址');
      return;
    }

    const { optimizeXiaohongshuUrl } = await import('@/lib/media');
    setIsParsing(true);
    
    try {
      const { data: configs, error: configError } = await (supabase as any)
        .from('parse_import_configs')
        .select('*')
        .eq('status', 'enabled')
        .order('serial_number', { ascending: true });

      if (configError) throw configError;
      if (!configs || configs.length === 0) {
        throw new Error('未配置解析接口，请联系管理员');
      }

      let allFoundLinks: string[] = [];
      let firstTitle = '';
      let firstDesc = '';
      let allTags = new Set<string>();

      // 批量解析
      for (let i = 0; i < urlsToParse.length; i++) {
        let targetParseUrl = optimizeXiaohongshuUrl(urlsToParse[i]);
        
        let matchedConfig = (configs as any[]).find(c => c.match_pattern && targetParseUrl.includes(c.match_pattern));
        
        const attemptParse = async (config: any) => {
          const { data, error } = await supabase.functions.invoke('parse-import-proxy', {
            body: { apiUrl: config.api_url, targetUrl: targetParseUrl }
          });
          if (error) {
            const errorMsg = await error?.context?.text();
            throw new Error(errorMsg || error.message);
          }
          return { data, config };
        };

        let parseResult: any = null;
        let finalConfig: any = null;

        if (matchedConfig) {
          try {
            const res = await attemptParse(matchedConfig);
            parseResult = res.data;
            finalConfig = res.config;
          } catch (err) {
            console.warn(`Matched config for URL ${i+1} failed, trying others...`, err);
          }
        }

        if (!parseResult) {
          for (const config of (configs as any[])) {
            if (matchedConfig && config.id === matchedConfig.id) continue;
            try {
              const res = await attemptParse(config);
              parseResult = res.data;
              finalConfig = res.config;
              break; 
            } catch (err) {
              console.warn(`Polling config ${config.name} for URL ${i+1} failed:`, err);
            }
          }
        }

        if (parseResult && finalConfig) {
          const mapping = finalConfig.field_mapping;
          const rules = finalConfig.cleaning_rules || [];
          const extracted = {
            title: applyCleaningRules(getValueByPath(parseResult, mapping.title), 'title', rules),
            tags: applyCleaningRules(getValueByPath(parseResult, mapping.tags), 'tags', rules),
            images: applyCleaningRules(getValueByPath(parseResult, mapping.images), 'images', rules),
            video: applyCleaningRules(getValueByPath(parseResult, mapping.video), 'video', rules),
            description: applyCleaningRules(getValueByPath(parseResult, mapping.description), 'description', rules),
            author: applyCleaningRules(getValueByPath(parseResult, mapping.author), 'author', rules),
          };

          if (extracted.title && !firstTitle) {
            firstTitle = String(extracted.title);
            if (extracted.author) firstTitle = `[${extracted.author}] ${firstTitle}`;
          }
          
          if (extracted.description && !firstDesc) {
            firstDesc = String(extracted.description);
          }

          if (extracted.tags) {
            const tags = Array.isArray(extracted.tags) ? extracted.tags : String(extracted.tags).split(/[ ,，\n]/);
            tags.forEach(t => t && allTags.add(String(t).trim()));
          }

          if (extracted.video) allFoundLinks.push(String(extracted.video));
          if (extracted.images) {
            if (Array.isArray(extracted.images)) {
              allFoundLinks.push(...extracted.images.map(img => String(img)));
            } else {
              allFoundLinks.push(String(extracted.images));
            }
          }
        }
      }

      if (allFoundLinks.length > 0) {
        if (firstTitle) setTitle(firstTitle);
        if (firstDesc) setDescription(firstDesc);
        if (allTags.size > 0) setBatchTags(Array.from(allTags).join(', '));
        
        setBatchUrls(allFoundLinks.join('\n'));
        setActiveTab('remote');
        toast.success(`批量解析完成，共提取 ${allFoundLinks.length} 个资源`);
      } else {
        throw new Error('未发现可导入资源，请检查网址或重试');
      }

    } catch (err: any) {
      toast.error('解析失败: ' + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const [albumCustomFieldValues, setAlbumCustomFieldValues] = useState<Record<string, any>>({});
  const [isNewAlbumCoverUploading, setIsNewAlbumCoverUploading] = useState(false);

  const [ocrResults, setOcrResults] = useState<string[]>([]);
  const [ocrLines, setOcrLines] = useState<string[]>([]);
  const [selectedOcrSegments, setSelectedOcrSegments] = useState<string[]>([]);


  const [adminZoneramaAlbumId, setAdminZoneramaAlbumId] = useState('');
  const [adminZoneramaSession, setAdminZoneramaSession] = useState('');
  const [adminZoneramaFiles, setAdminZoneramaFiles] = useState<File[]>([]);
  const [isAdminZoneramaUploading, setIsAdminZoneramaUploading] = useState(false);
  const [zoneramaUploadProgress, setZoneramaUploadProgress] = useState<Record<number, number>>({});
  
  // Zonerama 相册导入
  const [zoneramaAlbumIdInput, setZoneramaAlbumIdInput] = useState('');
  const [isLoadingZoneramaAlbum, setIsLoadingZoneramaAlbum] = useState(false);
  
  // 草稿恢复：页面加载时从 localStorage 恢复草稿
  useEffect(() => {
    const draftKey = `upload_draft_${user?.id || 'guest'}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        const age = Date.now() - (draft.timestamp || 0);
        // 草稿有效期 2 小时
        if (age < 2 * 60 * 60 * 1000) {
          const hasRealDraft = draft.title || draft.batchTags || (draft.batchCategory && draft.batchCategory !== 'all') || (draft.batchUrls && draft.batchUrls.trim() !== '');
          if (draft.batchCategory) setBatchCategory(draft.batchCategory);
          if (draft.batchTags) setBatchTags(draft.batchTags);
          if (draft.title) setTitle(draft.title);
          if (draft.uploadMode) setUploadMode(draft.uploadMode);
          if (draft.selectedAlbumId) setSelectedAlbumId(draft.selectedAlbumId);
          if (draft.selectedStorage) setSelectedStorage(draft.selectedStorage);
          if (draft.batchUrls) setBatchUrls(draft.batchUrls);
          
          if (hasRealDraft) {
            toast.success('已恢复上次编辑的草稿');
          }
        } else {
          // 草稿过期，清除
          localStorage.removeItem(draftKey);
        }
      } catch (e) {
        console.error('恢复草稿失败:', e);
      }
    }
  }, [user]);
  
  // 草稿保存：当关键数据变化时自动保存到 localStorage
  useEffect(() => {
    if (!user) return;
    
    const draftKey = `upload_draft_${user.id}`;
    const draft = {
      batchCategory,
      batchTags,
      title,
      uploadMode,
      selectedAlbumId,
      selectedStorage,
      batchUrls,
      timestamp: Date.now()
    };
    
    // 防抖保存，避免频繁写入
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [user, batchCategory, batchTags, title, uploadMode, selectedAlbumId, selectedStorage, batchUrls]);
  
  // 从后台加载专享上传配置
  useEffect(() => {
    const loadZoneramaConfig = async () => {
      try {
        const { data } = await api.getSystemConfig('zonerama_upload_config');
        if (data?.value) {
          setAdminZoneramaAlbumId(data.value.album_id || '');
          setAdminZoneramaSession(data.value.session || '');
        }
      } catch (error) {
        console.error('加载专享上传配置失败:', error);
        toast.error('加载专享上传配置失败，请前往后台设置');
      }
    };
    if (isAdmin) {
      loadZoneramaConfig();
    }
  }, [isAdmin]);

  const handleAdminZoneramaUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminZoneramaFiles.length === 0) return toast.error('请选择文件');
    
    if (!adminZoneramaAlbumId) {
      return toast.error('未配置 Zonerama 相册 ID，请前往后台管理 → 系统参数设置 → 存储管理 → 专享上传 进行配置');
    }
    
    setIsAdminZoneramaUploading(true);
    const loadingToast = toast.loading(`准备上传 ${adminZoneramaFiles.length} 个文件...`);
    
    let successCount = 0;
    let failCount = 0;
    const uploadedPhotoDatas: any[] = [];
    const wallpaperItems: any[] = [];

    try {
      // 获取 Zonerama 配置
      const { data: configData } = await api.getSystemConfig('zonerama_upload_config');
      const zoneramaConfig = configData?.value || {};
      const urlMode = zoneramaConfig.url_mode || 'id';
      const photoApi = zoneramaConfig.photo_api || '';
      const cleanApi = photoApi ? photoApi.split('?')[0] : '';

      // 如果是图集模式且选了“新建图集”
      let currentAlbumId = selectedAlbumId;
      if (uploadMode === 'album' && selectedAlbumId === 'new') {
        if (!newAlbumData.title) {
          toast.error('请输入图集名称', { id: loadingToast });
          setIsAdminZoneramaUploading(false);
          return;
        }
        
        const { data: album, error: albumError } = await supabase.from('photo_albums').insert({
          ...newAlbumData,
          custom_field_values: albumCustomFieldValues
        } as any).select().single();
        
        if (albumError) throw albumError;
        currentAlbumId = (album as any).id;
      }

      // 降低外链图床并发，防止被防火墙拦截或请求超时
      await runWithLimit(3, adminZoneramaFiles, async (file, i) => {
        setZoneramaUploadProgress(prev => ({ ...prev, [i]: 0 }));
        toast.loading(`正在上传第 ${i + 1}/${adminZoneramaFiles.length} 个文件...`, { id: loadingToast });
        
        try {
          const isVideo = file.type.startsWith('video/');
          
          // 使用 Cloudflare Worker 接口：直接传文件二进制数据
          // 注意：必须在 URL 中携带文件名和文件大小等必要元数据
          // 同时包含分片参数以兼容某些后端逻辑
          let uploadUrl = `https://zonerama.wo58.cn/upload?albumId=${adminZoneramaAlbumId}&name=${encodeURIComponent(file.name)}&fileSize=${file.size}&chunk=0&chunks=1&offset=0`;
          if (adminZoneramaSession) {
            uploadUrl += `&session=${adminZoneramaSession}`;
          }

          console.log(`上传文件: ${file.name}, 类型: ${file.type}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB, 是否视频: ${isVideo}`);

          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: file, // 直接传文件二进制数据，不使用 FormData
            headers: {
              'Content-Type': file.type || 'application/octet-stream'
            }
          }).catch(err => {
            console.error('网络请求失败:', err);
            throw new Error(`网络请求失败: ${err.message}`);
          });

          setZoneramaUploadProgress(prev => ({ ...prev, [i]: 50 }));

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('上传响应错误:', uploadResponse.status, errorText);
            throw new Error(`上传失败 (${uploadResponse.status}): ${errorText || '服务器错误'}`);
          }

          const uploadResult = await uploadResponse.json();
          console.log('上传结果:', uploadResult);
          
          if (uploadResult.Error) {
            throw new Error(uploadResult.Error);
          }

          // 处理不同格式的返回数据
          let finalImageUrl = uploadResult.imageUrl;
          let photoId = uploadResult.id || uploadResult.Id || uploadResult.photoId;

          // 从返回的 URL 或 Pattern 中提取 ID 和尺寸
          const extractIdAndSize = (str: string) => {
            if (!str) return null;
            const match = str.match(/\/photos\/(?:public\/)?(\d+)_(\d+)x(\d+)_/);
            if (match) {
              return { id: match[1], width: parseInt(match[2]), height: parseInt(match[3]) };
            }
            // 如果没有尺寸信息，只提取 ID
            const idMatch = str.match(/\/photos\/(?:public\/)?(\d+)_/);
            return idMatch ? { id: idMatch[1], width: null, height: null } : null;
          };

          let sizeInfo = extractIdAndSize(finalImageUrl) || extractIdAndSize(uploadResult.ImagePattern);
          
          if (!photoId && sizeInfo) {
            photoId = sizeInfo.id;
          }

          console.log('提取的 photoId 和尺寸:', { photoId, sizeInfo });
          
          if (isVideo) {
            // 视频：使用 Zonerama VideoPlayer 链接
            if (photoId) {
              finalImageUrl = `https://us.zonerama.com/VideoPlayer/${photoId}`;
              console.log('视频链接:', finalImageUrl);
            } else {
              console.warn('视频上传成功但未获取到 photoId');
            }
          } else {
            // 图片：根据实际尺寸构造 URL
            if (photoId) {
              if (sizeInfo && sizeInfo.width && sizeInfo.height) {
                // 使用实际尺寸
                finalImageUrl = `https://us.zonerama.com/photos/${photoId}_${sizeInfo.width}x${sizeInfo.height}_0.jpg`;
                console.log('使用实际尺寸:', sizeInfo.width, 'x', sizeInfo.height);
              } else {
                // 兜底：使用默认尺寸 2000x2000
                finalImageUrl = `https://us.zonerama.com/photos/${photoId}_2000x2000_0.jpg`;
                console.log('使用默认尺寸: 2000x2000');
              }
            } else if (!finalImageUrl && uploadResult.ImagePattern) {
              // 兜底：如果没拿到 ID 但有 Pattern
              finalImageUrl = uploadResult.ImagePattern.replace('{width}x{height}', '2000x2000');
            }
          }

          if (finalImageUrl) {
            // 应用代理接口逻辑
            if (photoApi) {
              if (urlMode === 'id' && photoId) {
                finalImageUrl = `${cleanApi}${cleanApi.endsWith('/') ? '' : '/'}?id=${photoId}`;
              } else {
                finalImageUrl = `${cleanApi}${cleanApi.endsWith('/') ? '' : '/'}?url=${encodeURIComponent(finalImageUrl)}`;
              }
              console.log('应用代理后的链接:', finalImageUrl);
            }

            // 自动生成缩略图（如果是视频）
            let thumbnailUrl = '';
            if (isVideo && photoId) {
              const originalThumb = `https://us.zonerama.com/photos/${photoId}_2000x2000_0.jpg`;
              if (photoApi) {
                if (urlMode === 'id') {
                  thumbnailUrl = `${cleanApi}${cleanApi.endsWith('/') ? '' : '/'}?id=${photoId}`;
                } else {
                  thumbnailUrl = `${cleanApi}${cleanApi.endsWith('/') ? '' : '/'}?url=${encodeURIComponent(originalThumb)}`;
                }
              } else {
                thumbnailUrl = originalThumb;
              }
              console.log('自动生成视频缩略图:', thumbnailUrl);
            }
            
            if (uploadMode === 'album') {
              uploadedPhotoDatas.push({
                album_id: currentAlbumId,
                url: finalImageUrl,
                level: 'normal', // 默认等级
                sort_order: i * 10,
                tags: batchTags.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean)
              });
            } else {
              // 壁纸库模式
              wallpaperItems.push({
                user_id: user!.id,
                url: finalImageUrl,
                thumbnail_url: thumbnailUrl || undefined, // 添加缩略图
                type: isVideo ? 'video' : 'image',
                status: 'approved',
                title: file.name.replace(/\.[^/.]+$/, ""),
                category_id: batchCategory === 'all' ? null : batchCategory,
                tags: batchTags.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean)
              });
            }
            successCount++;
            setZoneramaUploadProgress(prev => ({ ...prev, [i]: 100 }));
            console.log(`文件 ${file.name} 上传成功，URL: ${finalImageUrl}`);
          } else {
            console.error('Upload success but no URL found:', uploadResult);
            throw new Error('服务器未返回有效的资源链接');
          }
        } catch (fileErr: any) {
          console.error(`File ${file.name} upload failed:`, fileErr);
          toast.error(`${file.name} 上传失败: ${fileErr.message}`, { duration: 5000 });
          failCount++;
          setZoneramaUploadProgress(prev => ({ ...prev, [i]: -1 }));
        }
      });

      // 批量存入数据库
      if (uploadedPhotoDatas.length > 0) {
        toast.loading(`正在保存 ${uploadedPhotoDatas.length} 个资源到数据库...`, { id: loadingToast });
        const { error: dbError } = await api.batchUpsertAlbumPhotos(uploadedPhotoDatas);
        if (dbError) throw dbError;
      }

      if (wallpaperItems.length > 0) {
        toast.loading(`正在保存 ${wallpaperItems.length} 张壁纸到数据库...`, { id: loadingToast });
        const { error: batchError } = await api.batchUploadMedia(wallpaperItems);
        if (batchError) throw batchError;
      }

      if (successCount > 0) {
        toast.success(`操作完成！成功同步 ${successCount} 个资源${failCount > 0 ? `，失败 ${failCount} 个` : ''}`, { id: loadingToast });
        setAdminZoneramaFiles([]);
        setZoneramaUploadProgress({});
        setTimeout(() => navigate(uploadMode === 'album' ? `/albums/${currentAlbumId}` : '/profile'), 2000);
      } else {
        toast.error(`操作失败，未成功同步任何资源`, { id: loadingToast });
      }
    } catch (error: any) {
      toast.error(`过程发生意外错误: ${error.message}`, { id: loadingToast });
    } finally {
      setIsAdminZoneramaUploading(false);
      setAdminZoneramaFiles([]);
      setZoneramaUploadProgress({});
    }
  };

  useEffect(() => {
    const fetchAdminData = async () => {
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single() as any;
      if (profile && (profile.role === 'super_admin' || profile.role === 'admin')) {
        setIsAdmin(true);
        // 获取已有图集
        const { data: albumList } = await supabase.from('photo_albums').select('*').order('created_at', { ascending: false });
        setAlbums(albumList || []);
        // 获取图集自定义字段库
        const { data: fieldList } = await supabase.from('album_custom_fields').select('*').order('name');
        setCustomFields(fieldList || []);
      }
    };
    fetchAdminData();
  }, [user]);

  const handleAlbumCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsNewAlbumCoverUploading(true);
    try {
      const fileName = `album_covers/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from('photos').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
      setNewAlbumData((prev: any) => ({ ...prev, cover_url: publicUrl }));
      toast.success('封面上传成功');
    } catch (err: any) {
      toast.error('封面上传失败: ' + err.message);
    } finally {
      setIsNewAlbumCoverUploading(false);
    }
  };

  // 从 Zonerama 相册导入图片
  const handleLoadZoneramaAlbum = async () => {
    if (!zoneramaAlbumIdInput.trim()) {
      toast.error('请输入 Zonerama 相册 ID');
      return;
    }

    setIsLoadingZoneramaAlbum(true);
    try {
      // 确保 Zonerama 代理配置已初始化
      await initZoneramaPhotoApi();

      // 1. 从数据库读取配置
      const { data: configData, error: configError } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', 'zonerama_upload_config')
        .single<{ value: any }>();

      if (configError) {
        throw new Error('读取配置失败: ' + configError.message);
      }

      const albumPhotoApi = configData?.value?.album_photo_api || '';
      const photoApi = configData?.value?.photo_api || '';

      if (!albumPhotoApi) {
        throw new Error('图集内图片列表接口未配置，请前往后台设置');
      }

      // 2. 调用 Zonerama API
      const apiUrl = `${albumPhotoApi}${zoneramaAlbumIdInput.trim()}`;
      console.log('[上传页] 调用 Zonerama 接口:', apiUrl);

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`接口调用失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[上传页] Zonerama 接口返回数据:', data);

      // 3. 提取图片列表
      if (!data.photos || !Array.isArray(data.photos)) {
        throw new Error('接口返回数据格式错误，缺少 photos 数组');
      }

      const photoList = data.photos.map((photo: any) => {
        const photo_id = String(photo.id || '');
        // 存储原始 Zonerama URL
        const url = getZoneramaOriginalUrl(photo_id);
        return {
          photo_id,
          url,
        };
      });

      console.log('[上传页] 提取到图片数量:', photoList.length);

      if (photoList.length === 0) {
        toast.info('该相册暂无图片');
        return;
      }

      // 4. 性能优化：先设置预览列表，跳过类型探测
      const newPreviews = photoList.map((p: any) => ({
        id: Math.random().toString(36).substring(2),
        url: p.url,
        previewUrl: getZoneramaProxyUrl(p.url),
        photo_id: p.photo_id,
        type: 'image' as const,
        loading: false,
        status: 'idle'
      }));
      setImportPreviews(newPreviews);

      // 5. 将图片 URL 填充到 batchUrls
      const urls = photoList.map((p: any) => p.url).join('\n');
      setBatchUrls(urls);
      
      // 6. 保存 photo_id 映射，用于后续导入时记录
      const photoIdMap: Record<string, string> = {};
      photoList.forEach((p: any) => {
        photoIdMap[p.url] = p.photo_id;
      });
      // 将 photo_id 映射保存到状态中
      (window as any).__zonerama_photo_id_map = photoIdMap;

      toast.success(`成功加载 ${photoList.length} 张图片`);
    } catch (error: any) {
      console.error('[上传页] 加载 Zonerama 相册失败:', error);
      toast.error('加载失败: ' + error.message);
    } finally {
      setIsLoadingZoneramaAlbum(false);
    }
  };


  const [isSuperbedEnabled, setIsSuperbedEnabled] = useState(false);


  useEffect(() => {
    // 支持按换行、空格、逗号、分号拆分 URL
    let rawUrls = batchUrls.split(/[\n\s,;]+/).map(u => u.trim()).filter(u => u.startsWith('http') || /^\d+$/.test(u));
    
    // 满足用户最新需求：入库链接以资源链接列表实际链接为准，不再在此处自动应用优化
    const urls = rawUrls;
    
    if (urls.length === 0) {
      if (importPreviews.length > 0) setImportPreviews([]);
      return;
    }

    // 仅当 URL 列表发生实际变化时更新预览列表结构
    const currentUrls = importPreviews.map(p => p.url);
    const isSame = urls.length === currentUrls.length && urls.every((u, i) => u === currentUrls[i]);
    
    if (!isSame) {
      const newItems = urls.map(url => {
        const existing = importPreviews.find(p => p.url === url);
        if (existing) {
          // 必须清除封面相关的临时属性，因为顺序可能发生了变化，需要重新计算
          return { ...existing, isCover: false, remoteThumbnailUrl: undefined as string | undefined };
        }
        
        let type: 'image' | 'video' | 'unknown' = 'unknown';
        const lowerUrl = url.toLowerCase();
        // 优化视频识别逻辑，增加 sns-video 特征，支持更多扩展名
        if (/\.(mp4|webm|mov|avi|mkv|m3u8)($|\?)/i.test(lowerUrl) || 
            lowerUrl.includes('video') || 
            lowerUrl.includes('sns-video')) {
          type = 'video';
        } else if (/\.(jpg|jpeg|png|webp|gif|avif|heic)($|\?)/i.test(lowerUrl) || 
                   lowerUrl.includes('notes_pre_post') || 
                   lowerUrl.includes('xhscdn.com') || 
                   lowerUrl.includes('imageView') ||
                   lowerUrl.includes('zonerama.com')) {
          type = 'image';
        }
        
        // 如果是 Zonerama 链接，自动应用预览代理
        const previewUrl = url.includes('zonerama.com') ? getZoneramaProxyUrl(url) : url;
        
        return { url, previewUrl, type, loading: true, isCover: false, remoteThumbnailUrl: undefined as string | undefined };
      });

      // 处理视频前后链接作为封面的逻辑
      // 满足用户最新需求：前面或后面图片作为封面，视频作为源
      for (let i = 0; i < newItems.length; i++) {
        const item = newItems[i];
        if (item.type === 'video') {
          // 1. 优先检查前一个
          if (i > 0) {
            const prevItem = newItems[i-1];
            // 如果前一个是图片（或未知但不是视频），且它没有被标记过，则作为封面
            if (prevItem.type !== 'video' && !prevItem.isCover) {
              item.remoteThumbnailUrl = prevItem.url;
              prevItem.isCover = true;
              continue; // 已找到封面，跳过检查后一个
            }
          }
          
          // 2. 如果前一个没找到，检查后一个
          if (i + 1 < newItems.length) {
            const nextItem = newItems[i+1];
            // 如果后一个是图片（或未知但不是视频），且它没有被标记过，则作为封面
            if (nextItem.type !== 'video' && !nextItem.isCover) {
              item.remoteThumbnailUrl = nextItem.url;
              nextItem.isCover = true;
            }
          }
        }
      }

      setImportPreviews(newItems);
    }
  }, [batchUrls]);

  // 独立的 Effect 处理异步探测和查重，避免循环
  useEffect(() => {
    const pendingProbes = importPreviews.filter(p => p.loading);
    const pendingExistence = importPreviews.filter(p => {
      const photoId = p.photo_id || getZoneramaIdFromUrl(p.url);
      return photoId && p.exists === undefined;
    });

    if (pendingProbes.length === 0 && pendingExistence.length === 0) return;

    // 处理探测
    if (pendingProbes.length > 0) {
      const runProbes = async () => {
          const results = await runWithLimit(5, pendingProbes, async (p) => {
            let type: 'image' | 'video' | 'unknown' = 'image';
            let thumb: string | undefined = undefined;
            let thumbBlob: Blob | undefined = undefined;
            let standardizedUrl = p.url;
            let photoId = getZoneramaIdFromUrl(p.url) || undefined;

            if (photoId) {
              standardizedUrl = getZoneramaOriginalUrl(photoId);
            }

            // 优化视频检测：支持更多扩展名和特征
            const isVideo = standardizedUrl.toLowerCase().match(/\.(mp4|webm|mov|avi|mkv|m3u8)($|\?)/) || 
                          standardizedUrl.includes('zonerama.com/videos') ||
                          standardizedUrl.toLowerCase().includes('video') ||
                          standardizedUrl.includes('sns-video');

            if (isVideo) {
              type = 'video';
              // 自动将 http 转换为 https 以避免 Mixed Content 问题
              if (standardizedUrl.startsWith('http://')) {
                standardizedUrl = standardizedUrl.replace('http://', 'https://');
              }
              
              // 应用小红书 URL 优化
              standardizedUrl = optimizeXiaohongshuUrl(standardizedUrl);

              if (p.remoteThumbnailUrl) {
                // 同样优化封面 URL
                thumb = optimizeXiaohongshuUrl(p.remoteThumbnailUrl);
              } else {
                try {
                  thumbBlob = await extractVideoThumbnail(standardizedUrl, 1.0);
                  thumb = URL.createObjectURL(thumbBlob);
                } catch (e) {
                  console.error('Video thumbnail extraction failed:', e);
                }
              }
            } else {
              // 图片也应用优化，同时确保 type 正确
              type = 'image';
              standardizedUrl = optimizeXiaohongshuUrl(standardizedUrl);
            }
            return { 
              url: p.url, 
              standardizedUrl, 
              photo_id: photoId, 
              type, 
              thumbnailPreview: thumb, 
              thumbnailBlob: thumbBlob, 
              remoteThumbnailUrl: p.remoteThumbnailUrl 
            };
          });

          setImportPreviews(prev => prev.map(p => {
            const res = results.find(r => r.url === p.url);
            if (res) {
              // 满足用户最新需求：保持 p.url 为列表实际链接，不再使用 standardizedUrl 覆盖它
              // standardizedUrl 仅留存用于查重逻辑
              return { ...p, ...res, url: p.url, loading: false };
            }
            return p;
          }));
      };
      runProbes();
    }

    // 处理查重
    if (pendingExistence.length > 0) {
      const runCheck = async () => {
        const photoIds: string[] = [];
        const otherUrls: string[] = [];
        
        pendingExistence.forEach(p => {
          const photoId = p.photo_id || getZoneramaIdFromUrl(p.url);
          if (photoId) photoIds.push(photoId);
          else otherUrls.push(p.url);
        });

        const [existingIds, existingUrls] = await Promise.all([
          checkZoneramaExistence(photoIds),
          checkUrlExistence(otherUrls)
        ]);

        setImportPreviews(prev => prev.map(p => {
          if (p.exists !== undefined) return p;
          
          const photoId = p.photo_id || getZoneramaIdFromUrl(p.url);
          if (photoId) {
            return { ...p, exists: existingIds.has(photoId) };
          } else {
            return { ...p, exists: existingUrls.has(p.url) };
          }
        }));
      };
      runCheck();
    }
  }, [importPreviews]);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      
      // 初始化 Zonerama 代理配置
      initZoneramaPhotoApi().catch(console.error);
      
      // 尝试从缓存加载权限（5分钟有效期）
      const cacheKey = `upload_perms_${user.id}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          if (age < 5 * 60 * 1000) { // 5分钟内有效
            setPermissions(data.permissions || []);
            setStorageConfig(data.storageConfig);
            if (data.categories) setCategories(data.categories);
            if (data.storageConfig?.default_upload_category) setBatchCategory(data.storageConfig.default_upload_category);
            if (data.storageConfig?.default_upload_tags) setBatchTags(data.storageConfig.default_upload_tags);
            if (data.storageConfig?.storage_priority === 'superbed_first') {
              setSelectedStorage('superbed');
            } else {
              setSelectedStorage('r2');
            }
            setCanLinkImport(data.canLinkImport);
            if (data.isSuperbedEnabled !== undefined) setIsSuperbedEnabled(data.isSuperbedEnabled);
            if (data.isWorkerEnabled !== undefined) setIsWorkerEnabled(data.isWorkerEnabled);
            if (data.isR2S3Enabled !== undefined) setIsR2S3Enabled(data.isR2S3Enabled);
            if (data.isUploadAvailable !== undefined) {
              setIsUploadAvailable(data.isUploadAvailable);
              if (!data.isUploadAvailable && data.canLinkImport) {
                setActiveTab('remote');
              }
            }
            if (data.superbedConfig) setSuperbedConfig(data.superbedConfig);
            setLoadingPerms(false);
            return; // 使用缓存，不再请求
          }
        } catch (e) {
          // 缓存解析失败，继续正常请求
        }
      }
      
      setLoadingPerms(true);
      try {
        const [permsRes, configRes, categoriesRes, superbedRes] = await Promise.all([
          rbacApi.getCurrentUserPermissions(user.id),
          api.getStorageConfig(),
          api.getContentCategories(),
          api.getSuperbedConfig()
        ]);
        
        const perms = permsRes.permissions || [];
        setPermissions(perms);
        setStorageConfig(configRes.data);
        if (categoriesRes.data) setCategories(categoriesRes.data);
        
        // 判断 R2 各模式可用性
        const workerEnabled = configRes.data?.r2_mode === 'worker' && !!configRes.data?.r2_worker_url && !!configRes.data?.r2_worker_token;
        const s3Enabled = !!configRes.data?.endpoint && !!configRes.data?.key_id && !!configRes.data?.secret_key && !!configRes.data?.bucket_name;
        setIsWorkerEnabled(workerEnabled);
        setIsR2S3Enabled(s3Enabled);

        // 设置默认分类和标签
        if (configRes.data?.default_upload_category) setBatchCategory(configRes.data.default_upload_category);
        if (configRes.data?.default_upload_tags) setBatchTags(configRes.data.default_upload_tags);
        
        // 设置默认存储优先级
        if (configRes.data?.storage_priority === 'superbed_first') {
          setSelectedStorage('superbed');
        } else {
          setSelectedStorage('r2');
        }
        
        // 聚合图床可用性判断
        let isSuperbedEnabledValue = false;
        if (superbedRes.data) {
          setSuperbedConfig(superbedRes.data);
          const isEnabled = superbedRes.data.is_enabled && superbedRes.data.is_upload_page_enabled;
          const allowedGroups = superbedRes.data.allowed_groups || [];
          const userGroup = permsRes.group_name || '普通用户';
          
          // 如果没有限制，或者用户在允许的组中，则可以使用
          const canUse = isEnabled && (allowedGroups.length === 0 || allowedGroups.includes(userGroup));
          setIsSuperbedEnabled(canUse);
          isSuperbedEnabledValue = canUse;
        }

        // 总体上传可用性
        const uploadAvailable = workerEnabled || s3Enabled || isSuperbedEnabledValue;
        setIsUploadAvailable(uploadAvailable);

        // 链接导入可用：权限包含 'link_import' 且 全局配置 enable_link_import 为 true
        const canLinkImportValue = perms.includes('link_import') && (configRes.data?.enable_link_import !== false);
        setCanLinkImport(canLinkImportValue);

        // 如果本地上传不可用且链接导入可用，自动切换到链接导入
        if (!uploadAvailable && canLinkImportValue) {
          setActiveTab('remote');
        }
        
        // 缓存权限数据
        localStorage.setItem(cacheKey, JSON.stringify({
          data: {
            permissions: perms,
            storageConfig: configRes.data,
            categories: categoriesRes.data,
            canLinkImport: canLinkImportValue,
            isSuperbedEnabled: isSuperbedEnabledValue,
            isWorkerEnabled: workerEnabled,
            isR2S3Enabled: s3Enabled,
            isUploadAvailable: uploadAvailable,
            superbedConfig: superbedRes.data
          },
          timestamp: Date.now()
        }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPerms(false);
      }
    };
    init();
  }, [user]);

  const goToAdminSettings = () => {
    // 检查是否有管理后台访问权限，或者简单地根据 user.role 决定
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      // 这里的路径需要和 PCDashboard 的跳转逻辑一致
      // PC 管理后台页面是 /admin/pc，StorageSection 内部会处理 ?tab=upload
      navigate('/admin/pc?tab=upload');
    }
  };
  const [isErrorReportOpen, setIsErrorReportOpen] = useState(false);

  const handleRetrySingle = async (id: string) => {
    if (isAnyUploading) return;
    const fileObj = files.find(f => f.id === id);
    if (!fileObj) return;

    // 先重置状态
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'idle', progress: 0, errorMsg: undefined } : f));
    
    setIsAnyUploading(true);
    // 延迟一小下确保状态更新
    await new Promise(resolve => setTimeout(resolve, 100));
    const albumToUse = isAdmin && uploadMode === 'album' && selectedAlbumId !== 'new' ? selectedAlbumId : undefined;
    await uploadSingleFile({ ...fileObj, status: 'idle', progress: 0, errorMsg: undefined }, files.findIndex(f => f.id === id), albumToUse);
    setIsAnyUploading(false);
  };

  const handleCopyErrors = async () => {
    const errorFiles = files.filter(f => f.status === 'error');
    const errorText = errorFiles.map(f => `文件: ${f.file.name}\n错误: ${f.errorMsg || '未知错误'}`).join('\n\n');
    
    try {
      // 尝试使用现代 Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(errorText);
        toast.success('已复制所有错误信息到剪贴板');
      } else {
        // Fallback: 使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = errorText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            toast.success('已复制所有错误信息到剪贴板');
          } else {
            throw new Error('复制命令执行失败');
          }
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (err: any) {
      console.error('复制失败:', err);
      toast.error('复制失败，请手动复制错误信息');
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBloggerOcr = async (file: File) => {
    setIsOcrLoading(true);
    setBloggerImage(URL.createObjectURL(file));
    setOcrResults([]);
    setOcrLines([]);
    setSelectedOcrSegments([]);
    
    let worker: any = null;
    try {
      // 采用 v5 推荐初始化方式
      worker = await (Tesseract as any).createWorker('chi_sim+eng', (Tesseract as any).OEM.DEFAULT, {
        logger: (m: any) => console.log('Tesseract Log:', m),
        errorHandler: (err: any) => console.error('Tesseract ErrorHandler:', err),
      });

      const { data } = await worker.recognize(file);
      
      if (data && data.text && data.text.trim()) {
        // 1. 提取行文本作为推荐词组
        // 过滤掉纯数字、纯标点、过短的文本（保留有意义的词组）
        const lines = ((data as any).lines || [])
          .map((line: any) => line.text.trim())
          .filter((text: string) => {
            const clean = text.replace(/[^\w\u4e00-\u9fa5]/g, '');
            // 保留中文字符或较长的英文字符
            return clean.length >= 2 || (clean.length === 1 && /[\u4e00-\u9fa5]/.test(clean));
          });
        
        // 2. 提取词/字作为组词素材
        // 去重并合并
        const segments = Array.from(new Set([
          ...((data as any).words || []).map((w: any) => w.text.trim()),
          // 额外补充单字，防止长串未被正确切词
          ...data.text.replace(/\s+/g, '').split('').filter((char: string) => /[\u4e00-\u9fa5\w]/.test(char))
        ])).filter(s => s.length > 0 && s.length <= 15);
        
        if (lines.length > 0 || segments.length > 0) {
          setOcrLines(lines);
          setOcrResults(segments);
          toast.success(`本地识别完成，共提取 ${lines.length} 个词组`);
        } else {
          // 如果过滤太严导致没结果，尝试展示原始文本
          const fallbackLines = data.text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
          if (fallbackLines.length > 0) {
            setOcrLines(fallbackLines);
            setOcrResults(data.text.replace(/\s+/g, '').split('').slice(0, 100));
            toast.success('识别完成（原始结果）');
          } else {
            toast.error('未能识别出文字内容');
          }
        }
      } else {
        toast.error('图片中未发现文字');
      }
    } catch (err: any) {
      console.error('OCR Error:', err);
      // 如果 Worker 启动失败，可能是资源加载问题，尝试备用简单模式
      try {
        const result = await (Tesseract as any).recognize(file, 'chi_sim+eng');
        const text = (result as any).data.text;
        if (text) {
          const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
          setOcrLines(lines);
          setOcrResults(text.replace(/\s+/g, '').split('').slice(0, 50));
          toast.success('识别完成（备用引擎）');
          return;
        }
      } catch (e) {
        console.error('Fallback Error:', e);
      }
      toast.error('本地识别失败: ' + (err.message || '引擎启动超时'));
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (e) {
          console.error('Worker terminate error:', e);
        }
      }
      setIsOcrLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // 立即缓存并处理文件列表，防止异步挂起后列表丢失
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    
    const selectedFiles = Array.from(fileList);
    
    // 立即重置 input，以便可以重复选择同一文件
    if (e.target) e.target.value = '';
    
    if (selectedFiles.length > 100000) {
      toast.error('单次选择文件过多，请分批上传');
      return;
    }

    toast.info(`正在处理 ${selectedFiles.length} 个文件...`, { id: 'file-processing' });

    // 直接处理所有文件
    await processNormalFiles(selectedFiles);
  };

    // 处理 HEIC 文件转换

  // 处理普通文件（非 HEIC）
  const processNormalFiles = useCallback(async (selectedFiles: File[]) => {
    const processedFiles: any[] = [];
    
    for (const file of selectedFiles) {
      const fileName = file.name.toLowerCase();
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.heic', '.heif', '.ico', '.tiff', '.avif'];
      const videoExtensions = ['.mp4', '.mov', '.mkv', '.avi', '.wmv', '.webm', '.flv', '.3gp', '.m4v'];

      const isImage = file.type.startsWith('image/') || imageExtensions.some(ext => fileName.endsWith(ext));
      const isVideo = file.type.startsWith('video/') || videoExtensions.some(ext => fileName.endsWith(ext));

      if (!isImage && !isVideo) {
        toast.error(`${file.name} 不是有效的图片或视频文件`);
        continue;
      }

      const fileObj: any = {
        file: file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substr(2, 9),
        status: 'idle' as const,
        progress: 0,
      };

      // 预先获取图片/视频尺寸
      if (isImage) {
        const img = new Image();
        img.src = fileObj.preview;
        img.onload = () => {
          fileObj.width = img.naturalWidth;
          fileObj.height = img.naturalHeight;
        };
      } else if (isVideo) {
        const video = document.createElement('video');
        video.src = fileObj.preview;
        video.onloadedmetadata = () => {
          fileObj.width = video.videoWidth;
          fileObj.height = video.videoHeight;
        };
      }

      processedFiles.push(fileObj);
    }

    toast.dismiss('file-processing');
    if (processedFiles.length === 0) return;

    const tempFiles = processedFiles;
    setFiles(prev => [...prev, ...tempFiles]);
    setIsAllSuccess(false);
    
    toast.success(`已添加 ${tempFiles.length} 个文件，正在进行指纹查重与预览分析...`);

    // 使用限制并发的任务处理查重和预览 (2个并发以降低内存消耗并提升移动端稳定性)
    await runWithLimit(2, tempFiles, async (tempFile) => {
      try {
        const isImage = tempFile.file.type.startsWith('image/') || 
                        ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.heic', '.heif', '.ico', '.tiff', '.avif'].some(ext => tempFile.file.name.toLowerCase().endsWith(ext));
        const isVideo = tempFile.file.type.startsWith('video/') || 
                        ['.mp4', '.mov', '.mkv', '.avi', '.wmv', '.webm', '.flv', '.3gp', '.m4v'].some(ext => tempFile.file.name.toLowerCase().endsWith(ext));

        // 1. 计算指纹
        const md5 = await calculateFileMD5(tempFile.file).catch(() => '');
        // 给主线程喘息机会
        await new Promise(r => setTimeout(r, 50));
        const visualHash = isImage ? await calculateVisualHash(tempFile.file).catch(() => '') : '';
        
        if (md5 || visualHash) {
          // 获取最新的 files 状态进行内部比对
          const currentFiles = filesRef.current;
          
          // 内部比对
          const internalDuplicate = currentFiles.find(f => 
            (f.id !== tempFile.id) && 
            ((md5 && f.md5 === md5) || (visualHash && f.contentHash === visualHash))
          );

          if (internalDuplicate) {
            setFiles(prev => prev.map(f => f.id === tempFile.id ? { 
              ...f, 
              status: 'duplicate', 
              md5, 
              contentHash: visualHash, 
              errorMsg: '列表内已存在相同文件' 
            } : f));
            return;
          }

          // 数据库比对
          const { data: md5Duplicate } = await api.checkFileDuplicate(md5);
          if (md5Duplicate) {
            setFiles(prev => prev.map(f => f.id === tempFile.id ? { 
              ...f, 
              status: 'duplicate', 
              md5, 
              contentHash: visualHash, 
              errorMsg: `数据库已存在 (${md5Duplicate.title || '已上传'})` 
            } : f));
            return;
          }

          if (isImage && visualHash) {
            const { data: visualDuplicate } = await api.checkVisualDuplicate(visualHash);
            if (visualDuplicate) {
              setFiles(prev => prev.map(f => f.id === tempFile.id ? { 
                ...f, 
                status: 'duplicate', 
                md5, 
                contentHash: visualHash, 
                errorMsg: `数据库视觉重复 (${visualDuplicate.title || '已上传'})` 
              } : f));
              return;
            }
          }
        }

        // 2. 预览与缩略图提取
        let thumbnailBlob: Blob | undefined;
        let thumbnailPreview: string | undefined;
        let thumbnailOptions: string[] = [];
        let thumbnailBlobs: Blob[] = [];

        if (isVideo) {
          const thumbTimes = [1.0, 2.0, 3.0, 5.0];
          const thumbnails = await Promise.all(thumbTimes.map(t => extractVideoThumbnail(tempFile.file, t).catch(() => null)));
          thumbnailBlobs = thumbnails.filter((b): b is Blob => b !== null);
          thumbnailOptions = thumbnailBlobs.map(b => URL.createObjectURL(b));
          thumbnailBlob = thumbnailBlobs[1] || thumbnailBlobs[0];
          thumbnailPreview = thumbnailOptions[1] || thumbnailOptions[0];
        } else if (isImage && storageConfig?.enable_thumbnails !== false) {
          try {
            const thumbBlob = await generateImageThumbnail(
              tempFile.file, 
              storageConfig?.thumbnail_size || 480, 
              (storageConfig?.thumbnail_quality || 80) / 100
            );
            thumbnailBlob = thumbBlob;
            thumbnailPreview = URL.createObjectURL(thumbBlob);
          } catch (err) {
            console.error('图片缩略图生成失败:', err);
          }
        }

        // 更新状态 (带上指纹和预览)
        setFiles(prev => prev.map(f => f.id === tempFile.id ? { 
          ...f, 
          md5, 
          contentHash: visualHash, 
          thumbnailBlob, 
          thumbnailPreview, 
          thumbnailOptions, 
          thumbnailBlobs 
        } : f));

      } catch (e) {
        console.error('文件预处理失败:', e);
      }
    });

    toast.success('文件处理完成');
  }, [setFiles, setIsAllSuccess, storageConfig]);

  // 微信环境检测与 JSSDK 支持
  const isWechat = useRef(/micromessenger/i.test(navigator.userAgent.toLowerCase())).current;
  const handleWechatImageSelect = useCallback(() => {
    const wx = (window as any).wx;
    if (!wx || !wx.chooseImage) {
      // 如果没有 SDK，回退到原生 input 点击
      fileInputRef.current?.click();
      return;
    }
    
    wx.chooseImage({
      count: 9, // 微信单次上限 9
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res: any) => {
        const localIds = res.localIds;
        toast.info(`正在从微信获取 ${localIds.length} 张图片...`, { id: 'wx-loading' });
        
        // 由于微信 localId 转换 File 比较繁琐，且在有些版本下 getLocalImgData 的 base64 格式不稳定，
        // 这里采用一种更现代且稳健的方式：通过 fetch 转换
        Promise.all(localIds.map((localId: string) => {
          return new Promise<File | null>((resolve) => {
            wx.getLocalImgData({
              localId,
              success: (res: any) => {
                let localData = res.localData;
                // 解决 iOS 和 Android 下 base64 前缀不一致问题
                if (localData.indexOf('data:image') !== 0) {
                  localData = 'data:image/jpeg;base64,' + localData;
                }
                fetch(localData)
                  .then(r => r.blob())
                  .then(blob => {
                    const file = new File([blob], `wx_upload_${Math.random().toString(36).substr(2, 5)}.jpg`, { type: 'image/jpeg' });
                    resolve(file);
                  })
                  .catch(() => resolve(null));
              },
              fail: () => resolve(null)
            });
          });
        })).then((results: any) => {
          const files = results.filter(Boolean);
          toast.dismiss('wx-loading');
          if (files.length > 0) {
            processNormalFiles(files);
          } else {
            toast.error('未能成功获取微信图片');
          }
        });
      }
    });
  }, [processNormalFiles]);


  const handleManualThumbnail = (id: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('封面必须是图片格式');
      return;
    }

    const preview = URL.createObjectURL(file);
    setFiles(prev => prev.map(f => f.id === id ? { 
      ...f, 
      manualThumbnailBlob: file, 
      thumbnailPreview: preview 
    } : f));
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const filtered = prev.filter(f => f.id !== id);
      // 释放 URL 对象防止内存泄漏
      const removed = prev.find(f => f.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const compressImage = async (file: File): Promise<File> => {
    // ... (保持原有的压缩逻辑不变)
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // 限制最大分辨率为 1080p
        const maxResolution = 1080;
        if (width > maxResolution || height > maxResolution) {
          if (width > height) {
            height = (height / width) * maxResolution;
            width = maxResolution;
          } else {
            width = (width / height) * maxResolution;
            height = maxResolution;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // 初步压缩
        canvas.toBlob((blob) => {
          if (blob && blob.size < 1024 * 1024) {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: 'image/webp' }));
          } else {
            // 进一步降质压缩
            let quality = 0.8;
            const iterativeCompress = (q: number) => {
              canvas.toBlob((b) => {
                if (b && (b.size < 1024 * 1024 || q < 0.2)) {
                  resolve(new File([b], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: 'image/webp' }));
                } else {
                  iterativeCompress(q - 0.1);
                }
              }, 'image/webp', q);
            };
            iterativeCompress(quality);
          }
        }, 'image/webp', 0.8);
      };
    });
  };

  const uploadSingleFile = async (initialFileObj: any, index: number, currentAlbumId?: string) => {
    if (!user) return;
    
    // 获取最新的 fileObj 数据，解决异步截取缩略图导致的闭包 stale data 问题
    const fileObj = filesRef.current.find(f => f.id === initialFileObj.id) || initialFileObj;
    
    setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'uploading', progress: 5 } : f));

    try {
      // 确定重命名后的文件名基础（不含扩展名）
      let finalBaseName = '';
      const namingRule = storageConfig?.file_naming_rule || 'timestamp';
      
      switch (namingRule) {
        case 'original':
          // 保留原名，但经过安全清洗
          finalBaseName = sanitizeFileName(fileObj.file.name.replace(/\.[^/.]+$/, ""));
          break;
        case 'md5':
          // 使用文件 MD5 (如果已计算) 或随机哈希
          finalBaseName = (fileObj.md5 || Math.random().toString(36).substring(2, 10)).substring(0, 16);
          break;
        case 'uuid':
          // 使用随机 UUID 的前部（兼容所有浏览器）
          const generateUUID = () => {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
              return crypto.randomUUID();
            }
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
              const r = Math.random() * 16 | 0;
              const v = c === 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });
          };
          finalBaseName = generateUUID().replace(/-/g, '').substring(0, 16);
          break;
        case 'classic':
          // 大写字母 + YYYYMMDDHHmmss + 3位随机数
          const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          const randomLetter = letters.charAt(Math.floor(Math.random() * letters.length));
          const classicNow = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
          const cYear = classicNow.getUTCFullYear();
          const cMonth = (classicNow.getUTCMonth() + 1).toString().padStart(2, '0');
          const cDay = classicNow.getUTCDate().toString().padStart(2, '0');
          const cHrs = classicNow.getUTCHours().toString().padStart(2, '0');
          const cMin = classicNow.getUTCMinutes().toString().padStart(2, '0');
          const cSec = classicNow.getUTCSeconds().toString().padStart(2, '0');
          const cRand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          finalBaseName = `${randomLetter}${cYear}${cMonth}${cDay}${cHrs}${cMin}${cSec}${cRand}`;
          break;
        case 'timestamp':
        default:
          // 默认时间戳 + 4位随机数
          const now = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
          const year = now.getUTCFullYear();
          const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
          const day = now.getUTCDate().toString().padStart(2, '0');
          const hours = now.getUTCHours().toString().padStart(2, '0');
          const minutes = now.getUTCMinutes().toString().padStart(2, '0');
          const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          finalBaseName = `${year}${month}${day}${hours}${minutes}${randomSuffix}`;
          break;
      }

      const fileNameToUse = finalBaseName;
      let fileToUpload = fileObj.file;

      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.heic', '.heif', '.ico', '.tiff', '.avif'];
      const isImage = fileObj.file.type.startsWith('image/') || 
                      imageExtensions.some(ext => fileObj.file.name.toLowerCase().endsWith(ext));

      // 聚合图床由于存储限制和稳定性考虑，强制进行图片压缩优化（转为 WebP）
      if (isImage && selectedStorage === 'superbed') {
        try {
          setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress: 10, errorMsg: '正在优化图片...' } : f));
          fileToUpload = await compressImage(fileToUpload);
        } catch (err) {
          console.warn('Image compression failed, using original:', err);
        }
      }

      const imagePrefix = storageConfig?.image_path_prefix || 'image';
      const videoPrefix = storageConfig?.video_path_prefix || 'video';
      const prefix = isImage ? imagePrefix : videoPrefix;
      
      // 如果暂时没有缩略图，等待一小会儿让后台生成/提取逻辑执行完毕 (最多等 3s)
      if (!fileObj.manualThumbnailBlob && !fileObj.thumbnailBlob) {
        for (let i = 0; i < 15; i++) {
          await new Promise(r => setTimeout(r, 200));
          const latest = filesRef.current.find(f => f.id === fileObj.id);
          if (latest?.thumbnailBlob || latest?.manualThumbnailBlob) {
            fileObj.thumbnailBlob = latest.thumbnailBlob;
            fileObj.manualThumbnailBlob = latest.manualThumbnailBlob;
            break;
          }
        }
      }

      let thumbnailUrl = null;

      // 确定要使用的封面 (优先手动上传)
      const thumbToUpload = fileObj.manualThumbnailBlob || fileObj.thumbnailBlob;

      // 如果有视频缩略图，先上传缩略图 (聚合图床图片上传不使用 R2 缩略图逻辑)
      const isSuperbedImage = selectedStorage === 'superbed' && isImage;
      if (thumbToUpload && !isSuperbedImage) {
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress: 10 } : f));
        const thumbnailName = `thumb/${fileNameToUse}.jpg`;
        const thumbFormData = new FormData();
        thumbFormData.append('file', thumbToUpload, 'thumbnail.jpg');
        thumbFormData.append('fileName', thumbnailName);
        if (storageConfig?.bucket_name) {
          thumbFormData.append('bucket', storageConfig.bucket_name);
        }

        const { data: thumbData, error: thumbError } = await (async () => {
          // 如果开启了 Worker 模式且配置了 URL，缩略图也走 Worker
          if (storageConfig?.r2_mode === 'worker' && storageConfig?.r2_worker_url) {
            try {
              const workerUrl = `${storageConfig.r2_worker_url.replace(/\/$/, '')}/upload`;
              const tFormData = new FormData();
              tFormData.append('file', thumbToUpload, 'thumbnail.jpg');
              tFormData.append('fileName', thumbnailName);
              if (storageConfig?.bucket_name) {
                tFormData.append('bucket', storageConfig.bucket_name);
              }

              const response = await fetch(workerUrl, {
                method: 'POST',
                headers: {
                  'Authorization': storageConfig.r2_worker_token ? `Bearer ${storageConfig.r2_worker_token}` : ''
                },
                body: tFormData
              });

              if (response.ok) {
                const resData = await response.json();
                if (resData.success) {
                  const baseUrl = storageConfig.r2_worker_url.replace(/\/$/, '');
                  const rawUrl = resData.fakeUrl || resData.url;
                  const finalUrl = rawUrl.startsWith('http') ? rawUrl : `${baseUrl}/${rawUrl.replace(/^\//, '')}`;
                  return { data: { success: true, url: finalUrl }, error: null };
                }
              }
            } catch (err) {
              console.warn('Thumb upload to worker failed, falling back to edge function:', err);
            }
          }

          return await supabase.functions.invoke('upload-to-r2', {
            body: thumbFormData
          });
        })();

        if (!thumbError && thumbData?.success) {
          thumbnailUrl = thumbData.url;
        }
      }

      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress: 20 } : f));

      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress: 40 } : f));
      
      const sanitizedName = sanitizeFileName(fileObj.file.name);
      const ext = sanitizedName.split('.').pop() || (isImage ? 'jpg' : 'mp4');
      // 区分存储路径：写真图集使用 album_photos/[图集ID]/[图片名]
      const currentFolder = isAdmin && uploadMode === 'album' ? `album_photos/${currentAlbumId || albumId}` : prefix;
      const filePath = `${currentFolder}/${fileNameToUse}.${ext}`;
      
      let uploadData: any = null;
      let uploadError: any = null;

      // 定义上传尝试函数
      const tryWorker = async () => {
        if (!(storageConfig?.r2_mode === 'worker' && storageConfig?.r2_worker_url)) return null;
        try {
          const workerUrl = `${storageConfig.r2_worker_url.replace(/\/$/, '')}/upload`;
          const workerFormData = new FormData();
          workerFormData.append('file', fileToUpload);
          workerFormData.append('fileName', filePath);
          if (storageConfig?.bucket_name) {
            workerFormData.append('bucket', storageConfig.bucket_name);
          }
          const response = await fetch(workerUrl, {
            method: 'POST',
            headers: { 'Authorization': storageConfig.r2_worker_token ? `Bearer ${storageConfig.r2_worker_token}` : '' },
            body: workerFormData
          });
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Worker HTTP ${response.status}: ${text.slice(0, 50)}`);
          }
          const resData = await response.json();
          if (!resData.success) throw new Error(resData.message || 'Worker 接口返回失败');
          
          const baseUrl = storageConfig.r2_worker_url.replace(/\/$/, '');
          const rawUrl = resData.fakeUrl || resData.url;
          const finalUrl = rawUrl.startsWith('http') ? rawUrl : `${baseUrl}/${rawUrl.replace(/^\//, '')}`;
          
          return { success: true, url: finalUrl };
        } catch (e: any) {
          console.error('Worker upload fallback trigger:', e.message);
          return null;
        }
      };

      const tryR2S3 = async () => {
        if (!isR2S3Enabled) return null;
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('fileName', filePath);
        if (storageConfig?.bucket_name) {
          formData.append('bucket', storageConfig.bucket_name);
        }
        const { data, error } = await supabase.functions.invoke('upload-to-r2', { body: formData });
        if (error || !data?.success) {
          console.error('R2S3 upload fallback trigger:', error?.message || data?.error);
          return null;
        }
        return data;
      };

      const trySuperbed = async () => {
        if (!isSuperbedEnabled || !isImage) return null;
        const sFormData = new FormData();
        sFormData.append('file', fileToUpload);
        const { data, error } = await supabase.functions.invoke('superbed-handler', { body: sFormData });
        if (error || !data?.success) {
          console.error('Superbed upload fallback trigger:', error?.message || data?.error);
          return null;
        }
        return data;
      };

      // 构造优先级队列
      const priorityQueue: string[] = [];
      
      // 确定主存储模式
      let primary = 'worker'; // 默认
      if (selectedStorage === 'superbed') {
        primary = 'superbed';
      } else if (selectedStorage === 'r2') {
        primary = storageConfig?.r2_mode === 'worker' ? 'worker' : 's3';
      }
      
      // 核心原则：首先尝试选定的主存储
      priorityQueue.push(primary);
      
      // 后备顺序：worker -> s3 -> superbed
      const fallbacks = ['worker', 's3', 'superbed'];
      fallbacks.forEach(f => {
        if (!priorityQueue.includes(f)) {
          priorityQueue.push(f);
        }
      });

      console.log('[Upload] Upload priority queue:', priorityQueue);

      // 按优先级依次尝试
      for (const mode of priorityQueue) {
        console.log(`[Upload] Trying storage mode: ${mode}`);
        if (mode === 'superbed') {
          uploadData = await trySuperbed();
          if (uploadData?.success && uploadData?.url) {
            console.log('[Upload] Superbed upload success:', uploadData.url);
            const params = superbedConfig?.thumbnail_params || '?w=300';
            thumbnailUrl = uploadData.url.includes('?') ? `${uploadData.url}&${params.replace('?', '')}` : `${uploadData.url}${params}`;
            break;
          }
        } else if (mode === 'worker') {
          uploadData = await tryWorker();
          if (uploadData?.success) {
             console.log('[Upload] Worker upload success:', uploadData.url);
             break;
          }
        } else if (mode === 's3') {
          uploadData = await tryR2S3();
          if (uploadData?.success) {
             console.log('[Upload] S3 upload success:', uploadData.url);
             break;
          }
        }
      }

      if (!uploadData?.success) {
        uploadError = { message: '所有存储通道均尝试失败，请检查配置或稍后再试' };
      }

      if (uploadError) {
        let errorMsg = uploadError.message;
        // 尝试从 context 中获取详细错误信息
        try {
          if (uploadError?.context) {
            if (typeof uploadError.context.text === 'function') {
              errorMsg = await uploadError.context.text();
            } else if (typeof uploadError.context === 'string') {
              errorMsg = uploadError.context;
            } else if (uploadError.context.text) {
              errorMsg = uploadError.context.text;
            }
          }
        } catch (e) {
          // 忽略 context 解析错误，使用原始错误消息
        }
        throw new Error(errorMsg || '上传失败');
      }

      if (!uploadData?.success || !uploadData?.url) {
        throw new Error(uploadData?.error || '上传失败');
      }

      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress: 80 } : f));

      const tags = batchTags.split(/[ ,，\n]/).filter(Boolean);
      const finalTitle = title || generateDefaultTitle();
      
      let uploadRes: any;
      if (isAdmin && uploadMode === 'album') {
        const insertData: any = {
          album_id: currentAlbumId || albumId,
          url: uploadData.url,
          level: albumPhotoLevels[fileObj.id] || 'normal',
          sort_order: index,
          custom_field_values: albumCustomFieldValues,
          tags: tags.length > 0 ? tags : undefined
        };
        uploadRes = await supabase.from('album_photos').insert(insertData);
      } else {
        uploadRes = await api.uploadMedia({
          user_id: user.id,
          url: uploadData.url,
          thumbnail_url: thumbnailUrl,
          title: finalTitle,
          type: isImage ? 'image' : 'video',
          file_md5: fileObj.md5,
          content_hash: fileObj.contentHash,
          category_id: batchCategory !== 'all' ? batchCategory : undefined,
          tags: tags.length > 0 ? tags : undefined,
          metadata: fileObj.width && fileObj.height ? { width: fileObj.width, height: fileObj.height } : undefined
        } as any);
      }

      const { error: dbError } = uploadRes;

      if (dbError) throw dbError;
      
      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'success', progress: 100 } : f));
      return true;
    } catch (error: any) {
      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error', errorMsg: error.message } : f));
      return false;
    }
  };

  const handleCreateAlbumOnly = async () => {
    if (!newAlbumData.title) {
      toast.error('请输入图集名称');
      return;
    }
    setIsNewAlbumCoverUploading(true);
    try {
      const { data: album, error } = await supabase.from('photo_albums').insert({
        ...newAlbumData,
        custom_field_values: albumCustomFieldValues
      } as any).select().single();
      
      if (error) throw error;
      
      const newAlbum = album as any;
      setAlbums(prev => [newAlbum, ...prev]);
      setSelectedAlbumId(newAlbum.id);
      toast.success(`图集「${newAlbum.title}」创建成功，请开始上传照片`);
    } catch (err: any) {
      toast.error('创建失败: ' + err.message);
    } finally {
      setIsNewAlbumCoverUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error('请先选择要上传的文件');
      return;
    }
    if (!user || isAnyUploading) return;

    setIsAnyUploading(true);
    try {
      let currentAlbumId = selectedAlbumId;
      
      const idleFiles = files.filter(f => f.status === 'idle' || f.status === 'error');
      
      // 在正式上传前，先批量检查一次 MD5 查重，避免重复上传
      const md5sToCheck = idleFiles.map(f => f.md5).filter(Boolean) as string[];
      if (md5sToCheck.length > 0) {
        const existingMd5s = await checkMd5Existence(md5sToCheck);
        if (existingMd5s.size > 0) {
          setFiles(prev => prev.map(f => {
            if ((f.status === 'idle' || f.status === 'error') && f.md5 && existingMd5s.has(f.md5)) {
              return { ...f, status: 'duplicate', progress: 100 };
            }
            return f;
          }));
        }
      }

      const filesToProcess = files.filter(f => f.status === 'idle' || f.status === 'error');
      if (filesToProcess.length === 0) {
        setIsAnyUploading(false);
        const duplicates = files.filter(f => f.status === 'duplicate');
        if (duplicates.length > 0) {
           toast.info(`所选文件已全部存在，已跳过 ${duplicates.length} 个重复项`);
        }
        return;
      }

      if (isAdmin && uploadMode === 'album' && selectedAlbumId === 'new') {
        if (!newAlbumData.title) {
          toast.error('请输入图集名称');
          setIsAnyUploading(false);
          return;
        }
        
        const { data: album, error } = await supabase.from('photo_albums').insert({
          ...newAlbumData,
          custom_field_values: albumCustomFieldValues
        } as any).select().single();
        
        if (error) throw error;
        currentAlbumId = (album as any).id;
        toast.success(`图集「${(album as any).title}」创建成功`);
      }

      // 聚合图床支持 5 并发，其他存储保持 6
      const uploadConcurrency = selectedStorage === 'superbed' ? 5 : 6;
      const results = await runWithLimit(uploadConcurrency, filesToProcess, (fileObj, index) => uploadSingleFile(fileObj, index, currentAlbumId));
      
      setIsAnyUploading(false);
      const successCount = results.filter(Boolean).length;
      if (successCount === idleFiles.length) {
        if (isAdmin && uploadMode === 'album') {
          toast.success('图集内容上传成功');
          const { data: albumList } = await supabase.from('photo_albums').select('*').order('created_at', { ascending: false });
          setAlbums(albumList || []);
          setSelectedAlbumId(currentAlbumId);
        } else {
          const duplicates = files.filter(f => f.status === 'duplicate');
          if (duplicates.length > 0) {
            toast.info(`壁纸分享部分完成：${successCount} 成功, ${duplicates.length} 个重复已跳过`, { duration: 5000 });
          } else {
            toast.success('壁纸分享成功，请等待管理员审核');
          }
          api.bufferNotification({
            user_id: user.id,
            role_id: null,
            title: '壁纸分享已提交审核',
            content: `您成功分享了 ${successCount} 张壁纸${duplicates.length > 0 ? ` (已跳过 ${duplicates.length} 张重复)` : ''}，已进入审核队列，请耐心等待。`,
            type: 'audit',
            link: '/profile?tab=pending',
            link_type: 'internal'
          });
          api.checkUserBadgeTasks(user.id).catch(console.error);
        }
        setIsAllSuccess(true);
        setTimeout(() => navigate('/profile'), 2000);
      }
    } catch (err: any) {
      toast.error('上传过程中出错: ' + err.message);
      setIsAnyUploading(false);
    }
  };

  const handleBatchImport = async () => {
    if (!batchUrls.trim() || !user || isImporting) return;
    
    setIsImporting(true);
    const loadingToast = toast.loading('正在进行导入预处理...');
    
    try {
      const photoIdMap = (window as any).__zonerama_photo_id_map || {};
      
      // 1. 整理待导入列表并提取 ID
      const rawImportList = importPreviews.filter(p => !p.isCover).map(p => {
        const pid = p.photo_id || getZoneramaIdFromUrl(p.url) || photoIdMap[p.url];
        return { ...p, photoId: pid };
      });

      // 2. 进行一波最终的批量查重
      const photoIdsToCheck = rawImportList.map(p => p.photoId).filter(Boolean) as string[];
      const otherUrlsToCheck = rawImportList.filter(p => !p.photoId).map(p => p.url);
      
      const [existingIds, existingUrls] = await Promise.all([
        checkZoneramaExistence(photoIdsToCheck),
        checkUrlExistence(otherUrlsToCheck)
      ]);
      
      // 3. 过滤出真正需要导入的（排除数据库已存在的）
      const finalImportList = rawImportList.filter(p => {
        if (p.photoId) return !existingIds.has(p.photoId);
        return !existingUrls.has(p.url);
      });

      const totalDuplicate = importPreviews.length - finalImportList.length;

      if (finalImportList.length === 0) {
        toast.dismiss(loadingToast);
        toast.info(`检测到 ${totalDuplicate} 个链接已存在，已全部跳过`);
        setIsImporting(false);
        return;
      }

      toast.loading(`正在导入 ${finalImportList.length} 个资源... (已跳过 ${totalDuplicate} 个重复项)`, { id: loadingToast });

      let currentAlbumId = selectedAlbumId;
      
      // 如果是新建图集模式
      if (isAdmin && uploadMode === 'album' && selectedAlbumId === 'new') {
        if (!newAlbumData.title) {
          toast.dismiss(loadingToast);
          toast.error('请输入图集名称');
          setIsImporting(false);
          return;
        }
        
        const { data: album, error } = await supabase.from('photo_albums').insert({
          ...newAlbumData,
          custom_field_values: albumCustomFieldValues
        } as any).select().single();
        
        if (error) throw error;
        currentAlbumId = (album as any).id;
        toast.success(`图集「${(album as any).title}」创建成功`);
      }

      // 4. 并发导入 (限制并发数为 8，兼顾速度与数据库压力)
      let successCount = 0;
      await runWithLimit(8, finalImportList, async (p, index) => {
        // 满足用户最新需求：入库链接以资源链接列表实际链接为准
        // 如果是 Zonerama ID (纯数字)，则转换为标准 URL，否则直接使用 p.url
        let url = p.url;
        const photoId = p.photoId || (/^\d+$/.test(url) ? url : null);
        
        // 自动转换 Zonerama 链接为标准格式 (统一入库原始 URL)
        if (photoId) {
          url = getZoneramaOriginalUrl(photoId);
        }

        try {
          let uploadRes: any;
          if (isAdmin && uploadMode === 'album') {
            const insertData: any = {
              album_id: currentAlbumId,
              url: url, // 统一入库原始 URL，显示时自动应用代理
              thumbnail_url: p.remoteThumbnailUrl || null, // 支持导入封面
              level: 'normal', // 导入默认普通
              sort_order: index,
              custom_field_values: albumCustomFieldValues,
              zonerama_photo_id: photoId // 记录 Zonerama 图片 ID
            };
            uploadRes = await supabase.from('album_photos').insert(insertData);
          } else {
            const tags = batchTags.split(/[ ,，\n]/).filter(Boolean);
            uploadRes = await api.uploadMedia({
              user_id: user.id,
              url: url, // 统一入库原始 URL，显示时自动应用代理
              thumbnail_url: p.remoteThumbnailUrl || null,
              title: title || generateDefaultTitle(),
              description: description || null,
              type: p.type === "video" ? "video" : "image",
              category_id: batchCategory !== 'all' ? batchCategory : null,
              tags: tags.length > 0 ? tags : [],
              zonerama_photo_id: photoId // 记录 Zonerama 图片 ID
            } as any);
          }
          if (!uploadRes.error) successCount++;
        } catch (e) {
          console.error("Import error for " + url, e);
        }
      });

      // 任务完成后清除映射
      delete (window as any).__zonerama_photo_id_map;

      toast.dismiss(loadingToast);

      if (successCount > 0) {
        toast.success(`成功导入 ${successCount} 个资源${totalDuplicate > 0 ? ` (跳过 ${totalDuplicate} 个重复项)` : ''}`);
        if (isAdmin && uploadMode === 'album') {
          const { data: albumList } = await supabase.from('photo_albums').select('*').order('created_at', { ascending: false });
          setAlbums(albumList || []);
          setSelectedAlbumId(currentAlbumId);
        } else {
          setBatchUrls("");
          setTitle("");
          setTimeout(() => navigate("/profile"), 1500);
        }
      } else {
        if (finalImportList.length > 0) {
          toast.error("导入失败，请检查控制台或联系管理员");
        } else {
          toast.info(`检测到 ${totalDuplicate} 个链接已存在，已全部跳过`);
        }
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(`导入失败: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  if (loadingPerms) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">验证权限中...</p>
      </div>
    );
  }

  // 无上传权限
  if (!permissions.includes('upload')) {
    return (
      <div className="container mx-auto p-4 max-w-lg mt-20 text-center space-y-4">
        <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center text-red-500">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold">权限受限</h2>
        <p className="text-muted-foreground">您当前所在的权限组没有“上传内容”的权限。如有疑问请联系管理员。</p>
        <Button onClick={() => navigate('/')} variant="outline" className="rounded-xl px-10">返回主页</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden @container">
      {/* 顶部背景装饰 */}
      <div className="fixed top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-primary/10 via-background to-transparent pointer-events-none -z-10" />
      <div className="fixed top-20 right-[10%] w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-20 left-[10%] w-[250px] h-[250px] bg-secondary/5 rounded-full blur-[80px] pointer-events-none -z-10" />
      <main className="container max-w-lg mx-auto px-4 pt-12">
        {/* 标题部分 */}

        {/* 管理员上传模式选择 */}
        {isAdmin && (
          <div className="mb-8 p-1 bg-muted/50 rounded-2xl border border-border/50 backdrop-blur-sm flex animate-in fade-in zoom-in duration-500">
            <button
              onClick={() => setUploadMode('wallpaper')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all",
                uploadMode === 'wallpaper'
                  ? "bg-background text-foreground shadow-lg shadow-black/5 ring-1 ring-border/50"
                  : "text-muted-foreground hover:bg-background/50"
              )}
            >
              <ImagePlus className="w-4 h-4" />
              <span>普通壁纸</span>
            </button>
            <button
              onClick={() => setUploadMode('album')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all",
                uploadMode === 'album'
                  ? "bg-background text-foreground shadow-lg shadow-black/5 ring-1 ring-border/50"
                  : "text-muted-foreground hover:bg-background/50"
              )}
            >
              <BookOpen className="w-4 h-4" />
              <span>写真图集</span>
            </button>
          </div>
        )}
        {/* 写真图集模式配置 - 移动到 Tabs 外部以共享 */}
        {isAdmin && uploadMode === 'album' && (
          <div className="mb-6 space-y-6 p-6 rounded-[2rem] bg-primary/5 border border-primary/10 animate-in zoom-in-95 duration-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                <FolderPlus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">图集配置</h3>
                <p className="text-xs text-muted-foreground">选择现有图集或新建一个</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>选择图集</Label>
                <Select value={selectedAlbumId} onValueChange={setSelectedAlbumId}>
                  <SelectTrigger className="rounded-xl bg-background border-border/50">
                    <SelectValue placeholder="请选择目标图集" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50">
                    <SelectItem value="new" className="text-primary font-medium focus:bg-primary/10">
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        <span>新建图集</span>
                      </div>
                    </SelectItem>
                    {albums.map((album: any) => (
                      <SelectItem key={album.id} value={album.id}>{album.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAlbumId === 'new' && (
                <div className="space-y-4 p-5 rounded-2xl bg-background/50 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">图集名称</Label>
                      <Input 
                        placeholder="输入图集名称"
                        className="rounded-xl h-10 bg-background"
                        value={newAlbumData.title}
                        onChange={(e) => setNewAlbumData({...newAlbumData, title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">图集类型</Label>
                      <Input 
                        placeholder="如：复古、二次元"
                        className="rounded-xl h-10 bg-background"
                        value={newAlbumData.album_type}
                        onChange={(e) => setNewAlbumData({...newAlbumData, album_type: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">图集描述</Label>
                    <Textarea 
                      placeholder="输入图集详细描述"
                      className="rounded-xl h-20 bg-background resize-none"
                      value={newAlbumData.description}
                      onChange={(e) => setNewAlbumData({...newAlbumData, description: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">可见范围</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'pt', name: '公开' },
                        { id: 'vip', name: 'VIP' },
                        { id: 'svip', name: 'SVIP' }
                      ].map((lvl) => (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => setNewAlbumData({...newAlbumData, level: lvl.id})}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                            newAlbumData.level === lvl.id
                              ? "bg-primary text-white shadow-md shadow-primary/20" 
                              : "bg-muted/50 text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {lvl.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold">自动打包PDF下载</Label>
                      <p className="text-[10px] text-muted-foreground">开启后系统将自动生成PDF合集</p>
                    </div>
                    <Switch 
                      checked={newAlbumData.auto_pdf_enabled}
                      onCheckedChange={(val) => setNewAlbumData({...newAlbumData, auto_pdf_enabled: val})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">图集封面</Label>
                    <div className="relative aspect-[16/9] rounded-2xl bg-muted/30 border-2 border-dashed border-primary/20 overflow-hidden group">
                      {newAlbumData.cover_url ? (
                        <>
                          <img src={newAlbumData.cover_url} className="w-full h-full object-contain" alt="封面预览" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Label htmlFor="album-cover" className="cursor-pointer p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors">
                              <Edit3 className="w-5 h-5" />
                            </Label>
                          </div>
                        </>
                      ) : (
                        <Label htmlFor="album-cover" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 transition-colors">
                          {isNewAlbumCoverUploading ? (
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          ) : (
                            <>
                              <ImagePlus className="w-8 h-8 text-primary/40 mb-2" />
                              <span className="text-[10px] text-muted-foreground">上传封面图</span>
                            </>
                          )}
                        </Label>
                      )}
                      <input 
                        id="album-cover" 
                        type="file" 
                        accept="image/*" 
                        className="sr-only" 
                        onChange={handleAlbumCoverUpload}
                        disabled={isNewAlbumCoverUploading}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="button"
                    className="w-full rounded-xl py-6 font-bold text-md shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]"
                    onClick={handleCreateAlbumOnly}
                    disabled={isNewAlbumCoverUploading}
                  >
                    {isNewAlbumCoverUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <FolderPlus className="w-5 h-5 mr-2" />}
                    创建图集并继续上传
                  </Button>
                </div>
              )}
            </div>

            {/* 图集自定义字段展示 */}
            {selectedAlbumId === 'new' && customFields.length > 0 && (
              <div className="space-y-3 pt-2">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-primary" />
                  <span>自定义字段信息</span>
                </Label>
                <div className="grid grid-cols-1 gap-3">
                  {customFields.map((field: any) => (
                    <div key={field.id} className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground pl-1">{field.field_name}</Label>
                      {field.field_type === 'text' && (
                        <Input 
                          placeholder={`请输入${field.field_name}`}
                          className="rounded-xl h-9 text-xs bg-background"
                          value={albumCustomFieldValues[field.field_name] || ''}
                          onChange={(e) => setAlbumCustomFieldValues({
                            ...albumCustomFieldValues,
                            [field.field_name]: e.target.value
                          })}
                        />
                      )}
                      {field.field_type === 'date' && (
                        <Input 
                          type="date"
                          className="rounded-xl h-9 text-xs bg-background"
                          value={albumCustomFieldValues[field.field_name] || ''}
                          onChange={(e) => setAlbumCustomFieldValues({
                            ...albumCustomFieldValues,
                            [field.field_name]: e.target.value
                          })}
                        />
                      )}
                      {field.field_type === 'select' && (
                        <Select 
                          value={albumCustomFieldValues[field.field_name] || ''} 
                          onValueChange={(val) => setAlbumCustomFieldValues({
                            ...albumCustomFieldValues,
                            [field.field_name]: val
                          })}
                        >
                          <SelectTrigger className="rounded-xl h-9 text-xs bg-background">
                            <SelectValue placeholder={`请选择${field.field_name}`} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {field.options?.map((opt: string) => (
                              <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className={cn(
            "grid w-full h-12 p-1.5 bg-muted/50 backdrop-blur-md rounded-2xl border border-border/50",
            isAdmin ? "grid-cols-4" : "grid-cols-3"
          )}>
            <TabsTrigger value="local" disabled={!isUploadAvailable} className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">本地上传</TabsTrigger>
            <TabsTrigger value="remote" disabled={!canLinkImport} className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">链接导入</TabsTrigger>
            <TabsTrigger value="parse" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">解析导入</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin_zonerama" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">专享上传</TabsTrigger>}
          </TabsList>

          <TabsContent value="local" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {!isUploadAvailable ? (
              <Card className="border-border/50 shadow-xl shadow-black/5 overflow-hidden bg-background/80 backdrop-blur-xl rounded-[2.5rem]">
                <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-amber-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">本地上传功能暂时不可用</h3>
                    <p className="text-muted-foreground max-w-xs mx-auto">
                      系统检测到所有存储通道（R2-Worker, R2-S3, 聚合图床）均未配置或当前失效。
                    </p>
                  </div>
                  {canLinkImport && (
                    <Button onClick={() => setActiveTab('remote')} className="rounded-xl">
                      切换到链接导入
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="outline" onClick={goToAdminSettings} className="rounded-xl">
                      去后台配置存储
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50 shadow-xl shadow-black/5 overflow-hidden bg-background/80 backdrop-blur-xl rounded-[2.5rem]">
                <CardContent className="p-8 space-y-8">
                {isSuperbedEnabled && uploadMode === 'wallpaper' && (
                  <StorageSelector 
                    selectedStorage={selectedStorage}
                    setSelectedStorage={setSelectedStorage}
                  />
                )}

                {/* 下方是具体的发布表单内容 */}
                {(!isAdmin || uploadMode === 'wallpaper' || (uploadMode === 'album' && selectedAlbumId && selectedAlbumId !== 'new')) ? (
                  <div className="space-y-6 pt-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <div className="space-y-4">
                      {uploadMode === 'wallpaper' && (
                        <div className="space-y-2">
                          <Label htmlFor="title">批量设置标题（可选）</Label>
                          <Input 
                            id="title"
                            placeholder="统一设置作品标题，留空则使用文件名" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={isAnyUploading}
                            className="rounded-xl h-12"
                          />
                        </div>
                      )}

                      {/* 批量设置分类与标签 - 普通壁纸全显，写真图集仅显标签 */}
                      {((uploadMode === 'wallpaper' && storageConfig?.enable_upload_categories !== false) || storageConfig?.enable_upload_tags !== false) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 分类选择：仅限普通壁纸模式 */}
                          {uploadMode === 'wallpaper' && storageConfig?.enable_upload_categories !== false && (
                            <div className="space-y-3">
                              <Label className="font-bold flex items-center justify-between">
                                <span>选择作品分类</span>
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  {storageConfig?.upload_category_single ? '单选' : '多选'}
                                </span>
                              </Label>
                              {storageConfig?.upload_category_single ? (
                                <RadioGroup 
                                  value={batchCategory} 
                                  onValueChange={setBatchCategory}
                                  className="flex flex-wrap gap-2"
                                  disabled={isAnyUploading}
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="all" id="cat-all" className="peer sr-only" />
                                    <Label
                                      htmlFor="cat-all"
                                      className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all border",
                                        batchCategory === 'all' 
                                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" 
                                          : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                                      )}
                                    >
                                      未分类
                                    </Label>
                                  </div>
                                  {categories.map(cat => (
                                    <div key={cat.id} className="flex items-center space-x-2">
                                      <RadioGroupItem value={cat.id} id={`cat-${cat.id}`} className="peer sr-only" />
                                      <Label
                                        htmlFor={`cat-${cat.id}`}
                                        className={cn(
                                          "px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all border",
                                          batchCategory === cat.id 
                                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" 
                                            : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                                        )}
                                      >
                                        {cat.name}
                                      </Label>
                                    </div>
                                  ))}
                                </RadioGroup>
                              ) : (
                                <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-muted/20 border border-muted/50 min-h-[48px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = batchCategory.split(',').filter(Boolean);
                                      if (current.includes('all')) {
                                        setBatchCategory('');
                                      } else {
                                        setBatchCategory('all');
                                      }
                                    }}
                                    className={cn(
                                      "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                                      batchCategory.split(',').includes('all') 
                                        ? "bg-primary text-white shadow-md shadow-primary/20" 
                                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                    )}
                                  >
                                    未分类
                                  </button>
                                  {categories.map(cat => {
                                    const selected = batchCategory.split(',').includes(cat.id);
                                    return (
                                      <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => {
                                          const current = batchCategory.split(',').filter(c => c && c !== 'all');
                                          if (selected) {
                                            setBatchCategory(current.filter(c => c !== cat.id).join(','));
                                          } else {
                                            setBatchCategory([...current, cat.id].join(','));
                                          }
                                        }}
                                        className={cn(
                                          "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                                          selected 
                                            ? "bg-primary text-white shadow-md shadow-primary/20" 
                                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                        )}
                                      >
                                        {cat.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                          {/* 标签选择：壁纸与图集模式通用 */}
                          {storageConfig?.enable_upload_tags !== false && (
                            <div className={cn("space-y-3", uploadMode === 'album' && "col-span-full")}>
                              <Label className="font-bold">作品标签</Label>
                              <TagSelector 
                                value={batchTags}
                                onChange={setBatchTags}
                                disabled={isAnyUploading}
                              />
                              {isAdmin && (
                                <QuickTagGroup 
                                  value={batchTags}
                                  onChange={setBatchTags}
                                  disabled={isAnyUploading}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}

              </div>

          {/* 博主识别区 */}
          {uploadMode === 'wallpaper' && (
            <Card className="mb-6 border-dashed border-2 bg-muted/30 overflow-hidden relative group">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Search className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">本地文字识别</CardTitle>
                  <CardDescription className="text-[10px]">识别截图中所有汉字和字母，点击选择添加为标签</CardDescription>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs rounded-xl gap-2 font-bold"
                disabled={isOcrLoading || isAnyUploading}
                onClick={() => document.getElementById('blogger-ocr-input')?.click()}
              >
                {isOcrLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LucideUpload className="w-3 h-3" />}
                {bloggerImage ? '重新识别' : '识别文字'}
              </Button>
              <input 
                id="blogger-ocr-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBloggerOcr(file);
                }}
              />
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {bloggerImage ? (
                <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-muted-foreground/20">
                  <img src={bloggerImage} alt="blogger profile" className="w-full h-full object-contain" />
                  {isOcrLoading && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-white">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <p className="text-xs font-bold animate-pulse">正在识别文字...</p>
                    </div>
                  )}
                  <button 
                    onClick={() => {
                      setBloggerImage(null);
                      setOcrResults([]);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center text-center gap-2 opacity-60">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    上传图片进行文字识别<br />
                    点击识别结果添加为标签
                  </p>
                </div>
              )}

              {/* OCR 结果选择区 */}
              {!isOcrLoading && (ocrLines.length > 0 || ocrResults.length > 0) && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* 段落推荐 */}
                  {ocrLines.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        推荐词组/段落（点击快速添加）
                      </Label>
                      <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-green-50/30 border border-green-100 max-h-[100px] overflow-y-auto">
                        {ocrLines.map((line, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              const text = line.trim();
                              if (!text) return;
                              const currentTags = batchTags.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean);
                              if (!currentTags.includes(text)) {
                                setBatchTags([...currentTags, text].join(','));
                                toast.success(`已添加标签: ${text}`);
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-white border border-green-200 text-[10px] font-medium text-slate-700 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all shadow-sm"
                          >
                            {line}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 逐词选择与组词 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Info className="w-3 h-3 text-blue-500" />
                        识别结果（点击多选并组词）
                      </Label>
                      {selectedOcrSegments.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-[10px] rounded-lg text-muted-foreground hover:bg-muted"
                            onClick={() => setSelectedOcrSegments([])}
                          >
                            清空
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-6 px-2 text-[10px] rounded-lg bg-blue-600 hover:bg-blue-700 text-white gap-1"
                            onClick={() => {
                              const combined = selectedOcrSegments.join('');
                              const currentTags = batchTags.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean);
                              if (!currentTags.includes(combined)) {
                                setBatchTags([...currentTags, combined].join(','));
                                toast.success(`已组词并添加标签: ${combined}`);
                                setSelectedOcrSegments([]);
                              }
                            }}
                          >
                            组词并添加 ({selectedOcrSegments.length})
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-blue-50/30 border border-blue-100 max-h-[120px] overflow-y-auto">
                      {ocrResults.map((words, idx) => {
                        const isSelected = selectedOcrSegments.includes(words);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedOcrSegments(prev => prev.filter(s => s !== words));
                              } else {
                                setSelectedOcrSegments(prev => [...prev, words]);
                              }
                            }}
                            className={cn(
                              "px-2 py-1 rounded-lg border text-[10px] font-medium transition-all shadow-sm",
                              isSelected 
                                ? "bg-blue-600 border-blue-600 text-white" 
                                : "bg-white border-blue-200 text-slate-700 hover:bg-blue-50"
                            )}
                          >
                            {words}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          <div 
            className="relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center min-h-[120px] transition-colors border-muted-foreground/20 hover:border-primary/50 cursor-pointer mb-6"
            onClick={() => {
              if (isAnyUploading) return;
              // 微信环境下优先使用微信 JS-SDK 图片选择以支持多选 (如果已注入)
              if (isWechat && (window as any).wx) {
                handleWechatImageSelect();
              } else {
                fileInputRef.current?.click();
              }
            }}
          >
            <div className="flex flex-col items-center gap-2 p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ImagePlus className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium">点击添加图片或视频</p>
              <p className="text-[10px] text-muted-foreground text-center">支持批量选择（九宫格展示，并发上传）</p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple
              accept="image/*,video/*,.heic,.heif"
              capture={false as any}
              onChange={handleFileSelect}
              disabled={isAnyUploading}
            />
          </div>


          {/* 上传列表 - 九宫格展示 */}
          <div className="grid grid-cols-3 gap-3">
            {files.map((fileObj) => (
              <FilePreviewCard
                key={fileObj.id}
                fileObj={fileObj}
                isAdmin={isAdmin}
                uploadMode={uploadMode}
                isAnyUploading={isAnyUploading}
                albumPhotoLevels={albumPhotoLevels}
                setAlbumPhotoLevels={setAlbumPhotoLevels}
                removeFile={removeFile}
                handleRetrySingle={handleRetrySingle}
                onSelectThumbnail={setThumbnailSelectFileId}
                onManualThumbnail={handleManualThumbnail}
              />
            ))}
            
            {/* 如果还没有满9个，可以显示一个占位符引导添加 (可选) */}
            {files.length > 0 && files.length < 9 && !isAnyUploading && (
              <div 
                className="aspect-square border-2 border-dashed border-muted-foreground/20 rounded-xl flex items-center justify-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImagePlus className="w-4 h-4" />
                  <span className="text-[10px]">继续添加</span>
                </div>
              </div>
            )}
          </div>

          {files.length > 0 && !isAllSuccess && (
            <div className="space-y-3 sticky bottom-4 z-10">
              <Button 
                className="w-full h-12 rounded-xl text-lg font-bold shadow-lg" 
                disabled={isAnyUploading || (isAdmin && uploadMode === 'album' && !selectedAlbumId)}
                onClick={handleSubmit}
              >
                {isAnyUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    正在上传图集/壁纸...
                  </>
                ) : (
                  uploadMode === 'album' 
                    ? `确认发布写真图集 (${files.filter(f => f.status === 'idle' || f.status === 'error').length} 张)`
                    : `开始分享 (${files.filter(f => f.status === 'idle' || f.status === 'error').length} 个待处理)`
                )}
              </Button>

              {files.some(f => f.status === 'error') && (
                <Button 
                  variant="outline"
                  className="w-full h-10 rounded-xl text-xs font-medium border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-all"
                  onClick={() => setIsErrorReportOpen(true)}
                  disabled={isAnyUploading}
                >
                  <ShieldAlert className="w-4 h-4 mr-2" /> 查看上传问题报告
                </Button>
              )}
            </div>
          )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
              <FolderOpen className="w-8 h-8 text-primary/40" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-foreground">请先选择或创建图集</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto px-6">
              写真图集模式下，需要先选择一个现有的图集或者新建一个，才能继续上传本地文件。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )}
</TabsContent>

        <TabsContent value="remote" className="space-y-6 pt-6">
          {(!isAdmin || uploadMode === 'wallpaper' || (uploadMode === 'album' && selectedAlbumId && selectedAlbumId !== 'new')) ? (
            <>
              {/* Zonerama 相册导入 */}
              {isAdmin && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <Label htmlFor="zonerama-album-id" className="text-sm font-bold flex items-center gap-2">
                    <LucideUpload className="w-4 h-4 text-primary" />
                    从 Zonerama 相册导入 (相册 ID)
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      id="zonerama-album-id"
                      placeholder="输入 Zonerama 相册 ID (例如: 123456)" 
                      value={zoneramaAlbumIdInput}
                      onChange={(e) => setZoneramaAlbumIdInput(extractZoneramaAlbumId(e.target.value))}
                      disabled={isLoadingZoneramaAlbum || isImporting}
                      className="rounded-xl h-10 bg-background"
                    />
                    <Button 
                      variant="secondary"
                      onClick={handleLoadZoneramaAlbum}
                      disabled={isLoadingZoneramaAlbum || isImporting || !zoneramaAlbumIdInput.trim()}
                      className="rounded-xl h-10 font-bold whitespace-nowrap"
                    >
                      {isLoadingZoneramaAlbum ? <Loader2 className="w-4 h-4 animate-spin" /> : "加载图片"}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    输入 ID 后点击加载，系统将自动拉取相册内的所有图片链接填充到下方列表。
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="batch-title">统一设置标题（可选）</Label>
                <Input 
                  id="batch-title"
                  placeholder="导入的作品标题，留空则使用默认值" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isImporting}
                  className="rounded-xl h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch-description">统一设置描述（可选）</Label>
                <Textarea 
                  id="batch-description"
                  placeholder="导入的作品详细描述，留空则不设置" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isImporting}
                  className="rounded-xl min-h-[80px]"
                />
              </div>

              {/* 批量设置分类与标签 - 远程导入遵循全局配置 */}
              {((uploadMode === 'wallpaper' && storageConfig?.enable_upload_categories !== false) || storageConfig?.enable_upload_tags !== false) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {uploadMode === 'wallpaper' && storageConfig?.enable_upload_categories !== false && (
                    <div className="space-y-3">
                      <Label className="font-bold">选择作品分类</Label>
                      <Select value={batchCategory} onValueChange={setBatchCategory}>
                        <SelectTrigger className="rounded-xl h-12 bg-background">
                          <SelectValue placeholder="选择分类" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">未分类</SelectItem>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {storageConfig?.enable_upload_tags !== false && (
                    <div className={cn("space-y-3", uploadMode === 'album' && "col-span-full")}>
                      <Label className="font-bold">作品标签</Label>
                      <TagSelector 
                        value={batchTags}
                        onChange={setBatchTags}
                        disabled={isImporting}
                      />
                      {isAdmin && (
                        <QuickTagGroup 
                          value={batchTags}
                          onChange={setBatchTags}
                          disabled={isImporting}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PostImages 外部上传按钮 */}
              <div className="p-4 bg-secondary/20 rounded-2xl border border-secondary/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <LinkIcon className="w-4 h-4 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">通过外部网站上传</p>
                      <p className="text-[10px] text-muted-foreground">使用 PostImages 免费图床获取图片链接</p>
                    </div>
                  </div>
                  <Button 
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowIframeUpload(true)}
                    disabled={isImporting}
                    className="rounded-xl h-9 px-4"
                  >
                    打开上传页面
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="urls">资源链接列表（每行一个）</Label>
                <Textarea 
                  id="urls"
                  placeholder="http://example.com/image1.jpg&#10;http://example.com/video1.mp4" 
                  value={batchUrls}
                  onChange={(e) => setBatchUrls(e.target.value)}
                  disabled={isImporting}
                  className="min-h-[200px] rounded-xl font-mono text-xs p-4 bg-muted/30 focus-visible:ring-primary"
                />
              </div>

              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <p className="text-xs text-primary font-medium mb-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> 提示:
                </p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  批量分享时，系统将并行验证并直接存储远程资源链接至数据库。
                  无需转存，处理速度更快。请确保链接长期有效且可公开访问。
                </p>
              </div>

              {importPreviews.length > 0 && (
                <div className="space-y-4">
                  <Label className="text-xs font-bold text-muted-foreground flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Download className="w-3 h-3" />
                      预导入内容预览 ({importPreviews.length})
                      {selectedImportUrls.size > 0 && (
                        <span className="text-primary ml-1">已选 {selectedImportUrls.size}</span>
                      )}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[10px] text-primary hover:bg-primary/10 rounded-lg px-2"
                        onClick={() => {
                          if (selectedImportUrls.size === importPreviews.length) {
                            setSelectedImportUrls(new Set());
                          } else {
                            setSelectedImportUrls(new Set(importPreviews.map(p => p.url)));
                          }
                        }}
                      >
                        {selectedImportUrls.size === importPreviews.length ? '取消全选' : '全选'}
                      </Button>
                      {selectedImportUrls.size > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg px-2"
                          onClick={() => {
                            const newList = importPreviews.filter(p => !selectedImportUrls.has(p.url));
                            setBatchUrls(newList.map(p => p.url).join('\n'));
                            setSelectedImportUrls(new Set());
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> 删除选中
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[10px] text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg px-2"
                        onClick={() => {
                          setBatchUrls("");
                          setTitle("");
                          setBatchTags("");
                          setSelectedImportUrls(new Set());
                          toast.success('草稿已清除');
                        }}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> 清除草稿
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[10px] text-primary hover:bg-primary/10 rounded-lg px-2"
                        onClick={() => {
                          const lines = batchUrls.split('\n');
                          const newLines = lines.map(line => {
                            let url = line.trim();
                            if (url.includes('xhscdn.com') && !url.includes('notes_pre_post/')) {
                              // 尝试在域名后插入 notes_pre_post/
                              if (url.includes('.xhscdn.com/')) {
                                const parts = url.split('.xhscdn.com/');
                                if (parts.length === 2) {
                                  return parts[0] + '.xhscdn.com/notes_pre_post/' + parts[1];
                                }
                              }
                            }
                            return line;
                          });
                          setBatchUrls(newLines.join('\n'));
                          toast.success('已批量添加 notes_pre_post/');
                        }}
                      >
                        批量添加 notes_pre_post/
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[10px] text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg px-2"
                        onClick={() => {
                          const lines = batchUrls.split('\n');
                          const newLines = lines.map(line => line.replace('notes_pre_post/', ''));
                          setBatchUrls(newLines.join('\n'));
                          toast.success('已批量删除 notes_pre_post/');
                        }}
                      >
                        批量删除 notes_pre_post/
                      </Button>
                      {importPreviews.some(p => p.exists) && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-[10px] text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 rounded-lg px-2"
                          onClick={() => {
                            const newList = importPreviews.filter(p => !p.exists);
                            setBatchUrls(newList.map(p => p.url).join('\n'));
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> 清空已存在数据
                        </Button>
                      )}
                    </div>
                  </Label>
                  <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-1">
                    {importPreviews.filter(p => !p.isCover).map((p, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "relative aspect-video rounded-xl overflow-hidden border shadow-sm group cursor-pointer transition-all",
                          selectedImportUrls.has(p.url) ? "ring-2 ring-primary border-primary shadow-primary/20 scale-[0.98]" : "border-border hover:border-primary/50"
                        )}
                        onClick={() => {
                          const next = new Set(selectedImportUrls);
                          if (next.has(p.url)) next.delete(p.url);
                          else next.add(p.url);
                          setSelectedImportUrls(next);
                        }}
                      >
                        {p.loading ? (
                          <div className="w-full h-full flex items-center justify-center bg-muted animate-pulse">
                            <Loader2 className="w-5 h-5 animate-spin text-primary/30" />
                          </div>
                        ) : p.type === "video" ? (
                          <>
                            <img 
                              src={p.thumbnailPreview || p.previewUrl || p.url} 
                              className="w-full h-full object-contain" 
                              alt="thumb" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <PlayCircle className="w-8 h-8 text-white drop-shadow-lg" />
                            </div>
                            {/* 视频标识 */}
                            <div className="absolute top-1 right-1">
                              <Badge className="bg-primary/90 text-white text-[8px] h-4 px-1 rounded-sm">视频</Badge>
                            </div>
                          </>
                        ) : (
                          <img 
                            src={p.previewUrl || p.url} 
                            className="w-full h-full object-contain" 
                            alt="img" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://via.placeholder.com/300?text=Import+Preview";
                          }} />
                        )}
                        
                        {/* 状态标记 */}
                        <div className="absolute top-1 left-1 flex flex-col gap-1 pointer-events-none">
                          <div className="px-1.5 py-0.5 rounded-lg bg-black/50 backdrop-blur-sm text-[8px] text-white w-fit">
                            {idx + 1}
                          </div>
                          {p.exists && (
                            <div className="px-1.5 py-0.5 rounded-lg bg-red-500/90 backdrop-blur-sm text-[8px] text-white font-bold animate-in fade-in zoom-in duration-300 w-fit">
                              已存在
                            </div>
                          )}
                        </div>

                        {/* 选中状态指示器 */}
                        {selectedImportUrls.has(p.url) && (
                          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none">
                            <div className="bg-primary text-white p-1 rounded-full shadow-lg">
                              <CheckSquare className="w-3 h-3" />
                            </div>
                          </div>
                        )}

                        {/* notes_pre_post/ 单链接操作按钮 */}
                        {!isImporting && p.url.includes('xhscdn.com') && (
                          <Button
                            variant="secondary"
                            size="icon"
                            className={cn(
                              "absolute top-1 right-8 w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-lg border-none",
                              p.url.includes('notes_pre_post/')
                                ? "bg-amber-500/80 hover:bg-amber-600"
                                : "bg-emerald-500/80 hover:bg-emerald-600"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              const lines = batchUrls.split('\n');
                              const originalUrl = p.url.trim();
                              let found = false;
                              const newLines = lines.map(line => {
                                const trimmed = line.trim();
                                if (!found && trimmed === originalUrl) {
                                  found = true;
                                  if (trimmed.includes('notes_pre_post/')) {
                                    return line.replace('notes_pre_post/', '');
                                  } else if (trimmed.includes('.xhscdn.com/')) {
                                    const parts = trimmed.split('.xhscdn.com/');
                                    if (parts.length === 2) {
                                      return parts[0] + '.xhscdn.com/notes_pre_post/' + parts[1];
                                    }
                                  }
                                }
                                return line;
                              });
                              setBatchUrls(newLines.join('\n'));
                              if (found) {
                                toast.success(p.url.includes('notes_pre_post/') ? '已移除前缀' : '已添加前缀');
                              }
                            }}
                            title={p.url.includes('notes_pre_post/') ? '删除 notes_pre_post/' : '添加 notes_pre_post/'}
                          >
                            {p.url.includes('notes_pre_post/') ? (
                              <Minus className="w-3 h-3 text-white" />
                            ) : (
                              <Plus className="w-3 h-3 text-white" />
                            )}
                          </Button>
                        )}

                        {/* 删除按钮 */}
                        {!isImporting && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/80 hover:bg-red-600 backdrop-blur-sm shadow-lg border-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newList = importPreviews.filter((_, i) => i !== idx);
                              setBatchUrls(newList.map(p => p.url).join('\n'));
                            }}
                          >
                            <X className="w-3 h-3 text-white" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Button 
                onClick={handleBatchImport} 
                className="w-full h-12 rounded-xl text-lg font-bold shadow-lg mt-4"
                disabled={isImporting || !batchUrls.trim()}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    正在拉取并转存远程作品...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" /> 开始批量分享
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-[2rem] border border-dashed border-border/50 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-primary/40" />
              </div>
              <h3 className="text-lg font-bold mb-2">请先选择或创建图集</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto px-6">
                写真图集模式下，需要先选择一个现有的图集或者新建一个，才能继续导入远程资源。
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="parse" className="space-y-6 pt-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <Card className="border-border/50 shadow-xl shadow-black/5 overflow-hidden bg-background/80 backdrop-blur-xl rounded-[2.5rem]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                解析导入资源
              </CardTitle>
              <CardDescription>粘贴包含资源的网页链接，系统将自动尝试解析标题、标签及媒体内容</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="parse-url" className="text-sm font-bold flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" /> 网页链接 (支持多个链接批量解析)
                  </Label>
                  <div className="space-y-3">
                    <Textarea
                      id="parse-url"
                      placeholder="可以将多个分享文字复制到此处&#10;系统会自动从中提取所有链接并批量解析"
                      value={parseUrl}
                      onChange={(e) => setParseUrl(e.target.value)}
                      disabled={isParsing}
                      className="rounded-2xl min-h-[120px] bg-muted/30 border-none focus-visible:ring-primary shadow-inner p-4 font-mono text-xs"
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleParseImport} 
                        disabled={isParsing || !parseUrl.trim()}
                        className="rounded-2xl h-12 px-8 font-bold shadow-lg w-full md:w-auto"
                      >
                        {isParsing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <PlayCircle className="w-5 h-5 mr-2" />}
                        开始批量解析
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex gap-3 items-start">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-bold text-foreground">如何使用？</p>
                    <p>1. 复制您想要导入的网页地址（如微博、某相册页等）。</p>
                    <p>2. 在此处粘贴并点击“开始解析”。</p>
                    <p>3. 解析成功后，系统会自动填充下方“链接导入”中的内容，您可以继续完善信息并提交。</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 管理员专享上传 - Zonerama 直传 */}
        {isAdmin && (
          <TabsContent value="admin_zonerama" className="space-y-6 pt-6">
            <Card className="border-border/50 shadow-xl shadow-black/5 overflow-hidden bg-background/80 backdrop-blur-xl rounded-[2.5rem]">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-black flex items-center gap-2">
                  <LucideUpload className="w-6 h-6 text-primary" />
                  Zonerama 专享上传
                </CardTitle>
                <CardDescription className="text-base">
                  管理员专用：直接上传图片到 Zonerama 相册，上传成功后可选择导入到图集或壁纸库
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <form onSubmit={handleAdminZoneramaUpload} className="space-y-6">
                  {/* 发布表单内容 - 借鉴本地上传样式 */}
                  <div className="space-y-6 p-6 rounded-3xl bg-muted/20 border border-border/50">
                    <div className="space-y-4">
                      {/* 上传模式选择 */}
                      <div className="space-y-3">
                        <Label className="text-sm font-bold flex items-center gap-2">
                          <Layers className="w-4 h-4 text-primary" />
                          发布模式
                        </Label>
                        <RadioGroup 
                          value={uploadMode} 
                          onValueChange={(val: any) => setUploadMode(val)}
                          className="grid grid-cols-2 gap-4"
                        >
                          <div className="relative">
                            <RadioGroupItem value="wallpaper" id="mode-wallpaper-admin" className="peer sr-only" />
                            <Label
                              htmlFor="mode-wallpaper-admin"
                              className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all text-center h-full"
                            >
                              <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                <span className="font-bold">壁纸分享</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1">同步到壁纸库</p>
                            </Label>
                          </div>
                          <div className="relative">
                            <RadioGroupItem value="album" id="mode-album-admin" className="peer sr-only" />
                            <Label
                              htmlFor="mode-album-admin"
                              className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all text-center h-full"
                            >
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                <span className="font-bold">写真图集</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1">同步到指定图集</p>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* 批量设置分类与标签 - 远程导入同样遵循全局配置 */}
                      {((uploadMode === 'wallpaper' && storageConfig?.enable_upload_categories !== false) || storageConfig?.enable_upload_tags !== false) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {uploadMode === 'wallpaper' && storageConfig?.enable_upload_categories !== false && (
                            <div className="space-y-3">
                              <Label className="font-bold">选择作品分类</Label>
                              <Select value={batchCategory} onValueChange={setBatchCategory}>
                                <SelectTrigger className="rounded-xl h-12 bg-background">
                                  <SelectValue placeholder="选择分类" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">未分类</SelectItem>
                                  {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          {storageConfig?.enable_upload_tags !== false && (
                            <div className={cn("space-y-3", uploadMode === 'album' && "col-span-full")}>
                              <Label className="font-bold">作品标签</Label>
                              <TagSelector 
                                value={batchTags}
                                onChange={setBatchTags}
                                disabled={isImporting}
                              />
                              {isAdmin && (
                                <QuickTagGroup 
                                  value={batchTags}
                                  onChange={setBatchTags}
                                  disabled={isImporting}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}


                      {uploadMode === 'album' && (
                        <div className="space-y-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                          <div className="space-y-3">
                            <Label className="text-sm font-bold flex items-center gap-2">
                              <FolderOpen className="w-4 h-4 text-primary" />
                              选择/新建目标图集
                            </Label>
                            <Select value={selectedAlbumId} onValueChange={setSelectedAlbumId}>
                              <SelectTrigger className="rounded-xl h-12 bg-background">
                                <SelectValue placeholder="选择图集" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">
                                  <div className="flex items-center gap-2 text-primary font-bold">
                                    <Plus className="w-4 h-4" />
                                    新建图集
                                  </div>
                                </SelectItem>
                                {albums.map(album => (
                                  <SelectItem key={album.id} value={album.id}>
                                    {album.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedAlbumId === 'new' && (
                            <div className="space-y-4 pt-2 border-t border-primary/10">
                              <div className="space-y-2">
                                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">新图集名称</Label>
                                <Input 
                                  placeholder="请输入图集完整名称" 
                                  value={newAlbumData.title}
                                  onChange={(e) => setNewAlbumData({...newAlbumData, title: e.target.value})}
                                  className="rounded-xl h-12 bg-background"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label className="text-[11px] font-bold text-muted-foreground">图集类型</Label>
                                  <Input 
                                    placeholder="如：COSPLAY" 
                                    value={newAlbumData.album_type}
                                    onChange={(e) => setNewAlbumData({...newAlbumData, album_type: e.target.value})}
                                    className="rounded-xl h-10 bg-background"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[11px] font-bold text-muted-foreground">推荐等级</Label>
                                  <Select 
                                    value={newAlbumData.level} 
                                    onValueChange={(val) => setNewAlbumData({...newAlbumData, level: val})}
                                  >
                                    <SelectTrigger className="rounded-xl h-10 bg-background">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pt">普通</SelectItem>
                                      <SelectItem value="vip">VIP</SelectItem>
                                      <SelectItem value="svip">SVIP</SelectItem>
                                      <SelectItem value="vvip">VVIP</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 文件选择区域 - 参考本地上传样式 */}
                  <div className="space-y-2">
                    {adminZoneramaFiles.length === 0 ? (
                      <div className="relative group">
                        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-[2rem] transition-all duration-300 border-border/50 bg-muted/20 hover:border-primary/50 hover:bg-primary/5">
                          <Input
                            id="zonerama-file"
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            capture={false as any}
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              setAdminZoneramaFiles(files);
                              e.target.value = '';
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <LucideUpload className="w-8 h-8 text-primary" />
                          </div>
                          <h3 className="text-lg font-bold mb-1">点击或拖拽上传 Zonerama</h3>
                          <p className="text-sm text-muted-foreground">支持图片和视频，仅限管理员</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold">已选择 {adminZoneramaFiles.length} 个文件</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAdminZoneramaFiles([]);
                              setZoneramaUploadProgress({});
                            }}
                            className="h-8 rounded-xl"
                          >
                            <X className="w-4 h-4 mr-1" />
                            清空
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3 p-4 bg-muted/30 rounded-2xl border border-border/50 max-h-[400px] overflow-y-auto">
                          {adminZoneramaFiles.map((file, i) => {
                            const isVideo = file.type.startsWith('video/');
                            const progress = zoneramaUploadProgress[i];
                            const isUploading = progress !== undefined && progress >= 0 && progress < 100;
                            const isSuccess = progress === 100;
                            const isFailed = progress === -1;
                            
                            return (
                              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted border border-border/50 group">
                                {isVideo ? (
                                  <video
                                    src={URL.createObjectURL(file)}
                                    className="w-full h-full object-contain"
                                    muted
                                  />
                                ) : (
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={file.name}
                                    className="w-full h-full object-contain"
                                  />
                                )}
                                
                                {/* 进度遮罩 */}
                                {isUploading && (
                                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                                    <span className="text-white text-sm font-bold">{progress}%</span>
                                  </div>
                                )}
                                
                                {/* 成功标记 */}
                                {isSuccess && (
                                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                                      <CheckSquare className="w-6 h-6 text-white" />
                                    </div>
                                  </div>
                                )}
                                
                                {/* 失败标记 */}
                                {isFailed && (
                                  <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                                      <X className="w-6 h-6 text-white" />
                                    </div>
                                  </div>
                                )}
                                
                                {/* 文件类型标记 */}
                                <div className="absolute top-2 left-2">
                                  <Badge variant="secondary" className="text-xs bg-black/60 text-white border-0">
                                    {isVideo ? <Video className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                                    {isVideo ? '视频' : '图片'}
                                  </Badge>
                                </div>
                                
                                {/* 文件名 */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                  <p className="text-white text-xs truncate">{file.name}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={adminZoneramaFiles.length === 0 || isAdminZoneramaUploading || !adminZoneramaAlbumId}
                    className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {isAdminZoneramaUploading ? (
                      <>
                        <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                        正在处理上传与同步...
                      </>
                    ) : (
                      <>
                        <LucideZap className="w-6 h-6 mr-3 text-amber-400 fill-amber-400" />
                        一键直传并同步到系统
                      </>
                    )}
                  </Button>
                </form>

                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1 text-sm">
                      <p className="font-bold text-blue-500">使用说明</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>上传成功后，图片/视频链接会自动填入「链接导入」标签页的批量导入框</li>
                        <li>可以连续上传多个文件，所有链接会自动累加</li>
                        <li>配置参数请前往「后台管理 → 系统参数设置 → 存储管理 → 专享上传」进行设置</li>
                        <li>如未配置相册 ID，上传按钮将被禁用</li>
                        <li>支持图片和视频格式，最多同时上传 6 个任务并行处理</li>
                        <li className="text-amber-600 font-medium">⚠️ 视频文件较大时可能上传较慢或失败，建议单个视频文件不超过 100MB</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
        <UploadDialogs
          thumbnailSelectFileId={thumbnailSelectFileId}
          setThumbnailSelectFileId={setThumbnailSelectFileId}
          files={files}
          setFiles={setFiles}
          isErrorReportOpen={isErrorReportOpen}
          setIsErrorReportOpen={setIsErrorReportOpen}
          handleRetrySingle={handleRetrySingle}
          handleCopyErrors={handleCopyErrors}
          showIframeUpload={showIframeUpload}
          setShowIframeUpload={setShowIframeUpload}
          iframeLoadFailed={iframeLoadFailed}
          setIframeLoadFailed={setIframeLoadFailed}
          iframeLoading={iframeLoading}
          setIframeLoading={setIframeLoading}
          batchUrls={batchUrls}
          setBatchUrls={setBatchUrls}
        />
      </main>
    </div>
  );
}
