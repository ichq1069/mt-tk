import React, { useState, useEffect } from 'react';
import { cn, formatBeijingTime, sanitizeFileName } from '@/lib/utils';
import { api } from '@/db/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/db/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MultiSelect from '@/components/ui/multi-select';



import { 
  Image as ImageIcon, Plus, Trash2, Edit, Save, Loader2, Upload, 
  FolderOpen, Layers, Shield, ShieldCheck, FileSpreadsheet, Download as DownloadIcon,
  Zap, Eye, EyeOff, CircleAlert, CircleCheckBig, X, Search, Share2,
  FileText, ExternalLink, Settings2, FileArchive, CheckCircle2, Clock,
  RotateCcw, RefreshCw, Users
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import SparkMD5 from 'spark-md5';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';
import type { PhotoAlbum, AlbumPhoto, AlbumCustomField, PermissionGroup } from '@/types';
import { getZoneramaProxyUrl, extractZoneramaPhotoId, getZoneramaOriginalUrl } from '@/lib/media';


// 计算文件 MD5
import { FastLevelingSection } from './FastLevelingSection';

const calculateFileMD5 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const blobSlice = File.prototype.slice;
    const chunkSize = 2097152; // 2MB
    const chunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;
    const spark = new SparkMD5.ArrayBuffer();
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      spark.append(e.target?.result as ArrayBuffer);
      currentChunk++;

      if (currentChunk < chunks) {
        loadNext();
      } else {
        resolve(spark.end());
      }
    };

    fileReader.onerror = () => reject(new Error('文件读取失败'));

    const loadNext = () => {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
    };

    loadNext();
  });
};

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
      resolve(hex.padStart(16, '0'));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    
    img.src = url;
  });
};

const LEVEL_LABELS = {
  pending: '待分级',
  normal: '普通级 (pt)',
  vip: 'VIP专属 (vip)',
  svip: 'SVIP专属 (svip)',
  restricted: '限制级 (vvip)'
};

const LEVEL_COLORS = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  normal: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  vip: 'bg-blue-100 text-blue-700 border-blue-200',
  svip: 'bg-amber-100 text-amber-700 border-amber-200',
  restricted: 'bg-red-100 text-red-700 border-red-200'
};

export function AlbumsSection() {
  const [activeTab, setActiveTab] = useState('albums');
  const [selectedAlbum, setSelectedAlbum] = useState<PhotoAlbum | null>(null);
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 15;
  const [photoPage, setPhotoPage] = useState(0);
  const [photoTotal, setPhotoTotal] = useState(0);
  const photoLimit = 50;
  const [uploadTab, setUploadTab] = useState('local');

  const [customFields, setCustomFields] = useState<AlbumCustomField[]>([]);
  const [fieldGroups, setFieldGroups] = useState<any[]>([]);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [editingAlbum, setEditingAlbum] = useState<Partial<PhotoAlbum> | null>(null);
  const [storageConfig, setStorageConfig] = useState<any>(null);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [albumPhotos, setAlbumPhotos] = useState<AlbumPhoto[]>([]);
  const [photoFilterLevel, setPhotoFilterLevel] = useState<string>('all');
  const [uploading, setUploading] = useState(false);

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [userSearchKeyword, setUserSearchKeyword] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [newUserLevel, setNewUserLevel] = useState<string>('pt');
  const [selectedSearchUserIds, setSelectedSearchUserIds] = useState<Set<string>>(new Set());
  const [batchAddingUsers, setBatchAddingUsers] = useState(false);
  const [targetPermissionGroupId, setTargetPermissionGroupId] = useState<string>('all');


  const handleSearchUsers = async () => {
    if (!userSearchKeyword.trim()) return;
    setSearchingUsers(true);
    try {
      const { data, error } = await api.getAllProfiles(0, 10, userSearchKeyword);
      if (error) throw error;
      setUserSearchResults(data || []);
    } catch (e: any) {
      toast.error('搜索用户失败: ' + e.message);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleAddUserToAlbum = async (userId: string) => {
    if (!selectedAlbumId) return;
    setAddingUserId(userId);
    try {
      const { error } = await api.addAlbumUserPermission({
        album_id: selectedAlbumId,
        user_id: userId,
        level: newUserLevel
      });
      if (error) throw error;
      toast.success('用户已添加到图集');
      fetchAlbumUsers(selectedAlbumId, userPage);
    } catch (e: any) {
      toast.error('添加失败: ' + e.message);
    } finally {
      setAddingUserId(null);
    }
  };

  const handleBatchAddUsers = async () => {
    if (!selectedAlbumId || selectedSearchUserIds.size === 0) return;
    setBatchAddingUsers(true);
    const loadingToast = toast.loading(`正在批量添加 ${selectedSearchUserIds.size} 个用户...`);
    try {
      const userIds = Array.from(selectedSearchUserIds);
      const permissions = userIds.map(userId => ({
        album_id: selectedAlbumId,
        user_id: userId,
        level: newUserLevel,
        updated_at: new Date().toISOString()
      }));
      
      const { error } = await api.batchAddAlbumUserPermissions(permissions);
      if (error) throw error;
      
      toast.success(`成功添加 ${userIds.length} 个用户`, { id: loadingToast });
      setSelectedSearchUserIds(new Set());
      fetchAlbumUsers(selectedAlbumId, userPage);
    } catch (e: any) {
      toast.error('批量添加失败: ' + e.message, { id: loadingToast });
    } finally {
      setBatchAddingUsers(false);
    }
  };

  const handleBatchAddUsersByGroup = async () => {
    if (!selectedAlbumId || targetPermissionGroupId === 'all') {
      toast.error('请选择有效的权限组');
      return;
    }
    
    setBatchAddingUsers(true);
    const loadingToast = toast.loading(`正在从权限组添加用户...`);
    try {
      const { data: profiles, error: profileError } = await api.getAllProfiles(0, 1000, '', targetPermissionGroupId);
      if (profileError) throw profileError;
      
      if (!profiles || profiles.length === 0) {
        toast.error('该权限组下无用户', { id: loadingToast });
        return;
      }
      
      const permissions = profiles.map((p: any) => ({
        album_id: selectedAlbumId,
        user_id: p.id,
        level: newUserLevel,
        updated_at: new Date().toISOString()
      }));
      
      const { error: batchError } = await api.batchAddAlbumUserPermissions(permissions);
      if (batchError) throw batchError;
      
      toast.success(`成功从权限组添加 ${profiles.length} 个用户`, { id: loadingToast });
      fetchAlbumUsers(selectedAlbumId, userPage);
    } catch (e: any) {
      toast.error('权限组批量添加失败: ' + e.message, { id: loadingToast });
    } finally {
      setBatchAddingUsers(false);
    }
  };
  const [confirmConfig, setConfirmConfig] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void | Promise<void>;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const showConfirm = (title: string, description: string, onConfirm: () => void | Promise<void>) => {
    setConfirmConfig({
      open: true,
      title,
      description,
      onConfirm,
    });
  };

  const currentAlbumForPhotos = React.useMemo(() => {
    return albums.find(a => a.id === selectedAlbumId);
  }, [albums, selectedAlbumId]);

  const currentZonePhotoUrl = React.useMemo(() => {
    if (!currentAlbumForPhotos?.custom_field_values || !customFields.length) return null;
    const values = currentAlbumForPhotos.custom_field_values as any;
    
    if (values.zonephoto) return values.zonephoto;
    
    const field = customFields.find(f => f.name.toLowerCase() === 'zonephoto');
    if (field && values[field.id]) return values[field.id];
    
    return null;
  }, [currentAlbumForPhotos, customFields]);
  const currentAlbumIdValue = React.useMemo(() => {
    if (!currentAlbumForPhotos?.custom_field_values || !customFields.length) return null;
    const values = currentAlbumForPhotos.custom_field_values as any;
    
    // 尝试直接通过 'albumId' 键获取
    if (values.albumId) return values.albumId;
    
    // 通过自定义字段配置查找名为 'albumId' 的字段 ID
    const field = customFields.find(f => f.name.toLowerCase() === 'albumid');
    if (field && values[field.id]) {
      return values[field.id];
    }
    
    return null;
  }, [currentAlbumForPhotos, customFields]);


  const adminGetPhotoUrl = (url: string, albumId?: string, authToken?: string) => {
    return getZoneramaProxyUrl(url, authToken, albumId);
  };

  const getAlbumZonePhotoAuth = (album: any) => {
    if (!album?.custom_field_values || !customFields.length) return null;
    const values = album.custom_field_values as any;
    
    if (values.zonephoto) return values.zonephoto;
    
    const field = customFields.find(f => f.name.toLowerCase() === 'zonephoto');
    if (field && values[field.id]) return values[field.id];
    
    return null;
  };


  const handleDownloadPhotoTemplate = () => {
    const data = [
      { "url": "https://example.com/1.jpg", "title": "图片1", "level": "normal" },
      { "url": "https://example.com/2.jpg", "title": "图片2", "level": "non_restricted" }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "图片导入模板");
    XLSX.writeFile(wb, "图集图片导入模板.xlsx");
  };

  const handleXlsPhotoImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAlbumId) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) return toast.error('表格数据为空');

        const loadingToast = toast.loading(`正在从 Excel 导入 ${data.length} 张图片...`);
        let success = 0;
        
        // Get max order
        const { data: maxOrderData } = await (supabase
          .from('album_photos') as any)
          .select('sort_order')
          .eq('album_id', selectedAlbumId)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        let currentSortOrder = (maxOrderData?.sort_order || 0) + 1;

        for (const row of data) {
          const url = row.url || row.链接 || row.地址;
          if (!url || url.toString().includes('undefined')) continue;

          const level = row.level || row.级别 || row.分级 || 'normal';
          const title = row.title || row.标题 || '';

          const { error } = await (supabase.from('album_photos') as any).insert({
            album_id: selectedAlbumId,
            url,
            level: ['normal', 'non_restricted', 'restricted'].includes(level) ? level : 'normal',
            sort_order: currentSortOrder++
          });

          if (!error) success++;
        }

        toast.success(`导入完成，成功导入 ${success} 张图片`, { id: loadingToast });
        fetchAlbumPhotos(selectedAlbumId);
        setUploadTab('local');
      } catch (err: any) {
        toast.error('导入失败: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleZoneramaApiImport = async () => {
    if (!selectedAlbumId) return toast.error('请先选择图集');
    const albumId = currentAlbumIdValue;
    if (!albumId) return toast.error('图集自定义字段 albumId 未设置');

    setUploading(true);
    const loadingToast = toast.loading(`正在从 Zonerama 获取图片链接...`);
    try {
      // 从配置中读取图集内图片列表接口
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
        throw new Error('图集内图片列表接口未配置，请在后台管理系统配置：系统参数设置 → 存储管理 → 专享上传 → 图集内图片列表接口（可选）');
      }

      // 拼接完整的 API URL
      const apiUrl = `${albumPhotoApi}${albumId}`;
      console.debug('[接口导入] 调用接口:', apiUrl);

      // 直接调用接口
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`接口响应失败，状态码: ${response.status}`);
      }

      const data = await response.json();
      console.debug('[接口导入] 接口响应:', data);

      // 提取 photos 数组中的 url 字段
      const photos = data.photos || [];
      if (!Array.isArray(photos) || photos.length === 0) {
        toast.dismiss(loadingToast);
        return toast.error('该图集下未找到图片');
      }

      // 提取所有图片 URL
      let imageUrls = photos.map((photo: any) => photo.url).filter(Boolean);
      console.debug(`[接口导入] 提取到 ${imageUrls.length} 个图片 URL`);

      // 统一生成原始 Zonerama URL，导入后显示时会自动应用后台设置的代理
      imageUrls = photos.map((photo: any) => {
        const photoId = String(photo.id || '');
        return getZoneramaOriginalUrl(photoId);
      });
      console.debug(`[接口导入] 已提取 ${imageUrls.length} 个原始链接`);

      // 过滤掉包含 undefined 的无效链接，并去重
      const validUrls = imageUrls.filter((url: string) => url && !url.includes('undefined'));
      
      if (validUrls.length === 0) {
        toast.dismiss(loadingToast);
        return toast.error('该图集下未找到有效图片链接（已排除无效链接）');
      }

      toast.success(`已获取 ${validUrls.length} 个素材链接，已填入导入框并开启预览。`, { id: loadingToast });
      
      // 合并现有内容和新获取的内容
      const existingUrls = batchUrls.split('\n').map(u => u.trim()).filter(Boolean);
      const allUrls = Array.from(new Set([...existingUrls, ...validUrls]));
      setBatchUrls(allUrls.join('\n'));
      
      // 自动切换到链接导入页
      setUploadTab('link');
    } catch (e: any) {
      toast.error(`接口读取失败: ${e.message}`, { id: loadingToast });
    } finally {
      setUploading(false);
    }
  };

  const [uploadFiles, setUploadFiles] = useState<{ 
    file: File; 
    preview: string; 
    id: string; 
    status: 'idle' | 'uploading' | 'success' | 'error' | 'duplicate'; 
    progress: number; 
    errorMsg?: string;
    md5?: string;
    contentHash?: string;
  }[]>([]);
  const [batchUrls, setBatchUrls] = useState('');
  const [importProgress, setImportProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  
  // 从本地存储恢复待导入的 URL
  useEffect(() => {
    if (selectedAlbumId) {
      const saved = localStorage.getItem(`batch_urls_${selectedAlbumId}`);
      if (saved) setBatchUrls(saved);
    }
  }, [selectedAlbumId]);

  // 实时保存待导入的 URL
  useEffect(() => {
    if (selectedAlbumId && batchUrls !== undefined) {
      localStorage.setItem(`batch_urls_${selectedAlbumId}`, batchUrls);
    }
  }, [selectedAlbumId, batchUrls]);

  const uploadFilesRef = React.useRef(uploadFiles);

  useEffect(() => {
    uploadFilesRef.current = uploadFiles;
  }, [uploadFiles]);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasPendingPhotos, setHasPendingPhotos] = useState(false);
  const [generatingPdfIds, setGeneratingPdfIds] = useState<Set<string>>(new Set());

  // Access Requests state
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  const [requestTotal, setRequestTotal] = useState(0);
  const [requestPage, setRequestPage] = useState(0);
  const [requestStatus, setRequestStatus] = useState('pending');
  const [requestLoading, setRequestLoading] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingRequest, setApprovingRequest] = useState<any>(null);
  const [approvedLevel, setApprovedLevel] = useState('pt');
  const [albumUsers, setAlbumUsers] = useState<any[]>([]);
  const [userPage, setUserPage] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userLevelFilter, setUserLevelFilter] = useState('all');
  const [isUpdatingLevels, setIsUpdatingLevels] = useState(false);


  useEffect(() => {
    fetchData();
    checkPendingPhotos();
  }, []);

  const fetchAccessRequests = async (pageNum = requestPage, status = requestStatus) => {
    setRequestLoading(true);
    try {
      const { data, total, error } = await api.getAlbumAccessRequests(pageNum, limit, status);
      if (error) throw error;
      setAccessRequests(data || []);
      setRequestTotal(total || 0);
    } catch (e: any) {
      toast.error('获取权限申请失败: ' + e.message);
    } finally {
      setRequestLoading(false);
    }
  };

  async function handleDeleteRequestRecord(requestItem: any) {
    showConfirm('确认删除', '确定删除此申请记录及相关权限？', async () => {
      try {
        await api.deleteAlbumUserPermission(requestItem.user_id, requestItem.album_id);
        const { error } = await supabase.from('album_access_requests').delete().eq('id', requestItem.id);
        if (error) throw error;
        toast.success('已删除');
        fetchAccessRequests();
      } catch (e: any) {
        toast.error('删除失败: ' + e.message);
      }
    });
  }


  const handleApproveRequest = async () => {
    if (!approvingRequest) return;
    try {
      const { error } = await api.updateAlbumAccessRequest(approvingRequest.id, {
        status: 'approved',
        approved_level: approvedLevel,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      toast.success('申请已通过');
      setApprovingRequest(null);
      
      // 刷新申请列表
      await fetchAccessRequests();
      
      // 如果当前在图集用户管理标签页且选中的图集就是该申请的图集，则刷新用户列表
      if (activeTab === 'album-users' && selectedAlbumId === approvingRequest.album_id) {
        await fetchAlbumUsers(selectedAlbumId!, userPage);
      }
    } catch (e: any) {
      toast.error('通过申请失败: ' + e.message);
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectingRequest || !rejectReason) return;
    try {
      const { error } = await api.updateAlbumAccessRequest(rejectingRequest.id, {
        status: 'rejected',
        rejected_reason: rejectReason,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      toast.success('申请已拒绝');
      setRejectingRequest(null);
      setRejectReason('');
      fetchAccessRequests();
    } catch (e: any) {
      toast.error('拒绝申请失败: ' + e.message);
    }
  };

  // 切换标签页时静默刷新数据，确保实时性
  useEffect(() => {
    if (activeTab === 'albums' || activeTab === 'photos' || activeTab === 'fields') {
      fetchData(false);
    } else if (activeTab === 'requests') {
      fetchAccessRequests(0);
    } else if (activeTab === 'album-users' && selectedAlbumId) {
      fetchAlbumUsers(selectedAlbumId, 0);
    }
  }, [activeTab, selectedAlbumId]);

  const checkPendingPhotos = async () => {
    const { count } = await supabase.from('album_photos').select('*', { count: 'exact', head: true }).eq('level', 'pending');
    setHasPendingPhotos((count || 0) > 0);
  };

  const fetchData = async (showLoading = true, pageNum = page) => {
    if (showLoading) setLoading(true);
    const [albumsRes, fieldsRes, groupsRes, fieldGroupsRes, configRes] = await Promise.all([
      api.getAllPhotoAlbumsAdmin(pageNum, limit, searchTerm),
      api.getAlbumCustomFields(),
      supabase.from('permission_groups').select('*').order('name'),
      api.getAlbumFieldGroups(),
      api.getStorageConfig()
    ]);

    if (albumsRes.data) {
      const results = albumsRes.data || [];
      const totalCount = albumsRes.total || 0;

      // 如果当前页没有数据且总数大于 0
      if (results.length === 0 && totalCount > 0 && pageNum > 0) {
        const newPage = Math.max(0, Math.ceil(totalCount / limit) - 1);
        setPage(newPage);
        return;
      }

      setAlbums(results);
      setTotal(totalCount);
    }
    if (fieldsRes.data) setCustomFields(fieldsRes.data);
    if (groupsRes.data) setGroups(groupsRes.data);
    if (fieldGroupsRes.data) setFieldGroups(fieldGroupsRes.data);
    if (configRes.data) setStorageConfig(configRes.data);
    if (showLoading) setLoading(false);
  };

  const fetchAlbumPhotos = async (albumId: string, pageNum = photoPage, level = photoFilterLevel) => {
    const { data, total: photosTotal } = await api.getAlbumPhotos(albumId, pageNum, photoLimit, level);
    
    const results = data || [];
    const totalCount = photosTotal || 0;

    // 如果当前页没有数据且总数大于 0
    if (results.length === 0 && totalCount > 0 && pageNum > 0) {
      const newPage = Math.max(0, Math.ceil(totalCount / photoLimit) - 1);
      setPhotoPage(newPage);
      fetchAlbumPhotos(albumId, newPage, level);
      return;
    }

    if (data) setAlbumPhotos(data);
    if (photosTotal !== undefined) setPhotoTotal(photosTotal);
  };

  const fetchAlbumUsers = async (albumId: string, pageNum = userPage) => {
    const res = await api.getAlbumUserPermissions(albumId, undefined, pageNum, 20);
    if (res.data) setAlbumUsers(res.data);
    if (res.total !== undefined) setUserTotal(res.total);
  };

  const handleDeleteAlbumUser = async (userId: string, albumId: string) => {
    showConfirm('确认删除', '确定要删除该用户的权限吗？', async () => {
      try {
        const { error } = await api.deleteAlbumUserPermission(userId, albumId);
        if (error) throw error;
        toast.success('权限已删除');
        fetchAlbumUsers(albumId);
      } catch (e: any) {
        toast.error('删除失败: ' + e.message);
      }
    });
  };

  const handleUpdateAlbumUserLevel = async (userId: string, level: string) => {
    try {
      const { error } = await api.updateAlbumUserPermission(userId, selectedAlbumId!, level);
      if (error) throw error;
      toast.success('级别已更新');
      fetchAlbumUsers(selectedAlbumId!);
    } catch (e: any) {
      toast.error('更新失败: ' + e.message);
    }
  };

  const handleBatchUpdateUserLevels = async (level: string) => {
    if (selectedUserIds.size === 0) return toast.error('请选择要修改的用户');
    setIsUpdatingLevels(true);
    try {
      const promises = Array.from(selectedUserIds).map(userId => 
        api.updateAlbumUserPermission(userId, selectedAlbumId!, level)
      );
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error).map(r => r.error?.message);
      
      if (errors.length > 0) {
        toast.error(`部分更新失败: ${errors[0]}`);
      } else {
        toast.success(`成功更新 ${selectedUserIds.size} 个用户的级别`);
        setSelectedUserIds(new Set());
        fetchAlbumUsers(selectedAlbumId!);
      }
    } catch (e: any) {
      toast.error('批量更新失败: ' + e.message);
    } finally {
      setIsUpdatingLevels(false);
    }
  };

  const handleSaveAlbum = async () => {
    if (!editingAlbum?.title) {
      return toast.error('请填写图集名称');
    }

    const { data: savedData, error } = await api.upsertPhotoAlbum(editingAlbum);
    if (error) {
      toast.error('保存失败: ' + error.message);
    } else {
      const savedAlbum = savedData as PhotoAlbum;
      toast.success(editingAlbum.id ? '图集已更新' : '图集已创建');
      
      // 如果开启了自动打包PDF，则在保存后异步触发 PDF 生成
      if (editingAlbum.auto_pdf_enabled && savedAlbum?.id) {
        handleGeneratePdf(savedAlbum.id, 'all');
      }
      
      setAlbumDialogOpen(false);
      setEditingAlbum(null);
      fetchData(false);
    }
  };

  const handleDeleteAlbum = async (id: string) => {
    showConfirm('确认删除', '确定要删除此图集吗？所有关联图片也将被删除。', async () => {
      const { error } = await api.deletePhotoAlbum(id);
      if (error) {
        toast.error('删除失败: ' + error.message);
      } else {
        toast.success('图集已删除');
        fetchData(false);
      }
    });
  };

  const handleSaveField = async () => {
    if (!editingField?.name || !editingField?.type) {
      return toast.error('请填写字段名称和类型');
    }

    const { error } = await api.upsertAlbumCustomField({
      ...editingField,
      options: editingField.options?.map((o: string) => o.trim()).filter(Boolean) || [],
      is_searchable: editingField.is_searchable ?? false,
      is_filterable: editingField.is_filterable ?? false
    });
    if (error) {
      toast.error('保存失败: ' + error.message);
    } else {
      toast.success(editingField.id ? '字段已更新' : '字段已创建');
      setFieldDialogOpen(false);
      setEditingField(null);
      fetchData(false);
    }
  };

  const handleSaveFieldGroup = async () => {
    if (!editingGroup?.name || !editingGroup?.field_ids?.length) {
      return toast.error('请填写组合名称并至少选择一个字段');
    }

    const { error } = await api.upsertAlbumFieldGroup(editingGroup);
    if (error) {
      toast.error('保存失败: ' + error.message);
    } else {
      toast.success(editingGroup.id ? '字段组合已更新' : '字段组合已创建');
      setGroupDialogOpen(false);
      setEditingGroup(null);
      fetchData(false);
    }
  };

  const handleDeleteFieldGroup = async (id: string) => {
    showConfirm('确认删除', '确定要删除此字段组合吗？', async () => {
      const { error } = await api.deleteAlbumFieldGroup(id);
      if (error) {
        toast.error('删除失败: ' + error.message);
      } else {
        toast.success('字段组合已删除');
        fetchData(false);
      }
    });
  };


  const handleApplyFieldGroup = (groupId: string, targetAlbum?: Partial<PhotoAlbum>) => {
    const group = fieldGroups.find(g => g.id === groupId);
    if (!group) return;
    
    const albumToUse = targetAlbum || editingAlbum;
    const currentValues = albumToUse?.custom_field_values || {};
    const newValues: Record<string, any> = {};
    
    group.field_ids.forEach((fid: string) => {
      const field = customFields.find(f => f.id === fid);
      if (field) {
        // 保留已有值，或者初始化新值
        newValues[fid] = currentValues[fid] !== undefined ? currentValues[fid] : (field.type === 'multi_tag' ? [] : '');
      }
    });
    
    const updatedAlbum = { ...albumToUse, custom_field_values: newValues };
    setEditingAlbum(updatedAlbum);
    toast.success(`已应用组合: ${group.name}`);
    return updatedAlbum;
  };

  const handleClearAlbumFields = () => {
    showConfirm('确认清空', '确定要清空此图集的所有自定义字段数据吗？', () => {
      setEditingAlbum({ ...editingAlbum, custom_field_values: {} });
      toast.success('已清空字段数据');
    });
  };

  const handleImportAlbum = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const loadingToast = toast.loading(`正在解析并导入 ${data.length} 个图集...`);
        setLoading(true);
        const albumsToUpsert = data.map(row => ({
          title: row['图集名称'] || row['title'] || '导入图集',
          description: row['简介'] || row['description'] || '',
          album_type: row['类型'] || row['album_type'] || '',
          permission_group_id: row['权限组ID'] || row['permission_group_id'] || null,
          custom_field_values: row['自定义字段'] ? (typeof row['自定义字段'] === 'string' ? JSON.parse(row['自定义字段']) : row['自定义字段']) : {}
        }));

        // 批量分段入库，每段 50 条
        const batchSize = 50;
        let totalCount = 0;
        for (let i = 0; i < albumsToUpsert.length; i += batchSize) {
          const batch = albumsToUpsert.slice(i, i + batchSize);
          const { error } = await api.batchUpsertPhotoAlbums(batch);
          if (error) throw error;
          totalCount += batch.length;
          toast.loading(`正在极速入库图集... (${totalCount}/${data.length})`, { id: loadingToast });
        }

        toast.success(`成功导入 ${totalCount} 个图集`, { id: loadingToast });
        fetchData(false);
      } catch (err: any) {
        toast.error('导入失败: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        '图集名称': '春日写真集',
        '简介': '一组精选的春日唯美写真',
        '类型': '写真',
        '权限组ID': '00000000-0000-0000-0000-000000000000',
        '自定义字段': JSON.stringify({ "field_id": "value" })
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "图集导入模板");
    XLSX.writeFile(wb, "图集导入模板.xlsx");
  };

  const handleDeleteField = async (id: string) => {
    showConfirm('确认删除', '确定要删除此自定义字段吗？', async () => {
      const { error } = await api.deleteAlbumCustomField(id);
      if (error) {
        toast.error('删除失败: ' + error.message);
      } else {
        toast.success('字段已删除');
        fetchData(false);
      }
    });
  };

  const handleSelectLocalFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    if (!selectedAlbumId) return toast.error('请先选择图集');

    const newFiles = selectedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substring(2, 9),
      status: 'idle' as const,
      progress: 0
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';

    // 后台处理“指纹”计算与查重
    const currentFiles = uploadFiles; // 闭包时的快照
    const processedHashes: { md5?: string, contentHash?: string, id: string, preview: string }[] = [];
    
    for (const fileObj of newFiles) {
      try {
        const isImage = fileObj.file.type.startsWith('image/');
        
        // 同时计算 MD5 和 视觉指纹
        const [md5, visualHash] = await Promise.all([
          calculateFileMD5(fileObj.file).catch(() => ''),
          isImage ? calculateVisualHash(fileObj.file).catch(() => '') : Promise.resolve('')
        ]);
        
        if (!md5 && !visualHash) continue;

        // 汉明距离计算 (16进制字符串)
        const hammingDist = (h1: string, h2: string) => {
          if (!h1 || !h2) return 100;
          let dist = 0;
          const len = Math.max(h1.length, h2.length);
          const s1 = h1.padStart(len, '0').toLowerCase();
          const s2 = h2.padStart(len, '0').toLowerCase();
          for (let i = 0; i < len; i++) {
            const v1 = parseInt(s1[i], 16);
            const v2 = parseInt(s2[i], 16);
            let xor = v1 ^ v2;
            while (xor > 0) {
              dist += (xor & 1);
              xor >>= 1;
            }
          }
          return dist;
        };

        // 1. 内部比对：检查当前待上传列表中是否存在相同或高度相似指纹的文件 (阈值 2)
        let internalMatch = currentFiles.find(f => 
          (md5 && (f as any).md5 === md5) || 
          (visualHash && (f as any).contentHash && hammingDist(visualHash, (f as any).contentHash) <= 2)
        );
        
        if (!internalMatch) {
          internalMatch = processedHashes.find(f => 
            (md5 && f.md5 === md5) || 
            (visualHash && f.contentHash && hammingDist(visualHash, f.contentHash) <= 2)
          ) as any;
        }

        if (internalMatch) {
          setUploadFiles(prev => prev.map(f => f.id === fileObj.id ? { 
            ...f, 
            status: 'duplicate', 
            errorMsg: '相似内容已在上传队列中',
            md5,
            contentHash: visualHash,
            duplicateOf: (internalMatch as any).preview || (internalMatch as any).url
          } : f));
          continue;
        }
        
        processedHashes.push({ md5, contentHash: visualHash, id: fileObj.id, preview: fileObj.preview });

    // 2. 外部比对：检查图集内及数据库中是否存在相同指纹
    // MD5 查重 (图集内)
    try {
      if (md5) {
        const { data: md5Dup } = await api.checkAlbumPhotoFileDuplicate(selectedAlbumId, md5);
        if (md5Dup) {
          setUploadFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'duplicate', errorMsg: '内容在图集内完全重复 (MD5)', md5, contentHash: visualHash, duplicateOf: (md5Dup as any).url } : f));
          continue;
        }
      }

      // 视觉指纹查重 (图集内) (阈值调严格至 2)
      if (visualHash) {
        const { data: visualDup } = await api.checkAlbumPhotoVisualDuplicate(selectedAlbumId, visualHash, 2);
        const duplicateRecord = Array.isArray(visualDup) ? visualDup[0] : visualDup;
        if (duplicateRecord) {
          setUploadFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'duplicate', errorMsg: '内容在图集内高度相似', md5, contentHash: visualHash, duplicateOf: duplicateRecord.url } : f));
          continue;
        }
      }
    } catch (e) {
      console.warn('查重接口检查失败，跳过本次查重:', e);
    }

    setUploadFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, md5, contentHash: visualHash } : f));
  } catch (err) {
        // 静默处理指纹计算错误，不干扰发布主流程
        console.error('指纹计算失败:', err);
      }
    }
  };

  const uploadSinglePhoto = async (initialFileObj: any, targetAlbumId: string) => {
    // 获取最新的 fileObj 数据，解决异步状态闭包陈旧数据问题
    const fileObj = uploadFilesRef.current.find(f => f.id === initialFileObj.id) || initialFileObj;
    
    setUploadFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'uploading', progress: 10 } : f));

    try {
      // 生成文件名模式：YYYYMMDDHHmm + 4位随机数
      const now = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
      const year = now.getUTCFullYear();
      const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = now.getUTCDate().toString().padStart(2, '0');
      const hours = now.getUTCHours().toString().padStart(2, '0');
      const minutes = now.getUTCMinutes().toString().padStart(2, '0');
      const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const timeStampName = `${year}${month}${day}${hours}${minutes}${randomSuffix}`;
      
      const sanitized = sanitizeFileName(fileObj.file.name);
      const ext = sanitized.split('.').pop() || 'jpg';
      
      // 使用干净的路径和文件名，避免非 ASCII 字符导致签名失败
      const fileName = `albums/${targetAlbumId}/${timeStampName}.${ext}`;
      
      const formData = new FormData();
      formData.append('file', fileObj.file, fileObj.file.name);
      formData.append('fileName', fileName);
      
      // 核心修复：确保 bucket 传递，如果没有配置则报错
      if (storageConfig?.bucket_name) {
        formData.append('bucket', storageConfig.bucket_name);
      } else {
        throw new Error('未配置 R2 存储桶 (Bucket)，请先前往“存储配置”完成设置');
      }

      setUploadFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress: 30 } : f));

      const { data, error: uploadError } = await supabase.functions.invoke('upload-to-r2', {
        body: formData
      });

      if (uploadError || !data?.success) throw new Error(uploadError?.message || data?.error || '上传失败');
      const uploadUrl = data.url;

      setUploadFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress: 80 } : f));

      const { error: dbError } = await api.upsertAlbumPhoto({
        album_id: targetAlbumId,
        url: uploadUrl,
        level: 'pending',
        sort_order: 0,
        file_md5: fileObj.md5,
        content_hash: fileObj.contentHash
      });

      if (dbError) throw dbError;

      setUploadFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'success', progress: 100 } : f));
      return true;
    } catch (err: any) {
      console.error('[Upload Error]', err);
      setUploadFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error', errorMsg: err.message } : f));
      return false;
    }
  };

  const handleStartUpload = async () => {
    if (!selectedAlbumId) return toast.error('请先选择图集');
    const targetAlbumId = selectedAlbumId;
    const pendingFiles = uploadFiles.filter(f => f.status === 'idle' || f.status === 'error' || f.status === 'duplicate');
    if (pendingFiles.length === 0) return;

    const startProcessing = async () => {
      setUploading(true);

      // 并发上传控制（分批处理，每批5个，避免浏览器或边缘函数过载）
      const batchSize = 5;
      let successCount = 0;
      
      for (let i = 0; i < pendingFiles.length; i += batchSize) {
        const batch = pendingFiles.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fileObj => uploadSinglePhoto(fileObj, targetAlbumId)));
        successCount += batchResults.filter(Boolean).length;
      }

      setUploading(false);
      fetchAlbumPhotos(targetAlbumId);
      fetchData(); // 更新图集计数值
      checkPendingPhotos();

      if (successCount === pendingFiles.length) {
        toast.success(`成功上传 ${successCount} 张图片`);
      } else {
        toast.error(`上传未全部完成：${successCount} 成功, ${pendingFiles.length - successCount} 失败`);
      }
    };

    const hasDuplicates = pendingFiles.some(f => f.status === 'duplicate');
    if (hasDuplicates) {
      showConfirm('发现重复内容', '队列中包含标记为重复的内容，是否确认忽略并继续上传？', () => {
        startProcessing();
      });
    } else {
      startProcessing();
    }
  };

  const handleImportUrls = async () => {
    if (!selectedAlbumId) return toast.error('请先选择图集');
    
    setImporting(true);
    const loadingToast = toast.loading(`正在解析并检查链接...`);
    
    try {
      // 1. 灵活解析 URL
      // 支持：空格、换行、逗号分隔，以及 https:// 连写拆分
      const rawParts = batchUrls.split(/[\s,]+/).filter(Boolean);
      let urls: string[] = [];
      
      for (const part of rawParts) {
        // 处理 https://a.comhttps://b.com 这种没有分隔符的连写情况
        const splitByHttp = part.split(/(?=https?:\/\/)/).filter(Boolean);
        for (const item of splitByHttp) {
          let cleanUrl = item.trim().replace(/[,;]+$/, '');
          if (!cleanUrl.startsWith('http')) continue;
          
          // Zonerama 转换逻辑 (统一转为原始 URL，显示时自动应用代理)
          const photoId = extractZoneramaPhotoId(cleanUrl);
          if (photoId) {
            cleanUrl = getZoneramaOriginalUrl(photoId);
          }
          
          if (cleanUrl && !cleanUrl.includes('undefined')) {
            urls.push(cleanUrl);
          }
        }
      }
      
      // 去重
      urls = Array.from(new Set(urls));
      
      if (urls.length === 0) {
        setImporting(false);
        toast.error('未提取到有效的素材链接', { id: loadingToast });
        return;
      }

      // 同步回文本框，方便用户查看解析结果
      setBatchUrls(urls.join('\n'));

      // 1.2 Zonerama 查重逻辑
      const photoIdMap: Record<string, string> = {};
      const photoIdsToCheck: string[] = [];
      const urlsToCheck: string[] = [];
      
      for (const url of urls) {
        const photoId = extractZoneramaPhotoId(url);
        if (photoId) {
          photoIdMap[url] = photoId;
          photoIdsToCheck.push(photoId);
        } else {
          urlsToCheck.push(url);
        }
      }
      
      const existingZonerama = new Set<string>();
      const existingUrls = new Set<string>();
      
      if (photoIdsToCheck.length > 0) {
        const { data } = await supabase.from('album_photos')
          .select('zonerama_photo_id')
          .eq('album_id', selectedAlbumId)
          .in('zonerama_photo_id', photoIdsToCheck);
        data?.forEach((p: any) => existingZonerama.add(p.zonerama_photo_id));
      }
      
      if (urlsToCheck.length > 0) {
        const { data } = await supabase.from('album_photos')
          .select('url')
          .eq('album_id', selectedAlbumId)
          .in('url', urlsToCheck);
        data?.forEach((p: any) => existingUrls.add(p.url));
      }
      
      const finalUrls = urls.filter(url => {
        const photoId = photoIdMap[url];
        if (photoId) return !existingZonerama.has(photoId);
        return !existingUrls.has(url);
      });
      
      const skipCount = urls.length - finalUrls.length;
      if (skipCount > 0) {
        toast.info(`检测到 ${skipCount} 张重复图片，已自动跳过`, { id: loadingToast });
      }
      
      if (finalUrls.length === 0) {
        setImporting(false);
        toast.success('所选图片均为重复数据，无需导入', { id: loadingToast });
        return;
      }

      setImportProgress(0);
      toast.loading(`正在极速导入 ${finalUrls.length} 个链接...`, { id: loadingToast });

      // 1.5 获取当前最大排序号
      const { data: maxOrderData } = await (supabase
        .from('album_photos') as any)
        .select('sort_order')
        .eq('album_id', selectedAlbumId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      let nextSortOrder = (maxOrderData?.sort_order || 0) + 1;
      
      const batchSize = 200; // 提高批次大小以加快速度
      let successCount = 0;

      for (let i = 0; i < finalUrls.length; i += batchSize) {
        const batch = finalUrls.slice(i, i + batchSize);
        const newPhotos = batch.map((url, index) => ({
          album_id: selectedAlbumId,
          url,
          level: 'pending',
          sort_order: nextSortOrder + i + index,
          custom_field_values: {},
          zonerama_photo_id: extractZoneramaPhotoId(url) || null
        }));

        // 利用数据库的唯一约束 (album_id, url) 自动去重，无需前端预加载
        const { error: batchError } = await api.batchUpsertAlbumPhotos(newPhotos);
        
        if (batchError) {
          console.error('批量导入失败:', batchError);
          setImporting(false);
          setImportProgress(0);
          return toast.error(`导入在第 ${i} 条处中断: ${batchError.message}`, { id: loadingToast });
        } else {
          successCount += batch.length;
          // 更新待导入列表显示
          const nextRemaining = urls.slice(i + batch.length);
          setBatchUrls(nextRemaining.join('\n'));
          localStorage.setItem(`batch_urls_${selectedAlbumId}`, nextRemaining.join('\n'));
        }

        const progress = Math.min(100, Math.round(((i + batch.length) / urls.length) * 100));
        setImportProgress(progress);
        toast.loading(`正在极速入库... ${progress}% (${successCount}/${urls.length})`, { id: loadingToast });
      }

      toast.success(`成功导入 ${successCount} 张图片`, { id: loadingToast });
      fetchAlbumPhotos(selectedAlbumId);
      checkPendingPhotos();
      
      setBatchUrls('');
      localStorage.removeItem(`batch_urls_${selectedAlbumId}`);
    } catch (e: any) {
      toast.error(`导入出现错误: ${e.message}`, { id: loadingToast });
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const handleSetCover = async (photo: AlbumPhoto) => {
    if (!selectedAlbumId) return;
    const { error } = await (supabase.from('photo_albums') as any).update({ cover_url: photo.url }).eq('id', selectedAlbumId);
    if (error) {
      toast.error('设置封面失败: ' + error.message);
    } else {
      toast.success('已设为封面');
      // 刷新图集列表以显示新封面
      fetchData(false);
    }
  };

  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);

  const handleRemovePhoto = (id: string) => {
    setPhotoToDelete(id);
  };

  const executeRemovePhoto = async () => {
    if (!photoToDelete) return;
    const id = photoToDelete;
    const { error } = await supabase.from('album_photos').delete().eq('id', id);
    if (error) {
      toast.error('删除失败: ' + error.message);
    } else {
      toast.success('图片已删除');
      // 立即从本地列表移除，提供即时反馈
      setAlbumPhotos(prev => prev.filter(p => p.id !== id));
      setPhotoTotal(prev => Math.max(0, prev - 1));
      
      // 延迟刷新以确保数据库同步完成
      setTimeout(() => {
        if (selectedAlbumId) fetchAlbumPhotos(selectedAlbumId);
        fetchData();
        checkPendingPhotos();
      }, 500);
    }
    setPhotoToDelete(null);
  };

  const handleBatchSetLevel = async (photoIds: string[], level: string) => {
    const { error } = await (supabase.from('album_photos') as any).update({ level }).in('id', photoIds);
    
    if (error) {
      toast.error('批量分级失败: ' + error.message);
      return false;
    } else {
      // 记录日志
      const { data: userData } = await supabase.auth.getUser();
      const logs = photoIds.map(pid => ({
        photo_id: pid,
        operator_id: userData.user?.id,
        old_level: 'unknown',
        new_level: level
      }));
      await supabase.from('album_photo_level_logs').insert(logs as any);
      
      toast.success(`已将 ${photoIds.length} 张图片设为${LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}`);
      
      // 如果是重置所有分级（设为pending），则同步清空图集的PDF链接
      if (level === 'pending' && selectedAlbumId) {
        await (supabase.from('photo_albums') as any).update({ pdf_urls: {} }).eq('id', selectedAlbumId);
        fetchData(); // 刷新图集列表
      }
      
      // 立即更新本地状态，提供即时反馈
      setAlbumPhotos(prev => prev.map(p => 
        photoIds.includes(p.id) ? { ...p, level: level as any } : p
      ));
      
      // 重新从服务器获取最新数据
      if (selectedAlbumId) {
        await fetchAlbumPhotos(selectedAlbumId);
      }
      checkPendingPhotos();
      return true;
    }
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      return toast.error('封面图片大小不能超过 2MB');
    }

    setUploading(true);
    try {
      const sanitized = sanitizeFileName(file.name);
      const fileName = `album_covers/${Date.now()}_${sanitized}`;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      if (storageConfig?.bucket_name) {
        formData.append('bucket', storageConfig.bucket_name);
      } else {
        throw new Error('未配置 R2 存储桶 (Bucket)，请先前往“存储配置”完成设置');
      }

      const { data, error: uploadError } = await supabase.functions.invoke('upload-to-r2', {
        body: formData
      });

      if (uploadError || !data?.success) throw new Error(uploadError?.message || data?.error || '上传失败');
      const url = data.url;

      setEditingAlbum({ ...editingAlbum, cover_url: url });
      toast.success('封面上传成功');
    } catch (error) {
      const err = error as Error;
      toast.error('上传失败: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'single' | 'all'>('all');
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [selectedAlbumForExport, setSelectedAlbumForExport] = useState<PhotoAlbum | null>(null);

  const [exportLevel, setExportLevel] = useState<string>('all');

  const handleExport = async () => {
    if (exportFormat === 'excel') {
      const dataToExport = exportScope === 'all' ? filteredAlbums : (selectedAlbumForExport ? [selectedAlbumForExport] : []);
      if (dataToExport.length === 0) return toast.error('没有可导出的数据');

      const ws = XLSX.utils.json_to_sheet(dataToExport.map(album => ({
        '图集ID': album.id,
        '图集名称': album.title,
        '图片数量': album.photo_count,
        '类型': album.album_type,
        '简介': album.description,
        '权限组': album.permission_groups?.name || '无',
        '自定义字段': JSON.stringify(album.custom_field_values)
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "图集信息");
      XLSX.writeFile(wb, `图集导出_${exportScope === 'all' ? '全部' : selectedAlbumForExport?.title}_${new Date().getTime()}.xlsx`);
      toast.success('Excel 导出成功');
    } else {
      // PDF 导出
      if (exportScope === 'single' && selectedAlbumForExport) {
        handleGeneratePdf(selectedAlbumForExport.id, exportLevel === 'all' ? undefined : exportLevel);
      } else if (exportScope === 'all') {
        handleGeneratePdf('all', 'all'); // Special case for all albums summary
      }
    }
    setExportDialogOpen(false);
  };

  const handleExportAlbumData = (album: PhotoAlbum) => {
    setSelectedAlbumForExport(album);
    setExportScope('single');
    setExportFormat('excel');
    setExportDialogOpen(true);
  };

  const handleGeneratePdf = async (albumId: string, level?: string) => {
    setGeneratingPdfIds(prev => {
      const next = new Set(prev);
      next.add(albumId);
      return next;
    });
    try {
      const { data, error } = await api.generateAlbumPdf(albumId, level);
      if (error) {
        const errorMsg = typeof (error as any)?.context?.text === 'function' ? await (error as any).context.text() : (error as any)?.message;
        throw new Error(errorMsg || (error as Error).message);
      }
      if (data?.error) throw new Error(data.error);
      if (data?.cached) {
        toast.info('检测到该等级内容未变化，已直接使用现有 PDF', { icon: '🔄' });
      } else {
        toast.success(`[${LEVEL_LABELS[level as keyof typeof LEVEL_LABELS] || '全部'}] PDF 生成成功`);
      }
      fetchData();
    } catch (e: any) {
      toast.error(`生成失败: ${e.message}`);
    } finally {
      setGeneratingPdfIds(prev => {
        const next = new Set(prev);
        next.delete(albumId);
        return next;
      });
    }
  };

  useEffect(() => {
    setSelectedUserIds(new Set());
  }, [userSearchTerm, userLevelFilter]);

  const filteredAlbumUsers = React.useMemo(() => {
    return albumUsers.filter(perm => {
      const searchMatch = !userSearchTerm || 
        (perm.profiles?.nickname || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        (perm.profiles?.username || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        perm.user_id.toLowerCase().includes(userSearchTerm.toLowerCase());
      const levelMatch = userLevelFilter === 'all' || perm.level === userLevelFilter;
      return searchMatch && levelMatch;
    });
  }, [albumUsers, userSearchTerm, userLevelFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredAlbums = albums.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const toggleAllUsers = () => {
    if (selectedUserIds.size === filteredAlbumUsers.length && filteredAlbumUsers.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredAlbumUsers.map(u => u.user_id)));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black flex items-center flex-wrap gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            图集写真管理
            <Badge variant="outline" className="font-black text-[10px] py-0 h-5">v2.0.01</Badge>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理图集、批量上传图片、极速分级、自定义字段配置。
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7 rounded-2xl">
          <TabsTrigger value="albums" className="rounded-xl text-[11px] h-9">图集管理</TabsTrigger>
          <TabsTrigger value="photos" className="rounded-xl text-[11px] h-9" disabled={!selectedAlbumId}>图片管理</TabsTrigger>
          <TabsTrigger value="fast-leveling" className="rounded-xl text-[11px] h-9" disabled={!selectedAlbumId}>极速分级</TabsTrigger>
          <TabsTrigger value="album-users" className="rounded-xl text-[11px] h-9" disabled={!selectedAlbumId}>用户管理</TabsTrigger>
          <TabsTrigger value="fields" className="rounded-xl text-[11px] h-9">字段库</TabsTrigger>
          <TabsTrigger value="pdf" className="rounded-xl text-[11px] h-9">PDF 管理</TabsTrigger>
          <TabsTrigger value="requests" className="rounded-xl text-[11px] h-9 relative">
            访问申请
            {accessRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                {accessRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 图集管理 */}
        <TabsContent value="albums" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="搜索图集名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-2xl pl-10 h-11"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="rounded-2xl gap-2 font-bold h-11"
                onClick={() => {
                  setExportScope('all');
                  setExportFormat('excel');
                  setExportDialogOpen(true);
                }}
              >
                <DownloadIcon className="w-4 h-4 text-primary" />
                导出
              </Button>
              
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="rounded-2xl gap-2 font-bold h-11"
                  >
                    <Upload className="w-4 h-4 text-emerald-500" />
                    导入图集
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>导入图集</DialogTitle>
                    <DialogDescription>通过 Excel 批量导入图集数据</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="w-8 h-8 text-primary" />
                        <div>
                          <p className="text-sm font-bold">导入模板</p>
                          <p className="text-[10px] text-muted-foreground">下载后按格式填写</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={handleDownloadTemplate}>
                        <DownloadIcon className="w-4 h-4 mr-1" />
                        下载
                      </Button>
                    </div>
                    
                    <div 
                      className="h-32 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 cursor-pointer transition-colors"
                      onClick={() => document.getElementById('album-import-input')?.click()}
                    >
                      <Upload className="w-8 h-8 text-slate-400" />
                      <p className="text-xs font-medium text-slate-500">点击上传 Excel 文件</p>
                      <input 
                        id="album-import-input" 
                        type="file" 
                        accept=".xlsx, .xls" 
                        className="hidden" 
                        onChange={(e) => {
                          handleImportAlbum(e);
                          setImportDialogOpen(false);
                        }} 
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                <DialogContent className="max-w-md rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>导出图集</DialogTitle>
                    <DialogDescription>选择导出的范围和格式</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-3">
                      <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">导出范围</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant={exportScope === 'all' ? 'default' : 'outline'} 
                          className="rounded-xl h-11"
                          onClick={() => setExportScope('all')}
                        >
                          全部图集 ({total})
                        </Button>
                        <Button 
                          variant={exportScope === 'single' ? 'default' : 'outline'} 
                          className="rounded-xl h-11"
                          onClick={() => setExportScope('single')}
                          disabled={!selectedAlbumForExport && exportScope === 'all'}
                        >
                          {exportScope === 'single' && selectedAlbumForExport ? `当前: ${selectedAlbumForExport.title}` : '单个图集'}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">导出格式</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant={exportFormat === 'excel' ? 'default' : 'outline'} 
                          className="rounded-xl h-11 gap-2"
                          onClick={() => setExportFormat('excel')}
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          Excel (.xlsx)
                        </Button>
                        <Button 
                          variant={exportFormat === 'pdf' ? 'default' : 'outline'} 
                          className="rounded-xl h-11 gap-2"
                          onClick={() => setExportFormat('pdf')}
                        >
                          <FileText className="w-4 h-4" />
                          PDF (.pdf)
                        </Button>
                      </div>
                    </div>

                    {exportFormat === 'pdf' && exportScope === 'single' && (
                      <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                        <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">PDF 包含内容级别</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {['all', 'normal', 'vip', 'svip', 'restricted'].map(lvl => (
                            <Button
                              key={lvl}
                              variant={exportLevel === lvl ? 'default' : 'outline'}
                              className="rounded-xl h-9 text-xs"
                              onClick={() => setExportLevel(lvl)}
                            >
                              {LEVEL_LABELS[lvl as keyof typeof LEVEL_LABELS] || '全部内容'}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" className="rounded-xl" onClick={() => setExportDialogOpen(false)}>取消</Button>
                    <Button className="rounded-xl px-8" onClick={handleExport}>
                      开始导出
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={albumDialogOpen} onOpenChange={setAlbumDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="rounded-2xl gap-2 font-bold h-11"
                    onClick={() => setEditingAlbum({ is_active: true, photo_count: 0, custom_field_values: {} })}
                  >
                    <Plus className="w-4 h-4" />
                    新增图集
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingAlbum?.id ? '编辑图集' : '新增图集'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>图集名称</Label>
                      <Input 
                        placeholder="如：春日写真集"
                        value={editingAlbum?.title || ''}
                        onChange={(e) => setEditingAlbum({ ...editingAlbum, title: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>图集类型</Label>
                      <Input 
                        placeholder="如：人像/风景"
                        value={editingAlbum?.album_type || ''}
                        onChange={(e) => setEditingAlbum({ ...editingAlbum, album_type: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>查看等级</Label>
                      <Select 
                        value={editingAlbum?.level || 'pt'} 
                        onValueChange={(val) => setEditingAlbum({ ...editingAlbum, level: val })}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="选择查看等级" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="pt">普通用户 (pt)</SelectItem>
                          <SelectItem value="vip">VIP会员 (vip)</SelectItem>
                          <SelectItem value="svip">SVIP会员 (svip)</SelectItem>
                          <SelectItem value="vvip">VVIP会员 (vvip)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>封面图片</Label>
                    {editingAlbum?.cover_url && (
                      <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-slate-200 mb-2">
                        <ProtectedMedia ruleKey="后" 
                          src={adminGetPhotoUrl(editingAlbum.cover_url, editingAlbum.id, getAlbumZonePhotoAuth(editingAlbum))} 
                          authToken={getAlbumZonePhotoAuth(editingAlbum)}
                          albumId={editingAlbum.id}
                          type="image" 
                          alt="封面" 
                          className="w-full h-full object-contain" 
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input 
                        placeholder="封面 URL"
                        value={editingAlbum?.cover_url || ''}
                        onChange={(e) => setEditingAlbum({ ...editingAlbum, cover_url: e.target.value })}
                        className="rounded-xl"
                      />
                      <Button 
                        variant="outline" 
                        className="rounded-xl gap-2"
                        disabled={uploading}
                        onClick={() => document.getElementById('album-cover-upload')?.click()}
                      >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        上传
                      </Button>
                      <input 
                        id="album-cover-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUploadCover}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      允许访问的权限组 (权限组白名单)
                    </Label>
                    <div className="rounded-xl bg-background border border-input">
                      <MultiSelect
                        options={groups.map(g => ({ label: g.name, value: g.id }))}
                        value={editingAlbum?.allowed_group_ids || []}
                        onChange={(vals) => setEditingAlbum({ ...editingAlbum, allowed_group_ids: vals })}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">白名单为空时所有权限组可见；设置后仅名单内权限组可见。</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        开启申请模式
                      </Label>
                      <p className="text-[10px] text-muted-foreground">开启后，用户需申请并经审核通过后方可按等级访问，不受权限组限制。</p>
                    </div>
                    <Switch 
                      checked={editingAlbum?.apply_switch || false}
                      onCheckedChange={(checked) => setEditingAlbum({ ...editingAlbum, apply_switch: checked })}
                    />
                  </div>

                  {editingAlbum?.apply_switch && (
                    <div className="space-y-2 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        访问用户等级 (审核通过后可见)
                      </Label>
                      <div className="rounded-xl bg-background">
                        <MultiSelect
                          options={[
                            { label: '普通用户 (pt)', value: 'pt' },
                            { label: 'VIP会员 (vip)', value: 'vip' },
                            { label: 'SVIP会员 (svip)', value: 'svip' },
                            { label: 'VVIP会员 (vvip)', value: 'vvip' },
                            { label: '管理员 (admin)', value: 'admin' },
                          ]}
                          value={editingAlbum?.user_manage_levels || ['pt']}
                          onChange={(vals) => setEditingAlbum({ ...editingAlbum, user_manage_levels: vals })}
                        />
                      </div>
                      <p className="text-[10px] text-primary/70">仅勾选的等级在申请通过后可查看图集内容。</p>
                    </div>
                  )}



                  <div className="space-y-2">
                    <Label>简介</Label>
                    <Textarea 
                      placeholder="图集简介"
                      value={editingAlbum?.description || ''}
                      onChange={(e) => setEditingAlbum({ ...editingAlbum, description: e.target.value })}
                      className="rounded-xl"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>打包下载地址</Label>
                      {editingAlbum?.download_url && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-100 gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          已生成
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="https://..."
                        value={editingAlbum?.download_url || ''}
                        onChange={(e) => setEditingAlbum({ ...editingAlbum, download_url: e.target.value })}
                        className="rounded-xl flex-1"
                      />
                      {editingAlbum?.download_url && (
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="rounded-xl shrink-0" 
                          onClick={() => window.open(editingAlbum.download_url!, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {editingAlbum?.auto_pdf_enabled ? '已开启自动打包，保存后将自动更新此地址' : '手动填写的下载地址，或通过 PDF 管理中心生成'}
                    </p>
                  </div>

                  <div className="space-y-4 p-5 bg-slate-50/50 rounded-3xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5" />
                        自定义字段
                      </Label>
                      <div className="flex items-center gap-2">
                        {fieldGroups.length > 0 && (
                          <Select onValueChange={handleApplyFieldGroup}>
                            <SelectTrigger className="h-7 w-[120px] rounded-lg text-[10px] bg-white border-slate-200">
                              <SelectValue placeholder="快速组合" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {fieldGroups.map(g => (
                                <SelectItem key={g.id} value={g.id} className="text-[10px]">{g.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-[10px] text-muted-foreground hover:text-primary rounded-lg"
                          onClick={() => {
                            const allActive: Record<string, any> = {};
                            customFields.filter(f => f.is_active).forEach(f => {
                              allActive[f.id] = (editingAlbum?.custom_field_values?.[f.id] !== undefined 
                                ? editingAlbum.custom_field_values[f.id] 
                                : (f.type === 'multi_tag' ? [] : ''));
                            });
                            setEditingAlbum({ ...editingAlbum, custom_field_values: allActive });
                          }}
                        >
                          显示全部
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-[10px] text-muted-foreground hover:text-red-500 rounded-lg"
                          onClick={handleClearAlbumFields}
                        >
                          清空数据
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {customFields.filter(f => editingAlbum?.custom_field_values && Object.prototype.hasOwnProperty.call(editingAlbum.custom_field_values, f.id)).map(field => (
                        <div key={field.id} className="space-y-1.5 relative group/field">
                          <div className="flex items-center justify-between">
                            <Label className="text-[11px] font-bold text-slate-600">{field.name}</Label>
                            {editingAlbum?.custom_field_values?.[field.id] && (
                              <button 
                                onClick={() => {
                                  const newValues = { ...editingAlbum.custom_field_values };
                                  delete newValues[field.id];
                                  setEditingAlbum({ ...editingAlbum, custom_field_values: newValues });
                                }}
                                className="opacity-0 group-hover/field:opacity-100 h-4 w-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-all"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                          {field.type === 'text' && (
                            <Input 
                              placeholder={`输入${field.name}`}
                              value={editingAlbum?.custom_field_values?.[field.id] || ''}
                              onChange={(e) => setEditingAlbum({ 
                                ...editingAlbum, 
                                custom_field_values: { 
                                  ...editingAlbum?.custom_field_values, 
                                  [field.id]: e.target.value 
                                } 
                              })}
                              className="rounded-xl h-9 bg-white border-slate-200 focus:border-primary/30"
                            />
                          )}
                          {field.type === 'select' && (
                            <Select 
                              value={editingAlbum?.custom_field_values?.[field.id] || ''}
                              onValueChange={(v) => setEditingAlbum({ 
                                ...editingAlbum, 
                                custom_field_values: { 
                                  ...editingAlbum?.custom_field_values, 
                                  [field.id]: v 
                                } 
                              })}
                            >
                              <SelectTrigger className="rounded-xl h-9 bg-white border-slate-200 focus:border-primary/30">
                                <SelectValue placeholder={`选择${field.name}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options.map(opt => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {field.type === 'multi_tag' && (
                            <MultiSelect 
                              options={field.options.map(opt => ({ label: opt, value: opt }))}
                              value={(() => {
                                const v = editingAlbum?.custom_field_values?.[field.id];
                                if (Array.isArray(v)) return v;
                                if (typeof v === 'string' && v.trim()) return v.split(',').map(s => s.trim()).filter(Boolean);
                                return [];
                              })()}
                              onChange={(v) => setEditingAlbum({ 
                                ...editingAlbum, 
                                custom_field_values: { 
                                  ...editingAlbum?.custom_field_values, 
                                  [field.id]: v 
                                } 
                              })}
                            />
                          )}
                          {field.type === 'date' && (
                            <Input 
                              type="date"
                              value={editingAlbum?.custom_field_values?.[field.id] || ''}
                              onChange={(e) => setEditingAlbum({ 
                                ...editingAlbum, 
                                custom_field_values: { 
                                  ...editingAlbum?.custom_field_values, 
                                  [field.id]: e.target.value 
                                } 
                              })}
                              className="rounded-xl h-9 bg-white border-slate-200 focus:border-primary/30"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Switch 
                        checked={editingAlbum?.is_zonerama ?? false}
                        onCheckedChange={(v) => {
                          const updated = { ...editingAlbum, is_zonerama: v };
                          setEditingAlbum(updated);
                          // 如果开启 Zonerama，自动应用 zonephoto 字段组合
                          if (v) {
                            const zonephotoGroup = fieldGroups.find(g => g.name.toLowerCase().includes('zonephoto'));
                            if (zonephotoGroup) {
                              handleApplyFieldGroup(zonephotoGroup.id, updated as any);
                            }
                          }
                        }}
                      />
                      <div className="flex flex-col">
                        <Label className="text-[11px] font-bold">Zonerama 写真</Label>
                        <span className="text-[10px] text-muted-foreground">开启后支持预加载</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Switch 
                        checked={editingAlbum?.is_active ?? true}
                        onCheckedChange={(v) => setEditingAlbum({ ...editingAlbum, is_active: v })}
                      />
                      <Label className="text-xs font-bold">启用此图集</Label>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Switch 
                        checked={editingAlbum?.auto_pdf_enabled ?? false}
                        onCheckedChange={(v) => setEditingAlbum({ ...editingAlbum, auto_pdf_enabled: v })}
                      />
                      <Label className="text-xs font-bold">自动打包PDF</Label>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Switch 
                        checked={editingAlbum?.is_public ?? true}
                        onCheckedChange={(v) => setEditingAlbum({ ...editingAlbum, is_public: v })}
                      />
                      <div className="flex flex-col">
                        <Label className="text-xs font-bold">用户端显示</Label>
                        <p className="text-[10px] text-muted-foreground leading-none mt-1">关闭后仅限链接加入</p>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAlbumDialogOpen(false)} className="rounded-xl">取消</Button>
                  <Button onClick={handleSaveAlbum} className="rounded-xl gap-2">
                    <Save className="w-4 h-4" />
                    保存
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAlbums.map((album) => (
              <Card key={album.id} className="border-none shadow-sm rounded-3xl overflow-hidden group">
                <CardContent className="p-0 flex flex-col h-full">
                  {/* 封面图区域 - 移到名称上方 */}
                    <div className="h-44 bg-slate-100 relative overflow-hidden cursor-pointer group/img"
                    onClick={() => {
                      setSelectedAlbumId(album.id);
                      fetchAlbumPhotos(album.id);
                      setLevelDialogOpen(true);
                    }}
                  >
                    {album.cover_url ? (
                      <ProtectedMedia ruleKey="后" 
                        src={adminGetPhotoUrl(album.cover_url, album.id, getAlbumZonePhotoAuth(album))} 
                        authToken={getAlbumZonePhotoAuth(album)}
                        albumId={album.id}
                        type="image" 
                        alt={album.title} 
                        className="w-full h-full object-contain group-hover/img:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover/img:bg-black/10 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                      <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold text-slate-800">
                        <Plus className="w-4 h-4 text-primary" />
                        分级管理
                      </div>
                    </div>
                  </div>

                  {/* 名称和数量区域 */}
                  <div className="p-4 pb-2">
                    <h4 className="font-black text-slate-800 text-base truncate">{album.title}</h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="rounded-md text-[10px] bg-slate-50 border-slate-200 text-slate-500">
                        {album.photo_count} 张
                      </Badge>
                      {album.permission_groups && (
                        <Badge variant="secondary" className="rounded-md text-[10px] bg-primary/10 text-primary border-none">
                          {album.permission_groups.name}
                        </Badge>
                      )}
                      {album.is_public === false && (
                        <Badge variant="secondary" className="rounded-md text-[10px] bg-amber-100 text-amber-600 border-none">
                          私密
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-3 flex-1 flex flex-col">
                    {album.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{album.description}</p>
                    )}

                    {album.pdf_urls && Object.keys(album.pdf_urls).length > 0 && (
                      <div className="bg-slate-50 rounded-xl p-2 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 px-1">
                          <FileText className="w-3 h-3" />
                          已生成的 PDF
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(album.pdf_urls).map(([lvl, url]) => (
                            <Badge 
                              key={lvl} 
                              variant="outline" 
                              className="text-[9px] bg-white border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors py-0.5"
                              onClick={() => window.open(url as string, '_blank')}
                            >
                              {LEVEL_LABELS[lvl as keyof typeof LEVEL_LABELS] || lvl}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 操作按钮组 */}
                    <div className="mt-auto space-y-2 pt-3 border-t border-slate-50">
                      <div className="grid grid-cols-3 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl gap-1 h-8 text-[9px] font-bold"
                          onClick={() => {
                            setEditingAlbum(album);
                            setAlbumDialogOpen(true);
                          }}
                        >
                          <Edit className="w-3 h-3" />
                          编辑
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl gap-1 h-8 text-[9px] font-bold"
                          onClick={() => {
                            setSelectedAlbum(album);
                            setSelectedAlbumId(album.id);
                            fetchAlbumPhotos(album.id);
                            setActiveTab('photos');
                          }}
                        >
                          <ImageIcon className="w-3 h-3" />
                          管理图片
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="rounded-xl gap-1 h-8 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 text-[9px] font-bold"
                          onClick={() => {
                            setSelectedAlbumId(album.id);
                            setActiveTab('fast-leveling');
                          }}
                        >
                          <Zap className="w-3 h-3" />
                          极速分级
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="rounded-xl gap-1 h-8 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 text-[9px] font-bold"
                          onClick={() => window.open(`/albums/${album.id}`, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3" />
                          查看
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl gap-1 h-8 text-[9px] font-bold"
                          onClick={() => handleExportAlbumData(album)}
                        >
                          <DownloadIcon className="w-3 h-3" />
                          导出
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl gap-1 h-8 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 border-indigo-100 text-[9px] font-bold"
                          onClick={() => {
                            setSelectedAlbumId(album.id);
                            fetchAlbumUsers(album.id);
                            setActiveTab('album-users');
                          }}
                        >
                          <Users className="w-3 h-3" />
                          用户管理
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 rounded-xl gap-1 h-8 text-slate-500 hover:text-primary hover:bg-primary/5 text-[9px] font-bold"
                          onClick={() => {
                            setSelectedAlbumId(album.id);
                            setActiveTab('pdf');
                          }}
                        >
                          <FileText className="w-3 h-3" />
                          PDF 管理
                        </Button>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5"
                            onClick={() => {
                              const url = `${window.location.origin}/albums/${album.id}`;
                              navigator.clipboard.writeText(url);
                              toast.success('图集链接已复制');
                            }}
                          >
                            <Share2 className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => handleDeleteAlbum(album.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {total > limit && (
            <div className="flex justify-center pt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => {
                        if (page === 0) return;
                        const newPage = Math.max(0, page - 1);
                        setPage(newPage);
                        fetchData(true, newPage);
                      }}
                      className={cn("cursor-pointer", page === 0 && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink isActive className="bg-primary text-primary-foreground pointer-events-none">
                      {page + 1}
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => {
                        if (albums.length < limit) return;
                        const newPage = page + 1;
                        setPage(newPage);
                        fetchData(true, newPage);
                      }}
                      className={cn("cursor-pointer", albums.length < limit && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </TabsContent>

        {/* 访问申请管理 */}
        {/* 图集用户管理 */}
        <TabsContent value="album-users" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setActiveTab('albums')} className="rounded-xl">
                <RotateCcw className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">图集用户管理</h2>
                <p className="text-xs text-muted-foreground">管理此图集的专属访问权限</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full md:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input 
                  placeholder="搜索用户..." 
                  className="pl-9 h-9 rounded-xl text-xs"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>
              <Select value={userLevelFilter} onValueChange={setUserLevelFilter}>
                <SelectTrigger className="w-32 h-9 rounded-xl text-xs">
                  <SelectValue placeholder="筛选级别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有级别</SelectItem>
                  <SelectItem value="pt">PT (普通)</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="svip">SVIP</SelectItem>
                  <SelectItem value="restricted">限制级 (vvip)</SelectItem>
                </SelectContent>
              </Select>

              {/* 直接添加用户 */}
              <Dialog open={isAddUserDialogOpen} onOpenChange={(open) => {
                setIsAddUserDialogOpen(open);
                if (!open) {
                  setUserSearchKeyword('');
                  setUserSearchResults([]);
                  setSelectedSearchUserIds(new Set());
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9 rounded-xl gap-1">
                    <Plus className="w-4 h-4" />
                    添加用户
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>添加图集访问权限</DialogTitle>
                    <DialogDescription>
                      搜索用户或按权限组批量为其授予该图集的访问权限。
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="search" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 rounded-xl h-10 mb-4 bg-slate-100 p-1">
                      <TabsTrigger value="search" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">搜索添加</TabsTrigger>
                      <TabsTrigger value="group" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">按组批量</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="search" className="space-y-4">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="输入关键词搜索用户..." 
                          value={userSearchKeyword}
                          onChange={(e) => setUserSearchKeyword(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                          className="rounded-xl"
                        />
                        <Button onClick={handleSearchUsers} disabled={searchingUsers} className="rounded-xl">
                          {searchingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </Button>
                      </div>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {userSearchResults.length === 0 && !searchingUsers && userSearchKeyword && (
                          <div className="text-center py-10 text-slate-400 text-sm italic">未找到用户</div>
                        )}
                        {userSearchResults.map(user => (
                          <div key={user.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-3">
                              <Checkbox 
                                checked={selectedSearchUserIds.has(user.id)}
                                onCheckedChange={(checked) => {
                                  const next = new Set(selectedSearchUserIds);
                                  if (checked) next.add(user.id);
                                  else next.delete(user.id);
                                  setSelectedSearchUserIds(next);
                                }}
                              />
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>{(user.username || user.nickname || 'U')[0]}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate w-24">{user.username || user.nickname || '未知'}</p>
                                <p className="text-[10px] text-muted-foreground font-mono truncate w-24">{user.id.substring(0, 16)}...</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <Select value={newUserLevel} onValueChange={setNewUserLevel}>
                                 <SelectTrigger className="w-20 h-8 rounded-lg text-[10px] font-bold border-none bg-slate-200">
                                   <SelectValue />
                                 </SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="pt">PT</SelectItem>
                                   <SelectItem value="vip">VIP</SelectItem>
                                   <SelectItem value="svip">SVIP</SelectItem>
                                   <SelectItem value="vvip">VVIP</SelectItem>
                                 </SelectContent>
                               </Select>
                               <Button 
                                size="sm" 
                                className="h-8 rounded-lg px-2 text-[10px] font-bold"
                                onClick={() => handleAddUserToAlbum(user.id)}
                                disabled={addingUserId === user.id}
                               >
                                 {addingUserId === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : '添加'}
                               </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {selectedSearchUserIds.size > 0 && (
                        <Button 
                          onClick={handleBatchAddUsers} 
                          disabled={batchAddingUsers} 
                          className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10"
                        >
                          {batchAddingUsers ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                          批量添加所选 {selectedSearchUserIds.size} 个用户
                        </Button>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="group" className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500">选择权限组</Label>
                        <Select value={targetPermissionGroupId} onValueChange={setTargetPermissionGroupId}>
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue placeholder="选择一个权限组..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">请选择...</SelectItem>
                            {groups.map(g => (
                              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500">初始等级</Label>
                        <Select value={newUserLevel} onValueChange={setNewUserLevel}>
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pt">PT (普通)</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                            <SelectItem value="svip">SVIP</SelectItem>
                            <SelectItem value="restricted">限制级 (vvip)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button 
                        onClick={handleBatchAddUsersByGroup} 
                        disabled={batchAddingUsers || targetPermissionGroupId === 'all'} 
                        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11"
                      >
                        {batchAddingUsers ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Users className="w-4 h-4 mr-2" />}
                        从该权限组批量添加所有用户
                      </Button>
                      
                      <p className="text-[10px] text-slate-400 text-center italic">
                        注意：批量添加会将该权限组下的所有用户直接关联到该图集。
                      </p>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {selectedUserIds.size > 0 && (
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-3 flex items-center justify-between animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 px-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary">已选择 {selectedUserIds.size} 个用户</span>
              </div>
              <div className="flex items-center gap-2">
                <Select onValueChange={handleBatchUpdateUserLevels} disabled={isUpdatingLevels}>
                  <SelectTrigger className="w-40 h-8 rounded-xl text-[10px] font-bold">
                    {isUpdatingLevels ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Settings2 className="w-3 h-3 mr-1" />}
                    批量修改级别
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">PT (普通)</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="svip">SVIP</SelectItem>
                    <SelectItem value="restricted">限制级 (vvip)</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 rounded-xl text-[10px] text-muted-foreground"
                  onClick={() => setSelectedUserIds(new Set())}
                >
                  取消选择
                </Button>
              </div>
            </div>
          )}

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <div className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-12 pl-6">
                      <Checkbox 
                        checked={filteredAlbumUsers.length > 0 && selectedUserIds.size === filteredAlbumUsers.length}
                        onCheckedChange={toggleAllUsers}
                        className="rounded-md border-slate-300"
                      />
                    </TableHead>
                    <TableHead className="font-bold">用户</TableHead>
                    <TableHead className="font-bold">授予等级</TableHead>
                    <TableHead className="font-bold">授予时间</TableHead>
                    <TableHead className="font-bold text-right pr-6">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlbumUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        {userSearchTerm || userLevelFilter !== 'all' ? '未找到符合条件的记录' : '暂无专属权限记录'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAlbumUsers.map((perm) => (
                      <TableRow key={`${perm.album_id}-${perm.user_id}`} className={cn(selectedUserIds.has(perm.user_id) && "bg-primary/5")}>
                        <TableCell className="pl-6">
                          <Checkbox 
                            checked={selectedUserIds.has(perm.user_id)}
                            onCheckedChange={() => toggleUserSelection(perm.user_id)}
                            className="rounded-md border-slate-300"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 border border-slate-100 shadow-sm">
                              <AvatarImage src={perm.profiles?.avatar_url} />
                              <AvatarFallback className="bg-primary/5 text-primary text-[10px]">{perm.profiles?.nickname?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold truncate">{perm.profiles?.username || perm.profiles?.nickname || perm.profiles?.email || '未知用户'}</span>
                              <span className="text-[10px] text-muted-foreground font-mono truncate">{perm.user_id.substring(0, 18)}...</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select 
                            defaultValue={perm.level} 
                            onValueChange={(val) => handleUpdateAlbumUserLevel(perm.user_id, val)}
                          >
                            <SelectTrigger className={cn(
                              "h-7 w-24 rounded-md uppercase text-[10px] font-bold px-2 py-0.5 border-none",
                              perm.level === 'restricted' ? "bg-purple-500 hover:bg-purple-600 text-white" :
                              perm.level === 'svip' ? "bg-amber-500 hover:bg-amber-600 text-white" :
                              perm.level === 'vip' ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-slate-500 hover:bg-slate-600 text-white"
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pt">PT (普通)</SelectItem>
                              <SelectItem value="vip">VIP</SelectItem>
                              <SelectItem value="svip">SVIP</SelectItem>
                              <SelectItem value="restricted">限制级 (vvip)</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">
                          {formatBeijingTime(perm.created_at || perm.updated_at)}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-xl text-red-500 hover:bg-red-50"
                            onClick={() => handleDeleteAlbumUser(perm.user_id, perm.album_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
          
          {userTotal > 20 && (
            <div className="flex justify-center mt-4 pb-10">
               <Pagination className="justify-center">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => {
                          const newPage = Math.max(0, userPage - 1);
                          setUserPage(newPage);
                          fetchAlbumUsers(selectedAlbumId!, newPage);
                        }}
                        className={cn("cursor-pointer", userPage === 0 && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink isActive className="bg-primary text-primary-foreground pointer-events-none">
                        {userPage + 1}
                      </PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => {
                          const newPage = userPage + 1;
                          setUserPage(newPage);
                          fetchAlbumUsers(selectedAlbumId!, newPage);
                        }}
                        className={cn("cursor-pointer", (userPage + 1) * 20 >= userTotal && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    图集访问申请管理
                  </CardTitle>
                  <CardDescription>审核用户对特定图集的访问权限申请</CardDescription>
                </div>
                <Select value={requestStatus} onValueChange={(val) => { setRequestStatus(val); fetchAccessRequests(0, val); }}>
                  <SelectTrigger className="w-32 h-9 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="pending">待审核</SelectItem>
                    <SelectItem value="approved">已通过</SelectItem>
                    <SelectItem value="rejected">已拒绝</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/30">
                  <TableRow>
                    <TableHead className="w-[180px]">申请人</TableHead>
                    <TableHead className="w-[180px]">申请图集</TableHead>
                    <TableHead>申请理由 / 附件</TableHead>
                    <TableHead className="w-[100px]">状态</TableHead>
                    <TableHead className="text-right w-[150px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestLoading ? (
                    <TableRow><TableCell colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : accessRequests.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-20 text-center text-muted-foreground">暂无申请记录</TableCell></TableRow>
                  ) : (
                    accessRequests.map((req) => (
                      <TableRow key={req.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                              {req.profiles?.avatar_url ? <img referrerPolicy="no-referrer" src={req.profiles.avatar_url} className="w-full h-full object-contain rounded-full" /> : req.profiles?.username?.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs truncate">{req.profiles?.username || req.profiles?.nickname || req.profiles?.email || '未知用户'}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{req.profiles?.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-xs font-bold truncate">{req.photo_albums?.title || '未知图集'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <p className="text-xs text-slate-600 line-clamp-2">{req.reason}</p>
                            {req.attachment_url && (
                              <a 
                                href={req.attachment_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-[10px] text-blue-500 hover:underline font-bold"
                              >
                                <ExternalLink className="w-3 h-3" /> 查看附件
                              </a>
                            )}
                            {req.rejected_reason && (
                              <div className="text-[10px] text-destructive flex items-center gap-1">
                                <X className="w-3 h-3" /> 拒绝理由: {req.rejected_reason}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'outline'}
                            className="text-[10px] py-0 h-5"
                          >
                            {req.status === 'approved' ? '已通过' : req.status === 'rejected' ? '已拒绝' : '待审核'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {req.status === 'pending' && (
                              <>
                                <Button 
                                  size="sm" 
                                  className="h-7 rounded-xl text-[10px] font-bold px-3"
                                  onClick={() => {
                                    setApprovingRequest(req);
                                    setApprovedLevel(req.photo_albums?.level || 'pt');
                                  }}
                                >
                                  通过
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 rounded-xl text-[10px] font-bold px-3 text-destructive border-destructive/20 hover:bg-destructive/10"
                                  onClick={() => setRejectingRequest(req)}
                                >
                                  拒绝
                                </Button>
                              </>
                            )}
                            {req.status === 'approved' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 rounded-xl text-[10px] font-bold px-3"
                                onClick={() => {
                                  setApprovingRequest(req);
                                  setApprovedLevel(req.approved_level || 'pt');
                                }}
                              >
                                <Settings2 className="w-3 h-3 mr-1" /> 修改级别
                              </Button>
                            )}
                            {(req.status === 'approved' || req.status === 'rejected') && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 text-destructive"
                                 onClick={() => handleDeleteRequestRecord(req)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {requestTotal > limit && (
                <div className="p-4 border-t flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setRequestPage(p => Math.max(0, p - 1))}
                          className={requestPage === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setRequestPage(p => p + 1)}
                          className={(requestPage + 1) * limit >= requestTotal ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


      {/* 审批通过弹窗 */}
      <Dialog open={!!approvingRequest} onOpenChange={(o) => !o && setApprovingRequest(null)}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>审批权限申请</DialogTitle>
            <DialogDescription>
              选择授予用户 <span className="font-bold text-primary">{approvingRequest?.profiles?.username}</span> 的访问级别
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold">授予级别</Label>
              <Select value={approvedLevel} onValueChange={setApprovedLevel}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="pt">普通级 (pt)</SelectItem>
                  <SelectItem value="vip">VIP 专属 (vip)</SelectItem>
                  <SelectItem value="svip">SVIP 专属 (svip)</SelectItem>
                  <SelectItem value="restricted">限制级 (vvip)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground italic">注意：级别向下兼容（例如授予 VIP，用户可看 pt 和 vip 图片）</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setApprovingRequest(null)}>取消</Button>
            <Button className="rounded-xl px-8" onClick={handleApproveRequest}>确认通过</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 拒绝申请弹窗 */}
      <Dialog open={!!rejectingRequest} onOpenChange={(o) => !o && setRejectingRequest(null)}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>拒绝权限申请</DialogTitle>
            <DialogDescription>
              请填写拒绝申请的原因，用户将能看到此信息
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="例如：申请材料不全 / 暂未达到申请资格..." 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="rounded-xl min-h-[100px] text-xs"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setRejectingRequest(null)}>取消</Button>
            <Button variant="destructive" className="rounded-xl px-8" onClick={handleRejectRequest}>确认拒绝</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {/* 图片管理 */}
        <TabsContent value="photos" className="space-y-6">
          {selectedAlbumId ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setActiveTab('albums')} className="rounded-full">
                    <X className="w-5 h-5" />
                  </Button>
                  <div>
                    <h3 className="text-xl font-black">{albums.find(a => a.id === selectedAlbumId)?.title} - 图片管理</h3>
                    <p className="text-sm text-muted-foreground">支持本地上传和链接导入</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* 整个图集批量转权限级别 */}
                  <Select
                    onValueChange={async (level) => {
                      if (!selectedAlbumId) return;
                      const photoIds = albumPhotos.map(p => p.id);
                      if (photoIds.length === 0) return toast.error('当前图集暂无图片');
                      
                      const levelLabel = LEVEL_LABELS[level as keyof typeof LEVEL_LABELS];
                      if (!confirm(`确定要将当前图集的所有 ${photoIds.length} 张图片的权限级别改为「${levelLabel}」吗？`)) {
                        return;
                      }
                      
                      await handleBatchSetLevel(photoIds, level);
                    }}
                  >
                    <SelectTrigger className="w-[200px] h-10 rounded-xl">
                      <SelectValue placeholder="整个图集转权限级别" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">待定</SelectItem>
                      <SelectItem value="normal">普通</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="svip">SVIP</SelectItem>
                      <SelectItem value="restricted">受限</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                <CardHeader className="pb-0">
                  <Tabs value={uploadTab} onValueChange={setUploadTab} className="w-full">
                    <TabsList className="grid w-full max-w-[400px] grid-cols-4 rounded-xl bg-slate-100 p-1">
                      <TabsTrigger value="local" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">本地文件</TabsTrigger>
                      <TabsTrigger value="link" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">链接导入</TabsTrigger>
                      <TabsTrigger value="xls" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Excel 导入</TabsTrigger>
                      <TabsTrigger value="api" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">接口导入</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent className="p-6">
                  {uploadTab === 'local' ? (
                    <div className="space-y-4">
                      <div 
                        className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50/50 hover:bg-slate-50 hover:border-primary/30 transition-all cursor-pointer group"
                        onClick={() => document.getElementById('album-photo-select')?.click()}
                      >
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Plus className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <p className="font-bold">点击添加图片</p>
                          <p className="text-xs text-muted-foreground">支持批量选择，并发上传</p>
                        </div>
                        <input 
                          id="album-photo-select"
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={handleSelectLocalFiles}
                        />
                      </div>

                      {uploadFiles.length > 0 && (
                        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                          {uploadFiles.map((f) => (
                            <div key={f.id} className="relative aspect-square rounded-xl overflow-hidden group bg-slate-100 border">
                              <img referrerPolicy="no-referrer" src={f.preview} alt="预览" className="w-full h-full object-contain" />

                              {f.status === 'uploading' && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <div className="text-[10px] text-white font-bold">{f.progress}%</div>
                                </div>
                              )}
                              {f.status === 'success' && (
                                <div className="absolute top-1 right-1">
                                  <CircleCheckBig className="w-4 h-4 text-emerald-500 fill-white" />
                                </div>
                              )}
                              {f.status === 'error' && (
                                <div className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center p-1 text-center">
                                  <CircleAlert className="w-4 h-4 text-red-500 mb-1" />
                                  <span className="text-[8px] text-red-600 font-bold leading-tight line-clamp-2">{f.errorMsg}</span>
                                </div>
                              )}
                              {f.status === 'duplicate' && (
                                <div className="absolute inset-0 bg-amber-500/40 flex flex-col items-center justify-center p-1 text-center group/dup">
                                  <CircleAlert className="w-4 h-4 text-white mb-1 drop-shadow-md" />
                                  <span className="text-[8px] text-white font-black leading-tight drop-shadow-md">{f.errorMsg || '重复'}</span>
                                  
                                  {/* 悬浮显示重复对象 */}
                                  {(f as any).duplicateOf && (
                                    <div className="absolute inset-0 opacity-0 group-hover/dup:opacity-100 transition-opacity bg-black pointer-events-none z-10">
                                      <img referrerPolicy="no-referrer" src={(f as any).duplicateOf} alt="重复来源" className="w-full h-full object-contain opacity-60" />
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-[10px] text-white font-bold bg-black/60 px-2 py-1 rounded">重复源图</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                               {/* 统一删除按钮：放在最后以确保在所有图层之上 */}
                               {(f.status === 'idle' || f.status === 'error' || f.status === 'duplicate') && !uploading && (
                                 <div className="absolute top-1 right-1 z-[100] opacity-0 group-hover:opacity-100 transition-opacity">
                                   <Button 
                                     variant="destructive" 
                                     size="icon" 
                                     className="w-6 h-6 rounded-lg shadow-lg"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setUploadFiles(prev => prev.filter(x => x.id !== f.id));
                                     }}
                                   >
                                     <X className="w-3.5 h-3.5" />
                                   </Button>
                                 </div>
                               )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex justify-end">
                        <Button 
                          className="rounded-xl px-8 font-bold gap-2"
                          disabled={uploading || uploadFiles.filter(f => f.status === 'idle' || f.status === 'duplicate' || f.status === 'error').length === 0}
                          onClick={handleStartUpload}
                        >
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          开始上传
                        </Button>
                      </div>
                    </div>
                  ) : uploadTab === 'link' ? (
                    <div className="space-y-4">
                      <Label>批量设置链接（每行一个 URL）</Label>
                      <Textarea 
                        placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                        value={batchUrls}
                        onChange={(e) => setBatchUrls(e.target.value)}
                        className="rounded-xl min-h-[150px]"
                      />
                      <div className="flex justify-end">
                        <Button 
                          className="rounded-xl px-8 font-bold gap-2"
                          disabled={uploading || !batchUrls.trim()}
                          onClick={handleImportUrls}
                        >
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadIcon className="w-4 h-4" />}
                          开始导入
                        </Button>
                      </div>
                    </div>
                  ) : uploadTab === 'link' ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold">链接批量导入</h4>
                          <p className="text-xs text-muted-foreground">每行一个图片链接，支持批量导入与分级</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] font-bold rounded-lg"
                            onClick={() => {
                              setBatchUrls('');
                              localStorage.removeItem(`batch_urls_${selectedAlbumId}`);
                            }}
                            disabled={!batchUrls}
                          >
                            清空输入
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <Textarea 
                            placeholder="请粘贴图片链接，每行一个..." 
                            className="min-h-[300px] font-mono text-xs rounded-2xl resize-none bg-slate-50 border-slate-200 focus:bg-white transition-all"
                            value={batchUrls}
                            onChange={(e) => setBatchUrls(e.target.value)}
                            disabled={importing}
                          />
                          
                          {importing && (
                            <div className="space-y-2 px-2">
                              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>导入进度</span>
                                <span>{importProgress}%</span>
                              </div>
                              <Progress value={importProgress} className="h-1.5 rounded-full" />
                            </div>
                          )}

                          <Button 
                            className="w-full rounded-2xl h-12 font-bold shadow-lg shadow-primary/20"
                            disabled={!batchUrls || importing}
                            onClick={handleImportUrls}
                          >
                            {importing ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                正在导入素材 ({importProgress}%)
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                开始批量导入 ({batchUrls.split(/[\s,]+/).filter(u => u.trim().startsWith('http')).length} 个)
                              </div>
                            )}
                          </Button>
                        </div>

                        <div className="bg-slate-50 rounded-2xl border border-slate-100 flex flex-col h-[384px]">
                          <div className="p-3 border-b border-slate-200 bg-white/50 rounded-t-2xl flex items-center justify-between">
                            <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400">素材预览</h5>
                            <Badge variant="outline" className="text-[10px] rounded-lg">
                              {batchUrls.split(/[\s,]+/).filter(u => u.trim().startsWith('http')).length} 待导入
                            </Badge>
                          </div>
                          <div className="flex-1 overflow-y-auto p-3">
                            {batchUrls.split(/[\s,]+/).filter(u => u.trim().startsWith('http')).length > 0 ? (
                              <div className="grid grid-cols-3 gap-2">
                                {batchUrls.split(/[\s,]+/).filter(u => u.trim().startsWith('http')).slice(0, 50).map((url, i) => (
                                  <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-200 border border-slate-300 relative group">
                                    <ProtectedMedia ruleKey="后" 
                                      type="image"
                                      src={adminGetPhotoUrl(url.trim().replace(/[,;]+$/, ''), selectedAlbumId || undefined, currentZonePhotoUrl)} 
                                      authToken={currentZonePhotoUrl}
                                      albumId={selectedAlbumId}
                                      className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-300" 
                                      alt="Preview"
                                      isThumbnail
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <span className="text-[8px] text-white font-bold">#{i+1}</span>
                                    </div>
                                  </div>
                                ))}
                                {batchUrls.split(/[\s,]+/).filter(u => u.trim().startsWith('http')).length > 50 && (
                                  <div className="aspect-square rounded-lg bg-slate-100 flex items-center justify-center border border-dashed border-slate-300">
                                    <span className="text-[10px] text-slate-400 font-bold">+{batchUrls.split(/[\s,]+/).filter(u => u.trim().startsWith('http')).length - 50} ...</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3">
                                <ImageIcon className="w-10 h-10 opacity-20" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">暂无预览内容</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : uploadTab === 'xls' ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold">Excel 批量导入图片</h4>
                          <p className="text-xs text-muted-foreground">通过 Excel 表格批量导入图片链接、分级等信息</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleDownloadPhotoTemplate} 
                          className="text-xs font-bold gap-2 rounded-xl"
                        >
                          <DownloadIcon className="w-3.5 h-3.5" />
                          下载导入模板
                        </Button>
                      </div>

                      <div 
                        className="border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 bg-slate-50/50 hover:bg-slate-50 hover:border-primary/30 transition-all cursor-pointer group"
                        onClick={() => document.getElementById('album-photo-xls-import')?.click()}
                      >
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary/40 group-hover:scale-110 group-hover:text-primary transition-all">
                          <FileSpreadsheet className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-slate-700">点击选择 Excel 文件进行导入</p>
                          <p className="text-xs text-muted-foreground mt-1">支持 .xlsx, .xls 格式</p>
                        </div>
                        <input 
                          id="album-photo-xls-import"
                          type="file"
                          accept=".xlsx,.xls"
                          className="hidden"
                          onChange={handleXlsPhotoImport}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold">Zonerama 接口导入</h4>
                          <p className="text-xs text-muted-foreground">从 Zonerama 相册自动导入所有图片链接</p>
                        </div>
                        {currentAlbumIdValue && (
                          <Badge variant="outline" className="rounded-lg px-2 py-1 font-mono text-[10px] bg-slate-50 border-slate-200 text-slate-500">
                            ID: {currentAlbumIdValue}
                          </Badge>
                        )}
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Zap className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <h5 className="font-bold text-sm">自动提取相册素材</h5>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              系统将根据当前图集自定义字段 <code className="bg-slate-200 px-1 rounded">albumId</code> 的数值（当前为: <span className="font-bold text-slate-700">{currentAlbumIdValue || '未设置'}</span>），
                              自动从 Zonerama 获取所有高清图片链接并导入到本相册中。
                            </p>
                          </div>
                        </div>

                        {!currentAlbumIdValue && (
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-3 text-amber-800">
                            <CircleAlert className="w-4 h-4 shrink-0" />
                            <p className="text-[11px] font-bold">请先在图集设置中配置自定义字段 albumId</p>
                          </div>
                        )}

                        <div className="flex justify-end pt-2">
                          <Button 
                            className="rounded-xl px-8 font-bold gap-2"
                            disabled={uploading || !currentAlbumIdValue}
                            onClick={handleZoneramaApiImport}
                          >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            立即开始导入
                          </Button>
                        </div>
                      </div>
                      
                      <div className="bg-slate-100/50 rounded-xl p-4 text-[11px] text-muted-foreground space-y-2">
                        <p className="font-bold text-slate-500">💡 导入说明：</p>
                        <ul className="list-disc list-inside space-y-1 pl-1">
                          <li>导入过程中不会下载文件，仅提取 URL 链接，导入速度快。</li>
                          <li>重复的 URL 将会被跳过（基于 URL 唯一性）。</li>
                          <li>导入后的图片默认为“待分级”状态。</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 已上传列表 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold flex items-center gap-2 text-slate-800">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    已上传图片 ({photoTotal})
                  </h4>
                  <div className="flex items-center gap-3">
                    <Select value={photoFilterLevel} onValueChange={(val) => {
                      setPhotoFilterLevel(val);
                      setPhotoPage(0);
                      if (selectedAlbumId) fetchAlbumPhotos(selectedAlbumId, 0, val);
                    }}>
                      <SelectTrigger className="w-[120px] h-9 rounded-xl text-xs">
                        <SelectValue placeholder="全部分级" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部分级</SelectItem>
                        <SelectItem value="pending">待分级</SelectItem>
                        <SelectItem value="normal">普通级 (pt)</SelectItem>
                        <SelectItem value="vip">VIP专属 (vip)</SelectItem>
                        <SelectItem value="svip">SVIP专属 (svip)</SelectItem>
                        <SelectItem value="restricted">限制级 (vvip)</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-2 font-bold h-9 bg-white text-orange-600 border-orange-200 hover:bg-orange-50"
                      onClick={() => {
                        const filteredIds = albumPhotos
                          .filter(p => photoFilterLevel === 'all' || (p.level || 'pending') === photoFilterLevel)
                          .map(p => p.id);
                        
                        if (filteredIds.length === 0) return;
                        showConfirm('确认重置分级', `确定要重置当前筛选出的 ${filteredIds.length} 张图片的分级吗？重置后这些图片将变为“待分级”状态。`, () => {
                          handleBatchSetLevel(filteredIds, 'pending');
                        });
                      }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      重置筛选分级
                    </Button>

                    <Select onValueChange={(val) => {
                      const filteredIds = albumPhotos
                        .filter(p => photoFilterLevel === 'all' || (p.level || 'pending') === photoFilterLevel)
                        .map(p => p.id);
                      if (filteredIds.length === 0) return;
                      showConfirm(`确认批量修改为 ${LEVEL_LABELS[val as keyof typeof LEVEL_LABELS]}`, `确定要将当前筛选出的 ${filteredIds.length} 张图片全部分级修改为 ${LEVEL_LABELS[val as keyof typeof LEVEL_LABELS]} 吗？`, () => {
                        handleBatchSetLevel(filteredIds, val);
                      });
                    }}>
                      <SelectTrigger className="w-[140px] h-9 rounded-xl font-bold border-primary/20 text-primary bg-white">
                        <Zap className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="批量设置分级" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="normal">普通级 (pt)</SelectItem>
                        <SelectItem value="vip">VIP专属 (vip)</SelectItem>
                        <SelectItem value="svip">SVIP专属 (svip)</SelectItem>
                        <SelectItem value="restricted">限制级 (vvip)</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-2 font-bold h-9 bg-white"
                      onClick={() => fetchAlbumPhotos(selectedAlbumId!)}
                    >
                      <RefreshCw className="w-4 h-4" />
                      刷新
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {albumPhotos.map((photo) => (
                        <Card key={photo.id} className="group relative aspect-square rounded-2xl overflow-hidden border-none shadow-sm hover:shadow-md transition-all">
                        <ProtectedMedia ruleKey="后" 
                          src={adminGetPhotoUrl(photo.url, photo.album_id, currentZonePhotoUrl)} 
                          authToken={currentZonePhotoUrl}
                          albumId={photo.album_id}
                          type="image" 
                          alt="图集图片" 
                          className="w-full h-full object-contain" 
                        />
                      
                      {/* 如果是待分级，显示显著标识 */}
                      {(photo.level === 'pending' || !photo.level) && (
                        <div className="absolute top-2 left-2 z-20">
                          <Badge className="bg-amber-500 text-white border-none text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-lg">
                            待分级
                          </Badge>
                        </div>
                      )}
                      
                      {/* 其他分级也显示小角标（非悬停状态下也可见，提升识别度） */}
                      {photo.level && photo.level !== 'pending' && (
                        <div className="absolute top-2 left-2 z-20">
                          <Badge className={cn("border-none text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-lg opacity-80", LEVEL_COLORS[photo.level as keyof typeof LEVEL_COLORS])}>
                            {LEVEL_LABELS[photo.level as keyof typeof LEVEL_LABELS]}
                          </Badge>
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-black/20 opacity-0 group-hover:opacity-100 transition-all z-10 pointer-events-none group-hover:pointer-events-auto">
                        <div className="flex items-center justify-between gap-1.5">
                          <Select 
                            value={photo.level || 'pending'}
                            onValueChange={(val) => handleBatchSetLevel([photo.id], val)}
                          >
                            <SelectTrigger className="h-8 text-[11px] bg-white/30 border-none text-white rounded-lg px-2 flex-1 shadow-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">待分级</SelectItem>
                              <SelectItem value="normal">普通级 (pt)</SelectItem>
                              <SelectItem value="vip">VIP专属 (vip)</SelectItem>
                               <SelectItem value="svip">SVIP专属 (svip)</SelectItem>
                              <SelectItem value="restricted">限制级 (vvip)</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg text-white hover:bg-primary/30 hover:text-primary bg-white/10"
                            title="设为封面"
                            onClick={() => handleSetCover(photo)}
                          >
                            <ImageIcon className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg text-white hover:bg-red-500/30 hover:text-red-500 bg-white/10"
                            onClick={() => handleRemovePhoto(photo.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {photoTotal > photoLimit && (
                  <div className="flex justify-center pt-8">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => {
                              const newPage = Math.max(0, photoPage - 1);
                              setPhotoPage(newPage);
                              if (selectedAlbumId) fetchAlbumPhotos(selectedAlbumId, newPage, photoFilterLevel);
                            }}
                            className={photoPage === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <span className="text-xs font-bold text-muted-foreground px-4 py-1.5 bg-muted/50 rounded-lg">
                            第 {photoPage + 1} 页 / 共 {Math.ceil(photoTotal / photoLimit)} 页
                          </span>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => {
                              const newPage = Math.min(Math.ceil(photoTotal / photoLimit) - 1, photoPage + 1);
                              setPhotoPage(newPage);
                              if (selectedAlbumId) fetchAlbumPhotos(selectedAlbumId, newPage, photoFilterLevel);
                            }}
                            className={photoPage >= Math.ceil(photoTotal / photoLimit) - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
              <p>请先从图集管理中选择一个图集进行管理</p>
              <Button variant="link" onClick={() => setActiveTab('albums')}>去选择图集</Button>
            </div>
          )}
        </TabsContent>

        {/* 极速分级 */}
        <TabsContent value="fast-leveling">
          <FastLevelingSection 
            selectedAlbumId={selectedAlbumId} 
            setSelectedAlbumId={setSelectedAlbumId}
            onUpdate={() => fetchData(false)} 
          />
        </TabsContent>

        {/* 自定义字段库 */}
        <TabsContent value="fields" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="rounded-2xl gap-2 font-bold"
                  onClick={() => setEditingField({ is_active: true, options: [], type: 'text' })}
                >
                  <Plus className="w-4 h-4" />
                  新增字段
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg rounded-3xl">
                <DialogHeader>
                  <DialogTitle>{editingField?.id ? '编辑字段' : '新增字段'}</DialogTitle>
                  <DialogDescription>配置自定义扩展字段，用于记录图集或照片的额外属性（如拍摄地点、摄影师等）。</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>字段名称</Label>
                    <Input 
                      placeholder="如：拍摄地点"
                      value={editingField?.name || ''}
                      onChange={(e) => setEditingField({ ...editingField, name: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>字段类型</Label>
                    <Select 
                      value={editingField?.type || 'text'}
                      onValueChange={(v) => setEditingField({ ...editingField, type: v as any })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">文本</SelectItem>
                        <SelectItem value="select">下拉选择</SelectItem>
                        <SelectItem value="date">日期</SelectItem>
                        <SelectItem value="multi_tag">多标签</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(editingField?.type === 'select' || editingField?.type === 'multi_tag') && (
                    <div className="space-y-2">
                      <Label>选项列表（每行一个）</Label>
                      <Textarea 
                        placeholder="选项1&#10;选项2&#10;选项3"
                        value={editingField?.options?.join('\n') || ''}
                        onChange={(e) => setEditingField({ 
                          ...editingField, 
                          options: e.target.value.split('\n') 
                        })}
                        className="rounded-xl"
                        rows={4}
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={editingField?.is_active ?? true}
                        onCheckedChange={(v) => setEditingField({ ...editingField, is_active: v })}
                      />
                      <Label>启用此字段</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={editingField?.is_visible_on_front ?? true}
                        onCheckedChange={(v) => setEditingField({ ...editingField, is_visible_on_front: v })}
                      />
                      <Label>前端展示</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={editingField?.is_searchable ?? false}
                        onCheckedChange={(v) => setEditingField({ ...editingField, is_searchable: v })}
                      />
                      <Label>支持搜索</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={editingField?.is_filterable ?? false}
                        onCheckedChange={(v) => setEditingField({ ...editingField, is_filterable: v })}
                      />
                      <Label>支持筛选</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setFieldDialogOpen(false)} className="rounded-xl">取消</Button>
                  <Button onClick={handleSaveField} className="rounded-xl gap-2">
                    <Save className="w-4 h-4" />
                    保存
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-none shadow-sm rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black">字段库列表</CardTitle>
              <CardDescription>配置图集可使用的自定义字段</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customFields.map((field) => (
                  <div key={field.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{field.name}</span>
                          <Badge variant="secondary" className="rounded-md text-[10px]">
                            {field.type === 'text' && '文本'}
                            {field.type === 'select' && '下拉'}
                            {field.type === 'date' && '日期'}
                            {field.type === 'multi_tag' && '多标签'}
                          </Badge>
                          <Badge variant={field.is_active ? 'default' : 'secondary'} className="rounded-md text-[10px]">
                            {field.is_active ? '启用' : '禁用'}
                          </Badge>
                          {field.is_searchable && (
                            <Badge variant="outline" className="rounded-md text-[10px] bg-blue-50 text-blue-600 border-blue-100">
                              搜索
                            </Badge>
                          )}
                          {field.is_filterable && (
                            <Badge variant="outline" className="rounded-md text-[10px] bg-purple-50 text-purple-600 border-purple-100">
                              筛选
                            </Badge>
                          )}
                        </div>
                        {field.options.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            选项: {field.options.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl gap-1"
                        onClick={() => {
                          setEditingField(field);
                          setFieldDialogOpen(true);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                        编辑
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-xl gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteField(field.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
                {customFields.length === 0 && (
                  <div className="text-center p-12 text-muted-foreground">
                    <Layers className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    暂无自定义字段，点击右上角新增。
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm rounded-3xl mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black">字段组合 (快速组合)</CardTitle>
                <CardDescription>预设常用字段组合，方便在图集编辑时一键应用</CardDescription>
              </div>
              <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="rounded-2xl gap-2 font-bold"
                    onClick={() => setEditingGroup({ name: '', field_ids: [] })}
                  >
                    <Plus className="w-4 h-4" />
                    新建组合
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>{editingGroup?.id ? '编辑组合' : '新建组合'}</DialogTitle>
                    <DialogDescription>为图集预设一组常用的自定义字段。</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>组合名称</Label>
                      <Input 
                        placeholder="如：摄影师资料"
                        value={editingGroup?.name || ''}
                        onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>包含字段 (多选)</Label>
                      <MultiSelect 
                        options={customFields.map(f => ({ label: f.name, value: f.id }))}
                        value={editingGroup?.field_ids || []}
                        onChange={(v) => setEditingGroup({ ...editingGroup, field_ids: v })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setGroupDialogOpen(false)} className="rounded-xl">取消</Button>
                    <Button onClick={handleSaveFieldGroup} className="rounded-xl gap-2">
                      <Save className="w-4 h-4" />
                      保存组合
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fieldGroups.map((group) => (
                  <div key={group.id} className="p-4 bg-slate-50 rounded-2xl flex flex-col justify-between gap-3 group relative border border-transparent hover:border-primary/20 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                          <Settings2 className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-800">{group.name}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 rounded-lg"
                          onClick={() => {
                            setEditingGroup(group);
                            setGroupDialogOpen(true);
                          }}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteFieldGroup(group.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.field_ids.map((fid: string) => {
                        const field = customFields.find(f => f.id === fid);
                        return field ? (
                          <Badge key={fid} variant="outline" className="text-[10px] bg-white rounded-md border-slate-200">
                            {field.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                ))}
                {fieldGroups.length === 0 && (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <Settings2 className="w-12 h-12 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">暂无预设组合</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PDF 管理 */}
        <TabsContent value="pdf" className="space-y-6">
          <Card className="border-none shadow-sm rounded-3xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black">PDF 管理中心</CardTitle>
                  <CardDescription>管理所有图集的 PDF 生成状态，按权限等级导出内容。</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-xl gap-2" onClick={() => fetchData()}>
                    <Clock className="w-4 h-4" />
                    刷新列表
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {albums.map((album) => (
                  <div key={album.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 h-16 rounded-2xl bg-slate-200 overflow-hidden flex-shrink-0">
                        {album.cover_url ? (
                          <ProtectedMedia ruleKey="后" 
                            src={adminGetPhotoUrl(album.cover_url, album.id, getAlbumZonePhotoAuth(album))} 
                            authToken={getAlbumZonePhotoAuth(album)}
                            albumId={album.id}
                            type="image" 
                            alt="" 
                            className="w-full h-full object-contain" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-black text-slate-800 truncate">{album.title}</h4>
                          <Badge variant="outline" className="rounded-md text-[10px] bg-white border-slate-200">
                            {album.photo_count}P
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {['all', 'normal', 'vip', 'svip', 'restricted'].map(lvl => {
                            const url = album.pdf_urls?.[lvl];
                            return (
                              <div key={lvl} className="flex items-center gap-1.5">
                                <Badge 
                                  variant={url ? "default" : "secondary"} 
                                  className={cn(
                                    "rounded-lg text-[9px] py-1 px-2.5 cursor-pointer shadow-sm transition-all",
                                    url 
                                      ? "bg-emerald-500 text-white hover:bg-emerald-600 border-none scale-105" 
                                      : "bg-slate-100 text-slate-400 opacity-60"
                                  )}
                                  onClick={() => url && window.open(url as string, '_blank')}
                                >
                                  {url ? <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> : <Clock className="w-2.5 h-2.5 mr-1" />}
                                  {LEVEL_LABELS[lvl as keyof typeof LEVEL_LABELS] || '全部'}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 md:w-auto w-full">
                      <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl gap-2 font-bold h-9 bg-white"
                          disabled={generatingPdfIds.has(album.id)}
                          onClick={() => handleGeneratePdf(album.id, 'all')}
                        >
                          {generatingPdfIds.has(album.id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileArchive className="w-3.5 h-3.5 text-blue-500" />
                          )}
                          生成全部
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl gap-2 font-bold h-9 bg-white"
                          disabled={generatingPdfIds.has(album.id)}
                          onClick={() => handleGeneratePdf(album.id, 'normal')}
                        >
                          {generatingPdfIds.has(album.id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Shield className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          普通级
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl gap-2 font-bold h-9 bg-white"
                          disabled={generatingPdfIds.has(album.id)}
                          onClick={() => handleGeneratePdf(album.id, 'vip')}
                        >
                          {generatingPdfIds.has(album.id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-blue-500" />
                          )}
                          VIP
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl gap-2 font-bold h-9 bg-white"
                          disabled={generatingPdfIds.has(album.id)}
                          onClick={() => handleGeneratePdf(album.id, 'svip')}
                        >
                          {generatingPdfIds.has(album.id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-orange-500" />
                          )}
                          SVIP
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl gap-2 font-bold h-9 bg-white"
                          disabled={generatingPdfIds.has(album.id)}
                          onClick={() => handleGeneratePdf(album.id, 'restricted')}
                        >
                          {generatingPdfIds.has(album.id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-red-500" />
                          )}
                          限制级
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {albums.length === 0 && (
                <div className="text-center p-20 text-muted-foreground bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  暂无图集数据，请先创建图集。
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <AlertDialog open={confirmConfig.open} onOpenChange={(open) => !open && setConfirmConfig(prev => ({ ...prev, open: false }))}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black flex items-center gap-3 text-slate-800">
              <CircleAlert className="w-6 h-6 text-amber-500" />
              {confirmConfig.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium text-base">
              {confirmConfig.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="rounded-2xl font-bold border-slate-200">考虑一下</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                confirmConfig.onConfirm();
                setConfirmConfig(prev => ({ ...prev, open: false }));
              }} 
              className="rounded-2xl font-black bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-200 text-white"
            >
              确定操作
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!photoToDelete} onOpenChange={(open) => !open && setPhotoToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black flex items-center gap-3 text-red-600">
              <CircleAlert className="w-6 h-6" />
              确认移除图片
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium text-base">
              确定要从图集中移除此图片吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="rounded-2xl font-bold border-slate-200">考虑一下</AlertDialogCancel>
            <AlertDialogAction onClick={executeRemovePhoto} className="rounded-2xl font-black bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 text-white">
              确定移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
