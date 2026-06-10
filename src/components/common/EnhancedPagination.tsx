import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EnhancedPaginationProps {
  currentPage: number; // 0-based
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  totalItems: number;
  className?: string;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
}

export function EnhancedPagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
  className,
  pageSizeOptions = [10, 20, 50, 100, 200],
  showPageSizeSelector = true
}: EnhancedPaginationProps) {
  const [jumpPageInput, setJumpPageInput] = useState("");

  useEffect(() => {
    setJumpPageInput((currentPage + 1).toString());
  }, [currentPage]);

  const handleJump = () => {
    const p = parseInt(jumpPageInput) - 1;
    if (!isNaN(p) && p >= 0 && p < totalPages) {
      onPageChange(p);
    } else {
      setJumpPageInput((currentPage + 1).toString());
    }
  };

  const renderPageButtons = () => {
    const buttons = [];
    const maxVisible = 5;
    
    let start = Math.max(0, currentPage - 2);
    let end = Math.min(totalPages - 1, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(0, end - maxVisible + 1);
    }

    if (start > 0) {
      buttons.push(
        <Button key={0} variant="outline" size="sm" className="w-9 h-9 rounded-xl p-0 bg-transparent border-border hover:bg-muted" onClick={() => onPageChange(0)}>1</Button>
      );
      if (start > 1) {
        buttons.push(<MoreHorizontal key="start-dots" className="w-4 h-4 text-muted-foreground mx-1" />);
      }
    }

    for (let i = start; i <= end; i++) {
      buttons.push(
        <Button 
          key={i} 
          variant={currentPage === i ? "default" : "outline"} 
          size="sm" 
          className={cn(
            "w-9 h-9 rounded-xl p-0 transition-all",
            currentPage === i 
              ? "bg-primary text-primary-foreground shadow-md font-bold scale-105" 
              : "bg-transparent hover:border-primary/50 hover:bg-muted font-medium border-border"
          )} 
          onClick={() => onPageChange(i)}
        >
          {i + 1}
        </Button>
      );
    }

    if (end < totalPages - 1) {
      if (end < totalPages - 2) {
        buttons.push(<MoreHorizontal key="end-dots" className="w-4 h-4 text-muted-foreground mx-1" />);
      }
      buttons.push(
        <Button key={totalPages - 1} variant="outline" size="sm" className="w-9 h-9 rounded-xl p-0 bg-transparent border-border hover:bg-muted" onClick={() => onPageChange(totalPages - 1)}>{totalPages}</Button>
      );
    }

    return buttons;
  };

  if (totalPages <= 1 && totalItems < pageSize) return null;

  return (
    <div className={cn("flex flex-col md:flex-row items-center justify-between gap-4 p-4 mt-6 bg-muted/30 border border-border rounded-3xl backdrop-blur-sm", className)}>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="font-medium">共 {totalItems} 条</span>
        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <span>每页</span>
            <Select value={pageSize.toString()} onValueChange={(val) => onPageSizeChange(parseInt(val))}>
              <SelectTrigger className="w-[70px] h-8 rounded-lg border-border bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {pageSizeOptions.map(opt => (
                  <SelectItem key={opt} value={opt.toString()}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button 
          variant="outline" 
          size="icon" 
          disabled={currentPage === 0} 
          onClick={() => onPageChange(currentPage - 1)}
          className="w-9 h-9 rounded-xl bg-transparent border-border hover:bg-muted"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1 mx-1">
          {renderPageButtons()}
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          disabled={currentPage === totalPages - 1} 
          onClick={() => onPageChange(currentPage + 1)}
          className="w-9 h-9 rounded-xl bg-transparent border-border hover:bg-muted"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground whitespace-nowrap">跳至</span>
        <Input 
          className="w-12 h-8 rounded-lg text-center p-0 border-border bg-transparent" 
          value={jumpPageInput} 
          onChange={(e) => setJumpPageInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJump()}
        />
        <span className="text-muted-foreground whitespace-nowrap">页</span>
        <Button size="sm" variant="ghost" className="h-8 rounded-lg px-3 font-bold text-primary hover:bg-primary/5" onClick={handleJump}>跳转</Button>
      </div>
    </div>
  );
}
