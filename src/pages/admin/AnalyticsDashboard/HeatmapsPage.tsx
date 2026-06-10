import { Card, CardContent } from '@/components/ui/card';
import { Flame, Construction } from 'lucide-react';

export default function HeatmapsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-xl font-black">热力图</h1>
        <p className="text-sm text-muted-foreground mt-1">用户点击和滚动热力分布分析</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-8 md:p-16 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Construction className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold">功能开发中</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            热力图功能正在开发中，将支持页面点击热力分布、滚动深度分析、注意力分布等可视化展示。
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Flame className="w-4 h-4" />
            <span>预计支持页面：点击热力、滚动深度、注意力分布</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
