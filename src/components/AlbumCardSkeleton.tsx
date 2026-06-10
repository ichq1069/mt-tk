import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon } from 'lucide-react';

export function AlbumCardSkeleton() {
  return (
    <Card className="overflow-hidden border-none shadow-sm rounded-2xl bg-white/50 border border-slate-100 flex flex-col relative animate-in fade-in duration-500">
      <div className="relative aspect-[3/4] overflow-hidden bg-slate-200/50 flex items-center justify-center">
        <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
        <ImageIcon className="w-8 h-8 text-slate-300 animate-pulse" />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-2/3 rounded-lg" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded-full" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
      </div>
    </Card>
  );
}
