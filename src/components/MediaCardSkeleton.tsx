import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Camera, Loader2 } from 'lucide-react';

export function MediaCardSkeleton() {
  return (
    <Card className="overflow-hidden border-none shadow-sm rounded-xl bg-card flex flex-col relative animate-in fade-in duration-500">
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-muted/20 flex items-center justify-center">
        <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
        <div className="relative z-10 flex flex-col items-center gap-2 opacity-20">
          <Camera className="w-8 h-8 text-muted-foreground animate-pulse" />
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
        </div>
      </div>
      <div className="p-2 bg-card border-t border-border/10 flex flex-col gap-1.5">
        <div className="flex gap-1 mb-0.5">
          <Skeleton className="h-3 w-8 rounded-sm" />
          <Skeleton className="h-3 w-12 rounded-sm" />
        </div>
        <Skeleton className="h-3.5 w-3/4 rounded-sm" />
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <div className="flex items-center gap-1 overflow-hidden flex-1">
            <Skeleton className="w-3.5 h-3.5 rounded-full shrink-0" />
            <Skeleton className="h-2.5 w-16 rounded-sm" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Skeleton className="h-2.5 w-8 rounded-sm" />
            <Skeleton className="h-2.5 w-10 rounded-sm" />
          </div>
        </div>
      </div>
    </Card>
  );
}
