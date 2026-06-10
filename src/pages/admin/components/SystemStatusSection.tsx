import React, { useState, useEffect } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from "sonner";
import { 
  Server, 
  Database, 
  Cloud, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  RefreshCw,
  Activity
} from "lucide-react";
import { Badge } from '@/components/ui/badge';

interface EdgeFunctionStatus {
  name: string;
  displayName: string;
  status: 'ok' | 'error' | 'unknown';
  version?: string;
  error?: string;
}

export function SystemStatusSection() {
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [edgeFunctions, setEdgeFunctions] = useState<EdgeFunctionStatus[]>([
    { name: 'admin-api-gateway', displayName: '管理员 API 网关', status: 'unknown' },
    { name: 'wechat-callback', displayName: '微信回调处理', status: 'unknown' },
    { name: 'cache-manager', displayName: '缓存管理器', status: 'unknown' },
    { name: 'daily-gallery-verify', displayName: '每日图集验证', status: 'unknown' },
    { name: 'daily-gallery-publish', displayName: '每日图集发布', status: 'unknown' },
    { name: 'daily-gallery-scheduler', displayName: '每日图集调度', status: 'unknown' },
    { name: 'wechat-api', displayName: '微信 API 对接', status: 'unknown' },
    { name: 'upload-to-r2', displayName: '素材上传 (R2)', status: 'unknown' },
    { name: 'check-in', displayName: '用户签到服务', status: 'unknown' },
  ]);
  const [clearingCache, setClearingCache] = useState(false);
  const [reloadingSchema, setReloadingSchema] = useState(false);

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    setLoading(true);
    try {
      // 检查数据库状态
      const { data: dbData, error: dbError } = await api.getSystemStatus();
      if (dbError) {
        setDbStatus({ status: 'error', error: dbError.message });
      } else {
        setDbStatus(dbData);
      }

      // 检查 Edge Functions
      const updatedFunctions = await Promise.all(
        edgeFunctions.map(async (func) => {
          try {
            const { data, error } = await api.checkEdgeFunctionHealth(func.name);
            if (error) {
              // 处理 api.ts 返回的 fallback 结构
              const errStatus = (data as any)?.status || 'error';
              const errVersion = (data as any)?.version || 'unknown';
              return { 
                ...func, 
                status: errStatus === 'ok' ? 'ok' as const : 'error' as const, 
                error: (error as any)?.message || '调用异常',
                version: errVersion
              };
            }
            
            return { 
              ...func, 
              status: data?.status === 'ok' ? 'ok' as const : 'unknown' as const, 
              version: data?.version || '1.0.1',
              error: data?.status !== 'ok' ? '服务未就绪' : undefined
            };
          } catch (e: any) {
            return { ...func, status: 'error' as const, error: e.message };
          }
        })
      );
      setEdgeFunctions(updatedFunctions);
    } catch (error: any) {
      toast.error('健康检查失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm('确定要清除所有缓存吗？这将清除前端和后端的所有缓存数据。')) {
      return;
    }

    setClearingCache(true);
    try {
      const { error } = await api.clearAllCache();
      if (error) throw error;
      toast.success('缓存已清除，配置修改将立即生效');
    } catch (error: any) {
      toast.error('清除缓存失败: ' + error.message);
    } finally {
      setClearingCache(false);
    }
  };

  const handleReloadSchema = async () => {
    if (!window.confirm('确定要重载数据库 Schema 缓存吗？这将强制 PostgREST 刷新数据结构。')) {
      return;
    }

    setReloadingSchema(true);
    try {
      const { error } = await api.reloadPostgRestSchema();
      if (error) throw error;
      toast.success('Schema 已重载，新的数据库表或字段现已可用');
    } catch (error: any) {
      toast.error('重载失败: ' + error.message);
    } finally {
      setReloadingSchema(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            系统状态监控
          </h1>
          <p className="text-muted-foreground mt-1">实时监控数据库、云函数及缓存状态</p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={checkSystemHealth} 
            disabled={loading}
            variant="outline"
            className="rounded-2xl"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            刷新状态
          </Button>
          <Button 
            onClick={handleReloadSchema} 
            disabled={reloadingSchema}
            variant="outline"
            className="rounded-2xl border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            {reloadingSchema ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
            重载 Schema
          </Button>
          <Button 
            onClick={handleClearCache} 
            disabled={clearingCache}
            variant="destructive"
            className="rounded-2xl"
          >
            {clearingCache ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            清除缓存
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 数据库状态 */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm border border-border/40">
          <CardHeader className="bg-muted/30 border-b border-border/40">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              数据库状态
            </CardTitle>
            <CardDescription>PostgreSQL 数据库运行状态</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : dbStatus ? (
              <>
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                  <span className="font-bold">状态</span>
                  {dbStatus.status === 'healthy' ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      健康
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      异常
                    </Badge>
                  )}
                </div>
                
                {dbStatus.stats && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted/10 rounded-xl">
                      <span className="text-sm text-muted-foreground">媒体数量</span>
                      <span className="font-bold">{dbStatus.stats.media_count || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/10 rounded-xl">
                      <span className="text-sm text-muted-foreground">用户数量</span>
                      <span className="font-bold">{dbStatus.stats.profile_count || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/10 rounded-xl">
                      <span className="text-sm text-muted-foreground">配置项数量</span>
                      <span className="font-bold">{dbStatus.stats.config_count || 0}</span>
                    </div>
                  </div>
                )}

                {dbStatus.db_time && (
                  <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/40">
                    数据库时间: {new Date(dbStatus.db_time).toLocaleString('zh-CN')}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* 云函数状态 */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm border border-border/40">
          <CardHeader className="bg-muted/30 border-b border-border/40">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Cloud className="w-5 h-5 text-purple-500" />
              云函数状态
            </CardTitle>
            <CardDescription>Edge Functions 运行状态与版本</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              edgeFunctions.map((func) => (
                <div 
                  key={func.name} 
                  className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40"
                >
                  <div className="flex-1">
                    <div className="font-bold text-sm">{func.displayName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{func.name}</div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {func.version && (
                      <Badge variant="outline" className="font-mono text-xs">
                        v{func.version}
                      </Badge>
                    )}
                    {func.status === 'ok' ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        正常
                      </Badge>
                    ) : func.status === 'error' ? (
                      <Badge variant="destructive">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        异常
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        未知
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 缓存说明 */}
      <Card className="mt-6 border-none shadow-sm rounded-3xl overflow-hidden bg-orange-500/5 border border-orange-500/10">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-600">
            <Server className="w-4 h-4" />
            缓存清除说明
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-orange-700/70 leading-relaxed space-y-2">
          <p>• <strong>前端缓存</strong>：存储在浏览器内存中的配置与数据，清除后立即生效</p>
          <p>• <strong>后端缓存</strong>：存储在 Edge Function 内存中的数据，清除后所有云函数将重新从数据库读取</p>
          <p>• <strong>使用场景</strong>：修改系统配置后，如果前端或云函数未立即生效，请点击"清除缓存"按钮</p>
          <p>• <strong>注意事项</strong>：清除缓存后，首次访问可能会稍慢，因为需要重新从数据库加载数据</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default SystemStatusSection;
