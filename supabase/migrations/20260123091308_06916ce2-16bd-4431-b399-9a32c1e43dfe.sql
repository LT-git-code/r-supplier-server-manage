-- 增加 registered_capital 和 annual_revenue 字段的精度
ALTER TABLE public.suppliers 
  ALTER COLUMN registered_capital TYPE numeric(20, 2),
  ALTER COLUMN annual_revenue TYPE numeric(20, 2);