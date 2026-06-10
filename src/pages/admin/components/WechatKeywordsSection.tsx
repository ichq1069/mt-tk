import React, { useState, useEffect } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { 
  Loader2, Plus, Trash2, Settings2, Info, Search, Hash, 
  RefreshCw, CircleCheckBig, CircleX, Link, Eye, EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export function WechatKeywordsSection() {
  const { logAction } = useAdminLogger('wechat-keywords');
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<any>(null);
  const [form, setForm] = useState({
    keyword: '',
    match_type: 'exact',
    content_type: 'text',
    reply_content: '',
    category: 'none', // 新增字段
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [galleryConfig, setGalleryConfig] = useState<any>(null);
  const [configSaving, setConfigSaving] = useState(false);

  const fetchGalleryConfig = async () => {
    try {
      const { data } = await api.getDailyGalleryConfig();
      if (data?.value) {
        setGalleryConfig(data.value);
      }
    } catch (error) {
      console.error('Fetch gallery config error:', error);
    }
  };

  const handleUpdateGalleryConfig = async (newConfig: any) => {
    setConfigSaving(true);
    try {
      const updatedConfig = { ...galleryConfig, ...newConfig };
      const { error } = await api.updateDailyGalleryConfig(updatedConfig);
      if (error) throw error;
      setGalleryConfig(updatedConfig);
      toast.success('配置已更新');
      logAction('更新每日图集回复配置', newConfig);
    } catch (error: any) {
      toast.error(`更新失败: ${error.message}`);
    } finally {
      setConfigSaving(false);
    }
  };

  const categoryTemplates: Record<string, string> = {
    login: '您的登录验证码为：{code}\n请在 10 分钟内完成登录。\n\n[方式1] 在 H5 的"登录/注册"中输入此验证码。\n\n[方式2] <a href="{url}">点击此处直接登录</a>',
    daily_gallery: '📸 【{date}】图集专属访问密码\n\n🔑 您的专属密码：{password}\n⏰ 有效期至：{expire_time}\n🔗 <a href="{url}">点击快速访问</a>\n\n💡 提示：此链接已包含密码，可直接点击访问。转发无效。\n\n🔄 如果需要在其他浏览器查看请回复“重置看图密码”即可重置。',
    random_beauty: '📸 【随机美图】专属访问入口\n\n🔗 <a href="{url}">点击进入随机美图</a>\n\n今日已看：{count}',
    binding: '您的绑定验证码为：{code}\n请在 10 分钟内完成操作。',
    help: '💡 常用指令指南：\n\n1️⃣ 发送“今日图片”：获取当日图集访问密码及链接。\n2️⃣ 发送“登录”：获取验证码用于 H5 端登录。\n3️⃣ 发送“签到”：每日签到领取奖励。\n4️⃣ 发送“帮助”：再次查看此指令列表。',
    check_in: '🌟 签到成功！您今日已完成签到。\n\n📅 连续签到：{days} 天\n💰 获得奖励：{points} 积分\n📈 当前成长：{exp} 点',
  };

  const categoryVariables: Record<string, { label: string, value: string }[]> = {
    login: [
      { label: '验证码', value: '{code}' },
      { label: '直接登录链接', value: '{url}' }
    ],
    daily_gallery: [
      { label: '日期', value: '{date}' },
      { label: '专属密码', value: '{password}' },
      { label: '过期时间', value: '{expire_time}' },
      { label: '访问链接', value: '{url}' }
    ],
    binding: [
      { label: '验证码', value: '{code}' }
    ],
    random_beauty: [
      { label: '访问链接', value: '{url}' },
      { label: '今日已看', value: '{count}' }
    ],
    check_in: [
      { label: '连续天数', value: '{days}' },
      { label: '获得积分', value: '{points}' },
      { label: '获得经验', value: '{exp}' }
    ],
    none: [
      { label: '用户昵称', value: '{{user.name}}' },
      { label: '当前日期', value: '{{date.yyyy-mm-dd}}' }
    ]
  };

  const handleCategoryChange = (val: string) => {
    const template = categoryTemplates[val];
    if (template && (!form.reply_content || form.reply_content.trim() === '')) {
      setForm({ ...form, category: val, reply_content: template });
    } else {
      setForm({ ...form, category: val });
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('reply-content-area') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = form.reply_content;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    setForm({ ...form, reply_content: before + variable + after });
    
    // 重新聚焦
    setTimeout(() => {
      textarea.focus();
      const newPos = start + variable.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  useEffect(() => {
    fetchConfigs();
    fetchGalleryConfig();
  }, []);

  useEffect(() => {
    if (selectedConfigId) {
      fetchReplies();
    } else {
      setReplies([]);
    }
  }, [selectedConfigId]);

  const fetchConfigs = async () => {
    try {
      const [{ data: wechatData }, { data: mpData }] = await Promise.all([
        api.getWechatConfigs(),
        api.getMiniProgramConfig()
      ]);
      
      const allConfigs = [
        ...(wechatData || []).map((c: any) => ({ ...c, platform: 'wechat' })),
        ...(mpData ? [{ ...mpData, name: '小程序消息推送', platform: 'miniprogram' } as any] : [])
      ];
      
      setConfigs(allConfigs);
      if (allConfigs.length > 0 && !selectedConfigId) {
        setSelectedConfigId(allConfigs[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async () => {
    setLoading(true);
    try {
      const { data } = await api.getWechatReplies(selectedConfigId, 'keyword');
      setReplies(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingReply(null);
    setForm({
      keyword: '',
      match_type: 'exact',
      content_type: 'text',
      reply_content: '',
      category: 'none',
      is_active: true
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (reply: any) => {
    setEditingReply(reply);
    setForm({
      keyword: reply.keyword,
      match_type: reply.match_type,
      content_type: reply.content_type,
      reply_content: reply.reply_content,
      category: reply.category || 'none',
      is_active: reply.is_active
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.keyword || !form.reply_content) {
      return toast.error('请填写完整信息');
    }
    
    setSaving(true);
    try {
      const selectedConfig = configs.find(c => c.id === selectedConfigId);
      const payload = {
        ...form,
        config_id: selectedConfigId,
        platform: selectedConfig?.platform || 'wechat',
        type: 'keyword',
        ...(editingReply ? { id: editingReply.id } : {})
      };
      
      const { data, error } = await api.upsertWechatReply(payload);
      if (error) throw error;
      
      toast.success(editingReply ? '关键词已更新' : '关键词已添加');
      logAction(editingReply ? '更新关键词回复' : '添加关键词回复', payload);
      setIsDialogOpen(false);
      fetchReplies();
    } catch (error: any) {
      toast.error(`保存失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAsync('确定删除此关键词回复？', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { error } = await api.deleteWechatReply(id);
      if (error) throw error;
      toast.success('关键词已删除');
      fetchReplies();
      logAction('删除关键词回复', { id });
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
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
          <h2 className="text-3xl font-black tracking-tight">关键词回复</h2>
          <p className="text-muted-foreground mt-1">设置用户发送特定关键词时的自动回复内容</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
            <SelectTrigger className="w-[200px] rounded-xl font-bold">
              <SelectValue placeholder="选择公众号" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {configs.map(config => (
                <SelectItem key={config.id} value={config.id} className="rounded-lg">
                  {config.name} {config.platform === 'miniprogram' && '(小程序)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={fetchReplies} 
            variant="outline"
            disabled={loading || !selectedConfigId}
            className="rounded-xl font-bold h-10 px-4"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            刷新
          </Button>
          <Button 
            onClick={handleOpenAdd} 
            className="rounded-xl font-bold bg-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加关键词
          </Button>
        </div>
      </div>

      {/* 每日图集特有回复设置 */}
      <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-primary/5">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Link className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-lg font-black">每日图集回复设置</h3>
              </div>
              <p className="text-xs text-muted-foreground ml-10">设置每日图集专属密码的访问域名及展示方式</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 ml-10 md:ml-0">
              <div className="space-y-2 flex-1 min-w-[240px]">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">回复跳转域名</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://your-domain.com"
                    value={galleryConfig?.wechat_redirect_domain || ''}
                    onChange={(e) => setGalleryConfig({ ...galleryConfig, wechat_redirect_domain: e.target.value })}
                    className="h-9 rounded-xl text-xs bg-background"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => handleUpdateGalleryConfig({ wechat_redirect_domain: galleryConfig?.wechat_redirect_domain })}
                    disabled={configSaving}
                    className="rounded-xl h-9 px-4 font-bold"
                  >
                    {configSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : '保存'}
                  </Button>
                </div>
              </div>

              <Separator orientation="vertical" className="hidden sm:block h-10" />

              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    {galleryConfig?.wechat_reply_include_password !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    回复显示密码
                  </Label>
                  <p className="text-[10px] text-muted-foreground italic">
                    {galleryConfig?.wechat_reply_include_password !== false ? '回复内容中包含密码字符串' : '仅提供一键访问链接'}
                  </p>
                </div>
                <Switch 
                  checked={galleryConfig?.wechat_reply_include_password !== false}
                  onCheckedChange={(checked) => handleUpdateGalleryConfig({ wechat_reply_include_password: checked })}
                  disabled={configSaving}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-black px-6">关键词</TableHead>
                <TableHead className="font-black">匹配方式</TableHead>
                <TableHead className="font-black">回复内容</TableHead>
                <TableHead className="font-black">状态</TableHead>
                <TableHead className="font-black text-right px-6">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {replies.length > 0 ? replies.map((reply) => (
                <TableRow key={reply.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell className="font-bold px-6">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-primary" />
                      {reply.keyword}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="rounded-lg w-fit">
                        {reply.match_type === 'exact' ? '全匹配' : '模糊匹配'}
                      </Badge>
                      {reply.category && reply.category !== 'none' && (
                        <Badge className="bg-blue-500/10 text-blue-600 border-none w-fit">
                          {reply.category === 'login' ? '登录' : 
                           reply.category === 'daily_gallery' ? '每日图集' : 
                           reply.category === 'binding' ? '绑定' : 
                           reply.category === 'help' ? '帮助' : 
                           reply.category === 'check_in' ? '签到' : reply.category}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {reply.reply_content}
                  </TableCell>
                  <TableCell>
                    {reply.is_active ? (
                      <Badge className="bg-green-500/10 text-green-600 border-none">已启用</Badge>
                    ) : (
                      <Badge variant="outline">已禁用</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(reply)}
                        className="rounded-xl h-9 w-9"
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(reply.id)}
                        className="rounded-xl h-9 w-9 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-bold">暂无关键词回复配置</p>
                    <p className="text-xs mt-1">点击右上方按钮添加新的关键词规则</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{editingReply ? '编辑关键词' : '添加关键词'}</DialogTitle>
            <DialogDescription>设置触发规则及自动回复内容</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-xs">关键词</Label>
              <Input 
                placeholder="用户发送的文字" 
                value={form.keyword} 
                onChange={e => setForm({...form, keyword: e.target.value})}
                className="rounded-2xl h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-xs">匹配方式</Label>
                <Select 
                  value={form.match_type} 
                  onValueChange={v => setForm({...form, match_type: v})}
                >
                  <SelectTrigger className="rounded-2xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="exact" className="rounded-xl">全匹配</SelectItem>
                    <SelectItem value="fuzzy" className="rounded-xl">模糊匹配</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs">功能分类</Label>
                <Select 
                  value={form.category} 
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="rounded-2xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="none" className="rounded-xl">普通文本</SelectItem>
                    <SelectItem value="login" className="rounded-xl">登录</SelectItem>
                    <SelectItem value="daily_gallery" className="rounded-xl">每日图集</SelectItem>
                    <SelectItem value="random_beauty" className="rounded-xl">随机美图</SelectItem>
                    <SelectItem value="binding" className="rounded-xl">绑定</SelectItem>
                    <SelectItem value="help" className="rounded-xl">帮助</SelectItem>
                    <SelectItem value="check_in" className="rounded-xl">签到</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-xs">回复内容</Label>
                <div className="flex flex-wrap gap-1">
                  {(categoryVariables[form.category] || categoryVariables['none']).map((variable, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary" 
                      className="text-[10px] cursor-pointer hover:bg-primary/10 px-1 py-0.5"
                      onClick={() => insertVariable(variable.value)}
                    >
                      {variable.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <Textarea 
                id="reply-content-area"
                value={form.reply_content} 
                onChange={e => setForm({...form, reply_content: e.target.value})}
                placeholder="输入回复内容，支持 HTML 标签（如 <a> 标签）"
                className="rounded-2xl min-h-[120px] text-xs resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-xs">状态</Label>
              <Select 
                value={form.is_active ? 'true' : 'false'} 
                onValueChange={v => setForm({...form, is_active: v === 'true'})}
              >
                <SelectTrigger className="rounded-2xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="true" className="rounded-xl">启用</SelectItem>
                  <SelectItem value="false" className="rounded-xl">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-xs">回复内容 (暂仅支持文本)</Label>
              <Textarea 
                placeholder="请输入回复给用户的内容..." 
                value={form.reply_content} 
                onChange={e => setForm({...form, reply_content: e.target.value})}
                className="rounded-2xl min-h-[120px] resize-none py-3"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="ghost" 
              onClick={() => setIsDialogOpen(false)} 
              className="flex-1 rounded-xl h-11"
            >
              取消
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              className="flex-1 rounded-xl h-11 bg-primary font-bold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingReply ? '保存修改' : '立即添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
