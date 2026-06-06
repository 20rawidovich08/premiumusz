CREATE TABLE public.nft_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC,
  price_ton NUMERIC,
  telegram_link TEXT,
  badge TEXT,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nft_gifts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nft_gifts TO authenticated;
GRANT ALL ON public.nft_gifts TO service_role;

ALTER TABLE public.nft_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active NFT gifts"
  ON public.nft_gifts FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert NFT gifts"
  ON public.nft_gifts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update NFT gifts"
  ON public.nft_gifts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete NFT gifts"
  ON public.nft_gifts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at_nft_gifts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_nft_gifts_updated_at
  BEFORE UPDATE ON public.nft_gifts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_nft_gifts();