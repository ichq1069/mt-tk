import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import type { StorageConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Save, Play, Info, Settings2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from "@/components/ui/slider";

export function PlayerSection() {
  const [config, setConfig] = useState<Partial<StorageConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playerType, setPlayerType] = useState<'h5' | 'artplayer' | 'xgplayer'>('h5');
  const [playerSettings, setPlayerSettings] = useState<any>({
    // H5 播放器设置
    h5: {
      autoplay: true,
      loop: true,
      controls: true,
      muted: true,
      playsinline: true,
      preload: 'auto'
    },
    // ArtPlayer 设置
    artplayer: {
      autoplay: true,
      loop: true,
      muted: true,
      playbackRate: true,
      aspectRatio: true,
      setting: true,
      hotkey: true,
      pip: true,
      fullscreen: true,
      fullscreenWeb: true,
      miniProgressBar: true,
      mutex: true,
      backdrop: true,
      playsInline: true,
      autoPlayback: true,
      airplay: true,
      theme: '#3b82f6',
      lang: 'zh-cn',
      volume: 0.5,
      screenshot: false,
      fastForward: true
    },
    // 西瓜播放器设置
    xgplayer: {
      autoplay: true,
      loop: true,
      volume: 0.5,
      playbackRate: [0.5, 0.75, 1, 1.25, 1.5, 2],
      defaultPlaybackRate: 1,
      pip: true,
      screenShot: false,
      rotate: false,
      download: false,
      playsinline: true,
      fluid: true,
      fitVideoSize: 'auto',
      videoInit: true,
      closeVideoClick: false,
      closeVideoTouch: false,
      ignores: [],
      lang: 'zh-cn'
    }
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await api.getStorageConfig();
      if (error) throw error;
      if (data) {
        setConfig(data);
        setPlayerType(data.player_type || 'h5');
        if (data.player_settings) {
          setPlayerSettings((prev: any) => ({
            ...prev,
            ...data.player_settings
          }));
        }
      }
    } catch (error: any) {
      toast.error(`获取配置失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await api.upsertStorageConfig({
        ...config,
        player_type: playerType,
        player_settings: playerSettings
      });
      if (error) throw error;
      toast.success('播放器配置已保存');
    } catch (error: any) {
      toast.error(`保存失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updatePlayerSetting = (player: string, key: string, value: any) => {
    setPlayerSettings((prev: any) => ({
      ...prev,
      [player]: {
        ...prev[player],
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">播放器配置</h2>
          <p className="text-sm text-muted-foreground mt-1">选择并配置前端视频播放器</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="rounded-xl font-bold px-8 h-11 shadow-lg shadow-primary/20">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          保存配置
        </Button>
      </div>

      {/* 播放器选择 */}
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Play className="w-5 h-5" />
            播放器类型选择
          </CardTitle>
          <CardDescription>选择前端使用的视频播放器引擎</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setPlayerType('h5')}
              className={`p-6 rounded-2xl border-2 transition-all text-left ${
                playerType === 'h5'
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  playerType === 'h5' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  <Play className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">H5 原生播放器</h3>
                  <p className="text-[10px] text-muted-foreground">轻量级</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                基于原生 HTML5 video 标签，体积小、兼容性好，适合简单场景
              </p>
            </button>

            <button
              onClick={() => setPlayerType('artplayer')}
              className={`p-6 rounded-2xl border-2 transition-all text-left ${
                playerType === 'artplayer'
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  playerType === 'artplayer' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">ArtPlayer</h3>
                  <p className="text-[10px] text-muted-foreground">功能丰富</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                现代化 HTML5 播放器，支持丰富插件、弹幕、字幕等高级功能
              </p>
              <a 
                href="https://artplayer.org/document/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-primary hover:underline mt-2 inline-flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                查看文档 →
              </a>
            </button>

            <button
              onClick={() => setPlayerType('xgplayer')}
              className={`p-6 rounded-2xl border-2 transition-all text-left ${
                playerType === 'xgplayer'
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  playerType === 'xgplayer' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  <Play className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">西瓜播放器</h3>
                  <p className="text-[10px] text-muted-foreground">字节跳动</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                字节跳动开源播放器，性能优秀，支持多种格式和流媒体协议
              </p>
              <a 
                href="https://v2.h5player.bytedance.com/gettingStarted/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-primary hover:underline mt-2 inline-flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                查看文档 →
              </a>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 播放器参数配置 */}
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Settings2 className="w-5 h-5" />
            {playerType === 'h5' && 'H5 播放器参数'}
            {playerType === 'artplayer' && 'ArtPlayer 参数配置'}
            {playerType === 'xgplayer' && '西瓜播放器参数配置'}
          </CardTitle>
          <CardDescription>
            自定义当前选中播放器的详细参数
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {playerType === 'h5' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">自动播放</Label>
                  <p className="text-[10px] text-muted-foreground">视频加载后自动开始播放</p>
                </div>
                <Switch 
                  checked={playerSettings.h5?.autoplay || false}
                  onCheckedChange={(v) => updatePlayerSetting('h5', 'autoplay', v)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">循环播放</Label>
                  <p className="text-[10px] text-muted-foreground">视频结束后自动重新播放</p>
                </div>
                <Switch 
                  checked={playerSettings.h5?.loop || false}
                  onCheckedChange={(v) => updatePlayerSetting('h5', 'loop', v)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">显示控制条</Label>
                  <p className="text-[10px] text-muted-foreground">显示播放、暂停、进度条等控制按钮</p>
                </div>
                <Switch 
                  checked={playerSettings.h5?.controls || false}
                  onCheckedChange={(v) => updatePlayerSetting('h5', 'controls', v)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">默认静音</Label>
                  <p className="text-[10px] text-muted-foreground">视频初始为静音状态</p>
                </div>
                <Switch 
                  checked={playerSettings.h5?.muted || false}
                  onCheckedChange={(v) => updatePlayerSetting('h5', 'muted', v)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">内联播放</Label>
                  <p className="text-[10px] text-muted-foreground">在移动端页面内播放，不全屏</p>
                </div>
                <Switch 
                  checked={playerSettings.h5?.playsinline || false}
                  onCheckedChange={(v) => updatePlayerSetting('h5', 'playsinline', v)}
                />
              </div>

              <div className="space-y-2">
                <Label>预加载策略</Label>
                <Select 
                  value={playerSettings.h5?.preload || 'auto'} 
                  onValueChange={(v) => updatePlayerSetting('h5', 'preload', v)}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不预加载</SelectItem>
                    <SelectItem value="metadata">仅元数据</SelectItem>
                    <SelectItem value="auto">自动预加载</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {playerType === 'artplayer' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">自动播放</Label>
                    <p className="text-[10px] text-muted-foreground">加载后自动播放</p>
                  </div>
                  <Switch 
                    checked={playerSettings.artplayer?.autoplay || false}
                    onCheckedChange={(v) => updatePlayerSetting('artplayer', 'autoplay', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">循环播放</Label>
                    <p className="text-[10px] text-muted-foreground">结束后重播</p>
                  </div>
                  <Switch 
                    checked={playerSettings.artplayer?.loop || false}
                    onCheckedChange={(v) => updatePlayerSetting('artplayer', 'loop', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">默认静音</Label>
                    <p className="text-[10px] text-muted-foreground">初始静音</p>
                  </div>
                  <Switch 
                    checked={playerSettings.artplayer?.muted || false}
                    onCheckedChange={(v) => updatePlayerSetting('artplayer', 'muted', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">倍速播放</Label>
                    <p className="text-[10px] text-muted-foreground">显示倍速选项</p>
                  </div>
                  <Switch 
                    checked={playerSettings.artplayer?.playbackRate || false}
                    onCheckedChange={(v) => updatePlayerSetting('artplayer', 'playbackRate', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">宽高比调整</Label>
                    <p className="text-[10px] text-muted-foreground">支持比例切换</p>
                  </div>
                  <Switch 
                    checked={playerSettings.artplayer?.aspectRatio || false}
                    onCheckedChange={(v) => updatePlayerSetting('artplayer', 'aspectRatio', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">设置面板</Label>
                    <p className="text-[10px] text-muted-foreground">显示设置按钮</p>
                  </div>
                  <Switch 
                    checked={playerSettings.artplayer?.setting || false}
                    onCheckedChange={(v) => updatePlayerSetting('artplayer', 'setting', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">快捷键</Label>
                    <p className="text-[10px] text-muted-foreground">键盘控制</p>
                  </div>
                  <Switch 
                    checked={playerSettings.artplayer?.hotkey || false}
                    onCheckedChange={(v) => updatePlayerSetting('artplayer', 'hotkey', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">画中画</Label>
                    <p className="text-[10px] text-muted-foreground">PIP 模式</p>
                  </div>
                  <Switch 
                    checked={playerSettings.artplayer?.pip || false}
                    onCheckedChange={(v) => updatePlayerSetting('artplayer', 'pip', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">网页全屏</Label>
                    <p className="text-[10px] text-muted-foreground">浏览器全屏</p>
                  </div>
                  <Switch 
                    checked={playerSettings.artplayer?.fullscreenWeb || false}
                    onCheckedChange={(v) => updatePlayerSetting('artplayer', 'fullscreenWeb', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">迷你进度条</Label>
                    <p className="text-[10px] text-muted-foreground">顶部进度提示</p>
                  </div>
                  <Switch 
                    checked={playerSettings.artplayer?.miniProgressBar || false}
                    onCheckedChange={(v) => updatePlayerSetting('artplayer', 'miniProgressBar', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">互斥播放</Label>
                    <p className="text-[10px] text-muted-foreground">同时只播一个</p>
                  </div>
                  <Switch 
                    checked={playerSettings.artplayer?.mutex || false}
                    onCheckedChange={(v) => updatePlayerSetting('artplayer', 'mutex', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">记忆播放</Label>
                    <p className="text-[10px] text-muted-foreground">记住进度</p>
                  </div>
                  <Switch 
                    checked={playerSettings.artplayer?.autoPlayback || false}
                    onCheckedChange={(v) => updatePlayerSetting('artplayer', 'autoPlayback', v)}
                  />
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>主题颜色</Label>
                  <div className="flex gap-2 items-center">
                    <Input 
                      type="color"
                      value={playerSettings.artplayer?.theme || '#3b82f6'}
                      onChange={(e) => updatePlayerSetting('artplayer', 'theme', e.target.value)}
                      className="w-20 h-11 rounded-xl cursor-pointer"
                    />
                    <Input 
                      type="text"
                      value={playerSettings.artplayer?.theme || '#3b82f6'}
                      onChange={(e) => updatePlayerSetting('artplayer', 'theme', e.target.value)}
                      className="flex-1 rounded-xl h-11"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>默认音量 ({Math.round((playerSettings.artplayer?.volume || 0.5) * 100)}%)</Label>
                  <Slider
                    value={[(playerSettings.artplayer?.volume || 0.5) * 100]}
                    onValueChange={(v) => updatePlayerSetting('artplayer', 'volume', v[0] / 100)}
                    max={100}
                    step={1}
                    className="py-4"
                  />
                </div>

                <div className="space-y-2">
                  <Label>语言</Label>
                  <Select 
                    value={playerSettings.artplayer?.lang || 'zh-cn'} 
                    onValueChange={(v) => updatePlayerSetting('artplayer', 'lang', v)}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-cn">简体中文</SelectItem>
                      <SelectItem value="zh-tw">繁体中文</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {playerType === 'xgplayer' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">自动播放</Label>
                    <p className="text-[10px] text-muted-foreground">加载后自动播放</p>
                  </div>
                  <Switch 
                    checked={playerSettings.xgplayer?.autoplay || false}
                    onCheckedChange={(v) => updatePlayerSetting('xgplayer', 'autoplay', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">循环播放</Label>
                    <p className="text-[10px] text-muted-foreground">结束后重播</p>
                  </div>
                  <Switch 
                    checked={playerSettings.xgplayer?.loop || false}
                    onCheckedChange={(v) => updatePlayerSetting('xgplayer', 'loop', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">画中画</Label>
                    <p className="text-[10px] text-muted-foreground">PIP 模式</p>
                  </div>
                  <Switch 
                    checked={playerSettings.xgplayer?.pip || false}
                    onCheckedChange={(v) => updatePlayerSetting('xgplayer', 'pip', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">内联播放</Label>
                    <p className="text-[10px] text-muted-foreground">移动端内联</p>
                  </div>
                  <Switch 
                    checked={playerSettings.xgplayer?.playsinline || false}
                    onCheckedChange={(v) => updatePlayerSetting('xgplayer', 'playsinline', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">流式布局</Label>
                    <p className="text-[10px] text-muted-foreground">自适应容器</p>
                  </div>
                  <Switch 
                    checked={playerSettings.xgplayer?.fluid || false}
                    onCheckedChange={(v) => updatePlayerSetting('xgplayer', 'fluid', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">视频初始化</Label>
                    <p className="text-[10px] text-muted-foreground">预加载视频</p>
                  </div>
                  <Switch 
                    checked={playerSettings.xgplayer?.videoInit || false}
                    onCheckedChange={(v) => updatePlayerSetting('xgplayer', 'videoInit', v)}
                  />
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>默认音量 ({Math.round((playerSettings.xgplayer?.volume || 0.5) * 100)}%)</Label>
                  <Slider
                    value={[(playerSettings.xgplayer?.volume || 0.5) * 100]}
                    onValueChange={(v) => updatePlayerSetting('xgplayer', 'volume', v[0] / 100)}
                    max={100}
                    step={1}
                    className="py-4"
                  />
                </div>

                <div className="space-y-2">
                  <Label>默认倍速</Label>
                  <Select 
                    value={String(playerSettings.xgplayer?.defaultPlaybackRate || 1)} 
                    onValueChange={(v) => updatePlayerSetting('xgplayer', 'defaultPlaybackRate', parseFloat(v))}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5x</SelectItem>
                      <SelectItem value="0.75">0.75x</SelectItem>
                      <SelectItem value="1">1.0x (正常)</SelectItem>
                      <SelectItem value="1.25">1.25x</SelectItem>
                      <SelectItem value="1.5">1.5x</SelectItem>
                      <SelectItem value="2">2.0x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>视频适配模式</Label>
                  <Select 
                    value={playerSettings.xgplayer?.fitVideoSize || 'auto'} 
                    onValueChange={(v) => updatePlayerSetting('xgplayer', 'fitVideoSize', v)}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">自动适配</SelectItem>
                      <SelectItem value="fixWidth">固定宽度</SelectItem>
                      <SelectItem value="fixHeight">固定高度</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>语言</Label>
                  <Select 
                    value={playerSettings.xgplayer?.lang || 'zh-cn'} 
                    onValueChange={(v) => updatePlayerSetting('xgplayer', 'lang', v)}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-cn">简体中文</SelectItem>
                      <SelectItem value="zh-tw">繁体中文</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 提示信息 */}
      <Card className="border-primary/20 bg-primary/5 rounded-2xl">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-bold text-primary">配置说明</p>
              <ul className="text-xs text-muted-foreground space-y-1 leading-relaxed">
                <li>• 修改播放器类型后，前端所有视频将使用新的播放器引擎渲染</li>
                <li>• H5 播放器体积最小，兼容性最好，适合简单场景</li>
                <li>• ArtPlayer 功能最丰富，支持插件扩展、弹幕、字幕等高级功能</li>
                <li>• 西瓜播放器由字节跳动开源，性能优秀，适合移动端和流媒体场景</li>
                <li>• 配置保存后立即生效，用户刷新页面即可看到新播放器</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
