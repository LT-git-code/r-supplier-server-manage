-- Create storage bucket for supplier attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('supplier-attachments', 'supplier-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for supplier attachments
CREATE POLICY "Suppliers can upload their own attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'supplier-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Suppliers can view their own attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'supplier-attachments' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR is_admin(auth.uid())
    OR is_department_user(auth.uid())
  )
);

CREATE POLICY "Suppliers can delete their own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'supplier-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create table for supplier attachments metadata
CREATE TABLE public.supplier_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  category VARCHAR NOT NULL, -- 'capacity', 'finance', 'cases'
  file_name VARCHAR NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type VARCHAR,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for supplier_attachments
CREATE POLICY "Suppliers can manage their own attachments"
ON public.supplier_attachments FOR ALL
USING (supplier_id = get_user_supplier_id(auth.uid()));

CREATE POLICY "Admins can manage all attachments"
ON public.supplier_attachments FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Department users can view supplier attachments"
ON public.supplier_attachments FOR SELECT
USING (
  is_department_user(auth.uid()) 
  AND supplier_id IN (
    SELECT supplier_id FROM department_suppliers 
    WHERE department_id = ANY(get_user_department_ids(auth.uid()))
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_supplier_attachments_updated_at
  BEFORE UPDATE ON public.supplier_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();