import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';

export default function ReplaysPage() {
  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-black italic">会话回放</h1>
        <p className="text-sm text-muted-foreground mt-1">记录并分析用户的操作路径和交互细节</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="py-20 text-center">
          <Info className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">会话回放功能已下线</p>
          <p className="text-xs text-muted-foreground/60 mt-2 max-w-md mx-auto">
            为了优化性能和存储成本，系统已全面取消会话回放功能。
            请前往「每日图集分析」页面查看完善的访客行为统计数据。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
