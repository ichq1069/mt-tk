import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface UseVirtualScrollOptions {
  count: number;
  estimateSize: number;
  overscan?: number;
}

export function useVirtualScroll({ count, estimateSize, overscan = 5 }: UseVirtualScrollOptions) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  return {
    parentRef,
    virtualizer,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
  };
}
