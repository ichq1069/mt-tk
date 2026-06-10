import SparkMD5 from 'spark-md5';
import { supabase } from '@/db/supabase';
import { extractVideoFrame, extractZoneramaPhotoId } from '@/lib/media';

// 计算文件 MD5
export const calculateFileMD5 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const blobSlice = File.prototype.slice;
    const chunkSize = 2097152; // 2MB
    const chunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;
    const spark = new SparkMD5.ArrayBuffer();
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      spark.append(e.target?.result as ArrayBuffer);
      currentChunk++;

      if (currentChunk < chunks) {
        loadNext();
      } else {
        resolve(spark.end());
      }
    };

    fileReader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    const loadNext = () => {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
    };

    loadNext();
  });
};

// 限制并发执行的工具函数
export const runWithLimit = async <T, R>(limit: number, items: T[], iteratorFn: (item: T, index: number) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  
  const executor = async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      try {
        results[index] = await iteratorFn(items[index], index);
      } catch (err) {
        console.error(`Task at index ${index} failed:`, err);
      }
    }
  };
  
  const workers = Array.from({ length: Math.min(items.length, limit) }, executor);
  await Promise.all(workers);
  return results;
};

// 提取视频缩略图的辅助函数
export const extractVideoThumbnail = async (file: File | Blob | string, time: number = 2.0): Promise<Blob> => {
  return await extractVideoFrame(file, time);
};

// 生成图片缩略图
export const generateImageThumbnail = (file: File | Blob, size = 480, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error('Canvas error'));
      }
      
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > size) {
          height *= size / width;
          width = size;
        }
      } else {
        if (height > size) {
          width *= size / height;
          height = size;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) resolve(blob);
        else reject(new Error('Blob error'));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image error'));
    };
    img.src = url;
  });
};

// 生成默认标题
export const generateDefaultTitle = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomLetter = letters.charAt(Math.floor(Math.random() * letters.length));
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const randomDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${randomLetter}${year}${month}${day}${hours}${minutes}${seconds}${randomDigits}`;
};

// 批量检查 Zonerama 图片是否已存在
export const checkZoneramaExistence = async (photoIds: string[]) => {
  if (photoIds.length === 0) return new Set<string>();
  
  const chunkSize = 100;
  const existingIdsSet = new Set<string>();
  
  for (let i = 0; i < photoIds.length; i += chunkSize) {
    const chunk = photoIds.slice(i, i + chunkSize);
    
    const [mediaRes, albumRes] = await Promise.all([
      supabase.from('media_items').select('zonerama_photo_id').in('zonerama_photo_id', chunk).is('deleted_at', null),
      supabase.from('album_photos').select('zonerama_photo_id').in('zonerama_photo_id', chunk)
    ]);

    (mediaRes.data || []).forEach((item: any) => {
      if (item.zonerama_photo_id) existingIdsSet.add(item.zonerama_photo_id);
    });
    (albumRes.data || []).forEach((item: any) => {
      if (item.zonerama_photo_id) existingIdsSet.add(item.zonerama_photo_id);
    });

    const remainingIds = chunk.filter(id => !existingIdsSet.has(id));
    if (remainingIds.length > 0) {
      const { data: urlMatches } = await supabase
        .from('media_items')
        .select('url')
        .or(remainingIds.map(id => `url.ilike.%${id}%`).join(','))
        .is('deleted_at', null);

      (urlMatches || []).forEach((item: any) => {
        const foundId = remainingIds.find(id => item.url?.includes(id));
        if (foundId) existingIdsSet.add(foundId);
      });
    }
  }

  return existingIdsSet;
};

// 批量检查常规 URL 是否已存在
export const checkUrlExistence = async (urls: string[]) => {
  if (urls.length === 0) return new Set<string>();
  
  const chunkSize = 100;
  const existingUrlsSet = new Set<string>();
  
  for (let i = 0; i < urls.length; i += chunkSize) {
    const chunk = urls.slice(i, i + chunkSize);
    const { data } = await supabase.from('media_items').select('url').in('url', chunk).is('deleted_at', null);
    (data || []).forEach((item: any) => {
      if (item.url) existingUrlsSet.add(item.url);
    });
  }

  return existingUrlsSet;
};

// 检查文件 MD5 是否已存在
export const checkMd5Existence = async (md5s: string[]) => {
  if (md5s.length === 0) return new Set<string>();
  
  const chunkSize = 100;
  const existingMd5Set = new Set<string>();
  
  for (let i = 0; i < md5s.length; i += chunkSize) {
    const chunk = md5s.slice(i, i + chunkSize);
    const { data } = await supabase.from('media_items').select('file_md5').in('file_md5', chunk).is('deleted_at', null);
    (data || []).forEach((item: any) => {
      if (item.file_md5) existingMd5Set.add(item.file_md5);
    });
  }

  return existingMd5Set;
};
