import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { Loader2, ChevronLeft, Share2, Eye, Calendar, BookOpen, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

import DOMPurify from 'dompurify';

import '@wangeditor/editor/dist/css/style.css';

export default function UsageGuide() {
  const { id } = useParams<{ id: string }>();
  const [guide, setGuide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processedContent, setProcessedContent] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchGuide();
    }
  }, [id]);

  const fetchGuide = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getGuide(id!);
      if (error) throw error;
      
      // 处理短代码替换
      let content = data.content || '';
      
      // 1. 获取基础信息
      const { data: { user } } = await supabase.auth.getUser();
      let profile = null;
      if (user) {
        const { data: p } = await api.getProfile(user.id);
        profile = p;
      }
      
      const { data: shortcodesRes } = await api.getShortcodes();
      const shortcodes = shortcodesRes || [];
      
      // 3. 获取站点配置
      let siteTitle = '图片视频赏析Web应用';
      try {
        const { data: config } = await api.getSystemConfig('site_title');
        if (config?.value) siteTitle = config.value;
      } catch (e) {
        // Fallback to default
      }
      
      // 2. 执行替换逻辑
      const now = new Date();
      const replacements: Record<string, string> = {
        'user.name': profile?.username || '访客',
        'date.yyyy-mm-dd': now.toISOString().split('T')[0],
        'site.title': siteTitle
      };
      
      // 替换内置短代码
      Object.entries(replacements).forEach(([key, val]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        content = content.replace(regex, val);
      });
      
      // 替换数据库中的自定义短代码
      shortcodes.forEach((s: any) => {
        const regex = new RegExp(`\\{\\{${s.key}\\}\\}`, 'g');
        content = content.replace(regex, s.value || '');
      });
      
      setGuide(data);
      setProcessedContent(content);
      
      // 增加阅读量
      api.incrementGuideView(id!).catch(() => {});
    } catch (error: any) {
      toast.error('无法加载说明文档: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('链接已复制到剪贴板，快去分享吧！');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50/50">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-slate-500 font-medium">正在开启智慧大门...</p>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50/50 text-center">
        <BookOpen className="w-16 h-16 text-slate-300 mb-4" />
        <h1 className="text-2xl font-black text-slate-800">找不到该文档</h1>
        <p className="text-slate-500 mt-2 mb-8">该文档可能已被删除或设为私有</p>
        <Button asChild className="rounded-full px-8">
          <Link to="/">返回首页</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/30 pb-20">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link to="/">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex-1 text-center truncate px-4">
            <span className="text-sm font-black text-slate-800">系统使用手册</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleShare} className="rounded-full">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 leading-tight mb-4">{guide.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-slate-500">
            {guide.system_guide_categories && (
              <Badge variant="outline" className="text-xs bg-primary/5 text-primary rounded-full px-3 py-0.5 border-primary/20 flex items-center gap-1">
                <FolderOpen className="w-3 h-3" />
                {guide.system_guide_categories.name}
              </Badge>
            )}
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>发布于 {new Date(guide.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Eye className="w-3.5 h-3.5" />
              <span>{guide.view_count || 0} 次阅读</span>
            </div>
            {!guide.system_guide_categories && (
              <Badge variant="outline" className="text-[10px] bg-white rounded-full px-2 py-0 border-slate-200 text-slate-500">
                官方教程
              </Badge>
            )}
          </div>
        </div>

        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardContent className="p-8 prose prose-slate max-w-none">
            {/* 同时支持富文本 HTML 和旧的 Markdown 风格 */}
            {processedContent?.includes('<') ? (
              <div 
                className="rich-text-content w-e-text-container"
                style={{ height: 'auto', border: 'none' }}
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(processedContent.replace(/\\n/g, '<br/>'), {
                    ADD_ATTR: ['style', 'target'],
                    ADD_TAGS: ['iframe']
                  }) 
                }} 
              />
            ) : (
              processedContent?.replace(/\\n/g, '\n').split('\n').map((line: string, i: number) => {
                if (line.startsWith('### ')) {
                  return <h3 key={i} className="text-xl font-black text-slate-800 mt-8 mb-4">{line.replace('### ', '')}</h3>;
                }
                if (line.startsWith('## ')) {
                  return <h2 key={i} className="text-2xl font-black text-slate-800 mt-10 mb-6">{line.replace('## ', '')}</h2>;
                }
                if (line.startsWith('# ')) {
                  return <h1 key={i} className="text-3xl font-black text-slate-800 mt-12 mb-8">{line.replace('# ', '')}</h1>;
                }
                if (line.trim() === '') {
                  return <br key={i} />;
                }
                return <p key={i} className="text-slate-600 leading-relaxed mb-4">{line}</p>;
              })
            )}
          </CardContent>
        </Card>

        <div className="mt-12 text-center">
          <p className="text-xs text-slate-400 mb-6 italic">--- 如果您还有其他问题，请联系管理员 ---</p>
          <Button variant="outline" onClick={handleShare} className="rounded-full gap-2 border-slate-200 bg-white">
            <Share2 className="w-4 h-4" />
            分享给小伙伴
          </Button>
        </div>
      </main>
    </div>
  );
}
