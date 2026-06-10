import React, { useState, useEffect } from 'react';
import { formatBeijingTime } from '@/lib/utils';
import { api } from '@/db/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, TrendingUp, User, Calendar, Tag } from 'lucide-react';

import { SystemText } from '@/components/common/KeywordText';

export function GrowthSection() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getGrowthLogs();
      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Fetch growth logs error:', error);
      import('sonner').then(({ toast }) => toast.error('获取流水记录失败: ' + error.message));
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!search) return true;
    const s = search.toLowerCase();
    const username = log.profiles?.username || '';
    const reason = log.reason || '';
    const type = log.type || '';
    return username.toLowerCase().includes(s) || 
           reason.toLowerCase().includes(s) || 
           type.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black"><SystemText>成长值</SystemText>流水管理</h2>
          <p className="text-sm text-muted-foreground mt-1">监控全站用户的<SystemText>成长值</SystemText>变动情况</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="搜索用户、原因或类型..." 
            className="pl-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            变动日志
          </CardTitle>
          <CardDescription>最近 100 条<SystemText>成长值</SystemText>变动记录</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="w-[200px]">用户</TableHead>
                <TableHead>变动数值</TableHead>
                <TableHead>原因</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {log.profiles?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="font-bold text-sm truncate">{log.profiles?.username || '未知用户'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={log.amount >= 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                        {log.amount >= 0 ? `+${log.amount}` : log.amount} EXP
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm">
                      <SystemText>{log.reason || '系统调整'}</SystemText>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-lg text-[10px] font-bold uppercase">
                        {log.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatBeijingTime(log.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                    未找到相关记录
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
