-- Create Test User
-- Date: 2026-02-05
-- Description: Creates a test user account for development and testing

DO $$
DECLARE
    test_user_id UUID;
    existing_user_id UUID;
BEGIN
    -- Check if user already exists
    SELECT id INTO existing_user_id
    FROM auth.users
    WHERE email = 'a0405142777@gmail.com'
    LIMIT 1;

    IF existing_user_id IS NULL THEN
        -- 固定 UUID 以便種子與測試環境一致
        test_user_id := '2cd70d9d-9d84-4d2a-9848-df5b3898e4c4'::uuid;

        -- Insert into auth.users table
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            aud,
            role
        ) VALUES (
            test_user_id,
            '00000000-0000-0000-0000-000000000000',
            'a0405142777@gmail.com',
            -- Password hash for '!qaz2wsX' using crypt
            crypt('!qaz2wsX', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"display_name":"測試用戶"}'::jsonb,
            NOW(),
            NOW(),
            '',
            '',
            '',
            '',
            'authenticated',
            'authenticated'
        );

        -- Insert into auth.identities table
        INSERT INTO auth.identities (
            id,
            user_id,
            provider_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            test_user_id,
            test_user_id::text,
            jsonb_build_object(
                'sub', test_user_id::text,
                'email', 'a0405142777@gmail.com'
            ),
            'email',
            NOW(),
            NOW(),
            NOW()
        );

        -- Insert into users_profile table
        INSERT INTO public.users_profile (
            id,
            roles,
            display_name,
            phone,
            created_at,
            updated_at
        ) VALUES (
            test_user_id,
            ARRAY['landlord']::text[],
            '測試用戶',
            '0912345678',
            NOW(),
            NOW()
        );

        RAISE NOTICE '✅ Test user created successfully: % (ID: %)', 'a0405142777@gmail.com', test_user_id;
    ELSE
        RAISE NOTICE 'ℹ️  User already exists: % (ID: %)', 'a0405142777@gmail.com', existing_user_id;
    END IF;
END $$;
