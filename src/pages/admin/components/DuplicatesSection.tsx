import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBeijingTime, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useConfig } from '@/contexts/ConfigContext';
import { 
  RefreshCw, CircleCheckBig, ScanSearch, List, Trash2, Search, Loader2, Settings as SettingsIcon,
  ShieldCheck, Zap, Save, Check, Grid, Image as ImageIcon, FileText
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { EyeOff } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Code, Terminal } from 'lucide-react';


export function DuplicatesSection() {
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [visualDuplicates, setVisualDuplicates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('md5');
  const [visualMode, setVisualMode] = useState<'list' | 'grid' | 'speedy'>('list');
  const [pendingCount, setPendingCount] = useState(0);
  const [scanLimit, setScanLimit] = useState(50);
  const [scanListTab, setScanListTab] = useState<'processed' | 'unprocessed' | 'error' | 'unique'>('unprocessed');
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [mediaListLoading, setMediaListLoading] = useState(false);
  const [dedupeConfig, setDedupeConfig] = useState<Record<string, any>>({ 
    similarity_threshold: 5,
    trigger_mode: 'on_upload',
    auto_clean: false,
    scan_api_url: ''
  });
  const [auditConfig, setAuditConfig] = useState({
    global_audit_enabled: true,
    bypass_audit_with_permission: true
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [scanLogs, setScanLogs] = useState<{message: string, type: string, timestamp: string}[]>([]);
  const logScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [scanLogs]);

  const [confirmConfig, setConfirmConfig] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
    variant?: 'danger' | 'default';
  }>({
    open: false,
    title: '',
    description: '',
    action: () => {},
    variant: 'default'
  });

  const [speedyMode, setSpeedyMode] = useState(false);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [speedyItems, setSpeedyItems] = useState<any[]>([]);
  const [speedyLoading, setSpeedyLoading] = useState(false);
  const [speedyCheckedItems, setSpeedyCheckedItems] = useState<string[]>([]);
  
  useEffect(() => {
    loadConfigs();
    loadStats();
  }, []);

  const { refreshConfig } = useConfig();

  const loadStats = async () => {
    const { data } = await api.getDedupeStats();
    if (data) setStats(data);
  };

  const loadConfigs = async () => {
    try {
      const [{ data: dData }, { data: aData }] = await Promise.all([
        api.getSystemConfig('dedupe_config'),
        api.getSystemConfig('audit_config')
      ]);
      if (dData?.value) setDedupeConfig(dData.value);
      if (aData?.value) setAuditConfig(aData.value);
    } catch (error) {
      console.error('Failed to load configs:', error);
    }
  };

  const handleSaveConfigs = async () => {
    setSavingSettings(true);
    try {
      await Promise.all([
        api.updateSystemConfig('audit_config', auditConfig),
        api.updateSystemConfig('dedupe_config', dedupeConfig)
      ]);
      refreshConfig();
      toast.success('设置已更新');
      setIsSettingsOpen(false);
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const loadDuplicates = async () => {
    setLoading(true);
    try {
      const pendingRes = await api.getUnprocessedMediaCount();
      setPendingCount(pendingRes.count || 0);

      if (activeTab === 'md5') {
        const { data, error } = await api.getDuplicateMedia();
        if (error) throw error;
        setDuplicates(Array.isArray(data) ? data : []);
      } else if (activeTab === 'visual') {
        const { data, error } = await api.getVisuallyDuplicateMedia(dedupeConfig?.similarity_threshold);
        if (error) throw error;
        setVisualDuplicates(Array.isArray(data) ? data : []);
      }
    } catch (error: any) {
      toast.error('加载重复文件失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMediaList = async () => {
    setMediaListLoading(true);
    try {
      const { data, error } = await api.getMediaByScanStatus(scanListTab);
      if (error) throw error;
      setMediaList(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error('加载列表失败: ' + error.message);
    } finally {
      setMediaListLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'md5' || activeTab === 'visual') {
      loadDuplicates();
    } else if (activeTab === 'list') {
      loadMediaList();
    }
  }, [activeTab, scanListTab, dedupeConfig?.similarity_threshold]);

  const handleScanContent = async () => {
    setScanning(true);
    setScanLogs([{ message: '初始化扫描任务...', type: 'info', timestamp: new Date().toISOString() }]);
    
    // 订阅实时日志
    const channel = supabase.channel('image-dedupe-progress')
      .on('broadcast', { event: 'log' }, ({ payload }) => {
        setScanLogs(prev => [...prev, payload].slice(-100));
      })
      .subscribe();

    try {
      const { data, error } = await api.scanImageContentHashes(scanLimit, undefined, dedupeConfig?.scan_api_url);
      if (error) {
        let errorMsg = error.message;
        try {
          if (error.context && typeof error.context.text === 'function') {
            errorMsg = await error.context.text();
          }
        } catch (e) {}
        throw new Error(errorMsg || '扫描过程发生错误');
      }
      toast.success(`扫描完成：已处理 ${data?.processed || 0} 项`);
      loadDuplicates();
      loadStats();
      if (activeTab === 'list') loadMediaList();
    } catch (error: any) {
      toast.error('扫描失败: ' + error.message);
    } finally {
      setScanning(false);
      // 延迟关闭频道，确保最后一条消息到达
      setTimeout(() => {
        channel.unsubscribe();
      }, 3000);
    }
  };

  const handleClearAllDuplicates = async () => {
    setConfirmConfig({
      open: true,
      title: '清理精确重复项',
      description: '确定要清理所有文件指纹完全一致的重复项吗？(仅保留每组中最旧的一份)',
      variant: 'danger',
      action: async () => {
        setLoading(true);
        try {
          const { data, error } = await api.clearAllDuplicateMedia();
          if (error) throw error;
          toast.success(`清理完成：已删除 ${data?.[0]?.deleted_count || 0} 个文件指纹重复项`);
          loadDuplicates();
        } catch (e: any) {
          toast.error('清理失败: ' + e.message);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleClearAllVisualDuplicates = async () => {
    setConfirmConfig({
      open: true,
      title: '清理视觉重复项',
      description: '确定要清理所有视觉指纹高度相似的重复项吗？(仅保留每组中最旧的一份)',
      variant: 'danger',
      action: async () => {
        setLoading(true);
        try {
          const { data, error } = await api.clearAllVisualDuplicates(dedupeConfig?.similarity_threshold || 5);
          if (error) throw error;
          toast.success(`清理完成：已删除 ${data?.[0]?.deleted_count || 0} 个视觉指纹重复项`);
          loadDuplicates();
        } catch (e: any) {
          toast.error('清理失败: ' + e.message);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleViewGroup = async (group: any) => {
    try {
      let items: any[] = [];
      if (activeTab === 'md5' && group.file_md5) {
        const { data, error } = await api.getDuplicateMediaByMd5(group.file_md5);
        if (error) throw error;
        items = data;
      } else if (activeTab === 'visual' && group.content_hash) {
        // 使用配置中的阈值查找相似项
        const { data, error } = await api.getVisuallyDuplicateByHash(group.content_hash, dedupeConfig?.similarity_threshold || 5);
        if (error) throw error;
        items = data;
      }
      setSelectedGroup({ ...group, items });
      
      // 默认选中除最旧版本外的所有项 (即默认删除最新版/重复版)
      if (items.length > 1) {
        const sorted = [...items].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setSelectedItems(sorted.slice(1).map(item => item.id));
      } else {
        setSelectedItems([]);
      }
    } catch (error: any) {
      toast.error('加载详情失败: ' + error.message);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    setConfirmConfig({
      open: true,
      title: '删除选中项',
      description: `确定要删除选中的 ${selectedItems.length} 个重复项吗？此操作不可恢复！`,
      variant: 'danger',
      action: async () => {
        setDeleting(true);
        let successCount = 0;
        let failCount = 0;
        
        try {
          for (const id of selectedItems) {
            const { error } = await api.hardDeleteMedia(id);
            if (error) {
              console.error(`Failed to delete ${id}:`, error);
              failCount++;
            } else {
              successCount++;
            }
          }
          
          if (successCount > 0) {
            toast.success(`成功删除 ${successCount} 个文件` + (failCount > 0 ? `，${failCount} 个失败` : ''));
            
            // 逻辑同步：如果此组处理后仅剩下一个，则标记该项为已忽略查重
            if (selectedGroup?.items) {
              const remaining = selectedGroup.items.filter((item: any) => !selectedItems.includes(item.id));
              if (remaining.length === 1) {
                await api.ignoreDedupeItem(remaining[0].id);
              }
            }
            
            setSelectedGroup(null);
            setSelectedItems([]);
            loadDuplicates();
          } else if (failCount > 0) {
            toast.error(`删除失败: ${failCount} 个文件删除时发生错误`);
          }
        } catch (error: any) {
          toast.error('操作发生异常: ' + error.message);
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  const selectDuplicatesButOldest = () => {
    if (!selectedGroup || !selectedGroup.items) return;
    // 按创建时间排序（旧的在前）
    const sorted = [...selectedGroup.items].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    // 选择除了第一个（最旧的）之外的所有项
    const idsToDelete = sorted.slice(1).map(item => item.id);
    setSelectedItems(idsToDelete);
  };

  const formatDate = (dateStr: string) => {
    return formatBeijingTime(dateStr);
  };

  const handleRescanItem = async (id: string) => {
    try {
      setScanning(true);
      await api.scanImageContentHashes(1, [id], dedupeConfig?.scan_api_url);
      toast.success('重新生成指纹成功');
      loadMediaList();
    } catch (e: any) {
      toast.error('操作失败: ' + e.message);
    } finally {
      setScanning(false);
    }
  };

  const handleIgnoreSelected = async (ids?: string[]) => {
    const targets = ids || selectedItems;
    if (targets.length === 0) return;
    setDeleting(true);
    let successCount = 0;
    try {
      for (const id of targets) {
        const { error } = await api.ignoreDedupeItem(id);
        if (!error) successCount++;
      }
      if (successCount > 0) {
        toast.success(`已忽略 ${successCount} 个项`);
        setSelectedGroup(null);
        setSelectedItems([]);
        loadDuplicates();
      }
    } catch (error: any) {
      toast.error('操作失败: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleIgnoreItem = async (id: string) => {
    try {
      await api.ignoreDedupeItem(id);
      toast.success('已标记为忽略，不再提示重复');
      loadMediaList();
      loadDuplicates();
      if (selectedGroup) {
        setSelectedGroup({
          ...selectedGroup,
          items: selectedGroup.items.filter((i: any) => i.id !== id)
        });
      }
    } catch (e: any) {
      toast.error('操作失败: ' + e.message);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setConfirmConfig({
      open: true,
      title: '彻底删除素材',
      description: '确定要彻底删除该素材吗？此操作不可恢复。',
      variant: 'danger',
      action: async () => {
        setLoading(true);
        try {
          const { error } = await api.hardDeleteMedia(id);
          if (error) throw error;
          toast.success('已彻底删除');
          loadMediaList();
          loadStats();
        } catch (e: any) {
          toast.error('删除失败: ' + e.message);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteAllErrors = async () => {
    const errorItems = mediaList.filter(i => !!i.dedupe_error);
    if (errorItems.length === 0) {
      toast.error('当前列表没有失败项');
      return;
    }
    
    setConfirmConfig({
      open: true,
      title: '清空失败项',
      description: `确定要彻底删除当前显示的 ${errorItems.length} 个处理失败的素材吗？此操作不可恢复。`,
      variant: 'danger',
      action: async () => {
        setLoading(true);
        try {
          const ids = errorItems.map(i => i.id);
          const { error } = await api.batchHardDeleteMedia(ids);
          if (error) throw error;
          toast.success(`已删除 ${ids.length} 个失败项目`);
          loadMediaList();
          loadStats();
        } catch (e: any) {
          toast.error('删除失败: ' + e.message);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleIgnoreAllErrors = async () => {
    setConfirmConfig({
      open: true,
      title: '忽略所有错误',
      description: '确定要忽略所有失败项吗？被忽略的项将不再出现在查重扫描中。',
      action: async () => {
        try {
          await api.ignoreAllDedupeErrors();
          toast.success('已忽略所有失败项');
          loadMediaList();
        } catch (e: any) {
          toast.error('操作失败: ' + e.message);
        }
      }
    });
  };

  const startSpeedyMode = async () => {
    if (visualDuplicates.length === 0) {
      toast.error('没有可用的视觉重复项');
      return;
    }
    setSpeedyMode(true);
    setCurrentGroupIndex(0);
    await loadGroupItems(visualDuplicates[0]);
  };

  const loadGroupItems = async (group: any) => {
    setSpeedyLoading(true);
    setSpeedyCheckedItems([]); // 重置勾选项
    try {
      const { data, error } = await api.getVisuallyDuplicateByHash(group.content_hash, dedupeConfig?.similarity_threshold || 5);
      if (error) throw error;
      setSpeedyItems(data || []);
    } catch (e: any) {
      toast.error('加载组详情失败: ' + e.message);
    } finally {
      setSpeedyLoading(false);
    }
  };

  const nextSpeedyGroup = async () => {
    const nextIndex = currentGroupIndex + 1;
    setSpeedyCheckedItems([]); // 重置
    if (nextIndex < visualDuplicates.length) {
      setCurrentGroupIndex(nextIndex);
      await loadGroupItems(visualDuplicates[nextIndex]);
    } else {
      setSpeedyMode(false);
      toast.success('已处理完所有项目');
      loadDuplicates();
    }
  };

  const handleSpeedyDelete = async (id: string) => {
    setConfirmConfig({
      open: true,
      title: '删除素材',
      description: '确定要永久删除此素材吗？此操作不可恢复。',
      variant: 'danger',
      action: async () => {
        const { error } = await api.hardDeleteMedia(id);
        if (error) {
          toast.error('删除失败: ' + error.message);
        } else {
          toast.success('已删除');
          // 从当前 items 中移除
          const updated = speedyItems.filter(item => item.id !== id);
          setSpeedyCheckedItems(speedyCheckedItems.filter(cid => cid !== id));
          if (updated.length <= 1) {
            // 如果只剩下一个，标记为已查重/保留
            if (updated.length === 1) {
              await api.ignoreDedupeItem(updated[0].id);
            }
            // 如果只剩下一个或没有了，说明这组已经处理完
            nextSpeedyGroup();
          } else {
            setSpeedyItems(updated);
          }
        }
      }
    });
  };

  const handleSpeedyBatchDelete = async () => {
    if (speedyCheckedItems.length === 0) return;
    const confirmed = await confirmAsync(`确定要永久删除选中的 ${speedyCheckedItems.length} 个素材吗？`, {
      variant: 'destructive',
      confirmText: '删除',
    });
    if (!confirmed) return;
    
    setSpeedyLoading(true);
    let successCount = 0;
    try {
      for (const id of speedyCheckedItems) {
        const { error } = await api.hardDeleteMedia(id);
        if (!error) successCount++;
      }
      toast.success(`成功删除 ${successCount} 个素材`);
      const updated = speedyItems.filter(item => !speedyCheckedItems.includes(item.id));
      setSpeedyCheckedItems([]);
      if (updated.length <= 1) {
        // 如果只剩下一个，标记为已查重/保留
        if (updated.length === 1) {
          await api.ignoreDedupeItem(updated[0].id);
        }
        nextSpeedyGroup();
      } else {
        setSpeedyItems(updated);
      }
    } catch (e: any) {
      toast.error('操作异常: ' + e.message);
    } finally {
      setSpeedyLoading(false);
    }
  };

  const handleSpeedyIgnore = async (id: string) => {
    try {
      await api.ignoreDedupeItem(id);
      toast.success('已加入忽略列表');
      const updated = speedyItems.filter(item => item.id !== id);
      setSpeedyCheckedItems(speedyCheckedItems.filter(cid => cid !== id));
      if (updated.length <= 1) {
        nextSpeedyGroup();
      } else {
        setSpeedyItems(updated);
      }
    } catch (e: any) {
      toast.error('忽略失败: ' + e.message);
    }
  };

  const handleSpeedyNotDuplicate = async () => {
    if (speedyItems.length < 2) {
      nextSpeedyGroup();
      return;
    }
    // 批量升级指纹版本，并为每个项目分配不同的版本，确保它们彼此之间在后续查重中完全隔离
    const ids = speedyItems.map(item => item.id);
    const { error } = await api.batchIncrementDedupeVersion(ids);
    if (error) {
      toast.error('标记失败: ' + error.message);
    } else {
      toast.success('已标记为非重复并保留 (各项目指纹已独立隔离)');
      nextSpeedyGroup();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">重复素材查重</h2>
          <p className="text-sm text-muted-foreground mt-1">管理和清理系统中存在的重复或高度相似的媒体文件</p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'md5' && duplicates.length > 0 && (
            <Button variant="destructive" size="sm" className="rounded-xl" onClick={handleClearAllDuplicates}>
              <Trash2 className="w-4 h-4 mr-2" />
              一键清理 MD5 重复 (保留最旧)
            </Button>
          )}
          {activeTab === 'visual' && visualDuplicates.length > 0 && (
            <Button variant="destructive" size="sm" className="rounded-xl" onClick={handleClearAllVisualDuplicates}>
              <Trash2 className="w-4 h-4 mr-2" />
              一键清理视觉相似 (保留最旧)
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadDuplicates} disabled={loading} className="rounded-xl">
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            刷新数据
          </Button>
          {activeTab === 'visual' && visualDuplicates.length > 0 && (
            <Button variant="default" size="sm" onClick={startSpeedyMode} className="rounded-xl bg-orange-500 hover:bg-orange-600">
              <Zap className="w-4 h-4 mr-2" />
              极速查重清理
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="rounded-xl h-9 w-9">
            <SettingsIcon className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* 审核与查重设置弹窗 */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
            <DialogTitle className="flex items-center gap-2 text-primary">
              <SettingsIcon className="w-5 h-5" />
              审核与查重全局配置
            </DialogTitle>
            <DialogDescription>控制全站内容审核流程与视觉查重灵敏度</DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* 审核配置 */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-3 h-3" /> 发布审核配置
              </h4>
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">全局审核开关</Label>
                  <p className="text-[10px] text-muted-foreground italic">开启后，所有用户上传的内容均需审核</p>
                </div>
                <Switch checked={auditConfig?.global_audit_enabled || false} onCheckedChange={(checked) => setAuditConfig(prev => ({ ...prev, global_audit_enabled: checked }))} />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">按权限组免审</Label>
                  <p className="text-[10px] text-muted-foreground italic">允许具有“免审发布”权限的用户直接发布</p>
                </div>
                <Switch checked={auditConfig?.bypass_audit_with_permission || false} onCheckedChange={(checked) => setAuditConfig(prev => ({ ...prev, bypass_audit_with_permission: checked }))} />
              </div>
            </div>

            {/* 查重配置 */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-3 h-3" /> 视觉查重灵敏度
              </h4>
              <div className="p-4 bg-muted/20 rounded-2xl border border-border/40 space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-bold">相似度判定阈值 (0-24)</Label>
                  <Badge variant="secondary" className="rounded-lg font-mono">{dedupeConfig?.similarity_threshold || 5}</Badge>
                </div>
                <Slider 
                  min={0} 
                  max={24} 
                  step={1} 
                  value={[dedupeConfig?.similarity_threshold || 5]} 
                  onValueChange={([val]) => setDedupeConfig((prev: any) => ({ ...prev, similarity_threshold: val }))} 
                />
                <div className="flex justify-between text-[9px] text-muted-foreground italic px-1">
                  <span>非常严格 (0-5)</span>
                  <span>推荐范围 (8-12)</span>
                  <span>非常宽松 (15-20)</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed bg-primary/5 p-2 rounded-lg border border-primary/10 text-primary">
                  <b>查重提示：</b> 汉明距离算法。数值越小查重越严格（只识别完全一致或极微小差异）。如果您发现图片看起来很像但没识别出来，请<b>适当调大此阈值</b>（推荐设置为 10-12）。
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Code className="w-4 h-4 text-primary" />
                    指纹扫描接口地址 (API URL)
                  </Label>
                  <Input 
                    placeholder="默认使用 Supabase Edge Function" 
                    value={dedupeConfig?.scan_api_url || ''} 
                    onChange={(e) => setDedupeConfig((prev: any) => ({ ...prev, scan_api_url: e.target.value }))}
                    className="rounded-xl bg-muted/30 border-none h-11"
                  />
                  <p className="text-[10px] text-muted-foreground italic px-1">
                    若指纹库管理扫描报错或超时，可填入部署好的 CF Worker 接口地址。留空则使用内置接口。
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">查重触发模式</Label>
                <Select value={dedupeConfig?.trigger_mode || 'on_upload'} onValueChange={(val) => setDedupeConfig((prev: any) => ({ ...prev, trigger_mode: val }))}>
                  <SelectTrigger className="rounded-xl bg-muted/30 h-11 border-none focus-visible:ring-0 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    <SelectItem value="on_upload" className="rounded-lg">上传即查重 (推荐)</SelectItem>
                    <SelectItem value="on_audit" className="rounded-lg">审核后查重</SelectItem>
                    <SelectItem value="scheduled" className="rounded-lg">仅后台扫描</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground px-1">建议保持“上传即查重”以获得最佳去重效果</p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="p-6 bg-muted/30 border-t flex flex-row items-center gap-3">
            <Button variant="ghost" onClick={() => setIsSettingsOpen(false)} className="rounded-xl flex-1 h-11">取消</Button>
            <Button onClick={handleSaveConfigs} disabled={savingSettings} className="rounded-xl flex-[2] h-11 shadow-lg shadow-primary/20">
              {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              保存设置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 极速查重清理弹窗 */}
      <Dialog open={speedyMode} onOpenChange={setSpeedyMode}>
        <DialogContent className={cn(
          "h-[90vh] flex flex-col p-0 rounded-3xl overflow-hidden border-none shadow-2xl transition-all duration-300",
          speedyItems.length === 2 ? "max-w-4xl" : 
          speedyItems.length === 3 ? "max-w-5xl" : 
          "max-w-[95vw] md:max-w-6xl lg:max-w-7xl"
        )}>
          <DialogHeader className="p-6 bg-orange-500/10 border-b border-orange-500/20">
            <div className="flex items-center justify-between w-full pr-8">
              <div>
                <DialogTitle className="flex items-center gap-2 text-orange-600">
                  <Zap className="w-5 h-5 fill-orange-500" />
                  极速查重清理模式
                </DialogTitle>
                <DialogDescription>
                  第 {currentGroupIndex + 1} / {visualDuplicates.length} 组重复素材
                  {speedyCheckedItems.length > 0 && ` (已勾选 ${speedyCheckedItems.length} 项)`}
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const sorted = [...speedyItems].sort((a, b) => 
                      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    );
                    setSpeedyCheckedItems(sorted.slice(1).map(item => item.id));
                    toast.info('已勾选除最早项外的副本');
                  }}
                  className="rounded-xl border-slate-200 hover:bg-slate-50 text-[10px] h-9"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5 opacity-50" />
                  保留最旧
                </Button>
                {speedyCheckedItems.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleSpeedyBatchDelete} className="rounded-xl shadow-lg animate-in zoom-in-95 duration-200 h-9">
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除勾选项 ({speedyCheckedItems.length})
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={handleSpeedyNotDuplicate} className="rounded-xl border-orange-200 hover:bg-orange-50 h-9 font-bold text-orange-600">
                  两者均保留
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={nextSpeedyGroup} className="rounded-xl h-9">
                  以后再处理
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
            {speedyLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                <p className="text-muted-foreground animate-pulse">正在比对相似素材...</p>
              </div>
            ) : (
              <div className={cn(
                "grid gap-8 items-start w-full mx-auto",
                speedyItems.length === 2 ? "grid-cols-1 md:grid-cols-2 max-w-5xl" : 
                speedyItems.length === 3 ? "grid-cols-1 md:grid-cols-3 max-w-6xl" : 
                "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl"
              )}>
                {speedyItems.map((item, idx) => (
                  <div key={item.id} className="flex flex-col gap-4">
                    <Card 
                      className={cn(
                        "relative overflow-hidden rounded-[2rem] border-4 transition-all group aspect-[3/4] md:aspect-[4/5] shadow-xl",
                        speedyCheckedItems.includes(item.id) ? "border-red-500 ring-8 ring-red-500/10 shadow-red-500/20 scale-[1.02]" : "border-white dark:border-slate-800 hover:border-orange-500/50 hover:shadow-orange-500/10"
                      )}
                      onClick={() => {
                        if (speedyCheckedItems.includes(item.id)) {
                          setSpeedyCheckedItems(speedyCheckedItems.filter(id => id !== item.id));
                        } else {
                          setSpeedyCheckedItems([...speedyCheckedItems, item.id]);
                        }
                      }}
                    >
                      <div className="w-full h-full bg-black/5 relative">
                        <ProtectedMedia src={item.url} type="image" className="w-full h-full object-contain" ruleKey="审核" />
                        
                        {/* 勾选状态指示器 */}
                        <div className={cn(
                          "absolute top-4 left-4 z-20 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                          speedyCheckedItems.includes(item.id) ? "bg-red-500 border-red-500 shadow-lg shadow-red-500/40" : "bg-black/20 backdrop-blur-md border-white/50"
                        )}>
                          {speedyCheckedItems.includes(item.id) && <Check className="w-5 h-5 text-white stroke-[3]" />}
                        </div>

                        {idx === 0 && (
                          <div className="absolute top-4 right-4 z-20">
                            <Badge className="bg-blue-500 text-white border-none rounded-full px-3 py-1 text-[10px] font-black shadow-lg shadow-blue-500/20 uppercase tracking-tighter">
                              最早上传 (推荐保留)
                            </Badge>
                          </div>
                        )}

                        {/* 悬浮遮罩展示 ID */}
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
                           <p className="text-[10px] font-mono opacity-60">UUID: {item.id}</p>
                        </div>
                      </div>
                    </Card>

                    {/* 独立操作区 - 始终可见 */}
                    <div className="flex flex-col gap-2 px-1">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-black truncate text-foreground">{item.profiles?.username || '未知用户'}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">{formatDate(item.created_at)}</p>
                        </div>
                        <Badge variant="outline" className="text-[9px] rounded-full px-2 h-5 bg-muted/50 border-none font-bold uppercase">
                          {item.type === 'image' ? 'IMG' : 'VIDEO'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="rounded-xl h-10 bg-muted/50 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-none transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpeedyIgnore(item.id);
                          }}
                        >
                          <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                          忽略
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="rounded-xl h-10 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-bold border-none transition-all shadow-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpeedyDelete(item.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {speedyItems.length <= 1 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
                    <CircleCheckBig className="w-16 h-16 text-green-500 opacity-20" />
                    <p className="text-lg font-bold">该组已处理完毕</p>
                    <Button onClick={nextSpeedyGroup} className="rounded-xl px-10 h-11 bg-primary text-primary-foreground shadow-xl">下一组比对</Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="p-4 bg-muted/5 border-t border-border/40 text-[10px] text-muted-foreground px-6 flex justify-between items-center sm:justify-between">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2"><div className="w-4 h-4 rounded border bg-white flex items-center justify-center"><div className="w-2 h-2 bg-red-500 rounded-sm" /></div> 勾选图片 进行批量删除</span>
              <span className="flex items-center gap-2 text-primary/80 font-bold"><EyeOff className="w-3.5 h-3.5" /> 设为独立素材 后续不再与当前副本组匹配，但会与新上传图片查重</span>
              <span className="flex items-center gap-2 text-red-500/80 font-bold"><Trash2 className="w-3.5 h-3.5" /> 直接删除 立即永久删除此副本</span>
            </div>
            <div className="text-right italic">
              提示：通常建议保留“最早上传”的项，清理多余副本以节省存储空间。
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 rounded-2xl bg-muted/50 p-1 mb-6">
              <TabsTrigger value="md5" className="rounded-xl gap-2"><CircleCheckBig className="w-4 h-4" />文件指纹</TabsTrigger>
              <TabsTrigger value="visual" className="rounded-xl gap-2"><ScanSearch className="w-4 h-4" />视觉指纹</TabsTrigger>
              <TabsTrigger value="list" className="rounded-xl gap-2"><List className="w-4 h-4" />库管理</TabsTrigger>
              <TabsTrigger value="worker" className="rounded-xl gap-2"><Code className="w-4 h-4" />Worker</TabsTrigger>
            </TabsList>

            <TabsContent value="md5" className="mt-0">
              {loading ? <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div> : 
               duplicates.length === 0 ? <Card className="rounded-3xl border-none shadow-sm"><CardContent className="py-12 flex flex-col items-center"><CircleCheckBig className="w-12 h-12 text-green-500 mb-2 opacity-20" /><p className="text-muted-foreground">未发现 MD5 重复文件</p></CardContent></Card> :
               <div className="space-y-4">
                 {duplicates.map(g => (
                   <Card key={g.file_md5} className="rounded-2xl border-none shadow-sm overflow-hidden">
                     <CardContent className="p-4 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">{g.duplicate_count}</div>
                         <div>
                           <div className="font-bold text-sm">MD5: {g.file_md5.substring(0, 16)}...</div>
                           <div className="text-[10px] text-muted-foreground mt-1">首次上传: {formatDate(g.first_upload_at)}</div>
                         </div>
                       </div>
                       <Button variant="ghost" size="sm" onClick={() => handleViewGroup(g)} className="rounded-xl">查看副本</Button>
                     </CardContent>
                   </Card>
                 ))}
               </div>}
            </TabsContent>

            <TabsContent value="visual" className="mt-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex bg-muted/50 p-1 rounded-xl border border-black/5">
                  <Button 
                    variant={visualMode === 'list' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-8 rounded-lg text-[10px] gap-2"
                    onClick={() => setVisualMode('list')}
                  >
                    <List className="w-3.5 h-3.5" />
                    列表模式
                  </Button>
                  <Button 
                    variant={visualMode === 'grid' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-8 rounded-lg text-[10px] gap-2"
                    onClick={() => setVisualMode('grid')}
                  >
                    <Grid className="w-3.5 h-3.5" />
                    图片模式
                  </Button>
                  <Button 
                    variant={visualMode === 'speedy' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-8 rounded-lg text-[10px] gap-2 text-orange-600"
                    onClick={() => {
                      setVisualMode('speedy');
                      startSpeedyMode();
                    }}
                  >
                    <Zap className="w-3.5 h-3.5 fill-orange-500" />
                    极速模式
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
                </div>
              ) : visualDuplicates.length === 0 ? (
                <Card className="rounded-3xl border-none shadow-sm">
                  <CardContent className="py-12 flex flex-col items-center">
                    <ScanSearch className="w-12 h-12 text-primary mb-2 opacity-20" />
                    <p className="text-muted-foreground">未发现视觉相似内容</p>
                  </CardContent>
                </Card>
              ) : visualMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {visualDuplicates.map(g => (
                    <Card 
                      key={g.content_hash} 
                      className="group relative overflow-hidden rounded-2xl border-none shadow-sm aspect-square cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                      onClick={() => handleViewGroup(g)}
                    >
                      <div className="w-full h-full bg-muted flex items-center justify-center overflow-hidden">
                        {g.preview_url ? (
                          <ProtectedMedia src={g.preview_url} type="image" className="w-full h-full object-contain" ruleKey="审核" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                             <ImageIcon className="w-8 h-8 text-primary/30" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                           <Badge variant="secondary" className="rounded-full px-2 py-0 h-5 text-[10px] font-black shadow-lg">{g.duplicate_count}</Badge>
                        </div>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="text-[10px] truncate font-mono">{g.content_hash.substring(0, 8)}...</div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {visualDuplicates.map(g => (
                    <Card key={g.content_hash} className="rounded-2xl border-none shadow-sm overflow-hidden">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold">{g.duplicate_count}</div>
                          <div>
                            <div className="font-bold text-sm">视觉指纹: {g.content_hash.substring(0, 16)}...</div>
                            <div className="text-[10px] text-muted-foreground mt-1">首次上传: {formatDate(g.first_upload_at)}</div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleViewGroup(g)} className="rounded-xl">查看相似项</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="list" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {['unprocessed', 'processed', 'error', 'unique'].map((t: any) => (
                    <Button key={t} variant={scanListTab === t ? 'default' : 'ghost'} size="sm" onClick={() => setScanListTab(t)} className="rounded-xl">
                      {t === 'unprocessed' ? '未处理' : t === 'processed' ? '已扫描' : t === 'error' ? '失败项' : '唯一库'}
                    </Button>
                  ))}
                </div>
                {scanListTab === 'error' && mediaList.length > 0 && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleIgnoreAllErrors} className="text-muted-foreground hover:text-primary rounded-xl h-8">
                      <CircleCheckBig className="w-3.5 h-3.5 mr-2" />
                      全部忽略
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDeleteAllErrors} className="text-destructive/60 hover:text-destructive rounded-xl h-8">
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      清空失败项
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mediaList.map(item => (
                  <Card key={item.id} className="rounded-xl border-none shadow-sm overflow-hidden">
                    <CardContent className="p-3 flex gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                        <ProtectedMedia src={item.url} type={item.type || 'image'} className="w-full h-full object-contain" ruleKey="审核" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">{item.title}</div>
                        <div className="text-[10px] text-muted-foreground mt-1 flex items-center justify-between">
                          <span>{formatDate(item.created_at)}</span>
                          <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded uppercase font-mono">
                            {item.content_hash ? item.content_hash.substring(0, 8) : '未生成'}
                          </span>
                        </div>
                        {item.dedupe_error && <div className="text-[10px] text-destructive truncate mt-0.5" title={item.dedupe_error}>{item.dedupe_error}</div>}
                        <div className="mt-2 flex gap-1 justify-end">
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary" 
                             onClick={() => handleRescanItem(item.id)} 
                             title="重新生成指纹"
                           >
                             <RefreshCw className={cn("w-3 h-3", scanning && "animate-spin")} />
                           </Button>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-7 w-7 rounded-full hover:bg-slate-100 text-muted-foreground" 
                             onClick={() => handleIgnoreItem(item.id)} 
                             title="忽略该项"
                           >
                             <CircleCheckBig className="w-3 h-3" />
                           </Button>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-7 w-7 rounded-full hover:bg-red-50 text-red-400 hover:text-red-500" 
                             onClick={() => handleDeleteItem(item.id)} 
                             title="彻底删除"
                           >
                             <Trash2 className="w-3 h-3" />
                           </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {mediaList.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-3xl">
                  <CircleCheckBig className="w-12 h-12 mb-2 opacity-10" />
                  <p className="text-sm">暂无数据</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="worker" className="mt-0">
              <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-primary" /> Cloudflare Worker 查重引擎部署
                  </CardTitle>
                  <CardDescription>
                    如果您在扫描过程中遇到超时或性能问题，可以部署独立的 CF Worker 协助处理。
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <h4 className="text-xs font-black text-primary uppercase mb-2">部署说明</h4>
                    <ol className="text-[10px] text-muted-foreground list-decimal list-inside space-y-1">
                      <li>在 Cloudflare Dashboard 创建一个新的 Worker</li>
                      <li>复制下方代码并保存</li>
                      <li>在后台存储设置中，将扫描接口地址指向该 Worker</li>
                      <li>确保 Worker 允许 CORS 跨域请求</li>
                    </ol>
                  </div>

                  <div className="relative group">
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-8 rounded-lg text-[10px]"
                        onClick={() => {
                          const code = (document.getElementById('worker-code') as HTMLTextAreaElement)?.value;
                          navigator.clipboard.writeText(code);
                          toast.success('代码已复制到剪贴板');
                        }}
                      >
                        复制全部代码
                      </Button>
                    </div>
                    <Textarea 
                      id="worker-code"
                      readOnly
                      className="h-96 font-mono text-[10px] bg-slate-900 text-slate-300 rounded-2xl p-6 border-none focus-visible:ring-0"
                      value={`/**
 * Cloudflare Worker: 视觉指纹查重扫描器
 * 配合后台「指纹扫描」功能使用，提供更稳定的性能。
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
      "Access-Control-Max-Age": "86400",
      "Access-Control-Allow-Headers": "*"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const { action, ids, limit } = await request.json();
      
      if (action === 'generate_hashes') {
        // 调用 Supabase 边缘函数或直连数据库进行指纹计算
        // 建议在这里实现具体的 dHash 算法
        const responseData = { 
          processed: ids?.length || limit || 0,
          status: 'success'
        };
        
        return new Response(JSON.stringify(responseData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response("Invalid action", { status: 400, headers: corsHeaders });
    } catch (err) {
      return new Response(err.message, { status: 500, headers: corsHeaders });
    }
  }
};`}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><ScanSearch className="w-4 h-4 text-primary" />指纹扫描</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-muted/30 rounded-2xl">
                <div className="text-2xl font-black text-primary">{pendingCount}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">待扫描项</div>
              </div>
              {stats && (
                <div className="grid grid-cols-2 gap-3 py-2 border-y border-dashed">
                  <div className="text-center">
                    <div className="text-sm font-bold">{stats.scanned_ratio}%</div>
                    <div className="text-[9px] text-muted-foreground">已扫描</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-destructive">{stats.visual_duplicates}</div>
                    <div className="text-[9px] text-muted-foreground">视觉重复项</div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">本次扫描数量限制</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[20, 50, 100, 200].map(val => (
                    <Button 
                      key={val} 
                      variant={scanLimit === val ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setScanLimit(val)}
                      className="rounded-lg text-[10px] h-8 px-0"
                    >
                      {val}
                    </Button>
                  ))}
                </div>
                <Input 
                  type="number" 
                  value={scanLimit} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScanLimit(parseInt(e.target.value) || 0)}
                  className="rounded-xl h-9 text-xs"
                  placeholder="手动输入扫描数量"
                />
              </div>
              <Button className="w-full rounded-xl h-11" onClick={handleScanContent} disabled={scanning || pendingCount === 0}>
                {scanning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                {scanning ? '正在扫描...' : '开始扫描'}
              </Button>

              {scanLogs.length > 0 && (
                <Card className="mt-4 rounded-2xl border-none shadow-sm overflow-hidden bg-zinc-950 text-zinc-400">
                  <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-bold text-zinc-100">实时扫描日志</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setScanLogs([])} className="h-5 px-1.5 text-[8px] text-zinc-500 hover:text-zinc-300 rounded-md">
                        清除
                      </Button>
                      <Badge variant="outline" className="text-[8px] h-4 border-zinc-800 text-zinc-500 font-mono px-1">
                        {scanLogs.length} L
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2">
                    <div 
                      ref={logScrollRef}
                      className="h-40 overflow-y-auto font-mono text-[9px] space-y-1 p-2 scrollbar-thin scrollbar-thumb-zinc-800"
                    >
                      {scanLogs.map((log, i) => (
                        <div key={i} className="flex gap-1.5 leading-relaxed">
                          <span className="text-zinc-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                          <span className={cn(
                            "break-all",
                            log.type === 'error' ? "text-red-400" : 
                            log.type === 'success' ? "text-emerald-400" : 
                            "text-zinc-300"
                          )}>
                            {log.message}
                          </span>
                        </div>
                      ))}
                      {scanning && (
                        <div className="flex items-center gap-2 text-primary animate-pulse py-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          <span>正在同步处理进度...</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <h3 className="font-black text-lg">查重机制说明</h3>
              <p className="text-xs opacity-80 mt-2 leading-relaxed">
                1. MD5 查重基于文件内容哈希，识别完全相同的文件。<br/>
                2. 视觉查重基于 dHash 算法，可识别缩放、格式转换后的相似图片。<br/>
                3. 重复项清理建议手动审核，避免误删。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
        <DialogContent className={cn(
          "max-h-[90vh] overflow-y-auto rounded-3xl p-6 transition-all duration-300",
          selectedGroup?.items?.length === 2 ? "max-w-3xl" : 
          selectedGroup?.items?.length === 3 ? "max-w-5xl" : 
          "max-w-6xl"
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>管理重复项</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectDuplicatesButOldest}
                className="rounded-lg h-7 text-[10px]"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                保留最旧项 (默认删除新版本)
              </Button>
            </DialogTitle>
            <DialogDescription>
              当前系统检测到 {selectedGroup?.items?.length || 0} 个内容指纹高度重叠。请手动勾选要删除的项，或点击按钮自动筛选。
            </DialogDescription>
            <DialogDescription>已选择 {selectedItems.length} 项要删除的媒体文件</DialogDescription>
          </DialogHeader>
          <div className={cn(
            "grid gap-4 mt-4",
            selectedGroup?.items?.length === 2 ? "grid-cols-1 md:grid-cols-2" : 
            selectedGroup?.items?.length === 3 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : 
            "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          )}>
            {selectedGroup?.items?.map((item: any) => (
              <div 
                key={item.id} 
                className={cn(
                  "relative group rounded-2xl overflow-hidden border-2 transition-all cursor-pointer aspect-[3/4] md:aspect-[4/5] shadow-sm",
                  selectedItems.includes(item.id) ? "border-destructive ring-4 ring-destructive/10 scale-[0.98]" : "border-white dark:border-slate-800 bg-muted hover:border-primary/50"
                )}
                onClick={() => setSelectedItems(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])}
              >
                <ProtectedMedia src={item.url} type={item.type || 'image'} className="w-full h-full object-contain" ruleKey="审核" />
                
                {/* 勾选状态指示器 */}
                <div className={cn(
                  "absolute top-2 left-2 z-10 w-6 h-6 rounded-full border flex items-center justify-center transition-all shadow-sm",
                  selectedItems.includes(item.id) ? "bg-red-500 border-red-500" : "bg-black/20 backdrop-blur-md border-white/50"
                )}>
                  {selectedItems.includes(item.id) && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </div>

                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold truncate">{item.profiles?.username || '未知'}</div>
                    <div className="text-[8px] opacity-70">{formatDate(item.created_at)}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-6 h-6 rounded-lg bg-white/20 hover:bg-white/40 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleIgnoreItem(item.id);
                      }}
                      title="忽略"
                    >
                      <EyeOff className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* 忽略按钮 - 仅在悬浮或已选时显示更多操作? 保持简单，仅勾选 */}
                {selectedItems.includes(item.id) && <div className="absolute inset-0 bg-destructive/10 pointer-events-none" />}
              </div>
            ))}
          </div>
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setSelectedGroup(null)} className="rounded-xl">取消</Button>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => {
                  if (selectedGroup?.items) {
                    const ids = selectedGroup.items.map((i: any) => i.id);
                    handleIgnoreSelected(ids);
                  }
                }} 
                disabled={deleting || !selectedGroup?.items} 
                className="rounded-xl px-4 border-primary/20 hover:bg-primary/5 hover:text-primary"
              >
                全部忽略
              </Button>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => handleIgnoreSelected()} 
                disabled={selectedItems.length === 0 || deleting} 
                className="rounded-xl px-4 border-primary/20 hover:bg-primary/5 hover:text-primary"
              >
                {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}忽略选中项
              </Button>
              <Button 
                type="button"
                variant="destructive" 
                onClick={handleDeleteSelected} 
                disabled={selectedItems.length === 0 || deleting} 
                className="rounded-xl px-4"
              >
                {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}确认删除选中项
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmConfig.open} onOpenChange={(o) => setConfirmConfig({ ...confirmConfig, open: o })}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className={cn(
              "text-xl font-black flex items-center gap-2",
              confirmConfig.variant === 'danger' ? "text-red-500" : "text-primary"
            )}>
              {confirmConfig.variant === 'danger' ? <Trash2 className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
              {confirmConfig.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium py-2">
              {confirmConfig.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-bold border-none bg-muted hover:bg-muted/80">取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmConfig.action}
              className={cn(
                "rounded-xl font-bold shadow-lg shadow-primary/20",
                confirmConfig.variant === 'danger' ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-primary hover:bg-primary/90"
              )}
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
