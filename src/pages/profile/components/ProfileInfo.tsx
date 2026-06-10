import React from 'react';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';
import { UserCog } from 'lucide-react';

interface ProfileInfoProps {
  profile: any;
  replaceUser: (text: string) => string;
  onEditProfile: () => void;
  digitalIdSettings: any;
  hasPurchasedId: boolean;
  onNavigate: (path: string) => void;
}

export const ProfileInfo: React.FC<ProfileInfoProps> = ({
  profile,
  replaceUser,
  onEditProfile,
  digitalIdSettings,
  hasPurchasedId,
  onNavigate
}) => {
  return (
    <div className="relative pt-2 px-3">
      {/* 背景封面 - 优化为向下平滑渐变消失 */}
      <div 
        className="h-44 w-full bg-slate-50 relative overflow-hidden cursor-pointer group rounded-[32px] border-none"
        onClick={onEditProfile}
      >
        {/* 封面图片层 - 使用线性渐变 Mask 实现向下平滑消失 */}
        <div 
          className="w-full h-full absolute inset-0"
          style={{
            maskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)'
          }}
        >
          {profile?.cover_url ? (
            <ProtectedMedia 
              src={profile.cover_url} 
              type="image" 
              alt="cover" 
              forceMode="canvas"
              ruleKey="大图"
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-700 opacity-60" />
          )}
        </div>
        
        {/* 氛围叠加层 - 仅保留必要的底部柔和渐变以融入背景 */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white via-white/40 to-transparent" />
        </div>
           
           {/* 3. 底部黄黑调性：极致细腻地呼应 ID 栏渐变色调 */}
           <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-amber-500/[0.03] via-slate-900/[0.02] to-transparent" />
        
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-[10px] font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/20">点击修改背景</span>
        </div>
      </div>

      <div className="flex flex-col items-center -mt-12">
        {/* 头像 - 带渐变边框和动态效果 */}
        <div className="relative mb-3 z-10">
          <div 
            className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-purple-500 via-pink-500 to-indigo-500 shadow-xl cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 border-4 border-white animate-pulse-slow"
            onClick={onEditProfile}
          >
            <div className="w-full h-full rounded-full bg-white p-0.5">
              <div className="w-full h-full rounded-full overflow-hidden bg-slate-100">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <UserCog className="w-8 h-8" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center space-y-2 px-6">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 drop-shadow-sm">
            {replaceUser(profile?.username || '未命名用户')}
          </h2>
          
          <div className="flex flex-col items-center gap-2">
            {/* ID号 - 胶囊样式 */}
            {digitalIdSettings.is_enabled && (
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-900/90 backdrop-blur-sm rounded-full overflow-hidden shadow-sm ring-1 ring-white/20">
                  <div className="bg-amber-400 text-slate-900 px-2.5 py-1 text-[11px] font-black italic">ID</div>
                  <div className="px-3 py-1 text-white font-mono font-bold text-sm tracking-widest">{profile?.digital_id || '------'}</div>
                </div>
                {!hasPurchasedId && digitalIdSettings.is_shop_enabled && (
                  <span className="text-blue-500 text-sm font-bold ml-1 cursor-pointer active:opacity-60 bg-blue-50/50 backdrop-blur-sm px-2 py-0.5 rounded-full" onClick={() => onNavigate('/id-shop')}>选6位ID靓号</span>
                )}
              </div>
            )}

            {/* 注册时间 */}
            <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full">
              <span>注册时间:</span>
              <span className="text-slate-600">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '----'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
