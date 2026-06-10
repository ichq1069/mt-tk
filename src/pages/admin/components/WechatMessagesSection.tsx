import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { 
  Loader2, Search, User, Calendar, 
  ArrowRight, MessageSquare, Info, Copy, Check, History, X
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnhancedPagination } from '@/components/common/EnhancedPagination';
import { formatBeijingTime } from '@/lib/utils';

export function WechatMessagesSection() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('all');
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [searchOpenid, setSearchOpenid] = useState('');

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const limit = 15;

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [selectedConfigId, page, searchOpenid]);

  const fetchConfigs = async () => {
    try {
      const { data } = await api.getWechatConfigs();
      setConfigs(data || []);
    } catch (error) {
      console.error(error);
    }
  };
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const configId = selectedConfigId === "all" ? undefined : selectedConfigId;
      const { data, total: totalCount } = await api.getWechatMessages(configId, page, limit, searchOpenid);
      
      const results = data || [];
      const totalItems = totalCount || 0;

      if (results.length === 0 && totalItems > 0 && page > 0) {
        setPage(Math.max(0, Math.ceil(totalItems / limit) - 1));
        return;
      }

      setMessages(results);
      setTotal(totalItems);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChatHistory = async (msg: any) => {
    setSelectedChatUser(msg);
    setShowChatDialog(true);
    setChatLoading(true);
    try {
      const { data } = await api.getWechatMessages(msg.config_id, 0, 50, msg.from_user);
      setChatHistory((data || []).reverse());
    } catch (error) {
      console.error(error);
      toast.error('获取对话记录失败');
    } finally {
      setChatLoading(false);
    }
  };
  const handleCopyOpenid = (openid: string) => {
    navigator.clipboard.writeText(openid);
    setCopiedId(openid);
    toast.success('OpenID 已复制到剪贴板');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getMsgTypeBadge = (type: string) => {
    switch (type) {
      case 'text': return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">文本</Badge>;
      case 'event': return <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100">事件</Badge>;
      case 'image': return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">图片</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getEventLabel = (msg: any) => {
    if (msg.msg_type !== 'event') return null;
    switch (msg.event) {
      case 'subscribe': return <span className="text-green-600 font-bold">关注公众号</span>;
      case 'unsubscribe': return <span className="text-muted-foreground">取消关注</span>;
      case 'CLICK': return <span>点击菜单: <code className="bg-muted px-1 rounded">{msg.event_key}</code></span>;
      case 'VIEW': return <span>点击链接: <code className="bg-muted px-1 rounded">{msg.event_key}</code></span>;
      default: return <span>事件: {msg.event}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">微信消息列表</h2>
          <p className="text-muted-foreground mt-1">查看公众号用户交互流水，包括关注、消息和自动回复记录</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group/search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within/search:text-primary transition-colors" />
            <input 
              placeholder="搜索 OpenID..." 
              className="h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-xs focus:ring-1 focus:ring-primary outline-none transition-all w-[200px]"
              value={searchOpenid}
              onChange={(e) => { setSearchOpenid(e.target.value); setPage(0); }}
            />
          </div>
          <Select value={selectedConfigId} onValueChange={(v) => { setSelectedConfigId(v); setPage(0); }}>
            <SelectTrigger className="w-[180px] rounded-xl font-bold">
              <SelectValue placeholder="全部公众号" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="rounded-lg font-bold">全部公众号</SelectItem>
              {configs.map(config => (
                <SelectItem key={config.id} value={config.id} className="rounded-lg">
                  {config.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchMessages} 
            disabled={loading}
            className="rounded-xl h-10 w-10"
          >
            <MessageSquare className={loading ? "animate-spin" : "w-4 h-4"} />
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-black px-6 w-48">发送者 (OpenID)</TableHead>
                <TableHead className="font-black">所属公众号</TableHead>
                <TableHead className="font-black">消息类型</TableHead>
                <TableHead className="font-black">内容/事件</TableHead>
                <TableHead className="font-black">系统回复</TableHead>
                <TableHead className="font-black w-40">时间</TableHead>
                <TableHead className="font-black w-32">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && messages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground font-bold">正在加载交互记录...</p>
                  </TableCell>
                </TableRow>
              ) : messages.length > 0 ? messages.map((msg) => (
                <TableRow key={msg.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell className="px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span 
                            className="text-xs font-bold truncate max-w-[120px] group/nick cursor-pointer flex items-center gap-1 hover:text-primary transition-colors" 
                            onClick={() => handleCopyOpenid(msg.from_user)}
                            title="点击复制 OpenID"
                          >
                            {(!msg.display_nickname || msg.display_nickname === 'unknown_user') 
                              ? (!msg.from_user || msg.from_user === 'unknown_user' ? '未关注' : msg.from_user) 
                              : msg.display_nickname}
                            <Copy className="w-2.5 h-2.5 text-muted-foreground/30 opacity-0 group-hover/nick:opacity-100 transition-opacity shrink-0" />
                          </span>
                          <div className="flex items-center gap-1 group/openid cursor-pointer" onClick={() => handleCopyOpenid(msg.from_user)}>
                            <span className="text-[9px] font-mono text-muted-foreground/50 truncate max-w-[100px]">
                              {msg.from_user}
                            </span>
                            {copiedId === msg.from_user ? (
                              <Check className="w-2.5 h-2.5 text-green-500" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 text-muted-foreground/30 opacity-0 group-hover/openid:opacity-100 transition-opacity" />
                            )}
                          </div>
                        </div>
                      </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-black border-primary/20 bg-primary/5 text-primary">
                      {msg.config_name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getMsgTypeBadge(msg.msg_type)}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="text-xs">
                      {msg.msg_type === 'text' ? (
                        <div className="flex items-start gap-2">
                           <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-primary/50" />
                           <span className="font-bold">{msg.content}</span>
                        </div>
                      ) : getEventLabel(msg)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {msg.reply_content ? (
                      <div className="flex items-start gap-2 text-[11px] text-green-600 bg-green-500/5 p-2 rounded-lg border border-green-500/10">
                        <ArrowRight className="w-3.5 h-3.5 mt-0.5" />
                        <span>{msg.reply_content}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/40 italic">无自动回复</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatBeijingTime(msg.created_at)}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleOpenChatHistory(msg)}
                      className="h-8 rounded-lg flex items-center gap-1.5 text-primary hover:bg-primary/5 font-bold"
                    >
                      <History className="w-3.5 h-3.5" />
                      对话记录
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-bold text-lg">暂无交互消息记录</p>
                    <p className="text-xs mt-1">公众号配置生效后，用户的交互记录将实时显示在这里</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 分页 */}
      {total > limit && (
        <div className="flex items-center justify-center p-6 border-t">
          <EnhancedPagination 
            currentPage={page} 
            totalPages={Math.ceil(total / limit)} 
            onPageChange={setPage} 
            pageSize={limit} 
            onPageSizeChange={() => {}} 
            totalItems={total} 
            showPageSizeSelector={false} 
            className="bg-transparent border-none p-0" 
          />
        </div>
      )}
      {/* 对话记录弹窗 */}
      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent flex flex-row items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                对话追踪：{selectedChatUser?.display_nickname || selectedChatUser?.from_user}
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-muted-foreground mt-0.5">
                展示用户 {selectedChatUser?.from_user} 最近的 50 条交互记录
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-[400px] max-h-[60vh] bg-slate-50/50 p-6 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              {chatLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                  <p className="font-bold">正在同步历史消息...</p>
                </div>
              ) : chatHistory.length > 0 ? (
                <div className="space-y-6 pb-6">
                  {chatHistory.map((item, idx) => (
                    <div key={idx} className="space-y-3">
                      {/* 用户消息 */}
                      <div className="flex items-start gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-slate-900">
                              {item.display_nickname}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {formatBeijingTime(item.created_at)}
                            </span>
                            <Badge variant="outline" className="text-[8px] h-3.5 px-1 font-black bg-white/50">
                              {item.msg_type === 'text' ? '文本' : '事件'}
                            </Badge>
                          </div>
                          <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm max-w-[85%] inline-block">
                            <p className="text-sm font-medium text-slate-800 break-all leading-relaxed">
                              {item.msg_type === 'text' ? item.content : (
                                <span className="flex flex-col gap-1">
                                  <span className="font-black text-primary italic">触发事件：{item.event}</span>
                                  {item.event_key && <span className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded italic opacity-70">参数: {item.event_key}</span>}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 系统回复 */}
                      {item.reply_content && (
                        <div className="flex flex-row-reverse items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/10">
                            <Info className="w-4 h-4" />
                          </div>
                          <div className="flex-1 flex flex-col items-end space-y-1.5">
                            <div className="flex items-center gap-2 flex-row-reverse">
                              <span className="text-[11px] font-black text-primary">系统自动回复</span>
                              <span className="text-[9px] text-muted-foreground font-mono">
                                {item.replied_at ? formatBeijingTime(item.replied_at) : '实时'}
                              </span>
                            </div>
                            <div className="bg-primary/5 p-3 rounded-2xl rounded-tr-none border border-primary/20 shadow-sm max-w-[85%] inline-block">
                              <p className="text-sm font-bold text-primary break-all leading-relaxed italic">
                                "{item.reply_content}"
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center">
                  <MessageSquare className="w-12 h-12 mb-4 opacity-10" />
                  <p className="font-bold">暂无详细交互记录</p>
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50/80">
            <Button 
              variant="outline" 
              onClick={() => setShowChatDialog(false)}
              className="rounded-xl px-8 font-black border-slate-200"
            >
              关闭视图
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
