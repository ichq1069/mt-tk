import { supabase } from '@/db/supabase';

export interface LogEntry {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info' | 'network' | 'event';
  message: string;
  data?: any;
  timestamp: number;
  page: string;
}

class LogCollector {
  private logs: LogEntry[] = [];
  private maxLogs = 200;
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private userId: string | null = null;
  private sessionId: string = Math.random().toString(36).substring(2, 15);

  private isProcessing = false;

  constructor() {
    this.initInterceptors();
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  setSilentMode(enabled: boolean) {
    // 静默模式仅用于日志收集，不再录制会话
    console.log('[LogCollector] Silent mode:', enabled);
  }

  private initInterceptors() {
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    };

    // Console Interceptors
    const createInterceptor = (type: LogEntry['type']) => (...args: any[]) => {
      // @ts-ignore
      originalConsole[type]?.(...args);
      
      // Sanitize data to avoid circular references or non-serializable objects
      const sanitizedData = args.map(arg => {
        try {
          if (arg === null || arg === undefined) return arg;
          if (typeof arg !== 'object') return arg;
          if (arg instanceof Error) return { message: arg.message, stack: arg.stack };
          // Use a simple JSON stringify/parse to strip non-serializable parts
          return JSON.parse(JSON.stringify(arg));
        } catch (e) {
          return '[Unserializable Data]';
        }
      });

      this.addLog({
        type,
        message: args.map(arg => {
          if (typeof arg === 'object') {
            if (arg instanceof Error) return arg.stack || arg.message;
            try {
              return JSON.stringify(arg);
            } catch (e) {
              return '[Object]';
            }
          }
          return String(arg);
        }).join(' '),
        data: sanitizedData,
      });
    };

    console.log = createInterceptor('log');
    console.error = createInterceptor('error');
    console.warn = createInterceptor('warn');
    console.info = createInterceptor('info');

    // Click/Interaction Interceptor
    if (typeof window !== 'undefined') {
      window.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const info = target.innerText || target.getAttribute('aria-label') || target.tagName;
        this.addLog({
          type: 'event',
          message: `Click: ${info.substring(0, 30)}`,
          data: { 
            tag: target.tagName,
            id: target.id,
            className: target.className,
            text: info
          }
        });
      }, true);
    }

    // Network Interceptor
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      const options = args[1] || {};
      const method = options.method || 'GET';
      const isInternal = (options as any)._isLogCollectorRequest || 
                         this.isProcessing;

      if (isInternal) {
        return originalFetch(...args);
      }

      const startTime = Date.now();
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        this.addLog({
          type: 'network',
          message: `${method} ${url} ${response.status}`,
          data: { method, url, status: response.status, duration }
        });
        return response;
      } catch (error) {
        this.addLog({
          type: 'network',
          message: `${method} ${url} FAILED`,
          data: { method, url, error: String(error) }
        });
        throw error;
      }
    };
  }

  addLog(entry: Omit<LogEntry, 'id' | 'timestamp' | 'page'>) {
    if (this.isProcessing) return;
    
    const newEntry: LogEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      page: window.location.pathname,
    };
    this.logs = [newEntry, ...this.logs.slice(0, this.maxLogs - 1)];
    this.notify();

    // 静默模式下的日志自动刷新（会话回放已移除，仅保留日志收集）
    if (this.logs.length % 20 === 0) {
      this.flushLogsToBackend();
    }
  }

  private notifyTimeout: any = null;

  private notify() {
    if (this.isProcessing) return;
    
    if (this.notifyTimeout) return;
    
    this.notifyTimeout = setTimeout(() => {
      this.listeners.forEach(l => l(this.logs));
      this.notifyTimeout = null;
    }, 100); // 限制每100ms通知一次，避免高频渲染导致卡顿或循环
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    listener(this.logs);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
    this.notify();
  }

  startSessionRecording() {
    // 会话回放功能已移除，保留方法名以兼容现有调用
    console.log('[LogCollector] Session recording is disabled');
  }

  stopSessionRecording() {
    // 会话回放功能已移除
  }

  private async flushLogsToBackend() {
    if (!this.userId) return;
    // We could store these in a specialized table or user_feedbacks with a 'system' status
  }

  async submitFullSession(content: string) {
    if (this.isProcessing) return false;
    this.isProcessing = true;
    
    try {
      const { error } = await (supabase as any).from('user_feedbacks').insert({
        user_id: this.userId,
        content: content,
        logs: this.logs,
        session_id: this.sessionId,
        page_url: window.location.href,
        metadata: {
          ua: navigator.userAgent,
          screen: `${window.innerWidth}x${window.innerHeight}`
        }
      });
      
      if (error) throw error;
      this.sessionId = Math.random().toString(36).substring(2, 15);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      this.isProcessing = false;
    }
  }
}

export const logCollector = new LogCollector();
