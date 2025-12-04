-- Affiliate System Tables
-- This migration creates tables for managing affiliates, their codes, referrals, and payouts

-- 1. Affiliates table - stores affiliate accounts (individuals or organizations)
CREATE TABLE IF NOT EXISTS public.affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'organization')),
    commission_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00 CHECK (commission_percent >= 0 AND commission_percent <= 100),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    contact_person TEXT, -- For organizations, the main contact
    phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Affiliate codes table - promo codes linked to affiliates
CREATE TABLE IF NOT EXISTS public.affiliate_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    stripe_coupon_id TEXT, -- Stripe coupon ID
    stripe_promo_code_id TEXT, -- Stripe promotion code ID
    discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
    currency TEXT DEFAULT 'usd', -- For fixed discounts
    max_redemptions INTEGER, -- NULL = unlimited
    current_redemptions INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ, -- NULL = never expires
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Affiliate referrals table - track each successful referral/purchase
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_code_id UUID NOT NULL REFERENCES public.affiliate_codes(id) ON DELETE RESTRICT,
    affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- The student who signed up
    stripe_payment_intent_id TEXT,
    stripe_checkout_session_id TEXT,
    original_amount DECIMAL(10,2) NOT NULL, -- Amount before discount
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- Discount given
    final_amount DECIMAL(10,2) NOT NULL, -- Amount actually paid
    currency TEXT NOT NULL DEFAULT 'usd',
    commission_amount DECIMAL(10,2) NOT NULL, -- Amount owed to affiliate
    commission_status TEXT NOT NULL DEFAULT 'pending' CHECK (commission_status IN ('pending', 'approved', 'paid', 'cancelled')),
    plan_id TEXT, -- Which plan was purchased
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Affiliate payouts table - track commission payouts to affiliates
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE RESTRICT,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
    payment_method TEXT, -- bank_transfer, paypal, etc.
    payment_reference TEXT, -- Transaction ID or reference
    notes TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_codes_affiliate_id ON public.affiliate_codes(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_codes_code ON public.affiliate_codes(code);
CREATE INDEX IF NOT EXISTS idx_affiliate_codes_stripe_promo_code_id ON public.affiliate_codes(stripe_promo_code_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_id ON public.affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_code_id ON public.affiliate_referrals(affiliate_code_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_user_id ON public.affiliate_referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_created_at ON public.affiliate_referrals(created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON public.affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status ON public.affiliate_payouts(status);

-- Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_affiliates_updated_at ON public.affiliates;
CREATE TRIGGER update_affiliates_updated_at
    BEFORE UPDATE ON public.affiliates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_affiliate_codes_updated_at ON public.affiliate_codes;
CREATE TRIGGER update_affiliate_codes_updated_at
    BEFORE UPDATE ON public.affiliate_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_affiliate_payouts_updated_at ON public.affiliate_payouts;
CREATE TRIGGER update_affiliate_payouts_updated_at
    BEFORE UPDATE ON public.affiliate_payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- Admin-only access for affiliates table
CREATE POLICY "Admins can manage affiliates" ON public.affiliates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admin-only access for affiliate_codes table
CREATE POLICY "Admins can manage affiliate codes" ON public.affiliate_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Public read access for active affiliate codes (for validation at checkout)
CREATE POLICY "Anyone can validate active affiliate codes" ON public.affiliate_codes
    FOR SELECT USING (is_active = TRUE);

-- Admin-only access for affiliate_referrals table
CREATE POLICY "Admins can manage affiliate referrals" ON public.affiliate_referrals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Users can see their own referral (optional - for showing they used a code)
CREATE POLICY "Users can see their own referrals" ON public.affiliate_referrals
    FOR SELECT USING (user_id = auth.uid());

-- Admin-only access for affiliate_payouts table
CREATE POLICY "Admins can manage affiliate payouts" ON public.affiliate_payouts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Grant permissions
GRANT SELECT ON public.affiliate_codes TO anon;
GRANT ALL ON public.affiliates TO authenticated;
GRANT ALL ON public.affiliate_codes TO authenticated;
GRANT ALL ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_payouts TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.affiliates IS 'Affiliate accounts - individuals or organizations who refer students';
COMMENT ON TABLE public.affiliate_codes IS 'Promo codes linked to affiliates with discount settings';
COMMENT ON TABLE public.affiliate_referrals IS 'Tracks each successful referral/purchase using an affiliate code';
COMMENT ON TABLE public.affiliate_payouts IS 'Records of commission payouts to affiliates';

