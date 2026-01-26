import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Package,
  FileCheck,
  FileText,
  Users,
  CheckCircle,
  Settings,
  BarChart3,
  FolderOpen,
  Bell,
  Shield,
  Briefcase,
  Headphones,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: ('supplier' | 'department' | 'admin')[];
}

// 供应商固定菜单（不需要后台角色控制）
const supplierNavItems: NavItem[] = [
  { title: '工作台', href: '/dashboard', icon: LayoutDashboard, roles: ['supplier'] },
  { title: '信息管理', href: '/supplier/info', icon: Building2, roles: ['supplier'] },
  { title: '产品服务', href: '/supplier/products', icon: Package, roles: ['supplier'] },
  { title: '资质提交', href: '/supplier/qualifications', icon: FileCheck, roles: ['supplier'] },
  { title: '报表上报', href: '/supplier/reports', icon: FileText, roles: ['supplier'] },
];

// 图标映射
const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Building2,
  Package,
  FileCheck,
  FileText,
  Users,
  CheckCircle,
  Settings,
  BarChart3,
  FolderOpen,
  Bell,
  Shield,
  Briefcase,
  Headphones,
};

interface DynamicMenu {
  menu_key: string;
  menu_name: string;
  menu_path: string;
  icon: string;
  sort_order: number;
}

export function AppSidebar() {
  const { currentRole, user } = useAuth();
  const location = useLocation();
  const [dynamicMenus, setDynamicMenus] = useState<DynamicMenu[]>([]);
  const [loading, setLoading] = useState(false);
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
        // 获取用户所在部门名称
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
        // 获取供应商公司名
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

  // 获取动态菜单
  useEffect(() => {
    const fetchMenus = async () => {
      if (!user || !currentRole || currentRole === 'supplier') return;
      
      setLoading(true);
      try {
        const terminal = currentRole === 'admin' ? 'admin' : 'department';
        const { data, error } = await supabase.functions.invoke('roles-api', {
          body: { action: 'get_user_menus', terminal },
        });
        
        if (!error && data?.menus) {
          setDynamicMenus(data.menus);
        }
      } catch (error) {
        console.error('Error fetching menus:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenus();
  }, [user, currentRole]);

  // 构建导航项
  const navItems = useMemo(() => {
    if (currentRole === 'supplier') {
      return supplierNavItems;
    }

    // 管理员和部门用户使用动态菜单
    return dynamicMenus.map(menu => ({
      title: menu.menu_name,
      href: menu.menu_path,
      icon: iconMap[menu.icon] || LayoutDashboard,
      roles: [currentRole] as ('supplier' | 'department' | 'admin')[],
    }));
  }, [currentRole, dynamicMenus]);

  const filteredItems = navItems.filter(item => 
    currentRole && item.roles.includes(currentRole)
  );

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
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
        {loading ? (
          <div className="px-4 py-2 text-sm text-sidebar-muted">加载菜单中...</div>
        ) : (
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
        )}
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
