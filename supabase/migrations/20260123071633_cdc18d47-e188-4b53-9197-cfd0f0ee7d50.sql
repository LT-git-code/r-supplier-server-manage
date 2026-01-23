-- Add additional columns to complaints table for contact information
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS company_name character varying,
ADD COLUMN IF NOT EXISTS contact_name character varying,
ADD COLUMN IF NOT EXISTS contact_phone character varying,
ADD COLUMN IF NOT EXISTS complaint_type character varying DEFAULT 'complaint';

-- Create storage bucket for complaint attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-attachments', 'complaint-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to complaint-attachments bucket
CREATE POLICY "Users can upload complaint attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'complaint-attachments' AND auth.uid() IS NOT NULL);

-- Allow users to view their own uploads
CREATE POLICY "Users can view their own complaint attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'complaint-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow admins to view all complaint attachments
CREATE POLICY "Admins can view all complaint attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'complaint-attachments' AND public.is_admin(auth.uid()));

-- Update RLS policy to allow anonymous complaints (without auth)
DROP POLICY IF EXISTS "Users can create complaints" ON public.complaints;
CREATE POLICY "Anyone can create complaints"
ON public.complaints FOR INSERT
WITH CHECK (true);