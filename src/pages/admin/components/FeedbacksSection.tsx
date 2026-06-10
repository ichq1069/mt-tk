import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner";
import { Loader2, RefreshCcw, Eye, MessageSquare, Terminal, PlayCircle, Copy } from "lucide-react";
import { EnhancedPagination } from '@/components/common/EnhancedPagination';
import { SessionPlayer } from '@/components/common/SessionPlayer';
import { format } from 'date-fns';

export function FeedbacksSection() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [recording, setRecording] = useState<any>(null);
  const [loadingRecording, setLoadingRecording] = useState(false);

  useEffect(() => {
    if (selectedFeedback?.recording_id) {
      fetchRecording(selectedFeedback.recording_id);
    } else {
      setRecording(null);
    }
  }, [selectedFeedback]);

  const fetchRecording = async (id: string) => {
    setLoadingRecording(true);
    try {
      const { data, error } = await api.supabase
        .from('user_session_recordings')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      setRecording(data);
    } catch (e: any) {
      console.error('Failed to fetch recording:', e);
    } finally {
      setLoadingRecording(false);
    }
  };

  const handleCopyLogs = (logs: any[]) => {
    if (!logs || logs.length === 0) return;
    const text = logs.map(log => {
      const time = format(new Date(log.timestamp), 'HH:mm:ss.SSS');
      const type = (log.type || 'LOG').toUpperCase();
      const content = log.content || (log.url ? `图片加载: ${log.url} (${log.isThumbnail ? '缩略图' : '原图'})` : JSON.stringify(log));
      return `[${time}] [${type}] ${content}`;
    }).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      toast.success('日志已复制到剪贴板');
    });
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [page, limit]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const { data, count, error } = await api.supabase
        .from('user_feedbacks')
        .select('*, profiles(username)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);
      
      if (error) throw error;
      setFeedbacks(data || []);
      setTotal(count || 0);
    } catch (e: any) {
      toast.error('获取反馈失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">用户反馈中心</h2>
          <p className="text-sm text-muted-foreground">查看用户提交的问题反馈及调试日志</p>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={fetchFeedbacks} 
          disabled={loading}
          className="rounded-xl h-10 w-10"
        >
          <RefreshCcw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>反馈时间</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>内容摘要</TableHead>
              <TableHead>日志数量</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell>
              </TableRow>
            ) : feedbacks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">暂无反馈记录</TableCell>
              </TableRow>
            ) : (
              feedbacks.map((f) => (
                <TableRow key={f.id} className="hover:bg-muted/5">
                  <TableCell className="text-xs font-mono">{format(new Date(f.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{f.profiles?.username || '匿名用户'}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{f.metadata?.ua || ''}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-medium">{f.content}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
                      {f.logs?.length || 0} 条
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="rounded-lg h-8 gap-2"
                      onClick={() => setSelectedFeedback(f)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      查看详情
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="p-4 border-t">
          <EnhancedPagination
            currentPage={page}
            totalPages={Math.ceil(total / limit)}
            onPageChange={setPage}
            pageSize={limit}
            onPageSizeChange={setLimit}
            totalItems={total}
          />
        </div>
      </Card>

      <Dialog open={!!selectedFeedback} onOpenChange={(o) => !o && setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl rounded-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              反馈详情
            </DialogTitle>
            <DialogDescription>
              用户于 {selectedFeedback && format(new Date(selectedFeedback.created_at), 'yyyy-MM-dd HH:mm:ss')} 提交
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6">
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">问题描述</h4>
              <div className="p-4 bg-muted/30 rounded-2xl text-sm leading-relaxed border border-muted">
                {selectedFeedback?.content}
              </div>
            </div>

            {selectedFeedback?.recording_id && (
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <PlayCircle className="w-3 h-3 text-rose-500" />
                  会话重放
                </h4>
                {loadingRecording ? (
                  <div className="h-40 flex flex-col items-center justify-center bg-muted/20 rounded-2xl gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-[10px] text-muted-foreground">正在加载录像数据...</span>
                  </div>
                ) : recording?.events ? (
                  <SessionPlayer events={recording.events} />
                ) : (
                  <div className="h-40 flex items-center justify-center bg-muted/20 rounded-2xl text-muted-foreground text-xs">
                    未找到录像数据或数据已失效
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">当前页面</p>
                <p className="text-xs truncate font-mono bg-muted/20 p-1 rounded" title={selectedFeedback?.page_url}>
                  {selectedFeedback?.page_url || '未知'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">设备信息</p>
                <p className="text-xs truncate font-mono bg-muted/20 p-1 rounded" title={selectedFeedback?.metadata?.ua}>
                  {selectedFeedback?.metadata?.ua || '未知'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Terminal className="w-3 h-3" />
                  调试日志 ({selectedFeedback?.logs?.length || 0})
                </h4>
                {selectedFeedback?.logs?.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[10px] gap-1 rounded-lg"
                    onClick={() => handleCopyLogs(selectedFeedback.logs)}
                  >
                    <Copy className="w-3 h-3" />
                    复制日志
                  </Button>
                )}
              </div>
              <div className="bg-slate-950 rounded-2xl p-4 font-mono text-[10px] text-slate-300 overflow-x-auto space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                {selectedFeedback?.logs && selectedFeedback.logs.length > 0 ? (
                  selectedFeedback.logs.map((log: any, i: number) => (
                    <div key={i} className="flex gap-2 border-b border-white/5 pb-1">
                      <span className="text-slate-600 shrink-0">{format(new Date(log.timestamp), 'HH:mm:ss.SSS')}</span>
                      <span className={
                        log.type === 'error' ? 'text-red-400' : 
                        log.type === 'warn' ? 'text-amber-400' : 
                        log.type === 'info' ? 'text-blue-400' :
                        'text-slate-400'
                      }>{(log.type || 'LOG').toUpperCase()}</span>
                      <span className="break-all">
                        {log.content || (log.url ? `图片加载: ${log.url} (${log.isThumbnail ? '缩略图' : '原图'})` : JSON.stringify(log))}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-600 text-center py-4">无日志内容</div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setSelectedFeedback(null)}>关闭窗口</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
