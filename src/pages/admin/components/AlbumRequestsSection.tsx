import React, { useState, useEffect } from 'react';
import { formatBeijingTime } from '@/lib/utils';
import { supabase } from '@/db/supabase';
import { mediaSocialApi } from '@/db/media_social_api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, CheckCircle2, XCircle, Search, Clock, Key, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export function AlbumRequestsSection() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const limit = 20;

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, total: count } = await mediaSocialApi.getAlbumAccessRequests(page, limit, status);
      setRequests(data || []);
      setTotal(count || 0);
    } catch (error: any) {
      toast.error('获取申请记录失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, status]);

  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected', level?: string) => {
    const loadingToast = toast.loading('正在处理申请...');
    try {
      const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'approved') updates.approved_level = level || 'pt';
      
      const { error } = await mediaSocialApi.updateAlbumAccessRequest(id, updates);
      if (error) throw error;
      
      toast.success('处理成功', { id: loadingToast });
      fetchRequests();
    } catch (error: any) {
      toast.error('处理失败: ' + error.message, { id: loadingToast });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Key className="w-8 h-8 text-primary" /> 图集权限申请
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            审核用户对于私密图集的访问权限申请
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 rounded-lg">待处理: {total}</Badge>
          <Button variant="outline" size="sm" onClick={fetchRequests} className="rounded-xl">
            刷新
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-card/50 backdrop-blur-xl">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl w-fit">
              <Button 
                variant={status === 'pending' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => { setStatus('pending'); setPage(0); }}
                className="rounded-lg h-8 px-4 text-xs font-bold"
              >
                待处理
              </Button>
              <Button 
                variant={status === 'approved' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => { setStatus('approved'); setPage(0); }}
                className="rounded-lg h-8 px-4 text-xs font-bold"
              >
                已通过
              </Button>
              <Button 
                variant={status === 'rejected' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => { setStatus('rejected'); setPage(0); }}
                className="rounded-lg h-8 px-4 text-xs font-bold"
              >
                已拒绝
              </Button>
              <Button 
                variant={status === 'all' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => { setStatus('all'); setPage(0); }}
                className="rounded-lg h-8 px-4 text-xs font-bold"
              >
                全部
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="font-bold py-4">申请人</TableHead>
                <TableHead className="font-bold py-4">目标图集</TableHead>
                <TableHead className="font-bold py-4">申请原因</TableHead>
                <TableHead className="font-bold py-4">申请时间</TableHead>
                <TableHead className="font-bold py-4">状态</TableHead>
                <TableHead className="font-bold py-4 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary/40" />
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground font-bold">
                    暂无相关申请记录
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id} className="hover:bg-muted/20 border-border/40 transition-colors group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden border border-primary/20">
                          {req.profiles?.avatar_url ? (
                            <img referrerPolicy="no-referrer" src={req.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary font-black text-xs uppercase">
                              {req.profiles?.username?.[0] || '?'}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs">{req.profiles?.username || '未知用户'}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{req.user_id?.slice(0, 8)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col max-w-[200px]">
                        <span className="font-bold text-xs truncate">{req.photo_albums?.title || '未知图集'}</span>
                        <span className="text-[10px] text-muted-foreground truncate font-mono">{req.album_id?.slice(0, 8)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground line-clamp-2 max-w-[300px]">
                        {req.reason || '未填写原因'}
                      </div>
                      {req.attachment_url && (
                        <a href={req.attachment_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-1">
                          查看附件
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {formatBeijingTime(req.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {req.status === 'pending' && <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 text-[10px] font-bold">待处理</Badge>}
                      {req.status === 'approved' && <Badge className="bg-green-500/10 text-green-600 border-green-200 text-[10px] font-bold">已通过 ({req.approved_level})</Badge>}
                      {req.status === 'rejected' && <Badge className="bg-red-500/10 text-red-600 border-red-200 text-[10px] font-bold">已拒绝</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Select onValueChange={(val) => handleUpdateStatus(req.id, 'approved', val)}>
                            <SelectTrigger className="h-8 w-24 rounded-lg text-xs font-bold border-green-200 text-green-600 hover:bg-green-50 transition-all">
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>通过</span>
                              </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="pt">普通级 (pt)</SelectItem>
                              <SelectItem value="vip">VIP级 (vip)</SelectItem>
                              <SelectItem value="svip">SVIP级 (svip)</SelectItem>
                              <SelectItem value="vvip">VVIP级 (vvip)</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleUpdateStatus(req.id, 'rejected')}
                            className="h-8 rounded-lg text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            拒绝
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">已于 {formatBeijingTime(req.updated_at || req.created_at)} 处理</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
