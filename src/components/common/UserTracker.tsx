import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { analytics } from '@/lib/analytics-pixel';

export const UserTracker: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    // 初始化统计分析 SDK
    const initAnalytics = async () => {
      try {
        const { data } = await supabase
          .from('analytics_websites')
          .select('id, pixel_key')
          .eq('is_enabled', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const website = data as { id?: string; pixel_key?: string } | null;
        if (website?.id && website?.pixel_key) {
          // 获取用户 openid
          let openid: string | undefined;
          try {
            // 优先从 URL 参数中获取 openid
            const urlParams = new URLSearchParams(window.location.search);
            const urlOpenid = urlParams.get('openid');
            
            // 其次尝试从 localStorage 获取（优先每日图集缓存的 openid，支持跨日期复用）
            openid = urlOpenid || localStorage.getItem('daily_gallery_openid') || localStorage.getItem('openid') || undefined;
            
            if (openid === 'unknown_user') openid = undefined;
            
            // 如果从 URL 获取到了，存入缓存以便后续使用
            if (urlOpenid && urlOpenid !== 'unknown_user') {
              localStorage.setItem('daily_gallery_openid', urlOpenid);
              localStorage.setItem('openid', urlOpenid);
            }
          } catch (e) {}

          analytics.updateConfig({
            websiteId: website.id,
            pixelKey: website.pixel_key,
            userId: user?.id,
            openid
          });
          await analytics.init();
        }
      } catch (e) {
        console.warn('[Analytics] Init failed:', e);
      }
    };
    initAnalytics();

    const trackUser = async () => {
      const ua = navigator.userAgent || '';
      const uaLower = ua.toLowerCase();

      // 1. 设备 / 系统 / 浏览器
      let deviceType = 'PC';
      if (/mobile|android|iphone|ipod/.test(uaLower)) deviceType = 'Mobile';
      if (/ipad|tablet/.test(uaLower)) deviceType = 'Tablet';

      let os = 'Unknown';
      if (/windows/.test(uaLower)) os = 'Windows';
      else if (/mac/.test(uaLower)) os = 'macOS';
      else if (/android/.test(uaLower)) os = 'Android';
      else if (/iphone|ipad/.test(uaLower)) os = 'iOS';
      else if (/linux/.test(uaLower)) os = 'Linux';

      let browser = 'Unknown';
      if (/micromessenger/.test(uaLower)) browser = 'WeChat';
      else if (/chrome/.test(uaLower)) browser = 'Chrome';
      else if (/firefox/.test(uaLower)) browser = 'Firefox';
      else if (/safari/.test(uaLower)) browser = 'Safari';
      else if (/edge/.test(uaLower)) browser = 'Edge';

      // 2. 广告拦截检测
      let adBlocked = false;
      try {
        const test = document.createElement('div');
        test.innerHTML = '&nbsp;';
        test.className = 'adsbox';
        document.body.appendChild(test);
        adBlocked = test.offsetHeight === 0;
        document.body.removeChild(test);
      } catch (e) {}

      // 3. IP 地址与地理位置 (第三方接口)
      let ip = 'Unknown';
      let ipInfo: any = {};
      try {
        const res = await fetch('https://api.ip.sb/geoip');
        ipInfo = await res.json();
        ip = ipInfo.ip || 'Unknown';
      } catch (e) {
        console.warn('[UserTracker] IP geo fetch error:', e);
      }

      // 4. 页面与环境信息
      const resolution = `${window.screen.width}x${window.screen.height}`;
      const language = navigator.language;
      const path = window.location.pathname;
      const referrer = document.referrer || 'Direct';
      const pageTitle = document.title;

      // 5. 网络类型
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      const networkType = connection ? connection.effectiveType || connection.type : 'Unknown';

      // 6. 存储引荐人 (原逻辑保留)
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref && !user && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)) {
        sessionStorage.setItem('miaoda_ref', ref);
      }

      // 7. 发送统计数据
      await api.logUserVisitStats({
        user_id: user?.id || null,
        ip_address: ip,
        browser,
        os,
        network_type: networkType,
        adblock_enabled: adBlocked,
        path,
        device: deviceType,
        country: ipInfo.country,
        region: ipInfo.region,
        city: ipInfo.city,
        referrer,
        resolution,
        language,
        page_title: pageTitle,
        visited_at: new Date().toISOString()
      });
    };

    trackUser();
    
    // 每 30 秒尝试刷新一次通知缓冲
    const flushInterval = setInterval(() => {
      api.flushNotificationBuffer();
    }, 30000);

    return () => clearInterval(flushInterval);
  }, [user?.id]);

  return null;
};
