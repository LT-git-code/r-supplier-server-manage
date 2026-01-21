-- 创建项目表
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  code VARCHAR,
  description TEXT,
  status VARCHAR DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  department_id UUID REFERENCES public.departments(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建项目供应商关联表
CREATE TABLE public.project_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  contract_amount NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建服务表
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  code VARCHAR,
  description TEXT,
  category VARCHAR,
  price NUMERIC,
  unit VARCHAR,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- 项目表RLS策略
CREATE POLICY "Admins can manage all projects" ON public.projects FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Department users can view projects" ON public.projects FOR SELECT USING (is_department_user(auth.uid()));
CREATE POLICY "Department users can create projects" ON public.projects FOR INSERT WITH CHECK (is_department_user(auth.uid()));
CREATE POLICY "Department users can update projects" ON public.projects FOR UPDATE USING (is_department_user(auth.uid()));

-- 项目供应商关联表RLS策略
CREATE POLICY "Admins can manage all project suppliers" ON public.project_suppliers FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Department users can view project suppliers" ON public.project_suppliers FOR SELECT USING (is_department_user(auth.uid()));
CREATE POLICY "Department users can manage project suppliers" ON public.project_suppliers FOR ALL USING (is_department_user(auth.uid()));

-- 服务表RLS策略
CREATE POLICY "Admins can manage all services" ON public.services FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Suppliers can manage their own services" ON public.services FOR ALL USING (supplier_id = get_user_supplier_id(auth.uid()));
CREATE POLICY "Department users can view services from enabled suppliers" ON public.services FOR SELECT USING (
  is_department_user(auth.uid()) AND 
  supplier_id IN (
    SELECT supplier_id FROM department_suppliers WHERE library_type = 'current'
  )
);

-- 创建更新时间触发器
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();