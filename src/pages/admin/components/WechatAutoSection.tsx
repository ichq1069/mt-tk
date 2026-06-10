import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Loader2, Info, RefreshCw, Zap, Save, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminLogger } from '@/hooks/useAdminLogger';

export function WechatAutoSection() {
  const { logAction } = useAdminLogger('wechat-auto');
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [autoReply, setAutoReply] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (selectedConfigId) {
      fetchAutoReply();
    }
  }, [selectedConfigId]);

  const fetchConfigs = async () => {
    try {
      const { data } = await api.getWechatConfigs();
      setConfigs(data || []);
      if (data && data.length > 0) {
        setSelectedConfigId(data[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAutoReply = async () => {
    setLoading(true);
    try {
      const { data } = await api.getWechatReplies(selectedConfigId, 'auto');
      if (data && data.length > 0) {
        setAutoReply(data[0]);
        setContent(data[0].reply_content);
        setIsActive(data[0].is_active);
      } else {
        setAutoReply(null);
        setContent('');
        setIsActive(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      return toast.error('请输入回复内容');
    }
    
    setSaving(true);
    try {
      const payload = {
        id: autoReply?.id,
        config_id: selectedConfigId,
        type: 'auto',
        reply_content: content,
        is_active: isActive,
        content_type: 'text'
      };
      
      const { data, error } = await api.upsertWechatReply(payload);
      if (error) throw error;
      
      setAutoReply(data);
      toast.success('自动回复已保存');
      logAction('保存默认自动回复', payload);
    } catch (error: any) {
      toast.error(`保存失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading && configs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">载入中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">默认自动回复</h2>
          <p className="text-muted-foreground mt-1">当系统无法识别用户的消息或关键词时，发送的兜底回复内容</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
            <SelectTrigger className="w-[200px] rounded-xl font-bold">
              <SelectValue placeholder="选择公众号" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {configs.map(config => (
                <SelectItem key={config.id} value={config.id} className="rounded-lg">
                  {config.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-primary/5 pb-6">
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                配置回复内容
              </CardTitle>
              <CardDescription>
                自动回复可以作为客服兜底，或者引导用户输入关键词获取更多功能。
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs">启用状态</Label>
                  <Switch 
                    checked={isActive} 
                    onCheckedChange={setIsActive} 
                  />
                </div>
                <p className="text-xs text-muted-foreground">禁用后，无法匹配关键词时将不回复任何消息。</p>
              </div>

              <div className="space-y-3">
                <Label className="font-bold text-xs">默认回复文字</Label>
                <Textarea 
                  placeholder="您好，暂时还不知道如何处理您的消息呢。您可以回复“帮助”查看可用功能..." 
                  className="rounded-2xl min-h-[200px] resize-none py-4 px-4 border-muted/20"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleSave} 
                disabled={saving || loading}
                className="w-full h-12 rounded-2xl bg-primary font-bold shadow-lg shadow-primary/20"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                保存配置
              </Button>
            </CardContent>
          </Card>

          <div className="bg-blue-500/10 p-4 rounded-2xl flex gap-3 text-blue-600">
            <Info className="w-5 h-5 shrink-0" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold mb-1">建议：</p>
              <p>1. 引导语应简洁明快，告知用户当前处于什么状态。</p>
              <p>2. 合理提供功能列表，避免用户迷失方向。</p>
              <p>3. 消息不宜过长，建议 100 字左右最佳。</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest pl-2">对话预览 (模拟)</h3>
          <div className="border border-muted/30 rounded-[3rem] bg-slate-50 p-6 shadow-inner aspect-[9/16] relative overflow-hidden max-w-[320px] mx-auto">
             <div className="w-12 h-1 bg-muted-foreground/10 absolute top-4 left-1/2 -translate-x-1/2 rounded-full" />
             
             <div className="mt-8 space-y-6">
               <div className="flex justify-end pr-2">
                 <div className="bg-primary p-3 rounded-2xl rounded-tr-none text-xs text-white leading-relaxed shadow-sm max-w-[80%]">
                    在吗？我想看图片
                 </div>
               </div>

               <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center font-bold text-primary text-[10px]">WX</div>
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none text-xs leading-relaxed shadow-sm max-w-[85%] border border-muted/10">
                    {content || <span className="text-muted-foreground/30 italic">尚未配置预览内容...</span>}
                  </div>
               </div>
             </div>
             
             <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-muted/10">
               <div className="flex items-center gap-2">
                 <div className="w-6 h-6 rounded-full border border-muted/20" />
                 <div className="flex-1 h-8 rounded-lg bg-slate-100 border border-muted/10 px-2 flex items-center">
                    <div className="w-1 h-4 bg-primary rounded-full animate-pulse" />
                 </div>
                 <div className="w-6 h-6 rounded-full border border-muted/20" />
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
