/**
 * 通知偏好设置类型定义
 */

export interface NotificationPreferences {
  // 全局开关
  enabled: boolean;
  
  // 应用内通知
  inApp: {
    enabled: boolean;
    sound: boolean;
    animation: boolean;
  };
  
  // 桌面通知
  desktop: {
    enabled: boolean;
    approval: boolean;      // 审核通过
    rejection: boolean;     // 审核拒绝
    system: boolean;        // 系统通知
    newContent: boolean;    // 新内容提醒
  };
  
  // 声音设置
  sound: {
    enabled: boolean;
    volume: number;         // 0-1
    approval: boolean;      // 审核通过音效
    rejection: boolean;     // 审核拒绝音效
    system: boolean;        // 系统通知音效
  };
  
  // 免打扰模式
  doNotDisturb: {
    enabled: boolean;
    startTime: string;      // HH:mm 格式
    endTime: string;        // HH:mm 格式
  };
  
  // 频率限制
  rateLimit: {
    enabled: boolean;
    maxPerMinute: number;   // 每分钟最多显示的通知数
  };
}

// 默认偏好设置
export const defaultNotificationPreferences: NotificationPreferences = {
  enabled: true,
  inApp: {
    enabled: true,
    sound: true,
    animation: true,
  },
  desktop: {
    enabled: false,
    approval: true,
    rejection: true,
    system: true,
    newContent: false,
  },
  sound: {
    enabled: true,
    volume: 0.5,
    approval: true,
    rejection: true,
    system: true,
  },
  doNotDisturb: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
  },
  rateLimit: {
    enabled: true,
    maxPerMinute: 5,
  },
};

/**
 * 检查当前是否在免打扰时间段内
 */
export function isInDoNotDisturbTime(preferences: NotificationPreferences): boolean {
  if (!preferences.doNotDisturb.enabled) return false;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = preferences.doNotDisturb.startTime.split(':').map(Number);
  const [endHour, endMin] = preferences.doNotDisturb.endTime.split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  // 处理跨天的情况（如 22:00 - 08:00）
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  } else {
    return currentTime >= startTime && currentTime < endTime;
  }
}

/**
 * 频率限制管理器
 */
class NotificationRateLimiter {
  private timestamps: number[] = [];

  /**
   * 检查是否可以显示通知
   */
  canShow(preferences: NotificationPreferences): boolean {
    if (!preferences.rateLimit.enabled) return true;

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // 清理超过1分钟的记录
    this.timestamps = this.timestamps.filter(t => t > oneMinuteAgo);

    // 检查是否超过限制
    if (this.timestamps.length >= preferences.rateLimit.maxPerMinute) {
      console.warn('通知频率超过限制，已忽略');
      return false;
    }

    // 记录本次通知
    this.timestamps.push(now);
    return true;
  }

  /**
   * 重置计数器
   */
  reset() {
    this.timestamps = [];
  }
}

export const rateLimiter = new NotificationRateLimiter();
