import { useEffect } from 'react';
import type { FC } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { RouteGuard } from '@/components/common/RouteGuard';
import { Layout } from '@/components/common/Layout';
import { UserTracker } from '@/components/common/UserTracker';
import { ProgressBar } from '@/components/common/ProgressBar';
import { ScrollToTop } from '@/components/common/ScrollToTop';

import { WechatGate } from '@/components/common/WechatGate';
import { routes } from '@/routes';
import { AnimatePresence } from 'framer-motion';
import { GlobalAssetsInjector } from '@/components/common/GlobalAssetsInjector';
import { AppWrapper } from '@/components/common/PageMeta';
import { AuthProvider } from '@/contexts/AuthContext';
import { ConfigProvider, useConfig } from '@/contexts/ConfigContext';
import { ViewStateProvider } from '@/contexts/ViewStateContext';
import { KeywordReplacementProvider } from '@/contexts/KeywordReplacementContext';
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LoginDialog } from '@/components/auth/LoginDialog';
import { DebugLogOverlay } from '@/components/common/DebugLogOverlay';
import { ConfirmDialogProvider } from '@/components/ui/confirm-dialog';
import { NetworkStatusIndicator } from '@/components/common/NetworkStatusIndicator';
import { NotificationPreferencesProvider } from '@/contexts/NotificationPreferencesContext';
import { GlobalMusicPlayer } from '@/components/GlobalMusicPlayer';
import { EasterEggTrigger } from '@/components/EasterEggTrigger';
import { StarHuntTrigger } from '@/components/StarHuntTrigger';
import { AdProvider } from '@/contexts/AdContext';

const AnimatedRoutes = () => {
  const location = useLocation();
  const { config } = useConfig();

  // 首页重定向逻辑
  const homepagePath = config?.homepage_path || '/';
  const isRoot = location.pathname === '/';

  // 后台页面不需要外层动画切换
  const isAdminPath = location.pathname.startsWith('/admin/analytics') || location.pathname.startsWith('/admin/pc');
  const animationKey = isAdminPath ? 'admin-backend' : location.pathname;

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={animationKey}>
        {isRoot && homepagePath !== '/' && (
          <Route path="/" element={<Navigate to={homepagePath} replace />} />
        )}
        {routes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={route.element}
          />
        ))}
        <Route path="/admin-pc" element={<Navigate to="/admin/pc" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const App: FC = () => {
  return (
    <AppWrapper>
      <HelmetProvider>
        <Router>
          <AuthProvider>
            <ConfigProvider>
              <KeywordReplacementProvider>
                <TooltipProvider>
                  <AdProvider>
                    <ViewStateProvider>
                      <NotificationPreferencesProvider>
                        <NetworkStatusIndicator />
                        <GlobalMusicPlayer />
                        <DebugLogOverlay />
                        <ConfirmDialogProvider />
                        <GlobalAssetsInjector />
                        <ScrollToTop />
                        <WechatGate>
                          <ProgressBar />
                          <UserTracker />
                          <RouteGuard>
                            <Layout>
                              <AnimatedRoutes />
                            </Layout>
                          </RouteGuard>
                        </WechatGate>
                        <Toaster position="top-center" richColors duration={1500} closeButton />
                      </NotificationPreferencesProvider>
                    </ViewStateProvider>
                  </AdProvider>
                </TooltipProvider>
              </KeywordReplacementProvider>
            </ConfigProvider>
          </AuthProvider>
        </Router>
      </HelmetProvider>
    </AppWrapper>
  );
};

export default App;
