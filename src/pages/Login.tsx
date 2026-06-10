import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const { user, loading: authLoading, openLoginDialog } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || '/';

  React.useEffect(() => {
    if (!authLoading) {
      if (!user) {
        openLoginDialog();
      }
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, from, openLoginDialog]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary/30" />
        <p className="text-muted-foreground font-medium animate-pulse">正在为您准备登录环境...</p>
      </div>
    </div>
  );
}
