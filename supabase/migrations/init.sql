-- SANKOFA Database Migration Schema
-- Target: Supabase PostgreSQL
-- Version: 1.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. TABLES DEFINITION
-- =========================================================================

-- Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('buyer', 'artist', 'admin', 'curator')) DEFAULT 'buyer',
    first_name TEXT,
    last_name TEXT,
    is_suspended BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Artists table (KYC and mobile money info)
CREATE TABLE IF NOT EXISTS public.artists (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    bio TEXT,
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    cni_url TEXT,
    selfie_url TEXT,
    kyc_status TEXT NOT NULL CHECK (kyc_status IN ('pending', 'approved', 'rejected', 'unsubmitted')) DEFAULT 'unsubmitted',
    rejection_reason TEXT,
    mobile_money_phone TEXT,
    mobile_money_provider TEXT CHECK (mobile_money_provider IN ('orange', 'mtn', 'moov', 'airtel')),
    rating_avg NUMERIC(3,2) DEFAULT 0.0 CHECK (rating_avg >= 0.0 AND rating_avg <= 5.0),
    academy_completed BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Artworks table
CREATE TABLE IF NOT EXISTS public.artworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    rental_price_per_month NUMERIC(12,2) CHECK (rental_price_per_month >= 0),
    category TEXT NOT NULL CHECK (category IN ('Peinture', 'Sculpture', 'Art Numérique', 'Photographie', 'Autre')),
    dimensions JSONB NOT NULL, -- Format: {"height": 100, "width": 80, "depth": 5, "weight": 2.5}
    materials TEXT[] NOT NULL DEFAULT '{}',
    photos TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending_curation', 'published', 'refused', 'sold')) DEFAULT 'draft',
    rejection_reason TEXT,
    is_rental_available BOOLEAN DEFAULT false NOT NULL,
    is_certified BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    artwork_id UUID NOT NULL REFERENCES public.artworks(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    escrow_status TEXT NOT NULL CHECK (escrow_status IN ('none', 'held', 'released', 'refunded')) DEFAULT 'none',
    delivery_status TEXT NOT NULL CHECK (delivery_status IN ('pending', 'shipped', 'delivered', 'disputed', 'returned')) DEFAULT 'pending',
    shipping_address JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Escrow Transactions table
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL CHECK (status IN ('pending', 'held', 'released', 'refunded')) DEFAULT 'pending',
    paynote_ref TEXT,
    released_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    dispute_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Certificates table (blockchain authentication)
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artwork_id UUID NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    blockchain_tx_hash TEXT,
    qr_code_url TEXT,
    certificate_pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Rentals table (Artothèque V2)
CREATE TABLE IF NOT EXISTS public.rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    artwork_id UUID NOT NULL REFERENCES public.artworks(id) ON DELETE RESTRICT,
    start_date TIMESTAMPTZ NOT NULL,
    duration_months INT NOT NULL CHECK (duration_months IN (1, 3, 6)),
    monthly_rate NUMERIC(12,2) NOT NULL CHECK (monthly_rate >= 0),
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'purchased', 'cancelled')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Rental Payments table
CREATE TABLE IF NOT EXISTS public.rental_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    due_date TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Litigations table
CREATE TABLE IF NOT EXISTS public.litigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('opened', 'under_review', 'resolved', 'closed')) DEFAULT 'opened',
    resolution TEXT CHECK (resolution IN ('refund', 'payout', 'other')),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Delivery Milestones table
CREATE TABLE IF NOT EXISTS public.delivery_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    location TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- =========================================================================
-- 2. AUTOMATIC USER PROFILE TRIGGER
-- =========================================================================

-- Trigger to automatically create a profile and/or artist entry on new auth signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    default_role TEXT := 'buyer';
    first_name_val TEXT;
    last_name_val TEXT;
    country_val TEXT := 'Cameroun'; -- Default country
    city_val TEXT := 'Douala';      -- Default city
BEGIN
    -- Extract meta fields from auth metadata if present
    IF new.raw_user_meta_data IS NOT NULL THEN
        IF new.raw_user_meta_data ? 'role' THEN
            default_role := new.raw_user_meta_data->>'role';
        END IF;
        IF new.raw_user_meta_data ? 'first_name' THEN
            first_name_val := new.raw_user_meta_data->>'first_name';
        END IF;
        IF new.raw_user_meta_data ? 'last_name' THEN
            last_name_val := new.raw_user_meta_data->>'last_name';
        END IF;
        IF new.raw_user_meta_data ? 'country' THEN
            country_val := new.raw_user_meta_data->>'country';
        END IF;
        IF new.raw_user_meta_data ? 'city' THEN
            city_val := new.raw_user_meta_data->>'city';
        END IF;
    END IF;

    -- Insert into profiles
    INSERT INTO public.profiles (id, email, phone, role, first_name, last_name)
    VALUES (
        new.id,
        new.email,
        new.phone,
        default_role,
        first_name_val,
        last_name_val
    );
    
    -- If registering as artist, create standard artist record too
    IF default_role = 'artist' THEN
        INSERT INTO public.artists (id, country, city, kyc_status)
        VALUES (
            new.id,
            country_val,
            city_val,
            'unsubmitted'
        );
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users (if not already existing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.litigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_milestones ENABLE ROW LEVEL SECURITY;

-- Helper function to check if a user is suspended
CREATE OR REPLACE FUNCTION public.is_user_suspended(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_suspended FROM public.profiles WHERE id = user_id), false);
$$ LANGUAGE sql SECURITY DEFINER;

-- 3.1. PROFILES POLICIES
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profiles" ON public.profiles
    FOR UPDATE USING (auth.uid() = id AND is_suspended = false);

-- 3.2. ARTISTS POLICIES
CREATE POLICY "Anyone can view artist profiles" ON public.artists
    FOR SELECT USING (true);

CREATE POLICY "Artists can update their own artist details" ON public.artists
    FOR UPDATE USING (auth.uid() = id AND NOT public.is_user_suspended(auth.uid()));

CREATE POLICY "Admins can update artist details" ON public.artists
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('admin', 'curator')
        )
    );

-- 3.3. ARTWORKS POLICIES
CREATE POLICY "Anyone can view published artworks" ON public.artworks
    FOR SELECT USING (status = 'published' OR auth.uid() = artist_id);

CREATE POLICY "Artists can insert their own artworks" ON public.artworks
    FOR INSERT WITH CHECK (auth.uid() = artist_id AND NOT public.is_user_suspended(auth.uid()));

CREATE POLICY "Artists can update their own artworks" ON public.artworks
    FOR UPDATE USING (auth.uid() = artist_id AND NOT public.is_user_suspended(auth.uid()));

CREATE POLICY "Artists can delete their own draft artworks" ON public.artworks
    FOR DELETE USING (auth.uid() = artist_id AND status = 'draft' AND NOT public.is_user_suspended(auth.uid()));

-- 3.4. ORDERS POLICIES
CREATE POLICY "Buyers can view their own orders" ON public.orders
    FOR SELECT USING (
        auth.uid() = buyer_id OR 
        auth.uid() IN (SELECT artist_id FROM public.artworks WHERE id = artwork_id)
    );

CREATE POLICY "Buyers can insert their own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = buyer_id AND NOT public.is_user_suspended(auth.uid()));

-- 3.5. ESCROW TRANSACTIONS POLICIES
CREATE POLICY "Parties of orders can view escrow" ON public.escrow_transactions
    FOR SELECT USING (
        auth.uid() IN (
            SELECT buyer_id FROM public.orders WHERE id = order_id
        ) OR
        auth.uid() IN (
            SELECT artist_id FROM public.artworks WHERE id = (
                SELECT artwork_id FROM public.orders WHERE id = order_id
            )
        )
    );

-- 3.6. CERTIFICATES POLICIES
CREATE POLICY "Certificates are viewable by everyone" ON public.certificates
    FOR SELECT USING (true);

-- 3.7. RENTALS & RENTAL PAYMENTS POLICIES
CREATE POLICY "Parties of rentals can view rentals" ON public.rentals
    FOR SELECT USING (
        auth.uid() = buyer_id OR 
        auth.uid() IN (SELECT artist_id FROM public.artworks WHERE id = artwork_id)
    );

CREATE POLICY "Parties of rentals can view payments" ON public.rental_payments
    FOR SELECT USING (
        auth.uid() IN (
            SELECT buyer_id FROM public.rentals WHERE id = rental_id
        ) OR
        auth.uid() IN (
            SELECT artist_id FROM public.artworks WHERE id = (
                SELECT artwork_id FROM public.rentals WHERE id = rental_id
            )
        )
    );

-- 3.8. LITIGATIONS POLICIES
CREATE POLICY "Requester can view and edit their litigation" ON public.litigations
    FOR SELECT USING (
        auth.uid() = requester_id OR
        auth.uid() IN (
            SELECT artist_id FROM public.artworks WHERE id = (
                SELECT artwork_id FROM public.orders WHERE id = order_id
            )
        )
    );

CREATE POLICY "Requester can insert litigation" ON public.litigations
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- 3.9. REVIEWS POLICIES
CREATE POLICY "Anyone can view approved reviews" ON public.reviews
    FOR SELECT USING (is_approved = true OR auth.uid() = buyer_id);

CREATE POLICY "Buyers can add reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Admins can view all reviews" ON public.reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('admin', 'curator')
        )
    );

CREATE POLICY "Admins can update reviews" ON public.reviews
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('admin', 'curator')
        )
    );

CREATE POLICY "Admins can delete reviews" ON public.reviews
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('admin', 'curator')
        )
    );

-- 3.10. DELIVERY MILESTONES POLICIES
CREATE POLICY "Public read delivery milestones" ON public.delivery_milestones
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert delivery milestones" ON public.delivery_milestones
    FOR INSERT WITH CHECK (true);

-- =========================================================================
-- 4. EXHIBITIONS & VIRTUAL CURATION MODULE
-- =========================================================================

-- Create exhibitions table
CREATE TABLE IF NOT EXISTS public.exhibitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    cover_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create exhibition artworks junction table
CREATE TABLE IF NOT EXISTS public.exhibition_artworks (
    exhibition_id UUID NOT NULL REFERENCES public.exhibitions(id) ON DELETE CASCADE,
    artwork_id UUID NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (exhibition_id, artwork_id)
);

-- Add exhibition referral to orders and rentals
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS exhibition_id UUID REFERENCES public.exhibitions(id) ON DELETE SET NULL;
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS exhibition_id UUID REFERENCES public.exhibitions(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.exhibitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibition_artworks ENABLE ROW LEVEL SECURITY;

-- 4.1. EXHIBITIONS POLICIES
CREATE POLICY "Exhibitions are viewable by everyone" ON public.exhibitions
    FOR SELECT USING (true);

CREATE POLICY "Curators and admins can insert exhibitions" ON public.exhibitions
    FOR INSERT WITH CHECK (
        auth.uid() = curator_id AND 
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('curator', 'admin')
        )
    );

CREATE POLICY "Curators and admins can update their own exhibitions" ON public.exhibitions
    FOR UPDATE USING (
        auth.uid() = curator_id AND 
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('curator', 'admin')
        )
    );

CREATE POLICY "Curators and admins can delete their own exhibitions" ON public.exhibitions
    FOR DELETE USING (
        auth.uid() = curator_id AND 
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('curator', 'admin')
        )
    );

-- 4.2. EXHIBITION_ARTWORKS POLICIES
CREATE POLICY "Exhibition artworks are viewable by everyone" ON public.exhibition_artworks
    FOR SELECT USING (true);

CREATE POLICY "Curators and admins can insert exhibition artworks" ON public.exhibition_artworks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.exhibitions
            WHERE id = exhibition_id AND curator_id = auth.uid()
        )
    );

CREATE POLICY "Curators and admins can delete exhibition artworks" ON public.exhibition_artworks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.exhibitions
            WHERE id = exhibition_id AND curator_id = auth.uid()
        )
    );

-- =========================================================================
-- 5. AUDIT LOGS MODULE
-- =========================================================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5.1. AUDIT_LOGS POLICIES
CREATE POLICY "Admins and curators can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role IN ('admin', 'curator')
        )
    );

CREATE POLICY "Anyone can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);


