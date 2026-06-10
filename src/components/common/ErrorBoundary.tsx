import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] 捕获到错误:', error, errorInfo);
    
    // 如果是动态导入模块失败，可能是因为应用版本更新导致静态资源路径失效
    // 这种情况下，自动刷新页面通常可以解决问题
    const isChunkLoadError = error.name === 'ChunkLoadError' || 
                           /Failed to fetch dynamically imported module/i.test(error.message) ||
                           /loading chunk/i.test(error.message);
                           
    if (isChunkLoadError) {
      const lastReloaded = sessionStorage.getItem('last_chunk_error_reload');
      const now = Date.now();
      
      // 避免无限循环刷新：如果 10 秒内已经刷新过，就不要再刷了
      if (!lastReloaded || now - parseInt(lastReloaded) > 10000) {
        sessionStorage.setItem('last_chunk_error_reload', now.toString());
        console.warn('检测到资源加载错误，正在尝试自动刷新页面...');
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
          <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">应用出错了</h1>
            <p className="text-muted-foreground mb-6">
              {this.state.error?.message || '发生了未知错误'}
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                刷新页面
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                className="w-full"
              >
                重试
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  查看详细错误信息
                </summary>
                <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
