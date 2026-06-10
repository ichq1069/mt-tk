import React, { useState } from 'react';
import { formatBeijingTime } from '@/lib/utils';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Key, User, ShieldCheck } from 'lucide-react';

export function ProfileSettingsSection() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('新密码长度不能少于 6 位');
      return;
    }

    setLoading(true);
    try {
      // 验证原密码：尝试用原密码重新登录
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: oldPassword,
      });

      if (signInError) {
        throw new Error('原密码验证失败，请重新输入');
      }

      // 更新密码
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      toast.success('密码修改成功');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-foreground">账户安全设置</h2>
        <p className="text-sm text-muted-foreground">在此修改您的登录密码及管理账户安全选项</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black">修改登录密码</CardTitle>
                <CardDescription>定期修改密码以保障账户安全</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="old-password">当前密码</Label>
                <Input 
                  id="old-password"
                  type="password" 
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="请输入当前正在使用的密码"
                  className="rounded-xl h-12 bg-slate-50 border-none focus-visible:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">新密码</Label>
                  <Input 
                    id="new-password"
                    type="password" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="请输入新密码 (6位以上)"
                    className="rounded-xl h-12 bg-slate-50 border-none focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">确认新密码</Label>
                  <Input 
                    id="confirm-password"
                    type="password" 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入新密码"
                    className="rounded-xl h-12 bg-slate-50 border-none focus-visible:ring-primary"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                保存并生效新密码
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-muted/20">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-sm">当前登录身份</p>
              <div className="flex flex-col text-xs text-muted-foreground gap-1">
                <p>用户名: <span className="text-foreground font-medium">{profile?.username}</span></p>
                <p>角色: <span className="text-primary font-bold">{profile?.role === 'admin' ? '超级管理员' : '普通管理员'}</span></p>
                <p>最后登录时间: <span className="text-foreground font-medium">{formatBeijingTime()}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
