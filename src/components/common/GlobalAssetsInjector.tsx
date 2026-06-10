import React, { useEffect } from 'react';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';

export const GlobalAssetsInjector: React.FC = () => {
  const { profile, user } = useAuth();

  useEffect(() => {
    // 缓存用户信息到本地存储，以便在页面初次加载时能立即获取（即使 AuthContext 还没初始化完）
    if (user || profile) {
      const cache = {
        userId: user?.id,
        userName: profile?.username || (user?.user_metadata as any)?.username || user?.email?.split('@')[0],
        userEmail: user?.email,
        userMobile: profile?.mobile || (user?.user_metadata as any)?.mobile,
        userDigitalId: profile?.digital_id
      };
      localStorage.setItem('miaoda_stats_user_cache', JSON.stringify(cache));
    }
  }, [user?.id, profile?.id]);

  useEffect(() => {
    let clickHandler: ((e: MouseEvent) => void) | null = null;

    // 预解析关键域名，加快资源加载
    const preconnectDomains = [
      import.meta.env.VITE_SUPABASE_URL,
      'https://pub-a39e26dae2e041e189462c89729727c7.r2.dev',
      'https://us.zonerama.com',
      'https://zonerama.com',
      'https://imgdb.cn',
      'https://superbed.cn'
    ];

    preconnectDomains.forEach(domain => {
      if (!domain) return;
      if (!document.querySelector(`link[href="${domain}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
        
        const dnsLink = document.createElement('link');
        dnsLink.rel = 'dns-prefetch';
        dnsLink.href = domain;
        document.head.appendChild(dnsLink);
      }
    });

    const injectAssets = async () => {
      try {
        const [configRes, shortcodesRes, storageConfigRes] = await Promise.all([
          api.getSystemConfig('global_assets').catch(() => ({ data: null })),
          api.getShortcodes().catch(() => ({ data: [] })),
          api.getStorageConfig().catch(() => ({ data: null }))
        ]);

        const data = configRes?.data;
        const shortcodesData = shortcodesRes?.data;
        const storageConfig = storageConfigRes?.data;

        if (!data || !data.value) return;

        let { global_head, statistics_code, custom_js, custom_css } = data.value;

        // 注入 Global Head
        if (global_head) {
          // 清理旧的 head 注入
          document.querySelectorAll('[data-global-head]').forEach(el => el.remove());
          
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = global_head;
          
          // 按照 node 顺序注入，但确保 meta 优先于其他资源
          const nodes = Array.from(tempDiv.childNodes);
          nodes.forEach(node => {
            if (node.nodeName === 'META') {
              const newNode = node.cloneNode(true) as HTMLElement;
              newNode.setAttribute('data-global-head', 'true');
              // 插入到 head 的最前面，确保 Referrer Policy 等尽早生效
              document.head.insertBefore(newNode, document.head.firstChild);
            } else if (node.nodeName === 'SCRIPT') {
              const oldScript = node as HTMLScriptElement;
              const newScript = document.createElement('script');
              Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
              newScript.setAttribute('data-global-head', 'true');
              if (oldScript.src) {
                newScript.src = oldScript.src;
                newScript.async = true;
              } else {
                newScript.text = oldScript.text;
              }
              document.head.appendChild(newScript);
            } else {
              const newNode = node.cloneNode(true);
              if (newNode instanceof HTMLElement) {
                newNode.setAttribute('data-global-head', 'true');
              }
              document.head.appendChild(newNode);
            }
          });
        }

        // 尝试从缓存中获取用户信息作为初次加载的兜底，解决“只能在我的页面获取信息”的问题
        const cachedUserStr = localStorage.getItem('miaoda_stats_user_cache');
        const cachedUser = cachedUserStr ? JSON.parse(cachedUserStr) : {};

        // 替换统计代码中的占位符
        if (statistics_code) {
          const replacements: Record<string, string> = {
            '{{user.id}}': user?.id || cachedUser.userId || '',
            '{{user.name}}': profile?.username || (user?.user_metadata as any)?.username || user?.email?.split('@')[0] || cachedUser.userName || '',
            '{{user.email}}': user?.email || cachedUser.userEmail || '',
            '{{user.mobile}}': profile?.mobile || (user?.user_metadata as any)?.mobile || cachedUser.userMobile || '',
            '{{user.digital_id}}': profile?.digital_id || cachedUser.userDigitalId || '',
            '{{site.title}}': storageConfig?.site_title || '',
            '{{date.yyyy-mm-dd}}': new Date().toISOString().split('T')[0],
          };

          // 1. 同时也支持个人资料中的自定义字段替换
          if (profile?.custom_fields) {
            Object.entries(profile.custom_fields).forEach(([key, val]) => {
              if (!replacements[`{{${key}}}`]) {
                replacements[`{{${key}}}`] = String(val || '');
              }
            });
          }

          // 2. 支持全站通用的自定义短代码替换
          if (shortcodesData && Array.isArray(shortcodesData)) {
            shortcodesData.forEach(sc => {
              if (!sc.is_active) return;
              const key = `{{${sc.key}}}`;
              const val = String(sc.value || '');
              if (val !== key && !replacements[key]) {
                replacements[key] = val;
              }
            });
          }

          // 3. 处理嵌套变量
          Object.keys(replacements).forEach(key => {
            let val = replacements[key];
            if (val && typeof val === 'string' && val.includes('{{')) {
              Object.entries(replacements).forEach(([rKey, rVal]) => {
                if (key !== rKey) {
                  val = val.replace(new RegExp(rKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), rVal);
                }
              });
              replacements[key] = val;
            }
          });

          // 执行替换并注入
          Object.entries(replacements).forEach(([key, value]) => {
            const safeValue = JSON.stringify(String(value || '')).slice(1, -1);
            const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            statistics_code = statistics_code.replace(regex, safeValue);
            if (global_head) {
              global_head = global_head.replace(regex, safeValue);
            }
          });

          // 清理之前的注入
          document.querySelectorAll('[data-global-stats]').forEach(el => el.remove());

          const div = document.createElement('div');
          div.innerHTML = statistics_code;
          
          const fragment = document.createDocumentFragment();
          Array.from(div.childNodes).forEach(node => {
            if (node.nodeName !== 'SCRIPT') {
              const clone = node.cloneNode(true);
              if (clone instanceof HTMLElement) clone.setAttribute('data-global-stats', 'true');
              fragment.appendChild(clone);
            }
          });
          document.body.appendChild(fragment);

          div.querySelectorAll('script').forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.setAttribute('data-global-stats', 'true');
            if (oldScript.src) {
              newScript.src = oldScript.src;
              newScript.async = true;
            } else {
              newScript.text = oldScript.text;
            }
            document.head.appendChild(newScript);
          });
        }

        // 注入 CSS/JS
        if (custom_css && !document.getElementById('custom-global-css')) {
          const style = document.createElement('style');
          style.id = 'custom-global-css';
          style.appendChild(document.createTextNode(custom_css));
          document.head.appendChild(style);
        }
        if (custom_js && !document.getElementById('custom-global-js')) {
          const script = document.createElement('script');
          script.id = 'custom-global-js';
          script.appendChild(document.createTextNode(custom_js));
          document.body.appendChild(script);
        }

        // 设置全局追踪函数
        (window as any).pixelTrack = (goalName: string, params?: any) => {
          const pixel = (window as any).pixel || (window as any).ttPixel || (window as any)._pixel;
          if (pixel && typeof pixel.track === 'function') {
            pixel.track(goalName, params);
          }
        };

        clickHandler = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          const trackBtn = target.closest('[data-track]');
          if (trackBtn) {
            const goal = trackBtn.getAttribute('data-track');
            if (goal) (window as any).pixelTrack(goal);
          }
        };
        document.addEventListener('click', clickHandler);
      } catch (error) {
        console.error('Failed to inject global assets:', error);
      }
    };

    injectAssets();

    return () => {
      if (clickHandler) document.removeEventListener('click', clickHandler);
      const style = document.getElementById('custom-global-css');
      if (style) style.remove();
      const script = document.getElementById('custom-global-js');
      if (script) script.remove();
      document.querySelectorAll('[data-global-head]').forEach(el => el.remove());
      document.querySelectorAll('[data-global-stats]').forEach(el => el.remove());
    };
  }, [user?.id, profile?.id]);

  return null;
};
