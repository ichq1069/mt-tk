import React from 'react';
import { Video, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CircularProgress } from '@/components/ui/circular-progress';
import { cn } from '@/lib/utils';

interface UploadFileObj {
  file: File;
  preview: string;
  id: string;
  status: 'idle' | 'uploading' | 'success' | 'error' | 'duplicate';
  progress: number;
  errorMsg?: string;
  thumbnailPreview?: string;
}

interface FilePreviewCardProps {
  fileObj: UploadFileObj;
  isAdmin: boolean;
  uploadMode: 'wallpaper' | 'album';
  isAnyUploading: boolean;
  albumPhotoLevels: Record<string, 'normal' | 'non_restricted' | 'restricted'>;
  setAlbumPhotoLevels: React.Dispatch<React.SetStateAction<Record<string, 'normal' | 'non_restricted' | 'restricted'>>>;
  removeFile: (id: string) => void;
  handleRetrySingle: (id: string) => void;
  onSelectThumbnail: (id: string) => void;
  onManualThumbnail: (id: string, file: File) => void;
}

export const FilePreviewCard: React.FC<FilePreviewCardProps> = ({
  fileObj,
  isAdmin,
  uploadMode,
  isAnyUploading,
  albumPhotoLevels,
  setAlbumPhotoLevels,
  removeFile,
  handleRetrySingle,
  onSelectThumbnail,
  onManualThumbnail,
}) => {
  const thumbInputRef = React.useRef<HTMLInputElement>(null);
  const isVideo = !fileObj.file.type.startsWith('image/') && 
                  !fileObj.file.name.toLowerCase().endsWith('.heic') && 
                  !fileObj.file.name.toLowerCase().endsWith('.heif');

  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-muted group animate-in zoom-in-95">
      {/* 预览图 */}
      {!isVideo ? (
        <img src={fileObj.thumbnailPreview || fileObj.preview} alt="preview" className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full relative group/video">
          {fileObj.thumbnailPreview ? (
            <img 
              src={fileObj.thumbnailPreview} 
              alt="preview" 
              className="w-full h-full object-contain" 
              {...({ referrerPolicy: "no-referrer" } as any)}
            />
          ) : (
            <video 
              referrerPolicy="no-referrer" 
              src={fileObj.preview} 
              className="w-full h-full object-contain bg-black"
              muted
              playsInline
              {...({ referrerPolicy: "no-referrer" } as any)}
              onLoadedMetadata={(e) => {
                const v = e.target as HTMLVideoElement;
                v.currentTime = 0.5;
              }}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/video:bg-black/10 transition-colors">
            <Video className="w-6 h-6 text-white/70 shadow-lg" />
          </div>
        </div>
      )}

      {/* 上传中覆盖层 - 实时圆圈进度 */}
      {fileObj.status === 'uploading' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
          <CircularProgress value={fileObj.progress} size={50} strokeWidth={4} />
        </div>
      )}

      {/* 成功状态覆盖层 */}
      {fileObj.status === 'success' && (
        <div className="absolute inset-0 bg-green-500/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white">
          <CheckCircle2 className="w-8 h-8 animate-in zoom-in-50" />
          <span className="text-[10px] font-bold mt-1">已成功</span>
        </div>
      )}

      {/* 错误状态覆盖层 */}
      {fileObj.status === 'error' && (
        <div className="absolute inset-0 bg-red-500/80 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-2">
          <AlertCircle className="w-8 h-8" />
          <span className="text-[8px] font-bold mt-1 text-center line-clamp-2">
            {fileObj.errorMsg || '失败'}
          </span>
          {!isAnyUploading && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 mt-1 text-[8px] bg-white/20 hover:bg-white/40 border-none text-white rounded-lg px-2"
              onClick={(e) => {
                e.stopPropagation();
                handleRetrySingle(fileObj.id);
              }}
            >
              重试上传
            </Button>
          )}
        </div>
      )}

      {/* 重复状态覆盖层 */}
      {fileObj.status === 'duplicate' && (
        <div className="absolute inset-0 bg-amber-500/80 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-[10px] font-bold mt-1 text-center line-clamp-2">
            {fileObj.errorMsg || '已重复'}
          </span>
        </div>
      )}
      
      {/* 删除按钮 (仅限待上传或失败状态) */}
      {!isAnyUploading && fileObj.status !== 'success' && (
        <Button 
          variant="destructive" 
          size="icon" 
          className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
          onClick={(e) => {
            e.stopPropagation();
            removeFile(fileObj.id);
          }}
        >
          <X className="w-3 h-3" />
        </Button>
      )}

      {/* 照片权限级别选择 (仅限图集模式) */}
      {isAdmin && uploadMode === 'album' && fileObj.status === 'idle' && (
        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/60 backdrop-blur-md animate-in slide-in-from-bottom-2 duration-300">
          <Select 
            value={albumPhotoLevels[fileObj.id] || 'normal'} 
            onValueChange={(val: 'normal' | 'non_restricted' | 'restricted') => 
              setAlbumPhotoLevels(prev => ({ ...prev, [fileObj.id]: val }))
            }
          >
            <SelectTrigger className="h-6 text-[10px] bg-white/10 border-white/20 text-white rounded-lg px-2 py-0 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/50">
              <SelectItem value="normal" className="text-[10px]">普通照片</SelectItem>
              <SelectItem value="non_restricted" className="text-[10px]">写真展示图</SelectItem>
              <SelectItem value="restricted" className="text-[10px]">写真加密图</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 更换封面按钮（仅视频） */}
      {!isAnyUploading && fileObj.status === 'idle' && fileObj.file.type.startsWith('video/') && (
        <div className="absolute bottom-1 left-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
          <input 
            type="file" 
            className="hidden" 
            accept="image/*"
            ref={thumbInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onManualThumbnail(fileObj.id, file);
            }}
          />
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full h-6 text-[8px] bg-black/60 text-white border-none rounded-lg hover:bg-black/80 backdrop-blur-md shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              onSelectThumbnail(fileObj.id);
            }}
          >
            选择备选封面
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full h-6 text-[8px] bg-black/60 text-white border-none rounded-lg hover:bg-black/80 backdrop-blur-md shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              thumbInputRef.current?.click();
            }}
          >
            本地上传封面
          </Button>
        </div>
      )}
    </div>
  );
};
