import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Smartphone, 
  Type, 
  Image as ImageIcon, 
  Video, 
  MousePointerClick, 
  Minus, 
  Clock, 
  Layers, 
  Settings,
  Trash2,
  Plus,
  GripVertical,
  Loader2
} from "lucide-react";
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { Reorder, useDragControls } from "framer-motion";

interface PromotionEditorProps {
  page: any;
  onBack: () => void;
}

// 组件类型定义
type ComponentType = 'text' | 'image' | 'video' | 'button' | 'divider' | 'countdown' | 'carousel';

interface ComponentData {
  id: string;
  type: ComponentType;
  props: Record<string, any>;
}

// 组件库配置
const COMPONENT_LIBRARY = [
  { type: 'text', label: '文本', icon: <Type className="w-4 h-4" />, defaultProps: { content: '双击编辑文本', fontSize: 16, color: '#000000', align: 'left', fontWeight: 'normal' } },
  { type: 'image', label: '图片', icon: <ImageIcon className="w-4 h-4" />, defaultProps: { src: 'https://via.placeholder.com/300x200', borderRadius: 8, link: '' } },
  { type: 'video', label: '视频', icon: <Video className="w-4 h-4" />, defaultProps: { src: '', poster: '', autoplay: false, muted: true } },
  { type: 'button', label: '按钮', icon: <MousePointerClick className="w-4 h-4" />, defaultProps: { text: '点击按钮', bgColor: '#3b82f6', textColor: '#ffffff', borderRadius: 8, link: '' } },
  { type: 'divider', label: '分隔线', icon: <Minus className="w-4 h-4" />, defaultProps: { height: 1, color: '#e5e7eb', style: 'solid' } },
  { type: 'countdown', label: '倒计时', icon: <Clock className="w-4 h-4" />, defaultProps: { endTime: new Date(Date.now() + 86400000).toISOString(), format: 'HH:mm:ss' } },
];

export function PromotionEditor({ page, onBack }: PromotionEditorProps) {
  const [title, setTitle] = useState(page.title);
  const [components, setComponents] = useState<ComponentData[]>(page.content || []);
  const [selectedComponent, setSelectedComponent] = useState<ComponentData | null>(null);
  const [config, setConfig] = useState(page.config || { backgroundColor: '#f8fafc', padding: 16 });
  const [saving, setSaving] = useState(false);

  const handleAddComponent = (type: ComponentType) => {
    const template = COMPONENT_LIBRARY.find(c => c.type === type);
    if (!template) return;
    
    const newComponent: ComponentData = {
      id: `${type}_${Date.now()}`,
      type,
      props: { ...template.defaultProps }
    };
    
    setComponents([...components, newComponent]);
    setSelectedComponent(newComponent);
    toast.success(`已添加${template.label}组件`);
  };

  const handleDeleteComponent = (id: string) => {
    setComponents(components.filter(c => c.id !== id));
    if (selectedComponent?.id === id) setSelectedComponent(null);
    toast.success('组件已删除');
  };

  const handleUpdateComponent = (id: string, props: Record<string, any>) => {
    setComponents(components.map(c => c.id === id ? { ...c, props: { ...c.props, ...props } } : c));
    if (selectedComponent?.id === id) {
      setSelectedComponent({ ...selectedComponent, props: { ...selectedComponent.props, ...props } });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await api.updatePromotionPage(page.id, {
        title,
        content: components,
        config,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      toast.success('保存成功');
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    window.open(`/promotion/${page.id}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col">
      {/* 顶部工具栏 */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-primary" />
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="h-9 w-64 font-bold border-none focus-visible:ring-primary"
              placeholder="宣传页标题"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handlePreview} className="rounded-xl">
            <Eye className="w-4 h-4 mr-2" />
            预览
          </Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl font-bold px-6">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            保存
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧组件库 */}
        <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-primary" />
            <h3 className="font-black text-sm">组件库</h3>
          </div>
          {COMPONENT_LIBRARY.map(comp => (
            <button
              key={comp.type}
              onClick={() => handleAddComponent(comp.type as ComponentType)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center text-slate-600 group-hover:text-primary transition-colors">
                {comp.icon}
              </div>
              <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">{comp.label}</span>
            </button>
          ))}
        </div>

        {/* 中间画布 */}
        <div className="flex-1 bg-slate-100 overflow-y-auto p-8 flex justify-center">
          <div className="w-full max-w-md">
            <div 
              className="bg-white rounded-3xl shadow-2xl overflow-hidden"
              style={{ 
                backgroundColor: config.backgroundColor,
                padding: `${config.padding}px`
              }}
            >
              {components.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <Layers className="w-16 h-16 mx-auto opacity-20 mb-4" />
                  <p className="text-sm">从左侧拖入组件开始设计</p>
                </div>
              ) : (
                <Reorder.Group axis="y" values={components} onReorder={setComponents} className="space-y-3">
                  {components.map(comp => (
                    <Reorder.Item key={comp.id} value={comp} className="group">
                      <ComponentRenderer 
                        component={comp} 
                        isSelected={selectedComponent?.id === comp.id}
                        onSelect={() => setSelectedComponent(comp)}
                        onDelete={() => handleDeleteComponent(comp.id)}
                      />
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </div>
          </div>
        </div>

        {/* 右侧属性面板 */}
        <div className="w-80 bg-white border-l border-slate-200 overflow-y-auto p-4">
          {selectedComponent ? (
            <PropertyPanel 
              component={selectedComponent} 
              onUpdate={(props) => handleUpdateComponent(selectedComponent.id, props)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Settings className="w-16 h-16 opacity-20 mb-4" />
              <p className="text-sm text-center">选中组件后<br/>在此编辑属性</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 组件渲染器
function ComponentRenderer({ component, isSelected, onSelect, onDelete }: { 
  component: ComponentData; 
  isSelected: boolean; 
  onSelect: () => void;
  onDelete: () => void;
}) {
  const controls = useDragControls();

  return (
    <div 
      onClick={onSelect}
      className={cn(
        "relative p-3 rounded-xl border-2 transition-all cursor-pointer group",
        isSelected ? "border-primary bg-primary/5" : "border-transparent hover:border-slate-300"
      )}
    >
      <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div 
          className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => controls.start(e)}
        >
          <GripVertical className="w-3 h-3 text-slate-600" />
        </div>
      </div>
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          variant="destructive" 
          size="icon" 
          className="w-6 h-6 rounded"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      <ComponentPreview component={component} />
    </div>
  );
}

// 组件预览
function ComponentPreview({ component }: { component: ComponentData }) {
  const { type, props } = component;

  switch (type) {
    case 'text':
      return (
        <div 
          style={{ 
            fontSize: `${props.fontSize}px`, 
            color: props.color, 
            textAlign: props.align,
            fontWeight: props.fontWeight
          }}
        >
          {props.content}
        </div>
      );
    case 'image':
      return (
        <img referrerPolicy="no-referrer" 
          src={props.src} 
          alt="组件图片" 
          className="w-full object-contain"
          style={{ borderRadius: `${props.borderRadius}px` }}
        />
      );
    case 'button':
      return (
        <button 
          className="w-full py-3 font-bold text-center"
          style={{ 
            backgroundColor: props.bgColor, 
            color: props.textColor,
            borderRadius: `${props.borderRadius}px`
          }}
        >
          {props.text}
        </button>
      );
    case 'divider':
      return (
        <div 
          style={{ 
            height: `${props.height}px`, 
            backgroundColor: props.color,
            borderStyle: props.style
          }}
        />
      );
    default:
      return <div className="text-xs text-slate-400">未知组件类型</div>;
  }
}

// 属性面板
function PropertyPanel({ component, onUpdate }: { 
  component: ComponentData; 
  onUpdate: (props: Record<string, any>) => void;
}) {
  const { type, props } = component;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-black text-sm mb-1 flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          组件属性
        </h3>
        <p className="text-xs text-muted-foreground">编辑选中组件的样式与行为</p>
      </div>

      {type === 'text' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">文本内容</Label>
            <Textarea 
              value={props.content} 
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="rounded-xl"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">字号: {props.fontSize}px</Label>
            <Slider 
              value={[props.fontSize]} 
              onValueChange={([val]) => onUpdate({ fontSize: val })}
              min={12}
              max={48}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">颜色</Label>
            <Input 
              type="color" 
              value={props.color} 
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="h-10 rounded-xl"
            />
          </div>
        </>
      )}

      {type === 'image' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">图片地址</Label>
            <Input 
              value={props.src} 
              onChange={(e) => onUpdate({ src: e.target.value })}
              placeholder="https://..."
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">圆角: {props.borderRadius}px</Label>
            <Slider 
              value={[props.borderRadius]} 
              onValueChange={([val]) => onUpdate({ borderRadius: val })}
              min={0}
              max={50}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">点击跳转链接</Label>
            <Input 
              value={props.link || ''} 
              onChange={(e) => onUpdate({ link: e.target.value })}
              placeholder="留空则不跳转"
              className="rounded-xl"
            />
          </div>
        </>
      )}

      {type === 'button' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">按钮文字</Label>
            <Input 
              value={props.text} 
              onChange={(e) => onUpdate({ text: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">背景色</Label>
            <Input 
              type="color" 
              value={props.bgColor} 
              onChange={(e) => onUpdate({ bgColor: e.target.value })}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">文字颜色</Label>
            <Input 
              type="color" 
              value={props.textColor} 
              onChange={(e) => onUpdate({ textColor: e.target.value })}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">点击跳转链接</Label>
            <Input 
              value={props.link || ''} 
              onChange={(e) => onUpdate({ link: e.target.value })}
              placeholder="留空则不跳转"
              className="rounded-xl"
            />
          </div>
        </>
      )}

      {type === 'divider' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">高度: {props.height}px</Label>
            <Slider 
              value={[props.height]} 
              onValueChange={([val]) => onUpdate({ height: val })}
              min={1}
              max={10}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">颜色</Label>
            <Input 
              type="color" 
              value={props.color} 
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="h-10 rounded-xl"
            />
          </div>
        </>
      )}
    </div>
  );
}
