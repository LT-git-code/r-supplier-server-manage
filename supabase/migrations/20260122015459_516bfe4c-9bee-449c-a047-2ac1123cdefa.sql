-- 创建报表模板存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('report-templates', 'report-templates', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- 创建报表存储桶策略
CREATE POLICY "Anyone can read report templates" ON storage.objects
FOR SELECT USING (bucket_id = 'report-templates');

CREATE POLICY "Admins can manage report templates" ON storage.objects
FOR ALL USING (
  bucket_id = 'report-templates' 
  AND auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
);

-- 为report_templates表添加target_supplier_ids字段来存储指定的供应商列表
ALTER TABLE public.report_templates
ADD COLUMN IF NOT EXISTS target_supplier_ids uuid[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS supplier_selection_type varchar(20) DEFAULT 'all';

-- 添加注释
COMMENT ON COLUMN public.report_templates.target_supplier_ids IS '指定需要填写报表的供应商ID列表';
COMMENT ON COLUMN public.report_templates.supplier_selection_type IS '供应商选择类型: all-全部供应商, selected-指定供应商';

-- 更新report_templates的RLS策略，允许供应商查看针对自己的模板
DROP POLICY IF EXISTS "Users can view templates for their role" ON public.report_templates;

CREATE POLICY "Users can view templates for their role" ON public.report_templates
FOR SELECT USING (
  (is_active = true) AND (
    -- 管理员可以看到所有
    is_admin(auth.uid())
    OR
    -- 按角色查看
    (target_roles IS NULL OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = ANY(report_templates.target_roles)
    ))
    AND
    -- 按供应商ID查看
    (supplier_selection_type = 'all' OR target_supplier_ids IS NULL OR get_user_supplier_id(auth.uid()) = ANY(target_supplier_ids))
  )
);