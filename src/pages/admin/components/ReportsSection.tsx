import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import type { Report, ReportStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { Loader2, Search, X, RefreshCcw } from "lucide-react";
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { UserText } from '@/components/common/KeywordText';
import { EnhancedPagination } from '@/components/common/EnhancedPagination';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';

export function ReportsSection({ onAction }: { onAction?: () => void }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const { logAction } = useAdminLogger('reports');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('pending');
  const [handlingId, setHandlingId] = useState<string | null>(null);
  const [handlingResult, setHandlingResult] = useState('');
  const [handlingPunishment, setHandlingPunishment] = useState('');
  const [handlingStatus, setHandlingStatus] = useState<ReportStatus>('resolved');
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter, limit]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, total: t, error } = await api.getReports(page, limit, statusFilter === 'all' ? undefined : statusFilter);
      if (error) throw error;
      
      const results = Array.isArray(data) ? data : [];
      if (results.length === 0 && page > 0 && (t || 0) > 0) {
        setPage(Math.max(0, Math.ceil((t || 0) / limit) - 1));
        return;
      }
      
      setReports(results);
      setTotal(t || 0);
    } catch (e: any) {
      toast.error('获取举报列表失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReport = async () => {
    if (!handlingId) return;
    try {
      const { error } = await api.updateReportStatus(handlingId, handlingStatus, handlingResult, handlingPunishment);
      if (error) throw error;
      toast.success('处理成功');
      setHandlingId(null);
      fetchReports();
      onAction?.();
    } catch (e: any) {
      toast.error('操作失败: ' + e.message);
    }
  };

  const openHandlingDialog = (report: Report) => {
    setHandlingId(report.id);
    setHandlingStatus(report.status === 'pending' ? 'resolved' : report.status);
    setHandlingResult(report.result || '');
    setHandlingPunishment(report.punishment || '');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">举报投诉管理</h2>
          <p className="text-sm text-muted-foreground">处理用户提交的内容违规举报</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[150px] rounded-xl">
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待处理</SelectItem>
              <SelectItem value="resolved">已解决</SelectItem>
              <SelectItem value="dismissed">已驳回</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchReports} 
            disabled={loading}
            className="rounded-xl h-10 w-10"
            title="刷新记录"
          >
            <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : reports.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">暂无举报记录</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>内容预览</TableHead>
                    <TableHead>标题</TableHead>
                    <TableHead>原因</TableHead>
                    <TableHead>举报人</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                          <ProtectedMedia 
                            src={report.media_items?.thumbnail_url || report.media_items?.url} 
                            type="image"
                            alt="" 
                            className="w-full h-full object-contain" 
                            ruleKey="后"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">{report.media_items?.title || '无标题'}</TableCell>
                      <TableCell className="max-w-[200px] truncate"><UserText>{report.reason || ''}</UserText></TableCell>
                      <TableCell>{report.profiles?.username || '未知'}</TableCell>
                      <TableCell>
                        <Badge variant={report.status === 'pending' ? 'outline' : 'default'} className={cn(report.status === 'pending' ? "text-amber-500 bg-amber-50" : "text-green-500 bg-green-50")}>
                          {report.status === 'pending' ? '待处理' : report.status === 'resolved' ? '已解决' : '已驳回'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openHandlingDialog(report)}>处理</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <EnhancedPagination
              currentPage={page}
              totalPages={Math.ceil(total / limit)}
              onPageChange={setPage}
              pageSize={limit}
              onPageSizeChange={(s) => { setLimit(s); setPage(0); }}
              totalItems={total}
              className="mt-6 border-t pt-6 shadow-none bg-transparent"
            />
          </>
        )}
      </Card>

      <Dialog open={!!handlingId} onOpenChange={(open) => !open && setHandlingId(null)}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>处理举报</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>结论</Label>
              <Select value={handlingStatus} onValueChange={(v: any) => setHandlingStatus(v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="resolved">已解决</SelectItem>
                  <SelectItem value="dismissed">已驳回</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea value={handlingResult} onChange={(e) => setHandlingResult(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHandlingId(null)}>取消</Button>
            <Button onClick={handleUpdateReport}>提交</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
