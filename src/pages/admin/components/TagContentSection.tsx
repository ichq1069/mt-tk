import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { MediaItem, Tag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatBeijingTime, cn } from '@/lib/utils';
import { Loader2, Search, ImageIcon, Video, Tag as TagIcon, X } from 'lucide-react';
import { toast } from 'sonner';

export function TagContentSection() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedTagId, setSelectedTagId] = useState('all');
  const [viewType, setViewType] = useState<'tagged' | 'untagged'>('tagged');

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, selectedTagId, viewType]);

  const fetchTags = async () => {
    const { data } = await api.getTags();
    setTags(data || []);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let result;
      if (viewType === 'tagged') {
        result = await api.getTaggedMedia(page, 15, selectedTagId, search);
      } else {
        result = await api.getUntaggedMedia(page, 15, search);
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

  const handleAddTag = async (mediaId: string, tagId: string) => {
    try {
      // 获取当前标签
      const item = items.find(i => i.id === mediaId);
      const currentTags = item?.media_tags?.map((mt: any) => mt.tag_id) || [];
      if (currentTags.includes(tagId)) return;
      
      const newTagIds = [...currentTags, tagId];
      const { error } = await api.updateMediaTags(mediaId, newTagIds);
      if (error) throw error;
      toast.success('已添加标签');
      fetchData();
    } catch (error: any) {
      toast.error('操作失败');
    }
  };

  const handleRemoveTag = async (mediaId: string, tagId: string) => {
    try {
      const item = items.find(i => i.id === mediaId);
      const currentTags = item?.media_tags?.map((mt: any) => mt.tag_id) || [];
      const newTagIds = currentTags.filter((id: string) => id !== tagId);
      
      const { error } = await api.updateMediaTags(mediaId, newTagIds);
      if (error) throw error;
      toast.success('已移除标签');
      fetchData();
    } catch (error: any) {
      toast.error('操作失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-black">标签内容管理</h2>
          <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-xl w-fit">
            <Button
              variant={viewType === 'tagged' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-lg text-xs h-8 px-4"
              onClick={() => { setViewType('tagged'); setPage(0); }}
            >
              已打标签区域
            </Button>
            <Button
              variant={viewType === 'untagged' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-lg text-xs h-8 px-4"
              onClick={() => { setViewType('untagged'); setPage(0); }}
            >
              未打标签区域
            </Button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          {viewType === 'tagged' && (
            <Select value={selectedTagId} onValueChange={setSelectedTagId}>
              <SelectTrigger className="w-[150px] rounded-xl">
                <SelectValue placeholder="所有标签" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有标签</SelectItem>
                {tags.map(tag => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name} {(tag.name.includes('不入') || tag.is_visible === false) && '🔒'}
                  </SelectItem>
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
                <TableHead>当前标签</TableHead>
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
                        <img referrerPolicy="no-referrer" src={item.url} className="w-full h-full object-contain" />
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
                    <div className="flex flex-wrap gap-1 max-w-[300px]">
                      {item.media_tags?.map((mt: any) => (
                        <Badge 
                          key={mt.tag_id} 
                          variant="secondary" 
                          className={cn(
                            "text-[10px] h-5 gap-1 pr-1 group",
                            mt.tags?.name?.includes('不入') ? "bg-amber-100 text-amber-700 border-amber-200" : ""
                          )}
                        >
                          {mt.tags?.name || '未知'}
                          <X 
                            className="w-2.5 h-2.5 cursor-pointer opacity-50 hover:opacity-100" 
                            onClick={() => handleRemoveTag(item.id, mt.tag_id)}
                          />
                        </Badge>
                      ))}
                      {(!item.media_tags || item.media_tags.length === 0) && (
                        <span className="text-xs text-muted-foreground italic">无标签</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Select onValueChange={(val) => handleAddTag(item.id, val)}>
                        <SelectTrigger className="w-[110px] h-8 text-[11px] rounded-lg">
                          <SelectValue placeholder="添加标签" />
                        </SelectTrigger>
                        <SelectContent>
                          {tags.map(tag => (
                            <SelectItem key={tag.id} value={tag.id}>
                              {tag.name} {(tag.name.includes('不入') || tag.is_visible === false) && '🔒'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                    暂无{viewType === 'tagged' ? '已打标签' : '未打标签'}的数据
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
