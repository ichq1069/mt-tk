import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StorageSection } from './components/StorageSection';

export default function Storage({ defaultTab: propDefaultTab }: { defaultTab?: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = propDefaultTab || searchParams.get('tab') || 'basic';
  
  // 映射老路由的 tab 名
  const tabMap: Record<string, string> = {
    'r2': 'basic',
    'upload': 'upload',
    'baota': 'baota',
    'sql': 'sql',
    'image': 'image',
    'db_optimize': 'db_optimize'
  };

  const finalTab = tabMap[activeTab] || activeTab;

  return (
    <div className="w-full">
      <StorageSection defaultTab={finalTab} />
    </div>
  );
}
