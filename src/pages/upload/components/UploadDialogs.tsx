import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, ShieldAlert, Link as LinkIcon, AlertCircle, Image as ImageIcon, RefreshCw, X, Download, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UploadDialogsProps {
  thumbnailSelectFileId: string | null;
  setThumbnailSelectFileId: (id: string | null) => void;
  files: any[];
  setFiles: React.Dispatch<React.SetStateAction<any[]>>;
  isErrorReportOpen: boolean;
  setIsErrorReportOpen: (open: boolean) => void;
  handleRetrySingle: (id: string) => void;
  handleCopyErrors: () => void;
  showIframeUpload: boolean;
  setShowIframeUpload: (open: boolean) => void;
  iframeLoadFailed: boolean;
  setIframeLoadFailed: (failed: boolean) => void;
  iframeLoading: boolean;
  setIframeLoading: (loading: boolean) => void;
  batchUrls: string;
  setBatchUrls: (urls: string) => void;
}

// iframe 加载超时检测组件
const TimeoutCheck = ({ onTimeout, timeout = 5000 }: { onTimeout: () => void; timeout?: number }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onTimeout();
    }, timeout);
    return () => clearTimeout(timer);
  }, [onTimeout, timeout]);
  return null;
};

export const UploadDialogs: React.FC<UploadDialogsProps> = ({
  thumbnailSelectFileId,
  setThumbnailSelectFileId,
  files,
  setFiles,
  isErrorReportOpen,
  setIsErrorReportOpen,
  handleRetrySingle,
  handleCopyErrors,
  showIframeUpload,
  setShowIframeUpload,
  iframeLoadFailed,
  setIframeLoadFailed,
  iframeLoading,
  setIframeLoading,
  batchUrls,
  setBatchUrls
}) => {
  return (
    <>
      {/* 视频缩略图选择弹窗 */}
      <Dialog 
        open={!!thumbnailSelectFileId} 
        onOpenChange={(open) => !open && setThumbnailSelectFileId(null)}
      >
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>选择视频封面</DialogTitle>
            <DialogDescription>
              从提取的备选帧中选择一个作为视频封面
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {thumbnailSelectFileId && (
              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  const fileObj = files.find(f => f.id === thumbnailSelectFileId);
                  if (!fileObj?.thumbnailOptions || fileObj.thumbnailOptions.length === 0) {
                    return (
                      <div className="col-span-2 p-10 text-center text-muted-foreground flex flex-col items-center gap-2 border-2 border-dashed rounded-xl">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <p className="text-xs">正在提取备选帧...</p>
                      </div>
                    );
                  }
                  return fileObj.thumbnailOptions.map((opt: string, i: number) => (
                    <div 
                      key={i} 
                      className={cn(
                        "relative aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:border-primary",
                        fileObj.thumbnailPreview === opt ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent bg-muted"
                      )}
                      onClick={() => {
                        const blob = fileObj.thumbnailBlobs?.[i];
                        if (blob) {
                          setFiles(prev => prev.map(f => f.id === thumbnailSelectFileId ? {
                            ...f,
                            thumbnailBlob: blob,
                            thumbnailPreview: opt,
                            manualThumbnailBlob: undefined // 清除手动上传的
                          } : f));
                        }
                      }}
                    >
                      <img src={opt} alt={`帧 ${i + 1}`} className="w-full h-full object-contain" />
                      {fileObj.thumbnailPreview === opt && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-primary fill-white" />
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setThumbnailSelectFileId(null)} className="rounded-xl w-full">完成选择</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 上传错误汇总报告 */}
      <Dialog open={isErrorReportOpen} onOpenChange={setIsErrorReportOpen}>
        <DialogContent className="rounded-2xl max-w-sm max-h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-5 h-5" /> 上传问题报告
            </DialogTitle>
            <DialogDescription>
              以下文件在上传过程中遇到了问题
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3">
            {files.filter(f => f.status === 'error').map((file, i) => (
              <div key={i} className="p-3 rounded-xl bg-red-50 border border-red-100 space-y-1">
                <p className="text-xs font-bold text-red-900 flex items-center justify-between">
                  <span className="truncate max-w-[180px]">{file.file.name}</span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-5 px-1.5 text-[8px] bg-red-100 hover:bg-red-200 text-red-700 rounded-md"
                    onClick={() => handleRetrySingle(file.id)}
                  >
                    重试
                  </Button>
                </p>
                <p className="text-[10px] text-red-700 leading-relaxed break-words font-mono bg-white/50 p-1.5 rounded-lg border border-red-200/50">
                  {file.errorMsg || '未知系统错误'}
                </p>
              </div>
            ))}
          </div>

          <DialogFooter className="p-6 pt-2 border-t bg-muted/30">
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                onClick={handleCopyErrors} 
                className="flex-1 rounded-xl h-10 text-xs"
              >
                复制全部错误
              </Button>
              <Button 
                onClick={() => setIsErrorReportOpen(false)} 
                className="flex-1 rounded-xl h-10 text-xs"
              >
                关闭
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PostImages 外部上传弹窗 */}
      <Dialog 
        open={showIframeUpload} 
        onOpenChange={(open) => {
          setShowIframeUpload(open);
          if (!open) {
            // 关闭时重置状态
            setIframeLoadFailed(false);
            setIframeLoading(true);
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-4xl w-[95vw] h-[85vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 border-b bg-muted/30 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <LinkIcon className="w-5 h-5 text-primary" /> 
              通过 PostImages 上传图片
            </DialogTitle>
            <DialogDescription className="text-xs">
              {iframeLoadFailed ? '该网站禁止内嵌，请使用新窗口打开' : '在内嵌页面中完成上传，复制图片链接后关闭此窗口粘贴到下方文本框'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 relative bg-muted">
            {/* 加载中状态 */}
            {iframeLoading && !iframeLoadFailed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted z-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">正在加载...</p>
                <p className="text-[10px] text-muted-foreground mt-2">如果长时间无响应，可能是网站禁止内嵌</p>
              </div>
            )}

            {/* iframe 加载失败时的替代界面 */}
            {iframeLoadFailed ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted p-6">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold mb-2">无法内嵌打开</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                  该网站设置了安全策略，禁止在 iframe 中打开。请使用以下替代方案：
                </p>
                
                <div className="space-y-3 w-full max-w-sm">
                  <Button 
                    variant="default"
                    className="w-full h-12 rounded-xl"
                    onClick={() => {
                      window.open('https://postimages.org/zh-cn/', '_blank', 'noopener,noreferrer');
                      toast.success('已在新窗口打开 PostImages，请上传后复制链接回来');
                    }}
                  >
                    <LinkIcon className="w-5 h-5 mr-2" />
                    在新窗口打开 PostImages
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="w-full h-12 rounded-xl"
                    onClick={() => {
                      window.open('https://imgbb.com/', '_blank', 'noopener,noreferrer');
                      toast.success('已在新窗口打开 ImgBB，请上传后复制链接回来');
                    }}
                  >
                    <ImageIcon className="w-5 h-5 mr-2" />
                    尝试 ImgBB 图床
                  </Button>

                  <Button 
                    variant="outline"
                    className="w-full h-12 rounded-xl"
                    onClick={() => {
                      window.open('https://sm.ms/', '_blank', 'noopener,noreferrer');
                      toast.success('已在新窗口打开 SM.MS，请上传后复制链接回来');
                    }}
                  >
                    <ImageIcon className="w-5 h-5 mr-2" />
                    尝试 SM.MS 图床
                  </Button>
                </div>

                <div className="mt-6 p-3 bg-primary/5 rounded-xl border border-primary/10 w-full max-w-sm">
                  <p className="text-xs text-primary font-medium mb-1">💡 提示：</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    在新窗口完成上传后，复制图片链接，回到本页面粘贴到「资源链接列表」即可。
                  </p>
                </div>
              </div>
            ) : (
              <iframe
                src="https://postimages.org/zh-cn/"
                className="w-full h-full border-0"
                title="PostImages 上传"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                onLoad={() => {
                  setIframeLoading(false);
                }}
                onError={() => {
                  setIframeLoadFailed(true);
                  setIframeLoading(false);
                }}
              />
            )}
          </div>

          {/* 超时检测 */}
          {iframeLoading && !iframeLoadFailed && (
            <TimeoutCheck 
              onTimeout={() => {
                setIframeLoadFailed(true);
                setIframeLoading(false);
              }}
            />
          )}

          <DialogFooter className="p-4 border-t bg-muted/30 shrink-0 flex flex-col gap-3">
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 w-full">
              <p className="text-xs text-primary font-medium mb-1">使用步骤：</p>
              <ol className="text-[10px] text-muted-foreground list-decimal list-inside space-y-0.5">
                <li>在新打开的页面中选择要上传的图片文件</li>
                <li>等待上传完成，系统会自动生成多种尺寸链接</li>
                <li>复制 <strong>「直链」</strong> 或 <strong>「缩略图」</strong> 链接</li>
                <li>关闭此窗口，将链接粘贴到「资源链接列表」文本框中</li>
              </ol>
            </div>
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                onClick={() => setShowIframeUpload(false)} 
                className="flex-1 rounded-xl h-11"
              >
                关闭窗口
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                      const newUrls = batchUrls ? batchUrls + '\n' + text : text;
                      setBatchUrls(newUrls);
                      setShowIframeUpload(false);
                      toast.success('已自动从剪贴板添加链接');
                    } else {
                      setShowIframeUpload(false);
                      toast.success('请手动将链接粘贴到资源链接列表中');
                    }
                  } catch (e) {
                    setShowIframeUpload(false);
                    toast.success('请手动将链接粘贴到资源链接列表中');
                  }
                }} 
                className="flex-1 rounded-xl h-11"
              >
                已完成上传
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
