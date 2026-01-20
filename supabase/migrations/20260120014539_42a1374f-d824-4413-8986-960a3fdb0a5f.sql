-- =============================================
-- SRM 供应商管理服务平台 - 核心数据库架构
-- =============================================

-- 1. 创建角色枚举类型
CREATE TYPE public.app_role AS ENUM ('supplier', 'department', 'admin');

-- 2. 创建供应商类型枚举
CREATE TYPE public.supplier_type AS ENUM ('enterprise', 'overseas', 'individual');

-- 3. 创建供应商状态枚举
CREATE TYPE public.supplier_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- 4. 创建审核类型枚举
CREATE TYPE public.audit_type AS ENUM ('registration', 'qualification', 'product', 'info_change');

-- 5. 创建审核状态枚举
CREATE TYPE public.audit_status AS ENUM ('pending', 'approved', 'rejected');

-- =============================================
-- 用户与权限表
-- =============================================

-- 6. 用户档案表 (profiles)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    username VARCHAR(100),
    full_name VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. 用户角色表 (核心权限表)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 8. 部门表
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES public.departments(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. 用户-部门关联表
CREATE TABLE public.user_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
    is_manager BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, department_id)
);

-- =============================================
-- 供应商相关表
-- =============================================

-- 10. 供应商主表
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    supplier_type supplier_type NOT NULL,
    status supplier_status NOT NULL DEFAULT 'pending',
    
    -- 企业基础信息
    company_name VARCHAR(300),
    unified_social_credit_code VARCHAR(50),
    legal_representative VARCHAR(100),
    registered_capital DECIMAL(15,2),
    establishment_date DATE,
    business_scope TEXT,
    
    -- 联系信息
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    address TEXT,
    province VARCHAR(50),
    city VARCHAR(50),
    
    -- 银行信息
    bank_name VARCHAR(200),
    bank_account VARCHAR(50),
    bank_account_name VARCHAR(200),
    
    -- 个人供应商信息
    id_card_number VARCHAR(30),
    id_card_front_url TEXT,
    id_card_back_url TEXT,
    
    -- 企业供应商信息
    business_license_url TEXT,
    
    -- 海外供应商信息
    country VARCHAR(100),
    registration_number VARCHAR(100),
    
    -- 生产能力
    production_capacity TEXT,
    main_products TEXT,
    annual_revenue DECIMAL(15,2),
    employee_count INTEGER,
    
    -- 元数据
    rejection_reason TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. 供应商联系人表
CREATE TABLE public.supplier_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 产品相关表
-- =============================================

-- 12. 产品分类表
CREATE TABLE public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE,
    parent_id UUID REFERENCES public.product_categories(id),
    level INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 13. 产品表
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.product_categories(id),
    name VARCHAR(300) NOT NULL,
    code VARCHAR(100),
    description TEXT,
    specifications TEXT,
    unit VARCHAR(50),
    price DECIMAL(15,2),
    min_order_quantity INTEGER,
    lead_time_days INTEGER,
    images TEXT[], -- 存储图片URL数组
    is_active BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, deleted
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 资质相关表
-- =============================================

-- 14. 资质类型表
CREATE TABLE public.qualification_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 15. 供应商资质表
CREATE TABLE public.qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    qualification_type_id UUID REFERENCES public.qualification_types(id),
    name VARCHAR(200) NOT NULL,
    certificate_number VARCHAR(100),
    issuing_authority VARCHAR(200),
    issue_date DATE,
    expire_date DATE,
    file_url TEXT,
    status audit_status DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 部门-供应商关联表
-- =============================================

-- 16. 部门供应商库
CREATE TABLE public.department_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    library_type VARCHAR(20) DEFAULT 'current', -- current, preferred, backup, blacklist
    added_by UUID REFERENCES auth.users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (department_id, supplier_id)
);

-- =============================================
-- 审核与日志表
-- =============================================

-- 17. 审核记录表
CREATE TABLE public.audit_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_type audit_type NOT NULL,
    target_id UUID NOT NULL, -- 关联的供应商/资质/产品ID
    target_table VARCHAR(50) NOT NULL,
    status audit_status NOT NULL DEFAULT 'pending',
    submitted_by UUID REFERENCES auth.users(id),
    reviewed_by UUID REFERENCES auth.users(id),
    review_comment TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 18. 操作日志表
CREATE TABLE public.operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 公告与投诉表
-- =============================================

-- 19. 公告表
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    target_roles app_role[],
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 20. 投诉建议表
CREATE TABLE public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submitted_by UUID REFERENCES auth.users(id),
    is_anonymous BOOLEAN DEFAULT true,
    subject VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    attachments TEXT[],
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, resolved, closed
    response TEXT,
    responded_by UUID REFERENCES auth.users(id),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 报表相关表
-- =============================================

-- 21. 报表模板表
CREATE TABLE public.report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    file_url TEXT,
    target_roles app_role[],
    is_active BOOLEAN DEFAULT true,
    deadline DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 22. 报表提交表
CREATE TABLE public.report_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.report_templates(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, submitted, approved, rejected
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    review_comment TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 启用RLS
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_submissions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 安全函数 (Security Definer)
-- =============================================

-- 检查用户是否具有指定角色
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 检查用户是否为管理员
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- 检查用户是否为部门人员
CREATE OR REPLACE FUNCTION public.is_department_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'department')
$$;

-- 检查用户是否为供应商
CREATE OR REPLACE FUNCTION public.is_supplier(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'supplier')
$$;

-- 获取用户所属部门ID列表
CREATE OR REPLACE FUNCTION public.get_user_department_ids(_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(department_id)
  FROM public.user_departments
  WHERE user_id = _user_id
$$;

-- 获取用户的供应商ID
CREATE OR REPLACE FUNCTION public.get_user_supplier_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.suppliers WHERE user_id = _user_id LIMIT 1
$$;

-- =============================================
-- RLS 策略
-- =============================================

-- Profiles 策略
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- User Roles 策略
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Departments 策略
CREATE POLICY "Authenticated users can view departments"
ON public.departments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage departments"
ON public.departments FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- User Departments 策略
CREATE POLICY "Users can view their own department assignments"
ON public.user_departments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user departments"
ON public.user_departments FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Suppliers 策略
CREATE POLICY "Suppliers can view their own data"
ON public.suppliers FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Suppliers can update their own data"
ON public.suppliers FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Suppliers can insert their own data"
ON public.suppliers FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all suppliers"
ON public.suppliers FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all suppliers"
ON public.suppliers FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Department users can view suppliers in their department"
ON public.suppliers FOR SELECT
TO authenticated
USING (
  public.is_department_user(auth.uid()) AND
  id IN (
    SELECT supplier_id FROM public.department_suppliers 
    WHERE department_id = ANY(public.get_user_department_ids(auth.uid()))
  )
);

-- Supplier Contacts 策略
CREATE POLICY "Suppliers can manage their own contacts"
ON public.supplier_contacts FOR ALL
TO authenticated
USING (
  supplier_id = public.get_user_supplier_id(auth.uid())
);

CREATE POLICY "Admins can manage all contacts"
ON public.supplier_contacts FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Product Categories 策略
CREATE POLICY "Anyone can view active categories"
ON public.product_categories FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage categories"
ON public.product_categories FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Products 策略
CREATE POLICY "Suppliers can manage their own products"
ON public.products FOR ALL
TO authenticated
USING (
  supplier_id = public.get_user_supplier_id(auth.uid())
);

CREATE POLICY "Admins can manage all products"
ON public.products FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Department users can view products from their suppliers"
ON public.products FOR SELECT
TO authenticated
USING (
  public.is_department_user(auth.uid()) AND
  supplier_id IN (
    SELECT supplier_id FROM public.department_suppliers 
    WHERE department_id = ANY(public.get_user_department_ids(auth.uid()))
  )
);

-- Qualification Types 策略
CREATE POLICY "Anyone can view qualification types"
ON public.qualification_types FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage qualification types"
ON public.qualification_types FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Qualifications 策略
CREATE POLICY "Suppliers can manage their own qualifications"
ON public.qualifications FOR ALL
TO authenticated
USING (
  supplier_id = public.get_user_supplier_id(auth.uid())
);

CREATE POLICY "Admins can manage all qualifications"
ON public.qualifications FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Department Suppliers 策略
CREATE POLICY "Department users can view their supplier relationships"
ON public.department_suppliers FOR SELECT
TO authenticated
USING (
  department_id = ANY(public.get_user_department_ids(auth.uid()))
);

CREATE POLICY "Department users can manage their supplier relationships"
ON public.department_suppliers FOR ALL
TO authenticated
USING (
  public.is_department_user(auth.uid()) AND
  department_id = ANY(public.get_user_department_ids(auth.uid()))
);

CREATE POLICY "Admins can manage all department suppliers"
ON public.department_suppliers FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Audit Records 策略
CREATE POLICY "Users can view their own audit records"
ON public.audit_records FOR SELECT
TO authenticated
USING (submitted_by = auth.uid());

CREATE POLICY "Admins can manage all audit records"
ON public.audit_records FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Operation Logs 策略
CREATE POLICY "Users can view their own logs"
ON public.operation_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all logs"
ON public.operation_logs FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can insert logs"
ON public.operation_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Announcements 策略
CREATE POLICY "Users can view published announcements for their role"
ON public.announcements FOR SELECT
TO authenticated
USING (
  is_published = true AND
  (
    target_roles IS NULL OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = ANY(target_roles)
    )
  )
);

CREATE POLICY "Admins can manage announcements"
ON public.announcements FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Complaints 策略
CREATE POLICY "Users can create complaints"
ON public.complaints FOR INSERT
TO authenticated
WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Users can view their own complaints"
ON public.complaints FOR SELECT
TO authenticated
USING (submitted_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage complaints"
ON public.complaints FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Report Templates 策略
CREATE POLICY "Users can view templates for their role"
ON public.report_templates FOR SELECT
TO authenticated
USING (
  is_active = true AND
  (
    target_roles IS NULL OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = ANY(target_roles)
    )
  )
);

CREATE POLICY "Admins can manage templates"
ON public.report_templates FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Report Submissions 策略
CREATE POLICY "Suppliers can manage their own submissions"
ON public.report_submissions FOR ALL
TO authenticated
USING (
  supplier_id = public.get_user_supplier_id(auth.uid())
);

CREATE POLICY "Admins can manage all submissions"
ON public.report_submissions FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- =============================================
-- 触发器：自动更新 updated_at
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplier_contacts_updated_at
    BEFORE UPDATE ON public.supplier_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qualifications_updated_at
    BEFORE UPDATE ON public.qualifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 触发器：新用户自动创建 profile
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 初始化数据
-- =============================================

-- 插入默认产品分类
INSERT INTO public.product_categories (name, code, level) VALUES
('货物类', 'GOODS', 1),
('服务类', 'SERVICE', 1),
('工程类', 'PROJECT', 1);

-- 插入默认资质类型
INSERT INTO public.qualification_types (name, code, is_required) VALUES
('营业执照', 'BUSINESS_LICENSE', true),
('ISO9001质量管理体系认证', 'ISO9001', false),
('ISO14001环境管理体系认证', 'ISO14001', false),
('安全生产许可证', 'SAFETY_LICENSE', false),
('行业资质证书', 'INDUSTRY_CERT', false);