import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Building2 } from 'lucide-react';
import {
  LayoutDashboard,
  Package,
  FileCheck,
  FileText,
  MessageSquare,
  Users,
  CheckCircle,
  Settings,
  BarChart3,
  FolderOpen,
  Bell,
  Search,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: ('supplier' | 'department' | 'admin')[];
}

const navItems: NavItem[] = [
  { title: '工作台', href: '/dashboard', icon: LayoutDashboard, roles: ['supplier', 'department', 'admin'] },
  { title: '企业信息', href: '/supplier/info', icon: Building2, roles: ['supplier'] },
  { title: '产品管理', href: '/supplier/products', icon: Package, roles: ['supplier'] },
  { title: '资质管理', href: '/supplier/qualifications', icon: FileCheck, roles: ['supplier'] },
  { title: '报表填写', href: '/supplier/reports', icon: FileText, roles: ['supplier'] },
  { title: '投诉建议', href: '/supplier/complaints', icon: MessageSquare, roles: ['supplier'] },
  { title: '供应商库', href: '/dept/suppliers', icon: FolderOpen, roles: ['department'] },
  { title: '产品搜索', href: '/dept/products', icon: Search, roles: ['department'] },
  { title: '数据看板', href: '/admin/dashboard', icon: BarChart3, roles: ['admin'] },
  { title: '用户管理', href: '/admin/users', icon: Users, roles: ['admin'] },
  { title: '供应商审核', href: '/admin/audit', icon: CheckCircle, roles: ['admin'] },
  { title: '供应商管理', href: '/admin/suppliers', icon: Building2, roles: ['admin'] },
  { title: '产品管理', href: '/admin/products', icon: Package, roles: ['admin'] },
  { title: '报表管理', href: '/admin/reports', icon: FileText, roles: ['admin'] },
  { title: '公告管理', href: '/admin/announcements', icon: Bell, roles: ['admin'] },
  { title: '系统设置', href: '/admin/settings', icon: Settings, roles: ['admin'] },
];

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const { currentRole, user } = useAuth();
  const location = useLocation();
  const [terminalLabel, setTerminalLabel] = useState<string>('');

  // 获取终端标签（部门名称/公司名/管理员标识）
  useEffect(() => {
    const fetchTerminalLabel = async () => {
      if (!user || !currentRole) {
        setTerminalLabel('');
        return;
      }

      if (currentRole === 'admin') {
        setTerminalLabel('效率委管理端');
        return;
      }

      if (currentRole === 'department') {
        try {
          const { data: userDepts } = await supabase
            .from('user_departments')
            .select('department_id')
            .eq('user_id', user.id);

          if (userDepts && userDepts.length > 0) {
            const { data: dept } = await supabase
              .from('departments')
              .select('name')
              .eq('id', userDepts[0].department_id)
              .single();

            setTerminalLabel(dept?.name || '部门端');
          } else {
            setTerminalLabel('部门端');
          }
        } catch (error) {
          console.error('Error fetching department name:', error);
          setTerminalLabel('部门端');
        }
        return;
      }

      if (currentRole === 'supplier') {
        try {
          const { data: supplier } = await supabase
            .from('suppliers')
            .select('company_name')
            .eq('user_id', user.id)
            .maybeSingle();

          setTerminalLabel(supplier?.company_name || '供应商端');
        } catch (error) {
          console.error('Error fetching supplier name:', error);
          setTerminalLabel('供应商端');
        }
        return;
      }

      setTerminalLabel('');
    };

    fetchTerminalLabel();
  }, [user, currentRole]);

  const filteredItems = navItems.filter(item => 
    currentRole && item.roles.includes(currentRole)
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-64 p-0 bg-sidebar">
        <SheetHeader className="p-4 border-b border-sidebar-border">
          <SheetTitle className="flex items-center gap-2 text-sidebar-foreground">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <span>供应商管理平台</span>
          </SheetTitle>
        </SheetHeader>

        {/* 角色标识 */}
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sidebar-primary" />
            <span className="text-sm text-sidebar-muted truncate" title={terminalLabel}>
              {terminalLabel || '加载中...'}
            </span>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || 
                             location.pathname.startsWith(item.href + '/');
              
              return (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
