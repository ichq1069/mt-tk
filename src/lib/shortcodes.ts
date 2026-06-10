import { formatBeijingTime } from './utils';

export interface ShortcodeContext {
  user?: {
    name: string;
    email?: string;
  };
  site?: {
    title: string;
  };
  custom?: Record<string, string>;
}

/**
 * 全局解析短代码
 * @param text 需要解析的文本
 * @param context 上下文（用户、站点信息等）
 * @param extraShortcodes 后台存储的自定义短代码库（可选）
 */
export function parseShortcodes(
  text: string, 
  context: ShortcodeContext, 
  extraShortcodes: { key: string, value: string }[] = []
): string {
  if (!text) return '';
  let result = text;

  // 1. 系统默认短代码解析 (这些在 context 中维护逻辑)
  const systemMap: Record<string, string> = {
    'user.name': context.user?.name || '匿名用户',
    'date.yyyy-mm-dd': formatBeijingTime(new Date().toISOString()).split(' ')[0],
    'site.title': context.site?.title || '图片赏析平台'
  };

  Object.entries(systemMap).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });

  // 2. 数据库自定义短代码解析 (这些通常由管理员直接配置替换字符串)
  extraShortcodes.forEach(sc => {
    const regex = new RegExp(`\\{\\{${sc.key}\\}\\}`, 'g');
    result = result.replace(regex, sc.value);
  });

  return result;
}
