import React from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const NetworkStatusIndicator = React.memo(() => {
  const { isOnline, isSlowConnection } = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[10007] bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-2 shadow-lg"
        >
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">网络连接已断开</span>
        </motion.div>
      )}
      {isOnline && isSlowConnection && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[10007] bg-warning text-warning-foreground px-4 py-2 flex items-center justify-center gap-2 shadow-lg"
        >
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">当前网络较慢</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

NetworkStatusIndicator.displayName = 'NetworkStatusIndicator';
