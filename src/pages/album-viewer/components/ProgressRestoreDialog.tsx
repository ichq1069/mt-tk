import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RefreshCw } from 'lucide-react';

interface ProgressRestoreDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  savedIndex: number | null;
  onContinue: () => void;
  onStartOver: () => void;
}

export const ProgressRestoreDialog: React.FC<ProgressRestoreDialogProps> = ({
  isOpen,
  onOpenChange,
  savedIndex,
  onContinue,
  onStartOver
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl bg-slate-900 border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            发现上次阅读进度
          </DialogTitle>
          <DialogDescription className="text-white/40">
            您上次阅读到第 {savedIndex !== null ? savedIndex + 1 : 1} 页，是否继续浏览？
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col sm:gap-2">
          <Button 
            className="w-full rounded-2xl h-11 font-black bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            onClick={onContinue}
          >
            继续阅读
          </Button>
          <Button 
            variant="ghost" 
            className="w-full rounded-2xl h-11 font-bold text-white/40 hover:bg-white/5"
            onClick={onStartOver}
          >
            从头开始
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
