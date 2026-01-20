-- 创建部门用户注册申请表
CREATE TABLE public.department_registrations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    position VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- 启用 RLS
ALTER TABLE public.department_registrations ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户可以查看和创建自己的申请
CREATE POLICY "Users can view own registration" 
ON public.department_registrations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own registration" 
ON public.department_registrations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS 策略：管理员可以查看和管理所有申请
CREATE POLICY "Admins can view all registrations" 
ON public.department_registrations 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update registrations" 
ON public.department_registrations 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- 创建更新时间触发器
CREATE TRIGGER update_department_registrations_updated_at
BEFORE UPDATE ON public.department_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 在菜单权限表中添加部门审核菜单
INSERT INTO public.menu_permissions (menu_key, menu_name, menu_path, parent_key, sort_order, terminal, icon, is_active)
VALUES ('admin_department_audit', '部门审核', '/admin/department-audit', NULL, 25, 'admin', 'UserCheck', true);