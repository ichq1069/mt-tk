import React from 'react';
import { Smartphone, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DailyGalleryGuideProps {
  guideQrUrl: string | null;
  loadingGuideQr: boolean;
}

export const DailyGalleryGuide: React.FC<DailyGalleryGuideProps> = ({ guideQrUrl, loadingGuideQr }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in zoom-in duration-700">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
        <div className="relative w-24 h-24 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex items-center justify-center border border-primary/20">
          <Smartphone className="w-10 h-10 text-primary" />
        </div>
      </div>
      <div className="space-y-3 max-w-[280px]">
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">请在微信打开</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
          该内容仅限微信环境内访问，请使用微信扫描下方二维码或从公众号菜单进入。
        </p>
      </div>
      <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-100">
        {guideQrUrl ? (
          <img src={guideQrUrl} alt="Guide QR" className="w-48 h-48" />
        ) : (
          <div className="w-48 h-48 flex items-center justify-center bg-slate-50 rounded-3xl">
            <Smartphone className="w-12 h-12 text-slate-200" />
          </div>
        )}
      </div>
    </div>
  );
};
