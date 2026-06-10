import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Smartphone, 
  Layout, 
  Palette, 
  Type, 
  Download, 
  Check,
  Battery,
  Wifi,
  Signal,
  Flashlight,
  Camera,
  Settings2,
  ChevronRight,
  RefreshCw,
  Play, 
  Pause,
  Tablet,
  Laptop,
  Monitor,
  LayoutTemplate,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface WallpaperPreviewProps {
  imageUrl: string;
  onClose: () => void;
  onDownload?: () => void;
  onRefresh?: () => void;
  isAutoPlay?: boolean;
  onToggleAutoPlay?: () => void;
  progress?: number;
  loading?: boolean;
}

export function WallpaperPreview({ 
  imageUrl, 
  onClose, 
  onDownload,
  onRefresh,
  isAutoPlay,
  onToggleAutoPlay,
  progress = 0,
  loading = false
}: WallpaperPreviewProps) {
  const [model, setModel] = useState<'iphone' | 'android' | 'ipad' | 'foldable' | 'laptop' | 'desktop'>('iphone');
  const [screenType, setScreenType] = useState<'lock' | 'home'>('lock');
  const [carrier, setCarrier] = useState('中国移动');
  const [showOverlays, setShowOverlays] = useState(true);

  useEffect(() => {
    const carriers = ['中国移动', '中国电信', '中国联通'];
    setCarrier(carriers[Math.floor(Math.random() * carriers.length)]);
  }, [imageUrl]);

  // 根据模型动态计算控制条高度
  const getControlBarBottom = () => {
    switch (model) {
      case 'laptop':
      case 'desktop':
        return 'bottom-24';
      case 'ipad':
        return 'bottom-12';
      default:
        return 'bottom-6';
    }
  };

  // 快速切换模型
  const cycleModel = () => {
    const models: ('iphone' | 'android' | 'ipad' | 'foldable' | 'laptop' | 'desktop')[] = ['iphone', 'android', 'ipad', 'foldable', 'laptop', 'desktop'];
    const currentIndex = models.indexOf(model);
    const nextIndex = (currentIndex + 1) % models.length;
    setModel(models[nextIndex]);
  };
  const [bgColor, setBgColor] = useState('#000000');
  const [customText, setCustomText] = useState('@特控图集');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 初始进入时延时关闭设置面板，确保控制条显示
  useEffect(() => {
    const timer = setTimeout(() => setIsSettingsOpen(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const timeStr = format(currentTime, 'HH:mm');
  const dateStr = format(currentTime, 'M月d日 EEEE', { locale: zhCN });

  return (
    <div className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-xl flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-300">
      {/* 顶部/左侧关闭按钮 */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 z-[2110] w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
      >
        <X className="w-5 h-5" />
      </button>

      {/* 预览区域 */}
      <div className="flex-1 relative flex items-center justify-center p-6 md:p-12 overflow-hidden transition-all duration-500">
        <motion.div 
          layout
          className={cn(
            "relative transition-all duration-500 group",
            model === 'iphone' || model === 'android' ? "w-full max-w-[320px] aspect-[9/19.5]" : 
            model === 'foldable' ? "w-full max-w-[320px] aspect-[9/21]" :
            model === 'ipad' ? "w-full max-w-[600px] aspect-[3/4]" :
            model === 'laptop' ? "w-full max-w-[800px] aspect-[16/10]" :
            "w-full max-w-[900px] aspect-[16/9]"
          )}
        >
          {/* 手部模拟 (仅手持模型1) */}
          {model === 'android' && (
            <div className="absolute -inset-x-12 -inset-y-8 z-[2060] pointer-events-none overflow-visible">
               {/* 右侧大拇指 */}
               <div className="absolute top-[60%] -right-4 w-12 h-32 bg-slate-900/40 backdrop-blur-sm rounded-l-full shadow-2xl border-l border-white/10" />
               {/* 左侧四指 */}
               <div className="absolute top-[20%] -left-8 w-10 h-16 bg-slate-900/30 backdrop-blur-[2px] rounded-r-2xl border-r border-white/5" />
               {/* 底部手心阴影 */}
               <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-[120%] h-32 bg-gradient-to-t from-black/40 to-transparent blur-2xl" />
            </div>
          )}

          {/* 外壳 */}
          <div className={cn(
            "absolute inset-0 shadow-2xl overflow-hidden bg-black ring-4 ring-slate-900/50 transition-all duration-500",
            model === 'iphone' || model === 'android' ? "rounded-[3rem] border-[8px] border-slate-800" :
            model === 'foldable' ? "rounded-[3rem] border-[8px] border-slate-800" :
            model === 'ipad' ? "rounded-[2rem] border-[12px] border-slate-800" :
            model === 'laptop' ? "rounded-xl border-[6px] border-slate-800" :
            "rounded-lg border-[4px] border-slate-800"
          )}>
            {/* 灵动岛 (仅手机/折叠屏) */}
            {(model === 'iphone' || model === 'android' || model === 'foldable') && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-[2050] flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-slate-800 absolute right-4" />
              </div>
            )}

            {/* 折叠屏中缝 (仅小折叠屏 - 水平缝) */}
            {model === 'foldable' && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/10 z-[2050] shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
            )}

            {/* 背景图 */}
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700"
              style={{ 
                backgroundImage: `url(${imageUrl})`,
                backgroundColor: bgColor 
              }}
            />

            {/* 锁屏界面叠加层 (手机/平板模式/折叠屏) */}
            {showOverlays && screenType === 'lock' && (model === 'iphone' || model === 'android' || model === 'ipad' || model === 'foldable') && (
              <div className="absolute inset-0 z-10 flex flex-col items-center pt-16 px-6 text-white pointer-events-none">
                {/* 状态栏 */}
                <div className="w-full flex justify-between items-center px-6 absolute top-4 left-0">
                  <span className="text-[10px] font-bold">{carrier}</span>
                  <div className="flex items-center gap-1">
                    <Signal className="w-3 h-3" />
                    <Wifi className="w-3 h-3" />
                    <Battery className="w-3 h-3 rotate-180" />
                  </div>
                </div>

                {/* 日期和时间 */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex flex-col items-center gap-1"
                >
                  <span className="text-lg font-medium drop-shadow-lg">{dateStr}</span>
                  <span className="text-7xl font-bold tracking-tighter drop-shadow-2xl">{timeStr}</span>
                </motion.div>

                {/* 锁屏小组件 (匹配用户提供的图片样式) */}
                <div className="mt-8 w-full px-6 flex justify-between items-end">
                   {/* 左侧电池/电量组件 */}
                   <div className="flex flex-col gap-1">
                     <div className="flex items-center gap-1 opacity-80">
                       <Battery className="w-3 h-3" />
                       <span className="text-[10px] font-bold uppercase">100%</span>
                     </div>
                     <span className="text-[10px] font-bold whitespace-nowrap opacity-90">{customText}</span>
                     <div className="w-24 h-1.5 bg-white/30 rounded-full overflow-hidden">
                        <div className="w-full h-full bg-white/80" />
                     </div>
                   </div>

                   {/* 右侧签名组件 */}
                   <div className="relative -mb-2">
                      <div className="relative">
                         <span className="text-3xl font-serif italic text-white/90 -rotate-12 select-none drop-shadow-lg" style={{ fontFamily: 'cursive' }}>Zingle</span>
                         <svg viewBox="0 0 100 20" className="absolute -bottom-2 -left-2 w-28 h-6 fill-none stroke-white/40 stroke-1">
                            <path d="M5,10 Q30,15 95,5" strokeLinecap="round" />
                         </svg>
                      </div>
                   </div>
                </div>

                {/* 底部小部件 (仅手机/折叠屏) */}
                {(model === 'iphone' || model === 'android' || model === 'foldable') && (
                  <div className="absolute bottom-16 left-0 right-0 px-10 flex justify-between items-center">
                    <div className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center border border-white/10">
                      <Flashlight className="w-5 h-5" />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center border border-white/10">
                      <Camera className="w-5 h-5" />
                    </div>
                  </div>
                )}

                {/* 底部指示条 */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/50 rounded-full" />
              </div>
            )}

            {/* 桌面/笔记本模式的 UI 叠加层 */}
            {showOverlays && (model === 'laptop' || model === 'desktop') && (
              <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
                <div className="mt-auto p-4 flex gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md border border-white/10" />
                  ))}
                  <div className="ml-auto flex gap-4">
                     <div className="w-20 h-10 rounded-lg bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white text-[10px] font-bold">
                        {timeStr}
                     </div>
                  </div>
                </div>
              </div>
            )}

            {/* 主屏幕界面叠加层 (手机/平板/折叠屏) */}
            {showOverlays && screenType === 'home' && (model === 'iphone' || model === 'android' || model === 'ipad' || model === 'foldable') && (
              <div className={cn(
                "absolute inset-0 z-10 grid gap-4 p-8 pointer-events-none opacity-40",
                model === 'ipad' || model === 'foldable' ? "grid-cols-6" : "grid-cols-4"
              )}>
                {Array.from({ length: model === 'ipad' || model === 'foldable' ? 36 : 24 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-white/20 backdrop-blur-md" />
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* 非设置模式下的悬浮按钮 */}
        <AnimatePresence>
          {!isSettingsOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={cn(
                "absolute left-1/2 -translate-x-1/2 flex items-center gap-4 z-[2110] bg-black/40 backdrop-blur-xl p-2 rounded-[2rem] border border-white/10 shadow-2xl transition-all duration-500",
                getControlBarBottom()
              )}
            >
              <div className="flex items-center gap-3 p-1.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/10">
                {/* 下载按钮 (原自动播放按钮) */}
                {onDownload && (
                  <Button
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload();
                    }}
                    className="w-12 h-12 rounded-full bg-blue-600/90 text-white hover:bg-blue-500 border border-white/10 shadow-xl transition-all active:scale-95"
                    title="下载图片"
                  >
                    <Download className="w-5 h-5" />
                  </Button>
                )}

                {/* 刷新按钮 (原播放按钮位置) */}
                {onRefresh && (
                  <div className="relative flex items-center justify-center">
                    {/* 保留进度环用于展示自动切换进度 (如果开启了的话) */}
                    {isAutoPlay && (
                      <svg 
                        viewBox="0 0 64 64"
                        className="absolute w-12 h-12 pointer-events-none overflow-visible transition-opacity duration-300 opacity-100" 
                        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
                      >
                        <motion.circle
                          cx="32"
                          cy="32"
                          r="30"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="transparent"
                          className="text-primary"
                          strokeDasharray={`${2 * Math.PI * 30}`}
                          strokeDashoffset={`${2 * Math.PI * 30 * (1 - progress / 100)}`}
                          transition={{ duration: 0.15, ease: "linear" }}
                        />
                      </svg>
                    )}
                    <Button
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefresh();
                      }}
                      disabled={loading}
                      className={cn(
                        "w-12 h-12 rounded-full border border-white/10 transition-all shadow-xl bg-white/10 text-white hover:bg-white/20",
                        loading && "animate-spin"
                      )}
                      title="切换下一张"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </Button>
                  </div>
                )}

                {/* 切换模型按钮 (原刷新按钮位置) */}
                <Button
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleModel();
                  }}
                  className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/10 shadow-xl transition-all active:scale-95"
                  title="切换设备模型"
                >
                  <Smartphone className="w-5 h-5" />
                </Button>

                {/* 显隐内容按钮 */}
                <Button
                  size="icon"
                  onClick={() => setShowOverlays(!showOverlays)}
                  className={cn(
                    "w-12 h-12 rounded-full transition-all border border-white/10 shadow-xl",
                    showOverlays ? "bg-white/10 text-white hover:bg-white/20" : "bg-primary text-white"
                  )}
                  title={showOverlays ? "隐藏内容" : "显示内容"}
                >
                  {showOverlays ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </Button>

                {/* 设置按钮 */}
                <Button
                  size="icon"
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/10 shadow-xl"
                >
                  <Settings2 className="w-5 h-5" />
                </Button>

                <div className="w-px h-6 bg-white/10 mx-1" />

                <Button
                  onClick={onDownload}
                  className="h-12 px-8 rounded-full bg-primary text-white font-black hover:brightness-110 shadow-xl shadow-primary/20"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 背景光晕装饰 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full -z-10" />
      </div>

      {/* 控制面板 */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full md:w-[400px] bg-slate-900 border-t md:border-t-0 md:border-l border-white/10 p-8 flex flex-col gap-8 overflow-y-auto overflow-x-hidden relative z-[2105]"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">壁纸预览设置</h2>
              <p className="text-slate-400 text-sm font-medium">调整参数以预览最佳视觉效果</p>
            </div>

            <div className="space-y-6">
              {/* 自动播放设置 */}
              {onToggleAutoPlay && (
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">自动播放</Label>
                  <Button
                    onClick={onToggleAutoPlay}
                    variant={isAutoPlay ? "default" : "ghost"}
                    className={cn(
                      "w-full h-12 rounded-2xl font-black gap-2 transition-all",
                      isAutoPlay ? "bg-primary text-white" : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10"
                    )}
                  >
                    {isAutoPlay ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" />
                        暂停自动切换
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                        开始自动切换
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* 手机型号/设备选择 */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">设备选择</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant={model === 'iphone' ? 'default' : 'ghost'}
                    className={cn("h-10 rounded-xl font-bold border p-0", model === 'iphone' ? "bg-primary text-white border-primary" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white")}
                    onClick={() => setModel('iphone')}
                  >
                    <Smartphone className="w-4 h-4 mr-1.5" />
                    iPhone
                  </Button>
                  <Button 
                    variant={model === 'android' ? 'default' : 'ghost'}
                    className={cn("h-10 rounded-xl font-bold border p-0", model === 'android' ? "bg-primary text-white border-primary" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white")}
                    onClick={() => setModel('android')}
                  >
                    <Smartphone className="w-4 h-4 mr-1.5" />
                    手持模型1
                  </Button>
                  <Button 
                    variant={model === 'ipad' ? 'default' : 'ghost'}
                    className={cn("h-10 rounded-xl font-bold border p-0", model === 'ipad' ? "bg-primary text-white border-primary" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white")}
                    onClick={() => setModel('ipad')}
                  >
                    <Tablet className="w-4 h-4 mr-1.5" />
                    iPad
                  </Button>
                  <Button 
                    variant={model === 'foldable' ? 'default' : 'ghost'}
                    className={cn("h-10 rounded-xl font-bold border p-0", model === 'foldable' ? "bg-primary text-white border-primary" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white")}
                    onClick={() => setModel('foldable')}
                  >
                    <Smartphone className="w-4 h-4 mr-1.5" />
                    样式1
                  </Button>
                  <Button 
                    variant={model === 'laptop' ? 'default' : 'ghost'}
                    className={cn("h-10 rounded-xl font-bold border p-0", model === 'laptop' ? "bg-primary text-white border-primary" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white")}
                    onClick={() => setModel('laptop')}
                  >
                    <Laptop className="w-4 h-4 mr-1.5" />
                    笔记本
                  </Button>
                  <Button 
                    variant={model === 'desktop' ? 'default' : 'ghost'}
                    className={cn("h-10 rounded-xl font-bold border p-0", model === 'desktop' ? "bg-primary text-white border-primary" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white")}
                    onClick={() => setModel('desktop')}
                  >
                    <Monitor className="w-4 h-4 mr-1.5" />
                    电脑
                  </Button>
                </div>
              </div>

              {/* 屏幕类型 */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">屏幕类型</Label>
                <Select value={screenType} onValueChange={(val: any) => setScreenType(val)}>
                  <SelectTrigger className="h-12 rounded-2xl bg-white/5 border-white/10 text-white font-bold">
                    <SelectValue placeholder="选择屏幕类型" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10 text-white rounded-2xl">
                    <SelectItem value="lock">锁屏界面</SelectItem>
                    <SelectItem value="home">主屏幕界面</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 背景颜色 */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">背景填充色 (用于非全屏图)</Label>
                <div className="flex gap-4 items-center">
                  <Input 
                    type="color" 
                    value={bgColor} 
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-12 h-12 p-1 rounded-xl bg-white/5 border-white/10"
                  />
                  <Input 
                    type="text" 
                    value={bgColor} 
                    onChange={(e) => setBgColor(e.target.value)}
                    className="flex-1 h-12 rounded-2xl bg-white/5 border-white/10 text-white font-mono"
                  />
                </div>
              </div>

              {/* 自定义文本 */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">底部自定义文本</Label>
                <div className="relative">
                  <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input 
                    value={customText} 
                    onChange={(e) => setCustomText(e.target.value)}
                    maxLength={16}
                    className="h-12 rounded-2xl bg-white/5 border-white/10 pl-11 text-white font-medium"
                    placeholder="例如：dopubox.com"
                  />
                </div>
              </div>
            </div>

            <div className="mt-auto pt-8 flex gap-3">
              <Button 
                variant="ghost"
                className="flex-1 h-14 rounded-2xl border border-white/20 bg-white/5 text-white font-bold hover:bg-white/10"
                onClick={onClose}
              >
                取消
              </Button>
              <Button 
                className="flex-1 h-14 rounded-2xl bg-primary text-white font-black shadow-xl shadow-primary/20 hover:brightness-110"
                onClick={() => setIsSettingsOpen(false)}
              >
                <Check className="w-5 h-5 mr-2" />
                确定预览
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
