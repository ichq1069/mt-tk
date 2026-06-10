import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { decodeOpenId } from '@/lib/crypto';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Megaphone, RefreshCw, Heart, Send, Users, LucideUpload, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DailyGalleryDialogsProps {
  showAnnModal: boolean;
  setShowAnnModal: (val: boolean) => void;
  currentAnn: any;
  resetDialogOpen: boolean;
  setResetDialogOpen: (val: boolean) => void;
  wechatConfig: any;
  resetQrUrl: string;
  dateParam: string;
  incentiveDialogOpen: boolean;
  setIncentiveDialogOpen: (val: boolean) => void;
  incentiveStep: 'qr' | 'thanks';
  setIncentiveStep: (val: 'qr' | 'thanks') => void;
  loadingIncentiveQr: boolean;
  incentiveQrUrl: string | null;
  handleGenerateIncentiveQr: () => void;
  showFeedbackModal: boolean;
  setShowFeedbackModal: (val: boolean) => void;
  feedbackContent: string;
  setFeedbackContent: (val: string) => void;
  collectingLogs: any[];
  isSubmittingFeedback: boolean;
  handleFeedback: () => void;
  showUploadModal: boolean;
  setShowUploadModal: (val: boolean) => void;
  isUploading: boolean;
  uploadFiles: File[];
  setUploadFiles: (files: File[]) => void;
  handleUploadSubmission: () => void;
  dgConfig: any;
  nickname: string;
  setNickname: (val: string) => void;
}

export function DailyGalleryDialogs({
  showAnnModal, setShowAnnModal, currentAnn,
  resetDialogOpen, setResetDialogOpen, wechatConfig, resetQrUrl, dateParam,
  incentiveDialogOpen, setIncentiveDialogOpen, incentiveStep, setIncentiveStep, loadingIncentiveQr, incentiveQrUrl, handleGenerateIncentiveQr,
  showFeedbackModal, setShowFeedbackModal, feedbackContent, setFeedbackContent, collectingLogs, isSubmittingFeedback, handleFeedback,
  showUploadModal, setShowUploadModal, isUploading, uploadFiles, setUploadFiles, handleUploadSubmission, dgConfig,
  nickname, setNickname
}: DailyGalleryDialogsProps) {
  const { user, profile } = useAuth();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const rawOpenid = searchParams.get('openid');
  const openid = useMemo(() => rawOpenid ? decodeOpenId(rawOpenid) : null, [rawOpenid]);

  const handleAcknowledge = async () => {
    if (currentAnn?.is_mandatory) {
      try {
        await api.acknowledgeAnnouncement(currentAnn.id, user?.id || profile?.id, openid);
        localStorage.setItem(`ann_shown_${currentAnn.id}`, 'true');
      } catch (e) {
        console.error('Acknowledge error:', e);
      }
    } else {
      localStorage.setItem(`ann_shown_${currentAnn.id}`, 'true');
    }
    setShowAnnModal(false);
  };

  return (
    <>
      {/* 公告弹窗 */}
      <Dialog 
        open={showAnnModal} 
        onOpenChange={(val) => {
          if (currentAnn?.is_mandatory && !val) return;
          setShowAnnModal(val);
        }}
      >
        <DialogContent 
          onPointerDownOutside={(e) => currentAnn?.is_mandatory && e.preventDefault()}
          onEscapeKeyDown={(e) => currentAnn?.is_mandatory && e.preventDefault()}
          className="sm:max-w-[400px] rounded-[2.5rem] p-8 border-none bg-slate-900/90 backdrop-blur-2xl text-white shadow-2xl overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] -translate-y-1/2 translate-x-1/2 rounded-full" />
          <DialogHeader className="relative z-10 text-center">
            <div className="w-16 h-16 rounded-3xl bg-primary/20 flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-white/10">
              <Megaphone className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">{currentAnn?.title}</DialogTitle>
            <div className="py-6 text-sm text-slate-300 leading-relaxed font-medium text-center">
              {currentAnn?.content}
            </div>
          </DialogHeader>
          <Button 
            className="relative z-10 w-full h-12 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 bg-primary hover:brightness-110 transition-all"
            onClick={handleAcknowledge}
          >
            {currentAnn?.is_mandatory ? '我已阅读并确认' : '我知道了'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* 验证码重置弹窗 */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg rounded-[2.5rem] p-0 border-none bg-slate-900/90 backdrop-blur-2xl text-white shadow-2xl overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight">重置访问限制</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs font-medium">
                  {wechatConfig?.type === 'service_auth' ? '请使用服务号扫码以重置限制' : '扫码获取新密码以解除锁定'}
                </DialogDescription>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-inner flex flex-col items-center justify-center">
              {resetQrUrl ? (
                <img src={resetQrUrl} alt="Reset QR" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-slate-100 rounded-2xl">
                  <RefreshCw className="w-8 h-8 text-slate-300 animate-spin" />
                </div>
              )}
              <div className="mt-4 text-slate-400 text-[10px] font-bold tracking-widest uppercase">
                {wechatConfig?.type === 'service_auth' ? '使用服务号扫码' : '扫码获取新密码'}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                <span className="text-primary font-bold">提示：</span> 重置后，您当前使用的浏览器将成为唯一的授权访问端。
              </p>
            </div>

            <Button 
              variant="ghost" 
              className="w-full h-12 rounded-2xl font-bold text-slate-400 hover:text-white hover:bg-white/5"
              onClick={() => setResetDialogOpen(false)}
            >
              取消
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 激励作者弹窗 */}
      <Dialog open={incentiveDialogOpen} onOpenChange={setIncentiveDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg rounded-[2.5rem] p-0 border-none bg-slate-900/90 backdrop-blur-2xl text-white shadow-2xl overflow-hidden">
          {incentiveStep === 'qr' ? (
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center shrink-0">
                  <Heart className="w-6 h-6 text-rose-500 fill-rose-500/20" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black tracking-tight">激励创作者</DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs font-medium">您的点赞与激励是作者持续更新的最大动力</DialogDescription>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-inner flex flex-col items-center justify-center">
                {incentiveQrUrl ? (
                  <img src={incentiveQrUrl} alt="Incentive QR" className="w-48 h-48" />
                ) : loadingIncentiveQr ? (
                  <div className="w-48 h-48 flex items-center justify-center bg-slate-100 rounded-2xl">
                    <RefreshCw className="w-8 h-8 text-slate-300 animate-spin" />
                  </div>
                ) : (
                  <Button variant="outline" onClick={handleGenerateIncentiveQr}>点击生成二维码</Button>
                )}
                <div className="mt-4 text-slate-400 text-[10px] font-bold tracking-widest uppercase">扫码完成激励</div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  <span className="text-rose-400 font-bold">小贴士：</span> 长按保存或扫码支付。感谢您的每一分支持。
                </p>
              </div>

              <Button 
                variant="ghost" 
                className="w-full h-12 rounded-2xl font-bold text-slate-400 hover:text-white hover:bg-white/5"
                onClick={() => setIncentiveDialogOpen(false)}
              >
                返回
              </Button>
            </div>
          ) : (
            <div className="p-12 text-center space-y-6 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center">
                <Heart className="w-10 h-10 text-rose-500 fill-rose-500 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight">万分感谢！</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">您的激励已收到，我们将继续努力提供更优质的内容。</p>
              </div>
              <Button 
                className="w-full h-12 rounded-2xl font-black bg-white text-slate-900 hover:bg-slate-50 transition-all shadow-xl shadow-black/20"
                onClick={() => setIncentiveDialogOpen(false)}
              >
                继续浏览
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 意见反馈弹窗 */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg rounded-[2.5rem] p-0 border-none bg-slate-900/90 backdrop-blur-2xl text-white shadow-2xl overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
                <Send className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight">意见反馈</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs font-medium">遇到问题或有任何建议？请告诉我们</DialogDescription>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">反馈内容</Label>
                <textarea 
                  className="w-full h-32 rounded-2xl bg-white/5 border border-white/10 p-4 text-sm focus:ring-2 focus:ring-primary outline-none resize-none transition-all placeholder:text-white/20"
                  placeholder="请详细描述您遇到的问题或建议..."
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                />
              </div>

              {collectingLogs.length > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                  <span className="text-[10px] text-blue-400 font-bold">已自动附带诊断日志 ({collectingLogs.length}条)</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                className="flex-1 h-12 rounded-2xl font-bold text-slate-400 hover:text-white hover:bg-white/5"
                onClick={() => setShowFeedbackModal(false)}
              >
                取消
              </Button>
              <Button 
                disabled={!feedbackContent.trim() || isSubmittingFeedback}
                className="flex-[2] h-12 rounded-2xl font-black bg-primary text-white shadow-xl shadow-primary/20"
                onClick={handleFeedback}
              >
                {isSubmittingFeedback ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                提交反馈
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 用户投稿弹窗 */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg rounded-[2.5rem] p-0 border-none bg-slate-900/90 backdrop-blur-2xl text-white shadow-2xl overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight">内容投稿</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs font-medium">{dgConfig.upload_hint || '分享您的精彩作品，与大家共同学习'}</DialogDescription>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">投稿人昵称</Label>
                <Input 
                  className="h-12 rounded-2xl bg-white/5 border border-white/10 px-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="请输入您的昵称"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">投稿文件</Label>
                <div 
                  className="w-full aspect-video rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 transition-all hover:bg-primary/5 group"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <LucideUpload className="w-10 h-10 text-slate-500 group-hover:text-primary transition-colors" />
                  <span className="text-xs text-slate-400 group-hover:text-primary/70">{uploadFiles.length > 0 ? `已选择 ${uploadFiles.length} 个文件` : '点击或拖拽上传图片/视频'}</span>
                  <input 
                    id="file-upload" 
                    type="file" 
                    multiple 
                    className="hidden" 
                    accept="image/*,video/*"
                    onChange={(e) => {
                      if (e.target.files) {
                        setUploadFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                className="flex-1 h-12 rounded-2xl font-bold text-slate-400 hover:text-white hover:bg-white/5"
                onClick={() => setShowUploadModal(false)}
              >
                取消
              </Button>
              <Button 
                disabled={!nickname || uploadFiles.length === 0 || isUploading}
                className="flex-[2] h-12 rounded-2xl font-black bg-primary text-white shadow-xl shadow-primary/20"
                onClick={handleUploadSubmission}
              >
                {isUploading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                立即投稿
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
