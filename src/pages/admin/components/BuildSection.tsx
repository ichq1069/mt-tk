import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from "sonner";
import { 
  Package, 
  Download, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  History,
  Zap,
  Settings,
  BarChart3,
  Database,
  HardDrive,
  Lightbulb,
  ArrowUpCircle,
  Info
} from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { SystemBuild } from '@/types';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function BuildSection() {
  const [builds, setBuilds] = useState<SystemBuild[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [envConfig, setEnvConfig] = useState<string>(
    'VITE_SUPABASE_URL=https://supabase.wo58.cn\n' +
    'VITE_SUPABASE_ANON_KEY=\n' +
    'VITE_APP_ID=app-b5vwlh6eky69\n' +
    'VITE_SUPABASE_PROXY=false'
  );
  const [systemStats, setSystemStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    fetchBuilds();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const { data, error } = await api.getSystemStats();
      if (error) throw error;
      setSystemStats(data);
    } catch (error: any) {
      console.error('加载系统统计失败:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchBuilds = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getSystemBuilds();
      if (error) throw error;
      setBuilds(data || []);
      
      // 尝试从最近成功的构建中恢复 env 配置
      const lastBuildWithEnv = data?.find((b: any) => b.env_config);
      if (lastBuildWithEnv) {
        setEnvConfig(lastBuildWithEnv.env_config);
      }
    } catch (error: any) {
      toast.error('加载构建记录失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getNextVersion = (currentBuilds: SystemBuild[]) => {
    const lastVersion = currentBuilds[0]?.version || 'v1.0.0';
    const dateStr = new Date().getFullYear() + '.' + 
                   (new Date().getMonth() + 1).toString().padStart(2, '0') + '.' + 
                   new Date().getDate().toString().padStart(2, '0');
    
    // 如果最后一次构建是今天的，则增加序号
    const todayBuilds = currentBuilds.filter(b => b.version.includes(dateStr));
    if (todayBuilds.length > 0) {
      return `v${dateStr}-${todayBuilds.length + 1}`;
    }
    
    return `v${dateStr}-1`;
  };

  const handleTriggerBuild = async () => {
    const version = getNextVersion(builds);
    
    if (!window.confirm(`确定要启动新的自动构建吗？\n版本号: ${version}\n构建过程将在后台异步执行，避免因为连接超时导致失败。`)) {
      return;
    }

    setTriggering(true);
    try {
      const { data, error } = await api.triggerBuild(version, envConfig);
      if (error) throw error;
      toast.success('构建已成功触发，系统正在后台独立环境中异步处理中...');
      fetchBuilds();
    } catch (error: any) {
      toast.error('触发构建失败: ' + error.message);
    } finally {
      setTriggering(false);
    }
  };

  const handleDeleteBuild = async (id: string) => {
    if (!window.confirm('确定要删除这条构建记录吗？这将无法撤销。')) {
      return;
    }

    try {
      const { error } = await api.deleteBuild(id);
      if (error) throw error;
      setBuilds(builds.filter(b => b.id !== id));
      toast.success('记录已删除');
    } catch (error: any) {
      toast.error('删除失败: ' + error.message);
    }
  };

  const getStatusBadge = (status: SystemBuild['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            已完成
          </Badge>
        );
      case 'building':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            构建中
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            失败
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            待处理
          </Badge>
        );
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            系统构建管理
          </h1>
          <p className="text-muted-foreground mt-1">自动构建、打包并下载最新的系统代码镜像</p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={fetchBuilds} 
            disabled={loading}
            variant="outline"
            className="rounded-2xl"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            刷新
          </Button>
          <Button 
            onClick={handleTriggerBuild} 
            disabled={triggering}
            variant="default"
            className="rounded-2xl bg-gradient-to-r from-primary to-blue-600 shadow-lg shadow-primary/20"
          >
            {triggering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            启动自动构建
          </Button>
        </div>
      </div>

      <Tabs defaultValue="builds" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="builds">构建记录</TabsTrigger>
          <TabsTrigger value="config">构建配置</TabsTrigger>
          <TabsTrigger value="stats">数据统计</TabsTrigger>
        </TabsList>

        <TabsContent value="builds">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm border border-border/40">
            <CardHeader className="bg-muted/30 border-b border-border/40">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                最近构建记录
              </CardTitle>
              <CardDescription>查看历史构建详情，管理或下载生成的构建包</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {loading && builds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 opacity-20" />
                  <p>正在拉取构建历史...</p>
                </div>
              ) : builds.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/40 text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="px-4 py-3 font-black">版本 / ID</th>
                        <th className="px-4 py-3 font-black">状态</th>
                        <th className="px-4 py-3 font-black">创建时间</th>
                        <th className="px-4 py-3 font-black text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {builds.map((build) => (
                        <tr key={build.id} className="group hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-4">
                            <div className="font-bold text-sm text-foreground">{build.version}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{build.id}</div>
                          </td>
                          <td className="px-4 py-4">
                            {getStatusBadge(build.status)}
                          </td>
                          <td className="px-4 py-4 text-xs text-muted-foreground">
                            {new Date(build.created_at).toLocaleString('zh-CN')}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {build.download_url && build.status === 'completed' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 rounded-xl bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                                  onClick={() => window.open(build.download_url!, '_blank')}
                                >
                                  <Download className="w-3.5 h-3.5 mr-1" />
                                  下载
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 rounded-xl text-red-500 hover:bg-red-50"
                                onClick={() => handleDeleteBuild(build.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-border/60 rounded-3xl">
                  <Package className="w-12 h-12 mb-4 opacity-10" />
                  <p className="font-medium text-sm">暂无构建记录</p>
                  <p className="text-xs mt-1">点击上方"启动自动构建"按钮开始第一次构建</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm border border-border/40">
            <CardHeader className="bg-muted/30 border-b border-border/40">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                自定义 .env 配置
              </CardTitle>
              <CardDescription>
                配置构建时使用的环境变量，支持自定义 Supabase 端点、密钥等
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">环境变量配置</label>
                <Textarea
                  value={envConfig}
                  onChange={(e) => setEnvConfig(e.target.value)}
                  placeholder="VITE_SUPABASE_URL=https://...\nVITE_SUPABASE_ANON_KEY=..."
                  className="font-mono text-xs min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  每行一个环境变量，格式为 KEY=VALUE。构建时将自动写入 .env 文件。
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                <h4 className="text-sm font-bold text-blue-700 flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4" />
                  配置说明
                </h4>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• <strong>VITE_SUPABASE_URL</strong>: Supabase 项目 URL</li>
                  <li>• <strong>VITE_SUPABASE_ANON_KEY</strong>: Supabase 匿名密钥</li>
                  <li>• <strong>VITE_APP_ID</strong>: 应用 ID</li>
                  <li>• <strong>VITE_SUPABASE_PROXY</strong>: 是否启用代理（true/false）</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid grid-cols-1 gap-6">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm border border-border/40">
              <CardHeader className="bg-muted/30 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Database className="w-5 h-5 text-primary" />
                      数据库统计
                    </CardTitle>
                    <CardDescription>数据库表占用情况及优化建议</CardDescription>
                  </div>
                  <Button
                    onClick={fetchStats}
                    disabled={statsLoading}
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                  >
                    {statsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    刷新
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {statsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : systemStats ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl">
                      <HardDrive className="w-8 h-8 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">数据库总大小</div>
                        <div className="text-2xl font-black text-foreground">{systemStats.database_size}</div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border/40 text-xs text-muted-foreground uppercase tracking-wider">
                            <th className="px-4 py-3 font-black">表名</th>
                            <th className="px-4 py-3 font-black text-right">行数</th>
                            <th className="px-4 py-3 font-black text-right">总大小</th>
                            <th className="px-4 py-3 font-black text-right">表大小</th>
                            <th className="px-4 py-3 font-black text-right">索引大小</th>
                            <th className="px-4 py-3 font-black text-right">死行</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {systemStats.table_stats?.map((table: any) => (
                            <tr key={table.table_name} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs">{table.table_name}</td>
                              <td className="px-4 py-3 text-right text-sm">{table.row_count?.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-sm font-medium">{table.total_size}</td>
                              <td className="px-4 py-3 text-right text-sm">{table.table_size}</td>
                              <td className="px-4 py-3 text-right text-sm">{table.index_size}</td>
                              <td className="px-4 py-3 text-right text-sm">
                                {table.dead_rows > 0 ? (
                                  <span className="text-orange-600">{table.dead_rows}</span>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                      <h4 className="text-sm font-bold text-amber-700 flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4" />
                        优化建议
                      </h4>
                      <ul className="text-xs text-amber-600 space-y-1">
                        <li>• 定期清理死行（dead rows）可以提升查询性能</li>
                        <li>• 对于大表（&gt;10MB），考虑添加合适的索引</li>
                        <li>• 索引大小超过表大小时，检查是否存在冗余索引</li>
                        <li>• 使用数据库优化功能（在系统管理中）定期维护</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mb-4 opacity-10" />
                    <p className="text-sm">暂无统计数据</p>
                    <p className="text-xs mt-1">点击刷新按钮加载统计信息</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm border border-border/40">
              <CardHeader className="bg-muted/30 border-b border-border/40">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5 text-primary" />
                  版本升级说明
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>每次构建时，系统会自动递增版本号，格式为：<code className="px-2 py-1 bg-muted rounded text-xs font-mono">vYYYY.MM.DD-N</code></p>
                  <p>其中 N 为当天的构建序号，从 1 开始递增。</p>
                  <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                    <strong>注意：</strong>构建过程在独立环境中异步执行，避免因网络超时导致中断。构建完成后可在"构建记录"标签页下载。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-6 bg-primary/5 rounded-3xl border border-primary/10">
        <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4" />
          打包构建要求与说明
        </h3>
        <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
          <li>• <strong>构建流程</strong>: 点击启动后，系统将在独立环境中异步执行代码静态检查、打包及分块优化，避免因云函数超时导致中断。</li>
          <li>• <strong>配置支持</strong>: 支持自定义 <code className="px-1 bg-muted rounded">.env</code> 环境变量（如 VITE_SUPABASE_URL, VITE_APP_ID 等），构建时自动注入。</li>
          <li>• <strong>产物存放</strong>: 构建完成后，生成的 ZIP 压缩包将自动上传至云存储，并提供限时下载链接。</li>
          <li>• <strong>版本管理</strong>: 每次构建自动升级版本号（vYYYY.MM.DD-N），确保版本可追踪。</li>
          <li>• <strong>替换指南</strong>: 下载压缩包后，解压并将内容覆盖至您的服务器 <code className="px-1 bg-muted rounded">webroot</code> 或 <code className="px-1 bg-muted rounded">dist</code> 目录即可。</li>
          <li>• <strong>后台统计</strong>: 统计功能提供数据库表占用明细及优化建议，建议定期查看并执行数据库优化。</li>
          <li>• <strong>安全性</strong>: 构建过程不包含数据库敏感凭据，仅包含编译后的前端静态资源。</li>
        </ul>
      </div>
    </div>
  );
}
