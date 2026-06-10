import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Check, X, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';

const COMMON_TAGS = ['性感', '户外', '制服', '御姐', '萝莉', '丝袜', '私房', '清纯', '古风', '街拍', 'cosplay', '甜美', '轻熟', '大尺度'];

interface TagSelectorProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export const TagSelector: React.FC<TagSelectorProps> = ({ 
  value, 
  onChange, 
  disabled 
}) => {
  const [open, setOpen] = useState(false);
  const [dbTags, setDbTags] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const currentTags = value.split(/[ ,，\n]/).filter(Boolean).map(t => t.trim());

  useEffect(() => {
    const fetchTags = async () => {
      const { data } = await supabase.from('media_items').select('tags').not('tags', 'is', null).limit(100);
      if (data) {
        const allTags = new Set((data as any[]).flatMap(item => item.tags || []));
        setDbTags(Array.from(allTags));
      }
    };
    fetchTags();
  }, []);

  const allTags = Array.from(new Set([...COMMON_TAGS, ...dbTags]));

  const toggleTag = (tag: string) => {
    const nextTags = currentTags.includes(tag) 
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    onChange(nextTags.join(', '));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className="flex-1 justify-between h-12 rounded-xl bg-background px-4 hover:bg-background/80"
            >
              <span className="text-muted-foreground truncate font-normal">
                {currentTags.length > 0 ? `已选 ${currentTags.length} 个标签` : "搜索或选择标签..."}
              </span>
              <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-32px)] md:w-[400px] p-0 rounded-2xl" align="start">
            <Command className="rounded-2xl">
              <CommandInput 
                placeholder="查找或输入新标签..." 
                className="h-12" 
                value={search}
                onValueChange={setSearch}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search) {
                    toggleTag(search.trim());
                    setSearch("");
                  }
                }}
              />
              <CommandList className="max-h-[300px]">
                {search && !allTags.includes(search.trim()) && (
                  <CommandGroup heading="新标签">
                    <CommandItem 
                      value={search.trim()} 
                      onSelect={() => {
                        toggleTag(search.trim());
                        setSearch("");
                      }}
                      className="h-11 px-4"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      创建新标签: {search.trim()}
                    </CommandItem>
                  </CommandGroup>
                )}
                <CommandEmpty>输入标签名称并回车添加</CommandEmpty>
                <CommandGroup heading="常用/已有标签">
                  {allTags.map((tag) => (
                    <CommandItem
                      key={tag}
                      value={tag}
                      onSelect={() => toggleTag(tag)}
                      className="h-11 px-4"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          currentTags.includes(tag) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {tag}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input 
          placeholder="手动输入更多标签 (逗号分隔)..." 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="rounded-xl h-12 bg-background/50 border-dashed"
        />
        {currentTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {currentTags.map(tag => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer pr-1 py-1"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                <X className="w-3 h-3 ml-1 opacity-60" />
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const QuickTagGroup: React.FC<TagSelectorProps> = ({ 
  value, 
  onChange,
  disabled
}) => {
  const quickTags = ['🏷️不入微信草稿库', '🏷️不入今日图集'];
  const currentTags = value.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean);

  const toggleTag = (tag: string) => {
    let nextTags;
    if (currentTags.includes(tag)) {
      nextTags = currentTags.filter(t => t !== tag);
    } else {
      nextTags = [...currentTags, tag];
    }
    onChange(nextTags.join(', '));
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {quickTags.map(tag => {
        const selected = currentTags.includes(tag);
        return (
          <Badge
            key={tag}
            variant={selected ? "default" : "outline"}
            className={cn(
              "cursor-pointer px-3 py-1.5 rounded-xl transition-all border-dashed",
              selected 
                ? "bg-primary text-white border-primary shadow-md shadow-primary/20" 
                : "bg-muted/30 text-muted-foreground border-border hover:bg-muted hover:text-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !disabled && toggleTag(tag)}
          >
            {selected && <CheckSquare className="w-3 h-3 mr-1" />}
            {tag}
          </Badge>
        );
      })}
    </div>
  );
};
