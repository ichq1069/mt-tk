import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Lock, Loader2, RefreshCw, X, Shield, Upload, CheckCircle2 } from 'lucide-react';
import { Profile } from '@/types';

interface AccessRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  myRequests: any[];
  profile: Profile | null;
  id: string | undefined;
  requestReason: string;
  onRequestReasonChange: (reason: string) => void;
  requestAttachment: File | null;
  onRequestAttachmentChange: (file: File | null) => void;
  requestSubmitting: boolean;
  onSubmit: () => void;
  onRefreshRequests: () => void;
  onOpenLogin: () => void;
}

export const AccessRequestDialog: React.FC<AccessRequestDialogProps> = ({
  isOpen,
  onOpenChange,
  myRequests,
  profile,
  id,
  requestReason,
  onRequestReasonChange,
  requestAttachment,
  onRequestAttachmentChange,
  requestSubmitting,
  onSubmit,
  onRefreshRequests,
  onOpenLogin
}) => {
  const pendingRequest = myRequests.find(r => r.album_id === id && r.status === 'pending');
  const rejectedRequest = myRequests.find(r => r.album_id === id && r.status === 'rejected');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl bg-slate-900 border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            权限申请
          </DialogTitle>
          <DialogDescription className="text-white/40">
            {pendingRequest 
              ? "您的申请正在审核中，请耐心等待管理员处理。"
              : "您当前没有权限查看此内容。请提交申请，管理员审核通过后即可获得长期访问权。"}
          </DialogDescription>
        </DialogHeader>
        
        {pendingRequest ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center shadow-inner ring-1 ring-amber-500/20">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black text-amber-500">申请正在审核中</p>
              <p className="text-[10px] text-white/40 max-w-[200px]">管理员正在加急处理，请稍后刷新查看最新结果。</p>
            </div>
            <div className="flex gap-2 w-full pt-2">
              <Button 
                variant="outline" 
                className="flex-1 rounded-2xl h-11 font-bold border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
                onClick={onRefreshRequests}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新状态
              </Button>
              <Button 
                className="flex-1 rounded-2xl h-11 font-bold bg-white/5 hover:bg-white/10 text-white"
                onClick={() => onOpenChange(false)}
              >
                我知道了
              </Button>
            </div>
          </div>
        ) : !profile ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shadow-inner ring-1 ring-primary/20">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black text-white">请先登录系统</p>
              <p className="text-[10px] text-white/40 max-w-[200px]">登录后方可提交权限申请并享受完整功能。</p>
            </div>
            <Button 
              className="w-full rounded-2xl h-11 font-black bg-primary hover:bg-primary/90 mt-4 shadow-lg shadow-primary/20"
              onClick={() => {
                onOpenChange(false);
                onOpenLogin();
              }}
            >
              立即登录
            </Button>
          </div>
        ) : (
          <>
            <div className="py-6 space-y-4">
              {rejectedRequest && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-red-400">
                    <X className="w-4 h-4" />
                    <span className="text-xs font-black">申请已被驳回</span>
                  </div>
                  {rejectedRequest.rejected_reason && (
                    <p className="text-[10px] text-red-400/80 leading-relaxed pl-6">
                      驳回理由：{rejectedRequest.rejected_reason}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-white/60">申请理由</Label>
                <Textarea 
                  placeholder="请详细说明您的申请理由（如：已购证明、会员身份等）" 
                  className="bg-white/5 border-white/10 rounded-2xl min-h-[100px] text-xs focus:ring-primary/20"
                  value={requestReason}
                  onChange={(e) => onRequestReasonChange(e.target.value)}
                />
                {rejectedRequest && (
                  <p className="text-[10px] text-amber-400 font-bold mt-1">
                    提示：请根据驳回理由修改后重新提交。
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-white/60">证明材料（可选）</Label>
                <div 
                  className="h-24 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-colors group relative overflow-hidden"
                  onClick={() => document.getElementById('request-upload')?.click()}
                >
                  {requestAttachment ? (
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                      <span className="text-[10px] text-white/60 max-w-[150px] truncate">{requestAttachment.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-white/20 group-hover:text-primary transition-colors" />
                      <span className="text-[10px] text-white/40 group-hover:text-white/60 transition-colors">点击上传证明文件/截图</span>
                    </>
                  )}
                  <input 
                    id="request-upload" 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => onRequestAttachmentChange(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-col gap-2 pt-2 sm:flex-col sm:gap-2">
              <Button 
                className="w-full rounded-2xl h-11 font-black bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20"
                onClick={onSubmit}
                disabled={requestSubmitting}
              >
                {requestSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {rejectedRequest ? '重新提交申请' : '提交申请'}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full rounded-2xl h-11 font-bold text-white/40 hover:bg-white/5"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
