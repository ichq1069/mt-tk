import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, FolderOpen, ChevronRight, ChevronDown, 
  Image, Video, FileText, Grid3X3 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LayoutProps, FolderNode } from '@/types/layouts';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

function buildFolderTree(items: LayoutProps['items']): FolderNode[] {
  const rootFolders = new Map<string, FolderNode>();
  
  items.forEach(item => {
    const categoryName = item.content_categories?.name || '未分类';
    const categoryId = item.category_id || 'none';
    const dateStr = item.created_at ? item.created_at.split('T')[0] : '未知日期';
    
    // 一级：分类
    if (!rootFolders.has(categoryId)) {
      rootFolders.set(categoryId, {
        id: categoryId,
        name: categoryName,
        type: 'folder',
        expanded: true,
        children: []
      });
    }
    
    const categoryFolder = rootFolders.get(categoryId)!;
    
    // 二级：日期
    let dateFolder = categoryFolder.children?.find(c => c.id === `${categoryId}-${dateStr}`);
    if (!dateFolder) {
      dateFolder = {
        id: `${categoryId}-${dateStr}`,
        name: dateStr,
        type: 'folder',
        expanded: false,
        children: []
      };
      categoryFolder.children!.push(dateFolder);
    }
    
    // 三级：媒体项
    dateFolder.children!.push({
      id: item.id,
      name: item.title || '无标题',
      type: 'media',
      item
    });
  });
  
  return Array.from(rootFolders.values());
}

function TreeNode({
  node,
  level = 0,
  onSelect,
  selectedId
}: {
  node: FolderNode;
  level?: number;
  onSelect: (node: FolderNode) => void;
  selectedId?: string;
}) {
  const [expanded, setExpanded] = useState(node.expanded ?? false);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-1.5 py-2 pr-2 rounded-lg cursor-pointer transition-all",
          level === 0 && "font-bold text-sm",
          level === 1 && "text-xs pl-4",
          level >= 2 && "text-xs pl-8",
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSelect(node);
        }}
      >
        {hasChildren && (
          <button
            className="shrink-0 p-0.5 rounded hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        
        {!hasChildren && <div className="w-3.5 shrink-0" />}
        
        {node.type === 'folder' ? (
          expanded ? (
            <FolderOpen className="w-4 h-4 shrink-0 text-primary" />
          ) : (
            <Folder className="w-4 h-4 shrink-0 text-primary/70" />
          )
        ) : node.item?.type === 'video' ? (
          <Video className="w-4 h-4 shrink-0 text-blue-400" />
        ) : (
          <Image className="w-4 h-4 shrink-0 text-emerald-400" />
        )}
        
        <span className="truncate flex-1 min-w-0">{node.name}</span>
        
        {hasChildren && (
          <span className="text-[10px] text-muted-foreground/60 shrink-0">
            {node.children?.length}
          </span>
        )}
      </div>

      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children!.map(child => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                onSelect={onSelect}
                selectedId={selectedId}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FolderTreeLayout({
  items,
  onItemClick,
  onTagClick,
  loading,
  hasMore,
  onLoadMore,
  emptyText = '暂无内容',
  scrollParent
}: LayoutProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || !onLoadMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: '400px',
        root: null
      }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, onLoadMore, loading]);

  const [selectedNode, setSelectedNode] = useState<FolderNode | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const tree = useMemo(() => buildFolderTree(items), [items]);

  const displayItems = useMemo(() => {
    if (!selectedNode) return items;
    
    const collectItems = (node: FolderNode): typeof items => {
      if (node.type === 'media' && node.item) return [node.item];
      if (!node.children) return [];
      return node.children.flatMap(collectItems);
    };
    
    return collectItems(selectedNode);
  }, [selectedNode, items]);

  const handleSelect = useCallback((node: FolderNode) => {
    setSelectedNode(node);
  }, []);

  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Folder className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-sm font-medium">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-0">
      {/* 左侧树形导航 */}
      <div className="w-56 shrink-0 border-r border-border/50 bg-muted/20 flex flex-col">
        <div className="p-3 border-b border-border/30">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            素材分类
          </h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {tree.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                onSelect={handleSelect}
                selectedId={selectedNode?.id}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 工具栏 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
          <p className="text-xs text-muted-foreground">
            {selectedNode ? `${selectedNode.name} · ${displayItems.length} 个作品` : `全部 · ${items.length} 个作品`}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('list')}
            >
              <FileText className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* 内容 */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {displayItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted cursor-pointer"
                    onClick={() => onItemClick?.(item, index)}
                  >
                    <img
                      src={(item.thumbnail_url ?? item.url ?? '') as string}
                      alt={item.title ?? ''}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    {item.type === 'video' && (
                      <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md rounded-full p-1">
                        <Video className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <p className="text-white text-xs font-bold truncate">{item.title}</p>
                    </div>
                  </motion.div>
                ))}
                <div ref={sentinelRef} className="h-10 w-full col-span-full shrink-0" />
              </div>
            ) : (
              <div className="space-y-2">
                {displayItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onItemClick?.(item, index)}
                  >
                    <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                      <img
                        src={(item.thumbnail_url ?? item.url ?? '') as string}
                        alt={item.title ?? ''}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.type === 'video' ? '视频' : '图片'} · {item.created_at?.split('T')[0]}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </motion.div>
                ))}
                <div ref={sentinelRef} className="h-10 w-full shrink-0" />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
