/**
 * 桌面通知管理器
 * 封装 Notification API，提供统一的桌面通知接口
 */

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default';

export interface DesktopNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
  onClick?: () => void;
}

class DesktopNotificationManager {
  private permission: NotificationPermissionStatus = 'default';

  constructor() {
    if (this.isSupported()) {
      this.permission = Notification.permission;
    }
  }

  /**
   * 检查浏览器是否支持桌面通知
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * 获取当前权限状态
   */
  getPermission(): NotificationPermissionStatus {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  /**
   * 请求桌面通知权限
   */
  async requestPermission(): Promise<NotificationPermissionStatus> {
    if (!this.isSupported()) {
      console.warn('浏览器不支持桌面通知');
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    } catch (error) {
      console.error('请求通知权限失败:', error);
      return 'denied';
    }
  }

  /**
   * 显示桌面通知
   */
  async show(options: DesktopNotificationOptions): Promise<Notification | null> {
    if (!this.isSupported()) {
      console.warn('浏览器不支持桌面通知');
      return null;
    }

    // 如果没有权限，先请求
    if (this.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('用户拒绝了通知权限');
        return null;
      }
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/logo.png',
        badge: options.badge,
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
      });

      // 点击事件
      if (options.onClick) {
        notification.onclick = () => {
          window.focus();
          options.onClick?.();
          notification.close();
        };
      }

      // 自动关闭（如果不需要交互）
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } catch (error) {
      console.error('显示桌面通知失败:', error);
      return null;
    }
  }

  /**
   * 显示审核通过通知
   */
  async showApprovalNotification(title: string, itemTitle?: string) {
    return this.show({
      title: '🎉 审核通过',
      body: itemTitle ? `您的内容"${itemTitle}"已通过审核` : '您的内容已通过审核',
      tag: 'approval',
      onClick: () => {
        window.location.href = '/profile';
      }
    });
  }

  /**
   * 显示审核拒绝通知
   */
  async showRejectionNotification(title: string, reason?: string) {
    return this.show({
      title: '❌ 审核未通过',
      body: reason || '您的内容未通过审核，请修改后重新上传',
      tag: 'rejection',
      onClick: () => {
        window.location.href = '/profile';
      }
    });
  }

  /**
   * 显示系统通知
   */
  async showSystemNotification(title: string, body: string, data?: any) {
    return this.show({
      title: `🔔 ${title}`,
      body,
      tag: 'system',
      data,
      onClick: () => {
        window.location.href = '/notifications';
      }
    });
  }

  /**
   * 显示新内容通知
   */
  async showNewContentNotification(count: number) {
    return this.show({
      title: '✨ 有新内容',
      body: `探索页有 ${count} 条新内容等你查看`,
      tag: 'new-content',
      onClick: () => {
        window.location.href = '/';
      }
    });
  }
}

// 导出单例
export const desktopNotification = new DesktopNotificationManager();
