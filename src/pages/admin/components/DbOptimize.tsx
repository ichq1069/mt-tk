import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, RefreshCcw, Database, HardDrive, Table, Hash, CheckCircle2, AlertCircle, Info, PieChart, TrendingUp, Users, Image as ImageIcon, Download, Upload, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';
import { confirmAsync } from '@/components/ui/confirm-dialog';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const exportableTables = [
  { id: 'system_configs', name: '系统配置', category: '核心' },
  { id: 'announcements', name: '系统公告', category: '核心' },
  { id: 'wechat_configs', name: '微信配置', category: '核心' },
  { id: 'points_configs', name: '积分配置', category: '核心' },
  { id: 'level_configs', name: '等级配置', category: '核心' },
  { id: 'photo_albums', name: '写真图集', category: '内容' },
  { id: 'doc_categories', name: '文档分类', category: '内容' },
  { id: 'doc_templates', name: '文档模板', category: '内容' },
  { id: 'user_digit_ids', name: '用户靓号', category: '用户' },
  { id: 'content_categories', name: '内容分类', category: '内容' },
  { id: 'tags', name: '内容标签', category: '内容' },
  { id: 'profiles', name: '用户资料', category: '用户' },
  { id: 'daily_gallery_materials', name: '每日图集素材', category: '内容' },
  { id: 'daily_gallery_config', name: '每日图集配置', category: '内容' }
];

export function DbOptimize() {
  const [stats, setStats] = useState<any>(null);
  const [totalStats, setTotalStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTotal, setLoadingTotal] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedExportTables, setSelectedExportTables] = useState<string[]>(exportableTables.map(t => t.id));
  const [results, setResults] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const handleToggleTable = (id: string) => {
    setSelectedExportTables(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedExportTables.length === exportableTables.length) {
      setSelectedExportTables([]);
    } else {
      setSelectedExportTables(exportableTables.map(t => t.id));
    }
  };

  const handleExportSQL = async () => {
    if (selectedExportTables.length === 0) {
      toast.error('请至少选择一个数据表进行导出');
      return;
    }
    setExporting(true);
    try {
      const data = await api.exportDatabaseSQL(selectedExportTables);
      if (data.success && data.sql) {
        const blob = new Blob([data.sql], { type: 'text/sql' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}.sql`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('SQL 导出成功');
      }
    } catch (e: any) {
      toast.error(`导出失败: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleImportSQL = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = await confirmAsync('导入 SQL 将会修改数据库数据，确定要继续吗？');
    if (!confirmed) return;

    const conflictStrategy = await confirmAsync('如果数据冲突，您希望如何处理？', {
      title: '选择冲突处理策略',
      cancelText: '跳过 (Skip)',
      confirmText: '覆盖 (Overwrite)',
      variant: 'default'
    }).then(overwrite => overwrite ? 'overwrite' : 'skip');

    setImporting(true);
    try {
      const sql = await file.text();
      const data = await api.importDatabaseSQL(sql, conflictStrategy as any);
      if (data.success) {
        const successCount = data.results.filter((r: any) => r.success).length;
        const failCount = data.results.filter((r: any) => !r.success).length;
        toast.success(`导入完成: 成功 ${successCount} 条, 失败 ${failCount} 条`);
        fetchStats();
      }
    } catch (e: any) {
      toast.error(`导入失败: ${e.message}`);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    fetchStats();
    fetchTotalStats();
  }, []);

  const fetchTotalStats = async () => {
    setLoadingTotal(true);
    try {
      // 获取总用户数
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      // 获取总媒体数
      const { count: mediaCount } = await supabase.from('media_items').select('*', { count: 'exact', head: true });
      // 获取总收藏数
      const { count: favoriteCount } = await supabase.from('favorites').select('*', { count: 'exact', head: true });
      // 获取今日活跃用户数
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: activeToday } = await supabase.from('user_visit_stats')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      setTotalStats({
        userCount: userCount || 0,
        mediaCount: mediaCount || 0,
        favoriteCount: favoriteCount || 0,
        activeToday: activeToday || 0
      });
    } catch (e) {
      console.error('Failed to fetch total stats:', e);
    } finally {
      setLoadingTotal(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getDatabaseStats();
      if (error) throw error;
      setStats(data);
    } catch (e: any) {
      toast.error(`获取统计信息失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFullOptimize = async () => {
    setOptimizing(true);
    setResults([]);
    setMessage(null);
    try {
      const data = await api.fullOptimizeDatabase();
      if (data.success) {
        const results = Array.isArray(data.results) ? data.results : [];
        setResults(results);
        const statsAfter = results.find((r: any) => r.step === 'Stats After')?.data;
        if (statsAfter) setStats(statsAfter);
        toast.success('数据库优化完成');
      } else {
        throw new Error(data.error || '优化过程出现异常');
      }
    } catch (e: any) {
      setMessage(e.message);
      toast.error(`优化失败: ${e.message}`);
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" /> 业务总计统计
          </CardTitle>
          <CardDescription>
            全站用户行为与内容数据的宏观总量统计
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loadingTotal && !totalStats ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-indigo-900/60">总用户数</span>
                </div>
                <p className="text-2xl font-black text-indigo-700">{totalStats?.userCount.toLocaleString()}</p>
              </div>
              
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-emerald-900/60">内容总量</span>
                </div>
                <p className="text-2xl font-black text-emerald-700">{totalStats?.mediaCount.toLocaleString()}</p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-rose-900/60">收藏总计</span>
                </div>
                <p className="text-2xl font-black text-rose-700">{totalStats?.favoriteCount.toLocaleString()}</p>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600">
                    <RefreshCcw className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-sky-900/60">今日活跃</span>
                </div>
                <p className="text-2xl font-black text-sky-700">{totalStats?.activeToday.toLocaleString()}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" /> 数据库状态概览
          </CardTitle>
          <CardDescription>
            监控数据库物理存储、表规模及自动维护状态
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loading && !stats ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">总存储空间</p>
                  <p className="text-xl font-black">{stats?.db_size || '-'}</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <Table className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">公开数据表</p>
                  <p className="text-xl font-black">{stats?.table_count || 0}</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Hash className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">预计总行数</p>
                  <p className="text-xl font-black">{(stats?.row_count || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCcw className="w-5 h-5 text-green-600" /> 数据库维护与备份
          </CardTitle>
          <CardDescription>
            执行物理优化、导出/导入SQL备份，支持增量导入与冲突处理
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-500",
              optimizing ? "bg-green-100 animate-pulse scale-110" : "bg-green-50"
            )}>
              <RefreshCcw className={cn("w-8 h-8 text-green-600", optimizing && "animate-spin")} />
            </div>
            <h3 className="text-lg font-bold">全库一键维护</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
              此操作将运行一系列 PostgreSQL 优化指令，帮助查询计划器获得最新统计并压缩索引大小。
              <span className="text-green-600 font-bold ml-1">该过程不会阻塞业务读写。</span>
            </p>
            <Button
              onClick={handleFullOptimize}
              disabled={optimizing}
              className="mt-6 rounded-xl bg-green-600 hover:bg-green-700 min-w-[200px] h-12 text-lg font-black shadow-lg shadow-green-600/20"
            >
              {optimizing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  正在深度优化...
                </>
              ) : (
                <>
                  <RefreshCcw className="w-5 h-5 mr-2" />
                  开始数据库优化
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-blue-900">导出 SQL 备份</h4>
                  <p className="text-xs text-blue-600/70">导出指定数据表或全选为 SQL 文件</p>
                </div>
              </div>
              
              <div className="bg-white/50 rounded-xl p-3 mb-3 border border-blue-100 max-h-[200px] overflow-y-auto">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-blue-100">
                  <span className="text-xs font-bold text-blue-800">选择数据表 ({selectedExportTables.length}/{exportableTables.length})</span>
                  <button 
                    onClick={handleSelectAll}
                    className="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full transition-colors"
                  >
                    {selectedExportTables.length === exportableTables.length ? '取消全选' : '全选'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {exportableTables.map((table) => (
                    <div key={table.id} className="flex items-center space-x-2 group">
                      <Checkbox 
                        id={`table-${table.id}`} 
                        checked={selectedExportTables.includes(table.id)}
                        onCheckedChange={() => handleToggleTable(table.id)}
                        className="w-3.5 h-3.5 border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <Label 
                        htmlFor={`table-${table.id}`}
                        className="text-[11px] text-blue-900 cursor-pointer group-hover:text-blue-700 truncate"
                        title={`${table.name} (${table.id})`}
                      >
                        {table.name} <span className="opacity-40 ml-1">({table.id})</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleExportSQL}
                disabled={exporting}
                variant="outline"
                className="w-full rounded-xl border-blue-200 hover:bg-blue-50"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    正在导出...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    导出 SQL
                  </>
                )}
              </Button>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-purple-900">导入 SQL 备份</h4>
                  <p className="text-xs text-purple-600/70">从 SQL 文件恢复数据</p>
                </div>
              </div>
              <label htmlFor="sql-import" className="block">
                <input
                  id="sql-import"
                  type="file"
                  accept=".sql"
                  onChange={handleImportSQL}
                  className="hidden"
                />
                <Button
                  disabled={importing}
                  variant="outline"
                  className="w-full rounded-xl border-purple-200 hover:bg-purple-50"
                  asChild
                >
                  <span>
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        正在导入...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        选择 SQL 文件
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {results.length > 0 && (
            <div className="mt-6 border border-border/50 rounded-2xl overflow-hidden">
              <div className="bg-muted/20 px-4 py-2 border-b border-border/50 flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">执行步骤及详情</span>
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">LIVE PROGRESS</span>
              </div>
              <div className="divide-y divide-border/30">
                {results.map((res, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/5 transition-colors">
                    {res.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold flex items-center gap-2">
                        {res.step}
                        {!res.success && <span className="text-[10px] text-red-500 border border-red-200 px-1 rounded">FAILED</span>}
                      </p>
                      {res.data && (
                        <div className="mt-1 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                           <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            Size: {res.data.db_size}
                           </span>
                           <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            Tables: {res.data.table_count}
                           </span>
                           <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            Rows: {res.data.row_count?.toLocaleString()}
                           </span>
                        </div>
                      )}
                      {res.error && (
                        <p className="text-[11px] text-red-400 mt-1 font-mono break-all line-clamp-2 hover:line-clamp-none">
                          {res.error}
                        </p>
                      )}
                      {res.count !== undefined && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          已清理项目数量: <span className="font-bold text-primary">{res.count}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {message && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div className="text-xs text-red-600 font-mono break-all whitespace-pre-wrap">
                {message}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <p className="font-bold text-primary mb-1">优化全链路说明：</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>前端调用 Supabase Edge Function 并携带 JWT 令牌。</li>
            <li>边缘函数校验管理员角色，确认执行权限。</li>
            <li>调用 <code className="bg-primary/10 px-1 rounded">exec_sql</code> RPC 执行物理分析与索引并行重建。</li>
            <li>调整 <code className="bg-primary/10 px-1 rounded">autovacuum</code> 因子以针对核心业务表更频繁地清理碎片。</li>
            <li>清理命中率低于 20% 且请求数超过 10 的冗余缓存数据。</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
