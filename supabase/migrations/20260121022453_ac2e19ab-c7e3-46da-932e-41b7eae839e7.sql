-- 插入管理员端菜单
INSERT INTO menu_permissions (menu_key, menu_name, menu_path, terminal, sort_order, icon, is_active) VALUES
-- 管理员菜单
('admin_dashboard', '工作台', '/admin/dashboard', 'admin', 1, 'LayoutDashboard', true),
('admin_suppliers', '供应商管理', '/admin/suppliers', 'admin', 2, 'Building2', true),
('admin_products', '商品管理', '/admin/products', 'admin', 3, 'Package', true),
('admin_audit', '注册审核', '/admin/audit', 'admin', 4, 'ClipboardCheck', true),
('admin_qualification_audit', '资质审核', '/admin/qualification-audit', 'admin', 5, 'FileCheck', true),
('admin_settings', '系统设置', '/admin/settings', 'admin', 6, 'Settings', true),
-- 部门端菜单
('dept_dashboard', '工作台', '/dept/dashboard', 'department', 1, 'LayoutDashboard', true),
('dept_suppliers', '供应商管理', '/dept/suppliers', 'department', 2, 'Building2', true),
('dept_products', '商品管理', '/dept/products', 'department', 3, 'Package', true),
('dept_projects', '项目管理', '/dept/projects', 'department', 4, 'Briefcase', true),
('dept_services', '服务管理', '/dept/services', 'department', 5, 'Headphones', true),
('dept_roles', '角色管理', '/dept/roles', 'department', 6, 'Shield', true);