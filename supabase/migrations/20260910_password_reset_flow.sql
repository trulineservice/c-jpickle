-- ============================================================================
-- C&J PICKLEBALL ARENA - PASSWORD RESET AND CHANGE PASSWORD FLOW
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON public.password_reset_tokens(email);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role and security definer functions can access tokens table directly
DROP POLICY IF EXISTS "Deny direct public access to reset tokens" ON public.password_reset_tokens;
CREATE POLICY "Deny direct public access to reset tokens"
    ON public.password_reset_tokens
    FOR ALL
    TO public
    USING (false);

-- Function to create a reset token
CREATE OR REPLACE FUNCTION public.create_password_reset_token(
    p_email TEXT,
    p_token TEXT,
    p_hours INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_full_name TEXT;
    v_clean_email TEXT;
BEGIN
    v_clean_email := lower(trim(p_email));
    
    -- Find user in auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(trim(email)) = v_clean_email
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No account found with this email address.');
    END IF;

    -- Look up name from profiles or metadata
    SELECT full_name INTO v_full_name
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_full_name IS NULL THEN
        SELECT raw_user_meta_data->>'full_name' INTO v_full_name
        FROM auth.users
        WHERE id = v_user_id;
    END IF;

    IF v_full_name IS NULL THEN
        v_full_name := 'Valued Player';
    END IF;

    -- Invalidate any previous unused tokens for this email
    UPDATE public.password_reset_tokens
    SET used = true
    WHERE email = v_clean_email AND used = false;

    -- Insert new token
    INSERT INTO public.password_reset_tokens (
        user_id,
        email,
        token,
        expires_at,
        used
    ) VALUES (
        v_user_id,
        v_clean_email,
        p_token,
        now() + (p_hours || ' hours')::interval,
        false
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'full_name', v_full_name
    );
END;
$$;

-- Function to verify if a token is valid
CREATE OR REPLACE FUNCTION public.verify_password_reset_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_record RECORD;
BEGIN
    SELECT * INTO v_record
    FROM public.password_reset_tokens
    WHERE token = trim(p_token)
      AND used = false
      AND expires_at > now();

    IF v_record.id IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Reset link is invalid or has expired.');
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'email', v_record.email
    );
END;
$$;

-- Function to complete password reset using valid token
CREATE OR REPLACE FUNCTION public.complete_password_reset(
    p_token TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_record RECORD;
    v_hashed_password TEXT;
BEGIN
    IF length(p_new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 6 characters.');
    END IF;

    SELECT * INTO v_record
    FROM public.password_reset_tokens
    WHERE token = trim(p_token)
      AND used = false
      AND expires_at > now();

    IF v_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reset link is invalid or has expired. Please request a new one.');
    END IF;

    -- Hash password with bcrypt cost 10
    v_hashed_password := crypt(p_new_password, gen_salt('bf', 10));

    -- Update auth.users password
    UPDATE auth.users
    SET encrypted_password = v_hashed_password,
        updated_at = now()
    WHERE id = v_record.user_id;

    -- Mark token as used
    UPDATE public.password_reset_tokens
    SET used = true
    WHERE id = v_record.id;

    RETURN jsonb_build_object(
        'success', true,
        'email', v_record.email
    );
END;
$$;

-- Grant execution to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.create_password_reset_token(TEXT, TEXT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_password_reset_token(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_password_reset(TEXT, TEXT) TO anon, authenticated, service_role;
