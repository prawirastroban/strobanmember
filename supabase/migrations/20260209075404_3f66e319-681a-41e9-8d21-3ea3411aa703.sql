-- Fix: Add authorization check to adjust_loyalty_points function
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
  caller_is_staff BOOLEAN;
BEGIN
  -- Check if caller has staff or admin role
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
  INTO caller_is_staff;
  
  IF NOT caller_is_staff THEN
    RAISE EXCEPTION 'Unauthorized: only staff can adjust loyalty points';
  END IF;

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

-- Create rewards table
CREATE TABLE public.rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  discount_type TEXT NOT NULL, -- 'percentage' or 'fixed'
  discount_value NUMERIC NOT NULL, -- percentage (10 = 10%) or fixed amount
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reward_redemptions table to track redeemed rewards
CREATE TABLE public.reward_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reward_id UUID NOT NULL REFERENCES public.rewards(id),
  points_spent INTEGER NOT NULL,
  redemption_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'used', 'expired'
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Rewards policies (everyone can view active rewards)
CREATE POLICY "Anyone can view active rewards"
  ON public.rewards FOR SELECT
  USING (is_active = true);

CREATE POLICY "Staff can manage rewards"
  ON public.rewards FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- Reward redemptions policies
CREATE POLICY "Users can view own redemptions"
  ON public.reward_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own redemptions"
  ON public.reward_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all redemptions"
  ON public.reward_redemptions FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update redemptions"
  ON public.reward_redemptions FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- Trigger for rewards updated_at
CREATE TRIGGER update_rewards_updated_at
  BEFORE UPDATE ON public.rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to redeem a reward
CREATE OR REPLACE FUNCTION public.redeem_reward(
  _reward_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_reward RECORD;
  v_current_points INTEGER;
  v_redemption_code TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_redemption_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get reward details
  SELECT * INTO v_reward FROM public.rewards WHERE id = _reward_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Reward not found or inactive');
  END IF;

  -- Get user's current points
  SELECT total_points INTO v_current_points FROM public.loyalty_points WHERE user_id = v_user_id;
  IF v_current_points IS NULL THEN
    v_current_points := 0;
  END IF;

  -- Check if user has enough points
  IF v_current_points < v_reward.points_required THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient points', 'required', v_reward.points_required, 'available', v_current_points);
  END IF;

  -- Generate redemption code and expiry
  v_redemption_code := 'RWD-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8));
  v_expires_at := NOW() + INTERVAL '30 days';

  -- Deduct points
  UPDATE public.loyalty_points 
  SET total_points = total_points - v_reward.points_required
  WHERE user_id = v_user_id;

  -- Record transaction
  INSERT INTO public.loyalty_transactions (user_id, points, transaction_type, description)
  VALUES (v_user_id, -v_reward.points_required, 'reward_redeemed', 'Redeemed: ' || v_reward.name);

  -- Create redemption record
  INSERT INTO public.reward_redemptions (user_id, reward_id, points_spent, redemption_code, expires_at)
  VALUES (v_user_id, _reward_id, v_reward.points_required, v_redemption_code, v_expires_at)
  RETURNING id INTO v_redemption_id;

  RETURN json_build_object(
    'success', true, 
    'redemption_code', v_redemption_code, 
    'expires_at', v_expires_at,
    'reward_name', v_reward.name,
    'discount_type', v_reward.discount_type,
    'discount_value', v_reward.discount_value
  );
END;
$$;

-- Insert some default rewards
INSERT INTO public.rewards (name, description, points_required, discount_type, discount_value) VALUES
  ('10% Off Next Service', 'Get 10% off your next service appointment', 500, 'percentage', 10),
  ('$15 Off Any Service', 'Get $15 off any service over $50', 750, 'fixed', 15),
  ('25% Off Oil Change', 'Get 25% off your next oil change service', 400, 'percentage', 25),
  ('Free Car Wash', 'Redeem for a complimentary car wash', 300, 'fixed', 25),
  ('$50 Off Full Service', 'Get $50 off a full service package', 1500, 'fixed', 50);