-- 在 department_suppliers 表添加 is_hidden 字段，用于标记该供应商的联系信息对其他部门是否隐藏
ALTER TABLE public.department_suppliers 
ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- 添加注释说明
COMMENT ON COLUMN public.department_suppliers.is_hidden IS '是否对其他部门隐藏该供应商的联系信息';