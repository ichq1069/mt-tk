import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Lock, Loader2, Upload, Shield, CheckCircle2 } from 'lucide-react';

interface AlbumRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  myRequests: any[];
  albumId: string | null;
  requestReason: string;
  onRequestReasonChange: (val: string) => void;
  requestAttachment: File | null;
  onRequestAttachmentChange: (file: File | null) => void;
  requestSubmitting: boolean;
  onSubmit: () => void;
}

export const AlbumRequestDialog: React.FC<AlbumRequestDialogProps> = ({
  isOpen,
  onOpenChange,
  myRequests,
  albumId,
  requestReason,
  onRequestReasonChange,
  requestAttachment,
  onRequestAttachmentChange,
  requestSubmitting,
  onSubmit
}) => {
  const currentRequest = myRequests.find(r => r.album_id === albumId);
  const isPending = currentRequest?.status === 'pending';
  const isRejected = currentRequest?.status === 'rejected';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 max-w-sm p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Lock className="w-5 h-5 text-primary" />
            解锁图集权限
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs mt-1">
            {isPending 
              ? "您的申请正在审核中，请耐心等待管理员处理。"
              : "您当前没有权限查看此图集。请提交申请，管理员审核通过后即可获得长期访问权。"}
          </DialogDescription>
        </DialogHeader>
        
        {isPending ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
            <p className="text-sm font-bold text-amber-600">申请正在审核中</p>
            <Button 
              variant="ghost" 
              className="rounded-2xl h-11 font-bold text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => onOpenChange(false)}
            >
              我知道了
            </Button>
          </div>
        ) : (
          <>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">申请理由</Label>
                <Textarea 
                  placeholder="请详细说明您的申请理由（如：已购证明、会员身份等）" 
                  className="bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 rounded-2xl min-h-[100px] text-xs focus:ring-primary/20"
                  value={requestReason}
                  onChange={(e) => onRequestReasonChange(e.target.value)}
                />
                {isRejected && (
                  <p className="text-[10px] text-red-500 font-bold mt-1">
                    提示：您之前的申请已被拒绝，请修改理由后重新提交。
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">证明材料（可选）</Label>
                <div 
                  className="h-24 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group relative overflow-hidden"
                  onClick={() => document.getElementById('request-upload')?.click()}
                >
                  {requestAttachment ? (
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 max-w-[150px] truncate font-bold">{requestAttachment.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-slate-300 group-hover:text-primary transition-colors" />
                      <span className="text-[10px] text-slate-400 group-hover:text-slate-600 transition-colors font-bold">点击上传证明文件/截图</span>
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
            
            <DialogFooter className="flex flex-col gap-2">
              <Button 
                className="w-full rounded-2xl h-11 font-black bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20"
                onClick={onSubmit}
                disabled={requestSubmitting}
              >
                {requestSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {isRejected ? '重新提交申请' : '提交申请'}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full rounded-2xl h-11 font-bold text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
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
