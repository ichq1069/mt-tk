import React, { useState, useEffect } from 'react';
import { cn, formatBeijingTime } from '@/lib/utils';
import { api } from '@/db/api';
import { 
  ImageIcon, Search, Loader2, Trash2, Calendar, 
  FolderOpen, Filter, List, Grid, Eye, Trash, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { EnhancedPagination } from '@/components/common/EnhancedPagination';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export function AlbumPhotosSection() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const limit = 30;
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, [page]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, total: count, error } = await api.getAdminAlbumPhotos(page, limit);
      if (error) throw error;
      
      const totalCount = count || 0;
      const results = data || [];

      if (results.length === 0 && totalCount > 0 && page > 0) {
        setPage(Math.max(0, Math.ceil(totalCount / limit) - 1));
        return;
      }

      setItems(results);
      setTotal(totalCount);
    } catch (error: any) {
      toast.error('加载失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    try {
      const { error } = await api.deleteAdminAlbumPhoto(id);
      if (error) throw error;
      toast.success('已删除');
      // 立即从本地列表中移除，提供即时反馈
      setItems(prev => prev.filter(item => item.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
      
      // 延迟一小会儿再刷新，确保数据库同步完成且不会因立即刷新导致看到旧数据
      setTimeout(() => {
        fetchItems();
      }, 500);
    } catch (error: any) {
      toast.error('删除失败: ' + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <FolderOpen className="w-8 h-8 text-primary" />
            </div>
            写真库管理
          </h2>
          <p className="text-slate-500 mt-1 font-medium">管理系统中所有写真集的具体内容素材</p>
        </div>
        
        <div className="flex items-center gap-2">
           <Button 
            variant={viewMode === 'grid' ? 'default' : 'outline'} 
            size="icon" 
            onClick={() => setViewMode('grid')}
            className="rounded-xl"
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'} 
            size="icon" 
            onClick={() => setViewMode('list')}
            className="rounded-xl"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-3xl p-6 bg-white/50 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="搜索图片库内容 (功能开发中)..." 
              className="pl-9 rounded-2xl border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled
            />
          </div>
          
          <div className="flex gap-2">
            <Select disabled>
              <SelectTrigger className="w-[140px] rounded-2xl border-slate-200">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="所有图集" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="all">所有图集</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setPage(0); fetchItems(); }} className="rounded-2xl gap-2 font-bold border-slate-200">
               <Loader2 className={cn("w-4 h-4", loading && "animate-spin")} />
               刷新
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-slate-400 font-bold animate-pulse">正在读取海量资源...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <ImageIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-400">库中尚无内容</h3>
            <p className="text-slate-400 text-sm mt-1">上传或整理图集即可看到它们</p>
          </div>
        ) : (
          <>
            <div className={cn(
              "grid gap-6",
              viewMode === 'grid' ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-6" : "grid-cols-1"
            )}>
              {items.map((item) => (
                <div key={item.id} className={cn(
                  "group relative overflow-hidden bg-white shadow-sm border border-slate-100 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]",
                  viewMode === 'grid' ? "rounded-3xl aspect-[3/4]" : "rounded-2xl h-24 flex items-center p-3 gap-4"
                )}>
                  <div className={cn(
                    "relative overflow-hidden bg-slate-100",
                    viewMode === 'grid' ? "w-full h-full" : "w-16 h-16 rounded-xl flex-shrink-0"
                  )}>
                    <ProtectedMedia ruleKey="后" 
                      src={item.thumbnail_url || item.url} 
                      albumId={item.album_id}
                      className="w-full h-full object-contain"
                      alt={item.photo_albums?.title}
                      isThumbnail
                      type="image"
                    />
                    {item.level && (
                      <Badge className="absolute top-2 right-2 rounded-lg bg-primary/80 backdrop-blur-sm border-none font-black text-[10px] uppercase shadow-lg">
                        {item.level}
                      </Badge>
                    )}
                  </div>

                  <div className={cn(
                    "flex-1 flex flex-col justify-between",
                    viewMode === 'grid' ? "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4" : ""
                  )}>
                    <div className={cn(viewMode === 'grid' ? "hidden" : "")}>
                       <p className="text-sm font-bold text-slate-700 truncate">{item.photo_albums?.title || '未命名图集'}</p>
                       <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatBeijingTime(item.created_at)}
                       </p>
                    </div>

                    <div className={cn(
                      "flex items-center gap-2",
                      viewMode === 'grid' ? "mt-auto" : "flex-shrink-0"
                    )}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                          "rounded-xl",
                          viewMode === 'grid' ? "bg-white/20 hover:bg-white/40 text-white" : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                        )}
                        onClick={() => window.open(item.url, '_blank')}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                          "rounded-xl",
                          viewMode === 'grid' ? "bg-white/20 hover:bg-red-500 hover:text-white text-white" : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                        )}
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {viewMode === 'grid' && (
                    <div className="absolute bottom-4 left-4 right-14 pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity">
                      <p className="text-white text-[10px] font-bold truncate opacity-80">{item.photo_albums?.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center gap-4">
              <div className="text-sm text-slate-400 font-medium">
                共计 <span className="text-primary font-black">{total}</span> 个素材
              </div>
              <EnhancedPagination currentPage={page} totalPages={Math.ceil(total / limit)} onPageChange={setPage} pageSize={limit} onPageSizeChange={() => {}} totalItems={total} showPageSizeSelector={false} className="bg-transparent border-none p-0" />
            </div>
          </>
        )}
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black flex items-center gap-3 text-red-600">
              <AlertCircle className="w-8 h-8" />
              确定彻底删除吗？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium text-base">
              此操作将从图集中移除该素材，且不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="rounded-2xl font-bold border-slate-200">考虑一下</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-2xl font-black bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200">
              确定删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}