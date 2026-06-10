import { useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types';
import { toast } from 'sonner';
import { api } from '@/db/api';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, ShieldAlert, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { AuthContext, type AuthContextType } from './AuthContextInstance';

import { cache } from '@/lib/cache';
import { logCollector } from '@/lib/logCollector';

export async function getProfile(userId: string): Promise<Profile | null> {
  const cacheKey = `user_profile_${userId}`;
  return cache.getOrFetch<Profile | null>(cacheKey, async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, permission_groups(*)')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
    return data;
  }, 600000, 'user_profile');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = profile?.role === 'admin';
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictAttempt, setConflictAttempt] = useState<any>(null);
  const [isHandlingConflict, setIsHandlingConflict] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  const dailyLoginRequested = useRef<Record<string, boolean>>({});
  
  // 登录弹窗状态
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [loginDialogTab, setLoginDialogTab] = useState<'login' | 'register'>('login');
  const [authStrategy, setAuthStrategy] = useState<{ strategy: string; sync_to_auth: boolean }>({ strategy: 'supabase', sync_to_auth: true });

  useEffect(() => {
    api.getLoginStrategyConfig().then(({ data }: any) => {
      if (data) setAuthStrategy(data);
    });
  }, []);

  const openLoginDialog = (initialTab: 'login' | 'register' = 'login') => {
    setLoginDialogTab(initialTab);
    // 修改：改为跳转到登录页，并携带当前页面路径以便登录后返回
    const from = encodeURIComponent(location.pathname + location.search);
    navigate(`/login?from=${from}${initialTab === 'register' ? '&register=true' : ''}`);
    // 为了兼容性暂时保留状态，但实际不再弹出弹窗
    setIsLoginDialogOpen(false);
  };

  const closeLoginDialog = () => {
    setIsLoginDialogOpen(false);
  };

  const calculatePermissions = (profile: Profile | null) => {
    if (!profile) return [];

    const groupPermissions = profile.permission_groups?.permissions || [];
    const individualPermissions = profile.permissions || [];
    // 合并并去重
    return Array.from(new Set([...groupPermissions, ...individualPermissions]));
  };

  useEffect(() => {
    setPermissions(calculatePermissions(profile));
  }, [profile]);

  useEffect(() => {
    // 设置全局用户变量，供 analytics SDK 动态检测
    try {
      (window as any).__CURRENT_USER__ = user ? { id: user.id, openid: profile?.wechat_openid || profile?.mp_openid || null } : null;
    } catch (e) {}
  }, [user, profile]);

  useEffect(() => {
    if (user) {
      logCollector.setUserId(user.id);
    } else {
      logCollector.setUserId(null);
    }
    
    if (profile?.is_debug_enabled) {
      logCollector.setSilentMode(true);
    } else {
      logCollector.setSilentMode(false);
    }
  }, [user, profile]);


  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    // 强制清除缓存以确保获取到最新状态 (解决绑定微信/小程序后不实时更新的问题)
    cache.invalidate(`user_profile_${user.id}`);

    const profileData = await getProfile(user.id);
    if (!profileData) {
      toast.error('账户信息已失效，请重新登录');
      await signOut();
      return;
    }
    if (profileData.is_banned) {
      toast.error('您的账号已被封禁');
      await signOut();
      return;
    }
    setProfile(profileData);
    
    // 每日登录奖励 (增加去重逻辑)
    if (user && user.id && !dailyLoginRequested.current[`${user.id}_daily_login` || '']) {
      dailyLoginRequested.current[`${user.id}_daily_login`] = true;
      (supabase as any).rpc('award_user_reward', { p_user_id: user.id, p_action: 'daily_login' })
        .then(({ data, error }: any) => {
          if (!error && data?.success) {
            console.log(`[Auth] 获得每日登录奖励: ${data.points} Pts, ${data.exp} EXP`);
          }
        });
    }
  };

  useEffect(() => {
    // 检查 URL 是否包含 Supabase 认证参数，如果有，则延长加载状态
    const hasAuthParams = 
      window.location.hash.includes('access_token=') || 
      window.location.search.includes('code=') || 
      window.location.search.includes('token_hash=');
    
    if (hasAuthParams) {
      console.log('[AuthContext] 检测到认证参数，延长加载状态以等待会话建立');
      setLoading(true);
    }

    supabase
      .auth
      .getSession()
      .then(({ data: { session } }) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          getProfile(u.id).then(p => {
            if (!p) {
              toast.error('账户信息已失效，请重新登录');
              signOut();
              return;
            }
            if (p.is_banned) {
              toast.error('您的账号已被封禁');
              signOut();
              return;
            }
            setProfile(p);
            
            // 每日登录奖励 (增加去重逻辑)
            if (u && u.id && !dailyLoginRequested.current[`${u.id}_daily_login` || '']) {
              dailyLoginRequested.current[`${u.id}_daily_login`] = true;
              (supabase as any).rpc('award_user_reward', { p_user_id: u.id, p_action: 'daily_login' })
                .then(({ data, error }: any) => {
                  if (!error && data?.success) {
                    console.log(`[Auth] 获得每日登录奖励: ${data.points} Pts, ${data.exp} EXP`);
                  }
                });
            }
          });
        }
      })
      .catch(error => {
        console.error('[AuthContext] 获取 Session 失败:', error);
      })
      .finally(() => {
        setLoading(false);
      });

    // 在此函数中，不要使用 await。使用 .then() 以避免死锁。
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        getProfile(u.id).then((p) => {
          if (!p) {
            toast.error('账户信息已失效，请重新登录');
            signOut();
            return;
          }
          if (p.is_banned) {
            toast.error('您的账号已被封禁');
            signOut();
            return;
          }
          setProfile(p);
          
          // 处理单设备登录限制
          if (_event === 'SIGNED_IN') {
            api.getStorageConfig().then(({ data: config }: any) => {
              if (config?.single_device_login) {
                const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                localStorage.setItem(`miaoda_session_${u.id}`, sessionId);
                (supabase.from('profiles') as any).update({ last_session_id: sessionId }).eq('id', u.id).then(() => {
                  // Session ID updated
                });
              }
            });
            
            if (u && u.id && !dailyLoginRequested.current[`${u.id}_daily_login` || '']) {
              dailyLoginRequested.current[`${u.id}_daily_login`] = true;
              (supabase as any).rpc('award_user_reward', { p_user_id: u.id, p_action: 'daily_login' })
                .then(({ data, error }: any) => {
                  if (!error && data?.success) {
                    console.log(`[Auth] 获得每日登录奖励: ${data.points} Pts, ${data.exp} EXP`);
                  }
                });
            }
          }
        });
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 会话管理与冲突处理
  useEffect(() => {
    if (!user) return;

    /* 
    // 已根据用户要求移除 WSS (Realtime) 相关逻辑
    // 1. 发送心跳并注册会话
    const sendHeartbeat = () => {
      api.upsertActiveSession(user.id, sessionId, { 
        userAgent: navigator.userAgent, 
        last_seen: new Date().toISOString() 
      }).catch(console.error);
    };
    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 5 * 60 * 1000);

    // 2. 监听登录冲突与安全指令
    const channel = supabase
      .channel(`auth_conflicts_${user.id}`)
      .on('broadcast', { event: 'LOGIN_ATTEMPT' }, (payload) => {
        if (payload.payload?.sessionId !== sessionId) {
          setConflictAttempt(payload.payload);
          setConflictDialogOpen(true);
        }
      })
      .on('broadcast', { event: 'SECURITY_FORCE_LOGOUT' }, async () => {
        toast.error('检测到账号安全风险，已强制下线');
        await signOut();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Auth] 会话冲突监听已就绪');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Auth] 会话冲突监听连接失败，可能是由于 Realtime 服务未开启或网络受限');
        } else if (status === 'TIMED_OUT') {
          console.warn('[Auth] 会话冲突监听连接超时');
        }
      });

    return () => {
      clearInterval(heartbeatInterval);
      supabase.removeChannel(channel);
    };
    */
    return () => {};
  }, [user, sessionId]);

  // 监控安全状态
  useEffect(() => {
    if (profile?.security_status === 'reset_required') {
      toast.error('账户已被锁定，请重置密码后登录');
      signOut();
    }
  }, [profile]);

  const handleConflictResponse = async (isSelf: boolean) => {
    /*
    // 已根据用户要求移除 WSS (Realtime) 相关逻辑
    if (!user) return;
    setIsHandlingConflict(true);
    const channel = supabase.channel(`auth_conflicts_${user.id}`);
    try {
      if (isSelf) {
        await channel.send({
          type: 'broadcast',
          event: 'LOGIN_RESPONSE',
          payload: { status: 'confirmed', fromSession: sessionId }
        });
        toast.info('已确认是本人操作，当前设备将登出');
        await signOut();
      } else {
        await api.invalidateAllUserSessions(user.id);
        await channel.send({
          type: 'broadcast',
          event: 'SECURITY_FORCE_LOGOUT',
          payload: { fromSession: sessionId }
        });
        toast.error('账号已紧急锁定并下线所有设备');
        await signOut();
      }
    } catch (e) {
      console.error('处理冲突响应失败:', e);
    } finally {
      supabase.removeChannel(channel);
      setIsHandlingConflict(false);
      setConflictDialogOpen(false);
    }
    */
    setIsHandlingConflict(false);
    setConflictDialogOpen(false);
  };

  const signInWithUsername = async (usernameInput: string, password: string) => {
    try {
      const username = usernameInput.trim();
      console.log(`[Auth] 使用策略: ${authStrategy.strategy} 进行登录: ${username}`);
      
      // 如果策略是 custom 或 hybrid，首先尝试本地直登
      if (authStrategy.strategy === 'custom' || authStrategy.strategy === 'hybrid') {
        const { data: directData, error: directError } = await api.directLogin(username, password);
        
        if (!directError && directData?.success) {
          console.log('[Auth] 本地直登成功');
          // 设置会话
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: directData.access_token,
            refresh_token: directData.refresh_token
          });
          
          if (sessionError) {
            console.error('[Auth] 设置本地会话失败:', sessionError);
            // 如果 hybrid 模式下设置会话失败，可以继续尝试 Supabase 原生登录
            if (authStrategy.strategy !== 'hybrid') throw sessionError;
          } else {
            // 设置会话成功后，获取用户 ID
            const { data: sessionData } = await supabase.auth.getSession();
            return { error: null, data: { user: { id: sessionData?.session?.user?.id } } };
          }
        } else if (authStrategy.strategy === 'custom') {
          throw new Error(directData?.error || directError?.message || '用户名或密码错误');
        }
      }

      // Supabase 原生登录逻辑 (作为默认或 hybrid 回退)
      // 增强查询逻辑：支持通过用户名、邮箱或数字 ID 登录
      let { data: profileCheck, error: checkError } = await supabase
        .from('profiles')
        .select('id, username, email, digital_id')
        .or(`username.ilike."${username}",email.ilike."${username}",digital_id.eq."${username}"`)
        .maybeSingle();
      
      // 如果遇到 401，通常是由于浏览器存有已过期的旧 Token，尝试清除并重试
      if (checkError && (checkError as any).status === 401) {
        console.warn('[Auth] 检测到 401 错误，尝试清除本地会话并重试...');
        await supabase.auth.signOut();
        const { data: retryCheck, error: retryError } = await supabase
          .from('profiles')
          .select('id, username, email, digital_id')
          .or(`username.ilike."${username}",email.ilike."${username}",digital_id.eq."${username}"`)
          .maybeSingle();
        profileCheck = retryCheck;
        checkError = retryError;
      }
      
      if (checkError) {
        console.error('[Auth] Profile check error:', checkError);
        // 如果仍然 401，提示用户刷新或清除缓存
        if ((checkError as any).status === 401) {
          throw new Error('鉴权状态异常，请刷新页面或清除浏览器缓存后重试');
        }
      }

      if (!profileCheck && authStrategy.strategy === 'supabase') {
        throw new Error('用户不存在，请检查用户名/邮箱/ID或重新注册');
      }

      // 优先使用查到的邮箱，如果没有（对于旧数据回退），构造一个假邮箱用于 Supabase Auth
      const email = (profileCheck as any)?.email || `${username}@miaoda.com`;
      console.log(`[Auth] 准备进行 Supabase Auth 登录: ${email}`);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          throw new Error('用户名或密码错误，请检查后重试');
        }
        throw error;
      }
      
      // 获取当前登录用户的 ID
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      return { error: null, data: { user: { id: userId } } };
    } catch (error) {
      console.error('[Auth] 登录捕获异常:', error);
      return { error: error as Error, data: null };
    }
  };

  const signUpWithUsername = async (username: string, password: string, customFields?: Record<string, any>, inviteCode?: string, providedEmail?: string, referrerId?: string) => {
    try {
      const email = providedEmail || `${username}@miaoda.com`;
      let metadata: any = { 
        username,
        custom_fields: customFields || {}
      };
      
      // 如果有外部来源的推荐人 ID，优先设置
      if (referrerId) {
        metadata.referrer_id = referrerId;
      }

      // 验证邀请码 (如果提供了的话)
      if (inviteCode) {
        const upperInviteCode = inviteCode.trim().toUpperCase();
        console.log('[AuthContext] 验证邀请码:', upperInviteCode);
        
        const { data: codeData, error: codeError } = await supabase
          .from('redemption_codes')
          .select('*')
          .eq('code', upperInviteCode)
          .maybeSingle();
        
        if (codeError) throw codeError;
        if (!codeData) throw new Error('邀请码不存在');
        
        const inviteInfo = codeData as any;
        if (inviteInfo.type !== 'invite') throw new Error('该邀请码不是注册邀请码，请在登录后进行兑换');
        if (inviteInfo.expires_at && new Date(inviteInfo.expires_at) < new Date()) throw new Error('邀请码已过期');
        if (inviteInfo.max_uses > 0 && (inviteInfo.used_count || 0) >= inviteInfo.max_uses) throw new Error('邀请码使用次数已达上限');

        // 验证邮箱限制 (如果是邮箱邀请)
        if (inviteInfo.email && 
            inviteInfo.email.toLowerCase() !== username.toLowerCase() && 
            inviteInfo.email.toLowerCase() !== email.toLowerCase()) {
          throw new Error(`该邀请码仅限邮箱 ${inviteInfo.email} 使用，请检查您的用户名或邮箱设置`);
        }

        // 将邀请码关联的信息存入元数据
        metadata.referrer_id = inviteInfo.created_by;
        if (inviteInfo.value) {
          metadata.group_id = inviteInfo.value;
        }
        
        // 保存处理后的邀请码用于后续消费
        metadata.validated_invite_code = upperInviteCode;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) throw error;

      // 如果注册成功且有邀请码，消费它
      const validatedCode = metadata.validated_invite_code;
      if (data.user && validatedCode) {
        console.log('[AuthContext] 准备消费邀请码:', validatedCode);
        const { data: codeData } = await supabase
          .from('redemption_codes')
          .select('id')
          .eq('code', validatedCode)
          .maybeSingle();
        
        if (codeData) {
          const cData = codeData as any;
          await (supabase.from('redemption_logs') as any).insert([{ 
            code_id: cData.id, 
            user_id: data.user.id 
          }]);
          await (supabase as any).rpc('increment_redemption_use', { code_id: cData.id });
          console.log('[AuthContext] 邀请码消费成功:', validatedCode);
        }
      }

      // 如果已开启免验证，signUp 会返回 session
      if (data.session) {
        setUser(data.session.user);
        const profileData = await getProfile(data.session.user.id);
        setProfile(profileData);
      }

      return { error: null, data };
    } catch (error: any) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    // 登出后如果需要可以重置弹窗状态
    setIsLoginDialogOpen(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      permissions, 
      isAdmin,
      loading, 
      signInWithUsername, 
      signUpWithUsername, 
      signOut, 
      refreshProfile,
      openLoginDialog,
      closeLoginDialog,
      isLoginDialogOpen,
      loginDialogTab
    }}>
      {children}
      
      {/* 多设备冲突确认弹窗 (旧设备端) */}
      <Dialog open={conflictDialogOpen} onOpenChange={(open) => !isHandlingConflict && setConflictDialogOpen(open)}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-3xl backdrop-blur-md bg-card/90">
          <DialogHeader className="items-center text-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 text-amber-500">
              <ShieldAlert className="w-10 h-10 animate-pulse" />
            </div>
            <DialogTitle className="text-2xl font-black">账户登录提醒</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-4 leading-relaxed">
              您的账户正在另一台设备尝试登录。
              <div className="mt-4 p-4 bg-muted/60 rounded-2xl text-xs text-left space-y-2 border border-border/40">
                <p><span className="font-bold opacity-60">尝试登录设备：</span>{conflictAttempt?.deviceInfo?.userAgent || '未知设备'}</p>
                <p><span className="font-bold opacity-60">尝试时间：</span>{conflictAttempt?.timestamp ? new Date(conflictAttempt.timestamp).toLocaleString() : '刚刚'}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-base font-bold text-foreground">是否为您的本人操作？</p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-4 pt-4 sm:justify-center">
            <Button 
              variant="outline" 
              className="rounded-2xl font-bold flex-1 h-14 border-2 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-all"
              onClick={() => handleConflictResponse(false)}
              disabled={isHandlingConflict}
            >
              {isHandlingConflict ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5 mr-2" />}
              非本人操作
            </Button>
            <Button 
              className="rounded-2xl font-bold flex-1 h-14 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
              onClick={() => handleConflictResponse(true)}
              disabled={isHandlingConflict}
            >
              {isHandlingConflict ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
              是本人操作
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
