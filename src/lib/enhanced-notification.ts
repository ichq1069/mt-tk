import { toast } from 'sonner';
import { notificationSound } from './notification-sound';
import { desktopNotification } from './desktop-notification';
import type { NotificationPreferences } from './notification-preferences';
import { isInDoNotDisturbTime, rateLimiter } from './notification-preferences';

export type EnhancedNotificationType = 'success' | 'error' | 'info' | 'warning' | 'approval' | 'rejection';

export interface EnhancedNotificationOptions {
  title: string;
  description?: string;
  type: EnhancedNotificationType;
  duration?: number;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  data?: any;
}

/**
 * 增强的通知系统
 * 集成应用内通知、声音、桌面通知和用户偏好
 */
class EnhancedNotificationSystem {
  private preferences: NotificationPreferences | null = null;

  /**
   * 设置用户偏好
   */
  setPreferences(preferences: NotificationPreferences) {
    this.preferences = preferences;
    
    // 同步声音设置
    if (preferences.sound.enabled) {
      notificationSound.setEnabled(true);
      notificationSound.setVolume(preferences.sound.volume);
    } else {
      notificationSound.setEnabled(false);
    }
  }

  /**
   * 获取当前偏好
   */
  getPreferences(): NotificationPreferences | null {
    return this.preferences;
  }

  /**
   * 检查是否应该显示通知
   */
  private shouldShow(): boolean {
    if (!this.preferences) return true;
    if (!this.preferences.enabled) return false;
    if (isInDoNotDisturbTime(this.preferences)) return false;
    if (!rateLimiter.canShow(this.preferences)) return false;
    return true;
  }

  /**
   * 显示增强通知
   */
  async show(options: EnhancedNotificationOptions) {
    if (!this.shouldShow()) return;

    const prefs = this.preferences;

    // 应用内通知
    if (!prefs || prefs.inApp.enabled) {
      this.showInAppNotification(options);
    }

    // 播放声音
    if (prefs?.sound.enabled && prefs.inApp.sound) {
      this.playSound(options.type);
    }

    // 桌面通知
    if (prefs?.desktop.enabled) {
      await this.showDesktopNotification(options);
    }
  }

  /**
   * 显示应用内通知
   */
  private showInAppNotification(options: EnhancedNotificationOptions) {
    const { title, description, type, duration = 5000, action } = options;

    // 根据类型选择 toast 方法和图标
    const toastOptions: any = {
      description,
      duration,
      className: this.preferences?.inApp.animation ? 'animate-in slide-in-from-top-5' : '',
    };

    if (action) {
      toastOptions.action = {
        label: action.label,
        onClick: action.onClick,
      };
    }

    switch (type) {
      case 'success':
      case 'approval':
        toast.success(title, toastOptions);
        break;
      case 'error':
      case 'rejection':
        toast.error(title, toastOptions);
        break;
      case 'warning':
        toast.warning(title, toastOptions);
        break;
      case 'info':
      default:
        toast.info(title, toastOptions);
        break;
    }
  }

  /**
   * 播放通知声音
   */
  private playSound(type: EnhancedNotificationType) {
    const prefs = this.preferences;
    if (!prefs) return;

    switch (type) {
      case 'success':
      case 'approval':
        if (prefs.sound.approval) {
          notificationSound.playSuccess();
        }
        break;
      case 'error':
      case 'rejection':
        if (prefs.sound.rejection) {
          notificationSound.playError();
        }
        break;
      case 'warning':
        if (prefs.sound.system) {
          notificationSound.playWarning();
        }
        break;
      case 'info':
      default:
        if (prefs.sound.system) {
          notificationSound.playInfo();
        }
        break;
    }
  }

  /**
   * 显示桌面通知
   */
  private async showDesktopNotification(options: EnhancedNotificationOptions) {
    const prefs = this.preferences;
    if (!prefs) return;

    const { title, description, type, data } = options;

    // 根据类型检查是否启用
    switch (type) {
      case 'approval':
        if (!prefs.desktop.approval) return;
        await desktopNotification.showApprovalNotification(title, description);
        break;
      case 'rejection':
        if (!prefs.desktop.rejection) return;
        await desktopNotification.showRejectionNotification(title, description);
        break;
      case 'info':
      case 'warning':
        if (!prefs.desktop.system) return;
        await desktopNotification.showSystemNotification(title, description || '', data);
        break;
    }
  }

  /**
   * 快捷方法：审核通过通知
   */
  async showApproval(itemTitle?: string, description?: string) {
    await this.show({
      title: '🎉 审核通过',
      description: description || (itemTitle ? `您的内容"${itemTitle}"已通过审核` : '您的内容已通过审核'),
      type: 'approval',
      action: {
        label: '查看',
        onClick: () => {
          window.location.href = '/profile';
        }
      }
    });
  }

  /**
   * 快捷方法：审核拒绝通知
   */
  async showRejection(reason?: string, itemTitle?: string) {
    await this.show({
      title: '❌ 审核未通过',
      description: reason || '请修改后重新上传',
      type: 'rejection',
      action: {
        label: '查看详情',
        onClick: () => {
          window.location.href = '/profile';
        }
      }
    });
  }

  /**
   * 快捷方法：新内容通知
   */
  async showNewContent(count: number) {
    const prefs = this.preferences;
    
    // 桌面通知
    if (prefs?.desktop.enabled && prefs.desktop.newContent) {
      await desktopNotification.showNewContentNotification(count);
    }
    
    // 应用内通知（简化版，不打断用户）
    if (prefs?.inApp.enabled) {
      toast.info(`✨ 有 ${count} 条新内容`, {
        description: '点击刷新按钮查看',
        duration: 3000,
      });
    }
  }

  /**
   * 快捷方法：系统通知
   */
  async showSystem(title: string, description: string, data?: any) {
    await this.show({
      title: `🔔 ${title}`,
      description,
      type: 'info',
      data,
      action: {
        label: '查看',
        onClick: () => {
          window.location.href = '/notifications';
        }
      }
    });
  }
}

// 导出单例
export const enhancedNotification = new EnhancedNotificationSystem();
