import { PhotoAlbum, Profile } from '@/types';

export function checkHasAlbumAccess(
  targetAlbum: PhotoAlbum | null, 
  profile: Profile | null, 
  albumPermission: string | null,
  levelWeightMap: Record<string, number>,
  effectiveUserLevel: string
) {
  if (!targetAlbum) return false;
  if (profile?.role === 'admin') return true;

  // 第一步：权限组校验 (白名单逻辑)
  let hasGroupAccess = true;
  const allowedGroupIds = targetAlbum.allowed_group_ids || [];
  if (allowedGroupIds.length > 0) {
    if (!profile?.group_id || !allowedGroupIds.includes(profile.group_id)) {
      hasGroupAccess = false;
    }
  } else if (targetAlbum.permission_group_id && !targetAlbum.is_public) {
    // 兼容旧版单一 group_id
    if (profile?.group_id !== targetAlbum.permission_group_id) {
      hasGroupAccess = false;
    }
  }

  // 如果已经获得了专属授权，则无视权限组限制
  if (albumPermission) {
    hasGroupAccess = true;
  }

  if (!hasGroupAccess) return false;

  // 第二步：图集门槛校验
  const albumMinLevel = targetAlbum.level || 'pt';
  const userW = levelWeightMap[effectiveUserLevel as any] || 1;
  const albumW = levelWeightMap[albumMinLevel as any] || 1;

  // 如果获得了专属授权，我们认为已经过管理员审核或通过申请，准许进入图集
  if (albumPermission) return true;

  return userW >= albumW;
}

export const levelWeightMap: Record<string, number> = { 
  'normal': 1, 'pt': 1, 'vip': 2, 'svip': 3, 'restricted': 4, 'vvip': 4 
};
