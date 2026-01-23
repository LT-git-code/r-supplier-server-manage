-- Create table for storing verification codes
CREATE TABLE public.verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone VARCHAR(20),
  email VARCHAR(255),
  code VARCHAR(10) NOT NULL,
  type VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_verification_codes_phone ON public.verification_codes(phone, type, used);
CREATE INDEX idx_verification_codes_email ON public.verification_codes(email, type, used);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (edge functions use service role)
CREATE POLICY "Service role only" ON public.verification_codes
  FOR ALL USING (false);

-- Add cleanup function for expired codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.verification_codes WHERE expires_at < now() OR used = true;
END;
$$;