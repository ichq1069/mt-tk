import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Filter, 
  X, 
  Calendar, 
  Hash, 
  Tag, 
  Check, 
  Shield
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface AlbumHeaderProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  filters: Record<string, string>;
  onFiltersChange: (filters: Record<string, string>) => void;
  selectedLevel: string;
  onLevelChange: (level: string) => void;
  customFields: any[];
  onClearSearch: () => void;
}

export const AlbumHeader: React.FC<AlbumHeaderProps> = ({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  selectedLevel,
  onLevelChange,
  customFields,
  onClearSearch
}) => {
  const visibleLevels = [
    { id: 'pt', name: '普通用户' },
    { id: 'vip', name: 'VIP' },
    { id: 'svip', name: 'SVIP' },
    { id: 'vvip', name: 'VVIP' },
    { id: 'admin', name: '管理员' }
  ];

  const activeFiltersCount = Object.values(filters).filter(Boolean).length + (selectedLevel !== 'all' ? 1 : 0);

  return (
    <header className="sticky top-0 z-[50] bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 md:px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <Input 
            placeholder="搜寻你感兴趣的专题图集..." 
            className="w-full h-12 pl-11 pr-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchTerm && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute inset-y-0 right-2 my-auto h-8 w-8 rounded-xl hover:bg-muted/50"
              onClick={onClearSearch}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-12 rounded-2xl px-6 gap-2 border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all group shrink-0 w-full md:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="font-bold text-sm">筛选图集</span>
              {activeFiltersCount > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-[10px] animate-in zoom-in">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md p-0 border-none bg-background/95 backdrop-blur-2xl">
            <SheetHeader className="p-8 pb-4">
              <SheetTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Filter className="w-5 h-5 text-primary" />
                </div>
                图集筛选
              </SheetTitle>
            </SheetHeader>
            
            <div className="px-8 pb-8 space-y-8 overflow-y-auto max-h-[calc(100vh-120px)] scrollbar-hide">
              {/* 等级筛选 */}
              <div className="space-y-4">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  访问等级
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={selectedLevel === 'all' ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer px-3 py-1.5 rounded-xl border-slate-200 dark:border-slate-800 transition-all",
                      selectedLevel === 'all' ? "bg-primary text-white" : "hover:border-primary/50 text-slate-600"
                    )}
                    onClick={() => onLevelChange('all')}
                  >
                    全部
                  </Badge>
                  {visibleLevels.map(lvl => (
                    <Badge
                      key={lvl.id}
                      variant={selectedLevel === lvl.id ? 'default' : 'outline'}
                      className={cn(
                        "cursor-pointer px-3 py-1.5 rounded-xl border-slate-200 dark:border-slate-800 transition-all",
                        selectedLevel === lvl.id ? "bg-primary text-white" : "hover:border-primary/50 text-slate-600"
                      )}
                      onClick={() => onLevelChange(lvl.id)}
                    >
                      {lvl.name}
                      {selectedLevel === lvl.id && <Check className="w-3 h-3 ml-1" />}
                    </Badge>
                  ))}
                </div>
              </div>

              {customFields.filter((f: any) => f.is_filterable).map(field => (
                <div key={field.id} className="space-y-4">
                  <Label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    {field.type === 'date' && <Calendar className="w-3 h-3" />}
                    {field.type === 'select' && <Tag className="w-3 h-3" />}
                    {field.type === 'multi_tag' && <Hash className="w-3 h-3" />}
                    {field.name}
                  </Label>
                  
                  {field.type === 'select' || field.type === 'multi_tag' ? (
                    <div className="flex flex-wrap gap-2">
                      {field.options.map((opt: string) => (
                        <Badge
                          key={opt}
                          variant={filters[field.id] === opt ? 'default' : 'outline'}
                          className={cn(
                            "cursor-pointer px-3 py-1.5 rounded-xl border-slate-200 dark:border-slate-800 transition-all",
                            filters[field.id] === opt ? "bg-primary text-white" : "hover:border-primary/50 text-slate-600"
                          )}
                          onClick={() => onFiltersChange({
                            ...filters,
                            [field.id]: filters[field.id] === opt ? '' : opt
                          })}
                        >
                          {opt}
                          {filters[field.id] === opt && <Check className="w-3 h-3 ml-1" />}
                        </Badge>
                      ))}
                    </div>
                  ) : field.type === 'date' ? (
                    <Input 
                      type="date"
                      className="rounded-xl bg-muted/30 border-none h-12"
                      value={filters[field.id] || ''}
                      onChange={(e) => onFiltersChange({ ...filters, [field.id]: e.target.value })}
                    />
                  ) : (
                    <Input 
                      placeholder={`搜索${field.name}...`}
                      className="rounded-xl bg-muted/30 border-none h-12"
                      value={filters[field.id] || ''}
                      onChange={(e) => onFiltersChange({ ...filters, [field.id]: e.target.value })}
                    />
                  )}
                </div>
              ))}
              
              {customFields.filter((f: any) => f.is_filterable).length === 0 && (
                <div className="text-center py-20 text-slate-300">
                  <Filter className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">暂无可用筛选项</p>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
