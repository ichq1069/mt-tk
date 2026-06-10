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
  Loader2, Info, RefreshCw, CircleCheckBig, UserPlus, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminLogger } from '@/hooks/useAdminLogger';

export function WechatFollowSection() {
  const { logAction } = useAdminLogger('wechat-follow');
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [followReply, setFollowReply] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [refollowContent, setRefollowContent] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (selectedConfigId) {
      fetchFollowReply();
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

  const fetchFollowReply = async () => {
    setLoading(true);
    try {
      const { data } = await api.getWechatReplies(selectedConfigId);
      const follow = data?.find((r: any) => r.type === 'follow');
      const refollow = data?.find((r: any) => r.type === 'refollow');

      if (follow) {
        setFollowReply(follow);
        setContent(follow.reply_content);
        setIsActive(follow.is_active);
      } else {
        setFollowReply(null);
        setContent('');
        setIsActive(true);
      }

      if (refollow) {
        setRefollowContent(refollow.reply_content);
      } else {
        setRefollowContent('');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      return toast.error('请输入首次关注回复内容');
    }
    
    setSaving(true);
    try {
      // 保存首次关注回复
      const followPayload = {
        id: followReply?.id,
        config_id: selectedConfigId,
        type: 'follow',
        reply_content: content,
        is_active: isActive,
        content_type: 'text'
      };
      
      const { data: followData, error: followError } = await api.upsertWechatReply(followPayload);
      if (followError) throw followError;
      setFollowReply(followData);

      // 保存二次关注回复
      const refollow = (await api.getWechatReplies(selectedConfigId, 'refollow')).data?.[0];
      const refollowPayload = {
        id: refollow?.id,
        config_id: selectedConfigId,
        type: 'refollow',
        reply_content: refollowContent || content, // 默认为首次关注内容
        is_active: isActive,
        content_type: 'text'
      };
      await api.upsertWechatReply(refollowPayload);
      
      toast.success('配置已保存');
      logAction('保存关注回复配置', { followPayload, refollowPayload });
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
          <h2 className="text-3xl font-black tracking-tight">被关注回复</h2>
          <p className="text-muted-foreground mt-1">设置用户在点击“关注”公众号时自动收到的欢迎消息</p>
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
                <UserPlus className="w-5 h-5 text-primary" />
                配置回复内容
              </CardTitle>
              <CardDescription>
                支持简单的文字消息。欢迎语是留给用户的第一印象。
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs">回复状态</Label>
                  <Switch 
                    checked={isActive} 
                    onCheckedChange={setIsActive} 
                  />
                </div>
                <p className="text-xs text-muted-foreground">禁用后，用户关注时将不会收到任何自动回复。</p>
              </div>

              <div className="space-y-3">
                <Label className="font-bold text-xs">首次关注欢迎语</Label>
                <Textarea 
                  placeholder="欢迎关注我们的公众号！回复“帮助”查看可用功能..." 
                  className="rounded-2xl min-h-[120px] resize-none py-4 px-4 border-muted/20"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label className="font-bold text-xs">二次关注欢迎语 (欢迎回来)</Label>
                <Textarea 
                  placeholder="🌟 欢迎回来！您已经是第 {{count}} 次关注我们了。" 
                  className="rounded-2xl min-h-[120px] resize-none py-4 px-4 border-muted/20"
                  value={refollowContent}
                  onChange={e => setRefollowContent(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground italic">
                  提示：可使用 <code>{"{{count}}"}</code> 占位符表示用户关注次数。
                </p>
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

          <div className="bg-amber-500/10 p-4 rounded-2xl flex gap-3 text-amber-600">
            <Info className="w-5 h-5 shrink-0" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold mb-1">小贴士：</p>
              <p>1. 您可以在欢迎语中引导用户输入关键词获取服务。</p>
              <p>2. 合理使用表情符号可以增加亲和力。</p>
              <p>3. 消息字数建议控制在 200 字以内，避免阅读压力。</p>
              <p>4. 二次关注回复适用于那些取关后又重新关注的用户。</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest pl-2">效果预览 (模拟)</h3>
          <div className="border border-muted/30 rounded-[3rem] bg-slate-50 p-6 shadow-inner aspect-[9/16] relative overflow-hidden max-w-[320px] mx-auto">
             <div className="w-12 h-1 bg-muted-foreground/10 absolute top-4 left-1/2 -translate-x-1/2 rounded-full" />
             
             <div className="mt-8 space-y-4">
               <div className="flex justify-center mb-6">
                  <div className="bg-muted px-3 py-1 rounded-full text-[10px] text-muted-foreground font-medium">今天 12:00</div>
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
