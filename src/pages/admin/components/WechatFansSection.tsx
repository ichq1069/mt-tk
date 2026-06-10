import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { 
  Loader2, Search, User, RefreshCw, Filter, 
  ChevronLeft, ChevronRight, Info, ExternalLink, Copy, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { formatBeijingTime } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

export function WechatFansSection() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [fans, setFans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [nextOpenid, setNextOpenid] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [viewingFan, setViewingFan] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data } = await api.getWechatConfigs();
      setConfigs(data || []);
      if (data && data.length > 0) {
        setSelectedConfigId('all');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchFans = async (clear = true) => {
    if (!selectedConfigId) return;
    setLoading(true);
    try {
      const { data, total: totalCount } = await api.getWechatFans(
        selectedConfigId === 'all' ? undefined : selectedConfigId,
        0, 
        100,
        search
      );
      
      setFans(data || []);
      setTotal(totalCount || 0);
    } catch (error: any) {
      toast.error(`获取粉丝失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFans();
  }, [selectedConfigId, search]);

  const handleSyncFans = async (mode: 'full' | 'incremental' = 'full') => {
    if (!selectedConfigId || selectedConfigId === 'all') {
      toast.error('请先选择具体的一个公众号进行同步');
      return;
    }
    setSyncing(true);
    try {
      const modeText = mode === 'full' ? '全量' : '增量';
      toast.info(`正在请求微信 API ${modeText}同步粉丝，请稍候...`);
      const { data, error } = await api.syncWechatFans(selectedConfigId, mode);
      
      if (error) {
        const msg = typeof error?.context?.text === 'function' ? await error.context.text() : error?.message;
        throw new Error(msg);
      }
      
      if (data?.success) {
        toast.success(data.message || `粉丝列表${modeText}同步完成`);
        fetchFans();
      } else {
        throw new Error(data?.message || '同步失败');
      }
    } catch (error: any) {
      toast.error(`同步失败: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyOpenid = (openid: string) => {
    navigator.clipboard.writeText(openid);
    setCopiedId(openid);
    toast.success('OpenID 已复制到剪贴板');
    setTimeout(() => setCopiedId(null), 2000);
  };


  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">公众号粉丝管理</h2>
          <p className="text-muted-foreground mt-1">查看并同步已关注公众号的用户信息</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
            <SelectTrigger className="w-[200px] rounded-xl font-bold">
              <SelectValue placeholder="选择公众号" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="rounded-lg">全部粉丝</SelectItem>
              {configs.map(config => (
                <SelectItem key={config.id} value={config.id} className="rounded-lg">
                  {config.name}
                </SelectItem>
              ))}
              {configs.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">暂无微信配置</div>}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button 
              variant="default" 
              size="sm"
              onClick={() => handleSyncFans('full')} 
              disabled={syncing || !selectedConfigId || selectedConfigId === 'all'}
              className="rounded-xl font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 h-10 px-4"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              全量入库
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => handleSyncFans('incremental')} 
              disabled={syncing || !selectedConfigId || selectedConfigId === 'all'}
              className="rounded-xl font-bold gap-2 h-10 px-4"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              增量入库
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-3 rounded-3xl border-none shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border/40 bg-muted/10 flex items-center justify-between">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="搜索 OpenID 或昵称..." 
                className="pl-9 rounded-xl h-9 text-xs border-none bg-white shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
               <span className="text-xs text-muted-foreground">共 {total} 名粉丝</span>
            </div>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6 font-black">微信用户</TableHead>
                  <TableHead className="font-black">OpenID</TableHead>
                  <TableHead className="font-black">绑定平台用户</TableHead>
                  <TableHead className="font-black">最近活动</TableHead>
                  <TableHead className="font-black text-right pr-6">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
                      <p className="text-sm font-bold text-muted-foreground">正在加载粉丝数据...</p>
                    </TableCell>
                  </TableRow>
                ) : fans.length > 0 ? fans.map((fan) => (
                  <TableRow key={fan.openid} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary overflow-hidden">
                          {fan.avatar_url ? (
                            <img referrerPolicy="no-referrer" src={fan.avatar_url} alt={fan.nickname} className="w-full h-full object-contain" />
                          ) : (
                            <User className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span 
                              className="font-bold text-sm cursor-pointer hover:text-primary transition-colors flex items-center gap-1 group/nick" 
                              onClick={() => handleCopyOpenid(fan.openid)}
                              title="点击复制 OpenID"
                            >
                              {(!fan.display_nickname || fan.display_nickname === 'unknown_user') 
                                ? (!fan.openid || fan.openid === 'unknown_user' ? '未关注' : fan.openid) 
                                : fan.display_nickname}
                              <Copy className="w-2.5 h-2.5 text-muted-foreground/30 opacity-0 group-hover/nick:opacity-100 transition-opacity shrink-0" />
                            </span>
                            {fan.unsubscribe_count > 0 && (
                              <Badge variant="outline" className="text-[9px] px-1 h-3.5 border-amber-500 text-amber-600 font-bold bg-amber-50 animate-pulse">
                                二次关注
                              </Badge>
                            )}
                            {fan.subscribe_status === false && (
                              <Badge variant="outline" className="text-[9px] px-1 h-3.5 border-red-500 text-red-600 font-bold bg-red-50">
                                已取关
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {fan.subscribe_scene === 'ADD_SCENE_QR_CODE' ? '扫码关注' : '普通关注'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 group/openid cursor-pointer" onClick={() => handleCopyOpenid(fan.openid)}>
                        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{fan.openid}</code>
                        {copiedId === fan.openid ? (
                          <Check className="w-2.5 h-2.5 text-green-500" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-muted-foreground/30 opacity-0 group-hover/openid:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {fan.platform_username ? (
                        <Badge variant="default" className="bg-indigo-500 rounded-lg text-[10px] py-0 px-2 font-bold">
                          {fan.platform_username}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">未绑定</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatBeijingTime(fan.last_active_at)}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="sm" onClick={() => setViewingFan(fan)} className="rounded-xl h-8 text-xs font-bold text-primary hover:bg-primary/10">
                        查看详情
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center text-muted-foreground">
                      <User className="w-12 h-12 mx-auto mb-4 opacity-10" />
                      <p className="text-lg font-black">未发现粉丝记录</p>
                      <p className="text-xs mt-1">请尝试点击“同步粉丝”获取最新关注列表</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                同步说明
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                1. 粉丝同步功能仅支持已认证的服务号。<br/>
                2. <b>全量入库</b>：获取公众号全量 OpenID 列表并更新所有信息。<br/>
                3. <b>增量入库</b>：仅获取最新一批（10,000名）关注者的信息，效率更高。<br/>
                4. 系统会自动拉取关注用户的基本信息并标记二次关注状态。
              </p>
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-600">
                  <Badge variant="outline" className="h-4 border-amber-600/30 text-[9px] text-amber-600">限制</Badge>
                  <span className="text-[11px] font-black">微信 API 限制</span>
                </div>
                <p className="text-[10px] text-amber-600/70 leading-relaxed">
                  微信接口限制每日获取用户列表的次数，请勿频繁同步。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!viewingFan} onOpenChange={(open) => !open && setViewingFan(null)}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          {viewingFan && (
            <div className="flex flex-col h-full max-h-[85vh]">
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                <div className="flex flex-col items-center relative z-10">
                  <div className="w-24 h-24 rounded-full border-4 border-white/20 p-1 bg-white/10 mb-4 overflow-hidden">
                    {viewingFan.avatar_url ? (
                      <img referrerPolicy="no-referrer" src={viewingFan.avatar_url} alt={viewingFan.nickname} className="w-full h-full rounded-full object-contain" />
                    ) : (
                      <div className="w-full h-full rounded-full flex items-center justify-center bg-white/20">
                        <User className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-black">{viewingFan.nickname || '未同步昵称'}</h3>
                  <div className="flex items-center gap-2 mt-2 group/openid cursor-pointer" onClick={() => handleCopyOpenid(viewingFan.openid)}>
                    <code className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-mono text-white/80">{viewingFan.openid}</code>
                    {copiedId === viewingFan.openid ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-white/40 opacity-0 group-hover/openid:opacity-100 transition-opacity" />
                    )}
                  </div>
                  {viewingFan.subscribe_status === false && (
                    <Badge variant="outline" className="mt-3 border-red-400 text-red-100 bg-red-400/20 rounded-full font-bold">已取关</Badge>
                  )}
                  {viewingFan.unsubscribe_count > 0 && (
                    <Badge variant="outline" className="mt-3 border-amber-400 text-amber-100 bg-amber-400/20 rounded-full font-bold">二次关注 ({viewingFan.unsubscribe_count}次取关)</Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="p-6">
                <div className="space-y-6">
                  {/* 基本资料 */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      微信基本资料
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">性别</p>
                        <p className="text-sm font-bold">{viewingFan.sex === 1 ? '男' : viewingFan.sex === 2 ? '女' : '未知'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">地区</p>
                        <p className="text-sm font-bold">
                          {[viewingFan.country, viewingFan.province, viewingFan.city].filter(Boolean).join(' - ') || '未知'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">关注时间</p>
                        <p className="text-sm font-bold">
                          {formatBeijingTime(viewingFan.subscribe_time)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">最后活跃</p>
                        <p className="text-sm font-bold">
                          {formatBeijingTime(viewingFan.last_active_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-muted/40" />

                  {/* platform binding */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                      平台绑定信息
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border shadow-sm">
                            {viewingFan.profile_avatar_url ? (
                              <img referrerPolicy="no-referrer" src={viewingFan.profile_avatar_url} alt="profile" className="w-full h-full rounded-full object-contain" />
                            ) : (
                              <User className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] text-muted-foreground">绑定账号</p>
                            <p className="text-sm font-black">{viewingFan.platform_username || '未绑定平台用户'}</p>
                          </div>
                        </div>
                        {viewingFan.user_id && (
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold rounded-lg" onClick={() => toast.info('跳转到用户管理')}>
                            管理
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-muted/40" />

                  {/* 推广来源 */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      推广来源与备注
                    </h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">关注场景</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="secondary" className="rounded-lg text-[10px] border-none bg-emerald-500/10 text-emerald-600">
                            {viewingFan.subscribe_scene === 'ADD_SCENE_QR_CODE' ? '扫描二维码' : viewingFan.subscribe_scene || '直接关注'}
                          </Badge>
                          {viewingFan.qr_scene_str && (
                            <Badge variant="outline" className="rounded-lg text-[10px] border-emerald-200 text-emerald-600 bg-white">
                              场景值: {viewingFan.qr_scene_str}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 pt-2">
                        <p className="text-[10px] text-muted-foreground">管理员备注</p>
                        <p className="text-sm italic text-muted-foreground/80 bg-muted/10 p-3 rounded-xl border border-dashed border-muted">
                          {viewingFan.remark || '暂无内部备注信息'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
              
              <div className="p-6 pt-2 flex items-center gap-3 border-t bg-muted/5 mt-auto">
                <Button variant="ghost" className="flex-1 rounded-2xl h-12 font-bold" onClick={() => setViewingFan(null)}>
                  关闭详情
                </Button>
                <Button className="flex-1 rounded-2xl h-12 font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20" onClick={() => toast.info('发送消息功能开发中')}>
                  发送消息
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
