import React, { useEffect, useState } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import type { AppNotification } from '@/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Bell, MessageSquare, ShieldCheck, Info, Loader2, CheckCheck, Trash2, ExternalLink, Settings, Shield, Mail, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

export default function Notifications() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const [settings, setSettings] = useState({
    audit: { in_app: true, email: true },
    system: { in_app: true, email: true },
    marketing: { in_app: true, email: false }
  });

  // 使用 Realtime 监听新通知
  useRealtimeNotifications({
    userId: user?.id,
    enabled: !!user,
    onNewNotification: (notification) => {
      // 将新通知添加到列表顶部
      setNotifications(prev => [notification, ...prev]);
    }
  });

  useEffect(() => {
    if (profile?.custom_fields?.notification_settings_v2) {
      setSettings(profile.custom_fields.notification_settings_v2);
    } else if (profile?.custom_fields?.notification_settings) {
      // 简单向后兼容
      const old = profile.custom_fields.notification_settings;
      setSettings({
        audit: { in_app: true, email: old.audit ?? true },
        system: { in_app: true, email: old.system ?? true },
        marketing: { in_app: true, email: old.marketing ?? false }
      });
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      cleanupNotifications();
    }
  }, [user]);

  const handleSaveSettings = async () => {
    if (!user) return;
    setUpdating(true);
    try {
      const { error } = await api.updateProfile(user.id, {
        custom_fields: {
          ...profile?.custom_fields,
          notification_settings_v2: settings
        }
      });
      if (error) throw error;
      toast.success('通知设置已保存');
      setIsSettingsOpen(false);
    } catch (err: any) {
      toast.error(`保存失败: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const cleanupNotifications = async () => {
    try {
      await api.cleanupOldNotifications();
    } catch (e) {
      console.error('清理过期通知失败', e);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getNotifications(user?.id);
      if (error) throw error;
      setNotifications(data || []);
    } catch (e: any) {
      toast.error('获取通知失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReadAll = async () => {
    if (!user) return;
    try {
      await api.markAllNotificationsAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('已全部标记为已读');
    } catch (e) {
      toast.error('操作失败');
    }
  };

  const handleClearRead = async () => {
    if (!user) return;
    const confirmed = await confirmAsync('确定要清空所有已读消息吗？', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      await api.deleteReadNotifications(user.id);
      setNotifications(prev => prev.filter(n => !n.is_read));
      toast.success('已清空所有已读消息');
    } catch (e) {
      toast.error('操作失败');
    }
  };

  const handleRead = async (id: string, link?: string | null, linkType?: string | null) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      if (link) {
        if (linkType === 'external') {
          window.open(link, '_blank');
        } else {
          navigate(link);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('通知已删除');
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'audit': return <ShieldCheck className="w-5 h-5 text-indigo-500" />;
      case 'admin': return <MessageSquare className="w-5 h-5 text-amber-500" />;
      case 'report': return <ShieldCheck className="w-5 h-5 text-red-500" />;
      case 'reward': return <Bell className="w-5 h-5 text-emerald-500" />;
      default: return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getLinkText = (link: string) => {
    if (link.includes('tab=approved')) return '查看已通过作品';
    if (link.includes('tab=rejected')) return '查看未通过原因';
    if (link.includes('tab=pending')) return '查看审核状态';
    if (link.includes('tab=archived')) return '查看已下架作品';
    if (link === '/profile') return '进入个人中心';
    if (link === '/upload') return '去发布新作品';
    if (link === '/check-in') return '去签到领积分';
    return '点击查看详情';
  };

  return (
    <div className="w-full min-h-screen bg-background pb-20">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full shrink-0">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-black tracking-tight">消息通知</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsSettingsOpen(true)} 
            className="text-muted-foreground font-bold text-xs gap-1.5 hover:bg-muted/30 rounded-xl px-3 h-9"
          >
            <Settings className="w-3.5 h-3.5" />
            设置
          </Button>
          {notifications.some(n => n.is_read) && (
            <Button variant="ghost" size="sm" onClick={handleClearRead} className="text-muted-foreground font-bold text-xs gap-1.5 hover:bg-muted/30 rounded-xl px-3 h-9">
              <Trash2 className="w-3.5 h-3.5" />
              清空已读
            </Button>
          )}
          {notifications.some(n => !n.is_read) && (
            <Button variant="ghost" size="sm" onClick={handleReadAll} className="text-primary font-bold text-xs gap-1.5 hover:bg-primary/5 rounded-xl px-3 h-9">
              <CheckCheck className="w-3.5 h-3.5" />
              全部已读
            </Button>
          )}
        </div>
      </header>

      <div className="pt-16 px-4 space-y-3 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
            <p className="text-xs text-muted-foreground mt-4 font-medium">正在拉取消息...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground/30">
              <Bell className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold">暂无新消息</p>
            <p className="text-[10px] opacity-60 mt-1">消息通知将在这里显示</p>
          </div>
        ) : (
          notifications.map((note) => (
            <div 
              key={note.id}
              onClick={() => handleRead(note.id, note.link, note.link_type)}
              className={cn(
                "p-5 rounded-3xl border transition-all active:scale-[0.98] cursor-pointer relative overflow-hidden group",
                note.is_read 
                  ? "bg-muted/10 border-border/30 grayscale-[0.3]" 
                  : "bg-card border-primary/10 shadow-sm shadow-primary/5"
              )}
            >
              {!note.is_read && (
                <div className="absolute top-4 left-4 w-2 h-2 bg-primary rounded-full animate-pulse shadow-sm shadow-primary/50" />
              )}
              
              <div className="flex gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                  note.type === 'audit' ? "bg-indigo-500/10" : note.type === 'admin' ? "bg-amber-500/10" : "bg-blue-500/10"
                )}>
                  {getTypeIcon(note.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className={cn(
                        "text-sm font-black truncate leading-tight",
                        note.is_read ? "text-foreground/70" : "text-foreground"
                      )}>
                        {note.title}
                      </h3>
                      {note.count && note.count > 1 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-bold">
                          {note.count}条
                        </Badge>
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground/50 font-mono whitespace-nowrap">
                      {new Date(note.created_at).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}
                    </span>
                  </div>
                  <p className={cn(
                    "text-xs leading-relaxed line-clamp-2",
                    note.is_read ? "text-muted-foreground/70" : "text-muted-foreground font-medium"
                  )}>
                    {note.content}
                  </p>
                  
                  <div className="mt-3 flex items-center justify-between">
                    {note.link && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary bg-primary/5 px-2.5 py-1.5 rounded-xl group-hover:bg-primary/10 transition-all border border-primary/10 group-hover:shadow-sm">
                        {getLinkText(note.link)}
                        {note.link_type === 'external' ? <ExternalLink className="w-2.5 h-2.5" /> : <ChevronLeft className="w-2.5 h-2.5 rotate-180" />}
                      </div>
                    )}
                    <div className="flex-1" />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => handleDelete(note.id, e)}
                      className="h-8 w-8 rounded-full text-muted-foreground/30 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <NotificationSettingsDialog 
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        settings={settings}
        onSettingsChange={setSettings}
        onSave={handleSaveSettings}
        loading={updating}
      />
    </div>
  );
}

function NotificationSettingsDialog({ isOpen, onOpenChange, settings, onSettingsChange, onSave, loading }: { 
  isOpen: boolean, 
  onOpenChange: (open: boolean) => void,
  settings: any,
  onSettingsChange: (s: any) => void,
  onSave: () => void,
  loading: boolean
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] rounded-3xl p-0 border-none bg-background overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-black">通知偏好设置</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">定制您的消息接收方式</DialogDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
          {/* 审核通知 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <Label className="text-sm font-black">作品审核</Label>
              <Badge variant="secondary" className="ml-auto text-[8px] h-4 bg-primary/5 text-primary border-none">推荐</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SettingCard 
                icon={<Smartphone className="w-3.5 h-3.5" />} 
                title="站内消息" 
                checked={settings.audit.in_app} 
                onChange={(val) => onSettingsChange({ ...settings, audit: { ...settings.audit, in_app: val } })}
              />
              <SettingCard 
                icon={<Mail className="w-3.5 h-3.5" />} 
                title="邮件提醒" 
                checked={settings.audit.email} 
                onChange={(val) => onSettingsChange({ ...settings, audit: { ...settings.audit, email: val } })}
              />
            </div>
          </div>

          {/* 系统通知 - 必选 */}
          <div className="space-y-4 opacity-80">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Bell className="w-4 h-4" />
              </div>
              <Label className="text-sm font-black">系统通知</Label>
              <Badge variant="secondary" className="ml-auto text-[8px] h-4 bg-amber-500/10 text-amber-600 border-none">核心服务</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SettingCard 
                icon={<Smartphone className="w-3.5 h-3.5" />} 
                title="站内消息" 
                checked={true} 
                disabled={true}
                onChange={() => {}}
              />
              <SettingCard 
                icon={<Mail className="w-3.5 h-3.5" />} 
                title="邮件提醒" 
                checked={true} 
                disabled={true}
                onChange={() => {}}
              />
            </div>
            <p className="text-[9px] text-muted-foreground italic px-1">* 官方系统通知涉及账号安全与积分变动，为必选项。</p>
          </div>

          {/* 活动资讯 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Info className="w-4 h-4" />
              </div>
              <Label className="text-sm font-black">活动资讯</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SettingCard 
                icon={<Smartphone className="w-3.5 h-3.5" />} 
                title="站内消息" 
                checked={settings.marketing.in_app} 
                onChange={(val) => onSettingsChange({ ...settings, marketing: { ...settings.marketing, in_app: val } })}
              />
              <SettingCard 
                icon={<Mail className="w-3.5 h-3.5" />} 
                title="邮件提醒" 
                checked={settings.marketing.email} 
                onChange={(val) => onSettingsChange({ ...settings, marketing: { ...settings.marketing, email: val } })}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 border-t mt-2">
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-2xl font-bold h-12">取消</Button>
            <Button 
              onClick={onSave} 
              disabled={loading} 
              className="rounded-2xl font-bold h-12 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              保存设置
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingCard({ icon, title, checked, onChange, disabled = false }: { 
  icon: React.ReactNode, 
  title: string, 
  checked: boolean, 
  onChange: (val: boolean) => void,
  disabled?: boolean
}) {
  return (
    <div 
      className={cn(
        "flex items-center justify-between p-3 rounded-2xl border transition-all",
        checked ? "bg-primary/5 border-primary/20" : "bg-muted/10 border-border/40",
        disabled && "opacity-60 cursor-not-allowed"
      )}
      onClick={() => !disabled && onChange(!checked)}
    >
      <div className="flex items-center gap-2">
        <div className={cn("text-muted-foreground", checked && "text-primary")}>{icon}</div>
        <span className={cn("text-xs font-bold text-muted-foreground", checked && "text-foreground")}>{title}</span>
      </div>
      <div className={cn(
        "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
        checked ? "bg-primary border-primary" : "border-muted-foreground/30"
      )}>
        {checked && <CheckCheck className="w-2.5 h-2.5 text-white" />}
      </div>
    </div>
  );
}
