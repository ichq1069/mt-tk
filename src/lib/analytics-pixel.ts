/**
 * 统计分析埋点SDK
 * 基于 Tongji 项目架构设计
 */

import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface AnalyticsConfig {
  websiteId: string;
  pixelKey: string;
  apiBase?: string;
  debug?: boolean;
  enableHeatmaps?: boolean;
  enableClickTracking?: boolean;
  enableScrollTracking?: boolean;
  enableFormTracking?: boolean;
  respectDoNotTrack?: boolean;
  sessionTimeout?: number;
  batchSize?: number;
  batchInterval?: number;
  userId?: string;
  openid?: string;
}

interface EventData {
  type: string;
  page_path: string;
  page_title?: string;
  referrer?: string;
  [key: string]: any;
}

class AnalyticsPixel {
  private config: AnalyticsConfig;
  private visitorUuid: string = '';
  private sessionUuid: string = '';
  private eventUuid: string = '';
  private sessionStartTime: number = 0;
  private isInitialized: boolean = false;
  private eventQueue: EventData[] = [];
  private batchTimer: number | null = null;
  private heartbeatTimer: number | null = null;

  constructor(config: AnalyticsConfig) {
    this.config = {
      websiteId: config.websiteId,
      pixelKey: config.pixelKey,
      apiBase: config.apiBase || '/api/analytics',
      debug: config.debug || false,
      enableHeatmaps: config.enableHeatmaps !== false,
      enableClickTracking: config.enableClickTracking !== false,
      enableScrollTracking: config.enableScrollTracking !== false,
      enableFormTracking: config.enableFormTracking !== false,
      respectDoNotTrack: config.respectDoNotTrack !== false,
      sessionTimeout: config.sessionTimeout || 30 * 60 * 1000,
      batchSize: config.batchSize || 20,
      batchInterval: config.batchInterval || 5000,
      userId: config.userId,
      openid: config.openid
    };
  }

  updateConfig(partial: Partial<AnalyticsConfig>) {
    if (partial.websiteId) this.config.websiteId = partial.websiteId;
    if (partial.pixelKey) this.config.pixelKey = partial.pixelKey;
    if (partial.debug !== undefined) this.config.debug = partial.debug;
    if (partial.userId) this.config.userId = partial.userId;
    if (partial.openid !== undefined) this.config.openid = partial.openid;
  }

  // 检测当前用户登录状态和 openid
  detectUserIdentity(): { userId?: string; openid?: string } {
    let userId: string | undefined;
    let openid: string | undefined;

    // 1. 尝试从 URL 参数获取 openid (优先)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlOpenid = urlParams.get('openid');
      if (urlOpenid && urlOpenid !== 'unknown_user') {
        openid = urlOpenid;
        // 如果从 URL 获取到了，存入 localStorage 以便后续使用
        localStorage.setItem('daily_gallery_openid', urlOpenid);
        localStorage.setItem('openid', urlOpenid);
      }
    } catch (e) {}

    // 2. 尝试从 localStorage 获取 openid
    if (!openid) {
      try {
        const storedOpenid = localStorage.getItem('daily_gallery_openid') || localStorage.getItem('openid');
        if (storedOpenid && storedOpenid !== 'unknown_user') {
          openid = storedOpenid;
        }
      } catch (e) {}
    }

    // 3. 尝试从全局变量获取用户 ID（由 AuthContext 设置）
    try {
      const globalUser = (window as any).__CURRENT_USER__;
      if (globalUser?.id) {
        userId = globalUser.id;
      }
    } catch (e) {}

    // 如果已配置，优先使用配置值
    if (this.config.userId) userId = this.config.userId;
    if (this.config.openid) openid = this.config.openid;

    return { userId, openid };
  }

  async init() {
    if (this.isInitialized) return;

    if (this.config.respectDoNotTrack && this.isDoNotTrackEnabled()) {
      console.log('[Analytics] Do Not Track enabled');
      return;
    }

    try {
      await this.initVisitor();
      await this.initSession();
      this.initEventListeners();
      this.initHeartbeat();
      this.startBatchSender();
      this.trackPageview();
      this.isInitialized = true;
    } catch (error) {
      console.error('Analytics init error:', error);
    }
  }

  private async initVisitor() {
    const storageKey = `analytics_visitor_${this.config.websiteId}`;
    let stored = localStorage.getItem(storageKey);
    let visitorData = stored ? JSON.parse(stored) : null;
    const identity = this.detectUserIdentity();

    // 如果用户已登录或已有 openid，尝试查找已有访客记录复用 visitor_uuid
    if ((identity.userId || identity.openid) && visitorData) {
      // 保持同一访客 UUID，在事件上报时会更新 user_id/openid
    }

    if (visitorData && Date.now() - visitorData.timestamp < 365 * 24 * 60 * 60 * 1000) {
      this.visitorUuid = visitorData.uuid;
    } else {
      this.visitorUuid = this.generateUUID();
    }

    const visitorInfo = this.getVisitorInfo();
    localStorage.setItem(storageKey, JSON.stringify({
      uuid: this.visitorUuid,
      info: visitorInfo,
      user_id: identity.userId || null,
      openid: identity.openid || null,
      timestamp: Date.now()
    }));

    await this.sendEvent({
      type: 'initiate_visitor',
      page_path: window.location.pathname,
      visitor_info: { ...visitorInfo, user_id: identity.userId, openid: identity.openid }
    });
  }

  private async initSession() {
    const storageKey = `analytics_session_${this.config.websiteId}`;
    let stored = localStorage.getItem(storageKey);
    const sessionData = stored ? JSON.parse(stored) : null;
    const now = Date.now();

    // 优化：增加最后活跃时间检查。如果在 30 分钟内有操作，则延续会话。
    const lastActive = sessionData?.lastActive || sessionData?.startTime || 0;
    const sessionTimeout = this.config.sessionTimeout || 30 * 60 * 1000;

    if (sessionData && (now - lastActive < sessionTimeout)) {
      this.sessionUuid = sessionData.uuid;
      this.sessionStartTime = sessionData.startTime;
      // 更新最后活跃时间
      localStorage.setItem(storageKey, JSON.stringify({
        uuid: this.sessionUuid,
        startTime: this.sessionStartTime,
        lastActive: now
      }));
    } else {
      this.sessionUuid = this.generateUUID();
      this.sessionStartTime = now;
      await this.sendEvent({
        type: 'landing_page',
        page_path: window.location.pathname
      });
      localStorage.setItem(storageKey, JSON.stringify({
        uuid: this.sessionUuid,
        startTime: this.sessionStartTime,
        lastActive: now
      }));
    }

    this.eventUuid = this.generateUUID();
  }

  private getVisitorInfo() {
    return {
      resolution: { width: window.screen.width, height: window.screen.height },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      device_type: this.getDeviceType(),
      browser_name: this.getBrowserName(),
      browser_version: this.getBrowserVersion(),
      os_name: this.getOSName()
    };
  }

  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const ua = navigator.userAgent.toLowerCase();
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  private getBrowserName(): string {
    const ua = navigator.userAgent;
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('SamsungBrowser') > -1) return 'Samsung Browser';
    if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
    if (ua.indexOf('Edg') > -1) return 'Edge';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident/') > -1) return 'IE';
    return 'Unknown';
  }

  private getBrowserVersion(): string {
    const ua = navigator.userAgent;
    const match = ua.match(/(Firefox|Chrome|Safari|Opera|Edge|MSIE|Trident)[\/\s]?([\d.]+)/);
    return match ? match[2] : '';
  }

  private getOSName(): string {
    const ua = navigator.userAgent;
    if (ua.indexOf('Win') > -1) return 'Windows';
    if (ua.indexOf('Mac') > -1) return 'macOS';
    if (ua.indexOf('Linux') > -1) return 'Linux';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
    return 'Unknown';
  }

  private isDoNotTrackEnabled(): boolean {
    return navigator.doNotTrack === '1' ||
           (window as any).doNotTrack === '1' ||
           (navigator as any).msDoNotTrack === '1';
  }

  private initEventListeners() {
    window.addEventListener('beforeunload', () => {
      this.flushQueue();
      this.sendBeacon();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushQueue();
      }
    });
    // 监听页面上的任何活动，更新最后活跃时间
    const updateActive = () => {
      const storageKey = `analytics_session_${this.config.websiteId}`;
      let stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const sessionData = JSON.parse(stored);
          sessionData.lastActive = Date.now();
          localStorage.setItem(storageKey, JSON.stringify(sessionData));
        } catch (e) {}
      }
    };
    document.addEventListener('mousedown', updateActive);
    document.addEventListener('keydown', updateActive);
    document.addEventListener('touchstart', updateActive);
    document.addEventListener('scroll', this.throttle(updateActive, 5000));


    if (this.config.enableClickTracking) {
      document.addEventListener('click', this.debounce(this.handleClick.bind(this), 100));
    }

    if (this.config.enableScrollTracking) {
      window.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 500));
    }

    if (this.config.enableFormTracking) {
      document.addEventListener('submit', this.handleFormSubmit.bind(this));
    }
    this.initWebVitals();


    this.initRouteTracking();
  }

  private handleClick(event: MouseEvent) {
    try {
      const target = event.target as HTMLElement;
      const selector = this.getElementSelector(target);
      const text = target.innerText?.substring(0, 100) || '';

      this.sendEvent({
        type: 'click',
        page_path: window.location.pathname,
        element_selector: selector,
        element_text: text,
        x_position: Math.round(event.clientX),
        y_position: Math.round(event.clientY),
        scroll_depth: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100) || 0
      });
    } catch (e) {
      // 抑制点击追踪异常，防止触发 Sentry 高频上报
      console.warn('[Analytics Click] error suppressed:', e);
    }
  }

  private handleScroll() {
    const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100) || 0;

    this.sendEvent({
      type: 'scroll',
      page_path: window.location.pathname,
      scroll_depth: scrollDepth,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      time_on_page: Math.round((Date.now() - this.sessionStartTime) / 1000)
    });
  }

  private handleFormSubmit(event: Event) {
    const form = event.target as HTMLFormElement;
    this.sendEvent({
      type: 'form_submit',
      page_path: window.location.pathname,
      form_id: form.id || '',
      form_action: form.action || '',
      form_method: form.method || 'GET'
    });
  }

  private initRouteTracking() {
    window.addEventListener('popstate', () => this.trackPageview());
    window.addEventListener('hashchange', () => this.trackPageview());

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.trackPageview();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.trackPageview();
    };
  }

  private initWebVitals() {
    const sendMetric = ({ name, value, id }: any) => {
      this.sendEvent({
        type: 'web_vitals',
        page_path: window.location.pathname,
        metric_name: name,
        metric_value: value,
        metric_id: id
      });
    };

    onLCP(sendMetric);
    onINP(sendMetric);
    onCLS(sendMetric);
    onFCP(sendMetric);
    onTTFB(sendMetric);
  }

  private initHeartbeat() {
    this.heartbeatTimer = window.setInterval(() => {
      // 每次心跳都更新本地会话的活跃时间，防止会话过早失效
      const storageKey = `analytics_session_${this.config.websiteId}`;
      let stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const sessionData = JSON.parse(stored);
          sessionData.lastActive = Date.now();
          localStorage.setItem(storageKey, JSON.stringify(sessionData));
        } catch (e) {}
      }
      this.sendHeartbeat();
    }, 30000);
  }

  private async sendHeartbeat() {
    if (!this.sessionUuid) return;
    const duration = Math.round((Date.now() - this.sessionStartTime) / 1000);

    await this.sendEvent({
      type: 'heartbeat',
      page_path: window.location.pathname,
      duration
    });
  }

  async trackPageview() {
    await this.sendEvent({
      type: 'pageview',
      page_path: window.location.pathname,
      page_title: document.title,
      referrer: document.referrer,
      url: window.location.href
    });
  }

  async trackCustomEvent(eventName: string, eventData?: Record<string, any>) {
    await this.sendEvent({
      type: 'custom_event',
      page_path: window.location.pathname,
      event_category: eventName,
      event_value: JSON.stringify(eventData || {})
    });
  }

  async trackGoal(goalKey: string, conversionValue?: string) {
    await this.sendEvent({
      type: 'goal_conversion',
      page_path: window.location.pathname,
      goal_key: goalKey,
      conversion_value: conversionValue
    });
  }

  async trackOutboundClick(url: string, linkText: string) {
    await this.sendEvent({
      type: 'outbound_click',
      page_path: window.location.pathname,
      outbound_url: url,
      link_text: linkText
    });
  }

  private async sendEvent(data: EventData) {
    const identity = this.detectUserIdentity();
    const event = {
      ...data,
      visitor_uuid: this.visitorUuid,
      session_uuid: this.sessionUuid,
      event_uuid: this.eventUuid,
      website_id: this.config.websiteId,
      pixel_key: this.config.pixelKey,
      user_id: identity.userId || null,
      openid: identity.openid || null,
      timestamp: Date.now()
    };

    // 如果是重要交互事件，更新本地会话最后活跃时间
    if (['click', 'form_submit', 'pageview'].includes(data.type)) {
      const storageKey = `analytics_session_${this.config.websiteId}`;
      let stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const sessionData = JSON.parse(stored);
          sessionData.lastActive = Date.now();
          localStorage.setItem(storageKey, JSON.stringify(sessionData));
        } catch (e) {}
      }
    }

    if (this.config.debug) {
      console.log('[Analytics Event]', event);
    }

    this.eventQueue.push(event);

    if (this.eventQueue.length >= (this.config.batchSize || 20)) {
      this.flushQueue();
    }
  }

  private flushQueue() {
    if (this.eventQueue.length === 0) return;
    const events = [...this.eventQueue];
    this.eventQueue = [];
    this.sendEventBatch(events);
  }

  private startBatchSender() {
    this.batchTimer = window.setInterval(() => {
      this.flushQueue();
    }, this.config.batchInterval);
  }

  private async sendEventBatch(events: EventData[]) {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/analytics-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          events,
          websiteId: this.config.websiteId,
          pixelKey: this.config.pixelKey
        })
      });
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      this.eventQueue = [...events, ...this.eventQueue];
    }
  }

  private sendBeacon() {
    if (this.eventQueue.length === 0) return;
    const data = JSON.stringify({
      events: this.eventQueue,
      websiteId: this.config.websiteId,
      pixelKey: this.config.pixelKey
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${SUPABASE_URL}/functions/v1/analytics-track`, new Blob([data], { type: 'application/json' }));
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private getElementSelector(element: HTMLElement): string {
    try {
      if (element.id) return `#${element.id}`;
      const selectors: string[] = [];
      let current: HTMLElement | null = element;

      while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        // 安全获取 className：SVG 元素的 className 是 SVGAnimatedString 对象，不是字符串
        const rawClassName = (current as any).className;
        const className = typeof rawClassName === 'string' ? rawClassName : (rawClassName?.baseVal || '');
        if (className) {
          const classes = className.split(' ')
            .filter((c: string) => c && !c.includes(' '))
            .slice(0, 2)
            .join('.');
          if (classes) selector += `.${classes}`;
        }
        selectors.unshift(selector);
        current = current.parentElement;
      }

      return selectors.join(' > ');
    } catch (e) {
      // 确保 selector 生成永远不会抛异常
      return 'unknown';
    }
  }

  private debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
    let timeout: number | null = null;
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = window.setTimeout(() => func(...args), wait);
    };
  }

  private throttle<T extends (...args: any[]) => void>(func: T, limit: number) {
    let inThrottle = false;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => { inThrottle = false; }, limit);
      }
    };
  }

  destroy() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.batchTimer) clearInterval(this.batchTimer);
    this.flushQueue();
    this.sendBeacon();
  }
}

// 导出单例
export const analytics = new AnalyticsPixel({
  websiteId: (window as any).__ANALYTICS_WEBSITE_ID__ || '',
  pixelKey: (window as any).__ANALYTICS_PIXEL_KEY__ || '',
  apiBase: '/api/analytics',
  debug: (import.meta as any).env?.DEV || false,
  enableClickTracking: true,
  enableScrollTracking: true,
  enableFormTracking: true
});

export default analytics;
