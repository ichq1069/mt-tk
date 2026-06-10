import React, { useState, useEffect } from 'react';
import { formatBeijingTime } from '@/lib/utils';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { MediaItem, ContentCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, RotateCcw, ImageIcon, Video, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';

export function CategoryContentSection() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('all');
  const [viewType, setViewType] = useState<'classified' | 'unclassified'>('classified');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [selectedCatId]);

  useEffect(() => {
    fetchData();
  }, [page, selectedCatId, viewType]);

  const fetchCategories = async () => {
    const { data } = await api.getContentCategories();
    setCategories(data || []);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let result;
      if (viewType === 'classified') {
        result = await api.getClassifiedMedia(page, 15, selectedCatId, search);
      } else {
        result = await api.getUnclassifiedMedia(page, 15, search);
      }
      
      const { data, total, error } = result;
      if (error) throw error;
      setItems(data || []);
      setTotal(total || 0);
    } catch (error: any) {
      toast.error(`获取数据失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchData();
  };

  const handleRevoke = async (id: string) => {
    const confirmed = await confirmAsync('确定要撤销该内容的分类吗？撤销后内容将回到未分类区域。', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { error } = await api.updateMediaCategory(id, null, user?.id);
      if (error) throw error;
      toast.success('已撤销分类');
      fetchData();
    } catch (error: any) {
      toast.error('操作失败');
    }
  };

  const handleReclassify = async (id: string, newCatId: string) => {
    try {
      const { error } = await api.updateMediaCategory(id, newCatId, user?.id);
      if (error) throw error;
      toast.success('已重选分类');
      fetchData();
    } catch (error: any) {
      toast.error('操作失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-black">分类内容管理</h2>
          <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-xl w-fit">
            <Button
              variant={viewType === 'classified' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-lg text-xs h-8 px-4"
              onClick={() => { setViewType('classified'); setPage(0); }}
            >
              已分类区域
            </Button>
            <Button
              variant={viewType === 'unclassified' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-lg text-xs h-8 px-4"
              onClick={() => { setViewType('unclassified'); setPage(0); }}
            >
              未分类区域
            </Button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          {viewType === 'classified' && (
            <Select value={selectedCatId} onValueChange={setSelectedCatId}>
              <SelectTrigger className="w-[150px] rounded-xl">
                <SelectValue placeholder="所有分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有分类</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="搜索标题..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-[200px] rounded-xl"
            />
          </div>
          <Button type="submit" className="rounded-xl">搜索</Button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[80px]">预览</TableHead>
                <TableHead>基本信息</TableHead>
                <TableHead>当前分类</TableHead>
                <TableHead>分类人</TableHead>
                <TableHead>分类时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="w-12 h-12 rounded-lg overflow-hidden border bg-muted flex items-center justify-center relative">
                      {item.type === 'video' ? (
                        <>
                          <video referrerPolicy="no-referrer" 
                            src={item.url} 
                            className="w-full h-full object-contain" 
                            {...({ referrerPolicy: "no-referrer" } as any)}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Video className="w-4 h-4 text-white" />
                          </div>
                        </>
                      ) : (
                        <ProtectedMedia src={item.url} type="image" className="w-full h-full object-contain" ruleKey="审核" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-sm line-clamp-1">{item.title || '无标题'}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.type === 'video' ? '视频' : '图片'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 rounded-lg">
                      {item.content_categories?.name || '未分类'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.classifier?.username || '系统'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.classified_at ? formatBeijingTime(item.classified_at) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Select onValueChange={(val) => handleReclassify(item.id, val)}>
                        <SelectTrigger className="w-[110px] h-8 text-[11px] rounded-lg">
                          <SelectValue placeholder="修改分类" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-[11px]"
                        onClick={() => handleRevoke(item.id)}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        撤销
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                    暂无{viewType === 'classified' ? '已分类' : '未分类'}的数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {total > 15 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button 
            variant="outline" 
            disabled={page === 0} 
            onClick={() => setPage(p => p - 1)}
            className="rounded-xl h-9"
          >
            上一页
          </Button>
          <span className="text-sm font-medium px-4">第 {page + 1} 页</span>
          <Button 
            variant="outline" 
            disabled={(page + 1) * 15 >= total} 
            onClick={() => setPage(p => p + 1)}
            className="rounded-xl h-9"
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
