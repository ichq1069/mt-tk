import React, { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { toast } from "sonner";
import { 
  Plus, Trash2, Edit2, Save, X, Search, CheckCircle2, Zap, Loader2,
  AlertCircle, ArrowRightLeft, Settings, Play, Code, LayoutList, ListOrdered,
  RefreshCw, Copy
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from "@/lib/utils";

interface CleaningRule {
  field: string;
  pattern: string;
  replacement: string;
  use_regex: boolean;
}

interface FieldMapping {
  title?: string;
  tags?: string;
  images?: string;
  video?: string;
  description?: string;
  author?: string;
}

interface ParseImportConfig {
  id?: string;
  serial_number: number;
  name: string;
  api_url: string;
  match_pattern: string;
  field_mapping: FieldMapping;
  cleaning_rules: CleaningRule[];
  status: 'enabled' | 'disabled';
}

export function ParsingImportSection() {
  const [configs, setConfigs] = useState<ParseImportConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<ParseImportConfig>({
    serial_number: 1,
    name: '',
    api_url: '',
    match_pattern: '',
    field_mapping: {},
    cleaning_rules: [],
    status: 'enabled'
  });

  const fieldExplanations = [
    { field: "title", name: "标题 (title)", desc: "作品的主标题。对应媒体库的主标题字段。" },
    { field: "tags", name: "标签 (tags)", desc: "作品的分类标签。支持逗号分隔多个路径（如: data.tags,data.extra），系统会自动合并并用逗号分隔。" },
    { field: "images", name: "图片 (images)", desc: "作品的图集链接。支持单条链接字符串或链接数组。" },
    { field: "video", name: "视频 (video)", desc: "作品的视频播放链接。通常为 MP4 或 HLS 地址。" },
    { field: "description", name: "描述 (description)", desc: "作品的详细介绍文本。" },
    { field: "author", name: "作者 (author)", desc: "原作品的创作者名称。" }
  ];

  // Test states
  const [testUrl, setTestUrl] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testJson, setTestJson] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('parse_import_configs')
        .select('*')
        .order('serial_number', { ascending: true });
      if (error) throw error;
      setConfigs(data || []);
    } catch (err: any) {
      toast.error('获取配置失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (config?: ParseImportConfig) => {
    if (config) {
      setCurrentConfig({ 
        ...config,
        cleaning_rules: config.cleaning_rules || []
      });
    } else {
      setCurrentConfig({
        serial_number: (configs.length > 0 ? Math.max(...configs.map(c => c.serial_number)) + 1 : 1),
        name: '',
        api_url: '',
        match_pattern: '',
        field_mapping: {},
        cleaning_rules: [],
        status: 'enabled'
      });
    }
    setTestUrl('');
    setTestJson(null);
    setTestResults(null);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentConfig.name || !currentConfig.api_url) {
      toast.error('名称和接口地址不能为空');
      return;
    }

    try {
      const configToSave = {
        ...currentConfig,
        updated_at: new Date().toISOString()
      };

      if (currentConfig.id) {
        const { error } = await (supabase as any)
          .from('parse_import_configs')
          .update(configToSave)
          .eq('id', currentConfig.id);
        if (error) throw error;
        toast.success('更新成功');
      } else {
        const { error } = await (supabase as any)
          .from('parse_import_configs')
          .insert(configToSave);
        if (error) throw error;
        toast.success('添加成功');
      }
      setIsDialogOpen(false);
      fetchConfigs();
    } catch (err: any) {
      toast.error('保存失败: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此解析配置吗？')) return;
    try {
      const { error } = await (supabase as any)
        .from('parse_import_configs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('删除成功');
      fetchConfigs();
    } catch (err: any) {
      toast.error('删除失败: ' + err.message);
    }
  };

  const handleTestParse = async () => {
    if (!testUrl || !currentConfig.api_url) {
      toast.error('请输入测试链接并配置接口地址');
      return;
    }

    setTestLoading(true);
    setTestJson(null);
    setTestResults(null);
    try {
      const { data, error } = await supabase.functions.invoke('parse-import-proxy', {
        body: { apiUrl: currentConfig.api_url, targetUrl: testUrl }
      });

      if (error) throw error;
      setTestJson(data);
      toast.success('获取 JSON 成功');
    } catch (err: any) {
      const errorMsg = await err?.context?.text();
      toast.error('解析测试失败: ' + (errorMsg || err.message));
    } finally {
      setTestLoading(false);
    }
  };

  // Extract all available paths from an object
  const getAllPaths = (obj: any, prefix = ''): string[] => {
    if (!obj || typeof obj !== 'object') return [];
    let paths: string[] = [];
    for (const key in obj) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(obj[key])) {
        paths.push(`${path}`);
        if (obj[key].length > 0 && typeof obj[key][0] === 'object') {
          paths.push(...getAllPaths(obj[key][0], `${path}[0]`));
        }
      } else if (obj[key] !== null && typeof obj[key] === 'object') {
        paths.push(...getAllPaths(obj[key], path));
      } else {
        paths.push(path);
      }
    }
    return Array.from(new Set(paths));
  };

  const applyCleaningRules = (value: any, field: string, rules: CleaningRule[]) => {
    if (!value || !rules || rules.length === 0) return value;
    
    let result = value;
    const fieldRules = rules.filter(r => r.field === field);
    
    for (const rule of fieldRules) {
      if (typeof result === 'string') {
        if (rule.use_regex) {
          try {
            const regex = new RegExp(rule.pattern, 'g');
            result = result.replace(regex, rule.replacement);
          } catch (e) {
            console.error('Regex error:', e);
          }
        } else {
          // Wildcard handling: simple * replacement
          const pattern = rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
          if (rule.pattern.includes('*')) {
            try {
              const regex = new RegExp(pattern, 'g');
              result = result.replace(regex, rule.replacement);
            } catch (e) {
              result = result.split(rule.pattern).join(rule.replacement);
            }
          } else {
            result = result.split(rule.pattern).join(rule.replacement);
          }
        }
      } else if (Array.isArray(result)) {
        result = result.map(v => applyCleaningRules(v, field, [rule]));
      }
    }
    return result;
  };

  // Extract value from object using dot notation path
  const getValueByPath = (obj: any, path: string): any => {
    if (!path || !obj) return null;
    
    // Support multiple paths separated by comma
    if (path.includes(',')) {
      const paths = path.split(',').map(p => p.trim());
      const results = paths.map(p => getValueByPath(obj, p)).filter(v => v !== null && v !== undefined);
      if (results.length === 0) return null;
      // If all results are arrays, flatten them. Otherwise join as string.
      if (results.every(r => Array.isArray(r))) {
        return results.flat();
      }
      return results.map(r => String(r)).join(',');
    }

    return path.split('.').reduce((acc, part) => {
      if (acc === null || acc === undefined) return undefined;
      const arrayMatch = part.match(/(.+)\[(\d+)\]/);
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch;
        const array = acc[arrayName];
        return Array.isArray(array) ? array[parseInt(index)] : undefined;
      }
      return acc[part];
    }, obj);
  };

  const previewResults = () => {
    if (!testJson) return;
    const results: any = {};
    (['title', 'tags', 'images', 'video', 'description', 'author'] as const).forEach(field => {
      let val = getValueByPath(testJson, currentConfig.field_mapping[field] || '');
      val = applyCleaningRules(val, field, currentConfig.cleaning_rules);
      results[field] = val;
    });
    setTestResults(results);
  };

  const addCleaningRule = () => {
    setCurrentConfig({
      ...currentConfig,
      cleaning_rules: [
        ...currentConfig.cleaning_rules,
        { field: 'title', pattern: '', replacement: '', use_regex: false }
      ]
    });
  };

  const removeCleaningRule = (index: number) => {
    const rules = [...currentConfig.cleaning_rules];
    rules.splice(index, 1);
    setCurrentConfig({ ...currentConfig, cleaning_rules: rules });
  };

  const updateCleaningRule = (index: number, updates: Partial<CleaningRule>) => {
    const rules = [...currentConfig.cleaning_rules];
    rules[index] = { ...rules[index], ...updates };
    setCurrentConfig({ ...currentConfig, cleaning_rules: rules });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">解析导入配置</h2>
            <p className="text-sm text-muted-foreground">配置外部网址解析接口与字段映射规则</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full hover:bg-muted"
            onClick={() => setIsHelpOpen(true)}
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none">
          <Plus className="w-4 h-4 mr-2" /> 新增配置
        </Button>
      </div>

      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="max-w-2xl bg-background border-border rounded-none sm:rounded-none">
          <DialogHeader>
            <DialogTitle>解析字段说明</DialogTitle>
            <DialogDescription>
              解析导入支持以下系统字段，配置映射时请确保返回数据类型正确。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {fieldExplanations.map(item => (
              <div key={item.field} className="grid grid-cols-4 gap-4 pb-4 border-b border-border last:border-0">
                <div className="font-bold text-sm col-span-1">{item.name}</div>
                <div className="text-xs text-muted-foreground col-span-3">{item.desc}</div>
              </div>
            ))}
            <div className="bg-muted/50 p-4 rounded-none">
              <p className="text-xs font-bold mb-2">💡 小贴士：</p>
              <ul className="text-[10px] text-muted-foreground list-disc list-inside space-y-1">
                <li>JSON 路径使用点语法，如 <code>data.list[0].url</code></li>
                <li>多标签支持逗号分隔多个路径，如 <code>data.tags,data.categories</code></li>
                <li>如果 API 直接返回字符串数组，可直接填写该数组所在路径</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-muted/30 p-4 rounded-xl border border-border/50 text-xs text-muted-foreground leading-relaxed space-y-1">
        <p className="font-bold text-foreground mb-1 flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" /> 解析配置使用说明：</p>
        <p>• 配置外部解析接口，通过 API 获取媒体资源；支持点语法路径映射（如 <code>data.title</code>）。</p>
        <p>• 清洗规则支持正则替换，可用于去除标题后缀、格式化标签等。</p>
        <p>• 开启“复制”功能可快速创建相似接口配置。状态默认为禁用，确认无误后手动启用。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse border border-border" />
          ))
        ) : configs.length === 0 ? (
          <div className="col-span-full h-48 flex flex-col items-center justify-center border-2 border-dashed border-border text-muted-foreground">
            <LayoutList className="w-12 h-12 mb-2 opacity-20" />
            <p>暂无配置，点击右上角新增</p>
          </div>
        ) : (
          configs.map(config => (
            <Card key={config.id} className="bg-background border-border shadow-none rounded-none overflow-hidden group">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-none font-mono">#{config.serial_number}</Badge>
                    <CardTitle className="text-base truncate max-w-[150px]">{config.name}</CardTitle>
                  </div>
                  <Badge className={cn("rounded-none", config.status === 'enabled' ? "bg-green-600/10 text-green-600 border-green-600/20" : "bg-red-600/10 text-red-600 border-red-600/20")}>
                    {config.status === 'enabled' ? '启用' : '禁用'}
                  </Badge>
                </div>
                <CardDescription className="truncate">{config.api_url}</CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Zap className="w-3 h-3" />
                    匹配模式: <span className="text-foreground">{config.match_pattern || '无'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Code className="w-3 h-3" />
                    字段映射: <span className="text-foreground">{Object.keys(config.field_mapping || {}).length} 个字段</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 pt-2 pb-2 flex justify-end gap-2 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    const { id, ...copyData } = config;
                    setCurrentConfig({
                      ...copyData,
                      name: `${config.name} (副本)`,
                      serial_number: (configs.length > 0 ? Math.max(...configs.map(c => c.serial_number)) + 1 : 1),
                      status: 'disabled'
                    });
                    setIsDialogOpen(true);
                  }} 
                  className="h-8 hover:bg-primary/10 hover:text-primary rounded-xl"
                >
                  <Copy className="w-3 h-3 mr-1" /> 复制
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(config)} className="h-8 hover:bg-primary/10 hover:text-primary rounded-xl">
                  <Edit2 className="w-3 h-3 mr-1" /> 编辑
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(config.id!)} className="h-8 text-red-600 hover:bg-red-600/10 rounded-xl">
                  <Trash2 className="w-3 h-3 mr-1" /> 删除
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border rounded-none sm:rounded-none">
          <DialogHeader>
            <DialogTitle>{currentConfig.id ? '编辑解析配置' : '新增解析配置'}</DialogTitle>
            <DialogDescription>设置解析接口与字段映射关系</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
            {/* Left Side: Basic Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="serial_number" className="text-right">序号</Label>
                <Input
                  id="serial_number"
                  type="number"
                  value={currentConfig.serial_number}
                  onChange={e => setCurrentConfig({ ...currentConfig, serial_number: parseInt(e.target.value) })}
                  className="col-span-3 rounded-none bg-muted/50 border-border focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">名称</Label>
                <Input
                  id="name"
                  value={currentConfig.name}
                  onChange={e => setCurrentConfig({ ...currentConfig, name: e.target.value })}
                  placeholder="例如: 微博解析"
                  className="col-span-3 rounded-none bg-muted/50 border-border focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="api_url" className="text-right">接口 URL</Label>
                <Input
                  id="api_url"
                  value={currentConfig.api_url}
                  onChange={e => setCurrentConfig({ ...currentConfig, api_url: e.target.value })}
                  placeholder="https://api.example.com/parse"
                  className="col-span-3 rounded-none bg-muted/50 border-border focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="match_pattern" className="text-right">匹配模式</Label>
                <Input
                  id="match_pattern"
                  value={currentConfig.match_pattern}
                  onChange={e => setCurrentConfig({ ...currentConfig, match_pattern: e.target.value })}
                  placeholder="例如: weibo.com"
                  className="col-span-3 rounded-none bg-muted/50 border-border focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">状态</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Switch
                    checked={currentConfig.status === 'enabled'}
                    onCheckedChange={checked => setCurrentConfig({ ...currentConfig, status: checked ? 'enabled' : 'disabled' })}
                  />
                  <span className="text-sm">{currentConfig.status === 'enabled' ? '启用' : '禁用'}</span>
                </div>
              </div>

              <div className="border-t border-border pt-4 mt-4">
                <h3 className="text-sm font-bold mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4" /> 字段映射配置 (JSON 路径)
                  </div>
                </h3>
                <div className="space-y-4">
                  {(['title', 'tags', 'images', 'video', 'description', 'author'] as const).map(field => (
                    <div key={field} className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right text-xs capitalize">{field}</Label>
                      <div className="col-span-3 flex gap-2">
                        <Input
                          value={currentConfig.field_mapping[field] || ''}
                          onChange={e => setCurrentConfig({
                            ...currentConfig,
                            field_mapping: { ...currentConfig.field_mapping, [field]: e.target.value }
                          })}
                          placeholder={`如: data.${field}`}
                          className="flex-1 rounded-none bg-muted/50 border-border h-8 text-xs focus:ring-primary"
                        />
                        {testJson && (
                          <Select
                            onValueChange={(val) => {
                              const current = currentConfig.field_mapping[field] || '';
                              const newVal = current ? `${current},${val}` : val;
                              setCurrentConfig({
                                ...currentConfig,
                                field_mapping: { ...currentConfig.field_mapping, [field]: newVal }
                              });
                            }}
                          >
                            <SelectTrigger className="w-8 h-8 p-0 rounded-none border-border">
                              <Plus className="w-3 h-3 m-auto" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {getAllPaths(testJson).map(path => (
                                <SelectItem key={path} value={path} className="text-[10px]">{path}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> 数据清理与替换
                  </h3>
                  <Button variant="outline" size="sm" onClick={addCleaningRule} className="h-7 text-[10px] rounded-none">
                    <Plus className="w-3 h-3 mr-1" /> 添加规则
                  </Button>
                </div>
                <div className="space-y-3">
                  {currentConfig.cleaning_rules.map((rule, idx) => (
                    <div key={idx} className="p-3 bg-muted/30 border border-border space-y-2 relative group">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeCleaningRule(idx)}
                        className="absolute top-1 right-1 w-6 h-6 text-red-500 opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={rule.field}
                          onValueChange={(val) => updateCleaningRule(idx, { field: val })}
                        >
                          <SelectTrigger className="h-7 text-[10px] rounded-none">
                            <SelectValue placeholder="目标字段" />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldExplanations.map(f => (
                              <SelectItem key={f.field} value={f.field}>{f.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.use_regex}
                            onCheckedChange={(checked) => updateCleaningRule(idx, { use_regex: checked })}
                          />
                          <span className="text-[10px]">正则</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="查找模式 (支持 *)"
                          value={rule.pattern}
                          onChange={(e) => updateCleaningRule(idx, { pattern: e.target.value })}
                          className="h-7 text-[10px] rounded-none bg-background"
                        />
                        <Input
                          placeholder="替换为"
                          value={rule.replacement}
                          onChange={(e) => updateCleaningRule(idx, { replacement: e.target.value })}
                          className="h-7 text-[10px] rounded-none bg-background"
                        />
                      </div>
                    </div>
                  ))}
                  {currentConfig.cleaning_rules.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-4 italic">暂无清理规则</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side: Testing */}
            <div className="space-y-4 border-l border-border pl-8">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Play className="w-4 h-4" /> 解析测试与映射预览
              </h3>
              <div className="flex gap-2">
                <Input
                  value={testUrl}
                  onChange={e => setTestUrl(e.target.value)}
                  placeholder="粘贴测试网址..."
                  className="flex-1 rounded-none bg-muted/50 border-border focus:ring-primary h-9"
                />
                <Button onClick={handleTestParse} disabled={testLoading} variant="secondary" size="sm" className="rounded-none border border-border">
                  {testLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : '获取 JSON'}
                </Button>
              </div>

              {testJson && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase mb-1 block">返回内容预览</Label>
                    <div className="bg-black/80 text-green-500 p-2 font-mono text-[10px] max-h-48 overflow-auto border border-border">
                      <pre>{JSON.stringify(testJson, null, 2)}</pre>
                    </div>
                  </div>

                  <Button onClick={previewResults} variant="outline" size="sm" className="w-full rounded-none border-border">
                    预览映射结果
                  </Button>

                  {testResults && (
                    <div className="bg-muted/50 p-4 border border-border space-y-2 animate-in slide-in-from-top-2 duration-300">
                      <Label className="text-[10px] text-muted-foreground uppercase block mb-2">映射后数据</Label>
                      {Object.entries(testResults).map(([k, v]: [string, any]) => (
                        <div key={k} className="text-xs grid grid-cols-4 gap-2 border-b border-border/10 pb-1">
                          <span className="text-muted-foreground font-bold">{k}:</span>
                          <span className="col-span-3 truncate text-foreground" title={String(v)}>
                            {Array.isArray(v) ? `[数组 ${v.length}] ${v.join(', ')}` : String(v || '未匹配')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-none">取消</Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none">保存配置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
