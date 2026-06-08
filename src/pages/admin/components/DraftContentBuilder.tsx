import React, { useState, useEffect, useRef } from 'react';
import { toJpeg, toPng } from 'html-to-image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  DragDropContext, Droppable, Draggable, DropResult 
} from '@hello-pangea/dnd';
import { Slider } from '@/components/ui/slider';
import { 
  Plus, Trash2, GripVertical, Image as ImageIcon, 
  Type, LayoutGrid, Scroll, Layers, Loader2, Search, CheckCircle,
  FileText, Code, Minus, Smartphone, MoreHorizontal, SeparatorHorizontal, ArrowDownUp,
  Palette, AlignLeft, AlignCenter, AlignRight, AlignJustify, Type as FontIcon, Baseline,
  RefreshCw, ArrowRightLeft, Zap
} from 'lucide-react';
import { uploadToStorage } from '@/lib/upload';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type BlockType = 'text' | 'image' | 'concatenated' | 'sliding' | 'grid' | 'raw_html' | 'big_multi' | 'divider' | 'spacer' | 'phone_wallpaper';

export interface Block {
  id: string;
  type: BlockType;
  content?: string;
  url?: string;
  localUrl?: string; // 保存本地 URL 用于编辑器显示
  mediaId?: string; // 保存原始媒体库 ID
  images?: { url: string; wechatUrl?: string; id: string }[];
  columns?: number;
  height?: number;
  imageWidth?: string;
  imageHeight?: string;
  imageRatio?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
  editingRaw?: boolean;
  style?: {
    color?: string;
    backgroundColor?: string;
    fontSize?: number;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    fontFamily?: string;
    fontWeight?: string;
    lineHeight?: number;
    padding?: string;
    borderRadius?: string;
  };
}

interface DraftContentBuilderProps {
  initialBlocks?: Block[];
  onChange: (html: string, blocks: Block[]) => void;
  configId: string;
  excludedCategories?: string[];
  excludedTags?: string[];
}

export function AutoCorsImg({ src, alt, style, className }: { src: string; alt?: string; style?: React.CSSProperties; className?: string }) {
  return (
    <img 
      src={src} 
      alt={alt} 
      style={style} 
      className={className} 
      referrerPolicy="no-referrer"
    />
  );
}

export function DraftContentBuilder({ 
  initialBlocks = [], 
  onChange, 
  configId,
  excludedCategories = [],
  excludedTags = []
}: DraftContentBuilderProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [isMediaSelectorOpen, setIsMediaSelectorOpen] = useState(false);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaPage, setMediaPage] = useState(0);
  const [mediaTotal, setMediaTotal] = useState(0);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [mediaSortOrder, setMediaSortOrder] = useState<'asc' | 'desc'>('desc');
  const [bigMultiConfig, setBigMultiConfig] = useState<any>({});
  const [uploading, setUploading] = useState(false);
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
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const [isHtmlDialogOpen, setIsHtmlDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [rawHtmlInput, setRawHtmlInput] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ id: string, url: string }[]>([]);
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>('all');
  const [mediaLimit, setMediaLimit] = useState(32);

  useEffect(() => {
    generateHtml(blocks);
  }, [blocks, bigMultiConfig]); // Added bigMultiConfig to dependency array

  useEffect(() => {
    if (isMediaSelectorOpen) {
      fetchMediaItems();
    }
  }, [isMediaSelectorOpen, mediaPage, mediaSearch, excludedCategories, excludedTags]);

  useEffect(() => {
    if (isTemplateSelectorOpen) {
      fetchTemplates();
    }
  }, [isTemplateSelectorOpen]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await api.getSystemConfig('wechat_draft_config');
        if (data?.value?.big_multi) {
          setBigMultiConfig(data.value.big_multi);
        }
      } catch (err) {
        console.error('Failed to fetch draft config in builder:', err);
      }
    };
    fetchConfig();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await api.getWechatDraftTemplates();
      if (error) throw error;
      setAllTemplates(data || []);
    } catch (error: any) {
      toast.error(`获取模板失败: ${error.message}`);
    }
  };

  const handleSelectTemplate = (template: any) => {
    try {
      let newBlocks: Block[] = [];
      if (template.content && (template.content.trim().startsWith('[') || template.content.trim().startsWith('{'))) {
        newBlocks = JSON.parse(template.content);
      } else if (template.content && (template.content.trim().startsWith('<') || template.content.trim().includes('</'))) {
        // 如果是 HTML，作为一个 raw_html 块插入
        newBlocks = [{ 
          id: Math.random().toString(36).substr(2, 9), 
          type: 'raw_html', 
          content: template.content,
          editingRaw: false
        }];
      } else {
        newBlocks = [{ 
          id: Math.random().toString(36).substr(2, 9), 
          type: 'text', 
          content: template.content 
        }];
      }
      
      // 给每个块分配新的 ID 避免重复
      const blocksWithNewIds = newBlocks.map(b => ({
        ...b,
        id: Math.random().toString(36).substr(2, 9)
      }));
      
      setBlocks([...blocks, ...blocksWithNewIds]);
      setIsTemplateSelectorOpen(false);
      toast.success(`已插入模板: ${template.name}`);
    } catch {
      const textBlock: Block = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'text',
        content: template.content
      };
      setBlocks([...blocks, textBlock]);
      setIsTemplateSelectorOpen(false);
      toast.success(`已插入模板: ${template.name}`);
    }
  };

  const fetchMediaItems = async () => {
    try {
      const { data, total, error } = await api.getWechatDraftMediaLibrary({
        page: mediaPage,
        limit: mediaLimit,
        search: mediaSearch,
        excludedCategories,
        excludedTags
      });
      if (error) throw error;
      setMediaItems(data || []);
      setMediaTotal(total || 0);
    } catch (error: any) {
      toast.error(`获取素材失败: ${error.message}`);
    }
  };

  const addBlock = (type: BlockType) => {
    let content = (type === 'text' || type === 'raw_html') ? '' : undefined;
    
    // 为手机壁纸工具设置默认配置
    if (type === 'phone_wallpaper') {
      const now = new Date();
      const defaultTime = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
      const defaultDate = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }) + ' ' + ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
      content = JSON.stringify({ 
        phoneModel: 'android',
        lockTime: defaultTime,
        lockDate: defaultDate
      });
    }
    
    const newBlock: Block = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content,
      images: ['concatenated', 'sliding', 'grid', 'big_multi', 'phone_wallpaper'].includes(type) ? [] : undefined,
      url: type === 'phone_wallpaper' ? '' : undefined,
      columns: type === 'grid' ? 3 : undefined,
      height: type === 'spacer' ? 20 : undefined,
      editingRaw: type === 'raw_html' ? true : undefined
    };
    setBlocks([...blocks, newBlock]);
  };

  const handleInsertHtml = () => {
    if (!rawHtmlInput.trim()) return;
    const newBlock: Block = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'raw_html',
      content: rawHtmlInput
    };
    setBlocks([...blocks, newBlock]);
    setRawHtmlInput('');
    setIsHtmlDialogOpen(false);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(prevBlocks => prevBlocks.map(b => {
      if (b.id === id) {
        const updated = { ...b, ...updates };
        // 确保大多图等图片组件的 imageWidth 属性被正确保留
        if (updates.imageWidth !== undefined && b.imageWidth !== updates.imageWidth) {
          console.log(`[DraftBuilder] Block ${id} imageWidth: ${b.imageWidth} -> ${updates.imageWidth}`);
        }
        return updated;
      }
      return b;
    }));
  };

  const syncToWallpaper = (sourceId: string) => {
    const sourceBlock = blocks.find(b => b.id === sourceId);
    if (!sourceBlock || !sourceBlock.images || sourceBlock.images.length === 0) {
      toast.error('组件中没有可同步的图片');
      return;
    }
    
    // 找到最新的手机壁纸工具，或者创建一个
    const wallpaperBlock = [...blocks].reverse().find(b => b.type === 'phone_wallpaper');
    const imageUrls = sourceBlock.images.map(img => img.url);
    
    if (wallpaperBlock) {
      const currentCfg = JSON.parse(wallpaperBlock.content || '{}');
      const existingWallpapers = currentCfg.wallpapers || (currentCfg.phoneWallpaperUrl ? [currentCfg.phoneWallpaperUrl] : []);
      // 合并并去重
      const newWallpapers = Array.from(new Set([...existingWallpapers, ...imageUrls]));
      updateBlock(wallpaperBlock.id, { 
        content: JSON.stringify({ ...currentCfg, wallpapers: newWallpapers }) 
      });
      toast.success('已将图片同步到壁纸工具');
    } else {
      // 创建新组件
      const now = new Date();
      const defaultTime = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
      const defaultDate = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }) + ' ' + ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
      
      const newBlock: Block = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'phone_wallpaper',
        content: JSON.stringify({ 
          phoneModel: 'android',
          wallpapers: imageUrls,
          lockTime: defaultTime,
          lockDate: defaultDate
        }),
        url: ''
      };
      setBlocks([...blocks, newBlock]);
      toast.success('已创建壁纸工具并同步图片');
    }
  };

  const syncToBigMulti = (sourceId: string) => {
    const sourceBlock = blocks.find(b => b.id === sourceId);
    if (!sourceBlock) return;
    
    const cfg = JSON.parse(sourceBlock.content || '{}');
    const imageUrls = cfg.wallpapers || (cfg.phoneWallpaperUrl ? [cfg.phoneWallpaperUrl] : []);
    if (imageUrls.length === 0) {
      toast.error('壁纸工具中没有可同步的图片');
      return;
    }

    const bigMultiBlock = [...blocks].reverse().find(b => b.type === 'big_multi');
    const syncImages = imageUrls.map((url: string) => ({ url, id: Math.random().toString(36).substr(2, 9) }));

    if (bigMultiBlock) {
      const existingImages = bigMultiBlock.images || [];
      const newImages = [...existingImages, ...syncImages];
      // 按 URL 去重
      const uniqueImages = newImages.filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.url === v.url) === i);
      updateBlock(bigMultiBlock.id, { images: uniqueImages });
      toast.success('已同步到大多图组件');
    } else {
      const newBlock: Block = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'big_multi',
        images: syncImages
      };
      setBlocks([...blocks, newBlock]);
      toast.success('已创建大多图组件并同步图片');
    }
  };

  const syncGeneratedToBigMulti = (blockId: string, manualImages?: any[]) => {
    const block = blocks.find(b => b.id === blockId);
    
    // 优先使用传入的图片，否则使用块中已生成的图片
    const imagesToSync = manualImages || block?.images || [];
    
    if (imagesToSync.length === 0) {
      // 只有在非自动同步且没图时才报错
      if (!manualImages) toast.error('没有已生成的合成图可同步');
      return;
    }
    
    const bigMultiBlock = [...blocks].reverse().find(b => b.type === 'big_multi');
    const syncImages = imagesToSync.map((img: any) => ({ ...img }));

    if (bigMultiBlock) {
      const existingImages = bigMultiBlock.images || [];
      const newImages = [...existingImages, ...syncImages];
      const uniqueImages = newImages.filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.url === v.url) === i);
      updateBlock(bigMultiBlock.id, { images: uniqueImages });
      if (!manualImages) toast.success('已将生成图同步到大多图组件');
    } else {
      const newBlock: Block = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'big_multi',
        images: syncImages
      };
      setBlocks([...blocks, newBlock]);
      if (!manualImages) toast.success('已创建大多图组件并同步生成图');
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    // Handle block reordering
    if (result.type === 'DEFAULT' || !result.type) {
      const items = Array.from(blocks);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      setBlocks(items);
    } 
    // Handle image reordering within a block
    else if (result.type === 'IMAGES') {
      const blockId = result.source.droppableId.replace('images-', '');
      const block = blocks.find(b => b.id === blockId);
      if (block && block.images) {
        const newImages = Array.from(block.images);
        const [reorderedImage] = newImages.splice(result.source.index, 1);
        newImages.splice(result.destination.index, 0, reorderedImage);
        updateBlock(blockId, { images: newImages });
      }
    }
  };

  const openMediaSelector = (blockId: string) => {
    setCurrentBlockId(blockId);
    setSelectedMedia([]);
    setIsMediaSelectorOpen(true);
  };

  const toggleMediaSelection = (item: { id: string, url: string }) => {
    setSelectedMedia(prev => 
      prev.some(m => m.id === item.id) ? prev.filter(m => m.id !== item.id) : [...prev, item]
    );
  };

  const handleBatchSelectMedia = async () => {
    if (selectedMedia.length === 0 || !configId) return;

    try {
      setUploading(true);
      setSyncProgress({ current: 0, total: selectedMedia.length });
      const newMediaData: { url: string; wechatUrl: string; id: string }[] = [];
      const newBlocksToAdd: Block[] = [];

      for (let i = 0; i < selectedMedia.length; i++) {
        const item = selectedMedia[i];
        setSyncProgress({ current: i + 1, total: selectedMedia.length });
        
        try {
          const res = await api.uploadContentImageToWechat(configId, item.url);
          const wechatUrl = res.data?.data?.url;
          if (wechatUrl) {
            if (currentBlockId) {
              newMediaData.push({ url: item.url, wechatUrl, id: item.id });
            } else {
              newBlocksToAdd.push({
                id: Math.random().toString(36).substr(2, 9),
                type: 'image',
                url: wechatUrl,
                mediaId: item.id
              });
            }
          }
        } catch (err) {
          console.error(`Failed to upload image ${item.id}:`, err);
        }
      }

      setBlocks(prevBlocks => {
        let nextBlocks = [...prevBlocks];
        if (currentBlockId && newMediaData.length > 0) {
          const targetBlock = nextBlocks.find(b => b.id === currentBlockId);
          
          if (targetBlock?.type === 'phone_wallpaper') {
            // 手机壁纸工具处理：将所有选中的图片添加到当前块的 wallpapers 数组中
            nextBlocks = nextBlocks.map(b => {
              if (b.id === currentBlockId) {
                const currentCfg = JSON.parse(b.content || '{}');
                const existingWallpapers = currentCfg.wallpapers || (currentCfg.phoneWallpaperUrl ? [currentCfg.phoneWallpaperUrl] : []);
                const newWallpapers = [...existingWallpapers, ...newMediaData.map(img => img.url)];
                return { 
                  ...b, 
                  content: JSON.stringify({ 
                    ...currentCfg, 
                    wallpapers: newWallpapers,
                    phoneWallpaperUrl: newWallpapers[0] || '' // 兼容旧逻辑
                  }) 
                };
              }
              return b;
            });
          } else {
            // 原有逻辑
            nextBlocks = nextBlocks.map(b => {
              if (b.id === currentBlockId) {
                if (b.images) {
                  return { ...b, images: [...(b.images || []), ...newMediaData] };
                } else if (b.type === 'image') {
                  return { ...b, url: newMediaData[0].wechatUrl, localUrl: newMediaData[0].url, mediaId: newMediaData[0].id };
                }
              }
              return b;
            });
          }
        }
        return [...nextBlocks, ...newBlocksToAdd];
      });
      
      setIsMediaSelectorOpen(false);
      setSelectedMedia([]);
      toast.success(`成功插入 ${newMediaData.length + newBlocksToAdd.length} 张图片`);
    } catch (error: any) {
      toast.error(`批量上传失败: ${error.message}`);
    } finally {
      setUploading(false);
      setSyncProgress({ current: 0, total: 0 });
    }
  };

  const handleSelectMedia = async (mediaItem: any) => {
    if (!currentBlockId || !configId) return;

    try {
      setUploading(true);
      setSyncProgress({ current: 1, total: 1 });
      // 上传到微信获取内容 URL
      const res = await api.uploadContentImageToWechat(configId, mediaItem.url);
      if (res.error) throw res.error;

      const wechatUrl = res.data?.data?.url;
      if (!wechatUrl) throw new Error('未能获取微信图片 URL');

      const block = blocks.find(b => b.id === currentBlockId);
      if (block) {
        if (block.type === 'image') {
          updateBlock(currentBlockId, { url: wechatUrl, localUrl: mediaItem.url, mediaId: mediaItem.id });
        } else if (block.type === 'phone_wallpaper') {
          const cfg = JSON.parse(block.content || '{}');
          updateBlock(currentBlockId, { content: JSON.stringify({ ...cfg, phoneWallpaperUrl: mediaItem.url }) });
        } else if (block.images) {
          updateBlock(currentBlockId, { 
            images: [...block.images, { url: mediaItem.url, wechatUrl, id: mediaItem.id }] 
          });
        }
      }
      setIsMediaSelectorOpen(false);
    } catch (error: any) {
      toast.error(`上传到微信失败: ${error.message}`);
    } finally {
      setUploading(false);
      setSyncProgress({ current: 0, total: 0 });
    }
  };

  const generateHtml = (currentBlocks: Block[]) => {
    const buildHtml = (isForPreview: boolean) => {
      let html = '';
      
      const getImageStyle = (block: Block, defaultWidth = '100%') => {
        let width = defaultWidth;
        let height = 'auto';
        
        if (block.imageWidth && block.imageWidth !== 'original') {
          const w = block.imageWidth.trim();
          width = (w.endsWith('%') || w.endsWith('px') || w.endsWith('vw')) ? w : `${w}%`;
        }
        
        if (block.imageHeight && block.imageHeight !== 'original' && block.imageHeight !== 'auto') {
          const h = block.imageHeight.trim();
          height = (h.endsWith('%') || h.endsWith('px') || h.endsWith('vw')) ? h : `${h}%`;
        }
        
        const styles = [
          `width: ${width}`,
          `height: ${height}`,
          'display: block',
          'margin: 0 auto',
          'border-radius: 8px'
        ];

        if (block.imageRatio && block.imageRatio !== 'auto') {
          styles.push(`aspect-ratio: ${block.imageRatio}`);
        }

        if (block.objectFit) {
          styles.push(`object-fit: ${block.objectFit}`);
        }
        
        if (block.imageWidth === 'original') {
          return 'max-width: 100%; display: block; margin: 0 auto; border-radius: 8px;';
        }
        
        return styles.join('; ') + ';';
      };

      currentBlocks.forEach((block) => {
        const marginBottom = '0';
        const s = block.style || {};
        const blockStyle = `
          color: ${s.color || 'inherit'};
          background-color: ${s.backgroundColor || 'transparent'};
          font-size: ${s.fontSize ? s.fontSize + 'px' : '16px'};
          text-align: ${s.textAlign || 'left'};
          font-family: ${s.fontFamily || 'inherit'};
          font-weight: ${s.fontWeight || 'normal'};
          line-height: ${s.lineHeight || 1.6};
          padding: ${s.padding || '0'};
          border-radius: ${s.borderRadius || '0'};
          margin: 0 0 ${marginBottom} 0;
        `.replace(/\s+/g, ' ').trim();
        
        const getImgSrc = (b: Block) => (isForPreview ? (b.localUrl || b.url) : b.url) || '';
        const getMultiImgSrc = (img: { url: string; wechatUrl?: string }) => (isForPreview ? img.url : (img.wechatUrl || img.url)) || '';
        const getImgAttr = () => 'referrerpolicy="no-referrer"';

    const getPreviewImg = (src: string, style: string) => {
      return `<img referrerPolicy="no-referrer" src="${src}" ${getImgAttr()} style="${style}">`;
    };

        switch (block.type) {
          case 'text':
            html += `<p style="${blockStyle}">${block.content || ''}</p>`;
            break;
          case 'image':
            if (block.images && block.images.length > 0) {
              block.images.forEach(img => {
                html += getPreviewImg(getMultiImgSrc(img), `${getImageStyle(block)} margin-bottom: ${marginBottom};`);
              });
            } else if (block.url) {
              html += getPreviewImg(getImgSrc(block), `${getImageStyle(block)} margin-bottom: ${marginBottom};`);
            }
            break;
          case 'concatenated':
            if (block.images && block.images.length > 0) {
              html += `<div style="font-size: 0; line-height: 0; margin: 0 0 ${marginBottom} 0; text-align: center;">`;
              block.images.forEach(img => {
                html += getPreviewImg(getMultiImgSrc(img), `${getImageStyle(block)} margin: 0 auto; padding: 0;`);
              });
              html += '</div>';
            }
            break;
          case 'sliding':
            if (block.images && block.images.length > 0) {
              const width = 80;
              html += `
                <section style="overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch; margin: 0 0 ${marginBottom} 0; font-size: 0; line-height: 0;">
                  <div style="display: inline-block; vertical-align: top;">
                    ${block.images.map(img => getPreviewImg(getMultiImgSrc(img), "display: inline-block; width: 80vw; margin-right: 10px; border-radius: 8px;")).join('')}
                  </div>
                </section>
              `;
            }
            break;
          case 'grid':
            if (block.images && block.images.length > 0) {
              const cols = block.columns || 3;
              html += `<div style="display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 5px; margin: 0 0 ${marginBottom} 0;">`;
              block.images.forEach(img => {
                const style = block.imageHeight && block.imageHeight !== 'auto' && block.imageHeight !== 'original' ? getImageStyle(block) : `width: 100%; aspect-ratio: 1/1; object-fit: cover; display: block; border-radius: 4px;`;
                html += getPreviewImg(getMultiImgSrc(img), style);
              });
              html += '</div>';
            }
            break;
          case 'big_multi':
            if (block.images && block.images.length > 0) {
              html += `<div style="margin: 0 0 ${marginBottom} 0; padding: 0; line-height: 0; font-size: 0; text-align: center;">`;
              
              let displayImages = [...block.images];
              
              // 如果启用了大多图自动配置，则在相应位置插入固定图片
              if (bigMultiConfig?.enabled) {
                // 处理最后一张
                if (bigMultiConfig.last_image && !displayImages.some(img => img.url === bigMultiConfig.last_image)) {
                  displayImages.push({ 
                    url: bigMultiConfig.last_image, 
                    wechatUrl: bigMultiConfig.last_image, 
                    id: bigMultiConfig.last_image_id || 'fixed-last' 
                  });
                }
                // 处理第 N 张
                if (bigMultiConfig.nth_image?.url && bigMultiConfig.nth_image?.n) {
                  const n = bigMultiConfig.nth_image.n - 1; // 转为 0-based index
                  if (n >= 0 && n <= displayImages.length && !displayImages.some(img => img.url === bigMultiConfig.nth_image.url)) {
                    displayImages.splice(n, 0, { 
                      url: bigMultiConfig.nth_image.url, 
                      wechatUrl: bigMultiConfig.nth_image.url, 
                      id: bigMultiConfig.nth_image.id || 'fixed-nth' 
                    });
                  }
                }
                // 处理第一张
                if (bigMultiConfig.first_image && !displayImages.some(img => img.url === bigMultiConfig.first_image)) {
                  displayImages.unshift({ 
                    url: bigMultiConfig.first_image, 
                    wechatUrl: bigMultiConfig.first_image, 
                    id: bigMultiConfig.first_image_id || 'fixed-first' 
                  });
                }
              }

              displayImages.forEach((img, idx) => {
                if (idx === 0) {
                  html += getPreviewImg(getMultiImgSrc(img), `${getImageStyle(block)} line-height: 1.6; font-size: medium;`);
                } else {
                  html += `<div style="display: none !important; width: 0; height: 0; overflow: hidden; visibility: hidden;">${getPreviewImg(getMultiImgSrc(img), "display: none !important; width: 1px; height: 1px;")}</div>`;
                }
              });
              html += '</div>';
            }
            break;
          case 'divider':
            html += `<hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0 ${marginBottom} 0;">`;
            break;
          case 'spacer':
            html += `<div style="height: ${block.height || 20}px; margin: 0;"></div>`;
            break;
          case 'raw_html':
            const rawContent = (block.content || '').replace(/<img/g, '<img referrerpolicy="no-referrer"');
            html += `<div style="margin: 0 0 ${marginBottom} 0;">${rawContent}</div>`;
            break;
          case 'phone_wallpaper':
            const pwUrl = block.url || '';
            const pwStyle = [
              'max-width: 100%',
              'display: block',
              'margin: 0 auto',
              'border-radius: 8px'
            ].join('; ');

            if (block.images && block.images.length > 0) {
              block.images.forEach(img => {
                html += getPreviewImg(getMultiImgSrc(img), `${pwStyle} margin-bottom: ${marginBottom};`);
              });
            } else if (pwUrl) {
              html += getPreviewImg(pwUrl, `${pwStyle} margin-bottom: ${marginBottom};`);
            }
            break;
        }
      });
      return html;
    };

    const wechatHtml = buildHtml(false);
    const previewHtml = buildHtml(true);
    
    setPreviewHtml(previewHtml);
    onChange(wechatHtml, currentBlocks);
  };


  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Badge variant="secondary" className="rounded-sm bg-primary/10 text-primary border-none text-[10px] font-bold py-0 h-5">组件库</Badge>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">选择并添加内容区块</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => addBlock('big_multi')} className="h-8 text-[11px] bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-all font-bold">
            <Layers className="w-3.5 h-3.5 mr-1" /> 大多图
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlock('phone_wallpaper')} className="h-8 text-[11px] bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-all font-bold">
            <Smartphone className="w-3.5 h-3.5 mr-1" /> 壁纸工具
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlock('text')} className="h-8 text-[11px] bg-white hover:bg-primary/5 hover:text-primary transition-all">
            <Type className="w-3.5 h-3.5 mr-1" /> 文字
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlock('image')} className="h-8 text-[11px] bg-white hover:bg-primary/5 hover:text-primary transition-all">
            <ImageIcon className="w-3.5 h-3.5 mr-1" /> 单图
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlock('concatenated')} className="h-8 text-[11px] bg-white hover:bg-primary/5 hover:text-primary transition-all">
            <Layers className="w-3.5 h-3.5 mr-1" /> 拼接图
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlock('sliding')} className="h-8 text-[11px] bg-white hover:bg-primary/5 hover:text-primary transition-all">
            <Scroll className="w-3.5 h-3.5 mr-1" /> 滑动图
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlock('grid')} className="h-8 text-[11px] bg-white hover:bg-primary/5 hover:text-primary transition-all">
            <LayoutGrid className="w-3.5 h-3.5 mr-1" /> 宫格图
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlock('divider')} className="h-8 text-[11px] bg-white hover:bg-primary/5 hover:text-primary transition-all">
            <SeparatorHorizontal className="w-3.5 h-3.5 mr-1" /> 分隔线
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlock('spacer')} className="h-8 text-[11px] bg-white hover:bg-primary/5 hover:text-primary transition-all">
            <ArrowDownUp className="w-3.5 h-3.5 mr-1" /> 空白横隔
          </Button>
          <div className="w-px h-5 bg-slate-200 mx-1 self-center" />
          <Button variant="default" size="sm" onClick={() => setIsTemplateSelectorOpen(true)} className="h-8 text-[11px] shadow-sm">
            <FileText className="w-3.5 h-3.5 mr-1" /> 插入模板
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsHtmlDialogOpen(true)} className="h-8 text-[11px]">
            <Code className="w-3.5 h-3.5 mr-1" /> 插入 HTML
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsPreviewDialogOpen(true)} className="h-8 text-[11px] bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 transition-all">
            <Smartphone className="w-3.5 h-3.5 mr-1" /> 手机预览
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">正文编辑器</span>
          <span className="text-[10px] text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">{blocks.length} 个组件</span>
        </div>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="blocks">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4 min-h-[300px]">
                {blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="group bg-white rounded-xl border shadow-sm relative overflow-hidden hover:shadow-md transition-shadow ring-1 ring-black/5"
                      >
                        <div className="p-4">
      <div className="flex gap-2 mb-3">
        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-primary p-1 rounded transition-colors bg-slate-50">
          <GripVertical className="w-4 h-4" />
        </div>
        <span className="text-[11px] font-bold uppercase text-slate-500 tracking-tighter">
          {block.type === 'text' && '文字内容'}
          {block.type === 'image' && '单图组件'}
          {block.type === 'concatenated' && '无缝拼接'}
          {block.type === 'sliding' && '左右滑动'}
          {block.type === 'grid' && `${block.columns}宫格图`}
          {block.type === 'big_multi' && '大多图组件'}
          {block.type === 'phone_wallpaper' && '手机模型壁纸'}
          {block.type === 'divider' && '分隔线'}
          {block.type === 'spacer' && `空白横隔 (${block.height}px)`}
          {block.type === 'raw_html' && 'HTML 区块'}
        </span>
        <div className="flex-1" />
        {block.type === 'big_multi' && (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-[10px] bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
            onClick={() => syncToWallpaper(block.id)}
          >
            <ArrowRightLeft className="w-3 h-3 mr-1" /> 同步到壁纸工具
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-6 h-6 text-slate-300 hover:text-destructive"
          onClick={() => removeBlock(block.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

                          {block.type === 'text' && (
                            <Textarea
                              value={block.content || ""}
                              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                              placeholder="输入正文内容..."
                              className="min-h-[120px] text-sm focus-visible:ring-primary/20"
                            />
                          )}

                          {block.type === 'image' && (
                            <div className="space-y-2">
                              {block.url ? (
                                <div className="relative rounded-lg overflow-hidden group/img flex justify-center bg-slate-100">
                                  <AutoCorsImg src={block.url} className="max-h-[300px] w-full object-contain" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button size="sm" variant="secondary" onClick={() => openMediaSelector(block.id)}>更换图片</Button>
                                  </div>
                                </div>
                              ) : (
                                <Button variant="outline" className="w-full h-24 border-dashed" onClick={() => openMediaSelector(block.id)}>
                                  <Plus className="w-4 h-4 mr-2" /> 选择图片
                                </Button>
                              )}
                            </div>
                          )}

                          {block.type === 'phone_wallpaper' && (
                            <PhoneWallpaperEditor
                              block={block}
                              allBlocks={blocks}
                              onChange={(updates) => updateBlock(block.id, updates)}
                              configId={configId}
                              openMediaSelector={openMediaSelector}
                              storageConfig={storageConfig}
                              onSyncToBigMulti={syncToBigMulti}
                              onSyncGeneratedToBigMulti={syncGeneratedToBigMulti}
                            />
                          )}

                          {['concatenated', 'sliding', 'grid', 'big_multi'].includes(block.type) && (
                            <div className="mt-2">
                              <Droppable droppableId={`images-${block.id}`} type="IMAGES" direction="horizontal">
                                {(provided) => (
                                  <div 
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={cn(
                                      "grid gap-2",
                                      block.type === "grid" ? `grid-cols-${block.columns}` : "grid-cols-4"
                                    )}
                                  >
                                    {block.images?.map((img, i) => (
                                      <Draggable key={`${block.id}-img-${i}`} draggableId={`${block.id}-img-${i}`} index={i}>
                                        {(provided) => (
                                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="relative aspect-square rounded overflow-hidden border">
                                            <AutoCorsImg src={img.url} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                              <Button size="icon" variant="destructive" className="w-6 h-6" onClick={() => {
                                                const newImages = [...(block.images || [])];
                                                newImages.splice(i, 1);
                                                updateBlock(block.id, { images: newImages });
                                              }}>
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                    <button onClick={() => openMediaSelector(block.id)} className="aspect-square border-2 border-dashed rounded-lg flex items-center justify-center hover:bg-slate-50">
                                      <Plus className="w-4 h-4 text-slate-300" />
                                    </button>
                                  </div>
                                )}
                              </Droppable>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      {/* HTML 插入对话框 */}
      <Dialog open={isHtmlDialogOpen} onOpenChange={setIsHtmlDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>插入 HTML 代码</DialogTitle>
            <DialogDescription>
              直接在正文插入自定义 HTML 片段，系统将原样输出。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={rawHtmlInput}
              onChange={(e) => setRawHtmlInput(e.target.value)}
              placeholder="例如：<div style='color: red;'>你好</div>"
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHtmlDialogOpen(false)}>取消</Button>
            <Button onClick={handleInsertHtml} disabled={!rawHtmlInput.trim()}>确认插入</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 模板选择器 */}
      <Dialog open={isTemplateSelectorOpen} onOpenChange={setIsTemplateSelectorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>选择模板插入到正文</DialogTitle>
            <DialogDescription>选择一个模板将其内容插入到当前内容末尾</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label>分类筛选：</Label>
              <Select value={selectedTemplateCategory} onValueChange={setSelectedTemplateCategory}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="全部分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  <SelectItem value="header">头部模板</SelectItem>
                  <SelectItem value="body">正文模板</SelectItem>
                  <SelectItem value="footer">尾部模板</SelectItem>
                  <SelectItem value="other">其他模板</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allTemplates
                .filter(t => t.is_active && (selectedTemplateCategory === 'all' || t.category === selectedTemplateCategory))
                .map(template => (
                  <Card key={template.id} className="relative cursor-pointer hover:border-primary transition-all group" onClick={() => handleSelectTemplate(template)}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-bold">{template.name}</div>
                        <Badge variant="outline" className="text-[10px]">
                          {template.category === 'header' && '头部'}
                          {template.category === 'body' && '正文'}
                          {template.category === 'footer' && '尾部'}
                          {template.category === 'other' && '其他'}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground line-clamp-2">{template.title}</div>
                      <div className="mt-4 flex justify-end">
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] group-hover:text-primary" onClick={() => handleSelectTemplate(template)}>点击选择</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              {allTemplates.filter(t => t.is_active && (selectedTemplateCategory === 'all' || t.category === selectedTemplateCategory)).length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  暂无匹配的模板
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 素材选择器 */}
      <Dialog open={isMediaSelectorOpen} onOpenChange={setIsMediaSelectorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>选择图片内容</DialogTitle>
            <DialogDescription>支持多选批量插入，点击图片进行选择</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="搜索素材..."
                  value={mediaSearch}
                  onChange={(e) => {
                    setMediaSearch(e.target.value);
                    setMediaPage(0);
                  }}
                  className="pl-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px] px-2"
                  onClick={() => setMediaSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                >
                  {mediaSortOrder === 'desc' ? '↓ 倒序' : '↑ 正序'}
                </Button>
                <Label className="text-[10px] whitespace-nowrap">每页：</Label>
                <Select value={mediaLimit.toString()} onValueChange={(v) => { setMediaLimit(parseInt(v)); setMediaPage(0); }}>
                  <SelectTrigger className="w-[70px] h-8 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16">16</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="32">32</SelectItem>
                    <SelectItem value="48">48</SelectItem>
                    <SelectItem value="64">64</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {uploading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="text-sm font-medium">正在同步资源到微信...</p>
                  <p className="text-xs text-muted-foreground mt-1">进度：{syncProgress.current} / {syncProgress.total} 个文件</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                {[...mediaItems].sort((a, b) => {
                  const timeA = new Date(a.created_at || 0).getTime();
                  const timeB = new Date(b.created_at || 0).getTime();
                  return mediaSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
                }).map(item => {
                  const isSelected = selectedMedia.some(m => m.id === item.id);
                  const selectedIndex = selectedMedia.findIndex(m => m.id === item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "relative group cursor-pointer aspect-square rounded overflow-hidden border-2 transition-all",
                        isSelected ? "border-primary" : "border-transparent hover:border-slate-200"
                      )}
                      onClick={() => toggleMediaSelection({ id: item.id, url: item.url })}
                    >
                      <AutoCorsImg
                        src={item.url}
                        alt={item.title || ''}
                        className={cn(
                          "w-full h-full object-contain transition-opacity",
                          isSelected ? "opacity-40" : "group-hover:opacity-90"
                        )}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <CheckCircle className="w-8 h-8 text-primary fill-white" />
                        </div>
                      )}
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/80 flex items-center justify-center text-[10px] font-bold">
                        {isSelected ? selectedIndex + 1 : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex justify-between items-center mt-4 border-t pt-4">
              <div className="text-[10px] text-muted-foreground">
                共 {mediaTotal} 个素材 {selectedMedia.length > 0 && <span className="text-primary font-bold ml-2">已选择 {selectedMedia.length} 个</span>}
              </div>
              <div className="flex gap-2">
                <div className="flex gap-1 mr-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px]"
                    onClick={() => setMediaPage(Math.max(0, mediaPage - 1))}
                    disabled={mediaPage === 0}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px]"
                    onClick={() => setMediaPage(mediaPage + 1)}
                    disabled={(mediaPage + 1) * mediaLimit >= mediaTotal}
                  >
                    下一页
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsMediaSelectorOpen(false)}>取消</Button>
                <Button 
                  size="sm" 
                  onClick={handleBatchSelectMedia} 
                  disabled={selectedMedia.length === 0 || uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  确认插入 ({selectedMedia.length})
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 手机预览对话框 */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-slate-900 border-none sm:rounded-3xl">
          <div className="relative pt-12 pb-8 px-6 flex flex-col items-center">
            {/* 模拟手机外壳顶部 */}
            <div className="absolute top-4 w-24 h-6 bg-slate-800 rounded-full flex items-center justify-center">
              <div className="w-10 h-1.5 bg-slate-700 rounded-full mr-2"></div>
              <div className="w-1.5 h-1.5 bg-slate-700 rounded-full"></div>
            </div>
            
            {/* 预览窗口 */}
            <div className="w-full h-[600px] bg-white rounded-2xl overflow-y-auto custom-scrollbar shadow-2xl relative">
              {/* 微信文章头部模拟 */}
              <div className="p-6 border-b sticky top-0 bg-white/80 backdrop-blur-md z-10">
                <div className="text-xl font-bold text-slate-900 leading-tight mb-3">
                  {(document.querySelector('input[placeholder="图文消息标题"]') as HTMLInputElement)?.value || '文章标题预览'}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[12px] text-primary font-medium">公众号名称</span>
                  <span className="text-[12px] text-slate-400">2026-03-13</span>
                </div>
              </div>
              
              <div 
                className="p-6 wechat-preview-content"
                style={{ wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-slate-400 text-center py-20 italic">预览内容为空</p>' }}
              />
            </div>
            
            <DialogFooter className="mt-4 w-full px-6 flex justify-center sm:justify-center">
              <Button variant="secondary" onClick={() => setIsPreviewDialogOpen(false)} className="rounded-full bg-slate-800 text-white hover:bg-slate-700 border-none px-8">
                关闭预览
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 手机模型壁纸编辑器 ====================

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

// 辅助函数：将图片 URL 转换为 Data URL，有助于解决 html-to-image 的跨域问题
async function imageUrlToDataUrl(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('[DraftBuilder] Fetch image failed, falling back to direct URL:', url, e);
    // 如果 fetch 失败（可能是因为没设 CORS），尝试直接使用原 URL
    return url;
  }
}

type DeviceModel = 'iphone' | 'android' | 'ipad' | 'foldable' | 'laptop' | 'desktop';

const DEVICE_PRESETS: { id: DeviceModel; label: string; aspect: string; borderClass: string }[] = [
  { id: 'iphone', label: 'iPhone', aspect: 'aspect-[9/19.5]', borderClass: 'rounded-[2.5rem] border-[8px] border-slate-800' },
  { id: 'android', label: 'Android', aspect: 'aspect-[9/19.5]', borderClass: 'rounded-[2rem] border-[7px] border-slate-800' },
  { id: 'ipad', label: 'iPad', aspect: 'aspect-[3/4]', borderClass: 'rounded-[1.5rem] border-[10px] border-slate-800' },
  { id: 'foldable', label: '折叠屏', aspect: 'aspect-[9/21]', borderClass: 'rounded-[2rem] border-[8px] border-slate-800' },
  { id: 'laptop', label: '笔记本', aspect: 'aspect-[16/10]', borderClass: 'rounded-lg border-[5px] border-slate-700' },
  { id: 'desktop', label: '电脑', aspect: 'aspect-[16/9]', borderClass: 'rounded-md border-[4px] border-slate-700' },
];

interface PhoneWallpaperEditorProps {
  block: Block;
  allBlocks?: Block[];
  onChange: (updates: Partial<Block>) => void;
  configId: string;
  openMediaSelector: (blockId: string) => void;
  storageConfig: any;
  onSyncToBigMulti: (blockId: string) => void;
  onSyncGeneratedToBigMulti: (blockId: string, manualImages?: any[]) => void;
}

function PhoneWallpaperEditor({ block, allBlocks = [], onChange, configId, openMediaSelector, storageConfig, onSyncToBigMulti, onSyncGeneratedToBigMulti }: PhoneWallpaperEditorProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const getConfig = () => {
    try {
      return JSON.parse(block.content || '{}');
    } catch {
      return {};
    }
  };

  const setConfig = (cfg: any) => {
    onChange({ content: JSON.stringify(cfg) });
  };

  const now = new Date();
  const defaultTime = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const defaultDate = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }) + ' ' + ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];

  const cfg = getConfig();
  const phoneModel: DeviceModel = cfg.phoneModel || 'android';
  const phoneBgColor = cfg.phoneBgColor || 'transparent'; // 默认透明
  const phoneWallpaperUrl = cfg.phoneWallpaperUrl || ''; // 为了向后兼容
  const wallpapers: string[] = cfg.wallpapers || (phoneWallpaperUrl ? [phoneWallpaperUrl] : []);
  const layout: 'vertical' | 'horizontal' = cfg.layout || 'vertical';
  const lockTime = cfg.lockTime || defaultTime;
  const lockDate = cfg.lockDate || defaultDate;
  
  // 新增自定义字段配置
  const operatorName = cfg.operatorName || '中国联通';
  const operatorFontSize = cfg.operatorFontSize || 8.5;
  const statusIconSize = cfg.statusIconSize || 11;
  const lockTimeFontSize = cfg.lockTimeFontSize || 44;
  const lockDateFontSize = cfg.lockDateFontSize || 11;
  const footerText = cfg.footerText || '@特控图集';
  const footerFontSize = cfg.footerFontSize || 8;
  const brandText = cfg.brandText || 'Zingle';
  const brandFontSize = cfg.brandFontSize || 14;
  const bottomIconSize = cfg.bottomIconSize || 16; // 底部图标大小
  const modelPaddingTop = cfg.modelPaddingTop || 40; // 模型上边距
  const modelPaddingBottom = cfg.modelPaddingBottom || 40; // 模型下边距

  // 参数保存功能相关的配置项
  // 获取当前块的预设以及其他块的预设
  const getCombinedPresets = () => {
    const currentPresets = cfg.savedPresets || [];
    const otherPresets: any[] = [];
    allBlocks.forEach(b => {
      if (b.id !== block.id && b.type === 'phone_wallpaper' && b.content) {
        try {
          const bCfg = JSON.parse(b.content);
          if (bCfg.savedPresets && Array.isArray(bCfg.savedPresets)) {
            bCfg.savedPresets.forEach((p: any) => {
              if (!currentPresets.some((cp: any) => cp.name === p.name) && 
                  !otherPresets.some(op => op.name === p.name)) {
                otherPresets.push(p);
              }
            });
          }
        } catch (e) {
          console.error('Failed to parse other block content', e);
        }
      }
    });
    return [...currentPresets, ...otherPresets];
  };

  const savedPresets = getCombinedPresets();
  const [currentPresetName, setCurrentPresetName] = useState('');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(-1);

  const phoneGeneratedUrl = block.url || '';

  const handleSavePreset = () => {
    if (!currentPresetName.trim()) {
      toast.error('请输入预设名称');
      return;
    }
    const newPreset = {
      name: currentPresetName,
      config: {
        operatorName,
        operatorFontSize,
        statusIconSize,
        lockTimeFontSize,
        lockDateFontSize,
        footerText,
        footerFontSize,
        brandText,
        brandFontSize,
        bottomIconSize,
        modelPaddingTop,
        modelPaddingBottom,
      }
    };
    
    // 只保存在当前块中
    const currentPresets = cfg.savedPresets || [];
    const updatedPresets = [...currentPresets, newPreset];
    setConfig({ ...cfg, savedPresets: updatedPresets });
    setCurrentPresetName('');
    setSelectedPresetIndex(updatedPresets.length - 1);
    toast.success(`预设 "${currentPresetName}" 保存成功`);
  };

  const applyPreset = (preset: any, index: number) => {
    setConfig({ ...cfg, ...preset.config });
    setSelectedPresetIndex(index);
    toast.success(`已应用预设 "${preset.name}"`);
  };

  const deletePreset = (index: number) => {
    // 只能删除当前块保存的预设
    const currentPresets = cfg.savedPresets || [];
    if (index < currentPresets.length) {
      const updatedPresets = currentPresets.filter((_: any, i: number) => i !== index);
      setConfig({ ...cfg, savedPresets: updatedPresets });
      if (selectedPresetIndex === index) {
        setSelectedPresetIndex(-1);
      } else if (selectedPresetIndex > index) {
        setSelectedPresetIndex(selectedPresetIndex - 1);
      }
      toast.success('预设已删除');
    } else {
      toast.error('无法删除其他草稿的预设');
    }
  };

  const device = DEVICE_PRESETS.find(d => d.id === phoneModel) || DEVICE_PRESETS[0];

  // ============ 样式定义 (本地化，避免跨域 CSS 访问错误) ============
  const getStyles = (bgColor: string = phoneBgColor) => ({
    outerWrapper: {
      position: 'relative' as const,
      width: '300px', // 固定画布宽度
      padding: `${modelPaddingTop}px 20px ${modelPaddingBottom}px`, // 使用自定义边距
      backgroundColor: 'transparent', // 画布透明
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      position: 'relative' as const,
      overflow: 'hidden',
      backgroundColor: '#ffffff', // 模型白底 (强制白底，除非用户明确设置背景色)
      width: '100%',
      // 宽度映射
      maxWidth: phoneModel === 'laptop' ? 280 : phoneModel === 'desktop' ? 300 : phoneModel === 'ipad' ? 240 : 160, // 稍微缩小模型
      // 比例映射
      aspectRatio: phoneModel === 'ipad' ? '3/4' : (phoneModel === 'laptop' ? '16/10' : (phoneModel === 'desktop' ? '16/9' : (phoneModel === 'foldable' ? '9/21' : '9/19.5'))),
      // 边框映射
      borderRadius: (phoneModel === 'iphone' || phoneModel === 'android' || phoneModel === 'foldable') ? '2.5rem' : (phoneModel === 'ipad' ? '1.5rem' : (phoneModel === 'laptop' ? '0.5rem' : '0.375rem')),
      border: (phoneModel === 'iphone' || phoneModel === 'android' || phoneModel === 'foldable') ? '8px solid #1e293b' : (phoneModel === 'ipad' ? '10px solid #1e293b' : (phoneModel === 'laptop' ? '5px solid #334155' : '4px solid #334155')),
    },
    notch: {
      position: 'absolute' as const,
      top: '11px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 35,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: phoneModel === 'iphone' ? '60px' : (phoneModel === 'android' ? '12px' : '10px'),
      height: phoneModel === 'iphone' ? '22px' : (phoneModel === 'android' ? '12px' : '10px'),
      backgroundColor: '#000000',
      borderRadius: '20px',
    },
    statusBar: {
      position: 'absolute' as const,
      top: '12px',
      left: 0,
      right: 0,
      padding: '0 16px',
      height: '18px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 30,
      color: '#ffffff',
      fontSize: '8.5px',
      fontWeight: '600',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    statusLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '3px',
    },
    statusRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    lockContent: {
      position: 'absolute' as const,
      top: '55px',
      left: 0,
      right: 0,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      zIndex: 25,
      color: '#ffffff',
      textAlign: 'center' as const,
      textShadow: '0 1px 4px rgba(0,0,0,0.3)',
    },
    lockDate: {
      fontSize: '11px',
      fontWeight: '500' as const,
      marginBottom: '1px',
      letterSpacing: '0.1px',
    },
    lockTime: {
      fontSize: '44px',
      fontWeight: '700' as const,
      lineHeight: '1',
      letterSpacing: '-1px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    lockWidget: {
      marginTop: '10px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '4px',
      padding: '0 20px',
      width: '100%',
    },
    widgetItem: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '8px',
      padding: '4px 8px',
      width: '100%',
      maxWidth: '120px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    bottomActions: {
      position: 'absolute' as const,
      bottom: '34px',
      left: 0,
      right: 0,
      padding: '0 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 30,
    },
    actionCircle: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#ffffff',
    },
    batteryIcon: {
      width: '18px',
      height: '9px',
      border: '1px solid rgba(255, 255, 255, 0.5)',
      borderRadius: '2px',
      position: 'relative' as const,
      padding: '1px',
    },
    batteryFill: {
      width: '70%',
      height: '100%',
      backgroundColor: '#ffffff',
      borderRadius: '1px',
    },
    batteryTip: {
      position: 'absolute' as const,
      right: '-3px',
      top: '2px',
      width: '2px',
      height: '3px',
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      borderTopRightRadius: '1px',
      borderBottomRightRadius: '1px',
    },
    wallpaper: {
      position: 'absolute' as const,
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
    },
    indicator: {
      position: 'absolute' as const,
      bottom: '6px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '80px',
      height: '4px',
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      borderRadius: '9999px',
      zIndex: 10,
    },
    laptopBase: {
      position: 'absolute' as const,
      bottom: '-8px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '110%',
      height: '8px',
      backgroundColor: '#334155',
      borderBottomLeftRadius: '0.375rem',
      borderBottomRightRadius: '0.375rem',
      zIndex: 10,
    }
  });

  const styles = getStyles();

  const handleGenerate = async () => {
    if (wallpapers.length === 0 || !previewRef.current) {
      toast.error('请添加壁纸图片');
      return;
    }
    if (!configId) {
      toast.error('未选择公众号配置');
      return;
    }
    setGenerating(true);
    
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

      const generatedImages: { id: string; url: string }[] = [];
      const hiddenContainer = document.createElement('div');
      hiddenContainer.style.position = 'fixed';
      hiddenContainer.style.left = '-9999px';
      hiddenContainer.style.top = '-9999px';
      hiddenContainer.style.backgroundColor = 'transparent';
      hiddenContainer.style.background = 'none';
      document.body.appendChild(hiddenContainer);

      // 并行构建每张图的 DOM 并等待图片加载
      const buildTasks = wallpapers.map(async (url, i) => {
        if (!url) return null;

        console.log(`[PhoneWallpaper] 正在处理第 ${i+1} 张图片:`, url);
        const corsSafeUrl = await imageUrlToDataUrl(url);

        const outerWrapper = document.createElement('div');
        Object.assign(outerWrapper.style, styles.outerWrapper);
        outerWrapper.style.backgroundColor = 'transparent';
        
        const tempEl = document.createElement('div');
        Object.assign(tempEl.style, styles.container);
        tempEl.style.width = typeof styles.container.maxWidth === 'number' ? `${styles.container.maxWidth}px` : styles.container.maxWidth;
        tempEl.style.boxShadow = 'none';
        tempEl.style.position = 'relative';
        tempEl.style.zIndex = '1';
        tempEl.style.backgroundColor = 'transparent';
        
        const inner = document.createElement('div');
        inner.style.position = 'absolute';
        inner.style.inset = '0';
        inner.style.overflow = 'hidden';
        inner.style.backgroundColor = (phoneBgColor === 'transparent' || !phoneBgColor) ? '#ffffff' : phoneBgColor;
        inner.style.borderRadius = (phoneModel === 'iphone' || phoneModel === 'android' || phoneModel === 'foldable') ? '2.1rem' : (phoneModel === 'ipad' ? '1.2rem' : '0.25rem');
        
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        const imageLoadPromise = new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => {
            console.error('[PhoneWallpaper] 图片加载失败 (img.onerror):', corsSafeUrl);
            reject(new Error('图片加载失败'));
          };
        });
        img.src = corsSafeUrl;
        Object.assign(img.style, styles.wallpaper);
        inner.appendChild(img);

        if (phoneModel === 'iphone' || phoneModel === 'android' || phoneModel === 'foldable') {
          const statusBar = document.createElement('div');
          Object.assign(statusBar.style, styles.statusBar);
          
          const statusLeft = document.createElement('div');
          Object.assign(statusLeft.style, styles.statusLeft);
          statusLeft.innerHTML = `<span style="font-size: ${operatorFontSize}px; display: inline-block; transform: ${operatorFontSize < 10 ? `scale(${operatorFontSize / 10})` : 'none'}; transform-origin: left center;">${operatorName}</span>`;
          
          const statusRight = document.createElement('div');
          Object.assign(statusRight.style, styles.statusRight);
          const iconScale = statusIconSize / 11;
          statusRight.innerHTML = `
            <div style="display: flex; align-items: flex-end; gap: ${1.2 * iconScale}px; height: ${7 * iconScale}px; margin-right: ${1 * iconScale}px;">
              <div style="width: ${1.8 * iconScale}px; height: ${2.5 * iconScale}px; background-color: #ffffff; border-radius: ${0.3 * iconScale}px;"></div>
              <div style="width: ${1.8 * iconScale}px; height: ${4 * iconScale}px; background-color: #ffffff; border-radius: ${0.3 * iconScale}px;"></div>
              <div style="width: ${1.8 * iconScale}px; height: ${5.5 * iconScale}px; background-color: #ffffff; border-radius: ${0.3 * iconScale}px;"></div>
              <div style="width: ${1.8 * iconScale}px; height: ${7 * iconScale}px; background-color: #ffffff; border-radius: ${0.3 * iconScale}px;"></div>
            </div>
            <svg viewBox="0 0 24 24" style="width: ${statusIconSize}px; height: ${statusIconSize}px; fill: #ffffff; margin-right: ${1 * iconScale}px; transform: ${statusIconSize < 8 ? `scale(${statusIconSize / 8})` : 'none'}; transform-origin: center center;">
              <path d="M12,21L15.6,16.2C14.6,15.45 13.35,15 12,15C10.65,15 9.4,15.45 8.4,16.2L12,21M12,2C5.97,2 1,6.97 1,13C1,16.03 2.22,18.77 4.22,20.78L12,11L19.78,20.78C21.78,18.77 23,16.03 23,13C23,6.97 18.03,2 12,2Z" />
            </svg>
            <div style="width: ${18 * iconScale}px; height: ${8.5 * iconScale}px; border: ${1 * iconScale}px solid rgba(255,255,255,0.4); border-radius: ${2 * iconScale}px; position: relative; padding: ${1 * iconScale}px; transform-origin: right center;">
              <div style="width: 85%; height: 100%; background-color: #ffffff; border-radius: ${0.5 * iconScale}px;"></div>
              <div style="width: ${1.5 * iconScale}px; height: ${3.5 * iconScale}px; background-color: rgba(255,255,255,0.4); position: absolute; right: ${-2.8 * iconScale}px; top: 50%; transform: translateY(-50%); border-top-right-radius: ${0.8 * iconScale}px; border-bottom-right-radius: ${0.8 * iconScale}px;"></div>
            </div>
          `;
          statusBar.appendChild(statusLeft);
          statusBar.appendChild(statusRight);
          inner.appendChild(statusBar);

          const notch = document.createElement('div');
          Object.assign(notch.style, styles.notch);
          if (phoneModel === 'iphone') {
            notch.style.width = '64px';
            notch.style.height = '18px';
            notch.style.top = '10px';
          }
          inner.appendChild(notch);

          const lockContent = document.createElement('div');
          Object.assign(lockContent.style, styles.lockContent);
          lockContent.innerHTML = `
            <div style="font-size: ${lockDateFontSize}px; font-weight: 500; margin-bottom: 1px; letter-spacing: 0.1px; transform: ${lockDateFontSize < 10 ? `scale(${lockDateFontSize / 10})` : 'none'}; transform-origin: center center;">${lockDate}</div>
            <div style="font-size: ${lockTimeFontSize}px; font-weight: 700; line-height: 1; letter-spacing: -1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; transform: ${lockTimeFontSize < 20 ? `scale(${lockTimeFontSize / 20})` : 'none'}; transform-origin: center center;">${lockTime}</div>
            <div style="margin-top: 10px; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0 20px; width: 100%;">
              <div style="display: flex; align-items: center; width: 100%; max-width: 140px; gap: 8px;">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
                    <div style="width: 10px; height: 5px; border: 1px solid rgba(255,255,255,0.8); border-radius: 1px; position: relative;">
                      <div style="absolute; inset: 0.5px; background-color: #fff;"></div>
                    </div>
                    <span style="font-size: 8px; font-weight: bold;">100%</span>
                  </div>
                  <div style="font-size: ${footerFontSize}px; font-weight: 500; opacity: 0.9; display: inline-block; transform: ${footerFontSize < 10 ? `scale(${footerFontSize / 10})` : 'none'}; transform-origin: left center; white-space: pre-wrap;">${footerText}</div>
                </div>
                <div style="font-size: ${brandFontSize}px; font-style: italic; font-family: serif; opacity: 0.9; display: inline-block; transform: ${brandFontSize < 10 ? `scale(${brandFontSize / 10})` : 'none'}; transform-origin: right center;">${brandText}</div>
              </div>
              <div style="width: 60px; height: 2px; backgroundColor: rgba(255,255,255,0.4); border-radius: 1px; margin-top: 6px; align-self: flex-start; margin-left: 24px;"></div>
            </div>
          `;
          inner.appendChild(lockContent);

          const bottomActions = document.createElement('div');
          Object.assign(bottomActions.style, styles.bottomActions);
          bottomActions.style.bottom = '36px';
          const bIconScale = bottomIconSize / 16;
          const bCircleSize = 36 * bIconScale;
          const bIconSvgSize = bottomIconSize;
          bottomActions.innerHTML = `
            <div style="width: ${bCircleSize}px; height: ${bCircleSize}px; border-radius: 50%; background-color: rgba(0,0,0,0.3); backdrop-filter: blur(15px); border: 0.5px solid rgba(255,255,255,0.1); display: flex; justify-content: center; align-items: center;">
              <svg viewBox="0 0 24 24" style="width: ${bIconSvgSize}px; height: ${bIconSvgSize}px; fill: #ffffff;"><path d="M12 2C10.9 2 10 2.9 10 4V12.18C8.84 12.59 8 13.7 8 15C8 16.66 9.34 18 11 18V22H13V18C14.66 18 16 16.66 16 15C16 13.7 15.16 12.59 14 12.18V4C14 2.9 13.1 2 12 2M11 15C11 14.45 11.45 14 12 14S13 14.45 13 15 12.55 16 12 16 11 15.55 11 15Z" /></svg>
            </div>
            <div style="width: ${bCircleSize}px; height: ${bCircleSize}px; border-radius: 50%; background-color: rgba(0,0,0,0.3); backdrop-filter: blur(15px); border: 0.5px solid rgba(255,255,255,0.1); display: flex; justify-content: center; align-items: center;">
              <svg viewBox="0 0 24 24" style="width: ${bIconSvgSize}px; height: ${bIconSvgSize}px; fill: #ffffff;"><path d="M20,4H16.83L15,2H9L7.17,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6A2,2 0 0,0 20,4M20,18H4V6H8.05L9.88,4H14.12L15.95,6H20V18M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15Z" /></svg>
            </div>
          `;
          inner.appendChild(bottomActions);
          
          const indicator = document.createElement('div');
          Object.assign(indicator.style, styles.indicator);
          inner.appendChild(indicator);
        }

        if (phoneModel === 'laptop') {
          const base = document.createElement('div');
          Object.assign(base.style, styles.laptopBase);
          inner.appendChild(base);
        }

        tempEl.appendChild(inner);
        outerWrapper.appendChild(tempEl);
        hiddenContainer.appendChild(outerWrapper);

        // 等待图片加载
        try {
          await imageLoadPromise;
          await new Promise(resolve => setTimeout(resolve, 600));
        } catch (e) {
          console.error('[PhoneWallpaper] 图片加载失败:', url);
          hiddenContainer.removeChild(outerWrapper);
          return { index: i, error: `第 ${i+1} 张图片加载失败` };
        }

        return { index: i, outerWrapper };
      });

      // 并行等待所有 DOM 构建和图片加载
      const buildResults = await Promise.all(buildTasks);

      // 串行生成截图（html-to-image 依赖 DOM 状态，逐个捕获以避免竞争）
      for (const result of buildResults) {
        if (!result) continue;
        if ('error' in result) {
          console.warn(`[PhoneWallpaper] 跳过第 ${result.index + 1} 张:`, result.error);
          continue;
        }
        const { index: i, outerWrapper } = result;

        try {
          console.log(`[PhoneWallpaper] 开始生成第 ${i+1}/${wallpapers.length} 张图片...`);
          const dataUrl = await toPng(outerWrapper, {
            quality: 1,
            pixelRatio: 2,
            skipFonts: true,
            backgroundColor: 'transparent',
            style: {
              backgroundColor: 'transparent',
              background: 'none',
              padding: '40px 20px',
            }
          });

          if (!dataUrl || dataUrl.length < 2000) {
            console.error(`[PhoneWallpaper] 第 ${i+1} 张内容无效 (长度: ${dataUrl?.length})`);
            toast.warning(`第 ${i+1} 张图片生成内容无效，已跳过`);
            continue;
          }

          const blob = dataURLtoBlob(dataUrl);
          const fileName = `phone-wallpaper-${Date.now()}-${i}.png`;
          const file = new File([blob], fileName, { type: 'image/png' });

          console.log(`[PhoneWallpaper] 开始上传第 ${i+1} 张图片...`);
          const uploadRes = await uploadToStorage({
            file,
            path: `drafts/${fileName}`,
            storageConfig: storageConfig
          });

          if (uploadRes?.url) {
            console.log(`[PhoneWallpaper] 第 ${i+1} 张上传成功:`, uploadRes.url);
            const timestampedUrl = `${uploadRes.url}${uploadRes.url.includes('?') ? '&' : '?'}t=${Date.now()}`;
            generatedImages.push({ id: Math.random().toString(36).substr(2, 9), url: timestampedUrl });
          } else {
            console.error(`[PhoneWallpaper] 第 ${i+1} 张上传失败:`, uploadRes?.error);
            toast.warning(`第 ${i+1} 张图片上传失败，已跳过: ${uploadRes?.error || '存储错误'}`);
          }
        } catch (err: any) {
          console.error(`[PhoneWallpaper] 第 ${i+1} 张处理异常，已跳过:`, err);
          toast.warning(`第 ${i+1} 张处理失败，已跳过`);
        } finally {
          try { hiddenContainer.removeChild(outerWrapper); } catch (_) {}
        }
      }

      console.log('[PhoneWallpaper] 所有图片生成完成，共:', generatedImages.length);
      document.body.removeChild(hiddenContainer);

      if (generatedImages.length === 0) {
        throw new Error('未成功生成任何合成图，请检查图片链接是否有效或是否存在跨域限制');
      }

      onChange({ 
        url: '', // 取消自动插入第一个生成的手机模型合成图作为块的主图
        images: generatedImages.map(img => ({
          ...img,
          url: `${img.url}${img.url.includes('?') ? '&' : '?'}t=${Date.now()}`
        }))
      });
      
      // 自动同步到大多图组件
      if (generatedImages.length > 0) {
        onSyncGeneratedToBigMulti(block.id, generatedImages);
      }
      
      toast.success('合成图生成成功');
    } catch (err: any) {
      console.error('[PhoneWallpaper] Generate failed:', err);
      toast.error(err.message || '生成失败');
    } finally {
      for (const item of removedLinks) {
        try {
          item.parent.insertBefore(item.element, item.next);
        } catch (e) {}
      }
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* 原始图片输入 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-bold uppercase text-slate-500">壁纸图片列表 ({wallpapers.length})</Label>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 rounded-md"
            onClick={() => onSyncToBigMulti(block.id)}
          >
            <RefreshCw className="w-3 h-3 mr-1" /> 同步原图到大多图组件
          </Button>
        </div>
        <div className="space-y-2">
          {wallpapers.map((url, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => {
                  const newWallpapers = [...wallpapers];
                  newWallpapers[idx] = e.target.value;
                  setConfig({ ...cfg, wallpapers: newWallpapers });
                }}
                placeholder="输入壁纸图片链接..."
                className="h-9 text-sm rounded-lg bg-white border-slate-200"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const newWallpapers = wallpapers.filter((_, i) => i !== idx);
                  setConfig({ ...cfg, wallpapers: newWallpapers });
                }}
                className="h-9 px-3 rounded-lg text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setConfig({ ...cfg, wallpapers: [...wallpapers, ''] });
              }}
              className="flex-1 h-9 rounded-lg border-dashed border-slate-300 text-slate-500 hover:bg-slate-50"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              添加壁纸
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => openMediaSelector(block.id)}
              className="h-9 px-3 rounded-lg bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-all"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 模型选择 */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase text-slate-500">设备模型</Label>
        <div className="flex gap-1.5 flex-wrap">
          {DEVICE_PRESETS.map((d) => (
            <Button
              key={d.id}
              variant={phoneModel === d.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setConfig({ ...cfg, phoneModel: d.id })}
              className={cn(
                'h-7 text-[10px] px-2.5 rounded-lg',
                phoneModel === d.id ? 'bg-primary text-white' : 'bg-white text-slate-600 border-slate-200'
              )}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 背景色 */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase text-slate-500">手机背景色 (透明则背景不填充)</Label>
        <div className="flex gap-2 items-center">
          <Input
            type="color"
            value={phoneBgColor === 'transparent' ? '#000000' : phoneBgColor}
            onChange={(e) => setConfig({ ...cfg, phoneBgColor: e.target.value })}
            className="w-10 h-9 p-1 rounded-lg bg-white border-slate-200"
          />
          <Input
            type="text"
            value={phoneBgColor}
            onChange={(e) => setConfig({ ...cfg, phoneBgColor: e.target.value })}
            className="flex-1 h-9 text-sm rounded-lg bg-white border-slate-200 font-mono"
            placeholder="transparent 或 #十六进制"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfig({ ...cfg, phoneBgColor: 'transparent' })}
            className="h-9 px-2 text-[10px]"
          >
            透明
          </Button>
        </div>
      </div>

      {/* 参数预设保存 */}
      <div className="space-y-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-bold uppercase text-blue-600 flex items-center gap-1">
            <Layers className="w-3 h-3" /> 参数预设管理
          </Label>
        </div>
        <div className="flex gap-2">
          <Input 
            placeholder="预设名称" 
            value={currentPresetName}
            onChange={(e) => setCurrentPresetName(e.target.value)}
            className="h-8 text-xs bg-white border-blue-200"
          />
          <Button 
            size="sm" 
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
            onClick={handleSavePreset}
          >
            保存当前
          </Button>
        </div>
        {savedPresets.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {savedPresets.map((preset, idx) => (
              <div key={idx} className="group relative">
                <Button
                  variant={selectedPresetIndex === idx ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 text-[10px] px-2 pr-6",
                    selectedPresetIndex === idx ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                  )}
                  onClick={() => applyPreset(preset, idx)}
                >
                  {preset.name}
                </Button>
                <button
                  onClick={() => deletePreset(idx)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-blue-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Plus className="w-3 h-3 rotate-45" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 锁屏时间与日期 */}
      <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase text-slate-500">锁屏时间</Label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  value={lockTimeFontSize}
                  onChange={(e) => setConfig({ ...cfg, lockTimeFontSize: parseFloat(e.target.value) || 0 })}
                  className="w-12 h-5 text-[9px] px-1 rounded bg-white border-slate-200"
                  placeholder="大小"
                  min="0"
                  step="0.5"
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 text-[9px] text-primary px-1 hover:bg-primary/5"
                  onClick={() => {
                    const n = new Date();
                    const t = n.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
                    const d = n.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }) + ' ' + ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][n.getDay()];
                    setConfig({ ...cfg, lockTime: t, lockDate: d });
                    toast.success('已同步当前系统时间');
                  }}
                >
                  更新
                </Button>
              </div>
            </div>
            <Slider
              value={[lockTimeFontSize]}
              onValueChange={([val]) => setConfig({ ...cfg, lockTimeFontSize: val })}
              max={100}
              step={0.5}
              className="py-2"
            />
            <Input
              type="text"
              value={lockTime}
              onChange={(e) => setConfig({ ...cfg, lockTime: e.target.value })}
              className="h-9 text-sm rounded-lg bg-white border-slate-200"
              placeholder="如 00:02"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase text-slate-500">锁屏日期</Label>
              <Input
                type="number"
                value={lockDateFontSize}
                onChange={(e) => setConfig({ ...cfg, lockDateFontSize: parseFloat(e.target.value) || 0 })}
                className="w-12 h-5 text-[9px] px-1 rounded bg-white border-slate-200"
                placeholder="大小"
                min="0"
                step="0.5"
              />
            </div>
            <Slider
              value={[lockDateFontSize]}
              onValueChange={([val]) => setConfig({ ...cfg, lockDateFontSize: val })}
              max={30}
              step={0.5}
              className="py-2"
            />
            <Input
              type="text"
              value={lockDate}
              onChange={(e) => setConfig({ ...cfg, lockDate: e.target.value })}
              className="h-9 text-sm rounded-lg bg-white border-slate-200"
              placeholder="如 5月12日 星期二"
            />
          </div>
      </div>

      {/* 自定义细节 */}
      <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase text-slate-500">运营商</Label>
              <Input
                type="number"
                value={operatorFontSize}
                onChange={(e) => setConfig({ ...cfg, operatorFontSize: parseFloat(e.target.value) || 0 })}
                className="w-12 h-5 text-[9px] px-1 rounded bg-white border-slate-200"
                placeholder="大小"
                min="0"
                step="0.5"
              />
            </div>
            <Slider
              value={[operatorFontSize]}
              onValueChange={([val]) => setConfig({ ...cfg, operatorFontSize: val })}
              max={20}
              step={0.5}
              className="py-1"
            />
            <Input
              type="text"
              value={operatorName}
              onChange={(e) => setConfig({ ...cfg, operatorName: e.target.value })}
              className="h-8 text-xs rounded-lg bg-white border-slate-200"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold uppercase text-slate-500">状态栏图标大小 ({statusIconSize})</Label>
            <Slider
              value={[statusIconSize]}
              onValueChange={([val]) => setConfig({ ...cfg, statusIconSize: val })}
              max={30}
              step={0.5}
              className="py-1"
            />
            <Input
              type="number"
              value={statusIconSize}
              onChange={(e) => setConfig({ ...cfg, statusIconSize: parseFloat(e.target.value) || 0 })}
              className="h-8 text-xs rounded-lg bg-white border-slate-200"
              min="0"
              step="0.5"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase text-slate-500">底部说明文字</Label>
              <Input
                type="number"
                value={footerFontSize}
                onChange={(e) => setConfig({ ...cfg, footerFontSize: parseFloat(e.target.value) || 0 })}
                className="w-12 h-5 text-[9px] px-1 rounded bg-white border-slate-200"
                placeholder="大小"
                min="0"
                step="0.5"
              />
            </div>
            <Slider
              value={[footerFontSize]}
              onValueChange={([val]) => setConfig({ ...cfg, footerFontSize: val })}
              max={20}
              step={0.5}
              className="py-1"
            />
            <Textarea
              value={footerText}
              onChange={(e) => setConfig({ ...cfg, footerText: e.target.value })}
              className="min-h-[60px] text-xs rounded-lg bg-white border-slate-200 resize-none"
              placeholder="回车即可换行"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase text-slate-500">底部图标大小</Label>
              <Input
                type="number"
                value={bottomIconSize}
                onChange={(e) => setConfig({ ...cfg, bottomIconSize: parseFloat(e.target.value) || 0 })}
                className="w-12 h-5 text-[9px] px-1 rounded bg-white border-slate-200"
                min="0"
                step="0.5"
              />
            </div>
            <Slider
              value={[bottomIconSize]}
              onValueChange={([val]) => setConfig({ ...cfg, bottomIconSize: val })}
              max={40}
              step={0.5}
              className="py-1"
            />
            <div className="flex items-center justify-between mt-1">
              <Label className="text-[10px] font-bold uppercase text-slate-500">品牌文字</Label>
              <Input
                type="number"
                value={brandFontSize}
                onChange={(e) => setConfig({ ...cfg, brandFontSize: parseFloat(e.target.value) || 0 })}
                className="w-12 h-5 text-[9px] px-1 rounded bg-white border-slate-200"
                min="0"
                step="0.5"
              />
            </div>
            <Slider
              value={[brandFontSize]}
              onValueChange={([val]) => setConfig({ ...cfg, brandFontSize: val })}
              max={30}
              step={0.5}
              className="py-1"
            />
            <Input
              type="text"
              value={brandText}
              onChange={(e) => setConfig({ ...cfg, brandText: e.target.value })}
              className="h-8 text-xs rounded-lg bg-white border-slate-200"
            />
          </div>
        </div>

        {/* 模型间距调整 */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold uppercase text-slate-500 flex justify-between">
              模型上间距 <span>{modelPaddingTop}px</span>
            </Label>
            <Slider
              value={[modelPaddingTop]}
              onValueChange={([val]) => setConfig({ ...cfg, modelPaddingTop: val })}
              max={150}
              step={1}
              className="py-1"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold uppercase text-slate-500 flex justify-between">
              模型下间距 <span>{modelPaddingBottom}px</span>
            </Label>
            <Slider
              value={[modelPaddingBottom]}
              onValueChange={([val]) => setConfig({ ...cfg, modelPaddingBottom: val })}
              max={150}
              step={1}
              className="py-1"
            />
          </div>
        </div>
      </div>

      {/* 实时预览 */}
      {wallpapers.length > 0 && (
        <div className="flex flex-col gap-4 bg-slate-100 rounded-xl p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-[10px] font-bold uppercase text-slate-500">
              壁纸预览 ({wallpapers.filter(u => u).length})
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full bg-white shadow-sm border border-slate-200"
                onClick={() => {
                  const el = document.getElementById('preview-scroll-container');
                  if (el) el.scrollBy({ left: -150, behavior: 'smooth' });
                }}
              >
                <Plus className="w-3 h-3 rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full bg-white shadow-sm border border-slate-200"
                onClick={() => {
                  const el = document.getElementById('preview-scroll-container');
                  if (el) el.scrollBy({ left: 150, behavior: 'smooth' });
                }}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div 
            id="preview-scroll-container"
            className={cn(
              "flex gap-4",
              layout === 'vertical' ? 'flex-col items-center' : 'flex-row overflow-x-auto pb-2 scrollbar-hide'
            )}
          >
            {wallpapers.filter(url => url).map((url, idx) => (
              <div
                key={idx}
                ref={idx === 0 ? previewRef : null}
                style={{
                  ...styles.container,
                  backgroundColor: '#ffffff', // 预览也强制白底
                  flexShrink: layout === 'horizontal' ? 0 : 1,
                  maxWidth: layout === 'horizontal' ? '140px' : styles.container.maxWidth
                }}
              >
                {/* 壁纸图片 */}
                <AutoCorsImg
                  src={url}
                  alt={`壁纸 ${idx + 1}`}
                  style={styles.wallpaper}
                />

                {/* 状态栏与刘海与锁屏内容 */}
                {(phoneModel === 'iphone' || phoneModel === 'android' || phoneModel === 'foldable') && (
                  <>
                    <div style={styles.statusBar}>
                      <div style={styles.statusLeft}>
                        <span style={{ 
                          fontSize: `${operatorFontSize}px`,
                          display: 'inline-block',
                          transform: operatorFontSize < 10 ? `scale(${operatorFontSize / 10})` : 'none',
                          transformOrigin: 'left center'
                        }}>{operatorName}</span>
                      </div>
                      <div style={styles.statusRight}>
                        {(() => {
                          const iconScale = statusIconSize / 11;
                          return (
                            <>
                              <div style={{ display: 'flex', alignItems: 'flex-end', gap: `${1.2 * iconScale}px`, height: `${7 * iconScale}px`, marginRight: `${1 * iconScale}px` }}>
                                <div style={{ width: `${1.8 * iconScale}px`, height: `${2.5 * iconScale}px`, backgroundColor: '#ffffff', borderRadius: `${0.3 * iconScale}px` }} />
                                <div style={{ width: `${1.8 * iconScale}px`, height: `${4 * iconScale}px`, backgroundColor: '#ffffff', borderRadius: `${0.3 * iconScale}px` }} />
                                <div style={{ width: `${1.8 * iconScale}px`, height: `${5.5 * iconScale}px`, backgroundColor: '#ffffff', borderRadius: `${0.3 * iconScale}px` }} />
                                <div style={{ width: `${1.8 * iconScale}px`, height: `${7 * iconScale}px`, backgroundColor: '#ffffff', borderRadius: `${0.3 * iconScale}px` }} />
                              </div>
                              <svg viewBox="0 0 24 24" style={{ 
                                width: `${statusIconSize}px`, 
                                height: `${statusIconSize}px`, 
                                fill: '#ffffff', 
                                marginRight: `${1 * iconScale}px`,
                                transform: statusIconSize < 8 ? `scale(${statusIconSize / 8})` : 'none',
                                transformOrigin: 'center center'
                              }}>
                                <path d="M12,21L15.6,16.2C14.6,15.45 13.35,15 12,15C10.65,15 9.4,15.45 8.4,16.2L12,21M12,2C5.97,2 1,6.97 1,13C1,16.03 2.22,18.77 4.22,20.78L12,11L19.78,20.78C21.78,18.77 23,16.03 23,13C23,6.97 18.03,2 12,2Z" />
                              </svg>
                              <div style={{ 
                                width: `${18 * iconScale}px`, 
                                height: `${8.5 * iconScale}px`, 
                                border: `${1 * iconScale}px solid rgba(255,255,255,0.4)`, 
                                borderRadius: `${2 * iconScale}px`, 
                                position: 'relative', 
                                padding: `${1 * iconScale}px`,
                                transformOrigin: 'right center'
                              }}>
                                <div style={{ width: '85%', height: '100%', backgroundColor: '#ffffff', borderRadius: `${0.5 * iconScale}px` }} />
                                <div style={{ width: `${1.5 * iconScale}px`, height: `${3.5 * iconScale}px`, backgroundColor: 'rgba(255,255,255,0.4)', position: 'absolute', right: `${-2.8 * iconScale}px`, top: '50%', transform: 'translateY(-50%)', borderTopRightRadius: `${0.8 * iconScale}px`, borderBottomRightRadius: `${0.8 * iconScale}px` }} />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div style={{
                      ...styles.notch,
                      width: phoneModel === 'iphone' ? '64px' : styles.notch.width,
                      height: phoneModel === 'iphone' ? '18px' : styles.notch.height,
                      top: phoneModel === 'iphone' ? '10px' : styles.notch.top,
                    }} />

                    {/* 锁屏内容 */}
                    <div style={styles.lockContent}>
                      <div style={{ 
                        ...styles.lockDate, 
                        fontSize: `${lockDateFontSize}px`, 
                        marginBottom: '1px', 
                        letterSpacing: '0.1px',
                        display: 'inline-block',
                        transform: lockDateFontSize < 10 ? `scale(${lockDateFontSize / 10})` : 'none',
                        transformOrigin: 'center center'
                      }}>{lockDate}</div>
                      <div style={{ 
                        ...styles.lockTime, 
                        fontSize: `${lockTimeFontSize}px`, 
                        letterSpacing: '-1px',
                        display: 'inline-block',
                        transform: lockTimeFontSize < 20 ? `scale(${lockTimeFontSize / 20})` : 'none',
                        transformOrigin: 'center center'
                      }}>{lockTime}</div>
                      
                      <div style={styles.lockWidget}>
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '140px', gap: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                              <div style={{ width: '10px', height: '5px', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '1px', position: 'relative' }}>
                                <div style={{ position: 'absolute', inset: '0.5px', backgroundColor: '#fff' }} />
                              </div>
                              <span style={{ fontSize: '8px', fontWeight: 'bold' }}>100%</span>
                            </div>
                            <div style={{ 
                              fontSize: `${footerFontSize}px`, 
                              fontWeight: '500', 
                              opacity: 0.9,
                              display: 'inline-block',
                              transform: footerFontSize < 10 ? `scale(${footerFontSize / 10})` : 'none',
                              transformOrigin: 'left center',
                              whiteSpace: 'pre-wrap'
                            }}>{footerText}</div>
                          </div>
                          <div style={{ 
                            fontSize: `${brandFontSize}px`, 
                            fontStyle: 'italic', 
                            fontFamily: 'serif', 
                            opacity: 0.9,
                            display: 'inline-block',
                            transform: brandFontSize < 10 ? `scale(${brandFontSize / 10})` : 'none',
                            transformOrigin: 'right center'
                          }}>{brandText}</div>
                        </div>
                        <div style={{ width: '60px', height: '2px', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: '1px', marginTop: '6px', alignSelf: 'flex-start', marginLeft: '24px' }} />
                      </div>
                    </div>

                    {/* 底部按钮 */}
                    <div style={{
                      ...styles.bottomActions,
                      bottom: '36px',
                    }}>
                      <div style={{
                        ...styles.actionCircle,
                        width: `${36 * (bottomIconSize / 16)}px`,
                        height: `${36 * (bottomIconSize / 16)}px`,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(15px)',
                        border: '0.5px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius: '50%',
                      }}>
                        <svg viewBox="0 0 24 24" style={{ width: `${bottomIconSize}px`, height: `${bottomIconSize}px`, fill: '#ffffff' }}>
                          <path d="M12 2C10.9 2 10 2.9 10 4V12.18C8.84 12.59 8 13.7 8 15C8 16.66 9.34 18 11 18V22H13V18C14.66 18 16 16.66 16 15C16 13.7 15.16 12.59 14 12.18V4C14 2.9 13.1 2 12 2M11 15C11 14.45 11.45 14 12 14S13 14.45 13 15 12.55 16 12 16 11 15.55 11 15Z" />
                        </svg>
                      </div>
                      <div style={{
                        ...styles.actionCircle,
                        width: `${36 * (bottomIconSize / 16)}px`,
                        height: `${36 * (bottomIconSize / 16)}px`,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(15px)',
                        border: '0.5px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius: '50%',
                      }}>
                        <svg viewBox="0 0 24 24" style={{ width: `${bottomIconSize}px`, height: `${bottomIconSize}px`, fill: '#ffffff' }}>
                          <path d="M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z" />
                        </svg>
                      </div>
                    </div>

                    {/* 底部指示条 */}
                    {(phoneModel === 'iphone' || phoneModel === 'android' || phoneModel === 'foldable') && (
                      <div style={styles.indicator} />
                    )}
                  </>
                )}
                
                {/* 笔记本底座 */}
                {phoneModel === 'laptop' && (
                  <div style={styles.laptopBase} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 生成按钮 */}
      <Button
        onClick={handleGenerate}
        disabled={generating || wallpapers.filter(u => u).length === 0}
        className="w-full h-9 rounded-lg bg-primary text-white font-bold text-xs hover:brightness-110 gap-1.5"
      >
        {generating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            生成中...
          </>
        ) : (
          <>
            <Smartphone className="w-3.5 h-3.5" />
            生成模型合成图 (全部壁纸)
          </>
        )}
      </Button>

      {/* 已生成预览 */}
      {(phoneGeneratedUrl || (block.images && block.images.length > 0)) && (
        <div className="space-y-2 mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <Label className="text-[11px] font-bold uppercase text-slate-600">已生成图片 ({block.images?.length || 1})</Label>
            </div>
            <Button 
              size="sm" 
              variant="default" 
              className="h-7 text-[10px] bg-orange-500 hover:bg-orange-600 text-white px-3 rounded-full shadow-sm flex items-center gap-1 transition-all active:scale-95"
              onClick={() => onSyncGeneratedToBigMulti(block.id)}
            >
              <Zap className="w-3 h-3 fill-current" /> 一键插入大多图
            </Button>
          </div>
          <div className="flex gap-2 overflow-x-auto p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-inner min-h-[100px]">
            {block.images && block.images.length > 0 ? (
              block.images.map((img, i) => (
                <div key={i} className="relative group shrink-0">
                  <AutoCorsImg src={img.url} alt={`合成图 ${i}`} className="h-24 w-auto rounded-lg border-2 border-white shadow-md transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/5 rounded-lg pointer-events-none" />
                </div>
              ))
            ) : (
              <div className="relative group shrink-0">
                <AutoCorsImg src={phoneGeneratedUrl} alt="合成图" className="h-24 w-auto rounded-lg border-2 border-white shadow-md transition-transform group-hover:scale-105" />
              </div>
            )}
          </div>
          <p className="text-[9px] text-slate-400 text-center italic">提示：点击上方按钮可将上述合成图一键导入微信大多图组件</p>
        </div>
      )}
    </div>
  );
}
