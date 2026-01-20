import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
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

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: ('supplier' | 'department' | 'admin')[];
}

const navItems: NavItem[] = [
  // 供应商菜单
  { title: '工作台', href: '/dashboard', icon: LayoutDashboard, roles: ['supplier', 'department', 'admin'] },
  { title: '企业信息', href: '/supplier/info', icon: Building2, roles: ['supplier'] },
  { title: '产品管理', href: '/supplier/products', icon: Package, roles: ['supplier'] },
  { title: '资质管理', href: '/supplier/qualifications', icon: FileCheck, roles: ['supplier'] },
  { title: '报表填写', href: '/supplier/reports', icon: FileText, roles: ['supplier'] },
  { title: '投诉建议', href: '/supplier/complaints', icon: MessageSquare, roles: ['supplier'] },
  
  // 部门菜单
  { title: '供应商库', href: '/dept/suppliers', icon: FolderOpen, roles: ['department'] },
  { title: '产品搜索', href: '/dept/products', icon: Search, roles: ['department'] },
  
  // 管理员菜单
  { title: '数据看板', href: '/admin/dashboard', icon: BarChart3, roles: ['admin'] },
  { title: '用户管理', href: '/admin/users', icon: Users, roles: ['admin'] },
  { title: '供应商审核', href: '/admin/audit', icon: CheckCircle, roles: ['admin'] },
  { title: '供应商管理', href: '/admin/suppliers', icon: Building2, roles: ['admin'] },
  { title: '产品管理', href: '/admin/products', icon: Package, roles: ['admin'] },
  { title: '报表管理', href: '/admin/reports', icon: FileText, roles: ['admin'] },
  { title: '公告管理', href: '/admin/announcements', icon: Bell, roles: ['admin'] },
  { title: '系统设置', href: '/admin/settings', icon: Settings, roles: ['admin'] },
];

export function AppSidebar() {
  const { currentRole } = useAuth();
  const location = useLocation();

  const filteredItems = navItems.filter(item => 
    currentRole && item.roles.includes(currentRole)
  );

  const getRoleLabel = () => {
    switch (currentRole) {
      case 'supplier': return '供应商';
      case 'department': return '部门';
      case 'admin': return '管理员';
      default: return '';
    }
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* 角色标识 */}
      <div className="px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sidebar-primary" />
          <span className="text-sm text-sidebar-muted">{getRoleLabel()}端</span>
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

      {/* 底部信息 */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-muted text-center">
          SRM v1.0.0
        </p>
      </div>
    </aside>
  );
}
