/**
 * 简单的 OpenID 加密/解密工具
 * 用于在 URL 中隐藏真实的 OpenID，防止直接泄露
 */

export const encodeOpenId = (openid: string): string => {
  if (!openid) return '';
  try {
    // 混淆逻辑：翻转字符串 -> 转为 Base64 -> 替换一些字符防止 URL 冲突
    const reversed = openid.split('').reverse().join('');
    const base64 = btoa(encodeURIComponent(reversed));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (e) {
    console.error('Failed to encode OpenID:', e);
    return openid;
  }
};

export const decodeOpenId = (encoded: string): string => {
  if (!encoded) return '';
  // 如果长度看起来不像是加密后的（加密后通常 > 35位），直接返回
  if (encoded.length < 30) return encoded;
  try {
    // 恢复 Base64 格式
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const decodedB64 = typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const reversed = decodeURIComponent(decodedB64);
    const result = reversed.split('').reverse().join('');
    // 微信 OpenID 通常是 28 位，如果解出来长度不对，可能是误判，返回原值
    if (result.length !== 28 && !result.startsWith('o')) {
       return encoded;
    }
    return result;
  } catch (e) {
    // 如果解密失败，返回原值（兼容旧版或未加密的 ID）
    return encoded;
  }
};
