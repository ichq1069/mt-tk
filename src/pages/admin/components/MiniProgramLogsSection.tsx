import React, { useState, useEffect } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/db/api';
import { formatBeijingTime, cn } from '@/lib/utils';
import { Loader2, RefreshCw, Smartphone, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function MiniProgramLogsSection() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [logType, setLogType] = useState<'ad' | 'access' | 'login' | 'qr'>('ad');
  const [clearing, setClearing] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      if (logType === 'ad') {
        const { data } = await api.supabase
          .from('ad_unlock_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        setLogs(data || []);
      } else if (logType === 'access') {
        const { data } = await api.supabase
          .from('daily_gallery_access_logs')
          .select('*')
          .order('accessed_at', { ascending: false })
          .limit(100);
        setLogs(data || []);
      } else if (logType === 'login') {
        const { data } = await api.supabase
          .from('mp_login_logs')
          .select('*')
          .order('logged_at', { ascending: false })
          .limit(100);
        setLogs(data || []);
      } else if (logType === 'qr') {
        const { data } = await api.supabase
          .from('mp_qr_generation_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        setLogs(data || []);
      }
    } catch (e) {
      console.error('Fetch logs error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    const typeNames = {
      ad: '广告解锁',
      access: '资源访问',
      login: '登录流水',
      qr: '生成码流水'
    };
    
    const confirmed = await confirmAsync(
      `确定要清空所有${typeNames[logType]}记录吗？此操作不可撤销！`,
      {
        title: '确认清空记录',
        confirmText: '确认清空',
        cancelText: '取消',
        variant: 'destructive'
      }
    );
    
    if (!confirmed) return;
    
    setClearing(true);
    const loadingToast = toast.loading(`正在清空${typeNames[logType]}记录...`);
    
    try {
      const tableNameMap: Record<string, string> = {
        ad: 'ad_unlock_logs',
        access: 'daily_gallery_access_logs',
        login: 'mp_login_logs',
        qr: 'mp_qr_generation_logs'
      };
      const tableName = tableNameMap[logType];
      const { error } = await api.supabase.from(tableName).delete().not('id', 'is', null);
      
      if (error) {
        console.error('Clear logs database error:', error);
        throw error;
      }
      
      toast.success(`成功清空${typeNames[logType]}记录`, { id: loadingToast });
      setLogs([]); // 立即清空本地状态
      fetchLogs();
    } catch (error: any) {
      console.error('Clear logs error:', error);
      toast.error(`清空失败: ${error.message}`, { id: loadingToast });
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [logType]);

  return (
    <Card className="rounded-3xl border-none shadow-sm h-fit">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            记录流水
          </CardTitle>
          <CardDescription>查看小程序的广告解锁、资源访问及登录记录</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={logType} onValueChange={(v: any) => setLogType(v)}>
            <SelectTrigger className="w-[150px] rounded-xl h-9">
              <SelectValue placeholder="流水类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ad">广告解锁</SelectItem>
              <SelectItem value="access">资源访问</SelectItem>
              <SelectItem value="login">登录流水</SelectItem>
              <SelectItem value="qr">生成码流水</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl h-9 text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50 gap-2" 
            onClick={handleClearLogs} 
            disabled={loading || clearing || logs.length === 0}
          >
            <Trash2 className="w-4 h-4" />
            清空记录
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-muted/20 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                {logType === 'ad' && (
                  <>
                    <TableHead>资源ID</TableHead>
                    <TableHead>用户标识</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>触发时间</TableHead>
                  </>
                )}
                {logType === 'access' && (
                  <>
                    <TableHead>日期</TableHead>
                    <TableHead>用户标识</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>时间</TableHead>
                  </>
                )}
                {logType === 'login' && (
                  <>
                    <TableHead>关联用户</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>IP/时间</TableHead>
                  </>
                )}
                {logType === 'qr' && (
                  <>
                    <TableHead>用户标识</TableHead>
                    <TableHead>页面</TableHead>
                    <TableHead>参数 (Scene)</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>IP/时间</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={logType === 'qr' ? 4 : 4} className="h-64 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={logType === 'qr' ? 4 : 4} className="h-64 text-center text-muted-foreground">
                    暂无记录
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                    {logType === 'ad' && (
                      <>
                        <TableCell className="font-mono text-xs max-w-[120px] truncate">{log.item_id}</TableCell>
                        <TableCell className="text-xs">{log.openid?.slice(0, 8)}...{log.openid?.slice(-4)}</TableCell>
                        <TableCell>
                          <Badge variant={log.watch_status === 'completed' ? 'default' : 'secondary'} className={cn("text-[10px]", log.watch_status === 'completed' && "bg-green-500 hover:bg-green-600")}>
                            {log.watch_status === 'completed' ? '已完播' : '进行中'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{formatBeijingTime(log.created_at)}</TableCell>
                      </>
                    )}
                    {logType === 'access' && (
                      <>
                        <TableCell className="text-xs">{log.publish_date}</TableCell>
                        <TableCell className="text-xs">{log.openid?.slice(0, 8)}...{log.openid?.slice(-4)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{log.access_type === 'view' ? '查看' : '下载'}</Badge>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{formatBeijingTime(log.accessed_at)}</TableCell>
                      </>
                    )}
                    {logType === 'login' && (
                      <>
                        <TableCell className="text-xs">
                          {log.user_id ? (
                            <span className="flex flex-col">
                              <span className="font-medium truncate max-w-[120px]">{log.openid?.slice(0, 8)}...</span>
                              <span className="text-[9px] text-muted-foreground">User: {log.user_id?.slice(0, 8)}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">
                              OpenID: {log.openid?.slice(0, 8)}...
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                            {log.log_type === 'mp_login' ? '小程序授权' : 
                             log.log_type === 'h5_login_token_ready' ? 'H5 准备登录' :
                             log.log_type === 'h5_login_token_error' ? 'H5 登录错误' : log.log_type || '其他'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={log.success ? 'default' : 'destructive'} 
                            className={cn("text-[10px]", log.success && "bg-green-500 hover:bg-green-600")}
                          >
                            {log.success ? '成功' : '失败'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground leading-tight">
                          <div className="font-mono text-[9px]">{log.ip_address || 'unknown'}</div>
                          <div>{formatBeijingTime(log.logged_at)}</div>
                        </TableCell>
                      </>
                    )}
                    {logType === 'qr' && (
                      <>
                        <TableCell className="text-xs">
                          {log.openid ? (
                            <span className="flex flex-col">
                              <span className="font-medium truncate max-w-[100px]">{log.openid?.slice(0, 8)}...</span>
                              <span className="text-[9px] text-muted-foreground">ID: {log.user_id?.slice(0, 8)}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">匿名用户</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[120px]">{log.page || 'default'}</span>
                            <span className="text-[9px] text-muted-foreground">{log.log_type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono max-w-[150px] truncate" title={log.scene}>{log.scene || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={log.success ? 'default' : 'destructive'} className={cn("text-[10px]", log.success && "bg-green-500 hover:bg-green-600")}>
                            {log.success ? '成功' : '失败'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground leading-tight">
                          <div className="font-mono text-[9px]">{log.ip_address || 'unknown'}</div>
                          <div>{formatBeijingTime(log.created_at)}</div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
