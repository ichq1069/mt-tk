import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TagCloud } from '@/components/TagCloud';
import { CategoryCloud } from '@/components/CategoryCloud';
import { homePageState } from '@/lib/home-state';
import { Tag, ContentCategory } from '@/types';
import { Hash, Tags as TagsIcon, ChevronLeft, Search, Folder, LayoutGrid, Sparkles, Rocket, Zap, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export default function TagsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tags');

  const handleTagClick = (tag: Tag) => {
    homePageState.activeTagIds = [tag.id];
    homePageState.categoryId = 'all';
    homePageState.items = [];
    homePageState.page = 0;
    homePageState.hasMore = true;
    homePageState.isInitialized = false;
    navigate(`/?tagId=${tag.id}`);
  };

  const handleCategoryClick = (category: ContentCategory) => {
    homePageState.categoryId = category.id;
    homePageState.activeTagIds = [];
    homePageState.items = [];
    homePageState.page = 0;
    homePageState.hasMore = true;
    homePageState.isInitialized = false;
    navigate(`/?categoryId=${category.id}`);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] pb-24 overflow-x-hidden">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-background/60 backdrop-blur-2xl border-b border-border/40">
        <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-2xl hover:bg-muted/50 transition-all active:scale-90"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="font-black text-xl tracking-tight">内容探索</h1>
          </div>
          <div className="w-10" />
        </div>
      </div>

      <div className="relative z-10 max-w-screen-xl mx-auto px-4 pt-6">
        <Tabs defaultValue="tags" className="w-full" onValueChange={setActiveTab}>
          <div className="flex justify-center mb-6">
            <TabsList className="bg-muted/30 p-1 rounded-full h-11 border border-border/40">
              <TabsTrigger 
                value="tags" 
                className="rounded-full px-8 gap-2 data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-sm"
              >
                <Hash className="w-4 h-4" />
                热门标签
              </TabsTrigger>
              <TabsTrigger 
                value="categories" 
                className="rounded-full px-8 gap-2 data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-sm"
              >
                <Folder className="w-4 h-4" />
                分类
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="tags" className="animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white/50 dark:bg-black/50 backdrop-blur-xl rounded-[2rem] border border-border/40 p-4">
              <TagCloud onTagClick={handleTagClick} />
            </div>
          </TabsContent>

          <TabsContent value="categories" className="animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white/50 dark:bg-black/50 backdrop-blur-xl rounded-[2rem] border border-border/40 p-4">
              <CategoryCloud onCategoryClick={handleCategoryClick} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
