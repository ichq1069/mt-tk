import React, { useState, useEffect } from 'react';
import { cn, formatBeijingTime } from '@/lib/utils';
import { 
  RefreshCcw, 
  Trash2, 
  Search, 
  Globe, 
  Database, 
  Clock, 
  BarChart3, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckSquare,
  Square
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { api } from '@/db/api';
import type { StorageConfig } from '@/types';

export function ProxyCacheSection() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [cacheItems, setCacheItems] = useState<any[]>([]);
  const [config, setConfig] = useState<Partial<StorageConfig>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  useEffect(() => {
    fetchConfig();
    fetchCacheItems();
  }, [page, searchQuery]);

  const fetchConfig = async () => {
    const { data } = await api.getStorageConfig();
    if (data) setConfig(data);
  };

  const fetchCacheItems = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('proxy_cache_items')
        .select('*', { count: 'exact' });

      if (searchQuery) {
        query = query.or(`key.ilike.%${searchQuery}%,original_url.ilike.%${searchQuery}%`);
      }

      const { data, count, error } = await query
        .order('last_accessed_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      setCacheItems(data || []);
      setTotal(count || 0);
    } catch (e: any) {
      toast.error('获取缓存列表失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncWithWorker = async () => {
    if (!config.image_proxy_url || !config.image_proxy_secret) {
      toast.error('请先在存储设置中配置代理地址和密钥');
      return;
    }

    setSyncing(true);
    try {
      const baseUrl = config.image_proxy_url.split('?')[0].replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/list?secret=${config.image_proxy_secret}`);
      const data = await response.json();

      if (data.success && Array.isArray(data.list)) {
        // 批量同步到数据库
        const items = data.list.map((item: any) => ({
          key: item.key,
          size: item.size,
          upload_time: item.time,
          original_url: item.yuanurl || item.customMetadata?.yuanurl || null,
          last_accessed_at: new Date().toISOString()
        }));

        // 分批 upsert 避免请求过大
        const batchSize = 100;
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          const { error } = await supabase
            .from('proxy_cache_items')
            .upsert(batch, { onConflict: 'key' });
          if (error) throw error;
        }

        toast.success(`同步完成，共更新 ${data.list.length} 条记录`);
        fetchCacheItems();
      } else {
        throw new Error(data.error || 'Worker 接口返回异常');
      }
    } catch (e: any) {
      toast.error('同步失败: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const deleteCache = async (key: string) => {
    if (!confirm('确定要删除此缓存吗？这也会尝试同步删除 Worker 上的文件。')) return;
    
    try {
      // 1. 从 Worker 删除
      if (config.image_proxy_url && config.image_proxy_secret) {
        const baseUrl = config.image_proxy_url.split('?')[0].replace(/\/$/, '');
        await fetch(`${baseUrl}/delete?secret=${config.image_proxy_secret}&key=${key}`).catch(console.warn);
      }

      // 2. 从数据库删除
      const { error } = await supabase
        .from('proxy_cache_items')
        .delete()
        .eq('key', key);

      if (error) throw error;
      toast.success('删除成功');
      setSelectedKeys(prev => prev.filter(k => k !== key));
      fetchCacheItems();
    } catch (e: any) {
      toast.error('删除失败: ' + e.message);
    }
  };

  const deleteSelected = async () => {
    if (selectedKeys.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedKeys.length} 个缓存吗？这也会尝试同步删除 Worker 上的文件。`)) return;

    try {
      // 1. 从 Worker 删除 (由于通常没有批量接口，循环删除或由 Worker 端未来支持)
      if (config.image_proxy_url && config.image_proxy_secret) {
        const baseUrl = config.image_proxy_url.split('?')[0].replace(/\/$/, '');
        // 并行删除以提高速度，但也要注意限制并发
        await Promise.all(selectedKeys.map(key => 
          fetch(`${baseUrl}/delete?secret=${config.image_proxy_secret}&key=${key}`).catch(console.warn)
        ));
      }

      // 2. 从数据库批量删除
      const { error } = await supabase
        .from('proxy_cache_items')
        .delete()
        .in('key', selectedKeys);

      if (error) throw error;
      toast.success('批量删除成功');
      setSelectedKeys([]);
      fetchCacheItems();
    } catch (e: any) {
      toast.error('批量删除失败: ' + e.message);
    }
  };

  const deleteAllCache = async () => {
    if (!confirm('确定要删除全部缓存吗？这也会尝试清空 Worker 上的所有缓存文件。此操作不可逆！')) return;
    
    setLoading(true);
    try {
      // 1. 从 Worker 删除 (调用全部清理接口，如果 Worker 支持)
      if (config.image_proxy_url && config.image_proxy_secret) {
        const baseUrl = config.image_proxy_url.split('?')[0].replace(/\/$/, '');
        await fetch(`${baseUrl}/purge?secret=${config.image_proxy_secret}`).catch(console.warn);
      }

      // 2. 从数据库删除全部
      const { error } = await supabase
        .from('proxy_cache_items')
        .delete()
        .neq('key', 'INTERNAL_KEEP_ALIVE'); // 实际上就是全选，supabase delete 必须带 filter

      if (error) throw error;
      toast.success('全部缓存已清空');
      setSelectedKeys([]);
      fetchCacheItems();
    } catch (e: any) {
      toast.error('清空失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedKeys.length === cacheItems.length) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(cacheItems.map(item => item.key));
    }
  };

  const toggleSelect = (key: string) => {
    setSelectedKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const calculateHitRate = (hit: number, miss: number) => {
    const total = hit + miss;
    if (total === 0) return '0%';
    return Math.round((hit / total) * 100) + '%';
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">代理缓存管理</h2>
          <p className="text-sm text-muted-foreground mt-1">管理 R2 存储桶中的代理缓存文件，监控命中率与存储占用</p>
        </div>
        <div className="flex gap-3">
          {selectedKeys.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={deleteSelected}
              className="rounded-xl font-bold"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除选中 ({selectedKeys.length})
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={deleteAllCache} 
            className="rounded-xl font-bold text-destructive hover:bg-destructive/10 border-destructive/20"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            全部删除
          </Button>
          <Button 
            onClick={handleSyncWithWorker} 
            disabled={syncing}
            className="rounded-xl font-bold"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
            同步 Worker 列表
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm rounded-3xl bg-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-wider text-primary/60">总缓存文件</CardDescription>
            <CardTitle className="text-2xl font-black text-primary">{total}</CardTitle>
          </CardHeader>
        </Card>
        {/* 可以在这里增加更多汇总统计 */}
      </div>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/30 pb-6 border-b border-border/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="搜索 Key 或 原始地址..." 
                className="pl-10 rounded-xl bg-white border-border/50"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead className="w-10 pl-4">
                    <Checkbox 
                      checked={cacheItems.length > 0 && selectedKeys.length === cacheItems.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[120px]">Key</TableHead>
                  <TableHead>大小</TableHead>
                  <TableHead>上传时间</TableHead>
                  <TableHead className="max-w-[300px]">原始地址 (Metadata)</TableHead>
                  <TableHead>命中次数</TableHead>
                  <TableHead>命中率</TableHead>
                  <TableHead className="text-right pr-4">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : cacheItems.map((item) => (
                  <TableRow key={item.key} className={cn("group hover:bg-muted/5 transition-colors", selectedKeys.includes(item.key) && "bg-primary/5")}>
                    <TableCell className="pl-4">
                      <Checkbox 
                        checked={selectedKeys.includes(item.key)}
                        onCheckedChange={() => toggleSelect(item.key)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-[10px] font-bold">
                      <div className="flex items-center gap-1">
                        <Database className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate max-w-[100px]" title={item.key}>{item.key}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{formatSize(item.size)}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {item.upload_time ? formatBeijingTime(item.upload_time) : '-'}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      {item.original_url ? (
                        <div className="flex items-center gap-1 text-[10px] text-primary hover:underline truncate">
                          <Globe className="w-3 h-3 shrink-0" />
                          <a href={item.original_url} target="_blank" rel="noreferrer" className="truncate" title={decodeURIComponent(item.original_url)}>
                            {decodeURIComponent(item.original_url)}
                          </a>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">暂无记录 (等待访问)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-center">
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                        {item.hit_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: calculateHitRate(item.hit_count, item.miss_count) }}
                          />
                        </div>
                        <span className="font-bold">{calculateHitRate(item.hit_count, item.miss_count)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                        onClick={() => deleteCache(item.key)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && cacheItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                      未找到任何缓存记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {total > pageSize && (
            <div className="p-4 border-t border-border/50 flex items-center justify-between bg-muted/5">
              <p className="text-[10px] text-muted-foreground">共 {total} 条记录</p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="h-8 rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-bold px-3">第 {page + 1} 页</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={(page + 1) * pageSize >= total}
                  onClick={() => setPage(p => p + 1)}
                  className="h-8 rounded-xl"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
