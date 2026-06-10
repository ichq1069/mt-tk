
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Zap, Trophy, Crown, Flame, Star, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function DigitalIdShop() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, openLoginDialog } = useAuth();
  const [specialIds, setSpecialIds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSpecialIds();
  }, []);

  const fetchSpecialIds = async () => {
    setLoading(true);
    try {
      const { data } = await api.getSpecialDigitalIds();
      if (data) setSpecialIds(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (specialId: string, digitalId: string, price: number) => {
    if (!user) {
      const from = encodeURIComponent(window.location.pathname + window.location.search);
      navigate(`/login?from=${from}`);
      return;
    }
    if (profile?.digital_id) return toast.error('您已拥有专属 ID，每位用户仅限购买一次');
    if ((profile?.points || 0) < price) return toast.error('积分不足');

    const confirmed = await confirmAsync(`确定要花费 ${price} 积分购买靓号 ${digitalId} 吗？`, { variant: 'destructive' });
    if (!confirmed) return;

    setBuyingId(specialId);
    try {
      const { data, error } = await api.buySpecialDigitalId(user.id, specialId);
      if (error) throw error;
      if (data?.success) {
        toast.success(`成功购买靓号: ${data.digital_id}`);
        await refreshProfile();
        await fetchSpecialIds();
      } else {
        throw new Error(data?.error || '购买失败');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBuyingId(null);
    }
  };

  const filteredIds = specialIds.filter(id => !id.is_sold && id.digital_id.includes(searchQuery));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-bold">正在搜寻全宇宙最靓的号码...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary/10 text-primary mb-2 shadow-inner">
          <Zap className="w-8 h-8 fill-primary/20" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-foreground">ID 靓号铺子</h1>
        <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
          将自己的 ID 号更改为极具个性的 6 位数字靓号。每位用户仅限购买一次专属靓号。
        </p>
      </div>

      {profile && (
        <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-md overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-contain" />
                ) : (
                  <Crown className="w-10 h-10 text-amber-400" />
                )}
              </div>
              <div className="flex-1 text-center md:text-left space-y-1">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <h3 className="text-2xl font-black">嗨，{profile.username}</h3>
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none rounded-lg px-2 py-0.5 text-[10px] font-black uppercase">
                    {profile.rank || '初出茅庐'}
                  </Badge>
                </div>
                <p className="text-white/60 text-sm font-medium">
                  当前积分: <span className="text-amber-400 font-black">{profile.points || 0}</span>
                  <span className="mx-2 opacity-30">|</span>
                  当前 ID: <span className="text-primary-glow font-mono font-bold tracking-widest">{profile.digital_id || '未分配'}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="border-white/20 text-white/80 bg-white/5 rounded-xl px-4 py-2">
                  <Flame className="w-3.5 h-3.5 mr-2 text-rose-400" />
                  专属福利
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="搜索心仪的数字序列..." 
            className="pl-12 h-14 rounded-2xl border-none shadow-md bg-white focus:ring-2 focus:ring-primary/20 transition-all text-lg font-medium"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
          className="h-14 px-8 rounded-2xl font-black text-lg shadow-lg shadow-primary/20"
          onClick={fetchSpecialIds}
        >
          搜索
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredIds.length > 0 ? filteredIds.map((item) => (
          <Card key={item.id} className="border-none shadow-sm rounded-[2rem] overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white/80 backdrop-blur-sm border border-white">
            <CardHeader className="pb-2 text-center">
              <div className="text-4xl font-black tracking-[0.2em] text-slate-800 font-mono py-4">
                {item.digital_id}
              </div>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none rounded-lg font-bold">
                  价格: {item.price} 积分
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
                  <span>允许段位</span>
                  <span className="text-slate-800">{item.required_rank}及以上</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-full opacity-30"></div>
                </div>
              </div>
              
              <Button 
                onClick={() => handleBuy(item.id, item.digital_id, item.price)}
                disabled={buyingId === item.id || !!profile?.digital_id}
                className={cn(
                  "w-full h-12 rounded-2xl font-black shadow-sm transition-all",
                  profile?.digital_id ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800 text-white"
                )}
              >
                {buyingId === item.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : profile?.digital_id ? (
                  <>已拥有专属 ID</>
                ) : (
                  <>购买此号</>
                )}
              </Button>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-bold">没有找到您心仪的靓号，尝试换个关键词？</p>
          </div>
        )}
      </div>

      <div className="pt-10 border-t border-dashed border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <h4 className="font-black text-slate-800 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              什么是数字靓号？
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              数字靓号是平台给予资深用户的特殊荣誉，包含豹子号、顺子号、对子号等极具辨识度的数字序列。
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-black text-slate-800 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary fill-primary/20" />
              如何获取靓号？
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              您可以通过参与平台活动、每日签到积攒积分，当积分和段位达到靓号要求时，即可在此进行兑换。
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-black text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              注意事项
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              靓号一经购买概不退还，旧 ID 将自动进入公共 ID 池供系统随机分配。每个账号每月仅限更换一次。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
