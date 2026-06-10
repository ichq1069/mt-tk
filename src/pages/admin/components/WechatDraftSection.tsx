import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { 
  Popover, PopoverContent, PopoverTrigger 
} from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from '@/components/ui/command';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, Plus, Trash2, FileText, Send, RefreshCw, Image as ImageIcon,
  Copy, Edit, Eye, CheckCircle, Clock, Zap, Type, LayoutGrid, Scroll, Layers,
  Search, Settings, Hash, Settings2, ChevronsUpDown, Check, History as HistoryIcon,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { cn } from '@/lib/utils';
import { DraftContentBuilder, Block, BlockType } from './DraftContentBuilder';
import { WallpaperDraftBuilder } from './WallpaperDraftBuilder';

const isValidUrl = (url?: string) => {
  if (!url) return false;
  const trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
};

const truncate = (str: string, max: number) => {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) : str;
};


const generateHtmlFromBlocks = (blocks: Block[], bigMultiConfig?: any) => {
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

  blocks.forEach((block) => {
    const marginBottom = '15px';
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
    
    const getImgSrc = (b: Block) => b.url;
    const getMultiImgSrc = (img: { url: string; wechatUrl?: string }) => img.wechatUrl || img.url;

    switch (block.type) {
      case 'text':
        html += `<p style="${blockStyle}">${block.content || ''}</p>`;
        break;
      case 'image':
        if (block.images && block.images.length > 0) {
          block.images.forEach(img => {
            html += `<img referrerPolicy="no-referrer" src="${getMultiImgSrc(img)}" style="${getImageStyle(block)} margin-bottom: ${marginBottom};">`;
          });
        } else if (block.url) {
          html += `<img referrerPolicy="no-referrer" src="${getImgSrc(block)}" style="${getImageStyle(block)} margin-bottom: ${marginBottom};">`;
        }
        break;
      case 'concatenated':
        if (block.images && block.images.length > 0) {
          html += `<div style="font-size: 0; line-height: 0; margin: 0 0 ${marginBottom} 0; text-align: center;">`;
          block.images.forEach(img => {
            html += `<img referrerPolicy="no-referrer" src="${getMultiImgSrc(img)}" style="${getImageStyle(block)} margin: 0 auto; padding: 0;">`;
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
                ${block.images.map(img => `
                  <img referrerPolicy="no-referrer" src="${getMultiImgSrc(img)}" style="display: inline-block; width: ${width}vw; margin-right: 10px; border-radius: 8px;">
                `).join('')}
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
            html += `<img referrerPolicy="no-referrer" src="${getMultiImgSrc(img)}" style="${style}">`;
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
              html += `<img referrerPolicy="no-referrer" src="${getMultiImgSrc(img)}" style="${getImageStyle(block)} line-height: 1.6; font-size: medium;">`;
            } else {
              html += `<div style="display: none !important; width: 0; height: 0; overflow: hidden; visibility: hidden;"><img referrerPolicy="no-referrer" src="${getMultiImgSrc(img)}" width="1" height="1" style="display: none !important;"></div>`;
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
        html += `<div style="margin: 0 0 ${marginBottom} 0;">${block.content || ''}</div>`;
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
            html += `<img referrerPolicy="no-referrer" src="${getMultiImgSrc(img)}" style="${pwStyle} margin-bottom: ${marginBottom};">`;
          });
        } else if (pwUrl) {
          html += `<img referrerPolicy="no-referrer" src="${pwUrl}" style="${pwStyle} margin-bottom: ${marginBottom};">`;
        }
        break;
    }
  });
  return html;
};

// UUID regex helper
const isUUID = (str: any) => {
  if (typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

export function WechatDraftSection() {
  const { logAction } = useAdminLogger('wechat_draft');
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [wechatDrafts, setWechatDrafts] = useState<any[]>([]);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 基础状态从 URL 参数获取，实现单向数据流
  const activeTab = searchParams.get('tab') || 'templates';
  const usedMediaTrackingId = searchParams.get('trackingId') || '';

  // 统一更新 URL 参数的函数
  const updateTabAndTrackingId = (tab: string, trackingId?: string | null) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', tab);
      
      if (trackingId !== undefined) {
        if (trackingId) {
          newParams.set('trackingId', trackingId);
        } else {
          newParams.delete('trackingId');
        }
      }
      return newParams;
    }, { replace: true });

    // 如果切换了搜索 ID，重置页码以避免 PGRST103 错误
    if (trackingId !== undefined) {
      setUsedMediaPage(0);
    }
  };

  // 兼容现有的 setActiveTab 和 setUsedMediaTrackingId
  const setActiveTab = (tab: string) => updateTabAndTrackingId(tab);
  const setUsedMediaTrackingId = (id: string | null | undefined) => {
    updateTabAndTrackingId(activeTab, id);
    setUsedMediaPage(0); // 更改搜索 ID 时重置页码
  };
  
  // 草稿媒体库相关状态
  const [draftMediaItems, setDraftMediaItems] = useState<any[]>([]);
  const [draftMediaPage, setDraftMediaPage] = useState(0);
  const [draftMediaTotal, setDraftMediaTotal] = useState(0);
  const [draftMediaSearch, setDraftMediaSearch] = useState('');
  const [draftMediaCategory, setDraftMediaCategory] = useState<string>('all');
  const [draftMediaTag, setDraftMediaTag] = useState<string>('all');
  const [draftMediaLimit, setDraftMediaLimit] = useState(20);
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [excludedTags, setExcludedTags] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [mediaLibraryLoading, setMediaLibraryLoading] = useState(false);
  
  // 批量选择相关
  const [selectedDraftMediaIds, setSelectedDraftMediaIds] = useState<string[]>([]);
  const [selectedBulkComponentId, setSelectedBulkComponentId] = useState<string>('big_multi');
  const [customBulkTitle, setCustomBulkTitle] = useState<string>('');
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  
  const standardComponents = [
    { id: 'big_multi', name: '大多图组件', type: 'big_multi' },
    { id: 'grid', name: '宫格图组件', type: 'grid' },
    { id: 'sliding', name: '滑动图组件', type: 'sliding' },
    { id: 'concatenated', name: '连体图组件', type: 'concatenated' },
    { id: 'image', name: '单图组件', type: 'image' },
  ];
  
  // 已入稿库相关状态
  const [usedMediaItems, setUsedMediaItems] = useState<any[]>([]);
  const [usedMediaPage, setUsedMediaPage] = useState(0);
  const [usedMediaTotal, setUsedMediaTotal] = useState(0);
  const [usedMediaLoading, setUsedMediaLoading] = useState(false);
  const [selectedUsedMediaIds, setSelectedUsedMediaIds] = useState<string[]>([]);
  
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isCreateDraftDialogOpen, setIsCreateDraftDialogOpen] = useState(false);
  const [isMediaSelectorOpen, setIsMediaSelectorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [randomCount, setRandomCount] = useState(5);
  const [selectedMedia, setSelectedMedia] = useState<{ id: string, url: string }[]>([]);
  const [draftIdKey, setDraftIdKey] = useState(0); // 用于刷新编辑器
  
  // 批量创建进度
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, active: false, message: '' });

  // 滑动选择相关
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectAction, setSelectAction] = useState<'add' | 'remove'>('add');
  
  // Searchable Select States
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  // 状态同步进度
  const [syncStatusProgress, setSyncStatusProgress] = useState({ current: 0, total: 0, active: false });

  // 缓存机制：使用 useRef 存储已加载的数据，避免重复请求
  const mediaLibraryCache = useRef<Map<string, { data: any[], total: number }>>(new Map());
  const usedMediaLibraryCache = useRef<Map<string, { data: any[], total: number }>>(new Map());

  const clearMediaCaches = () => {
    mediaLibraryCache.current.clear();
    usedMediaLibraryCache.current.clear();
  };

  // 辅助函数：生成跟踪 ID
  const generateTrackingId = () => {
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                   now.getDate().toString().padStart(2, '0');
    const randomStr = Math.floor(Math.random() * 90 + 10).toString();
    return dateStr + randomStr;
  };

  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    title: '',
    author: '',
    digest: '',
    content: '',
    content_source_url: '',
    thumb_media_id: '',
    thumb_url: '',
    need_open_comment: true,
    only_fans_can_comment: false,
    tracking_id: "",
    category: 'other',
    is_active: true
  });

  const [draftForm, setDraftForm] = useState({
    id: '', // 数据库 ID
    media_id: '', // 微信 Media ID
    template_id: '',
    title: '',
    author: '',
    digest: '',
    content: '',
    content_source_url: '',
    thumb_media_id: '',
    need_open_comment: true,
    only_fans_can_comment: false,
    tracking_id: "",
  });

  const [mediaSearch, setMediaSearch] = useState('');
  const [siteUrl, setSiteUrl] = useState('');

  useEffect(() => {
    const fetchSiteUrl = async () => {
      try {
        // 尝试从系统配置获取站点URL，兼容多种API名称
        let siteUrl = '';
        if (typeof api.getSystemConfig === 'function') {
          const { data } = await api.getSystemConfig('site_settings');
          siteUrl = data?.site_url || '';
        } else if (typeof api.getStorageConfigs === 'function') {
          const { data } = await api.getStorageConfigs();
          siteUrl = data?.[0]?.site_url || '';
        }
        setSiteUrl(siteUrl);
      } catch (e) {
        console.warn('获取站点URL失败，使用默认值:', e);
        setSiteUrl('');
      }
    };
    fetchSiteUrl();
  }, []);

  const pathPresets = [
    { name: '首页', path: '/' },
    { name: '每日图集', path: '/daily-gallery' },
    { name: '相册', path: '/albums' },
    { name: '签到', path: '/signin' },
    { name: '个人中心', path: '/profile' },
  ];

  const applyPathToTemplate = (path: string) => {
    const fullUrl = siteUrl ? (siteUrl.endsWith('/') ? siteUrl + path.substring(1) : siteUrl + path) : path;
    setTemplateForm({ ...templateForm, content_source_url: fullUrl });
  };

  const applyPathToDraft = (path: string) => {
    const fullUrl = siteUrl ? (siteUrl.endsWith('/') ? siteUrl + path.substring(1) : siteUrl + path) : path;
    setDraftForm({ ...draftForm, content_source_url: fullUrl });
  };

  const extractImageIds = (content?: string): string[] => {
    if (!content) return [];
    
    const ids: string[] = [];
    try {
      const trimmed = content.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const blocks: any[] = JSON.parse(content);
        
        // 递归提取所有包含 id 或 mediaId 且符合 UUID 格式的字段
        const traverse = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          
          if (Array.isArray(obj)) {
            obj.forEach(traverse);
          } else {
            if (obj.id && isUUID(obj.id)) ids.push(obj.id);
            if (obj.mediaId && isUUID(obj.mediaId)) ids.push(obj.mediaId);
            
            Object.values(obj).forEach(traverse);
          }
        };
        
        traverse(blocks);
        return Array.from(new Set(ids));
      }
    } catch (e) {
      console.error('Failed to parse draft content as JSON, falling back to HTML extraction:', e);
    }
    
    // 如果是 HTML 内容，尝试从 img 标签的 src 中提取媒体 ID（如 URL 包含 id 参数）
    try {
      const idMatches = content.match(/[?&]id=([^&"\s]+)/g);
      if (idMatches) {
        idMatches.forEach(m => {
          const id = m.split('=')[1];
          if (id && isUUID(id)) ids.push(id);
        });
      }
    } catch (e) {
      // ignore
    }
    return Array.from(new Set(ids));
  };

  const extractAllImageUrls = (blocks: Block[]): string[] => {
    const urls: string[] = [];
    for (const block of blocks) {
      if (block.type === 'image') {
        if (block.localUrl) urls.push(block.localUrl);
        else if (block.url) urls.push(block.url);
      } else if (block.images && block.images.length > 0) {
        block.images.forEach(img => {
          if (img.url) urls.push(img.url);
        });
      }
    }
    return [...new Set(urls)].filter(Boolean); // 去重并过滤空值
  };

  const extractFirstImageUrl = (blocks: Block[]): string | null => {
    const urls = extractAllImageUrls(blocks);
    return urls.length > 0 ? urls[0] : null;
  };


  const [mediaPage, setMediaPage] = useState(0);
  useEffect(() => {
    fetchMediaLibrary();
  }, [draftMediaPage, draftMediaSearch, draftMediaCategory, draftMediaTag, draftMediaLimit, excludedCategories, excludedTags]);

  useEffect(() => {
    fetchUsedMediaLibrary();
  }, [usedMediaPage, usedMediaTrackingId]);

  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isWallpaperDraftOpen, setIsWallpaperDraftOpen] = useState(false);

  const handleExcludeMedia = async (ids: string | string[]) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (idList.length === 0) return;
    
    try {
      const { error } = await api.updateMediaWechatDraftStatus(idList, 'excluded');
      if (error) throw error;
      toast.success('已移出媒体库');
      clearMediaCaches();
      fetchMediaLibrary();
      setSelectedDraftMediaIds([]);
    } catch (err: any) {
      toast.error('移出失败: ' + err.message);
    }
  };

  const HelpDialog = () => (
    <Dialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            微信草稿系统操作指南
          </DialogTitle>
          <DialogDescription>
            了解如何高效使用草稿管理系统，避免操作冲突。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg bg-slate-50">
              <h4 className="font-bold text-sm mb-1 flex items-center gap-1">
                <LayoutGrid className="w-4 h-4 text-blue-500" />
                草稿媒体库
              </h4>
              <p className="text-xs text-muted-foreground">
                展示所有已审核通过的图片。你可以选择图片进行“批量创建”或点击“快速创建”。
                <br /><strong className="text-primary text-[10px]">状态：可用 (Available)</strong>
              </p>
            </div>
            <div className="p-3 border rounded-lg bg-slate-50">
              <h4 className="font-bold text-sm mb-1 flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                已入稿库
              </h4>
              <p className="text-xs text-muted-foreground">
                记录已经被用于草稿或已被采用的图片。为了避免重复，已入稿图片默认不在媒体库显示。
                <br /><strong className="text-primary text-[10px]">状态：已入稿 (Used) / 已采用 (Adopted)</strong>
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-bold text-sm">核心规则与流程</h4>
            <ul className="text-xs space-y-2 list-disc pl-4 text-muted-foreground">
              <li>
                <span className="text-foreground font-medium">单次使用原则：</span>
                每张图片在微信草稿中只能使用一次。一旦图片进入“已入稿库”，它将从“草稿媒体库”中消失，防止多篇草稿重复使用同一素材。
              </li>
              <li>
                <span className="text-foreground font-medium">快速创建：</span>
                使用默认模板一键生成草稿。建议先在“模板库”中设置好默认作者和原文链接前缀。
              </li>
              <li>
                <span className="text-foreground font-medium">移出名单：</span>
                如果发现某些图片不适合用于草稿，可以点击图片下方的“移出”按钮。这些图片将被标记为“已排除”，不再出现在采集范围内。
              </li>
              <li>
                <span className="text-foreground font-medium">采用状态：</span>
                在微信后台发布后，建议回到本系统将对应的草稿标记为“已采用”，以便后续追踪和数据统计。
              </li>
            </ul>
          </div>
          
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <p className="text-[11px] leading-relaxed italic">
              提示：如果你想重新使用某张已入稿的图片，可以在“已入稿库”中将其“移回媒体库”，图片状态将变回“可用”。
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setIsHelpDialogOpen(false)}>我明白了</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const fetchUsedMediaLibrary = async () => {
    const cleanTrackingId = usedMediaTrackingId?.replace(/^#\s*/, '').trim();
    const cacheKey = JSON.stringify({
      page: usedMediaPage,
      trackingId: cleanTrackingId
    });

    if (usedMediaLibraryCache.current.has(cacheKey) && !usedMediaLoading) {
      const cached = usedMediaLibraryCache.current.get(cacheKey)!;
      setUsedMediaItems(cached.data);
      setUsedMediaTotal(cached.total);
      return;
    }

    setUsedMediaLoading(true);
    try {
      const { data, total, error } = await api.getWechatDraftMediaLibrary({
        page: usedMediaPage,
        limit: 20,
        onlyUsed: true,
        trackingId: cleanTrackingId || undefined
      });
      if (error) throw error;
      
      const results = data || [];
      const totalCount = total || 0;
      
      setUsedMediaItems(results);
      setUsedMediaTotal(totalCount);
      
      usedMediaLibraryCache.current.set(cacheKey, { data: results, total: totalCount });
    } catch (err: any) {
      toast.error('加载已入稿库失败: ' + err.message);
    } finally {
      setUsedMediaLoading(false);
    }
  };

  const handleRemoveFromUsed = async (ids: string | string[]) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (idList.length === 0) return;
    
    try {
      const { error } = await api.updateMediaWechatDraftStatus(idList, 'available');
      if (error) throw error;
      toast.success('已移出入稿库');
      clearMediaCaches();
      fetchUsedMediaLibrary();
      fetchMediaLibrary();
      setSelectedUsedMediaIds([]);
    } catch (err: any) {
      toast.error('移出失败: ' + err.message);
    }
  };

  const handleAddRandomImages = async () => {
    if (draftMediaItems.length === 0) {
      toast.info('媒体库中暂无可用的图片');
      return;
    }
    
    // 获取当前库中所有可用的图片列表（用于随机选择，不受当前分页限制）
    try {
      setIsBulkActionLoading(true);
      const { data, error } = await api.getWechatDraftMediaLibrary({
        page: 0,
        limit: 200, // 获取更多以应用复杂的筛选逻辑
        search: draftMediaSearch,
        excludedCategories,
        excludedTags,
        includeUsed: true // 获取包含符合 15 天规则的已使用图片
      });
      
      if (error) throw error;
      
      const availableItems = data || [];
      if (availableItems.length === 0) {
        toast.info('媒体库中暂无可用的图片');
        return;
      }
      
      // 过滤掉已经选中的
      const unselected = availableItems.filter((item: any) => !selectedDraftMediaIds.includes(item.id));
      if (unselected.length === 0) {
        toast.info('符合条件的图片已全部选中');
        return;
      }
      
      // 按照用户需求排序：
      // 1. 优先使用时间靠前的 (created_at ASC)
      // 2. 尽量使用未使用的 (available > used/adopted)
      const sorted = [...unselected].sort((a, b) => {
        // 首先判断是否未使用
        const aUnused = a.wechat_draft_status === 'available' ? 0 : 1;
        const bUnused = b.wechat_draft_status === 'available' ? 0 : 1;
        
        if (aUnused !== bUnused) {
          return aUnused - bUnused; // 未使用的排前面
        }
        
        // 如果状态相同，按照创建时间升序排列（越早越优先）
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return aTime - bTime;
      });

      const toAdd = sorted.slice(0, Math.min(randomCount, sorted.length));
      
      const newIds = toAdd.map((i: any) => i.id);
      setSelectedDraftMediaIds(prev => [...prev, ...newIds]);
      toast.success(`已随机选中 ${toAdd.length} 张图片`);
    } catch (err: any) {
      toast.error('随机添加失败: ' + err.message);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const fetchMediaLibrary = async () => {
    const cacheKey = JSON.stringify({
      page: draftMediaPage,
      limit: draftMediaLimit,
      search: draftMediaSearch,
      categoryId: draftMediaCategory,
      tag: draftMediaTag,
      excludedCategories,
      excludedTags
    });

    // 如果已有缓存且不是手动刷新，则直接使用缓存
    if (mediaLibraryCache.current.has(cacheKey) && !mediaLibraryLoading) {
      const cached = mediaLibraryCache.current.get(cacheKey)!;
      setDraftMediaItems(cached.data);
      setDraftMediaTotal(cached.total);
      return;
    }

    setMediaLibraryLoading(true);
    try {
      const { data, total, error } = await api.getWechatDraftMediaLibrary({
        page: draftMediaPage,
        limit: draftMediaLimit,
        search: draftMediaSearch,
        categoryId: draftMediaCategory === 'all' ? undefined : draftMediaCategory,
        tag: draftMediaTag === 'all' ? undefined : draftMediaTag,
        excludedCategories,
        excludedTags,
        includeUsed: false // 严格分离：草稿库只显示可用素材，不再根据 15 天规则混合显示已入稿素材
      });
      if (error) throw error;
      
      const results = data || [];
      const totalCount = total || 0;
      
      setDraftMediaItems(results);
      setDraftMediaTotal(totalCount);
      
      // 存入缓存
      mediaLibraryCache.current.set(cacheKey, { data: results, total: totalCount });
    } catch (error: any) {
      toast.error(`获取草稿媒体库失败: ${error.message}`);
    } finally {
      setMediaLibraryLoading(false);
    }
  };
  const handleBackfillUsedMedia = async () => {
    if (selectedDraftMediaIds.length === 0) return;
    
    const confirmed = await confirmAsync(`确定将选中的 ${selectedDraftMediaIds.length} 张图片补录到已入稿库吗？\n\n补录后图片将标记为“已采用”，不再出现在素材库中。`, {
      title: '补录已入稿库'
    });
    if (!confirmed) return;

    try {
      setIsBulkActionLoading(true);
      // 补录时，如果没有指定 trackingId，我们可以自动生成一个补录标识
      const backfillId = `BACKFILL-${new Date().getTime().toString().slice(-6)}`;
      const { error } = await api.updateMediaWechatDraftStatus(selectedDraftMediaIds, 'adopted', backfillId);
      if (error) throw error;
      
      toast.success('补录成功');
      setSelectedDraftMediaIds([]);
      clearMediaCaches();
      fetchMediaLibrary();
      fetchUsedMediaLibrary();
    } catch (err: any) {
      toast.error('补录失败: ' + err.message);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleDeepHistoricalBacktrace = async () => {
    if (!selectedConfigId) return;
    
    const confirmed = await confirmAsync('确定开始深度历史数据回溯吗？\n\n系统将扫描本地所有草稿记录，并确保其中引用的所有图片都被标记为“已采用”。这有助于修复由于异常导致的状态不一致。', {
      title: '历史数据回溯'
    });
    if (!confirmed) return;

    setSyncStatusProgress({ current: 0, total: 0, active: true });
    try {
      // 1. 获取所有本地草稿
      const { data: drafts, error: dbError } = await api.supabase
        .from('wechat_drafts')
        .select('id, image_ids, tracking_id, is_adopted')
        .eq('config_id', selectedConfigId);
      
      if (dbError) throw dbError;
      if (!drafts || drafts.length === 0) {
        toast.info('未找到任何本地草稿记录');
        return;
      }

      setSyncStatusProgress(prev => ({ ...prev, total: drafts.length }));
      let updatedCount = 0;

      for (let i = 0; i < drafts.length; i++) {
        const draft = drafts[i];
        setSyncStatusProgress(prev => ({ ...prev, current: i + 1 }));
        
        if (draft.image_ids && draft.image_ids.length > 0) {
          // 确保状态为已采用
          await api.updateMediaWechatDraftStatus(draft.image_ids, 'adopted', draft.tracking_id);
          updatedCount += draft.image_ids.length;
        }
      }

      toast.success(`回溯完成：共校准了 ${updatedCount} 张素材的状态`);
      fetchMediaLibrary();
      fetchUsedMediaLibrary();
    } catch (err: any) {
      toast.error('回溯失败: ' + err.message);
    } finally {
      setSyncStatusProgress({ current: 0, total: 0, active: false });
    }
  };


  const handleSyncAllDraftStatus = async () => {
    if (!selectedConfigId) return;
    
    setSyncStatusProgress({ current: 0, total: 0, active: true });
    try {
      // 1. 获取本地记录的草稿
      const { data: localDrafts, error: dbError } = await api.supabase
        .from('wechat_drafts')
        .select('*')
        .eq('config_id', selectedConfigId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (dbError) throw dbError;
      if (!localDrafts || localDrafts.length === 0) {
        toast.info('本地暂无草稿记录');
        return;
      }

      setSyncStatusProgress(prev => ({ ...prev, total: localDrafts.length }));

      // 2. 获取微信端数据
      const [draftRes, publishedRes] = await Promise.all([
        api.getWechatDraftList(selectedConfigId, 0, 50),
        api.getWechatPublishedList(selectedConfigId, 0, 50)
      ]);

      const wechatDrafts = draftRes.data?.data?.item || [];
      const wechatPublished = publishedRes.data?.data?.item || [];
      
      const wechatMediaIds = wechatDrafts.map((i: any) => i.media_id);
      
      // 提取已发布文章中的图文内容信息（用于匹配）
      // 微信发布列表结构：item -> content -> news_item
      const publishedTitles = wechatPublished.flatMap((item: any) => 
        (item.content?.news_item || []).map((article: any) => article.title)
      );
      
      let syncUpdatedCount = 0;

      for (let i = 0; i < localDrafts.length; i++) {
        const draft = localDrafts[i];
        setSyncStatusProgress(prev => ({ ...prev, current: i + 1 }));
        
        // 检查是否还在微信草稿箱
        const existsInDrafts = wechatMediaIds.includes(draft.media_id);
        
        // 检查是否已经在发布列表中（通过标题模糊匹配，作为补充手段）
        const existsInPublished = publishedTitles.some((title: string) => title === draft.title);
        
        // 更新同步状态
        if (!existsInDrafts && !existsInPublished && !draft.is_adopted) {
          // 如果在微信端找不到了，标记为 missing，但不自动释放图片以保持增量记录
          if (draft.sync_status !== 'missing') {
            await api.updateWechatDraftDb(draft.id, { sync_status: 'missing' });
            syncUpdatedCount++;
          }
        } else if ((existsInDrafts || existsInPublished || draft.is_adopted) && draft.sync_status === 'missing') {
          // 如果又找回了（或被标为采用），恢复为 normal
          await api.updateWechatDraftDb(draft.id, { sync_status: 'normal' });
          syncUpdatedCount++;
        }

        // 自动标为已采用
        if (existsInPublished && !draft.is_adopted) {
          await api.adoptWechatDraft(draft.id, true, draft.image_ids || [], draft.tracking_id);
        }
      }

      await Promise.all([
        fetchDrafts(true),
        fetchWechatDrafts(true),
        fetchMediaLibrary(),
        fetchUsedMediaLibrary()
      ]);

      if (syncUpdatedCount > 0) {
        toast.success(`同步完成：更新了 ${syncUpdatedCount} 篇草稿的状态`);
      } else {
        toast.success('同步完成：所有草稿状态正常');
      }
    } catch (err: any) {
      toast.error('同步失败: ' + err.message);
    } finally {
      setSyncStatusProgress({ current: 0, total: 0, active: false });
    }
  };

  const fetchCategoriesAndTags = async () => {
    try {
      const [{ data: cats }, { data: tags }] = await Promise.all([
        api.getCategories(),
        api.getTags()
      ]);
      setAllCategories(cats || []);
      setAllTags(tags || []);
    } catch (error: any) {
      console.error('Fetch categories/tags error:', error);
    }
  };

  const [wechatDraftSystemConfig, setWechatDraftSystemConfig] = useState<any>({});
  
  const fetchWechatDraftConfig = async () => {
    try {
      const { data } = await api.getSystemConfig('wechat_draft_config');
      if (data?.value) {
        setWechatDraftSystemConfig(data.value);
        setExcludedCategories(data.value.excluded_categories || []);
        setExcludedTags(data.value.excluded_tags || []);
      }
    } catch (error) {
      console.error('Fetch wechat draft config error:', error);
    }
  };

  const saveWechatDraftConfig = async () => {
    try {
      setLoading(true);
      const config = { ...wechatDraftSystemConfig };
      
      // 自动尝试解析 URL 到 UUID
      if (config.big_multi?.enabled) {
        const urlsToResolve = [];
        if (config.big_multi.first_image) urlsToResolve.push(config.big_multi.first_image);
        if (config.big_multi.last_image) urlsToResolve.push(config.big_multi.last_image);
        if (config.big_multi.nth_image?.url) urlsToResolve.push(config.big_multi.nth_image.url);

        if (urlsToResolve.length > 0) {
          const { data } = await api.supabase
            .from('media_items')
            .select('id, url')
            .in('url', urlsToResolve);
          
          if (data && data.length > 0) {
            data.forEach((m: any) => {
              if (m.url === config.big_multi.first_image) config.big_multi.first_image_id = m.id;
              if (m.url === config.big_multi.last_image) config.big_multi.last_image_id = m.id;
              if (m.url === config.big_multi.nth_image?.url) {
                config.big_multi.nth_image = { ...config.big_multi.nth_image, id: m.id };
              }
            });
          }
        }
      }

      const newConfig = {
        ...config,
        excluded_categories: excludedCategories,
        excluded_tags: excludedTags
      };
      await api.updateSystemConfig('wechat_draft_config', newConfig);
      setWechatDraftSystemConfig(newConfig);
      toast.success('配置已保存并自动更新图片关联');
      setIsConfigDialogOpen(false);
      fetchMediaLibrary();
    } catch (error: any) {
      toast.error(`保存配置失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const [mediaTotal, setMediaTotal] = useState(0);
  const [draftBlocks, setDraftBlocks] = useState<Block[]>([]);
  const draftBlocksRef = useRef<Block[]>([]);
  useEffect(() => {
    draftBlocksRef.current = draftBlocks;
  }, [draftBlocks]);
  const mediaLimit = 20;

  // 1. 全局数据初始化：仅在挂载时执行
  useEffect(() => {
    fetchData();
    fetchWechatDraftConfig();
    fetchCategoriesAndTags();
  }, []);

  // 2. 标签页数据加载：根据当前激活的标签页和配置 ID 自动加载数据
  useEffect(() => {
    if (!selectedConfigId) return;

    if (activeTab === 'drafts') {
      fetchDrafts();
      fetchWechatDrafts();
    } else if (activeTab === 'adopted_library') {
      fetchDrafts();
    } else if (activeTab === 'media_library') {
      fetchMediaLibrary();
    } else if (activeTab === 'used_media') {
      fetchUsedMediaLibrary();
    }
  }, [activeTab, selectedConfigId, usedMediaPage, usedMediaTrackingId, draftMediaPage, draftMediaSearch, draftMediaCategory, draftMediaTag]);

  useEffect(() => {
    if (isMediaSelectorOpen) {
      fetchMediaItems();
    }
  }, [isMediaSelectorOpen, mediaPage, mediaSearch]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configsRes, templatesRes] = await Promise.all([
        api.getWechatConfigs(),
        api.getWechatDraftTemplates()
      ]);

      if (configsRes.error) throw configsRes.error;
      if (templatesRes.error) throw templatesRes.error;

      setConfigs(configsRes.data || []);
      setTemplates(templatesRes.data || []);

      if (configsRes.data && configsRes.data.length > 0 && !selectedConfigId) {
        setSelectedConfigId(configsRes.data[0].id);
      }
    } catch (error: any) {
      toast.error(`加载失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrafts = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data, error } = await api.getWechatDrafts(selectedConfigId);
      if (error) throw error;
      setDrafts(data || []);
    } catch (error: any) {
      toast.error(`获取草稿记录失败: ${error.message}`);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchWechatDrafts = async (silent = false) => {
    if (!selectedConfigId) return;
    
    try {
      if (!silent) setLoading(true);
      // 获取全部微信草稿（微信限制单次最多 20 条，多次获取合并）
      let allItems: any[] = [];
      let offset = 0;
      const count = 20;
      let hasMore = true;
      
      while (hasMore && offset < 200) {
        const { data, error } = await api.getWechatDraftList(selectedConfigId, offset, count);
        if (error) throw error;
        
        const items = data?.data?.item || [];
        allItems = [...allItems, ...items];
        
        const totalCount = data?.data?.total_count || 0;
        hasMore = items.length >= count && allItems.length < totalCount;
        offset += count;
      }
      
      setWechatDrafts(allItems);
    } catch (error: any) {
      toast.error(`获取微信草稿列表失败: ${error.message}`);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchMediaItems = async () => {
    try {
      const { data, total, error } = await api.getMediaLibrary(
        mediaPage,
        mediaLimit,
        mediaSearch,
        'approved',
        'image'
      );
      if (error) throw error;
      setMediaItems(data || []);
      setMediaTotal(total || 0);
    } catch (error: any) {
      toast.error(`获取素材失败: ${error.message}`);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      setLoading(true);
      
      const submitData = {
        ...templateForm,
        content: (templateForm as any).blocks_json || templateForm.content
      };
      delete (submitData as any).blocks_json;

      if (editingTemplate) {
        const { error } = await api.updateWechatDraftTemplate(editingTemplate.id, submitData);
        if (error) throw error;
        toast.success('模板已更新');
        logAction('update_template', { template_id: editingTemplate.id });
      } else {
        const { error } = await api.createWechatDraftTemplate(submitData);
        if (error) throw error;
        toast.success('模板已创建');
        logAction('create_template', { name: templateForm.name });
      }
      
      setIsTemplateDialogOpen(false);
      setEditingTemplate(null);
      resetTemplateForm();
      fetchData();
    } catch (error: any) {
      toast.error(`保存失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const confirmed = await confirmAsync('确定删除此模板？', { variant: 'destructive' });
    if (!confirmed) return;
    
    try {
      const { error } = await api.deleteWechatDraftTemplate(id);
      if (error) throw error;
      toast.success('模板已删除');
      logAction('delete_template', { template_id: id });
      fetchData();
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  const formatWechatTitle = (title: string) => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const prefix = `【特控荷尔蒙${mm}${dd}】`;
    if (title.includes('【特控荷尔蒙')) {
      // 如果已经有前缀了，替换它为今日的（如果是跨天编辑）
      return title.replace(/【特控荷尔蒙\d{4}】/, prefix);
    }
    return `${prefix}${title}`;
  };
  const handleOpenBulkEdit = async () => {
    if (selectedDraftMediaIds.length === 0) {
      toast.error('请先选择图片');
      return;
    }
    if (!selectedConfigId) {
      toast.error('请选择公众号');
      return;
    }

    try {
      setIsBulkActionLoading(true);
      resetDraftForm();
      
      const selectedItems = draftMediaItems.filter(m => selectedDraftMediaIds.includes(m.id));
      const component = standardComponents.find(c => c.id === selectedBulkComponentId) || standardComponents[0];
      
      const strategy = wechatDraftSystemConfig?.big_multi;
      const applyStrategy = (imgs: any[]) => {
        let result = [...imgs];
        if (strategy?.enabled) {
          if (strategy.last_image) {
            result.push({ url: strategy.last_image, wechatUrl: strategy.last_image, id: 'fixed-last-' + Date.now() });
          }
          if (strategy.nth_image?.url && strategy.nth_image?.n) {
            const n = strategy.nth_image.n - 1;
            if (n >= 0 && n <= result.length) {
              result.splice(n, 0, { url: strategy.nth_image.url, wechatUrl: strategy.nth_image.url, id: 'fixed-nth-' + Date.now() });
            }
          }
          if (strategy.first_image) {
            result.unshift({ url: strategy.first_image, wechatUrl: strategy.first_image, id: 'fixed-first-' + Date.now() });
          }
        }
        return result;
      };

      const baseTitle = customBulkTitle || selectedItems[0]?.title || '欣赏';
      setDraftForm(prev => ({
        ...prev,
        title: formatWechatTitle(baseTitle),
        author: '特控Boy',
        digest: wechatDraftSystemConfig?.default_digest || '',
      }));

      const blocks: Block[] = [
        {
          id: Math.random().toString(36).substr(2, 9),
          type: component.type as BlockType,
          images: applyStrategy(selectedItems.map(m => ({ id: m.id, url: m.url, wechatUrl: m.url }))),
          style: { textAlign: 'center' }
        }
      ];
      
      setDraftBlocks(blocks);
      setDraftIdKey(prev => prev + 1);
      setIsCreateDraftDialogOpen(true);
    } catch (err: any) {
      toast.error('操作失败: ' + err.message);
    } finally {
      setIsBulkActionLoading(false);
    }
  };


  const handleBulkCreateDraft = async () => {
    if (!selectedConfigId) {
      toast.error('请先选择公众号配置');
      return;
    }

    if (selectedDraftMediaIds.length === 0) {
      toast.error('请先选择图片');
      return;
    }

    if (!selectedBulkComponentId) {
      toast.error('请先选择草稿组件');
      return;
    }

      setBulkProgress({ current: 0, total: selectedDraftMediaIds.length, active: true, message: '正在准备上传图片素材...' });
      
      try {
        const trackingId = generateTrackingId();
        
        // 修复跨页选择问题：确保获取所有选中的媒体项目
        let selectedMediaItems = [];
        const itemsInCurrentPage = draftMediaItems.filter(item => 
          selectedDraftMediaIds.includes(item.id)
        );
        
        if (itemsInCurrentPage.length === selectedDraftMediaIds.length) {
          selectedMediaItems = itemsInCurrentPage;
        } else {
          // 如果当前页面不足，从数据库获取完整信息
          setBulkProgress(prev => ({ ...prev, message: '正在从数据库获取选中项目详情...' }));
          const { data, error } = await api.supabase
            .from('media_items')
            .select('*')
            .in('id', selectedDraftMediaIds);
          
          if (error) throw error;
          selectedMediaItems = data || [];
          
          // 保持选择顺序
          selectedMediaItems.sort((a: any, b: any) => 
            selectedDraftMediaIds.indexOf(a.id) - selectedDraftMediaIds.indexOf(b.id)
          );
        }

        const component = standardComponents.find(c => c.id === selectedBulkComponentId) || standardComponents[0];
        const articles = [];
        let firstArticleBlocks: Block[] = [];
        
        const uploadedImages = [];
        for (let i = 0; i < selectedMediaItems.length; i++) {
          const item = selectedMediaItems[i];
          setBulkProgress(prev => ({ 
            ...prev, 
            current: i + 1,
            message: `正在处理图片素材: ${item.title || i + 1} (${i + 1}/${selectedMediaItems.length})`
          }));

        // 1. 上传图片获取 media_id (用于封面)
        const uploadRes = await api.uploadImageToWechat(selectedConfigId, item.url);
        if (uploadRes.error) throw uploadRes.error;
        
        const thumbMediaId = uploadRes.data?.data?.media_id;
        if (!thumbMediaId) throw new Error(`上传图片失败: ${item.title}`);

        // 2. 上传图片获取 URL (用于正文内容)
        const contentImgRes = await api.uploadContentImageToWechat(selectedConfigId, item.url);
        const wechatImageUrl = contentImgRes.data?.data?.url || item.url;

        // 保存微信素材记录
        await api.saveWechatMaterial({
          config_id: selectedConfigId,
          media_id: thumbMediaId,
          media_type: 'image',
          url: uploadRes.data.data.url,
          local_media_id: item.id
        });

        uploadedImages.push({
          id: item.id,
          url: item.url,
          wechatUrl: wechatImageUrl,
          thumbMediaId,
          title: item.title
        });
      }

      // 根据库策略添加首图/尾图/第N图
      const strategy = wechatDraftSystemConfig?.big_multi;
      const applyStrategy = (imgs: any[]) => {
        let result = [...imgs];
        if (strategy?.enabled) {
          if (strategy.last_image) {
            // 检查是否已经存在相同 URL 的图片，避免重复
            if (!result.some(img => img.url === strategy.last_image)) {
              result.push({ url: strategy.last_image, wechatUrl: strategy.last_image, id: 'fixed-last-' + Date.now() });
            }
          }
          if (strategy.nth_image?.url && strategy.nth_image?.n) {
            const n = strategy.nth_image.n - 1;
            if (n >= 0 && n <= result.length) {
              if (!result.some(img => img.url === strategy.nth_image.url)) {
                result.splice(n, 0, { url: strategy.nth_image.url, wechatUrl: strategy.nth_image.url, id: 'fixed-nth-' + Date.now() });
              }
            }
          }
          if (strategy.first_image) {
            if (!result.some(img => img.url === strategy.first_image)) {
              result.unshift({ url: strategy.first_image, wechatUrl: strategy.first_image, id: 'fixed-first-' + Date.now() });
            }
          }
        }
        return result;
      };

      // 如果有选中多张图片，则合并到一篇文章中
      if (uploadedImages.length > 1 || component.id === 'big_multi') {
        const blocks: Block[] = [
          {
            id: Math.random().toString(36).substr(2, 9),
            type: component.type as BlockType,
            images: applyStrategy(uploadedImages.map(img => ({
              id: img.id,
              url: img.url,
              wechatUrl: img.wechatUrl
            }))),
            style: { textAlign: 'center' }
          }
        ];
        
        firstArticleBlocks = blocks;
        const finalContent = generateHtmlFromBlocks(blocks, wechatDraftSystemConfig?.big_multi);
        const baseTitle = customBulkTitle || uploadedImages[0].title || '欣赏';
        
        articles.push({
          title: truncate(formatWechatTitle(baseTitle), 64),
          author: '特控Boy',
          digest: truncate(wechatDraftSystemConfig?.default_digest || '', 120),
          content: finalContent,
          thumb_media_id: uploadedImages[0].thumbMediaId,
          need_open_comment: 1,
          only_fans_can_comment: 0
        });
      } else {
        const img = uploadedImages[0];
        const blocks: Block[] = [
          {
            id: Math.random().toString(36).substr(2, 9),
            type: component.type as BlockType,
            images: applyStrategy([{ id: img.id, url: img.url, wechatUrl: img.wechatUrl }]),
            url: img.wechatUrl,
            localUrl: img.url,
            mediaId: img.id,
            style: { textAlign: 'center' }
          }
        ];
        
        firstArticleBlocks = blocks;
        const finalContent = generateHtmlFromBlocks(blocks, wechatDraftSystemConfig?.big_multi);
        const baseTitle = customBulkTitle || img.title || '欣赏';

        articles.push({
          title: truncate(formatWechatTitle(baseTitle), 64),
          author: '特控Boy',
          digest: truncate(wechatDraftSystemConfig?.default_digest || '', 120),
          content: finalContent,
          thumb_media_id: img.thumbMediaId,
          need_open_comment: 1,
          only_fans_can_comment: 0
        });
      }

      // 3. 同步草稿到微信公众号
      setBulkProgress(prev => ({ ...prev, message: '正在同步草稿到微信公众号...' }));
      const draftRes = await api.addWechatDraft(selectedConfigId, articles);
      
      if (draftRes.error) {
        console.error('Wechat bulk draft creation error:', draftRes.error);
        throw draftRes.error;
      }

      const resData = draftRes.data?.data;
      if (resData && resData.media_id) {
        setBulkProgress(prev => ({ ...prev, message: '同步完成，正在保存记录...' }));
        // 4. 保存草稿记录到数据库
        const finalImageIds = uploadedImages.map(img => img.id).filter(id => isUUID(id));
        await api.createWechatDraft({
          config_id: selectedConfigId,
          media_id: resData.media_id,
          title: articles[0].title,
          author: '特控Boy',
          digest: articles[0].digest,
          content: JSON.stringify(firstArticleBlocks),
          thumb_url: uploadedImages[0].url || '',
          thumb_media_id: articles[0].thumb_media_id,
          image_ids: finalImageIds,
          tracking_id: trackingId
        });

        // 5. 更新图片状态并保存跟踪 ID
        if (finalImageIds.length > 0) {
          await api.updateMediaWechatDraftStatus(finalImageIds, 'used', trackingId);
        }

        toast.success(`批量草稿创建成功，跟踪ID: ${trackingId}`);
        logAction('bulk_create_draft', { count: uploadedImages.length, tracking_id: trackingId });
        
        setSelectedDraftMediaIds([]);
        setCustomBulkTitle('');
        clearMediaCaches();
        fetchDrafts();
        fetchWechatDrafts();
        fetchMediaLibrary();
        fetchUsedMediaLibrary();
        setActiveTab('drafts');
      } else {
        const errMsg = draftRes.data?.message || (typeof draftRes.data === 'string' ? draftRes.data : JSON.stringify(draftRes.data));
        throw new Error(`批量创建失败: ${errMsg || '未返回 media_id'}`);
      }
    } catch (error: any) {
      console.error('Bulk create draft error:', error);
      toast.error(`批量创建失败: ${error.message}`);
    } finally {
      setIsBulkActionLoading(false);
      setBulkProgress({ current: 0, total: 0, active: false, message: '' });
    }
  };

  const handleCreateDraft = async () => {
    if (!selectedConfigId) {
      toast.error('请先选择公众号配置');
      return;
    }

    if (!draftForm.title || !draftForm.content) {
      toast.error('请填写标题和正文内容');
      return;
    }

    const isEditing = !!draftForm.id;
    let oldImageIds: string[] = [];
    let thumbMediaId = draftForm.thumb_media_id;
    const isNewCoverSelected = selectedMedia.length > 0 && selectedMedia[0]?.id !== 'existing-cover';
    let trackingId = draftForm.tracking_id;
    const oldMediaId = draftForm.media_id;

    try {
      setLoading(true);
      toast.info(isEditing ? '正在更新草稿到微信...' : '正在创建并同步草稿到微信...');

      if (isEditing) {
        const { data: existingDraft } = await api.supabase
          .from('wechat_drafts')
          .select('image_ids')
          .eq('id', draftForm.id)
          .single();
        if (existingDraft?.image_ids) {
          oldImageIds = existingDraft.image_ids;
        }
      }

      // 1. 尝试获取或上传封面图
      if (!thumbMediaId || isNewCoverSelected) {
        let candidateCoverImages: { url: string, id?: string }[] = [];
        if (selectedMedia.length > 0 && isNewCoverSelected) {
          candidateCoverImages = selectedMedia.map(m => ({ url: m.url, id: m.id }));
        }
        
        const contentUrls = extractAllImageUrls(draftBlocksRef.current);
        contentUrls.forEach(url => {
          if (!candidateCoverImages.some(c => c.url === url)) {
            candidateCoverImages.push({ url });
          }
        });

        if (candidateCoverImages.length > 0) {
          let success = false;
          for (let i = 0; i < candidateCoverImages.length; i++) {
            const candidate = candidateCoverImages[i];
            if (!candidate.url) continue;

            try {
              if (candidateCoverImages.length > 1) {
                toast.info(`正在尝试上传封面素材 (${i + 1}/${candidateCoverImages.length})...`);
              }
              const uploadRes = await api.uploadImageToWechat(selectedConfigId, candidate.url);
              
              if (!uploadRes.error && uploadRes.data?.data?.media_id) {
                thumbMediaId = uploadRes.data.data.media_id;
                await api.saveWechatMaterial({
                  config_id: selectedConfigId,
                  media_id: thumbMediaId,
                  media_type: 'image',
                  url: uploadRes.data.data.url,
                  local_media_id: candidate.id
                });
                success = true;
                break;
              }
            } catch (e) {}
          }
          if (!success && !thumbMediaId) {
            toast.warning('封面素材上传均失败，将仅保存到本地，无法同步到微信');
          }
        }
      }

      // 2. 准备同步到微信
      const finalAuthor = draftForm.author?.trim() || '特控Boy';
      const formattedTitle = truncate(formatWechatTitle(draftForm.title), 64);
      let newMediaId: string | null = null;
      const currentBlocks = draftBlocksRef.current;
      const saveContent = currentBlocks.length > 0 ? JSON.stringify(currentBlocks) : draftForm.content;

      if (thumbMediaId) {
        const articles = [{
          title: formattedTitle,
          author: truncate(finalAuthor, 64),
          digest: truncate(draftForm.digest || '', 120),
          content: draftForm.content,
          content_source_url: isValidUrl(draftForm.content_source_url) ? draftForm.content_source_url : undefined,
          thumb_media_id: thumbMediaId,
          need_open_comment: draftForm.need_open_comment ? 1 : 0,
          only_fans_can_comment: draftForm.only_fans_can_comment ? 1 : 0
        }];

        try {
          const draftRes = await api.addWechatDraft(selectedConfigId, articles);
          if (!draftRes.error) {
            const wechatData = draftRes.data?.data || draftRes.data;
            if (wechatData && wechatData.media_id) {
              newMediaId = wechatData.media_id;
              if (isEditing && oldMediaId) {
                try {
                  await api.deleteWechatDraftFromWechat(selectedConfigId, oldMediaId);
                } catch (e) {}
              }
            }
          }
        } catch (e) {
          console.error('Wechat sync failed:', e);
          toast.error('同步到微信失败，将仅更新本地草稿');
        }
      }

      // 3. 提取所有使用的图片 ID
      const imageIds = extractImageIds(saveContent);
      if (wechatDraftSystemConfig?.big_multi?.enabled) {
        const config = wechatDraftSystemConfig.big_multi;
        const urlsToResolve = [config.first_image, config.last_image, config.nth_image?.url].filter(Boolean);
        if (urlsToResolve.length > 0) {
          const { data: resolvedMedia } = await api.supabase.from('media_items').select('id').in('url', urlsToResolve);
          if (resolvedMedia) resolvedMedia.forEach((m: any) => {
            if (m.id && !imageIds.includes(m.id)) imageIds.push(m.id);
          });
        }
      }
      if (selectedMedia.length > 0) {
        selectedMedia.forEach(m => {
          if (m.id && isUUID(m.id) && !imageIds.includes(m.id)) imageIds.push(m.id);
        });
      }
      const finalImageIds = imageIds.filter(id => isUUID(id));
      if (!trackingId) trackingId = generateTrackingId();

      // 4. 保存到数据库
      if (isEditing) {
        const { error: updateDbError } = await api.updateWechatDraftDb(draftForm.id, {
          title: draftForm.title,
          author: finalAuthor,
          digest: draftForm.digest,
          content: saveContent,
          content_source_url: isValidUrl(draftForm.content_source_url) ? draftForm.content_source_url : undefined,
          thumb_media_id: thumbMediaId,
          media_id: newMediaId || oldMediaId,
          image_ids: finalImageIds,
          tracking_id: trackingId
        });
        if (updateDbError) throw new Error(`更新本地草稿失败: ${updateDbError.message}`);
        
        if (newMediaId) toast.success('草稿已成功同步到微信');
        else toast.warning('本地草稿已更新，但同步到微信失败');
        logAction('update_draft', { title: draftForm.title, media_id: newMediaId });
      } else {
        const { error: createDbError } = await api.createWechatDraft({
          config_id: selectedConfigId,
          media_id: newMediaId,
          title: formattedTitle,
          author: finalAuthor,
          digest: truncate(draftForm.digest || '', 120),
          content: saveContent,
          content_source_url: isValidUrl(draftForm.content_source_url) ? draftForm.content_source_url : undefined,
          thumb_media_id: thumbMediaId,
          image_ids: finalImageIds,
          tracking_id: trackingId
        });
        if (createDbError) throw new Error(`创建本地草稿记录失败: ${createDbError.message}`);
        
        if (newMediaId) toast.success('草稿已成功创建到微信');
        else toast.warning('本地草稿记录已创建，但同步到微信失败');
        logAction('create_draft', { title: draftForm.title });
      }

      // 5. 更新图片状态
      if (finalImageIds.length > 0) {
        await api.updateMediaWechatDraftStatus(finalImageIds, 'used', trackingId);
      }
      if (isEditing && oldImageIds.length > 0) {
        const removedImageIds = oldImageIds.filter(id => !finalImageIds.includes(id));
        if (removedImageIds.length > 0) {
          await api.updateMediaWechatDraftStatus(removedImageIds, 'available');
        }
      }

      setIsCreateDraftDialogOpen(false);
      resetDraftForm();
      clearMediaCaches();
      await fetchDrafts();
      await fetchWechatDrafts();
      await fetchMediaLibrary();
      setActiveTab('drafts');
    } catch (error: any) {
      console.error('Draft operation error:', error);
      toast.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async (id: string, mediaId: string) => {
    const confirmed = await confirmAsync('确定删除此草稿？', { variant: 'destructive' });
    if (!confirmed) return;
    
    try {
      // 找到这个草稿关联的所有图片 ID
      const draft = drafts.find(d => d.id === id);
      const imageIds = draft?.image_ids || [];

      // 1. 从微信删除（失败不阻断，继续清理本地数据）
      let wechatDeleted = false;
      try {
        const { error: wechatError } = await api.deleteWechatDraftFromWechat(selectedConfigId, mediaId);
        if (!wechatError) wechatDeleted = true;
      } catch (e: any) {
        console.warn('[Delete Draft] 微信端删除失败（可能草稿已不存在）:', e.message);
      }

      // 2. 从数据库删除
      const { error: dbError } = await api.deleteWechatDraft(id);
      if (dbError) throw dbError;

      // 3. 释放图片回归草稿媒体库
      if (imageIds.length > 0) {
        await api.updateMediaWechatDraftStatus(imageIds, 'available');
      }

      toast.success(wechatDeleted ? '草稿已删除' : '本地记录已删除（微信端草稿可能已不存在）');
      logAction('delete_draft', { draft_id: id, wechat_deleted: wechatDeleted });
      clearMediaCaches();
      fetchDrafts();
      fetchWechatDrafts();
      fetchMediaLibrary();
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  const handleAdoptDraft = async (draft: any, isAdopted: boolean) => {
    try {
      setLoading(true);
      
      const mediaIds: string[] = [];
      if (draft.image_ids && draft.image_ids.length > 0) {
        mediaIds.push(...draft.image_ids);
      } else {
        // 兼容旧记录
        const ids = extractImageIds(draft.content);
        if (ids.length > 0) mediaIds.push(...ids);
      }

      // 补充：检查内容中是否有大多图配置的自动插入图片
      if (wechatDraftSystemConfig?.big_multi?.enabled) {
        const config = wechatDraftSystemConfig.big_multi;
        const urlsToResolve = [config.first_image, config.last_image, config.nth_image?.url].filter(Boolean);
        if (urlsToResolve.length > 0) {
          const { data: resolvedMedia } = await api.supabase.from('media_items').select('id').in('url', urlsToResolve);
          if (resolvedMedia) {
            resolvedMedia.forEach((m: any) => {
              if (m.id && !mediaIds.includes(m.id)) mediaIds.push(m.id);
            });
          }
        }
      }
      
      const { error } = await api.adoptWechatDraft(draft.id, isAdopted, mediaIds);
      if (error) throw error;
      
      // 同步更新发布状态
      await api.updateWechatDraftDb(draft.id, { 
        is_published: isAdopted, 
        published_at: isAdopted ? new Date().toISOString() : null 
      });
      
      toast.success(isAdopted ? '草稿已标记为采用' : '已撤回采用状态');
      logAction(isAdopted ? 'adopt_draft' : 'unadopt_draft', { title: draft.title });
      fetchDrafts();
      fetchMediaLibrary();
      fetchUsedMediaLibrary();
    } catch (error: any) {
      toast.error(`操作失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = (template: any) => {
    setDraftIdKey(prev => prev + 1);
    setDraftForm({
      id: '',
      media_id: '',
      template_id: template.id,
      title: template.title,
      author: template.author || '',
      digest: template.digest || '',
      content: template.content,
      content_source_url: template.content_source_url || '',
      thumb_media_id: template.thumb_media_id || '',
      need_open_comment: template.need_open_comment ?? true,
      only_fans_can_comment: template.only_fans_can_comment || false,
      tracking_id: ''
    });
    
    // 尝试解析正文内容为区块（如果存储的是 JSON）
    try {
      if (template.content && (template.content.trim().startsWith('[') || template.content.trim().startsWith('{'))) {
        setDraftBlocks(JSON.parse(template.content));
      } else if (template.content && (template.content.trim().startsWith('<') || template.content.trim().includes('</'))) {
        setDraftBlocks([{ 
          id: Math.random().toString(36).substr(2, 9), 
          type: 'raw_html', 
          content: template.content,
          editingRaw: false
        }]);
      } else {
        setDraftBlocks([{ id: 'init', type: 'text', content: template.content }]);
      }
    } catch {
      setDraftBlocks([{ id: 'init', type: 'text', content: template.content }]);
    }
    
    setIsCreateDraftDialogOpen(true);
  };

  const handleEditHistoryDraft = (draft: any) => {
    setDraftIdKey(prev => prev + 1);
    setDraftForm({
      id: draft.id,
      media_id: draft.media_id,
      template_id: draft.template_id || '',
      title: draft.title,
      author: draft.author || '',
      digest: draft.digest || '',
      content: draft.content,
      content_source_url: draft.content_source_url || '',
      thumb_media_id: draft.thumb_media_id || '',
      thumb_url: draft.thumb_url || '', // 确保编辑时加载封面预览
      need_open_comment: draft.need_open_comment ?? true,
      only_fans_can_comment: draft.only_fans_can_comment || false,
      tracking_id: draft.tracking_id || ''
    } as any);
    
    // 如果有封面图，设置到选中的媒体中以便预览
    if (draft.thumb_url) {
      setSelectedMedia([{
        id: 'existing-cover', // 标记为现有封面
        url: draft.thumb_url,
        thumbnail_url: draft.thumb_url
      } as any]);
    } else {
      setSelectedMedia([]);
    }
    try {
      let parsedBlocks: any = null;
      if (draft.content && (draft.content.trim().startsWith('[') || draft.content.trim().startsWith('{'))) {
        try {
          parsedBlocks = JSON.parse(draft.content);
        } catch (e) {
          console.error('[Draft] Failed to parse content as JSON:', e);
        }
      }

      if (parsedBlocks && Array.isArray(parsedBlocks)) {
        console.log('[Edit Draft] Restored blocks count:', parsedBlocks.length, 'content starts with:', (draft.content || '').substring(0, 100));
        const bigMultiBlocks = parsedBlocks.filter((b: any) => b.type === 'big_multi');
        if (bigMultiBlocks.length > 0) {
          console.log('[Edit Draft] big_multi blocks:', bigMultiBlocks.map((b: any) => ({ id: b.id, imageWidth: b.imageWidth, imageHeight: b.imageHeight })));
        }
        setDraftBlocks(parsedBlocks);
      } else if (draft.content && (draft.content.trim().startsWith('<') || draft.content.trim().includes('</') || draft.content.trim().startsWith('<section'))) {
        console.log('[Edit Draft] Content recognized as HTML, creating raw_html block');
        setDraftBlocks([{ 
          id: Math.random().toString(36).substr(2, 9), 
          type: 'raw_html', 
          content: draft.content,
          editingRaw: false
        }]);
      } else {
        console.log('[Edit Draft] Content not recognized, creating text block. Content starts with:', (draft.content || '').substring(0, 100));
        setDraftBlocks([{ id: 'init', type: 'text', content: draft.content || '' }]);
      }
    } catch (e) {
      console.error('[Draft] Restoration error:', e);
      setDraftBlocks([{ id: 'init', type: 'text', content: draft.content || '' }]);
    }

    setIsCreateDraftDialogOpen(true);
  };

  // 将微信端草稿同步到本地数据库，使其可编辑
  const handleSyncWechatDraftToLocal = async (draft: any) => {
    try {
      setLoading(true);
      const article = draft.content?.news_item?.[0];
      if (!article) {
        toast.error('无法获取草稿内容');
        return;
      }

      // 生成跟踪ID
      const trackingId = generateTrackingId();

      // 预处理：将微信 HTML 的 data-src 替换为 src，确保在非微信环境能正常显示图片
      let processedContent = article.content || '';
      if (processedContent.includes('data-src')) {
        processedContent = processedContent
          .replace(/<img([^>]*)data-src="([^"]+)"([^>]*)>/g, '<img$1src="$2"$3>')
          .replace(/<img([^>]*)src=""([^>]*)>/g, '<img$1src="$2"$3>');
      }

      // 创建本地记录
      const { data: newDraft, error: createError } = await api.createWechatDraft({
        config_id: selectedConfigId,
        media_id: draft.media_id,
        title: article.title,
        author: article.author || '特控Boy',
        digest: article.digest || '',
        content: processedContent,
        content_source_url: article.content_source_url || '',
        thumb_url: article.thumb_url || '',
        thumb_media_id: article.thumb_media_id || '',
        tracking_id: trackingId
      });

      if (createError) throw createError;

      toast.success('草稿已同步到本地，现在可以编辑');
      logAction('sync_wechat_draft_to_local', { media_id: draft.media_id, tracking_id: trackingId });

      // 刷新列表
      await Promise.all([fetchDrafts(), fetchWechatDrafts()]);

      // 自动打开编辑器
      if (newDraft && newDraft.id) {
        handleEditHistoryDraft(newDraft);
      } else {
        const { data: newDrafts } = await api.getWechatDrafts(selectedConfigId);
        const newDbDraft = newDrafts?.find((d: any) => d.media_id === draft.media_id);
        if (newDbDraft) {
          handleEditHistoryDraft(newDbDraft);
        }
      }
    } catch (error: any) {
      toast.error(`同步失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      title: '',
      author: '',
      digest: '',
      content: '',
      content_source_url: '',
      thumb_media_id: '',
      thumb_url: '',
      need_open_comment: true,
      only_fans_can_comment: false,
      tracking_id: "",
      category: 'other',
      is_active: true
    });
  };

  const resetDraftForm = () => {
    setDraftIdKey(prev => prev + 1);
    setDraftBlocks([]);
    setDraftForm({
      id: '',
      media_id: '',
      template_id: '',
      title: '',
      author: '',
      digest: wechatDraftSystemConfig?.default_digest || '',
      content: '',
      content_source_url: '',
      thumb_media_id: '',
      need_open_comment: true,
      only_fans_can_comment: false,
      tracking_id: ""
    });
    setSelectedMedia([]);
  };

  if (loading && configs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HelpDialog />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">微信公众号草稿箱</h2>
          <p className="text-sm text-muted-foreground mt-1">管理草稿模板，快速创建图文消息到微信公众号</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsHelpDialogOpen(true)}>
            <Zap className="w-4 h-4 mr-2 text-primary" />
            说明
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!selectedConfigId) {
                toast.error('请先选择公众号');
                return;
              }
              setIsWallpaperDraftOpen(true);
            }}
            className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
          >
            <Smartphone className="w-4 h-4 mr-2" />
            壁纸草稿
          </Button>
          <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="选择公众号" />
            </SelectTrigger>
            <SelectContent>
              {configs.map(config => (
                <SelectItem key={config.id} value={config.id}>
                  {config.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => fetchWechatDrafts()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">草稿模板</TabsTrigger>
          <TabsTrigger value="drafts">草稿列表</TabsTrigger>
          <TabsTrigger value="adopted_library">采用库</TabsTrigger>
          <TabsTrigger value="media_library">草稿媒体库</TabsTrigger>
          <TabsTrigger value="used_media">已入稿库</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              刷新数据
            </Button>
            <Button 
              onClick={() => {
                setEditingTemplate(null);
                resetTemplateForm();
                setIsTemplateDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              新建模板
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              {loading && templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">正在加载模板...</p>
                </div>
              ) : (templates || []).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>暂无草稿模板</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(templates || []).map(template => (
                    <Card key={template.id} className="relative">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            {template.description && (
                              <CardDescription className="text-xs mt-1">
                                {template.description}
                              </CardDescription>
                            )}
                          </div>
                          <Badge variant={template.is_active ? 'default' : 'secondary'}>
                            {template.is_active ? '启用' : '禁用'}
                          </Badge>
                        </div>
                        <div className="mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {template.category === 'header' && '头部模板'}
                            {template.category === 'body' && '正文模板'}
                            {template.category === 'footer' && '尾部模板'}
                            {template.category === 'other' && '其他模板'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">标题：</span>
                          <span className="font-medium">{template.title}</span>
                        </div>
                        {template.author && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">作者：</span>
                            <span>{template.author}</span>
                          </div>
                        )}
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUseTemplate(template)}
                          >
                            <Send className="w-3 h-3 mr-1" />
                            使用
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingTemplate(template);
                              setTemplateForm(template);
                              setIsTemplateDialogOpen(true);
                            }}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            编辑
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <div className="flex justify-end">
            <Button 
              onClick={() => {
                resetDraftForm();
                setDraftBlocks([{ id: Math.random().toString(36).substr(2, 9), type: 'big_multi', images: [] }]);
                setIsCreateDraftDialogOpen(true);
              }}
              disabled={!selectedConfigId}
            >
              <Plus className="w-4 h-4 mr-2" />
              创建草稿
            </Button>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>已同步到微信的草稿列表</CardTitle>
                <CardDescription>这里是最近同步到微信后台的草稿，展示微信端的最新状态。</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={async () => {
                  setLoading(true);
                  try {
                    await Promise.all([fetchDrafts(true), fetchWechatDrafts(true)]);
                    toast.success('列表已刷新');
                  } catch (e) {
                    // 错误已在 fetch 函数中处理
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                刷新列表
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              {loading && (drafts || []).length === 0 && (wechatDrafts || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">正在同步微信数据...</p>
                </div>
              ) : (drafts || []).length === 0 && (wechatDrafts || []).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>暂无草稿</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">跟踪ID</TableHead>
                      <TableHead>标题</TableHead>
                      <TableHead>作者</TableHead>
                      <TableHead>采用状态</TableHead>
                      <TableHead>更新时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // 合并本地记录和微信端记录进行显示
                      // 以本地记录为准，因为我们要追踪采用状态
                      const displayDrafts = [...drafts].sort((a, b) => 
                        new Date(b.created_at || b.create_time || 0).getTime() - 
                        new Date(a.created_at || a.create_time || 0).getTime()
                      );

                      if (displayDrafts.length === 0 && wechatDrafts.length > 0) {
                        // 如果本地没记录但微信有，显示微信记录（可能是直接在微信后台创建的）
                        return (wechatDrafts || []).map((draft: any) => {
                          const article = draft.content?.news_item?.[0];
                          return (
                            <TableRow key={draft.media_id}>
                              <TableCell>
                                <span className="text-[10px] text-muted-foreground font-mono">-</span>
                              </TableCell>
                              <TableCell className="font-medium">{article?.title || '未命名'}</TableCell>
                              <TableCell>{article?.author || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                                  微信原件
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {draft.update_time 
                                  ? new Date(draft.update_time * 1000).toLocaleString('zh-CN')
                                  : '-'
                                }
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSyncWechatDraftToLocal(draft)}
                                  className="h-8 text-xs"
                                >
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  同步到本地
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      }

                      return (displayDrafts || []).map((dbDraft: any) => {
                        const wechatDraft = wechatDrafts.find(d => d.media_id === dbDraft.media_id);
                        const article = wechatDraft?.content?.news_item?.[0];
                        
                        return (
                          <TableRow key={dbDraft.id}>
                            <TableCell>
                              {dbDraft.tracking_id ? (
                                <Badge 
                                  variant="outline" 
                                  className="text-[10px] text-amber-600 font-bold font-mono bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 cursor-pointer hover:bg-amber-100"
                                    onClick={() => {
                                      updateTabAndTrackingId('used_media', dbDraft.tracking_id);
                                      setUsedMediaPage(0);
                                    }}
                                >
                                  {dbDraft.tracking_id}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground font-mono">-</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex flex-col gap-0.5">
                                <span className="truncate max-w-[200px]">{dbDraft.title || article?.title || '未命名'}</span>
                                {wechatDraft && (
                                  <span className="text-[10px] text-primary/60 font-mono whitespace-nowrap">
                                    MID: {truncate(dbDraft.media_id, 10)}...
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{dbDraft.author || article?.author || '-'}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {dbDraft.is_adopted ? (
                                  <Badge className="bg-green-100 text-green-700 border-green-200 w-fit">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    已采用
                                  </Badge>
                                ) : dbDraft.is_published ? (
                                  <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50 w-fit">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    已发布
                                  </Badge>
                                ) : wechatDraft ? (
                                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 w-fit">
                                    待采用
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground w-fit">
                                    未采用
                                  </Badge>
                                )}
                                
                                {wechatDraft ? (
                                  <span className="text-[10px] text-green-600 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    草稿箱 (正常)
                                  </span>
                                ) : dbDraft.sync_status === 'missing' ? (
                                  <span className="text-[10px] text-amber-600 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    微信端已删除
                                  </span>
                                ) : dbDraft.is_published ? (
                                  <span className="text-[10px] text-purple-600 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                    已群发
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                    本地记录
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-[11px] text-muted-foreground">
                                {dbDraft.created_at ? new Date(dbDraft.created_at).toLocaleString('zh-CN') : '-'}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant={dbDraft.is_adopted ? "outline" : "default"}
                                  onClick={() => handleAdoptDraft(dbDraft, !dbDraft.is_adopted)}
                                  title={dbDraft.is_adopted ? "取消采用" : "标记为采用"}
                                  className={cn(
                                    "h-8 px-3 text-[11px] font-bold rounded-lg", 
                                    !dbDraft.is_adopted && "bg-green-600 hover:bg-green-700 shadow-sm"
                                  )}
                                >
                                  {dbDraft.is_adopted ? "取消采用" : "已采用/发布"}
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditHistoryDraft(dbDraft)}
                                  title="查看详情"
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteDraft(dbDraft.id, dbDraft.media_id)}
                                  className="h-8 w-8 p-0 text-slate-300 hover:text-destructive hover:bg-destructive/5 rounded-lg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adopted_library" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                采用库
              </CardTitle>
              <CardDescription>
                这里展示所有已被采用的草稿，相关的图片已从媒体库中自动排除。
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading && (drafts || []).filter((d: any) => d.is_adopted).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">正在加载采用记录...</p>
                </div>
              ) : (drafts || []).filter((d: any) => d.is_adopted).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p>暂无采用记录</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>标题</TableHead>
                      <TableHead>跟踪 ID</TableHead>
                      <TableHead>作者</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>采用时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(drafts || []).filter(d => d.is_adopted).map((draft: any) => (
                      <TableRow key={draft.id}>
                        <TableCell className="font-medium">{draft.title}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className="font-mono cursor-pointer hover:bg-muted"
                            onClick={() => {
                              updateTabAndTrackingId('used_media', draft.tracking_id);
                              setUsedMediaPage(0);
                            }}
                          >
                            {draft.tracking_id || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>{draft.author || '-'}</TableCell>
                        <TableCell>
                          {draft.sync_status === 'missing' ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">微信端已删</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">正常</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {draft.adopted_at ? new Date(draft.adopted_at).toLocaleString('zh-CN') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdoptDraft(draft, false)}
                          >
                            撤回采用
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media_library" className="space-y-4">
          <div className="bg-muted/30 p-4 rounded-xl border border-border/40 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  1. 搜索图片
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9 rounded-xl h-10 border-border/40 bg-white"
                    placeholder="根据标题搜索可用图片..."
                    value={draftMediaSearch}
                    onChange={(e) => {
                      setDraftMediaSearch(e.target.value);
                      setDraftMediaPage(0);
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  2. 分类筛选
                </Label>
                <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={categoryPopoverOpen}
                      className="h-10 rounded-xl bg-white border-border/40 justify-between font-normal px-3"
                    >
                      <span className="truncate">
                        {draftMediaCategory === "all" 
                          ? "所有分类" 
                          : allCategories.find((cat) => cat.id === draftMediaCategory)?.name || "选择分类"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="搜索分类..." />
                      <CommandList>
                        <CommandEmpty>未找到分类</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setDraftMediaCategory("all");
                              setDraftMediaPage(0);
                              setCategoryPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                draftMediaCategory === "all" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            所有分类
                          </CommandItem>
                          {allCategories.map((cat) => (
                            <CommandItem
                              key={cat.id}
                              value={cat.id}
                              onSelect={() => {
                                setDraftMediaCategory(cat.id);
                                setDraftMediaPage(0);
                                setCategoryPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  draftMediaCategory === cat.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {cat.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  3. 标签筛选
                </Label>
                <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={tagPopoverOpen}
                      className="h-10 rounded-xl bg-white border-border/40 justify-between font-normal px-3"
                    >
                      <span className="truncate">
                        {draftMediaTag === "all" 
                          ? "所有标签" 
                          : allTags.find((tag) => tag.id === draftMediaTag)?.name || "选择标签"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="搜索标签..." />
                      <CommandList>
                        <CommandEmpty>未找到标签</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setDraftMediaTag("all");
                              setDraftMediaPage(0);
                              setTagPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                draftMediaTag === "all" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            所有标签
                          </CommandItem>
                          {allTags.map((tag) => (
                            <CommandItem
                              key={tag.id}
                              value={tag.id}
                              onSelect={() => {
                                setDraftMediaTag(tag.id);
                                setDraftMediaPage(0);
                                setTagPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  draftMediaTag === tag.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {tag.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border/20">
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 rounded-lg"
                    onClick={() => {
                      const currentPageIds = draftMediaItems.map(i => i.id);
                      const allCurrentSelected = currentPageIds.every(id => selectedDraftMediaIds.includes(id));
                      
                      if (allCurrentSelected && currentPageIds.length > 0) {
                        // 如果本页全选了，则取消本页的选择，保持其他页的选择
                        setSelectedDraftMediaIds(prev => prev.filter(id => !currentPageIds.includes(id)));
                      } else {
                        // 否则，将本页未选中的项加入选择列表
                        setSelectedDraftMediaIds(prev => {
                          const newIds = currentPageIds.filter(id => !prev.includes(id));
                          return [...prev, ...newIds];
                        });
                      }
                    }}
                  >
                    {draftMediaItems.length > 0 && draftMediaItems.every(i => selectedDraftMediaIds.includes(i.id)) ? '取消本页' : '全选本页'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 rounded-lg"
                    onClick={fetchMediaLibrary} 
                    disabled={mediaLibraryLoading}
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5 mr-2", mediaLibraryLoading && "animate-spin")} />
                    刷新
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { 
                    e.stopPropagation(); 
                    setIsConfigDialogOpen(true); 
                  }} className="h-8 px-3 text-xs bg-white border border-border/40 rounded-lg">
                    <Settings className="w-3.5 h-3.5 mr-2" />
                    库策略
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border/40">
              <div className="flex items-center gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  每页数量:
                </Label>
                <Select value={draftMediaLimit.toString()} onValueChange={(v) => { setDraftMediaLimit(parseInt(v)); setDraftMediaPage(0); }}>
                  <SelectTrigger className="h-8 w-[80px] rounded-lg bg-white border-border/40 font-normal px-2 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16">16</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="32">32</SelectItem>
                    <SelectItem value="48">48</SelectItem>
                    <SelectItem value="64">64</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                {!selectedBulkComponentId && (
                  <span className="text-[10px] text-primary animate-bounce font-medium">← 请先选择草稿组件</span>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncAllDraftStatus}
                  disabled={syncStatusProgress.active || !selectedConfigId}
                  className="h-8 text-xs"
                >
                  {syncStatusProgress.active ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      同步中 ({syncStatusProgress.current}/{syncStatusProgress.total})
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1" />
                      同步草稿状态
                    </>
                  )}
                </Button>
              </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeepHistoricalBacktrace}
                  disabled={syncStatusProgress.active || !selectedConfigId}
                  className="h-8 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                >
                  {syncStatusProgress.active ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      回溯中...
                    </>
                  ) : (
                    <>
                      <HistoryIcon className="w-3 h-3 mr-1" />
                      深度回溯
                    </>
                  )}
                </Button>

            </div>

            <div className="text-[10px] text-muted-foreground bg-amber-50 px-2 py-1 rounded border border-amber-100">
              提示：鼠标点击并拖动可滑动多选
            </div>

              {selectedDraftMediaIds.length > 0 && (
                <div className="flex items-center gap-3 bg-primary/5 px-3 py-1.5 rounded-2xl border border-primary/20 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-primary/60 uppercase">选择草稿组件</span>
                    <div className="flex items-center gap-1.5">
                      <Select value={selectedBulkComponentId} onValueChange={setSelectedBulkComponentId}>
                        <SelectTrigger className="h-8 w-[140px] text-xs bg-white border-primary/20 rounded-lg">
                          <SelectValue placeholder="请选择组件" />
                        </SelectTrigger>
                        <SelectContent>
                          {standardComponents.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedBulkComponentId === 'big_multi' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg animate-pulse"
                          onClick={() => setIsConfigDialogOpen(true)}
                          title="大多图组件配置"
                        >
                          <Settings2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="w-px h-8 bg-primary/10 mx-1" />

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-primary/60 uppercase">自定义标题</span>
                    <Input 
                      className="h-8 w-[160px] text-xs bg-white border-primary/20 rounded-lg"
                      placeholder="选填，默认用图片名"
                      value={customBulkTitle}
                      onChange={(e) => setCustomBulkTitle(e.target.value)}
                    />
                  </div>

                  <div className="w-px h-8 bg-primary/10 mx-1" />

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-primary/60 uppercase">已选择</span>
                    <span className="text-sm font-bold text-primary">{selectedDraftMediaIds.length} 项</span>
                  </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 px-3 text-xs font-bold border-primary/20 text-primary hover:bg-primary/10 rounded-xl"
                      onClick={handleBackfillUsedMedia}
                      disabled={isBulkActionLoading}
                    >
                      <Layers className="w-3.5 h-3.5 mr-1" />
                      补录入稿库
                    </Button>

                    <div className="w-px h-8 bg-primary/10 mx-1" />

                  <div className="w-px h-8 bg-primary/10 mx-1" />

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-primary/60 uppercase">随机张数</span>
                      <Input 
                        type="number"
                        min={1}
                        max={20}
                        className="h-8 w-[60px] text-xs bg-white border-primary/20 rounded-lg"
                        value={randomCount}
                        onChange={(e) => setRandomCount(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 px-3 text-xs font-bold border-primary/20 hover:bg-primary/5 rounded-xl"
                      onClick={handleAddRandomImages}
                      disabled={isBulkActionLoading}
                    >
                      <Zap className="w-3.5 h-3.5 mr-1 text-yellow-500" />
                      随机添加
                    </Button>
                  </div>

                  <div className="w-px h-8 bg-primary/10 mx-1" />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 px-3 text-xs font-bold border-primary/20 text-primary hover:bg-primary/10 rounded-xl"
                      onClick={handleBackfillUsedMedia}
                      disabled={isBulkActionLoading}
                    >
                      <Layers className="w-3.5 h-3.5 mr-1" />
                      补录入稿库
                    </Button>

                    <div className="w-px h-8 bg-primary/10 mx-1" />


                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-9 px-6 text-xs font-bold shadow-lg bg-primary hover:bg-primary/90 rounded-xl"
                    onClick={handleBulkCreateDraft}
                    disabled={isBulkActionLoading || !selectedBulkComponentId}
                  >
                    {isBulkActionLoading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    确认批量创建
                  </Button>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-3 text-xs font-bold border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl"
                    onClick={() => handleExcludeMedia(selectedDraftMediaIds)}
                    disabled={isBulkActionLoading}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    批量移除
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedDraftMediaIds([])}
                  >
                    取消
                  </Button>
                </div>
              )}
            </div>

          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-4">
              <div 
                onMouseLeave={() => setIsSelecting(false)}
                onMouseUp={() => setIsSelecting(false)}
              >
                {mediaLibraryLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">正在为您精心挑选图片...</p>
                  </div>
                ) : draftMediaItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-bold">库中暂无可用图片</p>
                      <p className="text-xs text-muted-foreground">尝试调整过滤策略或搜索关键词</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {(draftMediaItems || []).map(item => {
                    const isSelected = selectedDraftMediaIds.includes(item.id);
                    
                    const handleToggle = () => {
                      if (isSelected) {
                        setSelectedDraftMediaIds(prev => prev.filter(id => id !== item.id));
                      } else {
                        setSelectedDraftMediaIds(prev => [...prev, item.id]);
                      }
                    };

                    return (
                      <div 
                        key={item.id} 
                        className={cn(
                          "group relative aspect-[3/4] rounded-xl overflow-hidden bg-muted/40 border border-border/40 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer select-none",
                          isSelected && "ring-2 ring-primary border-primary bg-primary/5 shadow-primary/20",
                        )}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setIsSelecting(true);
                          setSelectAction(isSelected ? 'remove' : 'add');
                          handleToggle();
                        }}
                        onMouseEnter={() => {
                          if (isSelecting) {
                            if (selectAction === 'add') {
                              if (!isSelected) {
                                setSelectedDraftMediaIds(prev => [...prev, item.id]);
                              }
                            } else {
                              if (isSelected) {
                                setSelectedDraftMediaIds(prev => prev.filter(id => id !== item.id));
                              }
                            }
                          }
                        }}
                      >
                        <img referrerPolicy="no-referrer" 
                          src={item.url} 
                          alt={item.title || 'Draft Media'} 
                          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                        />
                        
                        <div className="absolute top-2 left-2 flex items-center gap-2">
                          <div className={cn(
                            "w-5 h-5 rounded-md border border-white/40 flex items-center justify-center transition-all shadow-sm",
                            isSelected ? "bg-primary border-primary" : "bg-black/20 backdrop-blur-sm"
                          )}>
                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 translate-y-2 group-hover:translate-y-0 transition-transform">
                          <div className="text-[10px] font-bold text-white truncate mb-1">{item.title || '未命名图片'}</div>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-white/70 truncate mr-2">{item.content_categories?.name || '未分类'}</span>
                              {item.tags && item.tags.length > 0 && (
                                <div className="flex gap-0.5 flex-wrap justify-end max-w-[60%]">
                                  {item.tags.slice(0, 2).map((tag: string) => (
                                    <span key={tag} className="text-[8px] px-1 py-0 bg-white/10 rounded border border-white/5 text-white/60">
                                      {tag}
                                    </span>
                                  ))}
                                  {item.tags.length > 2 && <span className="text-[8px] text-white/40">+{item.tags.length - 2}</span>}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                className="flex-1 h-7 text-[10px] font-bold rounded-lg shadow-lg hover:bg-primary hover:text-white transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (templates.length > 0) {
                                    setSelectedBulkComponentId(standardComponents[0].id);
                                    setSelectedDraftMediaIds([item.id]);
                                    handleBulkCreateDraft();
                                  } else {
                                    toast.error('请先创建草稿模板');
                                  }
                                }}
                              >
                                <Zap className="w-3 h-3 mr-0.5" />
                                快速创建
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="w-7 h-7 p-0 rounded-lg shadow-lg bg-black/40 hover:bg-red-600 border-none"
                                title="移出名单"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExcludeMedia(item.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>

              {/* 分页控制 */}
              {draftMediaTotal > 0 && (
                <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-border/20">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>共 {draftMediaTotal} 张图片</span>
                    <div className="h-3 w-px bg-border mx-1" />
                    <div className="flex items-center gap-1.5">
                      <span>每页显示</span>
                      <Select 
                        value={draftMediaLimit.toString()} 
                        onValueChange={(v) => {
                          setDraftMediaLimit(parseInt(v));
                          setDraftMediaPage(0);
                        }}
                      >
                        <SelectTrigger className="h-7 w-16 text-[11px] rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg"
                      onClick={() => setDraftMediaPage(prev => Math.max(0, prev - 1))}
                      disabled={draftMediaPage === 0}
                    >
                      <RefreshCw className="w-3.5 h-3.5 rotate-180" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      <Input 
                        className="h-8 w-12 text-center text-xs rounded-lg"
                        value={draftMediaPage + 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) {
                            const maxPage = Math.ceil(draftMediaTotal / draftMediaLimit) - 1;
                            setDraftMediaPage(Math.max(0, Math.min(maxPage, val - 1)));
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground">
                        / {Math.ceil(draftMediaTotal / draftMediaLimit)} 页
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg"
                      onClick={() => setDraftMediaPage(prev => prev + 1)}
                      disabled={(draftMediaPage + 1) * draftMediaLimit >= draftMediaTotal}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="used_media" className="space-y-4">
          <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border border-border/40">
            <div className="flex gap-4 items-center flex-1">
              <div className="text-sm font-bold flex items-center gap-2 shrink-0">
                <CheckCircle className="w-4 h-4 text-primary" />
                已入稿库
              </div>
              <div className="flex items-center gap-2 max-w-sm w-full">
                <div className="relative w-full">
                  <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input 
                    className="h-9 pl-8 text-xs bg-white rounded-xl border-border/40" 
                    placeholder="根据 采用ID/跟踪ID 筛选图片..." 
                    value={usedMediaTrackingId}
                    onChange={(e) => {
                      setUsedMediaTrackingId(e.target.value);
                      setUsedMediaPage(0);
                    }}
                  />
                  {usedMediaTrackingId && (
                    <button 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setUsedMediaTrackingId('');
                        setUsedMediaPage(0);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 rotate-45" />
                    </button>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-9 rounded-xl shrink-0" onClick={() => fetchUsedMediaLibrary()}>
                  筛选
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              {selectedUsedMediaIds.length > 0 && (
                <div className="flex items-center gap-2 mr-4 bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">
                  <span className="text-xs font-bold text-primary">已选择 {selectedUsedMediaIds.length} 项</span>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="h-7 px-3 text-xs shadow-sm"
                    onClick={() => handleRemoveFromUsed(selectedUsedMediaIds)}
                  >
                    批量移出稿库
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    onClick={() => setSelectedUsedMediaIds([])}
                  >
                    取消
                  </Button>
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const allIds = usedMediaItems.map(i => i.id);
                  if (selectedUsedMediaIds.length === allIds.length && allIds.length > 0) {
                    setSelectedUsedMediaIds([]);
                  } else {
                    setSelectedUsedMediaIds(allIds);
                  }
                }}
              >
                {selectedUsedMediaIds.length > 0 ? '反选/取消' : '全选本页'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => fetchUsedMediaLibrary()} disabled={usedMediaLoading}>
                <RefreshCw className={cn("w-4 h-4 mr-2", usedMediaLoading && "animate-spin")} />
                刷新
              </Button>
            </div>
          </div>

          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-4">
              {usedMediaLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">正在加载已入稿库...</p>
                </div>
              ) : usedMediaItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-bold">入稿库为空</p>
                    <p className="text-xs text-muted-foreground">创建草稿后的图片将自动进入此库</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {(usedMediaItems || []).map(item => {
                    const isSelected = selectedUsedMediaIds.includes(item.id);
                    
                    return (
                      <div 
                        key={item.id} 
                        className={cn(
                          "group relative aspect-[3/4] rounded-xl overflow-hidden bg-muted/40 border border-border/40 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer",
                          isSelected && "ring-2 ring-primary border-primary bg-primary/5 shadow-primary/20",
                        )}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedUsedMediaIds(prev => prev.filter(id => id !== item.id));
                          } else {
                            setSelectedUsedMediaIds(prev => [...prev, item.id]);
                          }
                        }}
                      >
                        <img referrerPolicy="no-referrer" 
                          src={item.url} 
                          alt={item.title || 'Used Media'} 
                          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                        />
                        
                        <div className="absolute top-2 left-2 flex items-center gap-2">
                          <div className={cn(
                            "w-5 h-5 rounded-md border border-white/40 flex items-center justify-center transition-all shadow-sm",
                            isSelected ? "bg-primary border-primary" : "bg-black/20 backdrop-blur-sm"
                          )}>
                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          {item.wechat_draft_tracking_id && (
                            <Badge variant="secondary" className="bg-black/40 text-white border-none text-[8px] px-1.5 py-0 h-4 backdrop-blur-sm">
                              ID: {item.wechat_draft_tracking_id}
                            </Badge>
                          )}
                          {item.wechat_draft_status === 'adopted' && (
                            <Badge className="bg-green-600 text-white border-none text-[8px] px-1.5 py-0 h-4 backdrop-blur-sm">
                              已采用
                            </Badge>
                          )}
                          {item.wechat_draft_status === 'used' && (
                            <Badge className="bg-blue-600 text-white border-none text-[8px] px-1.5 py-0 h-4 backdrop-blur-sm">
                              入稿中
                            </Badge>
                          )}
                        </div>

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 translate-y-2 group-hover:translate-y-0 transition-transform">
                          <div className="text-[10px] font-bold text-white truncate mb-1">{item.title || '未命名图片'}</div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-white/70">{item.content_categories?.name || '未分类'}</span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 px-2 text-[10px] bg-white/20 text-white hover:bg-white/40 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromUsed(item.id);
                              }}
                            >
                              移出
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/20">
                <p className="text-xs text-muted-foreground">
                  已入库总计 <span className="text-foreground font-bold">{usedMediaTotal}</span> 张图片
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg"
                    onClick={() => setUsedMediaPage(prev => Math.max(0, prev - 1))}
                    disabled={usedMediaPage === 0}
                  >
                    上一页
                  </Button>
                  <span className="text-xs px-3 py-1 bg-muted rounded-lg font-mono">
                    {usedMediaPage + 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg"
                    onClick={() => setUsedMediaPage(prev => prev + 1)}
                    disabled={(usedMediaPage + 1) * 20 >= usedMediaTotal}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 模板编辑对话框 */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? '编辑模板' : '新建模板'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>模板名称 *</Label>
                <Input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="例如：每日图集推送"
                />
              </div>
              <div className="space-y-2">
                <Label>模板类别 *</Label>
                <Select
                  value={templateForm.category}
                  onValueChange={(value) => setTemplateForm({ ...templateForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择类别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header">头部模板</SelectItem>
                    <SelectItem value="body">正文模板</SelectItem>
                    <SelectItem value="footer">尾部模板</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>作者</Label>
                <Input
                  value={templateForm.author}
                  onChange={(e) => setTemplateForm({ ...templateForm, author: e.target.value })}
                  placeholder="作者名称"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>模板描述</Label>
              <Input
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                placeholder="模板简要说明"
              />
            </div>

            <div className="space-y-2">
              <Label>图文标题 *</Label>
              <Input
                value={templateForm.title}
                onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                placeholder="图文消息标题"
              />
            </div>

            <div className="space-y-2">
              <Label>摘要</Label>
              <Textarea
                value={templateForm.digest}
                onChange={(e) => setTemplateForm({ ...templateForm, digest: e.target.value })}
                placeholder="图文消息摘要（选填）"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>正文内容 *</Label>
              <DraftContentBuilder 
                key={editingTemplate?.id || 'new-template'}
                configId={selectedConfigId}
                excludedCategories={excludedCategories}
                excludedTags={excludedTags}
                initialBlocks={
                  editingTemplate && editingTemplate.content && editingTemplate.content.trim().startsWith('[') 
                    ? JSON.parse(editingTemplate.content) 
                    : (editingTemplate && editingTemplate.content && (editingTemplate.content.trim().startsWith('<') || editingTemplate.content.trim().includes('</')))
                      ? [{ id: 'init-html', type: 'raw_html', content: editingTemplate.content, editingRaw: false }]
                      : editingTemplate ? [{ id: 'init-text', type: 'text', content: editingTemplate.content }] : []
                }
                onChange={(html, blocks) => setTemplateForm({ ...templateForm, content: html, blocks_json: JSON.stringify(blocks) } as any)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex justify-between items-center">
                原文链接
                <div className="flex gap-1">
                  {pathPresets.map(preset => (
                    <Button 
                      key={preset.path} 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-1.5 text-[10px] rounded-md bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={() => applyPathToTemplate(preset.path)}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </Label>
              <Input
                value={templateForm.content_source_url}
                onChange={(e) => setTemplateForm({ ...templateForm, content_source_url: e.target.value })}
                placeholder="https://..."
                className="rounded-xl"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={templateForm.need_open_comment}
                  onCheckedChange={(checked) => setTemplateForm({ ...templateForm, need_open_comment: checked })}
                />
                <Label>开启评论</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={templateForm.only_fans_can_comment}
                  onCheckedChange={(checked) => setTemplateForm({ ...templateForm, only_fans_can_comment: checked })}
                />
                <Label>仅粉丝可评论</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={templateForm.is_active}
                  onCheckedChange={(checked) => setTemplateForm({ ...templateForm, is_active: checked })}
                />
                <Label>启用模板</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!templateForm.name || !templateForm.title || !templateForm.content}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建草稿对话框 */}
      <Dialog open={isCreateDraftDialogOpen} onOpenChange={setIsCreateDraftDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建草稿到微信公众号</DialogTitle>
            <DialogDescription>
              填写图文消息内容，或从模板快速创建
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>选择模板（可选）</Label>
              <Select 
                value={draftForm.template_id} 
                onValueChange={(value) => {
                  const template = templates.find(t => t.id === value);
                  if (template) {
                    handleUseTemplate(template);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="从模板快速创建" />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.is_active).map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>图文标题 *</Label>
                <Input
                  value={draftForm.title}
                  onChange={(e) => setDraftForm({ ...draftForm, title: e.target.value })}
                  placeholder="图文消息标题"
                />
              </div>
              <div className="space-y-2">
                <Label>作者</Label>
                <Input
                  value={draftForm.author}
                  onChange={(e) => setDraftForm({ ...draftForm, author: e.target.value })}
                  placeholder="作者名称"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                封面图片
                <span className="text-[10px] text-muted-foreground font-normal">(选填，默认使用内容第一张)</span>
              </Label>
              <Button 
                variant="outline" 
                onClick={() => setIsMediaSelectorOpen(true)}
                className="w-full"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                {selectedMedia.length > 0 ? '已选择 1 张图片' : '从素材库选择'}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>摘要</Label>
              <Textarea
                value={draftForm.digest}
                onChange={(e) => setDraftForm({ ...draftForm, digest: e.target.value })}
                placeholder="图文消息摘要（选填）"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>正文内容 *</Label>
              <DraftContentBuilder 
                key={`draft-builder-${draftIdKey}`}
                configId={selectedConfigId}
                excludedCategories={excludedCategories}
                excludedTags={excludedTags}
                initialBlocks={draftBlocks}
                onChange={(html, blocks) => {
                  setDraftForm(prev => ({ ...prev, content: html }));
                  setDraftBlocks(blocks);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex justify-between items-center">
                原文链接
                <div className="flex gap-1">
                  {pathPresets.map(preset => (
                    <Button 
                      key={preset.path} 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-1.5 text-[10px] rounded-md bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={() => applyPathToDraft(preset.path)}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </Label>
              <Input
                value={draftForm.content_source_url}
                onChange={(e) => setDraftForm({ ...draftForm, content_source_url: e.target.value })}
                placeholder="https://..."
                className="rounded-xl"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={draftForm.need_open_comment}
                  onCheckedChange={(checked) => setDraftForm({ ...draftForm, need_open_comment: checked })}
                />
                <Label>开启评论</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={draftForm.only_fans_can_comment}
                  onCheckedChange={(checked) => setDraftForm({ ...draftForm, only_fans_can_comment: checked })}
                />
                <Label>仅粉丝可评论</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDraftDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleCreateDraft} 
              disabled={!draftForm.title || !draftForm.content || loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              创建到微信
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 媒体库配置对话框 */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>配置草稿媒体库策略</DialogTitle>
            <DialogDescription>
              设置哪些图片可以出现在草稿箱媒体库中。排除特定分类或标签的图片。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                大多图组件自动配置
              </Label>
              <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border/40">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">启用自动配置</Label>
                    <p className="text-[10px] text-muted-foreground">开启后大多图生成时会自动插入以下图片</p>
                  </div>
                  <Switch 
                    checked={wechatDraftSystemConfig?.big_multi?.enabled || false}
                    onCheckedChange={(checked) => {
                      const newConfig = {
                        ...wechatDraftSystemConfig,
                        big_multi: {
                          ...(wechatDraftSystemConfig?.big_multi || {}),
                          enabled: checked
                        }
                      };
                      setWechatDraftSystemConfig(newConfig);
                      api.updateSystemConfig('wechat_draft_config', newConfig);
                    }}
                  />
                </div>

                {wechatDraftSystemConfig?.big_multi?.enabled && (
                  <div className="grid grid-cols-1 gap-4 pt-2 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold">固定首张图片 URL</Label>
                      <Input 
                        placeholder="https://..."
                        value={wechatDraftSystemConfig.big_multi.first_image || ''}
                        onChange={(e) => {
                          const newConfig = {
                            ...wechatDraftSystemConfig,
                            big_multi: {
                              ...wechatDraftSystemConfig.big_multi,
                              first_image: e.target.value
                            }
                          };
                          setWechatDraftSystemConfig(newConfig);
                          api.updateSystemConfig('wechat_draft_config', newConfig);
                        }}
                        className="h-8 text-xs rounded-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold">固定最后一张图片 URL</Label>
                      <Input 
                        placeholder="https://..."
                        value={wechatDraftSystemConfig.big_multi.last_image || ''}
                        onChange={(e) => {
                          const newConfig = {
                            ...wechatDraftSystemConfig,
                            big_multi: {
                              ...wechatDraftSystemConfig.big_multi,
                              last_image: e.target.value
                            }
                          };
                          setWechatDraftSystemConfig(newConfig);
                          api.updateSystemConfig('wechat_draft_config', newConfig);
                        }}
                        className="h-8 text-xs rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1 space-y-1.5">
                        <Label className="text-[10px] font-bold">第 N 张位置</Label>
                        <Input 
                          type="number"
                          min="2"
                          value={wechatDraftSystemConfig.big_multi.nth_image?.n || 2}
                          onChange={(e) => {
                            const newConfig = {
                              ...wechatDraftSystemConfig,
                              big_multi: {
                                ...wechatDraftSystemConfig.big_multi,
                                nth_image: {
                                  ...(wechatDraftSystemConfig.big_multi.nth_image || {}),
                                  n: parseInt(e.target.value) || 2
                                }
                              }
                            };
                            setWechatDraftSystemConfig(newConfig);
                            api.updateSystemConfig('wechat_draft_config', newConfig);
                          }}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-bold">第 N 张图片 URL</Label>
                        <Input 
                          placeholder="https://..."
                          value={wechatDraftSystemConfig.big_multi.nth_image?.url || ''}
                          onChange={(e) => {
                            const newConfig = {
                              ...wechatDraftSystemConfig,
                              big_multi: {
                                ...wechatDraftSystemConfig.big_multi,
                                nth_image: {
                                  ...(wechatDraftSystemConfig.big_multi.nth_image || {}),
                                  url: e.target.value
                                }
                              }
                            };
                            setWechatDraftSystemConfig(newConfig);
                            api.updateSystemConfig('wechat_draft_config', newConfig);
                          }}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                默认摘要配置
              </Label>
              <div className="bg-muted/30 p-4 rounded-xl border border-border/40">
                <Label className="text-[10px] font-bold">默认草稿摘要</Label>
                <Textarea 
                  placeholder="输入默认摘要内容..."
                  value={wechatDraftSystemConfig?.default_digest || ''}
                  onChange={(e) => {
                    const newConfig = {
                      ...wechatDraftSystemConfig,
                      default_digest: e.target.value
                    };
                    setWechatDraftSystemConfig(newConfig);
                    api.updateSystemConfig('wechat_draft_config', newConfig);
                  }}
                  className="mt-1.5 h-20 text-xs rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                排除分类
              </Label>
              <div className="grid grid-cols-3 gap-2 bg-muted/30 p-3 rounded-xl border border-border/40">
                {allCategories.map(cat => (
                  <div key={cat.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`cat-${cat.id}`}
                      checked={excludedCategories.includes(cat.id)}
                      onCheckedChange={(checked: boolean) => {
                        setDraftMediaPage(0);
                        if (checked) {
                          setExcludedCategories([...excludedCategories, cat.id]);
                        } else {
                          setExcludedCategories(excludedCategories.filter(id => id !== cat.id));
                        }
                      }}
                    />
                    <label 
                      htmlFor={`cat-${cat.id}`}
                      className="text-xs font-medium leading-none cursor-pointer"
                    >
                      {cat.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary" />
                排除标签
              </Label>
              <ScrollArea className="h-[150px] bg-muted/30 p-3 rounded-xl border border-border/40">
                <div className="grid grid-cols-2 gap-2">
                  {allTags.map(tag => (
                    <div key={tag.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`tag-${tag.id}`}
                        checked={excludedTags.includes(tag.name)}
                        onCheckedChange={(checked: boolean) => {
                          setDraftMediaPage(0);
                          if (checked) {
                            setExcludedTags([...excludedTags, tag.name]);
                          } else {
                            setExcludedTags(excludedTags.filter(n => n !== tag.name));
                          }
                        }}
                      />
                      <label 
                        htmlFor={`tag-${tag.id}`}
                        className={cn(
                          "text-[10px] font-medium leading-none cursor-pointer truncate",
                          tag.name.includes('不入') ? "text-amber-600" : ""
                        )}
                      >
                        {tag.name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={saveWechatDraftConfig}>
              保存库策略
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 素材选择器 */}
      <Dialog open={isMediaSelectorOpen} onOpenChange={setIsMediaSelectorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>选择封面图片</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="搜索素材..."
              value={mediaSearch}
              onChange={(e) => {
                setMediaSearch(e.target.value);
                setMediaPage(0);
              }}
            />
            <div className="grid grid-cols-4 gap-4">
              {mediaItems.map(item => {
                const isSelected = selectedMedia.some(m => m.id === item.id);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                      isSelected
                        ? "border-primary ring-2 ring-primary"
                        : "border-transparent hover:border-primary/50"
                    )}
                    onClick={() => {
                      setSelectedMedia([{ id: item.id, url: item.url }]);
                    }}
                  >
                    <img
                      src={item.url}
                      alt={item.title || ''}
                      className="w-full aspect-square object-contain"
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                共 {mediaTotal} 张图片
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaPage(Math.max(0, mediaPage - 1))}
                  disabled={mediaPage === 0}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaPage(mediaPage + 1)}
                  disabled={(mediaPage + 1) * mediaLimit >= mediaTotal}
                >
                  下一页
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMediaSelectorOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={() => setIsMediaSelectorOpen(false)}
              disabled={selectedMedia.length === 0}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 进度显示叠加层 */}
      {(bulkProgress.active || syncStatusProgress.active) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl border-primary/20 animate-in fade-in zoom-in duration-300">
            <CardContent className="pt-6 pb-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <Loader2 className="w-16 h-16 animate-spin text-primary opacity-20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">
                      {Math.round(((bulkProgress.active ? bulkProgress.current : syncStatusProgress.current) / (bulkProgress.active ? bulkProgress.total : syncStatusProgress.total) || 0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold">
                  {bulkProgress.active ? '正在批量创建草稿' : '正在同步微信状态'}
                </h3>
                <p className="text-sm text-muted-foreground min-h-[1.25rem]">
                  {bulkProgress.active ? (bulkProgress.message || '请稍候...') : `正在检查第 ${syncStatusProgress.current}/${syncStatusProgress.total} 条记录...`}
                </p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300 ease-out"
                  style={{ width: `${((bulkProgress.active ? bulkProgress.current : syncStatusProgress.current) / (bulkProgress.active ? bulkProgress.total : syncStatusProgress.total) || 0) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest pt-2">
                请勿关闭此窗口，操作正在后台处理中
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 壁纸草稿生成器 */}
      <WallpaperDraftBuilder
        open={isWallpaperDraftOpen}
        onClose={() => setIsWallpaperDraftOpen(false)}
        configId={selectedConfigId}
      />
    </div>
  );
}
