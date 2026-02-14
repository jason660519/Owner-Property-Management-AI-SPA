-- ==============================================================================
-- Seed: Superadmin dashboard virtual data for sync testing
-- Date: 2026-02-15
-- Description: When property_sales is empty, inserts virtual properties (and
--              optional agreements/documents) so dashboard numbers reflect DB.
--              Idempotent: runs only when no sales properties exist.
-- ==============================================================================

DO $$
DECLARE
    owner_id UUID;
    sales_count INT;
    first_sale_id UUID;
    first_rental_id UUID;
BEGIN
    SELECT count(*)::int INTO sales_count FROM public.property_sales;
    IF sales_count > 0 THEN
        RAISE NOTICE 'Superadmin dashboard seed: property_sales already has data, skip.';
        RETURN;
    END IF;

    SELECT id INTO owner_id FROM public.users_profile LIMIT 1;
    IF owner_id IS NULL THEN
        SELECT id INTO owner_id FROM auth.users LIMIT 1;
    END IF;
    IF owner_id IS NULL THEN
        RAISE NOTICE 'Superadmin dashboard seed: no user in users_profile or auth.users, skip property seed.';
        RETURN;
    END IF;

    -- 3 sales: available, pending, sold (dashboard: 目前在售=3, 逾期案=1, 成交=1, activeListings=1)
    INSERT INTO public.property_sales (id, owner_id, address, price, status, details, created_at)
    VALUES
        (gen_random_uuid(), owner_id, '台北市信義區信義路五段7號', 25000000, 'available', '{}'::jsonb, NOW()),
        (gen_random_uuid(), owner_id, '新北市新店區華城路100號', 48000000, 'pending',  '{}'::jsonb, NOW()),
        (gen_random_uuid(), owner_id, '台北市大安區敦化南路二段', 38000000, 'sold',    '{}'::jsonb, NOW());

    SELECT id INTO first_sale_id FROM public.property_sales WHERE owner_id = owner_id ORDER BY created_at LIMIT 1;

    -- 3 rentals: vacant, occupied, maintenance (dashboard: 在租=3, 逾期出租案=1)
    INSERT INTO public.property_rentals (id, owner_id, address, monthly_rent, status, lease_term, details, created_at)
    VALUES
        (gen_random_uuid(), owner_id, '新北市淡水區中正東路50號', 35000, 'vacant',      12, '{}'::jsonb, NOW()),
        (gen_random_uuid(), owner_id, '台北市中山區民生東路三段', 45000, 'occupied',   12, '{}'::jsonb, NOW()),
        (gen_random_uuid(), owner_id, '台北市內湖區成功路四段', 55000, 'maintenance', 12, '{}'::jsonb, NOW());

    SELECT id INTO first_rental_id FROM public.property_rentals WHERE owner_id = owner_id ORDER BY created_at LIMIT 1;

    -- 1 買賣合約 (預覽) → 尚未完成預覽合約的在售物件數 = 2
    IF first_sale_id IS NOT NULL THEN
        INSERT INTO public.sales_agreements (
            seller_id, buyer_name, property_id, contract_number,
            purchase_price, down_payment, terms_and_conditions, created_at
        ) VALUES (
            owner_id, '虛擬買家', first_sale_id, 'SEED-S-' || replace(gen_random_uuid()::text, '-', '')::text,
            25000000, 5000000, '種子資料合約條款', NOW()
        );
    END IF;

    -- 1 租賃合約 (預覽) → 尚未完成預覽合約的在租物件數 = 2 (lease_agreements need landlord_id, tenant_id; use owner as both)
    IF first_rental_id IS NOT NULL THEN
        INSERT INTO public.lease_agreements (
            landlord_id, tenant_id, property_id, contract_number,
            start_date, end_date, monthly_rent, deposit_amount, payment_due_day, terms_and_conditions, created_at, updated_at
        ) VALUES (
            owner_id, owner_id, first_rental_id, 'SEED-L-' || replace(gen_random_uuid()::text, '-', '')::text,
            CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months', 35000, 70000, 5, '種子資料租賃條款', NOW(), NOW()
        );
    END IF;

    -- 1 出售物件調查報告書、1 出租物件調查報告書 (property_documents need owner_id, document_type, file_path, uploaded_by)
    IF first_sale_id IS NOT NULL THEN
        INSERT INTO public.property_documents (
            property_id, property_type, owner_id, document_type, document_name, file_path, uploaded_by, created_at, updated_at
        ) VALUES (
            first_sale_id, 'sales', owner_id, 'building_title', '種子建物權狀', 'seed/sales-doc.pdf', owner_id, NOW(), NOW()
        );
    END IF;
    IF first_rental_id IS NOT NULL THEN
        INSERT INTO public.property_documents (
            property_id, property_type, owner_id, document_type, document_name, file_path, uploaded_by, created_at, updated_at
        ) VALUES (
            first_rental_id, 'rentals', owner_id, 'lease_contract', '種子租約', 'seed/rental-doc.pdf', owner_id, NOW(), NOW()
        );
    END IF;

    -- 1 張出售物件照片 → 尚未完成拍照的在售物件數 = 2 (property_photos: property_id, storage_path)
    IF first_sale_id IS NOT NULL THEN
        INSERT INTO public.property_photos (property_id, storage_path, is_primary, photo_type, created_at)
        VALUES (first_sale_id, 'seed/sales-photo.jpg', true, 'interior', NOW());
    END IF;

    RAISE NOTICE 'Superadmin dashboard seed: inserted 3 sales, 3 rentals, 1 sales_agreement, 1 lease_agreement, 2 property_documents, 1 property_photo for owner %.', owner_id;
END $$;

-- When properties already exist (e.g. from seed_featured_properties) but agreements/documents are empty, backfill one each so dashboard sync shows non-zero counts.
DO $$
DECLARE
    owner_id UUID;
    first_sale_id UUID;
    first_rental_id UUID;
    sales_agree_count INT;
    lease_agree_count INT;
BEGIN
    SELECT count(*)::int INTO sales_agree_count FROM public.sales_agreements;
    SELECT count(*)::int INTO lease_agree_count FROM public.lease_agreements;
    IF sales_agree_count > 0 AND lease_agree_count > 0 THEN
        RETURN;
    END IF;

    SELECT id INTO owner_id FROM public.users_profile LIMIT 1;
    IF owner_id IS NULL THEN
        RETURN;
    END IF;

    IF sales_agree_count = 0 THEN
        SELECT id INTO first_sale_id FROM public.property_sales ORDER BY created_at LIMIT 1;
        IF first_sale_id IS NOT NULL THEN
            INSERT INTO public.sales_agreements (
                seller_id, buyer_name, property_id, contract_number,
                purchase_price, down_payment, terms_and_conditions, created_at
            ) VALUES (
                owner_id, '虛擬買家', first_sale_id, 'SEED-S-' || replace(gen_random_uuid()::text, '-', '')::text,
                25000000, 5000000, '種子資料合約條款', NOW()
            );
            RAISE NOTICE 'Superadmin dashboard seed: added 1 sales_agreement.';
        END IF;
    END IF;

    IF lease_agree_count = 0 THEN
        SELECT id INTO first_rental_id FROM public.property_rentals ORDER BY created_at LIMIT 1;
        IF first_rental_id IS NOT NULL THEN
            INSERT INTO public.lease_agreements (
                landlord_id, tenant_id, property_id, contract_number,
                start_date, end_date, monthly_rent, deposit_amount, payment_due_day, terms_and_conditions, created_at, updated_at
            ) VALUES (
                owner_id, owner_id, first_rental_id, 'SEED-L-' || replace(gen_random_uuid()::text, '-', '')::text,
                CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months', 35000, 70000, 5, '種子資料租賃條款', NOW(), NOW()
            );
            RAISE NOTICE 'Superadmin dashboard seed: added 1 lease_agreement.';
        END IF;
    END IF;
END $$;
