import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Loader2, RefreshCcw } from 'lucide-react';
import { api } from '@/db/api';
import { toast } from 'sonner';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { useAdminLogger } from '@/hooks/useAdminLogger';

export function BatchRepairAuthSection() {
  const [loading, setLoading] = useState(false);
  const { logAction } = useAdminLogger('users');

  const handleBatchRepair = async () => {
    const confirmed = await confirmAsync('确认开始批量修复 Auth 账号？系统将为所有在 Profiles 中存在但 Auth 中缺失的账号创建登录权限，默认密码为：用户名+123456。', { 
      variant: 'default',
      title: '批量修复 Auth 账号'
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const { data, error } = await api.batchRepairAuthUsers();
      if (error) throw error;
      
      const results = data.results;
      toast.success(`修复完成！总计处理: ${results.total}, 新建: ${results.created}, 修复: ${results.repaired}, 跳过: ${results.skipped}, 失败: ${results.failed}`);
      logAction('batch_repair_auth', { results });
    } catch (e: any) {
      toast.error('批量修复失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="bg-muted/30">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          账户体系修复工具
        </CardTitle>
        <CardDescription>
          针对公众号自动创建、批量导入等场景产生的“仅有 Profile 记录、无 Auth 记录”的用户，一键补全 Auth 体系。
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold">批量补全 Auth 账号</h4>
            <p className="text-xs text-muted-foreground">系统将遍历 profiles 表，为有邮箱但无 Auth 关联的用户重新创建 Auth 记录。</p>
          </div>
          <Button 
            variant="outline" 
            className="rounded-xl font-bold border-amber-200 text-amber-600 hover:bg-amber-50 shrink-0 w-full md:w-auto"
            onClick={handleBatchRepair}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
            开始批量修复
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
