import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';

export default function DebugPage() {
  const [status, setStatus] = useState<string>('检查中...');
  const [details, setDetails] = useState<any[]>([]);

  useEffect(() => {
    const runTests = async () => {
      const results: any[] = [];

      // 测试 1: Supabase 客户端
      results.push({ test: 'Supabase 客户端', status: supabase ? '✅ 正常' : '❌ 失败' });

      // 测试 2: 数据库连接
      try {
        const { data, error } = await supabase.from('storage_configs').select('*').limit(1);
        results.push({ 
          test: '数据库连接', 
          status: error ? `❌ ${error.message}` : '✅ 正常',
          data: data?.[0]
        });
      } catch (e: any) {
        results.push({ test: '数据库连接', status: `❌ ${e.message}` });
      }

      // 测试 3: Auth 状态
      try {
        const { data: { session } } = await supabase.auth.getSession();
        results.push({ 
          test: 'Auth 状态', 
          status: session ? '✅ 已登录' : '⚠️ 未登录',
          data: session?.user?.id
        });
      } catch (e: any) {
        results.push({ test: 'Auth 状态', status: `❌ ${e.message}` });
      }

      // 测试 4: 媒体内容查询
      try {
        const { data, error } = await supabase
          .from('media_items')
          .select('*')
          .eq('status', 'approved')
          .limit(5);
        results.push({ 
          test: '媒体内容查询', 
          status: error ? `❌ ${error.message}` : `✅ 找到 ${data?.length || 0} 条`,
          data: data
        });
      } catch (e: any) {
        results.push({ test: '媒体内容查询', status: `❌ ${e.message}` });
      }

      setDetails(results);
      const allPassed = results.every(r => r.status.startsWith('✅'));
      setStatus(allPassed ? '✅ 所有测试通过' : '❌ 部分测试失败');
    };

    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">系统诊断</h1>
        <div className="bg-card rounded-lg p-6 shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-4">{status}</h2>
        </div>
        <div className="space-y-4">
          {details.map((item, index) => (
            <div key={index} className="bg-card rounded-lg p-4 shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">{item.test}</h3>
                <span className="text-sm">{item.status}</span>
              </div>
              {item.data && (
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(item.data, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
