-- 删除 suppliers 表 user_id 列的唯一约束
ALTER TABLE public.suppliers DROP CONSTRAINT IF EXISTS suppliers_user_id_key;