import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, List, CalendarDays, FolderTree, Layers,
  Sparkles, Shuffle, ChevronDown, Check, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewLayoutType, LayoutConfig } from '@/types/layouts';
import { Button } from '@/components/ui/button';
import { useConfig } from '@/contexts/ConfigContext';

export const LAYOUT_CONFIGS: LayoutConfig[] = [
  { type: 'grid', label: '瀑布流', icon: 'LayoutGrid', description: '经典瀑布流布局' },
  { type: 'feed', label: '信息流', icon: 'List', description: '沉浸式滑动浏览' },
  { type: 'timeline', label: '时间线', icon: 'Clock', description: '按日期分组展示' },
  { type: 'folderTree', label: '文件夹', icon: 'FolderTree', description: '树形分类管理' },
  { type: 'calendar', label: '日历', icon: 'CalendarDays', description: '日历视图浏览' },
  { type: 'stackedCards', label: '卡片叠放', icon: 'Layers', description: '轻奢叠卡体验' },
  { type: 'freeform', label: '自由排版', icon: 'Shuffle', description: '艺术化自由摆放' },
  { type: 'starrySky', label: '星空探索', icon: 'Sparkles', description: '沉浸式星空浏览' },
];

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutGrid, List, CalendarDays, FolderTree, Layers, Sparkles, Shuffle, Clock
};

interface LayoutSwitcherProps {
  currentLayout: ViewLayoutType;
  onLayoutChange: (layout: ViewLayoutType) => void;
  allowedLayouts?: ViewLayoutType[];
  variant?: 'dropdown' | 'tabs' | 'compact';
  className?: string;
}

export function LayoutSwitcher({
  currentLayout,
  onLayoutChange,
  allowedLayouts: propAllowedLayouts,
  variant = 'dropdown',
  className
}: LayoutSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { config } = useConfig();

  // 获取允许显示的布局列表
  const finalAllowedLayouts = React.useMemo(() => {
    // 后台配置的可见布局 (系统级配置)
    const dbEnabledLayouts = config?.enabled_layouts;
    // 始终保留基础布局 grid 和 feed，其他布局根据配置过滤
    const globalEnabled = dbEnabledLayouts 
      ? ['grid', 'feed', ...(dbEnabledLayouts as ViewLayoutType[])]
      : LAYOUT_CONFIGS.map(c => c.type);
    
    // 如果组件显式传了 propAllowedLayouts，取交集，确保页面级限制与系统级配置共同生效
    if (propAllowedLayouts) {
      return propAllowedLayouts.filter(l => globalEnabled.includes(l));
    }
    
    return globalEnabled;
  }, [propAllowedLayouts, config?.enabled_layouts]);

  const availableConfigs = LAYOUT_CONFIGS.filter(c => finalAllowedLayouts.includes(c.type));

  // 自动回退：如果当前选中的布局不在允许列表中，自动切换到第一个可用布局（通常是瀑布流）
  React.useEffect(() => {
    const isCurrentValid = availableConfigs.some(c => c.type === currentLayout);
    if (!isCurrentValid && availableConfigs.length > 0) {
      onLayoutChange(availableConfigs[0].type);
    }
  }, [availableConfigs, currentLayout, onLayoutChange]);

  const currentConfig = availableConfigs.find(c => c.type === currentLayout) || availableConfigs[0];

  if (variant === 'tabs') {
    return (
      <div className={cn("flex gap-1 overflow-x-auto no-scrollbar py-1", className)}>
        {availableConfigs.map(config => {
          const Icon = ICON_MAP[config.icon] || LayoutGrid;
          const isActive = config.type === currentLayout;
          return (
            <button
              key={config.type}
              onClick={() => onLayoutChange(config.type)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {config.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {availableConfigs.map(config => {
          const Icon = ICON_MAP[config.icon] || LayoutGrid;
          const isActive = config.type === currentLayout;
          return (
            <Button
              key={config.type}
              variant={isActive ? 'secondary' : 'ghost'}
              size="icon"
              className={cn("h-8 w-8 rounded-lg", isActive && "bg-primary/10 text-primary")}
              onClick={() => onLayoutChange(config.type)}
              title={config.label}
            >
              <Icon className="w-4 h-4" />
            </Button>
          );
        })}
      </div>
    );
  }

  // dropdown variant (default)
  return (
    <div className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="h-9 px-3 rounded-xl bg-muted/50 hover:bg-muted gap-2 text-xs font-bold"
        onClick={() => setIsOpen(!isOpen)}
      >
        {(() => {
          const Icon = ICON_MAP[currentConfig.icon] || LayoutGrid;
          return <Icon className="w-4 h-4 text-primary" />;
        })()}
        {currentConfig.label}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 z-50 w-56 bg-popover rounded-2xl border border-border shadow-xl p-2 space-y-1"
            >
              {availableConfigs.map(config => {
                const Icon = ICON_MAP[config.icon] || LayoutGrid;
                const isActive = config.type === currentLayout;
                return (
                  <button
                    key={config.type}
                    onClick={() => {
                      onLayoutChange(config.type);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground/60")} />
                    <div className="flex-1 text-left">
                      <div className="font-bold text-xs">{config.label}</div>
                      <div className="text-[10px] text-muted-foreground/70">{config.description}</div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
