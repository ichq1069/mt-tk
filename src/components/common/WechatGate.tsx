import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import type { StorageConfig } from '@/types';
import { Loader2, Globe, ExternalLink, TriangleAlert } from 'lucide-react';

export const WechatGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWechat, setIsWechat] = useState(false);

  useEffect(() => {
    // 检测是否在微信浏览器中
    const ua = navigator.userAgent.toLowerCase();
    const isWx = /micromessenger/i.test(ua);
    setIsWechat(isWx);

    // 获取配置
    const fetchConfig = async () => {
      try {
        const { data } = await api.getStorageConfig();
        if (data) setConfig(data);
      } catch (err) {
        console.error('Failed to fetch storage config in WechatGate:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900/5 backdrop-blur-sm">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          正在载入环境安全检测...
        </p>
      </div>
    );
  }

  // 检查是否受限：如果是微信且开启了微信受阻
  const isForbidden = isWechat && config?.wechat_forbidden;

  if (isForbidden) {
    if (config?.wechat_forbidden_mode === 'custom' && config?.wechat_forbidden_html) {
      // 渲染自定义 HTML
      return (
        <div 
          className="min-h-screen w-full bg-background"
          dangerouslySetInnerHTML={{ __html: config.wechat_forbidden_html }} 
        />
      );
    }

    // 默认模板
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="max-w-sm w-full space-y-8 text-center animate-in zoom-in-95 duration-500">
          <div className="relative inline-block">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-primary/5 border-2 border-primary/20">
              <Globe className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-amber-500 rounded-full p-2 border-4 border-slate-50 dark:border-slate-950 shadow-lg animate-bounce">
              <TriangleAlert className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
              访问受限通知
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              为了确保您能够获得更优质、更流畅的视觉体验与交互操作，本站已针对微信内置浏览器进行了必要的访问限制。
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl shadow-primary/10 border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-lg font-bold">1</div>
              <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300">点击屏幕右上角的菜单按钮 <span className="text-primary mx-1">(•••)</span></p>
            </div>
            <div className="flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-lg font-bold">2</div>
              <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300">从弹出的菜单中选择 <span className="px-2 py-1 bg-primary text-white rounded-lg mx-1 inline-flex items-center gap-1">在浏览器打开 <ExternalLink className="w-3 h-3" /></span></p>
            </div>
          </div>

          <div className="pt-8 opacity-60">
            <div className="h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent mb-4"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              2026 {config?.site_title || '视觉赏析平台'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
