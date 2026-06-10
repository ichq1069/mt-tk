import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/db/api';
import { 
  Loader2, Plus, Trash2, Edit2, Eye, Share2, ExternalLink, Search, LayoutList, Save, FileText, FolderOpen, LayoutTemplate, Code, Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor, RichTextEditorRef } from '@/components/common/RichTextEditor';
import { useConfig } from '@/contexts/ConfigContext';

interface QuickInsertToolboxProps {
  shortcodes: any[];
  internalPages: any[];
  onInsertShortcode: (key: string) => void;
  onInsertInternalLink: (name: string, path: string, styles?: any) => void;
  defaultStyles: any;
  onUpdateDefaultStyles?: (styles: any) => void;
  onSaveDefaults?: () => void;
}

function QuickInsertToolbox({ 
  shortcodes, 
  internalPages, 
  onInsertShortcode, 
  onInsertInternalLink, 
  defaultStyles,
  onUpdateDefaultStyles,
  onSaveDefaults
}: QuickInsertToolboxProps) {
  const [currentStyles, setCurrentStyles] = useState(defaultStyles);

  useEffect(() => {
    setCurrentStyles(defaultStyles);
  }, [defaultStyles]);

  const handleInsertLink = (name: string, path: string) => {
    onInsertInternalLink(name, path, currentStyles);
  };

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
      <DialogHeader className="p-4 border-b">
        <DialogTitle className="text-sm font-bold text-center">快捷插入工具箱</DialogTitle>
        <DialogDescription className="text-xs text-center">选择字段或页面链接插入至编辑器光标处</DialogDescription>
      </DialogHeader>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">链接样式设置 (仅对本次及后续插入生效)</Label>
            {onSaveDefaults && (
              <Button variant="ghost" size="sm" className="h-6 text-[9px] text-primary hover:bg-primary/5 px-2 font-black" onClick={onSaveDefaults}>
                设为全局默认
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-slate-500">文字颜色</Label>
              <div className="relative group/color">
                <Input 
                  type="text" 
                  value={currentStyles.textColor} 
                  onChange={(e) => {
                    const newS = {...currentStyles, textColor: e.target.value};
                    setCurrentStyles(newS);
                    onUpdateDefaultStyles?.(newS);
                  }}
                  className="h-8 text-[10px] rounded-lg pr-7"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md border border-slate-200 overflow-hidden cursor-pointer flex items-center justify-center hover:border-primary transition-colors">
                  <input 
                    type="color" 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={(e) => {
                      const newS = {...currentStyles, textColor: e.target.value};
                      setCurrentStyles(newS);
                      onUpdateDefaultStyles?.(newS);
                    }}
                  />
                  <Palette className="w-3 h-3 text-slate-400 group-hover/color:text-primary" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-slate-500">背景颜色</Label>
              <div className="relative group/color">
                <Input 
                  type="text" 
                  value={currentStyles.bgColor} 
                  onChange={(e) => {
                    const newS = {...currentStyles, bgColor: e.target.value};
                    setCurrentStyles(newS);
                    onUpdateDefaultStyles?.(newS);
                  }}
                  className="h-8 text-[10px] rounded-lg pr-7"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md border border-slate-200 overflow-hidden cursor-pointer flex items-center justify-center hover:border-primary transition-colors">
                  <input 
                    type="color" 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={(e) => {
                      const newS = {...currentStyles, bgColor: e.target.value};
                      setCurrentStyles(newS);
                      onUpdateDefaultStyles?.(newS);
                    }}
                  />
                  <Palette className="w-3 h-3 text-slate-400 group-hover/color:text-primary" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-slate-500">内边距</Label>
              <Input 
                type="text" 
                value={currentStyles.padding} 
                onChange={(e) => {
                  const newS = {...currentStyles, padding: e.target.value};
                  setCurrentStyles(newS);
                  onUpdateDefaultStyles?.(newS);
                }}
                className="h-8 text-[10px] rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-slate-500">圆角</Label>
              <Input 
                type="text" 
                value={currentStyles.borderRadius} 
                onChange={(e) => {
                  const newS = {...currentStyles, borderRadius: e.target.value};
                  setCurrentStyles(newS);
                  onUpdateDefaultStyles?.(newS);
                }}
                className="h-8 text-[10px] rounded-lg"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 p-2 bg-white rounded-xl border border-dashed border-slate-200 justify-center">
            <span className="text-[10px] text-slate-400">效果预览:</span>
            <span style={{ 
              backgroundColor: currentStyles.bgColor, 
              color: currentStyles.textColor, 
              padding: currentStyles.padding, 
              borderRadius: currentStyles.borderRadius,
              fontWeight: currentStyles.fontWeight as any,
              fontSize: '12px',
              textDecoration: 'none',
              display: 'inline-block'
            }}>
              页面链接预览
            </span>
          </div>
        </div>

        <div>
          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 block">系统内置短代码</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 flex flex-col items-start gap-1 bg-slate-50 hover:bg-primary/5 hover:text-primary transition-colors border border-slate-100 rounded-xl" onClick={() => onInsertShortcode('user.name')}>
              <span className="text-[11px] font-bold">当前用户昵称</span>
              <span className="text-[9px] opacity-50">{"{{user.name}}"}</span>
            </Button>
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 flex flex-col items-start gap-1 bg-slate-50 hover:bg-primary/5 hover:text-primary transition-colors border border-slate-100 rounded-xl" onClick={() => onInsertShortcode('site.title')}>
              <span className="text-[11px] font-bold">网站标题</span>
              <span className="text-[9px] opacity-50">{"{{site.title}}"}</span>
            </Button>
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 flex flex-col items-start gap-1 bg-slate-50 hover:bg-primary/5 hover:text-primary transition-colors border border-slate-100 rounded-xl" onClick={() => onInsertShortcode('date.yyyy-mm-dd')}>
              <span className="text-[11px] font-bold">当前日期</span>
              <span className="text-[9px] opacity-50">{"{{date.yyyy-mm-dd}}"}</span>
            </Button>
          </div>
        </div>

        {shortcodes.length > 0 && (
          <div>
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 block">自定义字段</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {shortcodes.map(sc => (
                <Button key={sc.id} variant="ghost" className="justify-start h-auto py-2.5 px-3 flex flex-col items-start gap-1 bg-blue-50/30 hover:bg-blue-50 text-blue-700 transition-colors border border-blue-100 rounded-xl" onClick={() => onInsertShortcode(sc.key)}>
                  <span className="text-[11px] font-bold truncate w-full">{sc.name}</span>
                  <span className="text-[9px] opacity-50">{"{{"}{sc.key}{"}}"}</span>
                  {sc.example && <span className="text-[9px] text-blue-600/70 italic mt-0.5">示例: {sc.example}</span>}
                </Button>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
              <p className="text-[10px] font-bold text-blue-700 mb-2">💡 使用示例</p>
              <div className="space-y-1.5 text-[10px] text-slate-600">
                <p>• <code className="bg-white px-1.5 py-0.5 rounded text-blue-600">{'{{' + (shortcodes[0]?.key || 'user.name') + '}}'}</code> → 当前用户昵称</p>
                <p>• <code className="bg-white px-1.5 py-0.5 rounded text-blue-600">{'{{' + (shortcodes[1]?.key || 'date.yyyy-mm-dd') + '}}'}</code> → 当前日期</p>
                <p>• <code className="bg-white px-1.5 py-0.5 rounded text-blue-600">{'{{' + (shortcodes[2]?.key || 'site.title') + '}}'}</code> → 网站标题</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 block">内部页面跳转</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {internalPages.map(page => (
              <Button key={page.path} variant="ghost" className="justify-start h-auto py-2.5 px-3 flex flex-col items-start gap-1 bg-green-50/30 hover:bg-green-50 text-green-700 transition-colors border border-green-100 rounded-xl" onClick={() => handleInsertLink(page.name, page.path)}>
                <span className="text-[11px] font-bold">{page.name}</span>
                <span className="text-[9px] opacity-50 truncate w-full">{page.path}</span>
              </Button>
            ))}
          </div>
          <div className="mt-4 p-3 bg-green-50/50 rounded-lg border border-green-100">
            <p className="text-[10px] font-bold text-green-700 mb-2">🔗 路径跳转示例</p>
            <div className="space-y-1.5 text-[10px] text-slate-600">
              <p>• React Router: <code className="bg-white px-1.5 py-0.5 rounded text-green-600">navigate('/daily-gallery')</code></p>
              <p>• 链接组件: <code className="bg-white px-1.5 py-0.5 rounded text-green-600">&lt;Link to="/profile"&gt;我的&lt;/Link&gt;</code></p>
              <p>• 新窗口打开: <code className="bg-white px-1.5 py-0.5 rounded text-green-600">window.open('/albums', '_blank')</code></p>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

export function GuidesManagementSection() {
  const { refreshConfig } = useConfig();
  const [guides, setGuides] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [shortcodes, setShortcodes] = useState<any[]>([]);
  const [internalPages] = useState([
    { name: '探索首页', path: '/' },
    { name: '每日图集', path: '/daily-gallery' },
    { name: '文档中心', path: '/usage-guide' },
    { name: '壁纸分享', path: '/upload' },
    { name: '图集写真', path: '/albums' },
    { name: '个人中心', path: '/profile' },
    { name: '我的勋章', path: '/badges' },
    { name: '签到中心', path: '/check-in' },
    { name: '消息通知', path: '/notifications' },
    { name: 'ID 靓号铺子', path: '/id-shop' },
    { name: '极速整理', path: '/fast-organize' },
  ]);
  const [linkStyles, setLinkStyles] = useState({
    bgColor: 'hsl(var(--primary)/0.1)',
    textColor: 'hsl(var(--primary))',
    fontWeight: 'bold',
    borderRadius: '4px',
    padding: '2px 6px'
  });
  const [loading, setLoading] = useState(true);
  const [editingGuide, setEditingGuide] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', sort_order: 0 });
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateApplyMode, setTemplateApplyMode] = useState<'replace' | 'insert'>('replace');
  const editorRef = useRef<RichTextEditorRef>(null);
  const templateEditorRef = useRef<RichTextEditorRef>(null);

  const [isStylesDialogOpen, setIsStylesDialogOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
    variant?: 'danger' | 'default';
  }>({
    open: false,
    title: '',
    description: '',
    action: () => {},
    variant: 'default'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [guidesRes, catsRes, tempsRes, shortRes, stylesRes] = await Promise.all([
        api.getGuides(),
        api.getGuideCategories(),
        api.getGuideTemplates(),
        api.getShortcodes(),
        api.getSystemConfig('guide_link_styles')
      ]);
      setGuides(guidesRes.data || []);
      setCategories(catsRes.data || []);
      setTemplates(tempsRes.data || []);
      setShortcodes(shortRes.data || []);
      if (stylesRes.data) {
        setLinkStyles(stylesRes.data.value);
      }
    } catch (error: any) {
      toast.error('加载数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLinkStyles = async () => {
    try {
      const { error } = await api.updateSystemConfig('guide_link_styles', linkStyles);
      if (error) throw error;
      await refreshConfig();
      toast.success('默认链接样式已更新');
    } catch (error: any) {
      toast.error('更新失败: ' + error.message);
    }
  };

  const fetchGuides = async () => {
    const { data } = await api.getGuides();
    setGuides(data || []);
  };

  const handleCreate = () => {
    setEditingGuide({ title: '', content: '<p><br></p>', is_public: true, category_id: null });
    setIsDialogOpen(true);
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) return toast.error('请输入分类名称');
    try {
      const { error } = await api.createGuideCategory(newCategory);
      if (error) throw error;
      toast.success('分类创建成功');
      setNewCategory({ name: '', description: '', sort_order: 0 });
      const cats = await api.getGuideCategories();
      setCategories(cats.data || []);
    } catch (error: any) {
      toast.error('创建分类失败: ' + error.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setConfirmConfig({
      open: true,
      title: '删除分类',
      description: '确定要删除此分类吗？关联的文档将变为未分类。',
      variant: 'danger',
      action: async () => {
        try {
          const { error } = await api.deleteGuideCategory(id);
          if (error) throw error;
          toast.success('分类删除成功');
          const cats = await api.getGuideCategories();
          setCategories(cats.data || []);
        } catch (error: any) {
          toast.error('删除分类失败: ' + error.message);
        }
      }
    });
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate.name.trim() || !editingTemplate.content.trim()) return toast.error('请填写完整');
    try {
      let error;
      if (editingTemplate.id) {
        ({ error } = await api.updateGuideTemplate(editingTemplate.id, editingTemplate));
      } else {
        ({ error } = await api.createGuideTemplate(editingTemplate));
      }
      if (error) throw error;
      toast.success('模板保存成功');
      setIsTemplateDialogOpen(false);
      const temps = await api.getGuideTemplates();
      setTemplates(temps.data || []);
    } catch (error: any) {
      toast.error('保存模板失败: ' + error.message);
    }
  };

  const applyTemplate = (content: string) => {
    // 替换模板中的短代码
    let processedContent = content;
    shortcodes.forEach(s => {
      const regex = new RegExp(`\\{\\{${s.key}\\}\\}`, 'g');
      processedContent = processedContent.replace(regex, `<span>{{${s.key}}}</span>`);
    });

    if (templateApplyMode === 'replace') {
      setConfirmConfig({
        open: true,
        title: '应用模板',
        description: '应用模板将覆盖当前内容，确定吗？此操作不可恢复。',
        action: () => {
          setEditingGuide((prev: any) => ({ ...prev, content: processedContent }));
          toast.success('模板已替换当前内容');
        }
      });
    } else {
      if (editorRef.current) {
        editorRef.current.insertHtml(processedContent);
        toast.success('模板已插入至光标处');
      } else {
        setEditingGuide((prev: any) => ({ ...prev, content: prev.content + processedContent }));
        toast.success('模板已追加至末尾');
      }
    }
  };

  const insertShortcode = (key: string, targetEditor?: 'guide' | 'template') => {
    const shortcode = `{{${key}}}`;
    const ref = targetEditor === 'template' ? templateEditorRef : editorRef;
    
    if (ref.current) {
      ref.current.insertHtml(`<span>${shortcode}</span>`);
      toast.success(`短代码 ${shortcode} 已插入至光标处`);
    } else {
      if (targetEditor === 'template') {
        setEditingTemplate((prev: any) => ({ ...prev, content: prev.content + `<p>${shortcode}</p>` }));
      } else {
        setEditingGuide((prev: any) => ({ ...prev, content: prev.content + `<p>${shortcode}</p>` }));
      }
      toast.success(`短代码 ${shortcode} 已追加至末尾`);
    }
  };

  const insertInternalLink = (name: string, path: string, styles?: any, targetEditor?: 'guide' | 'template') => {
    const s = styles || linkStyles;
    const styleStr = `background-color: ${s.bgColor}; color: ${s.textColor}; font-weight: ${s.fontWeight}; padding: ${s.padding}; border-radius: ${s.borderRadius}; text-decoration: none; display: inline-block; margin: 0 2px;`;
    const html = `<a href="${path}" style="${styleStr}">${name}</a>`;
    const ref = targetEditor === 'template' ? templateEditorRef : editorRef;

    if (ref.current) {
      ref.current.insertHtml(html);
      toast.success(`页面链接 [${name}] 已插入至光标处`);
    } else {
      if (targetEditor === 'template') {
        setEditingTemplate((prev: any) => ({ ...prev, content: prev.content + `<p>${html}</p>` }));
      } else {
        setEditingGuide((prev: any) => ({ ...prev, content: prev.content + `<p>${html}</p>` }));
      }
      toast.success(`页面链接 [${name}] 已追加至末尾`);
    }
  };

  const handleEdit = (guide: any) => {
    let content = guide.content;
    if (!content.includes('<') && content.includes('\n')) {
      content = content.replace(/\\n/g, '\n').split('\n').map((line: string) => {
        if (line.startsWith('### ')) return `<h3>${line.replace('### ', '')}</h3>`;
        if (line.startsWith('## ')) return `<h2>${line.replace('## ', '')}</h2>`;
        if (line.startsWith('# ')) return `<h1>${line.replace('# ', '')}</h1>`;
        if (line.trim() === '') return '<p><br></p>';
        return `<p>${line}</p>`;
      }).join('');
    } else if (!content.includes('<')) {
      content = `<p>${content.replace(/\\n/g, '<br/>')}</p>`;
    }
    setEditingGuide({ ...guide, content });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingGuide.title.trim() || !editingGuide.content.trim()) {
      toast.error('请填写完整的标题和内容');
      return;
    }
    try {
      if (editingGuide.id) {
        const { error } = await api.updateGuide(editingGuide.id, {
          title: editingGuide.title,
          content: editingGuide.content,
          is_public: editingGuide.is_public,
          category_id: editingGuide.category_id || null
        });
        if (error) throw error;
        toast.success('更新成功');
      } else {
        const { error } = await api.createGuide({
          title: editingGuide.title,
          content: editingGuide.content,
          is_public: editingGuide.is_public,
          category_id: editingGuide.category_id || null
        });
        if (error) throw error;
        toast.success('创建成功');
      }
      setIsDialogOpen(false);
      fetchGuides();
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmConfig({
      open: true,
      title: '删除文档',
      description: '确定要删除这篇文档吗？此操作不可恢复。',
      variant: 'danger',
      action: async () => {
        try {
          const { error } = await api.deleteGuide(id);
          if (error) throw error;
          toast.success('删除成功');
          fetchGuides();
        } catch (error: any) {
          toast.error('删除失败: ' + error.message);
        }
      }
    });
  };

  const copyShareLink = (id: string) => {
    const url = `${window.location.origin}/usage-guide/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('分享链接已复制');
  };

  const filteredGuides = guides.filter(g => 
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">文档管理</h2>
          <p className="text-sm text-slate-500 mt-1">创建、编辑并分享全站系统的使用说明与帮助中心</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsStylesDialogOpen(true)} className="rounded-xl px-4 gap-2 h-12">
            <Palette className="w-5 h-5 text-primary" />
            样式设置
          </Button>
          <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)} className="rounded-xl px-4 gap-2 h-12">
            <FolderOpen className="w-5 h-5" />
            分类管理
          </Button>
          <Button variant="outline" onClick={() => { setEditingTemplate({ name: '', content: '' }); setIsTemplateDialogOpen(true); }} className="rounded-xl px-4 gap-2 h-12">
            <LayoutTemplate className="w-5 h-5" />
            模板配置
          </Button>
          <Button onClick={handleCreate} className="rounded-xl px-6 gap-2 h-12 bg-primary text-primary-foreground">
            <Plus className="w-5 h-5" />
            创建新文档
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="搜索文档名称或内容关键字..." 
            className="pl-10 border-none bg-transparent h-10 rounded-xl focus-visible:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-4 border-l border-slate-100">
          <LayoutList className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">共 {guides.length} 篇</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-slate-500 font-medium">加载中，请稍候...</p>
        </div>
      ) : filteredGuides.length === 0 ? (
        <Card className="border-none shadow-sm rounded-3xl p-20 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
            <FileText className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-slate-800">暂无文档</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-[280px]">您还没有创建任何使用说明。点击右上角按钮开始创建您的第一篇文档！</p>
          <Button variant="outline" className="mt-8 rounded-full px-8" onClick={handleCreate}>
            立即创建
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuides.map(guide => (
            <Card key={guide.id} className="border-none shadow-sm rounded-3xl overflow-hidden hover:shadow-xl transition-all group bg-white border border-slate-100 flex flex-col h-full">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge className={cn("rounded-lg text-[10px] px-2 py-0.5", guide.is_public ? "bg-green-50 text-green-600 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200")} variant="outline">
                    {guide.is_public ? "已公开" : "私有"}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{guide.view_count || 0}</span>
                  </div>
                </div>
                <CardTitle className="text-lg font-black text-slate-800 line-clamp-1">{guide.title}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs leading-relaxed mt-1">
                  {guide.content.replace(/[#\n<>]/g, ' ').substring(0, 100)}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-4 border-t border-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-xs gap-1.5 h-9" onClick={() => handleEdit(guide)}>
                    <Edit2 className="w-3.5 h-3.5" />
                    编辑
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-xs gap-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 h-9" onClick={() => handleDelete(guide.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                    删除
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" className="flex-1 rounded-xl text-[10px] font-black h-9 gap-1.5" onClick={() => copyShareLink(guide.id)}>
                    <Share2 className="w-3 h-3" />
                    复制链接
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 rounded-xl text-[10px] font-black h-9 gap-1.5" asChild>
                    <a href={`/usage-guide/${guide.id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3" />
                      预览
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 编辑/创建弹窗 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-black text-slate-800">{editingGuide?.id ? '编辑文档' : '创建新文档'}</DialogTitle>
            <DialogDescription>
              已启用 wangEditor 富文本编辑器，支持多级标题、加粗、列表、图片等高级排版功能。
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="guide-title" className="text-sm font-bold text-slate-700">文档标题</Label>
                <Input 
                  id="guide-title" 
                  placeholder="例如：系统使用手册 v1.0" 
                  className="rounded-2xl h-12 text-lg font-black border-slate-200 focus:ring-primary"
                  value={editingGuide?.title || ''}
                  onChange={(e) => setEditingGuide({ ...editingGuide, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guide-category" className="text-sm font-bold text-slate-700">所属分类</Label>
                <Select value={editingGuide?.category_id || 'none'} onValueChange={(v) => setEditingGuide({ ...editingGuide, category_id: v === 'none' ? null : v })}>
                  <SelectTrigger className="h-12 rounded-2xl border-slate-200">
                    <SelectValue placeholder="选择文档分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未分类</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-bold text-slate-700">快速插入与模板</Label>
                  <p className="text-[10px] text-slate-400">点击按钮快速插入短代码或应用预设模板</p>
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl h-9 text-[10px] gap-1">
                        <Code className="w-3 h-3" />
                        快捷插入
                      </Button>
                    </DialogTrigger>
                    <QuickInsertToolbox 
                      shortcodes={shortcodes}
                      internalPages={internalPages}
                      onInsertShortcode={(key) => insertShortcode(key, 'guide')}
                      onInsertInternalLink={(name, path, styles) => insertInternalLink(name, path, styles, 'guide')}
                      defaultStyles={linkStyles}
                      onUpdateDefaultStyles={setLinkStyles}
                      onSaveDefaults={handleSaveLinkStyles}
                    />
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl h-9 text-[10px] gap-1">
                        <LayoutTemplate className="w-3 h-3" />
                        应用模板
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[70vh] flex flex-col p-0 overflow-hidden">
                      <DialogHeader className="p-4 border-b">
                        <DialogTitle className="text-sm font-bold">预设文档模板</DialogTitle>
                        <DialogDescription className="text-xs">选择一个模板应用，当前编辑器内容将被替换</DialogDescription>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-2">
                          {templates.length === 0 ? (
                            <div className="text-center text-xs text-slate-400 py-8">暂无可用模板</div>
                          ) : (
                            templates.map(tmp => (
                              <div key={tmp.id} className="p-3 bg-white border border-slate-100 rounded-xl hover:border-primary transition-colors cursor-pointer group" onClick={() => applyTemplate(tmp.content)}>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black group-hover:text-primary transition-colors">{tmp.name}</span>
                                  <Plus className="w-3 h-3 text-slate-300 group-hover:text-primary" />
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1 line-clamp-1">{tmp.description || '无描述'}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="space-y-2 flex-1 flex flex-col min-h-[500px]">
                <RichTextEditor 
                  ref={editorRef}
                  value={editingGuide?.content || ''}
                  onChange={(content) => setEditingGuide((prev: any) => ({ ...prev, content }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-slate-700">公开文档</span>
                <span className="text-[10px] text-slate-500">开启后任何人均可通过链接访问此文档</span>
              </div>
              <Switch 
                checked={editingGuide?.is_public || false}
                onCheckedChange={(checked) => setEditingGuide({ ...editingGuide, is_public: checked })}
              />
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center justify-end gap-3 w-full">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl px-6 h-11">
                取消
              </Button>
              <Button onClick={handleSave} className="rounded-xl px-8 h-11 gap-2">
                <Save className="w-4 h-4" />
                保存文档
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 分类管理弹窗 */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 overflow-hidden rounded-3xl">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="text-lg font-black">分类管理</DialogTitle>
            <DialogDescription className="text-xs">管理文档的分类标签，方便内容展示和筛选</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">新增分类</Label>
                <Input value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })} placeholder="分类名称" className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">备注描述</Label>
                <Input value={newCategory.description} onChange={e => setNewCategory({ ...newCategory, description: e.target.value })} placeholder="分类描述" className="h-10 rounded-xl" />
              </div>
              <Button className="w-full h-10 rounded-xl gap-2 mt-2" onClick={handleCreateCategory}>
                <Plus className="w-4 h-4" />
                添加分类
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">已有分类列表</Label>
              <div className="space-y-2">
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">暂无分类数据</div>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                      <div className="flex flex-col">
                        <span className="text-xs font-black">{cat.name}</span>
                        <span className="text-[10px] text-slate-400">{cat.description || '无描述'}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDeleteCategory(cat.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 border-t">
            <Button className="w-full rounded-xl" variant="secondary" onClick={() => setIsCategoryDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 模板管理弹窗 */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="text-lg font-black">模板配置</DialogTitle>
            <DialogDescription className="text-xs">创建常用文档模板，提高创作效率</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">模板名称</Label>
                  <Input value={editingTemplate?.name || ''} onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })} placeholder="例如：新用户指南" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">备注说明</Label>
                  <Input value={editingTemplate?.description || ''} onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })} placeholder="模板描述" className="h-10 rounded-xl" />
                </div>
              </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">模板内容 (支持 HTML)</Label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2 text-primary hover:bg-primary/5 font-black">
                        <Code className="w-3 h-3" />
                        快捷插入
                      </Button>
                    </DialogTrigger>
                    <QuickInsertToolbox 
                      shortcodes={shortcodes}
                      internalPages={internalPages}
                      onInsertShortcode={(key) => insertShortcode(key, 'template')}
                      onInsertInternalLink={(name, path, styles) => insertInternalLink(name, path, styles, 'template')}
                      defaultStyles={linkStyles}
                      onUpdateDefaultStyles={setLinkStyles}
                      onSaveDefaults={handleSaveLinkStyles}
                    />
                  </Dialog>
                </div>
                <div className="border bg-white rounded-xl p-2 min-h-[200px]">
                  <RichTextEditor 
                    ref={templateEditorRef}
                    value={editingTemplate?.content || ''}
                    onChange={v => setEditingTemplate({ ...editingTemplate, content: v })}
                  />
                </div>
              <Button className="w-full h-11 rounded-xl gap-2 mt-2" onClick={handleSaveTemplate}>
                <Save className="w-4 h-4" />
                保存模板
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-slate-700">模板应用方式</span>
                </div>
                <div className="flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <button 
                    onClick={() => setTemplateApplyMode('replace')}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                      templateApplyMode === 'replace' ? "bg-primary text-primary-foreground shadow-md" : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    替换当前
                  </button>
                  <button 
                    onClick={() => setTemplateApplyMode('insert')}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                      templateApplyMode === 'insert' ? "bg-primary text-primary-foreground shadow-md" : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    插入光标
                  </button>
                </div>
              </div>

              <Label className="text-xs font-bold">已有模板列表</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templates.map(tmp => (
                  <div key={tmp.id} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary/30 transition-all flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black">{tmp.name}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setEditingTemplate(tmp)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => {
                          setConfirmConfig({
                            open: true,
                            title: '删除模板',
                            description: '确定要删除这个文档模板吗？',
                            variant: 'danger',
                            action: async () => {
                              await api.deleteGuideTemplate(tmp.id); 
                              fetchData();
                            }
                          });
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{tmp.description || '无描述'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 border-t">
            <Button className="w-full rounded-xl" variant="secondary" onClick={() => setIsTemplateDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 链接样式设置弹窗 */}
      <Dialog open={isStylesDialogOpen} onOpenChange={setIsStylesDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 pb-0">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Palette className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-black">链接样式设置</DialogTitle>
            <DialogDescription>
              设置文档中快捷插入的页面链接默认样式。修改后仅对新插入的链接生效。
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">文字颜色</Label>
                <div className="relative group">
                  <Input 
                    value={linkStyles.textColor} 
                    onChange={e => setLinkStyles({ ...linkStyles, textColor: e.target.value })} 
                    className="h-11 rounded-xl pr-10 font-mono text-xs" 
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg border border-slate-200 overflow-hidden cursor-pointer flex items-center justify-center hover:border-primary">
                    <input 
                      type="color" 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      value={linkStyles.textColor.startsWith('#') ? linkStyles.textColor : '#6366f1'}
                      onChange={e => setLinkStyles({ ...linkStyles, textColor: e.target.value })}
                    />
                    <Palette className="w-4 h-4 text-slate-400 group-hover:text-primary" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">背景颜色</Label>
                <div className="relative group">
                  <Input 
                    value={linkStyles.bgColor} 
                    onChange={e => setLinkStyles({ ...linkStyles, bgColor: e.target.value })} 
                    className="h-11 rounded-xl pr-10 font-mono text-xs" 
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg border border-slate-200 overflow-hidden cursor-pointer flex items-center justify-center hover:border-primary">
                    <input 
                      type="color" 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      value={linkStyles.bgColor.startsWith('#') ? linkStyles.bgColor : '#eef2ff'}
                      onChange={e => setLinkStyles({ ...linkStyles, bgColor: e.target.value })}
                    />
                    <Palette className="w-4 h-4 text-slate-400 group-hover:text-primary" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">内边距</Label>
                <Input value={linkStyles.padding} onChange={e => setLinkStyles({ ...linkStyles, padding: e.target.value })} className="h-11 rounded-xl" placeholder="例如: 2px 8px" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">圆角</Label>
                <Input value={linkStyles.borderRadius} onChange={e => setLinkStyles({ ...linkStyles, borderRadius: e.target.value })} className="h-11 rounded-xl" placeholder="例如: 6px" />
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">效果预览</span>
              <span style={{ 
                backgroundColor: linkStyles.bgColor, 
                color: linkStyles.textColor, 
                padding: linkStyles.padding, 
                borderRadius: linkStyles.borderRadius,
                fontWeight: linkStyles.fontWeight as any,
                fontSize: '14px',
                textDecoration: 'none',
                display: 'inline-block'
              }}>
                演示页面链接
              </span>
            </div>

            <Button className="w-full h-12 rounded-2xl font-black gap-2 shadow-lg shadow-primary/20" onClick={() => { handleSaveLinkStyles(); setIsStylesDialogOpen(false); }}>
              <Save className="w-5 h-5" />
              保存为全局默认
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmConfig.open} onOpenChange={(o) => setConfirmConfig({ ...confirmConfig, open: o })}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className={cn(
              "text-xl font-black flex items-center gap-2",
              confirmConfig.variant === 'danger' ? "text-red-500" : "text-primary"
            )}>
              {confirmConfig.variant === 'danger' ? <Trash2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
              {confirmConfig.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium py-2">
              {confirmConfig.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-bold border-none bg-muted hover:bg-muted/80">取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmConfig.action}
              className={cn(
                "rounded-xl font-bold shadow-lg shadow-primary/20",
                confirmConfig.variant === 'danger' ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-primary hover:bg-primary/90"
              )}
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

