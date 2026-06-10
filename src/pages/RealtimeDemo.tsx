import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeMediaUpdates } from '@/hooks/useRealtimeMediaUpdates';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useRealtimeExplore } from '@/hooks/useRealtimeExplore';
import { CheckCircle2, XCircle, Bell, RefreshCw, Wifi, WifiOff, Volume2, Monitor, Settings, Sparkles } from 'lucide-react';
import type { MediaItem, AppNotification } from '@/types';
import { NotificationPreferencesDialog } from '@/components/NotificationPreferencesDialog';
import { enhancedNotification } from '@/lib/enhanced-notification';
import { desktopNotification } from '@/lib/desktop-notification';

export default function RealtimeDemo() {
  const { user } = useAuth();
  const [mediaUpdates, setMediaUpdates] = useState<MediaItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  // 监听用户内容更新
  const { isSubscribed: isMediaSubscribed } = useRealtimeMediaUpdates({
    userId: user?.id,
    enabled: !!user,
    onApproved: (item) => {
      setMediaUpdates(prev => [{ ...item, status: 'approved' }, ...prev.slice(0, 9)]);
    },
    onRejected: (item) => {
      setMediaUpdates(prev => [{ ...item, status: 'rejected' }, ...prev.slice(0, 9)]);
    },
    onUpdate: (item) => {
      setMediaUpdates(prev => [item, ...prev.slice(0, 9)]);
    }
  });

  // 监听通知
  const { isSubscribed: isNotificationSubscribed } = useRealtimeNotifications({
    userId: user?.id,
    enabled: !!user,
    onNewNotification: (notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 9)]);
    }
  });

  // 监听探索页更新
  const { isSubscribed: isExploreSubscribed, newItemsCount, resetNewItemsCount } = useRealtimeExplore({
    enabled: true,
    onNewApprovedItem: (item) => {
      console.log('探索页新内容:', item);
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />已通过</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />已拒绝</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">待审核</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Realtime 实时通知演示</h1>
          <p className="text-muted-foreground mt-2">
            实时监听内容审核状态、系统通知和探索页更新
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsPreferencesOpen(true)}
        >
          <Settings className="w-4 h-4 mr-2" />
          通知设置
        </Button>
      </div>

      {/* 测试按钮区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            测试功能
          </CardTitle>
          <CardDescription>
            测试各种通知效果和桌面通知权限
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await enhancedNotification.showApproval('测试内容', '这是一条测试审核通过通知');
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              测试审核通过
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await enhancedNotification.showRejection('内容不符合规范', '测试内容');
              }}
            >
              <XCircle className="w-4 h-4 mr-2" />
              测试审核拒绝
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await enhancedNotification.showSystem('系统公告', '这是一条测试系统通知');
              }}
            >
              <Bell className="w-4 h-4 mr-2" />
              测试系统通知
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await enhancedNotification.showNewContent(5);
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              测试新内容
            </Button>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t">
            <Monitor className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              桌面通知权限: {desktopNotification.getPermission() === 'granted' ? '✅ 已授权' : desktopNotification.getPermission() === 'denied' ? '❌ 已拒绝' : '⏳ 未请求'}
            </span>
            {desktopNotification.getPermission() !== 'granted' && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await desktopNotification.requestPermission();
                }}
              >
                请求权限
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 连接状态 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {isMediaSubscribed ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              内容更新订阅
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isMediaSubscribed ? '已连接' : '未连接'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              监听用户内容审核状态
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {isNotificationSubscribed ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              通知订阅
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isNotificationSubscribed ? '已连接' : '未连接'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              监听系统通知
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {isExploreSubscribed ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              探索页订阅
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {isExploreSubscribed ? '已连接' : '未连接'}
              {newItemsCount > 0 && (
                <Badge className="animate-pulse">{newItemsCount} 新</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              监听新审核通过的内容
            </p>
            {newItemsCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={resetNewItemsCount}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                重置计数
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 内容更新历史 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            内容审核更新
          </CardTitle>
          <CardDescription>
            实时显示您的内容审核状态变化（最近 10 条）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mediaUpdates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无更新，等待审核结果...
            </div>
          ) : (
            <div className="space-y-3">
              {mediaUpdates.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.title || '未命名'}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.type === 'image' ? '图片' : '视频'} · {new Date(item.updated_at || item.created_at).toLocaleString()}
                    </div>
                    {item.rejection_reason && (
                      <div className="text-sm text-red-500 mt-1">
                        拒绝原因: {item.rejection_reason}
                      </div>
                    )}
                  </div>
                  <div>
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 通知历史 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            系统通知
          </CardTitle>
          <CardDescription>
            实时接收系统通知（最近 10 条）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无通知
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification, index) => (
                <div
                  key={`${notification.id}-${index}`}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">{notification.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {notification.content}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="outline">{notification.type}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">📋 内容审核通知</h3>
            <p className="text-sm text-muted-foreground">
              当管理员审核您上传的内容时，您会立即收到实时通知。审核通过后，内容会自动发布到探索页；审核拒绝时，会显示拒绝原因。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">🔔 系统通知</h3>
            <p className="text-sm text-muted-foreground">
              接收来自系统的各类通知，包括审核结果、系统公告、营销信息等。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">🌟 探索页更新</h3>
            <p className="text-sm text-muted-foreground">
              当有新内容通过审核时，探索页的刷新按钮会显示新内容数量徽章，点击刷新即可查看最新内容。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">⚡ 技术特性</h3>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>基于 Supabase Realtime 实现</li>
              <li>低延迟的实时数据同步</li>
              <li>自动重连和错误处理</li>
              <li>服务端过滤减少数据传输</li>
              <li>组件卸载时自动清理订阅</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 通知偏好设置对话框 */}
      <NotificationPreferencesDialog
        open={isPreferencesOpen}
        onOpenChange={setIsPreferencesOpen}
      />
    </div>
  );
}
