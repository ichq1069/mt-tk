import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Volume2, 
  Monitor, 
  Moon, 
  Zap, 
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import type { NotificationPreferences } from '@/lib/notification-preferences';
import { defaultNotificationPreferences } from '@/lib/notification-preferences';
import { desktopNotification } from '@/lib/desktop-notification';
import { notificationSound } from '@/lib/notification-sound';
import { enhancedNotification } from '@/lib/enhanced-notification';

interface NotificationPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPreferencesDialog({ open, onOpenChange }: NotificationPreferencesDialogProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [saving, setSaving] = useState(false);
  const [desktopPermission, setDesktopPermission] = useState<'granted' | 'denied' | 'default'>('default');

  // 加载用户偏好
  useEffect(() => {
    if (profile?.custom_fields?.notification_preferences) {
      setPreferences(profile.custom_fields.notification_preferences);
    }
    
    // 检查桌面通知权限
    if (desktopNotification.isSupported()) {
      setDesktopPermission(desktopNotification.getPermission());
    }
  }, [profile]);

  // 请求桌面通知权限
  const handleRequestDesktopPermission = async () => {
    const permission = await desktopNotification.requestPermission();
    setDesktopPermission(permission);
    
    if (permission === 'granted') {
      toast.success('桌面通知权限已授予');
      // 显示测试通知
      await desktopNotification.show({
        title: '✅ 权限已授予',
        body: '您将收到桌面通知',
      });
    } else {
      toast.error('桌面通知权限被拒绝');
    }
  };

  // 测试声音
  const handleTestSound = (type: 'success' | 'error' | 'info' | 'warning') => {
    notificationSound.setVolume(preferences.sound.volume);
    notificationSound.setEnabled(true);
    
    switch (type) {
      case 'success':
        notificationSound.playSuccess();
        break;
      case 'error':
        notificationSound.playError();
        break;
      case 'info':
        notificationSound.playInfo();
        break;
      case 'warning':
        notificationSound.playWarning();
        break;
    }
  };

  // 测试通知
  const handleTestNotification = async () => {
    // 临时应用当前设置
    enhancedNotification.setPreferences(preferences);
    
    await enhancedNotification.show({
      title: '🎉 测试通知',
      description: '这是一条测试通知，用于预览效果',
      type: 'success',
      duration: 3000,
    });
  };

  // 保存设置
  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await api.updateProfile(user.id, {
        custom_fields: {
          ...profile?.custom_fields,
          notification_preferences: preferences,
        }
      });
      
      if (error) throw error;
      
      // 应用新设置
      enhancedNotification.setPreferences(preferences);
      
      toast.success('通知偏好已保存');
      await refreshProfile();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`保存失败: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 重置为默认设置
  const handleReset = () => {
    setPreferences(defaultNotificationPreferences);
    toast.info('已重置为默认设置');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            通知偏好设置
          </DialogTitle>
          <DialogDescription>
            自定义您的通知体验，包括声音、桌面通知和免打扰模式
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">通用</TabsTrigger>
            <TabsTrigger value="sound">声音</TabsTrigger>
            <TabsTrigger value="desktop">桌面</TabsTrigger>
            <TabsTrigger value="advanced">高级</TabsTrigger>
          </TabsList>

          {/* 通用设置 */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">全局开关</CardTitle>
                <CardDescription>控制所有通知的总开关</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>启用通知</Label>
                    <p className="text-sm text-muted-foreground">
                      关闭后将不会收到任何通知
                    </p>
                  </div>
                  <Switch
                    checked={preferences.enabled}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, enabled: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">应用内通知</CardTitle>
                <CardDescription>在应用内显示的通知</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>启用应用内通知</Label>
                  <Switch
                    checked={preferences.inApp.enabled}
                    onCheckedChange={(checked) =>
                      setPreferences({
                        ...preferences,
                        inApp: { ...preferences.inApp, enabled: checked }
                      })
                    }
                    disabled={!preferences.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>播放声音</Label>
                  <Switch
                    checked={preferences.inApp.sound}
                    onCheckedChange={(checked) =>
                      setPreferences({
                        ...preferences,
                        inApp: { ...preferences.inApp, sound: checked }
                      })
                    }
                    disabled={!preferences.enabled || !preferences.inApp.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>动画效果</Label>
                  <Switch
                    checked={preferences.inApp.animation}
                    onCheckedChange={(checked) =>
                      setPreferences({
                        ...preferences,
                        inApp: { ...preferences.inApp, animation: checked }
                      })
                    }
                    disabled={!preferences.enabled || !preferences.inApp.enabled}
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestNotification}
                  disabled={!preferences.enabled || !preferences.inApp.enabled}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  测试通知
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 声音设置 */}
          <TabsContent value="sound" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  声音设置
                </CardTitle>
                <CardDescription>自定义通知声音效果</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label>启用声音</Label>
                  <Switch
                    checked={preferences.sound.enabled}
                    onCheckedChange={(checked) =>
                      setPreferences({
                        ...preferences,
                        sound: { ...preferences.sound, enabled: checked }
                      })
                    }
                    disabled={!preferences.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>音量</Label>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(preferences.sound.volume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[preferences.sound.volume * 100]}
                    onValueChange={([value]) =>
                      setPreferences({
                        ...preferences,
                        sound: { ...preferences.sound, volume: value / 100 }
                      })
                    }
                    max={100}
                    step={5}
                    disabled={!preferences.enabled || !preferences.sound.enabled}
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-medium">声音类型</Label>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm">审核通过</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={preferences.sound.approval}
                        onCheckedChange={(checked) =>
                          setPreferences({
                            ...preferences,
                            sound: { ...preferences.sound, approval: checked }
                          })
                        }
                        disabled={!preferences.enabled || !preferences.sound.enabled}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestSound('success')}
                        disabled={!preferences.sound.enabled}
                      >
                        试听
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm">审核拒绝</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={preferences.sound.rejection}
                        onCheckedChange={(checked) =>
                          setPreferences({
                            ...preferences,
                            sound: { ...preferences.sound, rejection: checked }
                          })
                        }
                        disabled={!preferences.enabled || !preferences.sound.enabled}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestSound('error')}
                        disabled={!preferences.sound.enabled}
                      >
                        试听
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">系统通知</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={preferences.sound.system}
                        onCheckedChange={(checked) =>
                          setPreferences({
                            ...preferences,
                            sound: { ...preferences.sound, system: checked }
                          })
                        }
                        disabled={!preferences.enabled || !preferences.sound.enabled}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestSound('info')}
                        disabled={!preferences.sound.enabled}
                      >
                        试听
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 桌面通知 */}
          <TabsContent value="desktop" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  桌面通知
                </CardTitle>
                <CardDescription>在系统级别显示通知</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <Label>权限状态</Label>
                    <p className="text-sm text-muted-foreground">
                      {desktopPermission === 'granted' && '✅ 已授权'}
                      {desktopPermission === 'denied' && '❌ 已拒绝'}
                      {desktopPermission === 'default' && '⏳ 未请求'}
                    </p>
                  </div>
                  {desktopPermission !== 'granted' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRequestDesktopPermission}
                    >
                      请求权限
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Label>启用桌面通知</Label>
                  <Switch
                    checked={preferences.desktop.enabled}
                    onCheckedChange={(checked) =>
                      setPreferences({
                        ...preferences,
                        desktop: { ...preferences.desktop, enabled: checked }
                      })
                    }
                    disabled={!preferences.enabled || desktopPermission !== 'granted'}
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-medium">通知类型</Label>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">审核通过</span>
                    <Switch
                      checked={preferences.desktop.approval}
                      onCheckedChange={(checked) =>
                        setPreferences({
                          ...preferences,
                          desktop: { ...preferences.desktop, approval: checked }
                        })
                      }
                      disabled={!preferences.enabled || !preferences.desktop.enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">审核拒绝</span>
                    <Switch
                      checked={preferences.desktop.rejection}
                      onCheckedChange={(checked) =>
                        setPreferences({
                          ...preferences,
                          desktop: { ...preferences.desktop, rejection: checked }
                        })
                      }
                      disabled={!preferences.enabled || !preferences.desktop.enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">系统通知</span>
                    <Switch
                      checked={preferences.desktop.system}
                      onCheckedChange={(checked) =>
                        setPreferences({
                          ...preferences,
                          desktop: { ...preferences.desktop, system: checked }
                        })
                      }
                      disabled={!preferences.enabled || !preferences.desktop.enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">新内容提醒</span>
                    <Switch
                      checked={preferences.desktop.newContent}
                      onCheckedChange={(checked) =>
                        setPreferences({
                          ...preferences,
                          desktop: { ...preferences.desktop, newContent: checked }
                        })
                      }
                      disabled={!preferences.enabled || !preferences.desktop.enabled}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 高级设置 */}
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Moon className="w-4 h-4" />
                  免打扰模式
                </CardTitle>
                <CardDescription>在指定时间段内静音通知</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>启用免打扰</Label>
                  <Switch
                    checked={preferences.doNotDisturb.enabled}
                    onCheckedChange={(checked) =>
                      setPreferences({
                        ...preferences,
                        doNotDisturb: { ...preferences.doNotDisturb, enabled: checked }
                      })
                    }
                    disabled={!preferences.enabled}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>开始时间</Label>
                    <Input
                      type="time"
                      value={preferences.doNotDisturb.startTime}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          doNotDisturb: { ...preferences.doNotDisturb, startTime: e.target.value }
                        })
                      }
                      disabled={!preferences.enabled || !preferences.doNotDisturb.enabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>结束时间</Label>
                    <Input
                      type="time"
                      value={preferences.doNotDisturb.endTime}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          doNotDisturb: { ...preferences.doNotDisturb, endTime: e.target.value }
                        })
                      }
                      disabled={!preferences.enabled || !preferences.doNotDisturb.enabled}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  频率限制
                </CardTitle>
                <CardDescription>防止通知过于频繁</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>启用频率限制</Label>
                  <Switch
                    checked={preferences.rateLimit.enabled}
                    onCheckedChange={(checked) =>
                      setPreferences({
                        ...preferences,
                        rateLimit: { ...preferences.rateLimit, enabled: checked }
                      })
                    }
                    disabled={!preferences.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label>每分钟最多通知数</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[preferences.rateLimit.maxPerMinute]}
                      onValueChange={([value]) =>
                        setPreferences({
                          ...preferences,
                          rateLimit: { ...preferences.rateLimit, maxPerMinute: value }
                        })
                      }
                      min={1}
                      max={20}
                      step={1}
                      disabled={!preferences.enabled || !preferences.rateLimit.enabled}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-8 text-right">
                      {preferences.rateLimit.maxPerMinute}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={handleReset}>
            重置默认
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存设置'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
