import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { generateUUID } from './utils';

const STORAGE_KEY = 'miaoda_browser_fingerprint';

/**
 * 获取设备指纹 ID
 * 结合 FingerprintJS 和 localStorage 确保持久性
 */
export async function getFingerprint(): Promise<string> {
  // 1. 优先从 localStorage 读取
  let fingerprint = localStorage.getItem(STORAGE_KEY);
  
  if (fingerprint && fingerprint.length > 10) {
    return fingerprint;
  }

  try {
    // 2. 否则通过 FingerprintJS 生成
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    fingerprint = result.visitorId;
    
    // 3. 存入 localStorage 以便下次使用（防清 Cookie）
    if (fingerprint) {
      localStorage.setItem(STORAGE_KEY, fingerprint);
    }
  } catch (error) {
    console.error('Failed to generate fingerprint:', error);
  }

  // 4. 降级方案：如果指纹库失效且本地没存，生成一个随机 UUID
  if (!fingerprint) {
    fingerprint = generateUUID();
    localStorage.setItem(STORAGE_KEY, fingerprint);
  }

  return fingerprint;
}
