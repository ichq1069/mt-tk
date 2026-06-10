import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AuditSection } from './AuditSection';
import { ReportsSection } from './ReportsSection';
import { FileCheck, ShieldAlert } from 'lucide-react';
import { useAdminLogger } from '@/hooks/useAdminLogger';

export function ContentSection({ 
  initialTab = 'audit',
  stats = { pending: 0, pending_reports: 0 },
  onAction
}: { 
  initialTab?: string;
  stats?: { pending: number; pending_reports: number };
  onAction?: () => void;
}) {
  const { logAction } = useAdminLogger('content');
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/50 p-1 max-w-md">
          <TabsTrigger value="audit" className="rounded-xl h-10 gap-2 font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileCheck className="w-4 h-4" />
            内容审核
            {stats.pending > 0 && (
              <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-bold shadow-lg shadow-primary/20">
                {stats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-xl h-10 gap-2 font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <ShieldAlert className="w-4 h-4" />
            举报管理
            {stats.pending_reports > 0 && (
              <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-destructive text-white text-[10px] font-bold shadow-lg shadow-destructive/20">
                {stats.pending_reports}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <div className="mt-6 animate-in fade-in duration-500 slide-in-from-bottom-2">
          <TabsContent value="audit" className="mt-0 focus-visible:outline-none">
            <AuditSection onAction={onAction} />
          </TabsContent>
          <TabsContent value="reports" className="mt-0 focus-visible:outline-none">
            <ReportsSection onAction={onAction} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
