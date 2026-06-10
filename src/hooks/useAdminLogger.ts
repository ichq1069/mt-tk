import React, { useEffect, useCallback } from 'react';

export interface AdminLog {
  id: string;
  timestamp: number;
  type: 'page' | 'action' | 'error';
  module: string;
  action: string;
  details?: any;
  user?: string;
}

class AdminLoggerService {
  private logs: AdminLog[] = [];
  private listeners: Set<(logs: AdminLog[]) => void> = new Set();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly LOG_RETENTION_MS = 60 * 1000; // 1分钟

  constructor() {
    this.startCleanup();
  }

  private startCleanup() {
    // 每10秒清理一次过期日志
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const before = this.logs.length;
      this.logs = this.logs.filter(log => now - log.timestamp < this.LOG_RETENTION_MS);
      if (before !== this.logs.length) {
        this.notifyListeners();
      }
    }, 10000);
  }

  isEnabled(): boolean {
    return localStorage.getItem('admin_logger_enabled') === 'true';
  }

  setEnabled(enabled: boolean) {
    localStorage.setItem('admin_logger_enabled', String(enabled));
    if (!enabled) {
      this.logs = [];
      this.notifyListeners();
    }
  }

  log(type: AdminLog['type'], module: string, action: string, details?: any, user?: string) {
    if (!this.isEnabled()) return;

    const log: AdminLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      module,
      action,
      details,
      user
    };

    this.logs.unshift(log); // 新日志放在前面
    
    // 限制最大日志数量（防止内存溢出）
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }

    this.notifyListeners();
  }

  getLogs(): AdminLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }

  subscribe(listener: (logs: AdminLog[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getLogs()));
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// 全局单例
const loggerService = new AdminLoggerService();

/**
 * 管理后台日志记录 Hook
 * @param module 模块名称（如 'dashboard', 'users', 'audit' 等）
 */
export function useAdminLogger(module: string) {
  const username = localStorage.getItem('admin_username') || 'unknown';

  // 记录页面访问
  useEffect(() => {
    loggerService.log('page', module, '进入页面', undefined, username);
    
    return () => {
      loggerService.log('page', module, '离开页面', undefined, username);
    };
  }, [module, username]);

  // 记录操作
  const logAction = useCallback((action: string, details?: any) => {
    loggerService.log('action', module, action, details, username);
  }, [module, username]);

  // 记录错误
  const logError = useCallback((action: string, error: any) => {
    loggerService.log('error', module, action, { error: error?.message || String(error) }, username);
  }, [module, username]);

  return { logAction, logError };
}

/**
 * 日志管理 Hook（用于系统设置页面）
 */
export function useAdminLoggerManager() {
  const [logs, setLogs] = React.useState<AdminLog[]>(loggerService.getLogs());
  const [enabled, setEnabledState] = React.useState(loggerService.isEnabled());

  React.useEffect(() => {
    const unsubscribe = loggerService.subscribe(setLogs);
    return () => {
      unsubscribe();
    };
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    loggerService.setEnabled(value);
    setEnabledState(value);
  }, []);

  const clearLogs = useCallback(() => {
    loggerService.clearLogs();
  }, []);

  return { logs, enabled, setEnabled, clearLogs };
}

// 为了在非 Hook 环境中使用
export { loggerService };

