import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DuplicatesSection } from './components/DuplicatesSection';

export default function Duplicates() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/pc')}
            >
              ← 返回
            </Button>
            <div>
              <h1 className="text-lg font-bold">重复素材查重</h1>
              <p className="text-xs text-muted-foreground">管理和清理重复上传的文件</p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 md:p-8">
        <DuplicatesSection />
      </div>
    </div>
  );
}
