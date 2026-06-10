import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/db/supabase';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Search, RefreshCw, ZoomIn, ZoomOut, Maximize2, Users, 
  UserCircle, Network, ArrowRight, MousePointer2, ChevronRight, ChevronDown, Activity
} from "lucide-react";
import { toast } from "sonner";
import { useAdminLogger } from '@/hooks/useAdminLogger';

interface NetworkNode {
  id: string;
  username: string;
  avatar_url?: string;
  referrer_id?: string;
  group_name?: string;
  children: NetworkNode[];
  depth: number;
}

export function UserNetworkSection() {
  const { logAction } = useAdminLogger('network');
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNetwork();
  }, []);

  const fetchNetwork = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_referral_tree');
      if (error) throw error;
      
      const rawUsers = (data as any[]) || [];
      setAllUsers(rawUsers);
      
      // 构建树形结构
      const buildTree = (users: any[]) => {
        const nodeMap: Record<string, NetworkNode> = {};
        const roots: NetworkNode[] = [];

        users.forEach(u => {
          nodeMap[u.id] = { ...u, children: [], depth: 0 };
        });

        users.forEach(u => {
          if (u.referrer_id && nodeMap[u.referrer_id]) {
            nodeMap[u.referrer_id].children.push(nodeMap[u.id]);
          } else {
            roots.push(nodeMap[u.id]);
          }
        });

        // 计算深度
        const calcDepth = (node: NetworkNode, depth: number) => {
          node.depth = depth;
          node.children.forEach(c => calcDepth(c, depth + 1));
        };
        roots.forEach(r => calcDepth(r, 0));

        return roots;
      };

      setNodes(buildTree(rawUsers));
      
      // 默认展开第一层
      const initialExpanded = new Set<string>();
      rawUsers.forEach(u => {
        if (!u.referrer_id) initialExpanded.add(u.id);
      });
      setExpandedNodes(initialExpanded);

    } catch (e: any) {
      toast.error(`获取关系图失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  const renderNode = (node: NetworkNode) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="ml-6 border-l border-muted-foreground/10 pl-4 py-2 relative">
        <div className="flex items-center gap-3 group">
          <div className="absolute -left-[17px] top-5 w-4 h-px bg-muted-foreground/10" />
          
          <button 
            onClick={() => hasChildren && toggleExpand(node.id)}
            className={cn(
              "w-5 h-5 flex items-center justify-center rounded-md border border-border bg-card hover:bg-muted transition-colors z-10",
              !hasChildren && "opacity-0 cursor-default"
            )}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          <div className={cn(
            "flex items-center gap-3 p-2 pr-4 rounded-2xl border bg-card shadow-sm group-hover:shadow-md transition-all duration-300",
            node.referrer_id ? "border-border/60" : "border-primary/20 bg-primary/5"
          )}>
            <Avatar className="w-8 h-8 border-2 border-white shadow-sm">
              <AvatarImage src={node.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                {node.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-foreground">{node.username}</span>
                {node.group_name && (
                  <Badge variant="outline" className="text-[10px] h-4 rounded-md font-bold px-1 py-0 border-primary/20 text-primary/60">
                    {node.group_name}
                  </Badge>
                )}
              </div>
              <span className="text-[9px] text-muted-foreground">
                {hasChildren ? `已邀请 ${node.children.length} 人` : '暂未邀请用户'}
              </span>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1 animate-in slide-in-from-left-2 duration-300">
            {node.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  const filteredRoots = nodes.filter(n => {
    if (!searchTerm) return true;
    const matches = (node: NetworkNode): boolean => {
      return node.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
             node.children.some(c => matches(c));
    };
    return matches(n);
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">用户关系图</h2>
          <p className="text-sm text-muted-foreground mt-1">查看全站用户的邀请层级与裂变网络</p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="搜索用户名..." 
              className="rounded-xl pl-9" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchNetwork} className="rounded-xl">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-primary/5 md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              关系统计
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center bg-white/40 p-3 rounded-2xl">
              <span className="text-xs text-muted-foreground">总用户数</span>
              <span className="text-lg font-black">{allUsers.length}</span>
            </div>
            <div className="flex justify-between items-center bg-white/40 p-3 rounded-2xl">
              <span className="text-xs text-muted-foreground">顶级账号</span>
              <span className="text-lg font-black">{nodes.length}</span>
            </div>
            <div className="flex justify-between items-center bg-white/40 p-3 rounded-2xl">
              <span className="text-xs text-muted-foreground">产生邀请</span>
              <span className="text-lg font-black text-green-600">
                {allUsers.filter(u => allUsers.some(r => r.referrer_id === u.id)).length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl overflow-hidden md:col-span-3 min-h-[600px] flex flex-col">
          <CardHeader className="bg-muted/30 border-b border-border/40">
            <CardTitle className="text-lg flex items-center gap-2">
              <Network className="w-5 h-5 text-primary" />
              邀请裂变树
            </CardTitle>
            <CardDescription>层级化的用户邀请分布图</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-6 md:p-8 bg-slate-50/30">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary/30 mb-4" />
                <p className="text-xs text-muted-foreground">正在构建网络拓扑...</p>
              </div>
            ) : filteredRoots.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Network className="w-12 h-12 mb-4 opacity-10" />
                <p>未发现符合条件的用户关系</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRoots.map(root => (
                  <div key={root.id} className="mb-4">
                    {renderNode(root)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
