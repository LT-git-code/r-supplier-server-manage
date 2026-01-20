import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 如果已登录，跳转到工作台
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // 如果未登录，跳转到登录页
  return <Navigate to="/auth" replace />;
}
