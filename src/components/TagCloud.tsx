import React, { useEffect, useState } from 'react';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Tag } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Loader2, Hash, ChevronRight } from 'lucide-react';
import { cn, getRainbowColor } from '@/lib/utils';

interface TagCloudProps {
  onTagClick: (tag: Tag) => void;
  activeTagIds?: string[];
  showHierarchy?: boolean;
}

export function TagCloud({ onTagClick, activeTagIds = [], showHierarchy = false }: TagCloudProps) {
  const { profile } = useAuth();
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      try {
        // 并行获取标签和设置
        const [tagsRes, settingsRes] = await Promise.all([
          api.getTagCloud(),
          api.getRecommendationSettings()
        ]);
        
        const weights = settingsRes.data?.weights || {};
        const excludedTagIds = weights.excluded_discovery_tag_ids || [];
        
        // 过滤标签逻辑与发现页保持一致
        const filteredTags = (tagsRes.data || []).filter((t: any) => {
          if (profile?.role === 'admin') return true;
          
          // 过滤后台配置的屏蔽标签
          if (excludedTagIds.includes(t.id)) return false;
          
          // 保留特定的系统排除标签过滤
          const systemExclusionTags = ['🏷️不入今日图集', '今日图集', '🏷️不入微信草稿库', '微信草稿库'];
          if (systemExclusionTags.some(name => t.name.includes(name))) return false;
          
          return true;
        });
        
        setTags(filteredTags);
      } catch (e) {
        console.error('Failed to fetch tags:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
      </div>
    );
  }

  // 构建标签树结构
  const buildTagTree = (tags: any[]): (any & { children?: any[] })[] => {
    const tagMap = new Map<string, any & { children?: any[] }>();
    tags.forEach(tag => tagMap.set(tag.id, { ...tag, children: [] }));

    const roots: (any & { children?: any[] })[] = [];
    tagMap.forEach(tag => {
      if (tag.parent_id && tagMap.has(tag.parent_id)) {
        tagMap.get(tag.parent_id)!.children!.push(tag);
      } else {
        roots.push(tag);
      }
    });

    // 按权重或数量排序
    const sortByWeight = (a: any, b: any) => {
      if (b.count !== undefined && a.count !== undefined) return b.count - a.count;
      return (b.weight || 0) - (a.weight || 0);
    };
    roots.sort(sortByWeight);
    roots.forEach(root => root.children?.sort(sortByWeight));

    return roots;
  };

  const renderTag = (tag: any & { children?: any[] }, depth = 0) => {
    const weight = tag.count !== undefined ? tag.count * 5 : (tag.weight || 0);
    const sizeClass = 
      weight > 100 ? "text-lg px-4 py-1.5 rounded-2xl" :
      weight > 50 ? "text-base px-3 py-1 rounded-xl" :
      weight > 20 ? "text-sm px-2.5 py-1 rounded-lg" :
      "text-xs px-2 py-0.5 rounded-md";
    
    const isActive = activeTagIds.includes(tag.id);
    const rainbowClass = getRainbowColor(tag.id, isActive);
    
    return (
      <div key={tag.id} className={cn("flex flex-col gap-2", depth > 0 && "ml-6 border-l-2 border-primary/10 pl-4")}>
        <div
          className={cn(
            "cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 w-fit border-2 group",
            sizeClass,
            isActive ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "bg-background border-transparent hover:border-primary/20",
            !isActive && rainbowClass
          )}
          onClick={() => onTagClick(tag)}
        >
          {depth > 0 && <ChevronRight className="w-3 h-3 opacity-50 group-hover:translate-x-1 transition-transform" />}
          <Hash className={cn("w-3.5 h-3.5 opacity-50", isActive ? "text-white" : "text-primary")} />
          <span className="font-bold tracking-tight">{tag.name}</span>
          {tag.count !== undefined && (
            <span className={cn("ml-1 text-[10px] font-black opacity-50")}>{tag.count}</span>
          )}
        </div>
        {showHierarchy && tag.children && tag.children.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tag.children.map((child: any) => renderTag(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (showHierarchy) {
    const tagTree = buildTagTree(tags);
    return (
      <div className="flex flex-wrap gap-2 p-2">
        {tagTree.map(tag => renderTag(tag))}
      </div>
    );
  }

  // 扁平化展示（富有青春、活力设计）
  const sortedTags = [...tags].sort((a, b) => {
    if (b.count !== undefined && a.count !== undefined) return b.count - a.count;
    return (b.weight || 0) - (a.weight || 0);
  });
  
  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-4xl mx-auto py-4 px-2">
      {sortedTags.map((tag, index) => {
        const count = tag.count || 0;
        const weight = count > 0 ? count * 1.2 : (tag.weight || 0);
        
        // 动态调整气泡大小 - 更加适中，避免过大占用空间
        const sizeClass = 
          weight > 100 ? "text-base px-4 py-1.5 rounded-xl" :
          weight > 50 ? "text-sm px-3 py-1 rounded-lg" :
          "text-xs px-2.5 py-0.5 rounded-md";
        
        const isActive = activeTagIds.includes(tag.id);
        const rainbowClass = getRainbowColor(tag.id, isActive);
        
        return (
          <div
            key={tag.id}
            className={cn(
              "group relative transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer flex-shrink-0"
            )}
            onClick={() => onTagClick(tag)}
          >
            <div
              className={cn(
                "flex items-center gap-1 border transition-all duration-300",
                sizeClass,
                isActive 
                  ? "border-primary bg-primary text-primary-foreground shadow-sm" 
                  : "border-border/40 bg-background/40 hover:border-primary/20",
                !isActive && rainbowClass
              )}
            >
              <Hash className={cn("w-3 h-3 opacity-40", isActive ? "text-primary-foreground" : "text-primary")} />
              <span className="font-bold tracking-tight">{tag.name}</span>
              {tag.count !== undefined && (
                <span className={cn(
                  "text-[9px] font-black opacity-40 ml-0.5"
                )}>
                  {tag.count}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default TagCloud;
