-- 创建资质附件存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('qualification-attachments', 'qualification-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 供应商可以上传自己的资质附件
CREATE POLICY "Suppliers can upload qualification attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'qualification-attachments' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.suppliers WHERE user_id = auth.uid() LIMIT 1)
);

-- 供应商可以更新自己的资质附件
CREATE POLICY "Suppliers can update their qualification attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'qualification-attachments'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.suppliers WHERE user_id = auth.uid() LIMIT 1)
);

-- 供应商可以删除自己的资质附件
CREATE POLICY "Suppliers can delete their qualification attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'qualification-attachments'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.suppliers WHERE user_id = auth.uid() LIMIT 1)
);

-- 所有认证用户可以查看资质附件（公开桶）
CREATE POLICY "Authenticated users can view qualification attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'qualification-attachments' AND auth.uid() IS NOT NULL);