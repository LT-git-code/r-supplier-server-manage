-- 为 suppliers 表添加拉黑和推荐字段
ALTER TABLE public.suppliers 
ADD COLUMN is_blacklisted boolean NOT NULL DEFAULT false,
ADD COLUMN is_recommended boolean NOT NULL DEFAULT false,
ADD COLUMN blacklisted_at timestamp with time zone,
ADD COLUMN blacklisted_by uuid,
ADD COLUMN blacklist_reason text,
ADD COLUMN recommended_at timestamp with time zone,
ADD COLUMN recommended_by uuid;

-- 创建索引以优化查询（推荐优先排序）
CREATE INDEX idx_suppliers_recommended ON public.suppliers(is_recommended DESC, created_at DESC);
CREATE INDEX idx_suppliers_blacklisted ON public.suppliers(is_blacklisted) WHERE is_blacklisted = true;