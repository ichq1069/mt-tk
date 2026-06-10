/**
 * 通知音效管理器
 * 提供不同类型通知的声音效果
 */

// 使用 Web Audio API 生成简单的通知音效
class NotificationSoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    // 延迟初始化 AudioContext，避免自动播放策略限制
    if (typeof window !== 'undefined') {
      // 监听用户交互后初始化
      const initAudio = () => {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        document.removeEventListener('click', initAudio);
        document.removeEventListener('touchstart', initAudio);
      };
      document.addEventListener('click', initAudio, { once: true });
      document.addEventListener('touchstart', initAudio, { once: true });
    }
  }

  private ensureAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * 播放成功通知音效（清脆的上升音）
   */
  playSuccess() {
    if (!this.enabled) return;
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    oscillator.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.1); // G5

    gainNode.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }

  /**
   * 播放错误通知音效（低沉的下降音）
   */
  playError() {
    if (!this.enabled) return;
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(392.00, ctx.currentTime); // G4
    oscillator.frequency.exponentialRampToValueAtTime(261.63, ctx.currentTime + 0.15); // C4

    gainNode.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.25);
  }

  /**
   * 播放信息通知音效（单音）
   */
  playInfo() {
    if (!this.enabled) return;
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(659.25, ctx.currentTime); // E5

    gainNode.gain.setValueAtTime(this.volume * 0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  }

  /**
   * 播放警告通知音效（双音）
   */
  playWarning() {
    if (!this.enabled) return;
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    
    // 第一个音
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440.00, ctx.currentTime); // A4
    gain1.gain.setValueAtTime(this.volume * 0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.1);

    // 第二个音
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(440.00, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(this.volume * 0.2, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.22);
  }

  /**
   * 设置音量 (0-1)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 启用/禁用声音
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * 获取当前状态
   */
  getEnabled() {
    return this.enabled;
  }

  getVolume() {
    return this.volume;
  }
}

// 导出单例
export const notificationSound = new NotificationSoundManager();
