import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toJpeg } from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Smartphone, Laptop, Monitor, Tablet, Layers, Image as ImageIcon,
  Download, Loader2, Send, RefreshCw, Play, Pause, Palette,
  Type, Eye, EyeOff, Settings2, ChevronRight, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { uploadToStorage } from '@/lib/upload';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface WallpaperDraftBuilderProps {
  open: boolean;
  onClose: () => void;
  configId: string;
}

type DeviceModel = 'iphone' | 'android' | 'ipad' | 'foldable' | 'laptop' | 'desktop';

function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export function WallpaperDraftBuilder({ open, onClose, configId }: WallpaperDraftBuilderProps) {
  // === 图片与预览状态 ===
  const [imageUrl, setImageUrl] = useState('');
  const [model, setModel] = useState<DeviceModel>('iphone');
  const [screenType, setScreenType] = useState<'lock' | 'home'>('lock');
  const [bgColor, setBgColor] = useState('#000000');
  const [customText, setCustomText] = useState('@特控图集');
  const [showOverlays, setShowOverlays] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const previewRef = useRef<HTMLDivElement>(null);

  // === 草稿信息 ===
  const [draftTitle, setDraftTitle] = useState('');
  const [draftAuthor, setDraftAuthor] = useState('特控Boy');
  const [draftDigest, setDraftDigest] = useState('');

  // === 流程状态 ===
  const [generating, setGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [storageConfig, setStorageConfig] = useState<any>(null);

  useEffect(() => {
    fetchStorageConfig();
  }, []);

  const fetchStorageConfig = async () => {
    try {
      const { data } = await api.getStorageConfig();
      if (data) setStorageConfig(data);
    } catch (err) {
      console.error('Failed to fetch storage config:', err);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = format(currentTime, 'HH:mm');
  const dateStr = format(currentTime, 'M月d日 EEEE', { locale: zhCN });

  const models: { id: DeviceModel; label: string; icon: React.ReactNode }[] = [
    { id: 'iphone', label: 'iPhone', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'android', label: 'Android', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'ipad', label: 'iPad', icon: <Tablet className="w-4 h-4" /> },
    { id: 'foldable', label: '折叠屏', icon: <Tablet className="w-4 h-4" /> },
    { id: 'laptop', label: '笔记本', icon: <Laptop className="w-4 h-4" /> },
    { id: 'desktop', label: '电脑', icon: <Monitor className="w-4 h-4" /> },
  ];

  // === 预览区域样式 (本地化，避免跨域 CSS 访问错误) ===
  const styles = {
    container: {
      position: 'relative' as const,
      overflow: 'hidden',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      backgroundColor: bgColor,
      width: '100%',
      // 宽度映射
      maxWidth: model === 'laptop' ? 700 : model === 'desktop' ? 800 : model === 'ipad' ? 500 : (model === 'foldable' ? 300 : 320),
      // 比例映射
      aspectRatio: model === 'ipad' ? '3/4' : (model === 'laptop' ? '16/10' : (model === 'desktop' ? '16/9' : (model === 'foldable' ? '9/21' : '9/19.5'))),
      // 边框映射
      borderRadius: (model === 'iphone' || model === 'android' || model === 'foldable') ? '3rem' : (model === 'ipad' ? '2rem' : (model === 'laptop' ? '0.75rem' : '0.5rem')),
      border: (model === 'iphone' || model === 'android' || model === 'foldable') ? '8px solid #1e293b' : (model === 'ipad' ? '12px solid #1e293b' : (model === 'laptop' ? '6px solid #1e293b' : '4px solid #1e293b')),
    },
    notch: {
      position: 'absolute' as const,
      top: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      display: 'flex',
      justifyContent: 'center',
      width: model === 'iphone' ? '112px' : (model === 'android' ? '24px' : '16px'),
      height: model === 'iphone' ? '24px' : (model === 'android' ? '12px' : '16px'),
      backgroundColor: '#000000',
      borderBottomLeftRadius: model === 'iphone' ? '16px' : (model === 'android' ? '9999px' : '9999px'),
      borderBottomRightRadius: model === 'iphone' ? '16px' : (model === 'android' ? '9999px' : '9999px'),
      marginTop: model === 'android' ? '4px' : (model === 'foldable' ? '8px' : '0px'),
    },
    wallpaper: {
      position: 'absolute' as const,
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
    },
    laptopBase: {
      position: 'absolute' as const,
      bottom: '-12px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '110%',
      height: '12px',
      backgroundColor: '#334155',
      borderBottomLeftRadius: '0.5rem',
      borderBottomRightRadius: '0.5rem',
      zIndex: 10,
    },
    indicator: {
      position: 'absolute' as const,
      bottom: '8px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '128px',
      height: '4px',
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      borderRadius: '9999px',
      zIndex: 10,
    }
  };

  // === 生成合成图并创建草稿 ===
  const handleGenerateDraft = async () => {
    if (!imageUrl) {
      toast.error('请先输入或选择图片');
      return;
    }
    if (!draftTitle.trim()) {
      toast.error('请输入草稿标题');
      return;
    }
    if (!configId) {
      toast.error('请选择微信公众号配置');
      return;
    }
    if (!previewRef.current) {
      toast.error('预览区域未就绪');
      return;
    }

    setGenerating(true);
    setUploadProgress('正在生成合成图片...');

    // 备份并移除可能导致跨域错误的外部样式表
    const removedLinks: { element: HTMLElement; parent: Node; next: Node | null }[] = [];

    try {
      // 探测跨域样式表
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLElement[];
      for (const link of links) {
        try {
          const sheet = (link as any).sheet;
          if (sheet) {
            const rules = sheet.cssRules;
          }
        } catch (e) {
          console.warn('[WallpaperDraft] Temporarily removing cross-origin stylesheet to avoid DOMException:', (link as any).href);
          if (link.parentNode) {
            removedLinks.push({
              element: link,
              parent: link.parentNode,
              next: link.nextSibling
            });
            link.remove();
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 50));

      // 1. 生成 JPEG
      const dataUrl = await toJpeg(previewRef.current, {
        quality: 0.92,
        pixelRatio: 2,
        backgroundColor: '#000000',
        cacheBust: true,
        skipFonts: true,
      });

      // 还原样式表
      for (const item of removedLinks) {
        try {
          item.parent.insertBefore(item.element, item.next);
        } catch (e) {}
      }
      removedLinks.length = 0;

      // 2. 转为 Blob
      const blob = dataURLtoBlob(dataUrl);
      const fileName = `wallpaper-draft-${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // 3. 上传到存储 (使用统一上传逻辑)
      setUploadProgress('正在上传图片到存储...');
      const uploadRes = await uploadToStorage({
        file,
        path: `drafts/${fileName}`,
        storageConfig: storageConfig
      });

      if (!uploadRes?.success || !uploadRes?.url) {
        throw new Error('上传失败');
      }

      const publicUrl = uploadRes.url;
      setGeneratedImageUrl(publicUrl);

      // 5. 上传到微信获取内容图片URL
      setUploadProgress('正在上传到微信公众号...');
      const wxRes = await api.uploadContentImageToWechat(configId, publicUrl);

      if (wxRes.error) {
        throw new Error(`微信上传失败: ${wxRes.error.message || JSON.stringify(wxRes.error)}`);
      }

      const wxUrl = wxRes.data?.url;
      if (!wxUrl) {
        throw new Error('微信未返回图片URL');
      }

      // 6. 生成草稿内容
      const content = `<p style="text-align: center;"><img src="${wxUrl}" style="max-width: 100%; display: block; margin: 0 auto; border-radius: 8px;"></p>`;

      // 7. 上传封面图（使用同一张图片）
      setUploadProgress('正在上传封面素材...');
      const thumbRes = await api.uploadImageToWechat(configId, publicUrl);
      if (thumbRes.error) {
        throw new Error(`封面上传失败: ${thumbRes.error.message || JSON.stringify(thumbRes.error)}`);
      }
      const thumbMediaId = thumbRes.data?.media_id;

      // 8. 创建草稿
      setUploadProgress('正在创建微信草稿...');
      const articles = [{
        title: draftTitle.slice(0, 64),
        author: draftAuthor || '特控Boy',
        digest: draftDigest ? draftDigest.slice(0, 120) : '',
        content: content,
        thumb_media_id: thumbMediaId || '',
        need_open_comment: 1,
        only_fans_can_comment: 0,
      }];

      const draftRes = await api.addWechatDraft(configId, articles);
      if (draftRes.error) {
        throw new Error(`草稿创建失败: ${draftRes.error.message || JSON.stringify(draftRes.error)}`);
      }

      const resData = draftRes.data?.data;
      if (resData?.media_id) {
        // 保存到本地数据库
        await api.createWechatDraft({
          config_id: configId,
          media_id: resData.media_id,
          title: draftTitle,
          author: draftAuthor || '特控Boy',
          digest: draftDigest,
          content: content,
          thumb_url: publicUrl,
          thumb_media_id: thumbMediaId || '',
          image_ids: [],
        });
        toast.success('壁纸草稿创建成功！');
        handleReset();
        onClose();
      } else {
        throw new Error('微信返回数据异常');
      }
    } catch (err: any) {
      console.error('[WallpaperDraftBuilder] Error:', err);
      toast.error(err.message || '创建草稿失败');
      // 发生错误也要还原样式表
      for (const item of removedLinks) {
        try {
          item.parent.insertBefore(item.element, item.next);
        } catch (e) {}
      }
    } finally {
      setGenerating(false);
      setUploadProgress('');
    }
  };

  const handleReset = () => {
    setImageUrl('');
    setDraftTitle('');
    setDraftDigest('');
    setGeneratedImageUrl(null);
    setModel('iphone');
    setScreenType('lock');
    setBgColor('#000000');
    setCustomText('@特控图集');
    setShowOverlays(true);
  };

  // === 预览区域尺寸 ===
  const getPreviewDimensions = () => {
    switch (model) {
      case 'laptop': return 'w-full max-w-[700px] aspect-[16/10]';
      case 'desktop': return 'w-full max-w-[800px] aspect-[16/9]';
      case 'ipad': return 'w-full max-w-[500px] aspect-[3/4]';
      case 'foldable': return 'w-full max-w-[300px] aspect-[9/21]';
      default: return 'w-full max-w-[320px] aspect-[9/19.5]';
    }
  };

  const getDeviceBorderClass = () => {
    switch (model) {
      case 'laptop': return 'rounded-xl border-[6px] border-slate-800';
      case 'desktop': return 'rounded-lg border-[4px] border-slate-800';
      case 'ipad': return 'rounded-[2rem] border-[12px] border-slate-800';
      case 'foldable': return 'rounded-[3rem] border-[8px] border-slate-800';
      default: return 'rounded-[3rem] border-[8px] border-slate-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[calc(100%-1rem)] md:max-w-[1100px] max-h-[95dvh] overflow-hidden p-0 bg-slate-950 border-white/10 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-black text-white">
            <Layers className="w-5 h-5 text-primary" />
            手机模型壁纸草稿生成器
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            选择图片并搭配设备模型，一键生成微信公众号图文草稿
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-0 overflow-hidden flex-1 min-h-0">
          {/* 左侧：设置面板 */}
          <div className="w-full md:w-[360px] shrink-0 border-r border-white/10 bg-slate-900/50 overflow-y-auto p-5 space-y-6">
            {/* 图片输入 */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-500">图片URL</Label>
              <div className="flex gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="输入图片链接..."
                  className="h-10 rounded-xl bg-white/5 border-white/10 text-white text-sm"
                />
              </div>
              {imageUrl && (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-800 border border-white/10">
                  <img src={imageUrl} alt="预览" className="w-full h-full object-cover" onError={() => setImageUrl('')} />
                </div>
              )}
            </div>

            {/* 模型选择 */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-500">设备模型</Label>
              <div className="grid grid-cols-3 gap-2">
                {models.map((m) => (
                  <Button
                    key={m.id}
                    variant={model === m.id ? 'default' : 'ghost'}
                    onClick={() => setModel(m.id)}
                    className={cn(
                      'h-10 rounded-xl font-bold text-xs gap-1 transition-all p-0',
                      model === m.id
                        ? 'bg-primary text-white border border-primary'
                        : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {m.icon}
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 屏幕类型 */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-500">屏幕类型</Label>
              <Select value={screenType} onValueChange={(v: any) => setScreenType(v)}>
                <SelectTrigger className="h-10 rounded-xl bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10 text-white rounded-xl">
                  <SelectItem value="lock">锁屏界面</SelectItem>
                  <SelectItem value="home">主屏幕界面</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 背景颜色 */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-500">背景填充色</Label>
              <div className="flex gap-3 items-center">
                <Input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-12 h-10 p-1 rounded-xl bg-white/5 border-white/10"
                />
                <Input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="flex-1 h-10 rounded-xl bg-white/5 border-white/10 text-white font-mono text-sm"
                />
              </div>
            </div>

            {/* 自定义文字 */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-500">自定义文字</Label>
              <Input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="h-10 rounded-xl bg-white/5 border-white/10 text-white text-sm"
              />
            </div>

            {/* 显示覆盖层 */}
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-500">显示锁屏内容</Label>
              <Switch checked={showOverlays} onCheckedChange={setShowOverlays} />
            </div>

            {/* 分割线 */}
            <div className="h-px bg-white/10" />

            {/* 草稿信息 */}
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-500">草稿信息</Label>
              <div className="space-y-2">
                <Input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="草稿标题"
                  className="h-10 rounded-xl bg-white/5 border-white/10 text-white text-sm"
                />
                <Input
                  value={draftAuthor}
                  onChange={(e) => setDraftAuthor(e.target.value)}
                  placeholder="作者"
                  className="h-10 rounded-xl bg-white/5 border-white/10 text-white text-sm"
                />
                <Textarea
                  value={draftDigest}
                  onChange={(e) => setDraftDigest(e.target.value)}
                  placeholder="摘要（可选）"
                  className="rounded-xl bg-white/5 border-white/10 text-white text-sm resize-none"
                  rows={2}
                />
              </div>
            </div>

            {/* 生成按钮 */}
            <Button
              onClick={handleGenerateDraft}
              disabled={generating || !imageUrl || !draftTitle}
              className="w-full h-12 rounded-xl bg-primary text-white font-black text-sm hover:brightness-110 gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress || '处理中...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  生成并上传草稿
                </>
              )}
            </Button>

            {generatedImageUrl && (
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-500">已生成图片</Label>
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-800 border border-white/10">
                  <img src={generatedImageUrl} alt="生成结果" className="w-full h-full object-contain" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = generatedImageUrl;
                    a.download = `wallpaper-${Date.now()}.jpg`;
                    a.click();
                  }}
                  className="w-full h-9 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10 text-xs gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  下载合成图
                </Button>
              </div>
            )}
          </div>

          {/* 右侧：预览区域 */}
          <div className="flex-1 min-w-0 bg-black flex items-center justify-center p-6 overflow-auto relative">
            {/* 背景光晕 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

            {!imageUrl ? (
              <div className="text-center space-y-3 text-slate-500">
                <ImageIcon className="w-12 h-12 mx-auto opacity-30" />
                <p className="text-sm font-medium">请输入图片URL以开始预览</p>
              </div>
            ) : (
              <div
                ref={previewRef}
                style={styles.container}
              >
                {/* 刘海/挖孔 */}
                {(model === 'iphone' || model === 'android' || model === 'foldable') && (
                  <div style={styles.notch} />
                )}

                {/* 笔记本底座 */}
                {model === 'laptop' && (
                  <div style={styles.laptopBase} />
                )}

                {/* 壁纸图片 */}
                <img
                  src={imageUrl}
                  alt="壁纸"
                  style={styles.wallpaper}
                  crossOrigin="anonymous"
                />

                {/* 锁屏覆盖层 */}
                {showOverlays && screenType === 'lock' && (model === 'iphone' || model === 'android' || model === 'ipad' || model === 'foldable') && (
                  <div className="absolute inset-0 flex flex-col justify-between p-6 z-10">
                    {/* 状态栏 */}
                    <div className="flex justify-between items-start text-white">
                      <div className="text-xs font-medium drop-shadow-lg">
                        <div>中国移动 5G</div>
                      </div>
                      <div className="flex gap-1 drop-shadow-lg">
                        <div className="w-4 h-2.5 bg-white rounded-sm" />
                        <div className="w-4 h-2.5 bg-white rounded-sm" />
                        <div className="w-4 h-2.5 border border-white rounded-sm" />
                      </div>
                    </div>

                    {/* 时间和日期 */}
                    <div className="text-center text-white drop-shadow-xl space-y-1">
                      <div className="text-6xl font-black tracking-tight">{timeStr}</div>
                      <div className="text-base font-medium opacity-90">{dateStr}</div>
                      <div className="text-xs opacity-70 mt-1">{customText}</div>
                    </div>

                    {/* 底部控制 */}
                    <div className="flex justify-between items-end px-2">
                      {(model === 'iphone' || model === 'android' || model === 'foldable') && (
                        <>
                          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                            <div className="w-4 h-5 bg-white/80 rounded-sm" />
                          </div>
                          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full border-2 border-white/80" />
                          </div>
                        </>
                      )}
                    </div>

                    {/* 底部指示条 */}
                    {(model === 'iphone' || model === 'android' || model === 'foldable') && (
                      <div style={styles.indicator} />
                    )}
                  </div>
                )}

                {/* 主屏幕覆盖层 */}
                {showOverlays && screenType === 'home' && (model === 'iphone' || model === 'android' || model === 'ipad' || model === 'foldable') && (
                  <div className="absolute inset-0 flex flex-col justify-between p-4 z-10">
                    {/* 顶部时间 */}
                    <div className="text-center text-white text-sm font-semibold drop-shadow-lg pt-2">{timeStr}</div>

                    {/* 应用图标网格 */}
                    <div className={cn(
                      'grid gap-3 mt-8',
                      model === 'ipad' || model === 'foldable' ? 'grid-cols-6' : 'grid-cols-4'
                    )}>
                      {Array.from({ length: model === 'ipad' || model === 'foldable' ? 36 : 24 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <div className={cn(
                            'rounded-xl bg-white/20 backdrop-blur-md',
                            model === 'ipad' || model === 'foldable' ? 'w-10 h-10' : 'w-12 h-12'
                          )} />
                          <div className="w-8 h-2 bg-white/30 rounded-full" />
                        </div>
                      ))}
                    </div>

                    {/* Dock */}
                    <div className="flex justify-center gap-3 py-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-12 h-12 rounded-2xl bg-white/30 backdrop-blur-md" />
                      ))}
                    </div>
                  </div>
                )}

                {/* 电脑桌面覆盖层 */}
                {showOverlays && (model === 'laptop' || model === 'desktop') && (
                  <div className="absolute inset-0 flex flex-col justify-between p-4 z-10">
                    {/* 顶部状态栏 */}
                    <div className="flex justify-between text-white/80 text-xs drop-shadow-lg px-2 pt-1">
                      <span>File Edit View</span>
                      <span>{timeStr}</span>
                    </div>

                    {/* 桌面图标 */}
                    <div className="flex flex-col gap-4 pl-2 pt-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-1 w-14">
                          <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md" />
                          <div className="w-10 h-2 bg-white/20 rounded-full" />
                        </div>
                      ))}
                    </div>

                    {/* 底部 Dock */}
                    <div className="flex justify-center">
                      <div className="flex gap-2 px-3 py-2 rounded-2xl bg-white/20 backdrop-blur-xl">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="w-10 h-10 rounded-xl bg-white/30" />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
