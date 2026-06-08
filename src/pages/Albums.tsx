import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Loader2, Image as ImageIcon, LayoutGrid, Library
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { NativeAd } from '@/components/common/NativeAd';
import { useAds } from '@/contexts/AdContext';
import { toast } from 'sonner';
import { cn, compressImage } from '@/lib/utils';
import type { PhotoAlbum, AlbumCustomField } from '@/types';
import { useWaterfallScrollKeep } from '@/hooks/useWaterfallScrollKeep';
import { AlbumCardSkeleton } from '@/components/AlbumCardSkeleton';
import { PullToRefresh } from '@/components/common/PullToRefresh';

import { AlbumCard } from './albums/components/AlbumCard';
import { AlbumHeader } from './albums/components/AlbumHeader';
import { AlbumRequestDialog } from './albums/components/AlbumRequestDialog';
import { BookshelfView } from './albums/components/BookshelfView';

export default function Albums() {
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const { getAdsByPlacement } = useAds();
  const [customFields, setCustomFields] = useState<AlbumCustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [viewType, setViewType] = useState<'public' | 'joined'>('public');
  const [displayMode, setDisplayMode] = useState<'grid' | 'bookshelf'>('grid');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const limit = 20;
  const { profile, openLoginDialog } = useAuth();
  const navigate = useNavigate();
  const hasMore = albums.length < total;
  
  // 申请权限相关状态
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestAlbumId, setRequestAlbumId] = useState<string | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [requestAttachment, setRequestAttachment] = useState<File | null>(null);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [userPermissions, setUserPermissions] = useState<any[]>([]);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 集成滚动保持逻辑
  useWaterfallScrollKeep({
    key: 'albums_list',
    data: albums,
    onRestore: (data) => {
      if (data && Array.isArray(data)) {
        setAlbums(data);
        setLoading(false);
      }
    },
    debounceTime: 300
  });

  const fetchFields = useCallback(async () => {
    const fieldRes = await api.getAlbumCustomFields();
    if (fieldRes.data) {
      setCustomFields(fieldRes.data.filter((f: any) => f.is_active && (f.is_searchable || f.is_filterable)));
    }
  }, []);

  const fetchData = useCallback(async (pageNum = 0, type = viewType) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);
    
    let albumRes;
    if (type === 'public') {
      albumRes = await api.getPhotoAlbums(pageNum, limit);
    } else {
      if (!profile?.id) {
        albumRes = { data: [], total: 0, error: null };
      } else {
        albumRes = await api.getJoinedPrivateAlbums(profile.id, pageNum, limit);
      }
    }

    if (albumRes.data) {
      if (pageNum === 0) setAlbums(albumRes.data);
      else setAlbums(prev => [...prev, ...albumRes.data!]);
      setTotal(albumRes.total || 0);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [viewType, profile?.id]);

  const fetchMyRequests = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await api.getMyAlbumAccessRequests(profile.id);
    if (data) setMyRequests(data);
  }, [profile?.id]);

  const fetchUserPermissions = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await api.getMyAlbumUserPermissions(profile.id);
    if (data) setUserPermissions(data);
  }, [profile?.id]);

  useEffect(() => {
    fetchData(0, viewType);
    fetchFields();
  }, [viewType, fetchData, fetchFields]);

  useEffect(() => {
    if (profile?.id) {
      fetchMyRequests();
      fetchUserPermissions();
    }
  }, [profile?.id, fetchMyRequests, fetchUserPermissions]);

  // 自动加载下一页
  useEffect(() => {
    if (loading || loadingMore || albums.length >= total) return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchData(nextPage, viewType);
      }
    }, { threshold: 0.1 });
    
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, albums.length, total, page, viewType, fetchData]);

  const handleRefresh = async () => {
    setPage(0);
    await fetchData(0, viewType);
  };

  const checkHasAccess = (album: PhotoAlbum) => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;

    const userPerm = userPermissions.find(up => up.album_id === album.id);
    let hasGroupAccess = true;
    const allowedGroupIds = album.allowed_group_ids || [];
    
    if (allowedGroupIds.length > 0) {
      if (!profile.group_id || !allowedGroupIds.includes(profile.group_id)) {
        hasGroupAccess = false;
      }
    } else if (album.permission_group_id && !album.is_public) {
      if (profile.group_id !== album.permission_group_id) {
        hasGroupAccess = false;
      }
    }

    if (userPerm) hasGroupAccess = true;
    if (!hasGroupAccess) return false;

    let effectiveLevel = profile.album_level || 'pt';
    if (userPerm) effectiveLevel = userPerm.level;

    const levelWeight: Record<string, number> = { 'pt': 1, 'vip': 2, 'svip': 3, 'vvip': 4, 'restricted': 4 };
    const albumMinLevel = album.level || 'pt';
    const userW = levelWeight[effectiveLevel as any] || 1;
    const albumW = levelWeight[albumMinLevel as any] || 1;

    if (userPerm) return true;
    return userW >= albumW;
  };

  const handleSubmitRequest = async () => {
    if (!profile) {
      openLoginDialog?.();
      return;
    }
    if (!requestReason) {
      toast.error('请填写申请理由');
      return;
    }
    setRequestSubmitting(true);
    try {
      let attachmentUrl = '';
      if (requestAttachment) {
        const processedFile = await compressImage(requestAttachment);
        const { data: uploadRes, error: uploadError } = await api.uploadToR2(
          processedFile,
          `requests/${profile.id}/${Date.now()}_${requestAttachment.name}`
        );
        if (uploadError) throw uploadError;
        attachmentUrl = uploadRes?.publicUrl || '';
      }
      
      const { error } = await api.submitAlbumAccessRequest(
        profile.id,
        requestAlbumId!,
        requestReason,
        attachmentUrl
      );
      if (error) throw error;
      
      toast.success('申请已提交，请等待管理员审核');
      setShowRequestModal(false);
      setRequestReason('');
      setRequestAttachment(null);
      setRequestAlbumId(null);
      fetchMyRequests();
    } catch (e: any) {
      toast.error('提交申请失败: ' + e.message);
    } finally {
      setRequestSubmitting(false);
    }
  };

  const filteredAlbums = useMemo(() => {
    return albums.filter(album => {
      const searchStr = searchTerm.toLowerCase();
      const nameMatch = album.title.toLowerCase().includes(searchStr);
      const searchableFields = customFields.filter((f: any) => f.is_searchable);
      const customSearchMatch = searchableFields.some(field => {
        const val = album.custom_field_values?.[field.id];
        if (!val) return false;
        if (Array.isArray(val)) return val.some(v => String(v).toLowerCase().includes(searchStr));
        return String(val).toLowerCase().includes(searchStr);
      });

      const isSearchMatch = searchTerm === '' || nameMatch || customSearchMatch;

      const isFilterMatch = Object.entries(filters).every(([fieldId, filterVal]) => {
        if (!filterVal) return true;
        const albumVal = album.custom_field_values?.[fieldId];
        if (!albumVal) return false;
        if (Array.isArray(albumVal)) return albumVal.includes(filterVal);
        return String(albumVal) === filterVal;
      });

      const isLevelMatch = selectedLevel === 'all' || 
        (album.level || 'pt') === selectedLevel || 
        (selectedLevel === 'vvip' && (album.level === 'restricted' || album.level === 'vvip')) ||
        (selectedLevel === 'restricted' && (album.level === 'restricted' || album.level === 'vvip'));

      return isSearchMatch && isFilterMatch && isLevelMatch && album.photo_count > 0;
    });
  }, [albums, searchTerm, filters, selectedLevel, customFields]);

  const albumAds = getAdsByPlacement('album_list');

  return (
    <div className="min-h-screen bg-background">
      <AlbumHeader 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFiltersChange={setFilters}
        selectedLevel={selectedLevel}
        onLevelChange={setSelectedLevel}
        customFields={customFields}
        onClearSearch={() => setSearchTerm('')}
      />

      <main className="max-w-7xl mx-auto p-4 md:p-6 pb-24">
        <div className="flex items-center justify-center mb-8 gap-4 flex-wrap">
          <div className="bg-muted/50 backdrop-blur-sm p-1 rounded-2xl flex gap-1 border border-border/40">
            <Button 
              variant={viewType === 'public' ? 'default' : 'ghost'} 
              size="sm" 
              className={cn("rounded-xl font-black text-xs px-8 h-10", viewType === 'public' && "shadow-lg shadow-primary/20")}
              onClick={() => setViewType('public')}
            >
              专题大厅
            </Button>
            <Button 
              variant={viewType === 'joined' ? 'default' : 'ghost'} 
              size="sm" 
              className={cn("rounded-xl font-black text-xs px-8 h-10", viewType === 'joined' && "shadow-lg shadow-primary/20")}
              onClick={() => {
                if (!profile) {
                  openLoginDialog?.();
                  return;
                }
                setViewType('joined');
              }}
            >
              我的收藏
            </Button>
          </div>

          {viewType === 'public' && (
            <div className="bg-muted/50 backdrop-blur-sm p-1 rounded-2xl flex gap-1 border border-border/40">
              <Button
                variant={displayMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn("rounded-xl h-9 w-9 p-0", displayMode === 'grid' && "shadow-md")}
                onClick={() => setDisplayMode('grid')}
                title="网格视图"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={displayMode === 'bookshelf' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn("rounded-xl h-9 w-9 p-0", displayMode === 'bookshelf' && "shadow-md")}
                onClick={() => setDisplayMode('bookshelf')}
                title="书架视图"
              >
                <Library className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <PullToRefresh onRefresh={handleRefresh}>
          {loading && albums.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <AlbumCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredAlbums.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
              <div className="w-20 h-20 rounded-[2.5rem] bg-muted/50 flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black tracking-tight">暂无相关图集</h3>
                <p className="text-sm text-muted-foreground font-medium">换个搜索词或清除筛选试试看</p>
                {(searchTerm || Object.values(filters).some(Boolean) || selectedLevel !== 'all') && (
                  <Button variant="link" onClick={() => {
                    setFilters({});
                    setSearchTerm('');
                    setSelectedLevel('all');
                  }} className="mt-2 font-bold">
                    清除所有筛选
                  </Button>
                )}
              </div>
            </div>
          ) : viewType === 'public' && displayMode === 'bookshelf' ? (
            <BookshelfView
              albums={filteredAlbums}
              hasAccessMap={Object.fromEntries(filteredAlbums.map(a => [a.id, checkHasAccess(a)]))}
              isPendingMap={Object.fromEntries(filteredAlbums.map(a => [a.id, myRequests.some(r => r.album_id === a.id && r.status === 'pending')]))}
              onView={(id) => navigate(`/albums/${id}`)}
              onRequest={(id) => {
                if (!profile) {
                  openLoginDialog?.();
                  return;
                }
                setRequestAlbumId(id);
                setShowRequestModal(true);
              }}
              ads={albumAds.map((ad, i) => (
                <NativeAd key={i} {...ad} className="rounded-[2.5rem]" />
              ))}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {filteredAlbums.map((album, i) => {
                const hasAccess = checkHasAccess(album);
                const isPending = myRequests.some(r => r.album_id === album.id && r.status === 'pending');
                
                return (
                  <React.Fragment key={album.id}>
                    <AlbumCard 
                      album={album}
                      index={i}
                      hasAccess={hasAccess}
                      isPending={isPending}
                      onView={(id) => navigate(`/albums/${id}`)}
                      onRequest={(id) => {
                        if (!profile) {
                          openLoginDialog?.();
                          return;
                        }
                        setRequestAlbumId(id);
                        setShowRequestModal(true);
                      }}
                    />
                    {(i + 1) % 8 === 0 && albumAds.length > 0 && (
                      <div className="col-span-full">
                        <NativeAd {...albumAds[Math.floor((i + 1) / 8 - 1) % albumAds.length]} className="rounded-[2.5rem]" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {hasMore && (
            <div ref={loadMoreRef} className="py-12 flex justify-center">
              {loadingMore ? (
                <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-muted/50">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest opacity-50">正在加载更多...</span>
                </div>
              ) : (
                <div className="h-20" />
              )}
            </div>
          )}
        </PullToRefresh>
      </main>

      <AlbumRequestDialog 
        isOpen={showRequestModal}
        onOpenChange={setShowRequestModal}
        myRequests={myRequests}
        albumId={requestAlbumId}
        requestReason={requestReason}
        onRequestReasonChange={setRequestReason}
        requestAttachment={requestAttachment}
        onRequestAttachmentChange={setRequestAttachment}
        requestSubmitting={requestSubmitting}
        onSubmit={handleSubmitRequest}
      />
    </div>
  );
}
