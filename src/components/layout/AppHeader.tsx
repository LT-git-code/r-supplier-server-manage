import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, LogOut, User, Menu, Bell, ChevronDown } from 'lucide-react';
import { AppRole } from '@/types/auth';

interface AppHeaderProps {
  onMenuClick?: () => void;
}

const roleLabels: Record<AppRole, string> = {
  supplier: '供应商端',
  department: '青山部门端',
  admin: '效率委总管理端',
};

const roleColors: Record<AppRole, string> = {
  supplier: 'bg-info',
  department: 'bg-warning',
  admin: 'bg-destructive',
};

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const navigate = useNavigate();
  const { authUser, currentRole, setCurrentRole, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleRoleChange = (role: string) => {
    setCurrentRole(role as AppRole);
    // 切换角色后导航到对应的工作台
    navigate('/dashboard');
  };

  const getInitials = () => {
    if (authUser?.profile?.full_name) {
      return authUser.profile.full_name.substring(0, 2);
    }
    if (authUser?.email) {
      return authUser.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6">
      {/* 左侧 */}
      <div className="flex items-center gap-4">
        {/* 移动端菜单按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg hidden sm:inline-block">供应商管理平台</span>
        </div>
      </div>

      {/* 右侧 */}
      <div className="flex items-center gap-3">
        {/* 角色切换（仅管理员可见多角色时显示） */}
        {authUser && authUser.roles.length > 1 && (
          <Select value={currentRole || undefined} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="选择角色" />
            </SelectTrigger>
            <SelectContent>
              {authUser.roles.map((role) => (
                <SelectItem key={role} value={role}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${roleColors[role]}`} />
                    {roleLabels[role]}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* 当前角色标识（单角色时显示） */}
        {authUser && authUser.roles.length === 1 && currentRole && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm">
            <div className={`w-2 h-2 rounded-full ${roleColors[currentRole]}`} />
            <span className="text-muted-foreground">{roleLabels[currentRole]}</span>
          </div>
        )}

        {/* 通知 */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </Button>

        {/* 用户菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={authUser?.profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {authUser?.profile?.full_name || '未设置姓名'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {authUser?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              个人设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
