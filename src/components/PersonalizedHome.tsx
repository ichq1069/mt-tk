import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Heart, Clock, Sparkles, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import type { MediaItem } from '@/types';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ProtectedMedia } from './common/ProtectedMedia';
import { NativeAd } from './common/NativeAd';
import { useAds } from '@/contexts/AdContext';

/**
 * 个性化首页组件
 * 包含三个板块：热门推荐、猜你喜欢、最新内容
 */
export default function PersonalizedHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getAdsByPlacement } = useAds();
  const homeAds = getAdsByPlacement('all');
  const [activeTab, setActiveTab] = useState<'popular' | 'recommended' | 'latest'>('popular');
  const [popularMedia, setPopularMedia] = useState<MediaItem[]>([]);
  const [recommendedMedia, setRecommendedMedia] = useState<MediaItem[]>([]);
  const [latestMedia, setLatestMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'popular') {
        const { data } = await api.getApprovedMedia(0, 20, user?.id, 'all', 'all', 'popular');
        setPopularMedia(data || []);
      } else if (activeTab === 'recommended' && user) {
        const { data: profile } = await api.getProfile(user.id);
        const intensity = profile?.custom_fields?.preferences?.recommendation_intensity || 1;
        const { data } = await api.getRecommendedMedia(0, 20, user.id, intensity);
        setRecommendedMedia(data || []);
      } else if (activeTab === 'latest') {
        const { data } = await api.getApprovedMedia(0, 20, user?.id, 'all', 'all', 'latest');
        setLatestMedia(data || []);
      }
    } catch (e: any) {
      console.error('Failed to fetch personalized content:', e);
      toast.error('加载内容失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMediaClick = (media: MediaItem) => {
    navigate('/', { state: { selectedMedia: media } });
  };

  const renderMediaGrid = (media: MediaItem[]) => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg bg-muted" />
          ))}
        </div>
      );
    }

    if (media.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          暂无内容
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {media.map((item, index) => {
          const showAd = (index + 1) % 5 === 0;
          return (
            <React.Fragment key={item.id}>
              <Card 
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleMediaClick(item)}
              >
                <div className="relative aspect-square bg-muted/10">
                  <ProtectedMedia
                    src={item.url}
                    type="image"
                    alt={item.title || ''}
                    isThumbnail={true}
                    ruleKey="首瀑"
                    className="w-full h-full object-contain"
                  />
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                  )}
                </div>
              </Card>
              {showAd && homeAds.length > 0 && <NativeAd {...(homeAds[index % homeAds.length] || homeAds[0])} className="rounded-xl" />}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            个性化推荐
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="popular" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                热门推荐
              </TabsTrigger>
              <TabsTrigger value="recommended" className="flex items-center gap-2" disabled={!user}>
                <Heart className="w-4 h-4" />
                猜你喜欢
              </TabsTrigger>
              <TabsTrigger value="latest" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                最新内容
              </TabsTrigger>
            </TabsList>

            <TabsContent value="popular">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  根据浏览量和互动数据，为您推荐最受欢迎的内容
                </p>
                {renderMediaGrid(popularMedia)}
              </div>
            </TabsContent>

            <TabsContent value="recommended">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  基于您的浏览历史和偏好，为您精选推荐
                </p>
                {renderMediaGrid(recommendedMedia)}
              </div>
            </TabsContent>

            <TabsContent value="latest">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  最新上传并审核通过的内容
                </p>
                {renderMediaGrid(latestMedia)}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
