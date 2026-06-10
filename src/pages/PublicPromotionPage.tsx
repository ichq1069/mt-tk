import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/db/api';
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from '@/components/ui/button';

export default function PublicPromotionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchPage();
    }
  }, [id]);

  const fetchPage = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getPromotionPage(id!);
      if (error) throw error;
      if (!data) throw new Error('宣传页不存在');
      
      // 如果未发布，除非是管理员预览（此处简化，实际应校验权限）
      setPage(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComponentClick = (props: any) => {
    if (props.link) {
      if (props.link.startsWith('http')) {
        window.open(props.link, '_blank');
      } else {
        navigate(props.link);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">页面加载中...</p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h2 className="text-2xl font-black text-slate-800 mb-2">出错了</h2>
        <p className="text-muted-foreground mb-6">{error || '无法加载页面'}</p>
        <Button onClick={() => navigate('/')} className="rounded-xl px-8">返回首页</Button>
      </div>
    );
  }

  const { content, config } = page;

  return (
    <div 
      className="min-h-screen mx-auto max-w-md shadow-2xl"
      style={{ 
        backgroundColor: config.backgroundColor || '#f8fafc',
        padding: `${config.padding || 16}px`
      }}
    >
      <div className="space-y-4">
        {content.map((comp: any) => (
          <div 
            key={comp.id} 
            onClick={() => handleComponentClick(comp.props)}
            className={comp.props.link ? "cursor-pointer active:opacity-80 transition-opacity" : ""}
          >
            {renderComponent(comp)}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderComponent(comp: any) {
  const { type, props } = comp;

  switch (type) {
    case 'text':
      return (
        <div 
          style={{ 
            fontSize: `${props.fontSize}px`, 
            color: props.color, 
            textAlign: props.align,
            fontWeight: props.fontWeight,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap'
          }}
        >
          {props.content}
        </div>
      );
    case 'image':
      return (
        <img 
          src={props.src} 
          alt="宣传图片" 
          className="w-full h-auto block"
          style={{ borderRadius: `${props.borderRadius}px` }}
        />
      );
    case 'button':
      return (
        <button 
          className="w-full py-4 font-black text-center shadow-lg active:scale-95 transition-transform"
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
          className="w-full"
          style={{ 
            height: `${props.height}px`, 
            backgroundColor: props.color
          }}
        />
      );
    case 'video':
      return (
        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-xl">
          <video referrerPolicy="no-referrer" 
            src={props.src} 
            poster={props.poster}
            controls
            className="w-full h-full"
            autoPlay={props.autoplay}
            muted={props.muted}
            {...({ referrerPolicy: "no-referrer" } as any)}
          />
        </div>
      );
    default:
      return null;
  }
}
