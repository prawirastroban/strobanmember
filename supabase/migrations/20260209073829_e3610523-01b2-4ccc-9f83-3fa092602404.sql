-- Create loyalty_points table to store current balance per user
CREATE TABLE public.loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create loyalty_transactions table to track all point changes
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL, -- positive for add, negative for deduct
  transaction_type TEXT NOT NULL, -- 'add', 'deduct', 'service', 'referral', 'reward_redeemed'
  description TEXT,
  created_by UUID, -- staff/admin who made the change (null for automated)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Loyalty points policies
CREATE POLICY "Users can view own loyalty points"
  ON public.loyalty_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all loyalty points"
  ON public.loyalty_points FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can insert loyalty points"
  ON public.loyalty_points FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update loyalty points"
  ON public.loyalty_points FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- Loyalty transactions policies
CREATE POLICY "Users can view own transactions"
  ON public.loyalty_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all transactions"
  ON public.loyalty_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can insert transactions"
  ON public.loyalty_transactions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- Trigger to update loyalty_points.updated_at
CREATE TRIGGER update_loyalty_points_updated_at
  BEFORE UPDATE ON public.loyalty_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to add points (creates record if not exists, updates total)
CREATE OR REPLACE FUNCTION public.adjust_loyalty_points(
  _user_id UUID,
  _points INTEGER,
  _transaction_type TEXT,
  _description TEXT DEFAULT NULL,
  _created_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total INTEGER;
BEGIN
  -- Insert or update loyalty points record
  INSERT INTO public.loyalty_points (user_id, total_points)
  VALUES (_user_id, GREATEST(0, _points))
  ON CONFLICT (user_id) 
  DO UPDATE SET total_points = GREATEST(0, loyalty_points.total_points + _points)
  RETURNING total_points INTO new_total;

  -- Record the transaction
  INSERT INTO public.loyalty_transactions (user_id, points, transaction_type, description, created_by)
  VALUES (_user_id, _points, _transaction_type, _description, _created_by);

  RETURN new_total;
END;
$$;