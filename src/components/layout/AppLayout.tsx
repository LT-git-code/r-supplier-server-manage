import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { MobileSidebar } from './MobileSidebar';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppLayout() {
  const { user, loading, authUser, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // 如果用户没有任何终端角色，显示等待审核提示
  if (!authUser?.roles.length) {
    const handleBackToLogin = async () => {
      await signOut();
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
            <span className="text-muted-foreground">校验终端角色中</span>
          </div>
          <Button
            variant="outline"
            onClick={handleBackToLogin}
          >
            <LogOut className="h-4 w-4 mr-2" />
            返回登录
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* 桌面端侧边栏 */}
      <AppSidebar />

      {/* 移动端侧边栏 */}
      <MobileSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader onMenuClick={() => setMobileMenuOpen(true)} />
        
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
