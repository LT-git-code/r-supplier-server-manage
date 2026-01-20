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
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 text-warning animate-spin" />
          </div>
          <h2 className="text-xl font-semibold mb-2">终端审核中</h2>
          <p className="text-muted-foreground mb-6">
            您的账户尚未分配终端权限，请等待管理员审核。
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="text-primary hover:underline text-sm"
            >
              刷新页面
            </button>
            <Button
              variant="outline"
              onClick={handleBackToLogin}
              className="mx-auto"
            >
              <LogOut className="h-4 w-4 mr-2" />
              返回登录
            </Button>
          </div>
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
