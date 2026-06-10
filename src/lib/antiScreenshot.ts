/**
 * 图片防截图工具类
 * 支持水印叠加、录屏检测、窗口失焦保护、右键禁用等多维度防护策略
 */

import { supabase } from '@/db/supabase';

export type PhotoLevel = 'pending' | 'normal' | 'vip' | 'svip' | 'restricted';

interface WatermarkConfig {
  userId: string;
  userInfo: string; // 脱敏手机号或用户名
  timestamp: string;
  opacity?: number;
}

interface AntiScreenshotOptions {
  photoId: string;
  photoLevel: PhotoLevel;
  userId?: string;
  userInfo?: string;
  onRecordingDetected?: () => void;
  onBlurDetected?: () => void;
  onRestored?: () => void;
}

class AntiScreenshotManager {
  private isRecording = false;
  private blurTimeout: any = null;
  private listeners: Array<{ target: any; event: string; handler: any }> = [];
  private currentOptions: AntiScreenshotOptions | null = null;

  /**
   * 生成用户专属水印 Canvas
   */
  generateWatermark(config: WatermarkConfig): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.fillStyle = `rgba(255, 255, 255, ${config.opacity || 0.2})`;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.userInfo, 100, 20);
    ctx.fillText(config.timestamp, 100, 40);
    ctx.fillText(`ID: ${config.userId.slice(0, 8)}`, 100, 55);

    return canvas;
  }

  /**
   * 在图片容器上叠加随机分布的水印
   */
  applyWatermarkOverlay(container: HTMLElement, config: WatermarkConfig) {
    const existingWatermark = container.querySelector('.anti-screenshot-watermark');
    if (existingWatermark) existingWatermark.remove();

    const watermarkCanvas = this.generateWatermark(config);
    const watermarkUrl = watermarkCanvas.toDataURL();

    const overlay = document.createElement('div');
    overlay.className = 'anti-screenshot-watermark';
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 10;
      background-image: url(${watermarkUrl});
      background-repeat: repeat;
      background-size: 200px 60px;
      opacity: 1;
      user-select: none;
    `;

    container.style.position = 'relative';
    container.appendChild(overlay);
  }

  /**
   * 检测屏幕录制（实验性 API）
   */
  private detectScreenRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      return; // 不支持的浏览器
    }

    // 监听 MediaRecorder 实例（需要浏览器支持）
    const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
    navigator.mediaDevices.getDisplayMedia = async (...args) => {
      this.isRecording = true;
      this.currentOptions?.onRecordingDetected?.();
      this.logAction('screen_recording_started');
      return originalGetDisplayMedia.apply(navigator.mediaDevices, args);
    };
  }

  /**
   * 监听窗口失焦（切屏截图保护）
   */
  private monitorWindowBlur(imgElement: HTMLImageElement, placeholderUrl: string) {
    const originalSrc = imgElement.src;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        imgElement.src = placeholderUrl;
        this.currentOptions?.onBlurDetected?.();
        this.logAction('window_blur');
      } else {
        // 恢复前验证权限（简化版：直接恢复）
        clearTimeout(this.blurTimeout);
        this.blurTimeout = setTimeout(() => {
          imgElement.src = originalSrc;
          this.currentOptions?.onRestored?.();
        }, 300);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    this.listeners.push({ target: document, event: 'visibilitychange', handler: handleVisibilityChange });
  }

  /**
   * 禁用右键菜单和长按保存
   */
  private disableContextMenu(container: HTMLElement) {
    const preventContext = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    container.addEventListener('contextmenu', preventContext);
    container.addEventListener('touchstart', (e) => {
      if ((e as TouchEvent).touches.length > 1) return; // 允许双指缩放
      // 检测长按（超过 500ms）
      const timer = setTimeout(() => {
        this.logAction('long_press_attempt');
      }, 500);
      
      const clearTimer = () => {
        clearTimeout(timer);
        container.removeEventListener('touchend', clearTimer);
        container.removeEventListener('touchmove', clearTimer);
      };
      
      container.addEventListener('touchend', clearTimer, { once: true });
      container.addEventListener('touchmove', clearTimer, { once: true });
    });

    this.listeners.push({ target: container, event: 'contextmenu', handler: preventContext });
  }

  /**
   * 禁用 F12 和审查元素（移动端无效，仅桌面端）
   */
  private disableDevTools() {
    const preventKeys = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('keydown', preventKeys);
    this.listeners.push({ target: document, event: 'keydown', handler: preventKeys });
  }

  /**
   * 记录截图行为到 Supabase
   */
  private async logAction(actionType: string) {
    if (!this.currentOptions) return;

    try {
      // 通过 Edge Function 上报日志，支持审计
      await supabase.functions.invoke('report-anti-screenshot', {
        body: {
          userId: this.currentOptions.userId || null,
          photoId: this.currentOptions.photoId,
          actionType,
          userAgent: navigator.userAgent,
          metadata: {
            timestamp: new Date().toISOString(),
            level: this.currentOptions.photoLevel
          }
        }
      });
    } catch (err) {
      console.error('[AntiScreenshot] Log failed:', err);
    }
  }

  /**
   * 启用防截图保护
   */
  enable(container: HTMLElement, imgElement: HTMLImageElement, options: AntiScreenshotOptions) {
    this.currentOptions = options;
    const { photoLevel, userId, userInfo } = options;

    // 1. 普通级/待分级：不启用任何防护
    if (photoLevel === 'normal' || photoLevel === 'pending') return;

    // 2. VIP/SVIP 非限制级：水印 + 右键禁用
    if (photoLevel === 'vip' || photoLevel === 'svip') {
      if (userId && userInfo) {
        this.applyWatermarkOverlay(container, {
          userId,
          userInfo,
          timestamp: new Date().toLocaleString('zh-CN', { 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          opacity: photoLevel === 'svip' ? 0.2 : 0.15 // SVIP 水印略重
        });
      }
      this.disableContextMenu(container);
      return;
    }

    // 3. 限制级：全套防护
    if (photoLevel === 'restricted') {
      // 水印
      if (userId && userInfo) {
        this.applyWatermarkOverlay(container, {
          userId,
          userInfo,
          timestamp: new Date().toLocaleString('zh-CN', { 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          opacity: 0.2
        });
      }

      // 右键禁用
      this.disableContextMenu(container);

      // 窗口失焦保护
      const placeholderUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk0YTNiOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuKaoO+4jyDpmLLmiKrlm77kv53miqQ8L3RleHQ+PC9zdmc+';
      this.monitorWindowBlur(imgElement, placeholderUrl);

      // 禁用开发者工具（桌面端）
      this.disableDevTools();

      // 监听全屏切换 (录屏工具常触发)
      const handleFullScreen = () => {
        this.logAction('fullscreen_event');
      };
      imgElement.addEventListener('webkitdisplayingfullscreen', handleFullScreen);
      this.listeners.push({ target: imgElement, event: 'webkitdisplayingfullscreen', handler: handleFullScreen });

      // 录屏检测（实验性）
      this.detectScreenRecording();
    }
  }

  /**
   * 清理所有监听器
   */
  disable() {
    this.listeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    this.listeners = [];
    this.currentOptions = null;
    clearTimeout(this.blurTimeout);
  }
}

export const antiScreenshotManager = new AntiScreenshotManager();
