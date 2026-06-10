import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { StorageConfig } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Save, ImageIcon, Tag, LayoutGrid, Type, Info } from 'lucide-react';
import { api } from '@/db/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UploadSectionProps {
  config: Partial<StorageConfig>;
  onSave: (config: Partial<StorageConfig>) => Promise<void>;
  saving: boolean;
}

export function UploadSection({ config: initialConfig, onSave, saving }: UploadSectionProps) {
  const [config, setConfig] = useState<Partial<StorageConfig>>(initialConfig);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    // 赋初始默认规则
    const updatedConfig = { ...initialConfig };
    if (!updatedConfig.file_naming_rule) {
      updatedConfig.file_naming_rule = 'timestamp';
    }
    if (updatedConfig.upload_category_single === undefined) {
      updatedConfig.upload_category_single = true;
    }
    setConfig(updatedConfig);
  }, [initialConfig]);

  useEffect(() => {
    api.getContentCategories().then((res: any) => {
      if (res.data) setCategories(res.data);
    });
  }, []);

  const handleToggle = (key: keyof StorageConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleInputChange = (key: keyof StorageConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" /> 上传功能核心配置
          </CardTitle>
          <CardDescription>
            控制上传页面的视觉引导、默认属性及自动化处理逻辑
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold">启用全站分类选择</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">允许用户在上传时为作品选择所属分类</p>
                </div>
                <Switch 
                  checked={config.enable_upload_categories ?? true} 
                  onCheckedChange={() => handleToggle('enable_upload_categories')}
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                <div>
                  <Label className="font-bold">启用全站标签输入</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">允许用户在上传时为作品添加自定义标签</p>
                </div>
                <Switch 
                  checked={config.enable_upload_tags ?? true} 
                  onCheckedChange={() => handleToggle('enable_upload_tags')}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" /> 分类与标签默认规则
          </CardTitle>
          <CardDescription>
            控制上传时的分类单选/多选模式及默认初始属性
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold">分类单选模式</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">开启后用户只能为作品选择一个分类，关闭则支持多选</p>
                </div>
                <Switch 
                  checked={config.upload_category_single ?? true} 
                  onCheckedChange={() => handleToggle('upload_category_single')}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                <LayoutGrid className="w-3 h-3" /> 默认分类
              </Label>
              <Select 
                value={config.default_upload_category || 'all'} 
                onValueChange={(val) => handleInputChange('default_upload_category', val)}
              >
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="选择默认分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">未分类 (all)</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name} ({cat.id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">用户未选择时的后备分类</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Tag className="w-3 h-3" /> 默认初始标签
              </Label>
              <Input 
                placeholder="多个标签请用英文逗号分隔" 
                value={config.default_upload_tags || ''}
                onChange={(e) => handleInputChange('default_upload_tags', e.target.value)}
                className="rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">新作品默认预填的标签内容</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" /> 存储通道优先级
          </CardTitle>
          <CardDescription>
            设置后台（如勋章管理等）上传图片时，优先使用的存储服务
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="space-y-2">
              <Label className="font-bold">选择主要存储通道</Label>
              <select 
                value={config.storage_priority || 'r2_first'} 
                onChange={(e) => handleInputChange('storage_priority', e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="r2_first">Cloudflare R2 (推荐)</option>
                <option value="superbed_first">聚合图床 (Superbed)</option>
              </select>
              <div className="p-3 bg-primary/5 rounded-xl flex items-start gap-2 mt-2">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  **提示**：此设置将影响勋章管理、Logo上传等后台管理页面的上传逻辑。如果首选通道上传失败或未配置，系统会自动尝试备用通道。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Type className="w-5 h-5 text-primary" /> 文件重命名规则
          </CardTitle>
          <CardDescription>
            设置上传后的文件命名规则，防止非法命名、路径穿越，并确保全站文件命名统一
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold">选择命名策略</Label>
              <Select 
                value={config.file_naming_rule || 'timestamp'} 
                onValueChange={(val) => handleInputChange('file_naming_rule', val)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="选择重命名策略" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">保留原文件名 (安全转义)</SelectItem>
                  <SelectItem value="timestamp">时间戳 + 随机数 (如: 202403241230-123.jpg)</SelectItem>
                  <SelectItem value="classic">大写字母 + 时间 + 随机数 (如: B202603241136563.jpg)</SelectItem>
                  <SelectItem value="md5">文件 MD5 哈希 (如: d41d8cd98f00.jpg)</SelectItem>
                  <SelectItem value="uuid">随机 UUID (如: 550e8400-e29b.jpg)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
              <Info className="w-4 h-4 text-primary mt-0.5" />
              <div className="text-[10px] text-muted-foreground leading-relaxed">
                <p className="font-bold text-primary mb-1">提示：</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>**保留原名**：系统会对原文件名进行清洗，移除非法字符，保留可读性。</li>
                  <li>**大写字母+日期**：生成如 B202603241136563.jpg 格式的文件名，适合传统命名风格。</li>
                  <li>**时间戳**：最推荐的方式，按上传时间排序，且能有效避免同名文件冲突。</li>
                  <li>**MD5**：相同文件上传后会得到相同的文件名（在同路径下），有助于去重。</li>
                  <li>**随机 UUID**：生成唯一的随机字符串，完全隐藏原始文件信息。</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 p-4 border-t flex justify-end">
          <Button 
            onClick={() => onSave(config)} 
            disabled={saving}
            className="rounded-xl bg-primary hover:bg-primary/90 min-w-[120px]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            保存上传设置
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
