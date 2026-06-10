import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from "sonner";
import { Copy, ExternalLink, Hash, Layout, FileText, Smartphone, Globe, Info } from "lucide-react";

export function PathSection() {
  const [siteUrl, setSiteUrl] = useState('');

  useEffect(() => {
    setSiteUrl(window.location.origin);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('路径已复制');
  };

  const pathGroups = [
    {
      title: "核心页面",
      icon: <Layout className="w-4 h-4" />,
      paths: [
        { name: "首页 / 探索", path: "/" },
        { name: "标签云 (汇总)", path: "/tags" },
        { name: "每日图集 (免密/密访问)", path: "/daily-gallery" },
        { name: "随机美图 (自动刷新)", path: "/refresh-image" },
        { name: "文档中心 (使用说明)", path: "/usage-guide" },
        { name: "登录页", path: "/login" },
        { name: "用户个人中心", path: "/profile" },
        { name: "发布作品", path: "/upload" },
        { name: "消息通知", path: "/notifications" },
      ]
    },
    {
      title: "拼接路径与详情页",
      icon: <Hash className="w-4 h-4" />,
      paths: [
        { name: "媒体详情页", path: "/media/:id" },
        { name: "分类详情页", path: "/category/:id" },
        { name: "标签聚合页", path: "/tag/:id" },
        { name: "用户主页 (外部可见)", path: "/u/:id" },
        { name: "单篇文档详情 (ID 拼接)", path: "/usage-guide/:id" },
      ]
    },
    {
      title: "功能中心",
      icon: <FileText className="w-4 h-4" />,
      paths: [
        { name: "签到中心", path: "/check-in" },
        { name: "积分明细", path: "/points" },
        { name: "极速整理", path: "/fast-organize" },
      ]
    },
    {
      title: "管理后台 (管理员)",
      icon: <Smartphone className="w-4 h-4" />,
      paths: [
        { name: "PC 管理总台", path: "/admin/pc" },
        { name: "移动端审核页", path: "/admin/audit" },
        { name: "移动端用户管理", path: "/admin/users" },
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-black text-foreground">路径信息汇总</h2>
        <p className="text-sm text-muted-foreground mt-1">全站可用路径一览，支持直接复制用于导航 DIY</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pathGroups.map((group, idx) => (
          <Card key={idx} className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                {group.icon}
                {group.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {group.paths.map((p, pIdx) => (
                <div key={pIdx} className="group p-3 bg-muted/20 rounded-2xl border border-border/40 hover:bg-muted/40 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground/70">{p.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 rounded-lg"
                        onClick={() => copyToClipboard(p.path)}
                      >
                        <Hash className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 rounded-lg text-primary"
                        onClick={() => copyToClipboard(`${siteUrl}${p.path}`)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" asChild>
                        <a href={`${p.path}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  <code className="text-[10px] font-mono bg-card px-2 py-1 rounded-md border border-border/40 block break-all">
                    {p.path}
                  </code>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-primary/5">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Info className="w-4 h-4" />
              使用说明
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-3">
            <p>
              1. <span className="font-bold text-foreground">相对路径</span> (如 <code className="bg-white/50 px-1 rounded">/profile</code>): 
              用于系统内部跳转，如“导航栏 DIY”中的路径设置。
            </p>
            <p>
              2. <span className="font-bold text-foreground">绝对路径</span> (如 <code className="bg-white/50 px-1 rounded">{siteUrl}/profile</code>): 
              用于外部链接分享或二维码生成。采用 History 模式路由，提供更加美观的 URL 体验。
            </p>
            <p>
              3. <span className="font-bold text-foreground">动态参数</span>: 
              部分页面可能需要拼接 ID (如 <code className="bg-white/50 px-1 rounded">/item/ID</code>)，请根据实际需求手动替换 ID 部分。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
