
import React, { useState } from 'react';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Download, Upload, Loader2, Database, AlertCircle, CheckCircle2, 
  FileJson, ShieldCheck, History, ArrowRightLeft, Package, Info, RefreshCcw, Copy
} from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatBeijingTime } from '@/lib/utils';
import { useAdminLogger } from '@/hooks/useAdminLogger';

const TABLES_ORDER = [
  'profiles',
  'content_categories',
  'tags',
  'permission_groups',
  'system_configs',
  'storage_configs',
  'domain_configs',
  'cache_config',
  'recommendation_settings',
  'miniprogram_configs',
  'wechat_configs',
  'wechat_menus',
  'wechat_replies',
  'wechat_notification_templates',
  'wecom_configs',
  'superbed_configs',
  'zonerama_album_configs',
  'site_shortcodes',
  'global_keyword_replacements',
  'user_content_keyword_replacements',
  'system_guide_categories',
  'system_guide_templates',
  'system_guides',
  'daily_gallery_posts',
  'badges',
  'badge_tasks',
  'rank_configs',
  'signin_configs',
  'photo_albums',
  'media_items',
  'media_tags',
  'album_photos',
  'album_custom_fields',
  'album_custom_field_groups',
  'ads',
  'notification_templates',
  'user_field_configs'
];

export function DataSyncSection() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<'overwrite' | 'incremental'>('overwrite');
  const [importResults, setImportResults] = useState<any>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState<string | null>(null);
  const { logAction } = useAdminLogger('data-sync');

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await api.exportAdminData();
      if (error) throw error;
      
      if (data && data.success) {
        const jsonData = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `site_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('备份导出成功');
        logAction('export', { success: true });
      } else {
        throw new Error(data?.error || '导出失败');
      }
    } catch (error: any) {
      console.error('[Export Error]', error);
      toast.error('导出失败: ' + error.message);
      logAction('export', { success: false, error: error.message });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const jsonData = JSON.parse(content);
        
        setImporting(true);
        setImportProgress(0);
        setImportResults(null);

        const tablesInJson = Object.keys(jsonData);
        // 按拓扑顺序排列
        const sortedTables = TABLES_ORDER.filter(t => tablesInJson.includes(t));
        const extraTables = tablesInJson.filter(t => !TABLES_ORDER.includes(t));
        const allSortedTables = [...sortedTables, ...extraTables];

        const accumulatedResults: Record<string, any> = {};
        
        for (let i = 0; i < allSortedTables.length; i++) {
          const table = allSortedTables[i];
          const tableData = { [table]: jsonData[table] };
          
          setCurrentTable(table);
          // 更新进度
          setImportProgress(Math.round(((i) / allSortedTables.length) * 100));

          const { data, error } = await api.importAdminData(tableData, importMode);
          if (error) {
            console.error(`[Import Error] Table ${table}:`, error);
            accumulatedResults[table] = { successCount: 0, failCount: jsonData[table]?.length || 0, errors: [error.message] };
          } else if (data && data.success) {
            // 合并结果
            Object.assign(accumulatedResults, data.results || {});
          } else {
            accumulatedResults[table] = { successCount: 0, failCount: jsonData[table]?.length || 0, errors: [data?.error || '未知错误'] };
          }
          
          // 设置部分结果以实时展示
          setImportResults({ ...accumulatedResults });
        }

        setImportProgress(100);
        toast.success('配置同步完成');
        logAction('import', { success: true, tableCount: allSortedTables.length });
      } catch (error: any) {
        console.error('[Import Error]', error);
        toast.error('同步失败: ' + error.message);
        logAction('import', { success: false, error: error.message });
      } finally {
        setImporting(false);
        // 重置文件选择器
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleCopyLogs = () => {
    if (!importResults) return;
    
    let logText = `数据同步执行报告 - ${new Date().toLocaleString()}\n`;
    logText += `-------------------------------------------\n`;
    
    Object.entries(importResults).forEach(([table, res]: [string, any]) => {
      logText += `表: ${table}\n`;
      logText += `成功: ${res.successCount ?? 0}, 失败: ${res.failCount ?? 0}\n`;
      if (res.errors && res.errors.length > 0) {
        logText += `错误详情:\n${res.errors.join('\n')}\n`;
      }
      logText += `-------------------------------------------\n`;
    });
    
    navigator.clipboard.writeText(logText).then(() => {
      toast.success('执行日志已复制到剪贴板');
    }).catch(err => {
      console.error('Copy failed:', err);
      toast.error('复制失败');
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">配置同步与备份</h2>
          <p className="text-sm text-muted-foreground mt-1">导出/导入全站配置信息、素材元数据及系统库</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm border border-border/40">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              导出备份
            </CardTitle>
            <CardDescription>生成包含系统配置、素材库、标签及图集信息的 JSON 文件</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Alert className="bg-blue-50/50 border-blue-100 rounded-2xl">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-700 font-bold">安全提示</AlertTitle>
                <AlertDescription className="text-blue-600 text-xs">
                  导出文件不包含任何用户密码、个人资料或私密记录，确保备份文件的可分享性。
                </AlertDescription>
              </Alert>
              
              <ul className="text-xs space-y-2 text-muted-foreground ml-4 list-disc">
                <li>系统配置表 (system_configs, site_settings)</li>
                <li>生态对接 (微信公众号、小程序、企业微信)</li>
                <li>勋章与成长等级配置</li>
                <li>内容分类与标签云</li>
                <li>图集写真结构与自定义字段</li>
                <li>素材库元数据 (media_items)</li>
              </ul>

              <Button 
                onClick={handleExport} 
                disabled={exporting}
                className="w-full h-12 rounded-2xl font-bold gap-2"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                立即导出 JSON 备份
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm border border-border/40">
          <CardHeader className="bg-emerald-500/5 border-b border-emerald-500/10">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              导入同步
            </CardTitle>
            <CardDescription>上传备份文件以快速还原或同步全站配置</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Alert className="bg-amber-50/50 border-amber-100 rounded-2xl">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-700 font-bold">导入规则</AlertTitle>
                <AlertDescription className="text-amber-600 text-xs leading-relaxed">
                  {importMode === 'overwrite' 
                    ? '当前为覆盖模式：若主键冲突则更新记录。' 
                    : '当前为增量模式：若主键冲突则跳过，仅新增不存在的记录。'}
                  系统会自动处理外键关联约束。
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-2xl border border-border/40">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold">增量导入模式</Label>
                  <p className="text-[10px] text-muted-foreground">开启后仅导入新素材/配置，不更新已有数据</p>
                </div>
                <Switch 
                  checked={importMode === 'incremental'} 
                  onCheckedChange={(val: boolean) => setImportMode(val ? 'incremental' : 'overwrite')} 
                />
              </div>

              <div className="relative group">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={importing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                />
                <div className={cn(
                  "h-32 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center transition-all",
                  importing ? "bg-muted/50" : "group-hover:bg-muted/30 group-hover:border-primary/50"
                )}>
                  {importing ? (
                    <div className="space-y-3 flex flex-col items-center w-full px-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <Progress value={importProgress} className="h-1" />
                      <span className="text-xs font-bold text-muted-foreground">正在同步: {currentTable || '处理数据...'} ({importProgress}%)</span>
                    </div>
                  ) : (
                    <>
                      <FileJson className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium text-foreground">点击或拖拽备份文件至此</span>
                      <span className="text-[10px] text-muted-foreground mt-1">支持 .json 格式备份文件</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {importResults && (
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                导入执行报告
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyLogs}
                  className="rounded-xl h-8 text-[10px] font-bold gap-1.5 bg-background/50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  复制执行日志
                </Button>
                <Badge variant="outline" className="rounded-full bg-white/50">{Object.keys(importResults).length} 张表</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto no-scrollbar">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-white border-b z-20">
                  <tr>
                    <th className="p-3 font-bold text-muted-foreground">数据表</th>
                    <th className="p-3 font-bold text-muted-foreground">成功数</th>
                    <th className="p-3 font-bold text-muted-foreground">失败数</th>
                    <th className="p-3 font-bold text-muted-foreground">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(importResults).map(([table, res]: [string, any]) => (
                    <tr key={table} className="border-b border-border/20 last:border-none hover:bg-muted/5">
                      <td className="p-3 font-mono font-bold">{table}</td>
                      <td className="p-3 text-emerald-600 font-black">{res.successCount ?? 0}</td>
                      <td className="p-3 text-destructive font-black">{res.failCount ?? 0}</td>
                      <td className="p-3">
                        {(res.errors && res.errors.length > 0) ? (
                          <div className="flex flex-col gap-1">
                            {res.errors.map((err: string, i: number) => (
                              <span key={i} className="text-[10px] text-destructive truncate max-w-[200px]" title={err}>{err}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            同步完成
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-muted/30 rounded-3xl p-6 border border-border/40">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          数据一致性保障
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-foreground">UUID 冲突优化</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              系统采用 UPSERT 模式，若主键 ID 冲突则自动更新记录。这确保了跨站点同步时数据的唯一性。
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-foreground">外键依赖处理</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              导入逻辑严格遵循表依赖关系（父表先于子表），确保如分类、标签等基础数据先于素材内容导入。
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-foreground">分块处理机制</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              对于数万条素材记录，后端采用分块（Chunking）处理模式，避免数据库事务超时或内存溢出。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
