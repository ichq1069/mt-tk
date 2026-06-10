import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Shield, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PhotoAlbum, AlbumPhoto, Profile } from '@/types';

interface AlbumInfoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  album: PhotoAlbum | null;
  effectiveUserLevel: string;
  levelCounts: any;
  allowedLevels: string[];
  selectedLevel: string;
  onLevelChange: (level: string) => void;
  customFieldConfigs: any[];
  photos: AlbumPhoto[];
  currentIndex: number;
  mode: string;
  total: number;
  globalIndex: number;
  user: any;
  renderCustomField: (field: any, val: any) => React.ReactNode;
}

export const AlbumInfoSidebar: React.FC<AlbumInfoSidebarProps> = ({
  isOpen,
  onClose,
  album,
  effectiveUserLevel,
  levelCounts,
  allowedLevels,
  selectedLevel,
  onLevelChange,
  customFieldConfigs,
  photos,
  currentIndex,
  mode,
  total,
  globalIndex,
  user,
  renderCustomField
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed right-0 inset-y-0 w-80 bg-slate-900 border-l border-white/10 z-[70] p-6 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black">图集信息</h2>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
            </div>
            
            <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2 text-slate-300">
              {/* 图集基本信息 */}
              <div className="space-y-4">
                <Label className="text-[10px] uppercase tracking-widest opacity-40 font-black border-b border-white/5 pb-2 block w-full">图集基本信息</Label>
                <div className="space-y-1">
                  <Label className="text-[10px] opacity-40 font-black">标题</Label>
                  <p className="font-bold text-lg text-white">{album?.title || '无标题'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] opacity-40 font-black">描述</Label>
                  <p className="text-sm opacity-70 leading-relaxed">{album?.description || '暂无说明'}</p>
                </div>
                
                {/* 图集层级自定义字段 */}
                {customFieldConfigs.some(f => f.is_visible_on_front && album?.custom_field_values?.[f.id]) && (
                  <div className="space-y-4 pt-2">
                    {customFieldConfigs
                      .filter(f => f.is_visible_on_front)
                      .map(field => renderCustomField(field, album?.custom_field_values?.[field.id]))}
                  </div>
                )}
              </div>

              {/* 用户当前信息 */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <Label className="text-[10px] uppercase tracking-widest opacity-40 font-black border-b border-white/5 pb-2 block w-full">用户当前信息</Label>
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-40">我的权限等级</span>
                    <Badge variant="secondary" className="bg-white/5 text-white border-white/10 px-2 py-0.5 font-bold flex items-center gap-1">
                      <Shield className="w-3 h-3 text-primary" />
                      {(() => {
                        const level = effectiveUserLevel || 'pt';
                        return level === 'pt' ? '普通用户' : 
                               level === 'vip' ? 'VIP会员' : 
                               level === 'svip' ? 'SVIP会员' : 
                               level === 'vvip' ? 'VVIP会员' : 
                               level === 'restricted' ? '限制级' :
                               level.includes('_') ? level : '普通用户';
                      })()}
                    </Badge>
                </div>

                {/* 当前图片自定义字段 */}
                {(mode === 'book' || mode === 'tiktok') && photos[currentIndex]?.custom_field_values && Object.keys(photos[currentIndex].custom_field_values).length > 0 && (
                  <div className="bg-white/5 rounded-2xl p-4 space-y-4">
                    <Label className="text-[10px] uppercase tracking-widest opacity-40 font-black border-b border-white/5 pb-2 block w-full">当前图片信息</Label>
                    <div className="space-y-4">
                      {customFieldConfigs.map(field => renderCustomField(field, photos[currentIndex].custom_field_values?.[field.id]))}
                    </div>
                  </div>
                )}
              </div>

              {/* 图集统计 */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <Label className="text-[10px] uppercase tracking-widest opacity-40 font-black border-b border-white/5 pb-2 block w-full">图集统计</Label>
                {levelCounts && (
                  <div className="space-y-3">
                    {/* 可查看权限统计 */}
                    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          当前等级可看图片
                        </span>
                        <span className="text-xs font-black text-primary">
                          {(() => {
                            let viewableCount = 0;
                            if (allowedLevels.includes('normal') || allowedLevels.includes('pt')) viewableCount += (levelCounts.normal || 0);
                            if (allowedLevels.includes('vip')) viewableCount += (levelCounts.vip || 0);
                            if (allowedLevels.includes('svip')) viewableCount += (levelCounts.svip || 0);
                            if (allowedLevels.includes('restricted') || allowedLevels.includes('vvip')) viewableCount += (levelCounts.restricted || 0);
                            
                            const gradedTotal = (levelCounts.normal || 0) + (levelCounts.vip || 0) + (levelCounts.svip || 0) + (levelCounts.restricted || 0);
                            return `${viewableCount} / ${gradedTotal}`;
                          })()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge 
                          variant={selectedLevel === 'all' ? 'default' : 'outline'} 
                          className={cn(
                            "cursor-pointer text-[9px] px-1.5 py-0.5 transition-all",
                            selectedLevel === 'all' 
                              ? "bg-primary text-white border-transparent shadow-lg shadow-primary/30" 
                              : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                          )}
                          onClick={() => onLevelChange('all')}
                        >
                          全部
                        </Badge>
                        <Badge 
                          variant={selectedLevel === 'normal' ? 'default' : 'outline'} 
                          className={cn(
                            "cursor-pointer text-[9px] px-1.5 py-0.5 transition-all",
                            selectedLevel === 'normal' 
                              ? "bg-slate-200 text-slate-900 border-transparent shadow-lg" 
                              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                          )}
                          onClick={() => onLevelChange(selectedLevel === 'normal' ? 'all' : 'normal')}
                        >
                          普通: {levelCounts.normal || 0}
                        </Badge>
                        {allowedLevels.includes('vip') && (
                          <Badge 
                            variant={selectedLevel === 'vip' ? 'default' : 'outline'} 
                            className={cn(
                              "cursor-pointer text-[9px] px-1.5 py-0.5 transition-all",
                              selectedLevel === 'vip' ? "bg-blue-500 text-white border-transparent shadow-lg" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                            )}
                            onClick={() => onLevelChange(selectedLevel === 'vip' ? 'all' : 'vip')}
                          >
                            VIP: {levelCounts.vip || 0}
                          </Badge>
                        )}
                        {allowedLevels.includes('svip') && (
                          <Badge 
                            variant={selectedLevel === 'svip' ? 'default' : 'outline'} 
                            className={cn(
                              "cursor-pointer text-[9px] px-1.5 py-0.5 transition-all",
                              selectedLevel === 'svip' ? "bg-amber-500 text-white border-transparent shadow-lg" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            )}
                            onClick={() => onLevelChange(selectedLevel === 'svip' ? 'all' : 'svip')}
                          >
                            SVIP: {levelCounts.svip || 0}
                          </Badge>
                        )}
                        {(allowedLevels.includes('restricted') || allowedLevels.includes('vvip')) && (
                          <Badge 
                            variant={selectedLevel === 'restricted' ? 'default' : 'outline'} 
                            className={cn(
                              "cursor-pointer text-[9px] px-1.5 py-0.5 transition-all",
                              selectedLevel === 'restricted' ? "bg-rose-500 text-white border-transparent shadow-lg" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                            )}
                            onClick={() => onLevelChange(selectedLevel === 'restricted' ? 'all' : 'restricted')}
                          >
                            限制级: {levelCounts.restricted || 0}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/5 rounded-xl p-2 text-center">
                        <div className="text-[9px] opacity-40 uppercase tracking-tighter">普通级</div>
                        <div className="font-bold text-white text-sm">{levelCounts.normal || 0}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2 text-center">
                        <div className="text-[9px] opacity-40 uppercase tracking-tighter">VIP专属</div>
                        <div className="font-bold text-blue-400 text-sm">{levelCounts.vip || 0}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2 text-center">
                        <div className="text-[9px] opacity-40 uppercase tracking-tighter">SVIP/限制级</div>
                        <div className="font-bold text-rose-500 text-sm">{(levelCounts.svip || 0) + (levelCounts.restricted || 0)}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2 text-center">
                        <div className="text-[9px] opacity-40 uppercase tracking-tighter">总计</div>
                        <div className="font-bold text-white text-sm">{(levelCounts.normal || 0) + (levelCounts.vip || 0) + (levelCounts.svip || 0) + (levelCounts.restricted || 0)}</div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex justify-between py-2 text-xs">
                  <span className="opacity-40">照片数量</span>
                  <span className="font-bold text-white">{total} P</span>
                </div>
                <div className="flex justify-between py-2 text-xs">
                  <span className="opacity-40">当前进度</span>
                  <span className="font-bold text-white">{globalIndex + 1} / {total}</span>
                </div>
              </div>
            </div>

            {album?.is_public !== false && (
              <div className="pt-6">
                <Button className="w-full rounded-2xl h-12 font-black gap-2" onClick={() => {
                  const shareUrl = user?.id 
                    ? `${window.location.origin}${window.location.pathname}?ref=${user.id}`
                    : window.location.href;
                    
                  if (navigator.share) {
                    navigator.share({ title: album?.title || '分享图集', url: shareUrl }).catch(() => {
                      navigator.clipboard.writeText(shareUrl);
                      toast.success('链接已复制到剪贴板');
                    });
                  } else {
                    navigator.clipboard.writeText(shareUrl);
                    toast.success('链接已复制到剪贴板');
                  }
                }}>
                  <Share2 className="w-4 h-4" /> 分享给好友
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
