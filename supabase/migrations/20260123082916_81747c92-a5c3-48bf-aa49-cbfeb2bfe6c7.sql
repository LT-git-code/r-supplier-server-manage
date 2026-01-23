-- 为suppliers表添加异议相关字段
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS has_objection boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS objection_reason text,
ADD COLUMN IF NOT EXISTS objection_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS objection_by uuid;