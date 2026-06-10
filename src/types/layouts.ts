import type { MediaItem } from './index';

export type ViewLayoutType = 
  | 'grid' 
  | 'feed' 
  | 'timeline' 
  | 'folderTree' 
  | 'calendar' 
  | 'stackedCards' 
  | 'freeform' 
  | 'starrySky';

export interface LayoutConfig {
  type: ViewLayoutType;
  label: string;
  icon: string;
  description: string;
}

export interface LayoutProps {
  items: MediaItem[];
  onItemClick?: (item: MediaItem, index: number) => void;
  onTagClick?: (tagId: string, e?: any) => void;
  onToggleFavorite?: (itemId: string, e?: any) => void;
  favorites?: Set<string>;
  isAdmin?: boolean;
  onAdminAction?: (id: string, action: string) => void;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyText?: string;
  scrollParent?: HTMLElement | null;
  timelineDates?: Array<{ date: string; count: number }>;
}

export interface TimelineGroup {
  date: string;
  label: string;
  items: MediaItem[];
}

export interface FolderNode {
  id: string;
  name: string;
  type: 'folder' | 'media';
  children?: FolderNode[];
  item?: MediaItem;
  expanded?: boolean;
}

export interface CalendarDay {
  date: string;
  day: number;
  items: MediaItem[];
  isCurrentMonth: boolean;
  isToday: boolean;
}
