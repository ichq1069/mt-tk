import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ImageIcon, Scissors, Loader2, Grid } from "lucide-react";
import { toast } from "sonner";
import { ProtectedMedia } from '@/components/common/ProtectedMedia';

/**
 * 前端实时将完整图片分割为 2x2 四宫格切片
 * @param imgSrc 完整图片地址/Base64
 * @returns 4 个切片的 Base64 数组（顺序：左上、右上、左下、右下）
 */
const generateGridSlices = async (imgSrc: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    // 1. 创建图片对象加载完整图片
    const img = new Image();
    img.crossOrigin = 'anonymous'; // 解决跨域图片绘制问题
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) reject(new Error('Canvas 上下文创建失败'));

        // 2. 计算四宫格切片尺寸（精准覆盖全图，处理奇数像素）
        const fullWidth = img.naturalWidth;
        const fullHeight = img.naturalHeight;
        const leftWidth = Math.floor(fullWidth / 2);
        const rightWidth = fullWidth - leftWidth;
        const topHeight = Math.floor(fullHeight / 2);
        const bottomHeight = fullHeight - topHeight;

        // 3. 定义四宫格切片的绘制区域 [x, y, width, height]
        const gridRegions = [
          [0, 0, leftWidth, topHeight],               // 左上
          [leftWidth, 0, rightWidth, topHeight],      // 右上
          [0, topHeight, leftWidth, bottomHeight],    // 左下
          [leftWidth, topHeight, rightWidth, bottomHeight], // 右下
        ];

        // 4. 逐个绘制切片并转为 Base64
        const sliceBase64List: string[] = [];
        gridRegions.forEach(([x, y, w, h]) => {
          // 创建临时 Canvas 绘制单个切片
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = w;
          sliceCanvas.height = h;
          const sliceCtx = sliceCanvas.getContext('2d')!;
          
          // 从原图截取对应区域绘制到切片 Canvas
          sliceCtx.drawImage(
            img,        // 原图
            x, y, w, h, // 原图上的截取区域
            0, 0, w, h  // 切片 Canvas 上的绘制区域
          );

          // 转为 Base64（PNG 无损格式）
          const base64 = sliceCanvas.toDataURL('image/png');
          sliceBase64List.push(base64);
        });

        resolve(sliceBase64List);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = imgSrc; // 加载完整图片
  });
};

// 组件示例：选择图片 → 实时生成四宫格切片 → 预览
export const ImageGridSlicer = () => {
  const [fullImageSrc, setFullImageSrc] = useState<string | null>(null);
  const [sliceList, setSliceList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 选择图片并加载
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFullImageSrc(ev.target?.result as string);
      setSliceList([]); // 清除旧切片
    };
    reader.readAsDataURL(file);
  };

  // 生成四宫格切片
  const handleGenerateSlices = async () => {
    if (!fullImageSrc) return;
    setLoading(true);
    try {
      const slices = await generateGridSlices(fullImageSrc);
      setSliceList(slices);
      toast.success('四宫格切片生成成功');
    } catch (err) {
      toast.error(`切片生成失败：${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Scissors className="w-5 h-5" />
            切片演示与测试工具
          </CardTitle>
          <CardDescription>
            此工具用于本地测试图片在 2x2 网格下的分割效果。上传一张图片后点击生成，即可预览。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-auto">
              <input
                type="file"
                id="slice-test-upload"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              <Button
                onClick={() => document.getElementById('slice-test-upload')?.click()}
                variant="outline"
                className="w-full sm:w-auto rounded-xl gap-2 h-11"
              >
                <ImageIcon className="w-4 h-4" />
                选择本地图片
              </Button>
            </div>
            
            <Button
              onClick={handleGenerateSlices}
              disabled={!fullImageSrc || loading}
              className="w-full sm:w-auto rounded-xl gap-2 h-11 font-bold"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Grid className="w-4 h-4" />
              )}
              {loading ? '生成中...' : '生成四宫格切片'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* 预览完整图片 */}
            {fullImageSrc && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  完整原图预览
                </h4>
                <div className="aspect-video rounded-2xl border-2 border-dashed border-muted overflow-hidden flex items-center justify-center bg-muted/20">
                  <img referrerPolicy="no-referrer" src={fullImageSrc} alt="Full" className="max-w-full max-h-full object-contain" />
                </div>
              </div>
            )}

            {/* 预览四宫格拼接效果 (模拟真实环境) */}
            {fullImageSrc && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  拼接还原效果 (Canvas 拼接)
                </h4>
                <div className="aspect-video rounded-2xl border-2 border-dashed border-blue-200 overflow-hidden flex items-center justify-center bg-blue-50/20">
                  <ProtectedMedia 
                    src={fullImageSrc} 
                    type="image" 
                    forceMode="blob_slice"
                    className="max-w-full max-h-full"
                    ruleKey="后"
                  />
                </div>
              </div>
            )}

            {/* 预览四宫格切片 */}
            {sliceList.length > 0 && (
              <div className="space-y-3 lg:col-span-1">
                <h4 className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  四宫格切片效果 (左上/右上/左下/右下)
                </h4>
                <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-2xl overflow-hidden border border-muted-foreground/10">
                  {sliceList.map((slice, idx) => (
                    <div key={idx} className="bg-white/5 relative group">
                      <img referrerPolicy="no-referrer" src={slice} alt={`Slice ${idx}`} className="w-full h-auto" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                        <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                          切片 {idx + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {!fullImageSrc && !loading && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-muted rounded-3xl bg-muted/5">
              <ImageIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground font-medium">尚未选择图片，请上传本地图片以开始测试</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
