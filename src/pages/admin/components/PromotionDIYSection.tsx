import React, { useState, useEffect } from 'react';
import { cn, formatBeijingTime } from '@/lib/utils';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Globe, 
  Layout, 
  Smartphone,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  Settings,
  Share2
} from "lucide-react";
import { toast } from 'sonner';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
import { PromotionEditor } from './PromotionEditor';

export function PromotionDIYSection() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getPromotionPages();
      if (error) throw error;
      setPages(data || []);
    } catch (error: any) {
      toast.error('获取宣传页列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const newPage = {
        title: '未命名宣传页',
        content: [],
        config: {
          backgroundColor: '#f8fafc',
          padding: 16
        },
        is_published: false
      };
      const { data, error } = await api.createPromotionPage(newPage);
      if (error) throw error;
      toast.success('宣传页创建成功');
      setPages([data, ...pages]);
      handleEdit(data);
    } catch (error: any) {
      toast.error('创建失败: ' + error.message);
    }
  };

  const handleEdit = (page: any) => {
    setCurrentPage(page);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await api.deletePromotionPage(itemToDelete);
      if (error) throw error;
      toast.success('删除成功');
      setPages(pages.filter(p => p.id !== itemToDelete));
    } catch (error: any) {
      toast.error('删除失败: ' + error.message);
    } finally {
      setItemToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleTogglePublish = async (page: any) => {
    try {
      const { data, error } = await api.updatePromotionPage(page.id, { 
        is_published: !page.is_published 
      });
      if (error) throw error;
      toast.success(data.is_published ? '已发布' : '已下架');
      setPages(pages.map(p => p.id === page.id ? data : p));
    } catch (error: any) {
      toast.error('操作失败: ' + error.message);
    }
  };

  const copyLink = (page: any) => {
    const url = `${window.location.origin}/promotion/${page.id}`;
    navigator.clipboard.writeText(url);
    toast.success('链接已复制到剪贴板');
  };

  if (isEditing && currentPage) {
    return (
      <PromotionEditor 
        page={currentPage} 
        onBack={() => {
          setIsEditing(false);
          setCurrentPage(null);
          fetchPages();
        }} 
      />
    );
  }

  const filteredPages = pages.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Layout className="w-6 h-6 text-primary" />
            宣传页 DIY
          </h2>
          <p className="text-sm text-muted-foreground mt-1">可视化拖拽编辑，打造个性化移动端宣传页面</p>
        </div>
        <Button onClick={handleCreate} className="rounded-xl font-bold px-6 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" />
          新建宣传页
        </Button>
      </div>

      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="搜索宣传页名称..." 
          className="pl-10 h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p>加载中...</p>
        </div>
      ) : filteredPages.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Layout className="w-16 h-16 opacity-20 mb-4" />
            <p>暂无宣传页，点击右上方“新建”开始创作吧</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPages.map(page => (
            <Card key={page.id} className="group overflow-hidden rounded-3xl border-none shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
              <div className="aspect-[16/9] bg-slate-100 relative overflow-hidden flex items-center justify-center">
                {/* 预览占位 */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/20 flex flex-col items-center justify-center p-6 text-center">
                  <Smartphone className="w-12 h-12 text-primary/40 mb-2" />
                  <span className="text-[10px] text-primary/40 font-bold uppercase tracking-widest">H5 Preview</span>
                </div>
                
                <div className="absolute top-3 right-3">
                  <Badge className={cn(
                    "rounded-full px-3 font-black",
                    page.is_published ? "bg-green-500 hover:bg-green-600" : "bg-slate-500 hover:bg-slate-600"
                  )}>
                    {page.is_published ? '已发布' : '草稿'}
                  </Badge>
                </div>

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <Button variant="secondary" className="w-10 h-10 rounded-full shadow-xl bg-white/90 hover:bg-white text-primary" onClick={() => handleEdit(page)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="secondary" className="w-10 h-10 rounded-full shadow-xl bg-white/90 hover:bg-white text-primary" onClick={() => copyLink(page)}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button variant="secondary" className="w-10 h-10 rounded-full shadow-xl bg-white/90 hover:bg-white text-primary" onClick={() => window.open(`/promotion/${page.id}`, '_blank')}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <CardHeader className="p-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-lg font-black truncate">{page.title}</CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1 mt-1">
                      <Globe className="w-3 h-3" />
                      最后更新: {formatBeijingTime(page.updated_at)}
                    </CardDescription>
                  </div>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl w-48">
                      <DropdownMenuLabel>管理选项</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleEdit(page)}>
                        <Edit2 className="w-3.5 h-3.5 mr-2" /> 编辑内容
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTogglePublish(page)}>
                        {page.is_published ? (
                          <><XCircle className="w-3.5 h-3.5 mr-2 text-orange-500" /> 取消发布</>
                        ) : (
                          <><CheckCircle2 className="w-3.5 h-3.5 mr-2 text-green-500" /> 发布上线</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyLink(page)}>
                        <Copy className="w-3.5 h-3.5 mr-2" /> 复制页面链接
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-50" onClick={() => handleDelete(page.id)}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> 删除页面
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black flex items-center gap-2 text-red-500">
              <Trash2 className="w-5 h-5" />
              确定要删除吗？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium py-2">
              确定要删除这个宣传页吗？删除后不可恢复，所有关联的链接都将失效。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-bold border-none bg-muted hover:bg-muted/80">取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="rounded-xl font-bold bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
