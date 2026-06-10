import { MediaItem } from '@/types';
import { storage, STORAGE_KEYS } from '@/lib/storage';

export type ViewMode = 'latest' | 'recommended' | 'random' | 'popular';
export type MediaType = 'all' | 'image' | 'video';
export type ViewLayout = 'grid' | 'feed' | 'timeline' | 'folderTree' | 'calendar' | 'stackedCards' | 'freeform' | 'starrySky';

export const homePageState = {
  items: [] as MediaItem[],
  page: 0,
  hasMore: true,
  viewMode: storage.get(STORAGE_KEYS.VIEW_MODE, 'latest') as ViewMode,
  mediaType: storage.get(STORAGE_KEYS.MEDIA_TYPE, 'all') as MediaType,
  categoryId: storage.get(STORAGE_KEYS.CATEGORY_ID, 'all'),
  activeTagIds: [] as string[],
  scrollPosition: 0,
  previewIndex: storage.get('home_preview_index', -1), 
  feedIndex: storage.get('home_feed_index', 0), 
  lastViewedId: storage.get('home_last_viewed_id', null) as string | null,
  isInitialized: false,
  viewLayout: storage.get(STORAGE_KEYS.VIEW_LAYOUT, 'grid') as ViewLayout
};

export const resetHomeState = () => {
  homePageState.items = [];
  homePageState.page = 0;
  homePageState.hasMore = true;
  homePageState.isInitialized = false;
  homePageState.previewIndex = -1;
  homePageState.feedIndex = 0;
  homePageState.lastViewedId = null;
  storage.set('home_preview_index', -1);
  storage.set('home_feed_index', 0);
  storage.set('home_last_viewed_id', null);
};
