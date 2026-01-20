-- 后台角色表
CREATE TABLE public.backend_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  code VARCHAR NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 菜单权限表
CREATE TABLE public.menu_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_key VARCHAR NOT NULL,
  menu_name VARCHAR NOT NULL,
  menu_path VARCHAR NOT NULL,
  parent_key VARCHAR,
  sort_order INTEGER DEFAULT 0,
  icon VARCHAR,
  terminal VARCHAR NOT NULL CHECK (terminal IN ('admin', 'department', 'supplier')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 后台角色与菜单权限关联表
CREATE TABLE public.role_menu_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.backend_roles(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES public.menu_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_id, menu_id)
);

-- 用户与后台角色关联表
CREATE TABLE public.user_backend_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES public.backend_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- 启用 RLS
ALTER TABLE public.backend_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_menu_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_backend_roles ENABLE ROW LEVEL SECURITY;

-- backend_roles 策略
CREATE POLICY "Admins can manage backend roles"
ON public.backend_roles FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view active backend roles"
ON public.backend_roles FOR SELECT
USING (is_active = true);

-- menu_permissions 策略
CREATE POLICY "Admins can manage menu permissions"
ON public.menu_permissions FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view active menu permissions"
ON public.menu_permissions FOR SELECT
USING (is_active = true);

-- role_menu_permissions 策略
CREATE POLICY "Admins can manage role menu permissions"
ON public.role_menu_permissions FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view role menu permissions"
ON public.role_menu_permissions FOR SELECT
USING (true);

-- user_backend_roles 策略
CREATE POLICY "Admins can manage user backend roles"
ON public.user_backend_roles FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own backend roles"
ON public.user_backend_roles FOR SELECT
USING (user_id = auth.uid());

-- 函数：获取用户可访问的菜单
CREATE OR REPLACE FUNCTION public.get_user_menus(_user_id UUID, _terminal VARCHAR)
RETURNS TABLE (
  menu_key VARCHAR,
  menu_name VARCHAR,
  menu_path VARCHAR,
  parent_key VARCHAR,
  sort_order INTEGER,
  icon VARCHAR
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 管理员可以访问所有菜单
  IF is_admin(_user_id) THEN
    RETURN QUERY
    SELECT mp.menu_key, mp.menu_name, mp.menu_path, mp.parent_key, mp.sort_order, mp.icon
    FROM menu_permissions mp
    WHERE mp.terminal = _terminal AND mp.is_active = true
    ORDER BY mp.sort_order;
  ELSE
    -- 其他用户根据后台角色获取菜单
    RETURN QUERY
    SELECT DISTINCT mp.menu_key, mp.menu_name, mp.menu_path, mp.parent_key, mp.sort_order, mp.icon
    FROM menu_permissions mp
    INNER JOIN role_menu_permissions rmp ON mp.id = rmp.menu_id
    INNER JOIN user_backend_roles ubr ON rmp.role_id = ubr.role_id
    WHERE ubr.user_id = _user_id AND mp.terminal = _terminal AND mp.is_active = true
    ORDER BY mp.sort_order;
  END IF;
END;
$$;

-- 插入默认菜单权限（部门终端）
INSERT INTO public.menu_permissions (menu_key, menu_name, menu_path, sort_order, icon, terminal) VALUES
('dept_dashboard', '工作台', '/dashboard', 0, 'LayoutDashboard', 'department'),
('dept_suppliers', '供应商管理', '/dept/suppliers', 10, 'Building2', 'department'),
('dept_products', '产品管理', '/dept/products', 20, 'Package', 'department'),
('dept_projects', '历史工程', '/dept/projects', 30, 'FolderOpen', 'department'),
('dept_services', '服务项目', '/dept/services', 40, 'Briefcase', 'department'),
('dept_roles', '后台角色管理', '/dept/roles', 50, 'Shield', 'department');

-- 插入默认菜单权限（管理员终端）
INSERT INTO public.menu_permissions (menu_key, menu_name, menu_path, sort_order, icon, terminal) VALUES
('admin_dashboard', '工作台', '/dashboard', 0, 'LayoutDashboard', 'admin'),
('admin_data', '数据看板', '/admin/dashboard', 10, 'BarChart3', 'admin'),
('admin_users', '用户管理', '/admin/users', 20, 'Users', 'admin'),
('admin_audit', '供应商审核', '/admin/audit', 30, 'CheckCircle', 'admin'),
('admin_suppliers', '供应商管理', '/admin/suppliers', 40, 'Building2', 'admin'),
('admin_products', '产品管理', '/admin/products', 50, 'Package', 'admin'),
('admin_reports', '报表管理', '/admin/reports', 60, 'FileText', 'admin'),
('admin_announcements', '公告管理', '/admin/announcements', 70, 'Bell', 'admin'),
('admin_roles', '后台角色管理', '/admin/roles', 80, 'Shield', 'admin'),
('admin_settings', '系统设置', '/admin/settings', 90, 'Settings', 'admin');

-- 创建触发器更新 updated_at
CREATE TRIGGER update_backend_roles_updated_at
BEFORE UPDATE ON public.backend_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();