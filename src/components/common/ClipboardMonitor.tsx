import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// 全局变量，在组件卸载重装时保持不变
let globalLastClipboard = '';

export const ClipboardMonitor: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const lastClipboardRef = useRef<string>(globalLastClipboard);

  useEffect(() => {
    // 权限校验：管理员全局识别，普通用户仅在上传页识别
    if (!isAdmin && location.pathname !== '/upload') return;

    const checkClipboard = async () => {
      try {
        // 只有当窗口获得焦点时尝试读取
        if (!document.hasFocus()) return;

        const text = await navigator.clipboard.readText();
        if (!text || text === lastClipboardRef.current) return;
        
        lastClipboardRef.current = text;
        globalLastClipboard = text;

        // 识别特定关键词：xhs, 小红书, weibo, 微博, zonerama, http/https 链接
        const keywords = ['xhs', 'xiaohongshu', '小红书', 'weibo', '微博', 'zonerama'];
        const isMatch = keywords.some(k => text.toLowerCase().includes(k)) || 
                        (text.includes('http') && (text.includes('xhslink.com') || text.includes('xiaohongshu.com') || text.includes('weibo.com')));

        if (isMatch) {
          // 如果已经在上传页面且在解析选项卡，且 URL 参数已匹配，则跳过提示
          if (location.pathname === '/upload') {
            const params = new URLSearchParams(window.location.search);
            const currentUrlParam = params.get('url');
            if (params.get('tab') === 'parse' && text.includes(currentUrlParam || '')) {
              return;
            }
          }

          // 提取链接部分（如果有的话）
          const urlMatch = text.match(/https?:\/\/[^\s]+/);
          const url = urlMatch ? urlMatch[0] : text;

          toast('检测到包含链接的剪贴板内容', {
            id: 'clipboard-link-detected',
            description: '是否跳转到解析导入页面？',
            action: {
              label: '跳转',
              onClick: () => {
                navigate(`/upload?tab=parse&url=${encodeURIComponent(url)}`);
              }
            },
            cancel: {
              label: '关闭',
              onClick: () => {
                // 点击关闭后，此内容的提示在当前生命周期内不再弹出
              }
            },
            duration: 10000,
          });
        }
      } catch (err) {
        // 忽略权限错误等
      }
    };

    // 监听窗口焦点变化
    window.addEventListener('focus', checkClipboard);
    
    // 初始检查
    checkClipboard();

    return () => {
      window.removeEventListener('focus', checkClipboard);
    };
  }, [isAdmin, navigate, location.pathname]);

  return null;
};
