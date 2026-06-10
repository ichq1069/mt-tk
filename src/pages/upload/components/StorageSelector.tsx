import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Settings, Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StorageSelectorProps {
  selectedStorage: 'r2' | 'superbed';
  setSelectedStorage: (val: 'r2' | 'superbed') => void;
}

export const StorageSelector: React.FC<StorageSelectorProps> = ({
  selectedStorage,
  setSelectedStorage
}) => {
  return (
    <div className="mb-6 p-4 rounded-2xl bg-muted/30 border border-border/50">
      <Label className="text-sm font-bold mb-3 block flex items-center gap-2">
        <Settings className="w-4 h-4 text-primary" />
        选择存储服务
      </Label>
      <RadioGroup 
        value={selectedStorage} 
        onValueChange={(val: any) => setSelectedStorage(val)}
        className="grid grid-cols-2 gap-4"
      >
        <div className="relative">
          <RadioGroupItem value="r2" id="storage-r2" className="peer sr-only" />
          <Label
            htmlFor="storage-r2"
            className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span className="font-bold">默认存储 (R2)</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">本地极速上传，支持切片</p>
          </Label>
        </div>
        <div className="relative">
          <RadioGroupItem value="superbed" id="storage-superbed" className="peer sr-only" />
          <Label
            htmlFor="storage-superbed"
            className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              <span className="font-bold">聚合图床</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">第三方节点加速，分发优化</p>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};
