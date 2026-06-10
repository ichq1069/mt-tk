import React from 'react';
import { cn } from '@/lib/utils';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Smartphone, Loader2, RefreshCw, QrCode, Copy, RefreshCcw, Megaphone, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { zhCN } from 'date-fns/locale';
import { format } from 'date-fns';

interface DailyGalleryPasswordProps {
  loading: boolean;
  password: string;
  setPassword: (val: string) => void;
  handleVerify: () => void;
  dgConfig: any;
  mpQrUrl: string | null;
  loadingMpQr: boolean;
  handleGenerateMpQr: () => void;
  resetMpState: () => void;
  mpDebugConfig: any;
  mpQrPage: string | null;
  mpQrScene: string | null;
  wechatConfig: any;
  qrUrl: string;
  loadingQr: boolean;
  dateParam: string;
  handleDateSelect: (date: Date | undefined) => void;
  updateManualInput?: (val: boolean) => void;
  announcements?: any[];
  onShowAnn?: () => void;
}

export const DailyGalleryPassword: React.FC<DailyGalleryPasswordProps> = ({
  loading, password, setPassword, handleVerify, dgConfig, mpQrUrl, loadingMpQr, handleGenerateMpQr, resetMpState, mpDebugConfig, mpQrPage, mpQrScene,
  wechatConfig, qrUrl, loadingQr, dateParam, handleDateSelect, updateManualInput, announcements, onShowAnn
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in duration-500 max-w-md mx-auto relative min-h-[60vh]">
      {/* 顶部公告图标 (如果存在) */}
      {announcements && announcements.length > 0 && (
        <div className="absolute top-0 right-0 z-10 p-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full h-10 px-4 bg-white/10 backdrop-blur-md border-white/20 text-amber-500 hover:bg-white/20 flex items-center gap-2"
            onClick={onShowAnn}
          >
            <Megaphone className="w-4 h-4" />
            <span className="text-xs font-bold">查看公告</span>
            {announcements.length > 1 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white">
                {announcements.length}
              </span>
            )}
          </Button>
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
        <div className="relative w-24 h-24 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex items-center justify-center border border-white/20 dark:border-slate-800 ring-1 ring-black/5">
          <Lock className="w-10 h-10 text-primary" />
        </div>
      </div>
      
      <div className="text-center space-y-2 max-w-[280px]">
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">私密访问</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">该内容已加密，请输入访问密码或扫码获取解锁码</p>
      </div>

      <div className="w-full space-y-6">
        {/* 日期选择 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pl-1">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">选择日期</span>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full h-14 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 px-6 justify-between text-lg font-black shadow-xl shadow-slate-200/50 dark:shadow-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
              >
                <span className="tracking-tight">{dateParam}</span>
                <CalendarIcon className="w-5 h-5 text-primary" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl" align="center">
              <Calendar
                mode="single"
                selected={new Date(dateParam)}
                onSelect={handleDateSelect}
                initialFocus
                locale={zhCN}
                className="rounded-2xl border-none"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 pl-1">
            <Lock className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">访问密码</span>
          </div>
          <div className="relative group">
            <Input
              type="text"
              placeholder="请输入 6 位访问密码"
              className="h-14 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 px-6 text-center text-lg font-black tracking-[0.5em] placeholder:tracking-normal placeholder:font-medium shadow-xl shadow-slate-200/50 dark:shadow-none focus:ring-2 focus:ring-primary transition-all group-hover:border-primary/30"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (updateManualInput) updateManualInput(true);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            />
          </div>
        </div>
        
        <Button 
          className="w-full h-14 rounded-2xl text-lg font-black shadow-xl shadow-primary/20 bg-primary hover:brightness-110 active:scale-95 transition-all"
          onClick={() => handleVerify()}
          disabled={loading || !password}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '确认并解锁内容'}
        </Button>
      </div>

      {/* 微信公众号解锁 */}
      {wechatConfig && (
        <div className="w-full p-1.5 rounded-[2.5rem] bg-slate-100/50 dark:bg-slate-800/30 backdrop-blur-xl border border-white dark:border-slate-800 shadow-inner">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-5">
            <div className="relative group shrink-0">
              <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center shadow-inner relative">
                {loadingQr ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Loading</span>
                  </div>
                ) : qrUrl ? (
                  <img src={qrUrl} alt="公众号码" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-slate-300" />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5 flex-1">
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight font-medium">
                {wechatConfig.type === 'service_auth' ? (
                  <>请使用微信<span className="text-primary font-black">扫码关注公众号</span>，发送<span className="text-primary font-black italic">“{dgConfig.service_auth_keyword || '解锁'}”</span>或点击菜单获取专属访问链接。</>
                ) : (
                  <>扫码关注公众号，回复<span className="text-primary font-black italic">“{dgConfig.password_keyword || '今日图片'}”</span>即可获取今日访问动态密码。</>
                )}
              </p>
              {wechatConfig.type === 'service_auth' && (
                <p className="text-[9px] text-slate-400">已授权用户扫码可直接同步身份</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 小程序解锁 */}
      {dgConfig.enable_miniprogram_ad && (
        <div className="w-full p-1.5 rounded-[2.5rem] bg-slate-100/50 dark:bg-slate-800/30 backdrop-blur-xl border border-white dark:border-slate-800 shadow-inner">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-5">
            <div className="relative group shrink-0">
              <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center shadow-inner relative">
                {loadingMpQr ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Generating</span>
                  </div>
                ) : mpQrUrl === 'WATCHING' || mpQrUrl === 'PASSWORD_READY' ? (
                  <div className="flex flex-col items-center justify-center text-center p-2 gap-1.5 h-full w-full bg-slate-50 dark:bg-slate-800 animate-in fade-in duration-300">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full animate-pulse" />
                      {mpQrUrl === 'WATCHING' ? (
                        <div className="relative">
                          <Smartphone className="w-6 h-6 text-primary animate-bounce" />
                          <div className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                          </div>
                        </div>
                      ) : (
                        <CheckCircle className="w-6 h-6 text-green-500 relative animate-in zoom-in duration-500" />
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      className={cn(
                        "h-7 text-[10px] rounded-full px-4 font-bold transition-all",
                        mpQrUrl === 'PASSWORD_READY' ? "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20" : "bg-primary hover:bg-primary/90"
                      )}
                      onClick={() => {
                        if (mpQrUrl === 'PASSWORD_READY' && password) {
                          setPassword(password);
                          toast.success('密码已填入');
                        }
                        handleVerify();
                      }}
                    >
                      {mpQrUrl === 'PASSWORD_READY' ? '立即验证' : '正在观看'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[8px] text-slate-400 mt-1 hover:text-primary transition-colors flex items-center gap-1"
                      onClick={() => {
                        resetMpState();
                        handleGenerateMpQr();
                        toast.info('正在重新生成小程序码...');
                      }}
                    >
                      <RefreshCcw className="w-3 h-3" />
                      刷新码
                    </Button>
                  </div>
                ) : mpQrUrl ? (
                  <img src={mpQrUrl} alt="小程序码" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-slate-300" />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5 flex-1">
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight font-medium">
                {mpQrUrl === 'WATCHING' ? (
                  <>
                    <span className="flex items-center gap-1 mb-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                      </span>
                      <span className="text-purple-600 dark:text-purple-400 font-bold">广告观看中...</span>
                    </span>
                    检测到您已扫码，请在小程序中<span className="text-purple-600 dark:text-purple-400 font-black">观看完 30 秒广告</span>，完成后解锁码将自动填入。
                  </>
                ) : mpQrUrl === 'PASSWORD_READY' ? (
                  <>
                    <span className="flex items-center gap-1 mb-1 text-green-600 font-bold">
                      <CheckCircle className="w-3 h-3" />
                      完播成功！
                    </span>
                    解锁码 <span className="text-primary font-black animate-bounce inline-block px-1.5 py-0.5 bg-primary/10 rounded">{password}</span> 已下发，请点击左侧按钮<span className="text-green-600 font-black">立即验证</span>进入。
                  </>
                ) : dgConfig.ad_unlock_mode === "password" ? (
                  <>扫码进入小程序观看广告即可<span className="text-purple-600 dark:text-purple-400 font-black italic">获取解锁密码</span>。</>
                ) : (
                  <>扫码进入小程序观看一个 30 秒广告即可 <span className="text-purple-600 dark:text-purple-400 font-black">免密自动解锁</span>。</>
                )}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] rounded-lg gap-1.5 w-full bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-bold"
                onClick={() => {
                  resetMpState();
                  handleGenerateMpQr();
                  toast.info('正在重新生成小程序码...');
                }}
                disabled={loadingMpQr}
              >
                <RefreshCw className={cn("w-3 h-3", loadingMpQr && "animate-spin")} />
                {mpQrUrl ? '重刷二维码' : '获取解锁码'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {mpDebugConfig?.is_debug_enabled && mpQrUrl && !['WATCHING', 'PASSWORD_READY'].includes(mpQrUrl) && (
        <div className="flex flex-col gap-2 w-full max-w-[320px]">
           <div className="flex flex-col gap-1 p-2 bg-slate-100/50 dark:bg-slate-800/30 rounded-xl text-[9px] break-all border border-slate-200 dark:border-slate-800">
             <div className="flex justify-between items-center text-slate-500 font-bold uppercase mb-1">
               <span>路径 (Debug)</span>
               <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[8px]" onClick={() => {
                 navigator.clipboard.writeText(mpQrPage || mpDebugConfig?.task_page_path || 'pages/user/task');
                 toast.success('路径已复制');
               }}>复制</Button>
             </div>
             <div className="font-mono opacity-60">{mpQrPage || mpDebugConfig?.task_page_path || 'pages/user/task'}</div>
           </div>
        </div>
      )}
    </div>
  );
};

const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
