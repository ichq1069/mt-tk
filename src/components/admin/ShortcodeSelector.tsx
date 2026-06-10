import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Search, Code, Tag, Info, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ShortcodeSelectorProps {
  onSelect: (shortcode: string) => void;
  trigger?: React.ReactNode;
}

export function ShortcodeSelector({ onSelect, trigger }: ShortcodeSelectorProps) {
  const [shortcodes, setShortcodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && shortcodes.length === 0) {
      fetchShortcodes();
    }
  }, [open]);

  const fetchShortcodes = async () => {
    setLoading(setLoading => true);
    try {
      const { data } = await api.getShortcodes();
      setShortcodes(data || []);
    } catch (error) {
      console.error('Failed to fetch shortcodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = shortcodes.filter(s => 
    s.is_active && (
      s.key.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
    )
  );

  const handleSelect = (key: string) => {
    onSelect(`{{${key}}}`);
    setOpen(false);
    toast.success(`已插入短代码: {{${key}}}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8 gap-2 rounded-xl text-[10px] font-black uppercase tracking-tighter">
            <Code className="w-3.5 h-3.5" />
            插入短代码
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-2xl shadow-2xl border-none overflow-hidden" align="end">
        <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input 
              placeholder="搜索短代码..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 rounded-lg bg-background border-none text-xs focus-visible:ring-1"
            />
          </div>
        </div>
        <ScrollArea className="h-72">
          <div className="p-1 space-y-0.5">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">加载中...</div>
            ) : filtered.length > 0 ? (
              filtered.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSelect(s.key)}
                  className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                    {s.category === 'system' ? <Tag className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-black text-foreground">{"{{"}{s.key}{"}}"}</span>
                      {s.category === 'system' && <Badge variant="outline" className="text-[8px] h-3 px-1 border-primary/20 text-primary/70">内置</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{s.description || '无描述'}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">未找到可用短代码</div>
            )}
          </div>
        </ScrollArea>
        <div className="p-2 border-t bg-muted/10">
          <p className="text-[9px] text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3" />
            可在“站长工具”中管理和预览全部短代码。
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
