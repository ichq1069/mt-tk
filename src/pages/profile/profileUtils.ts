export const cleanTitle = (name: string | null | undefined, maxLength = 30): string => {
  if (!name) return '未命名';
  
  // 移除文件后缀名
  let cleaned = name.replace(/\.[^/.]+$/, "");
  
  // 去除无效字段的规则
  const invalidPatterns = [
    /^[0-9]{8,}$/,                           // 纯数字（8位以上）
    /^[a-f0-9]{32}$/i,                       // MD5/SHA256 哈希（32位十六进制）
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, // UUID
    /^[a-zA-Z0-9_-]{20,}$/,                  // 长随机字符串（20位以上）
    /^IMG_[0-9]+$/i,                         // IMG_数字格式
    /^DSC[0-9]+$/i,                          // DSC数字格式（相机默认）
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{6}$/, // 日期时间格式：2024-03-15_123456
    /^Screenshot_[0-9_-]+$/i,                // Screenshot_时间戳
    /^WechatIMG[0-9]+$/i,                    // 微信图片默认名
    /^QQ图片[0-9]+$/,                        // QQ图片默认名
  ];
  
  // 检查是否匹配无效模式
  for (const pattern of invalidPatterns) {
    if (pattern.test(cleaned)) {
      return '未命名';
    }
  }
  
  // 去除前后空格
  cleaned = cleaned.trim();
  
  // 如果清洗后为空，返回"未命名"
  if (!cleaned) return '未命名';
  
  // 限制长度
  if (cleaned.length > maxLength) {
    return cleaned.substring(0, maxLength) + '...';
  }
  
  return cleaned;
};
