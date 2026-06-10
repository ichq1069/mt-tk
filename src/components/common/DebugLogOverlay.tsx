import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfig } from '@/contexts/ConfigContext';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Bug, RefreshCw, Trash2, Eye, EyeOff, Play, Pause, Video, Send, Loader2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { logCollector, type LogEntry } from '@/lib/logCollector';

// 保持向后兼容，如果其他地方引用了 debugLogEmitter
export const debugLogEmitter = {
  add(log: any) {
    logCollector.addLog({
      type: 'log',
      message: `Image: ${log.url}`,
      data: log
    });
  },
  subscribe(listener: any) {
    return logCollector.subscribe(listener);
  },
  clear() {
    logCollector.clear();
  }
};

export const DebugLogOverlay: React.FC = () => {
  const { user, profile, isAdmin: authIsAdmin } = useAuth();
  const { config, debugSettings } = useConfig();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimeLeft, setRecordTimeLeft] = useState(60);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [copied, setCopied] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const isDebugUser = debugSettings?.is_enabled && ((authIsAdmin || profile?.role === 'admin') || !!profile?.is_debug_enabled);
  const isNonAdminDebug = debugSettings?.is_enabled && !!profile?.is_debug_enabled && !authIsAdmin && profile?.role !== 'admin';

  useEffect(() => {
    if (user?.id) {
      logCollector.setUserId(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isDebugUser) return;
    
    // 订阅全局日志
    const unsubscribe = logCollector.subscribe((newLogs) => {
      if (!isPaused) {
        setLogs([...newLogs]);
      }
    });
    
    return unsubscribe;
  }, [isDebugUser, isPaused]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording && recordTimeLeft > 0) {
      timer = setInterval(() => {
        setRecordTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (recordTimeLeft === 0 && isRecording) {
      handleStopRecording();
    }
    return () => clearInterval(timer);
  }, [isRecording, recordTimeLeft]);

  const startRecording = () => {
    setIsRecording(true);
    setRecordTimeLeft(60);
    logCollector.startSessionRecording();
    toast.info('开始录制调试会话，请操作页面，1分钟后自动停止并提交');
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    
    if (isNonAdminDebug) {
      setIsSubmittingFeedback(true);
      // submitFullSession 内部会自动调用 stopSessionRecording 并捕获当前所有事件
      const success = await logCollector.submitFullSession('非管理员自动提交调试日志');
      if (success) {
        toast.success('调试日志已提交后台');
      } else {
        toast.error('日志提交失败');
      }
      setIsSubmittingFeedback(false);
    } else {
      logCollector.stopSessionRecording();
      setShowFeedbackModal(true);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackContent.trim()) {
      toast.error('请输入反馈内容');
      return;
    }
    setIsSubmittingFeedback(true);
    const success = await logCollector.submitFullSession(feedbackContent);
    if (success) {
      toast.success('感谢您的反馈，日志与操作视频已提交后台');
      setShowFeedbackModal(false);
      setFeedbackContent('');
    } else {
      toast.error('反馈提交失败');
    }
    setIsSubmittingFeedback(false);
  };

  const copyLogs = () => {
    const text = logs.map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('日志已复制到剪贴板');
  };

  if (!isDebugUser || !isVisible) {
    if (isDebugUser && !isVisible) {
      return (
        <Button 
          variant="ghost" 
          size="icon" 
          className="fixed bottom-24 right-4 z-[10006] bg-background/80 backdrop-blur border rounded-full shadow-lg h-10 w-10"
          onClick={() => setIsVisible(true)}
        >
          <Bug className="h-4 w-4" />
        </Button>
      );
    }
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 z-[10006] flex flex-col items-end gap-2">
      <AnimatePresence>
        {isOpen && !isNonAdminDebug && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-[400px] max-w-[95vw] h-[500px]"
          >
            <Card className="h-full border-primary/20 shadow-2xl overflow-hidden flex flex-col">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-bold">开发调试日志</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7" 
                    onClick={copyLogs}
                    title="复制日志"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("h-7 w-7", isPaused ? "text-amber-500" : "text-green-500")} 
                    onClick={() => setIsPaused(!isPaused)}
                    title={isPaused ? "开启日志" : "暂停日志"}
                  >
                    {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("h-7 w-7", isRecording ? "text-red-500 animate-pulse" : "text-slate-400")} 
                    onClick={isRecording ? handleStopRecording : startRecording}
                    title={isRecording ? `录制中 (${recordTimeLeft}s)` : "录制会话重放"}
                  >
                    <Video className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => logCollector.clear()}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsVisible(false)}>
                    <EyeOff className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-2">
                    {logs.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground text-xs italic">
                        暂无日志数据，开始浏览页面以捕获...
                      </div>
                    ) : (
                      logs.map((log) => (
                        <div key={log.id} className={cn(
                          "p-2 rounded-lg text-[10px] space-y-1 border",
                          log.type === 'error' ? "bg-red-500/10 border-red-500/20" :
                          log.type === 'warn' ? "bg-amber-500/10 border-amber-500/20" :
                          log.type === 'network' ? "bg-blue-500/10 border-blue-500/20" :
                          "bg-muted/50 border-border/50"
                        )}>
                          <div className="flex items-center justify-between gap-2 overflow-hidden">
                            <span className="font-mono text-muted-foreground shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <Badge variant="outline" className={cn(
                              "text-[9px] px-1 h-4",
                              log.type === 'error' ? "text-red-500 border-red-500/20" :
                              log.type === 'network' ? "text-blue-500 border-blue-500/20" :
                              "text-muted-foreground"
                            )}>
                              {log.type.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="font-mono break-all line-clamp-3" title={log.message}>
                            {log.message}
                          </div>
                          <div className="text-primary/70 italic text-[9px] truncate">
                            页面: {log.page}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>提交反馈与日志</DialogTitle>
            <DialogDescription>
              日志与操作会话已捕获。请描述您遇到的问题，我们将尽快处理。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="请输入您遇到的具体问题描述..."
              className="min-h-[120px] rounded-2xl resize-none"
              value={feedbackContent}
              onChange={(e) => setFeedbackContent(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowFeedbackModal(false)} className="rounded-xl">取消</Button>
            <Button 
              onClick={submitFeedback} 
              disabled={isSubmittingFeedback}
              className="rounded-xl bg-primary text-white"
            >
              {isSubmittingFeedback ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              提交反馈
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button 
        variant={isOpen || isRecording ? "default" : "outline"} 
        size="sm" 
        className={cn(
          "rounded-full shadow-lg h-10 px-4 gap-2 backdrop-blur-md transition-all duration-300",
          (isOpen || isRecording) ? "bg-primary text-primary-foreground" : "bg-background/80"
        )}
        onClick={() => {
          if (isNonAdminDebug) {
            if (isRecording) handleStopRecording();
            else startRecording();
          } else {
            setIsOpen(!isOpen);
          }
        }}
        disabled={isSubmittingFeedback}
      >
        <Bug className={cn("h-4 w-4", (isOpen || isRecording) && "animate-pulse", isRecording && "text-red-500")} />
        <span className="text-xs font-bold">
          {isNonAdminDebug 
            ? (isRecording ? `停止并提交 (${recordTimeLeft}s)` : '开启调试模式')
            : (isRecording ? `录制中 (${recordTimeLeft}s)` : `调试日志 (${logs.length})`)
          }
        </span>
      </Button>
    </div>
  );
};
