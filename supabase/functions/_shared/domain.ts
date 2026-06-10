// supabase/functions/_shared/domain.ts
import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * 匹配请求来源域名并返回配置
 * @param supabase 
 * @param providedUrl 
 * @returns 
 */
export async function matchDomainConfig(supabase: SupabaseClient, providedUrl?: string) {
  if (!providedUrl) return null;

  // 清理 URL (去掉末尾斜杠)
  const cleanUrl = providedUrl.replace(/\/$/, '');

  const { data, error } = await supabase
    .from('domain_configs')
    .select('*')
    .eq('domain_url', cleanUrl)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[Domain Match Error]:', error.message);
    return null;
  }

  return data;
}

/**
 * 获取默认域名配置
 * @param supabase 
 */
export async function getDefaultDomainConfig(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('domain_configs')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return data;
}
