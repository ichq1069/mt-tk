import React, { useState, useEffect } from 'react';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search, ChevronRight, Hash, Zap, Trophy, Settings, Users, FileCheck, Image as ImageIcon, Bell, Globe, Monitor, Database, Key, Mail, Cloud, Shield, Smartphone, RefreshCcw, Code, MessageSquare, ListFilter, Star, CalendarCheck, FolderOpen, Tag as TagIcon, Filter, TrendingUp, FileCode2, FileText, Trash2, Flame, UserPlus, BarChart3, Upload } from 'lucide-react';
import { cn } from "@/lib/utils";

interface AdminQuickSearchProps {
  menuGroups: any[];
  canAccess: (perm: string) => boolean;
  onSelect: (id: string, tab?: string) => void;
}

const internalSettings = [
  // 一级目录/二级目录引导 (系统参数设置)
  { id: 'storage', tab: 'basic', label: '网站基本信息', keyword: '标题 logo 简介 站点', icon: <Settings className="w-4 h-4" /> },
  { id: 'storage', tab: 'image', label: '图片管理 / 水印设置', keyword: '水印 image 图片 透明度 铺满 布局', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'storage', tab: 'smtp', label: 'SMTP 邮件系统', keyword: '邮箱 发信 邮件 密码 host port smtp', icon: <Mail className="w-4 h-4" /> },
  { id: 'storage', tab: 'storage', label: 'Cloudflare R2 存储', keyword: '存储 r2 cloudflare s3 bucket 对象存储', icon: <Cloud className="w-4 h-4" /> },
  { id: 'storage', tab: 'access', label: '访问控制', keyword: '登录 注册 基本参数 强制登录 微信绑定 注册模式 微信只读 启用公众号绑定 启用微信公众号登录 redirect 公众号 资源保护 blob 切片 缓存命中率', icon: <Shield className="w-4 h-4" /> },
  { id: 'storage', tab: 'upload', label: '上传功能配置 (上传页设置)', keyword: '上传 缩略图 压缩率 分类 标签 正则 命名规则 默认值 upload thumbnail naming regex 齿轮图标', icon: <Upload className="w-4 h-4" /> },
  { id: 'storage', tab: 'logs', label: '系统操作日志', keyword: '日志 记录 审计 history', icon: <FileCode2 className="w-4 h-4" /> },
  
  // 域名设置
  { id: 'domains', label: '多域名映射', keyword: '域名 domain 反代 映射 cname', icon: <Globe className="w-4 h-4" /> },
  
  // 站长工具
  { id: 'webmaster', tab: 'paths', label: '全站路径管理', keyword: '路径 path 路由 链接', icon: <Hash className="w-4 h-4" /> },
  { id: 'webmaster', tab: 'shortcodes', label: '短代码大全', keyword: '短代码 shortcode 变量 variable', icon: <Code className="w-4 h-4" /> },
  { id: 'webmaster', tab: 'replacements', label: '关键词替换', keyword: '替换 敏感词 过滤 replace word', icon: <RefreshCcw className="w-4 h-4" /> },
  { id: 'webmaster', tab: 'global_assets', label: '全站资源 (JS/CSS)', keyword: '资源 asset js css 统计代码 head 头部 脚本', icon: <FileCode2 className="w-4 h-4" /> },
  { id: 'webmaster', tab: 'pixel_config', label: '统计代码配置工具', keyword: '统计 pixel 跟踪 track google analytics baidu', icon: <Zap className="w-4 h-4" /> },
  
  // 微信管理
  { id: 'wechat', label: '微信公众号对接 (AppID / Secret)', keyword: 'appid secret token 微信 wechat 公众号 绑定 配置', icon: <Zap className="w-4 h-4" /> },
  { id: 'wechat_draft', label: '微信公众号草稿箱', keyword: '草稿 draft 图文 素材 推送 公众号', icon: <FileText className="w-4 h-4" /> },
  { id: 'wechat_keywords', label: '微信关键词回复', keyword: '自动回复 机器人 关键词 微信', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'wechat_menu', label: '微信菜单配置', keyword: '自定义菜单 微信 导航 menu', icon: <ListFilter className="w-4 h-4" /> },
  { id: 'wechat_fans', label: '粉丝列表管理', keyword: '粉丝 关注 微信 用户 fans', icon: <Users className="w-4 h-4" /> },
  
  // 体系管理
  { id: 'idConfig', label: '数字 ID 配置 (靓号)', keyword: '靓号 长度 id 起始值 商店', icon: <Hash className="w-4 h-4" /> },
  { id: 'ranks', label: '等级与成长值', keyword: '等级 rank 成长值 经验 level 阈值', icon: <Trophy className="w-4 h-4" /> },
  { id: 'badges', label: '勋章系统管理', keyword: '勋章 badge 荣誉 成就', icon: <Star className="w-4 h-4" /> },
  { id: 'signin', label: '签到规则管理', keyword: '签到 checkin 奖励 连续签到', icon: <CalendarCheck className="w-4 h-4" /> },
  { id: 'points', label: '积分规则配置', keyword: '积分 point 规则 奖励 消耗', icon: <Zap className="w-4 h-4" /> },
  
  // 内容管理
  { id: 'categories', label: '内容分类管理 (定义)', keyword: '分类 category 频道 栏目', icon: <FolderOpen className="w-4 h-4" /> },
  { id: 'category_content', label: '已分类内容池', keyword: '归类 分类 分类内容 资源', icon: <ListFilter className="w-4 h-4" /> },
  { id: 'tags', label: '全站标签池', keyword: '标签 tag 聚合 管理', icon: <TagIcon className="w-4 h-4" /> },
  { id: 'duplicates', label: '相似度查重', keyword: '查重 重复 duplicate 相似度 hash', icon: <Filter className="w-4 h-4" /> },
  { id: 'recommendation', label: '推荐系统设置', keyword: '推荐 recommend 算法 权重 热门', icon: <TrendingUp className="w-4 h-4" /> },
  
  // 其它
  { id: 'navigation', label: '导航栏 DIY', keyword: '底部导航 tabbar diy 自定义', icon: <Smartphone className="w-4 h-4" /> },
  { id: 'notifications', label: '站内通知管理', keyword: '通知 消息 弹窗 notification', icon: <Bell className="w-4 h-4" /> },
  { id: 'userFields', label: '自定义用户字段', keyword: '字段 field 用户信息 扩展', icon: <Users className="w-4 h-4" /> },
  { id: 'guides', label: '文档管理', keyword: '文档 guide 说明 教程 帮助手册', icon: <FileText className="w-4 h-4" /> },
  { id: 'db', label: '数据库 SQL 编辑器', keyword: 'sql 数据库 query 查询 导出 导入 脚本', icon: <Database className="w-4 h-4" /> },
  { id: 'redemption', label: '兑换码与核销', keyword: '兑换码 礼品码 核销 code gift', icon: <Key className="w-4 h-4" /> },
  { id: 'ads', label: '全站广告管理', keyword: '广告 ad 投放 流量 变现', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'recycle_bin', label: '媒体库回收站', keyword: '回收站 恢复 彻底删除 trash bin', icon: <Trash2 className="w-4 h-4" /> },
  { id: 'fast_leveling', label: '写真极速分级', icon: <Zap className="w-4 h-4" />, keyword: '写真 分级 快速整理 批量 级别 整理' },
  { id: 'albums', label: '图集写真管理', icon: <FolderOpen className="w-4 h-4" />, keyword: '图集 专辑 album 写真' },
  { id: 'points', label: '积分记录管理', icon: <Flame className="w-4 h-4" />, keyword: '积分 point 流水 变更原因' },
  { id: 'growth', label: '成长值流水', icon: <TrendingUp className="w-4 h-4" />, keyword: '成长值 经验 level growth' },
  { id: 'ranks', label: '等级划分设置', icon: <Trophy className="w-4 h-4" />, keyword: '等级 rank level 门槛 权限组' },
  { id: 'specialIds', label: '靓号池管理', icon: <Star className="w-4 h-4" />, keyword: '靓号 靓号池 special id' },
  { id: 'content', label: '内容审核与举报', keyword: '审核 举报 投诉 audit report', icon: <FileCheck className="w-4 h-4" /> },
  { id: 'invites', label: '邀请注册管理', keyword: '邀请 invite 注册 奖励 用户', icon: <UserPlus className="w-4 h-4" /> },
  { id: 'datacenter', label: '大数据分析中心', keyword: '统计 数据 analysis stat 趋势', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'ranking', label: '收藏排行榜单', keyword: '排行 榜单 top hot ranking', icon: <Trophy className="w-4 h-4" /> },

  { id: 'idConfig', label: 'ID 分配规则', icon: <Hash className="w-4 h-4" />, keyword: '分配 长度 起始值 rule id' },
  { id: 'checkin', label: '签到系统配置', icon: <CalendarCheck className="w-4 h-4" />, keyword: '签到 checkin 规则 连续奖励' },
  { id: 'badges', label: '勋章系统管理', icon: <ImageIcon className="w-4 h-4" />, keyword: '勋章 badge 荣誉 称号' },
  { id: 'wechat_follow', label: '微信关注入库', keyword: '关注 同步 入库 粉丝 微信', icon: <Users className="w-4 h-4" /> },
  { id: 'wechat_auto', label: '微信自动应答', keyword: '回复 消息 自动 微信', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'wechat_messages', label: '微信消息记录', keyword: '消息 对话 聊天 微信', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'reports', label: '举报内容管理', keyword: '举报 投诉 内容 audit report', icon: <Shield className="w-4 h-4" /> },
];


export function AdminQuickSearch({ menuGroups, canAccess, onSelect }: AdminQuickSearchProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const allItems = menuGroups.flatMap(group => 
    group.items.flatMap((item: any) => {
      const items = [{ ...item, groupName: group.label }];
      if (item.children) {
        item.children.forEach((child: any) => {
          items.push({ ...child, groupName: group.label, parentId: item.id });
        });
      }
      return items;
    })
  ).filter(item => canAccess(item.perm));

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full md:w-[260px] justify-between rounded-xl bg-slate-100/50 border-none h-10 px-4 group hover:bg-slate-100 transition-all"
        >
          <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
            <Search className="h-4 w-4" />
            <span className="text-sm font-medium">快速搜索设置项...</span>
          </div>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 rounded-2xl border-none shadow-2xl overflow-hidden" align="start">
        <Command className="rounded-none">
          <CommandInput 
            placeholder="输入功能名称关键字..." 
            className="h-12 border-none focus:ring-0" 
            value={value}
            onValueChange={setValue}
          />
          <CommandList className="max-h-[400px]">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">未找到匹配的功能项</CommandEmpty>
            
            <CommandGroup heading="系统设置项" className="px-2">
              {internalSettings.filter(s => 
                s.label.toLowerCase().includes(value.toLowerCase()) || 
                (s.keyword && s.keyword.toLowerCase().includes(value.toLowerCase()))
              ).map(s => (
                <CommandItem
                  key={`${s.id}-${s.tab || ''}`}
                  value={`${s.label} ${s.keyword || ''}`}
                  onSelect={() => {
                    onSelect(s.id, s.tab);
                    setOpen(false);
                  }}
                  className="rounded-xl flex items-center justify-between py-2.5 px-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                      {s.icon}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{s.label}</span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1">{s.keyword ? `关键词: ${s.keyword}` : '直达详情页配置项'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </CommandItem>
              ))}
            </CommandGroup>

            {menuGroups.map((group) => {
              const accessibleItems = group.items.flatMap((item: any) => {
                const items = [];
                if (canAccess(item.perm)) items.push({ ...item, isParent: true, groupLabel: group.label });
                if (item.children) {
                  item.children.forEach((child: any) => {
                    if (canAccess(child.perm)) items.push({ ...child, parentLabel: item.label, groupLabel: group.label });
                  });
                }
                return items;
              });

              if (accessibleItems.length === 0) return null;

              return (
                <CommandGroup key={group.label} heading={group.label} className="px-2">
                  {accessibleItems.map((item: any) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.label} ${item.parentLabel || ''} ${group.label}`}
                      onSelect={() => {
                        onSelect(item.id);
                        setOpen(false);
                      }}
                      className="rounded-xl flex items-center justify-between py-2.5 px-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
                          {React.isValidElement(item.icon) ? React.cloneElement(item.icon as any, { className: "w-4 h-4" }) : item.icon}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{item.label}</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                            {item.groupLabel} {item.parentLabel ? ` ➔ ${item.parentLabel}` : ''}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
