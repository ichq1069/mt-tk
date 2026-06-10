import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // 首页路径不执行自动置顶，由首页自行管理位置恢复
    if (pathname === '/') return;
    
    // 如果是 POP (后退/前进按钮) 导航，不强制置顶，允许浏览器或 useWaterfallScrollKeep 恢复位置
    if (navType === 'POP') return;

    // 使用 setTimeout 确保在 DOM 更新后执行
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname, navType]);

  return null;
}
