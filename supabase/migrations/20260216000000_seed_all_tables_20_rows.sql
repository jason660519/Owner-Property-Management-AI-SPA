-- ==============================================================================
-- Seed: 為所有 Table 產生至少 20 筆測試資料
-- Date: 2026-02-16
-- Description: 確保每個主要資料表都有至少 20 筆資料，便於開發與測試
--              Idempotent: 僅在資料不足時補足
-- ==============================================================================

DO $$
DECLARE
    owner_id UUID;
    user_ids UUID[];
    sales_ids UUID[];
    rental_ids UUID[];
    building_ids UUID[];
    vendor_ids UUID[];
    mr_ids UUID[];
    blog_ids UUID[];
    lease_ids UUID[];
    rl_ids UUID[];
    i INT;
    cnt INT;
    target_count INT := 20;
BEGIN
    -- 取得或建立 owner
    SELECT id INTO owner_id FROM public.users_profile LIMIT 1;
    IF owner_id IS NULL THEN
        SELECT id INTO owner_id FROM auth.users LIMIT 1;
    END IF;
    IF owner_id IS NULL THEN
        RAISE NOTICE 'Seed: 無可用用戶，跳過種子資料';
        RETURN;
    END IF;

    -- 確保 owner 在 Standard Landlords 群組（取得 landlord 角色）
    INSERT INTO public.iam_group_members (group_id, user_id)
    SELECT g.id, owner_id FROM public.iam_groups g WHERE g.name = 'Standard Landlords'
    ON CONFLICT (group_id, user_id) DO NOTHING;

    -- 收集可用的 user_ids (至少要有 owner)
    SELECT array_agg(id) INTO user_ids FROM (
        SELECT id FROM public.users_profile ORDER BY created_at LIMIT 5
    ) t;
    IF user_ids IS NULL OR array_length(user_ids, 1) IS NULL THEN
        user_ids := ARRAY[owner_id];
    END IF;

    -- ========== 1. buildings_communities ==========
    SELECT count(*)::int INTO cnt FROM public.buildings_communities;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.buildings_communities (name, address, city, district, postal_code, total_floors, total_units, year_built, building_type, amenities)
            VALUES (
                '社區大樓_' || (cnt + i),
                '台北市信義區信義路' || (100 + i) || '號',
                '台北市',
                '信義區',
                '11000' || lpad((i % 10)::text, 1, '0'),
                15 + (i % 10),
                50 + (i * 2),
                2010 + (i % 15),
                CASE (i % 3) WHEN 0 THEN 'apartment' WHEN 1 THEN 'condo' ELSE 'townhouse' END,
                ARRAY['gym', 'pool', 'parking', 'security']
            );
        END LOOP;
        RAISE NOTICE 'buildings_communities: 已補足至 20+ 筆';
    END IF;

    -- ========== 2. property_sales ==========
    SELECT count(*)::int INTO cnt FROM public.property_sales;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.property_sales (owner_id, address, price, status, details)
            VALUES (
                owner_id,
                '台北市大安區敦化南路' || (100 + i) || '號',
                15000000 + (i * 1000000),
                CASE (i % 4) WHEN 0 THEN 'available' WHEN 1 THEN 'pending' WHEN 2 THEN 'sold' ELSE 'archived' END,
                jsonb_build_object('坪數', 25 + i, '屋齡', 5 + (i % 20))
            );
        END LOOP;
        RAISE NOTICE 'property_sales: 已補足至 20+ 筆';
    END IF;

    -- ========== 3. property_rentals ==========
    SELECT count(*)::int INTO cnt FROM public.property_rentals;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.property_rentals (owner_id, address, monthly_rent, status, lease_term, details)
            VALUES (
                owner_id,
                '新北市板橋區文化路' || (50 + i) || '號',
                20000 + (i * 1500),
                CASE (i % 4) WHEN 0 THEN 'vacant' WHEN 1 THEN 'occupied' WHEN 2 THEN 'maintenance' ELSE 'archived' END,
                12,
                jsonb_build_object('坪數', 20 + i)
            );
        END LOOP;
        RAISE NOTICE 'property_rentals: 已補足至 20+ 筆';
    END IF;

    -- 收集 property IDs
    SELECT array_agg(id) INTO sales_ids FROM (SELECT id FROM public.property_sales LIMIT 25) t;
    SELECT array_agg(id) INTO rental_ids FROM (SELECT id FROM public.property_rentals LIMIT 25) t;
    SELECT array_agg(id) INTO building_ids FROM (SELECT id FROM public.buildings_communities LIMIT 25) t;

    -- ========== 4. property_photos ==========
    IF sales_ids IS NOT NULL AND array_length(sales_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.property_photos;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.property_photos (property_id, storage_path, is_primary, photo_type)
                VALUES (
                    sales_ids[1 + ((i - 1) % array_length(sales_ids, 1))],
                    'properties/' || (i) || '/photo_' || i || '.jpg',
                    (i = 1),
                    CASE (i % 3) WHEN 0 THEN 'interior' WHEN 1 THEN 'exterior' ELSE 'amenity' END
                );
            END LOOP;
            RAISE NOTICE 'property_photos: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 5. maintenance_vendors ==========
    SELECT count(*)::int INTO cnt FROM public.maintenance_vendors;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.maintenance_vendors (vendor_name, contact_person, phone, specialties, service_areas, rating)
            VALUES (
                '維修廠商_' || i,
                '聯絡人_' || i,
                '09' || lpad((10000000 + i)::text, 8, '0'),
                ARRAY['plumbing', 'electrical', 'hvac'],
                ARRAY['台北市', '新北市'],
                4.0 + (i % 10)::numeric / 10
            );
        END LOOP;
        RAISE NOTICE 'maintenance_vendors: 已補足至 20+ 筆';
    END IF;

    SELECT array_agg(id) INTO vendor_ids FROM (SELECT id FROM public.maintenance_vendors LIMIT 25) t;

    -- ========== 6. glossary_terms (Glossary_Terms) ==========
    BEGIN
        SELECT count(*)::int INTO cnt FROM public.glossary_terms;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.glossary_terms (term_zh, term_en, description)
                VALUES (
                    '術語_' || i,
                    'Term_' || i,
                    '術語 ' || i || ' 的說明描述'
                );
            END LOOP;
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    -- ========== 7. agent_directory ==========
    SELECT count(*)::int INTO cnt FROM public.agent_directory;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.agent_directory (landlord_id, agent_name, company_name, phone_number, email, rating)
            VALUES (
                owner_id,
                '仲介_' || i,
                '房仲公司_' || (1 + (i % 5)),
                '09' || lpad((20000000 + i)::text, 8, '0'),
                'agent' || i || '@example.com',
                4.0 + (i % 10)::numeric / 10
            );
        END LOOP;
        RAISE NOTICE 'agent_directory: 已補足至 20+ 筆';
    END IF;

    -- ========== 8. blog_posts ==========
    SELECT count(*)::int INTO cnt FROM public.blog_posts;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.blog_posts (author_id, title, slug, content, status, tags)
            VALUES (
                owner_id,
                '房地產部落格文章 ' || i,
                'blog-post-' || i,
                '這是第 ' || i || ' 篇部落格文章的完整內容。包含房地產相關知識與市場分析。',
                CASE (i % 3) WHEN 0 THEN 'draft' WHEN 1 THEN 'published' ELSE 'archived' END,
                ARRAY['房地產', '市場分析', '投資']
            );
        END LOOP;
        RAISE NOTICE 'blog_posts: 已補足至 20+ 筆';
    END IF;

    -- ========== 9. leads_tenants ==========
    SELECT count(*)::int INTO cnt FROM public.leads_tenants;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.leads_tenants (landlord_id, name, email, phone, budget_min, budget_max, lead_status)
            VALUES (
                owner_id,
                '潛在租客_' || i,
                'tenant' || i || '@example.com',
                '09' || lpad((30000000 + i)::text, 8, '0'),
                15000 + (i * 500),
                25000 + (i * 500),
                CASE (i % 4) WHEN 0 THEN 'new' WHEN 1 THEN 'contacted' WHEN 2 THEN 'viewing_scheduled' ELSE 'converted' END
            );
        END LOOP;
        RAISE NOTICE 'leads_tenants: 已補足至 20+ 筆';
    END IF;

    -- ========== 10. leads_buyers ==========
    SELECT count(*)::int INTO cnt FROM public.leads_buyers;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.leads_buyers (landlord_id, name, email, phone, budget_min, budget_max, lead_status)
            VALUES (
                owner_id,
                '潛在買家_' || i,
                'buyer' || i || '@example.com',
                '09' || lpad((40000000 + i)::text, 8, '0'),
                10000000 + (i * 500000),
                20000000 + (i * 500000),
                CASE (i % 4) WHEN 0 THEN 'new' WHEN 1 THEN 'contacted' WHEN 2 THEN 'viewing_scheduled' ELSE 'converted' END
            );
        END LOOP;
        RAISE NOTICE 'leads_buyers: 已補足至 20+ 筆';
    END IF;

    -- ========== 11. bank_accounts ==========
    SELECT count(*)::int INTO cnt FROM public.bank_accounts;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.bank_accounts (landlord_id, account_name, bank_name, account_number)
            VALUES (
                owner_id,
                '銀行帳戶_' || i,
                CASE (i % 5) WHEN 0 THEN '台灣銀行' WHEN 1 THEN '玉山銀行' WHEN 2 THEN '國泰世華' WHEN 3 THEN '富邦銀行' ELSE '中信銀行' END,
                lpad((1234567890 + i)::text, 14, '0')
            );
        END LOOP;
        RAISE NOTICE 'bank_accounts: 已補足至 20+ 筆';
    END IF;

    -- ========== 12. rental_ledger ==========
    IF rental_ids IS NOT NULL AND array_length(rental_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.rental_ledger;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.rental_ledger (property_id, transaction_date, transaction_type, amount, created_by)
                VALUES (
                    rental_ids[1 + ((i - 1) % array_length(rental_ids, 1))],
                    CURRENT_DATE - (i * 7),
                    CASE (i % 4) WHEN 0 THEN 'rent_income' WHEN 1 THEN 'deposit' WHEN 2 THEN 'utility' ELSE 'maintenance' END,
                    20000 + (i * 500),
                    owner_id
                );
            END LOOP;
            RAISE NOTICE 'rental_ledger: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 13. sales_ledger ==========
    IF sales_ids IS NOT NULL AND array_length(sales_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.sales_ledger;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.sales_ledger (property_id, transaction_date, transaction_type, amount, created_by)
                VALUES (
                    sales_ids[1 + ((i - 1) % array_length(sales_ids, 1))],
                    CURRENT_DATE - (i * 10),
                    CASE (i % 4) WHEN 0 THEN 'down_payment' WHEN 1 THEN 'installment' WHEN 2 THEN 'tax' ELSE 'commission' END,
                    500000 + (i * 10000),
                    owner_id
                );
            END LOOP;
            RAISE NOTICE 'sales_ledger: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 14. maintenance_requests ==========
    IF rental_ids IS NOT NULL AND array_length(rental_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.maintenance_requests;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.maintenance_requests (property_id, requested_by, category, title, description, status)
                VALUES (
                    rental_ids[1 + ((i - 1) % array_length(rental_ids, 1))],
                    owner_id,
                    CASE (i % 4) WHEN 0 THEN 'plumbing' WHEN 1 THEN 'electrical' WHEN 2 THEN 'hvac' ELSE 'appliance' END,
                    '維修請求_' || i,
                    '第 ' || i || ' 項維修需求描述',
                    CASE (i % 4) WHEN 0 THEN 'open' WHEN 1 THEN 'in_progress' WHEN 2 THEN 'completed' ELSE 'cancelled' END
                );
            END LOOP;
            RAISE NOTICE 'maintenance_requests: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 15. property_inventory ==========
    IF rental_ids IS NOT NULL AND array_length(rental_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.property_inventory;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.property_inventory (property_id, category, item_name, condition, quantity)
                VALUES (
                    rental_ids[1 + ((i - 1) % array_length(rental_ids, 1))],
                    CASE (i % 4) WHEN 0 THEN 'furniture' WHEN 1 THEN 'appliance' WHEN 2 THEN 'fixture' ELSE 'electronics' END,
                    '物件_' || i,
                    CASE (i % 3) WHEN 0 THEN 'new' WHEN 1 THEN 'good' ELSE 'fair' END,
                    1
                );
            END LOOP;
            RAISE NOTICE 'property_inventory: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 16. tenant_inquiries ==========
    IF rental_ids IS NOT NULL AND array_length(rental_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.tenant_inquiries;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.tenant_inquiries (property_id, landlord_id, inquirer_name, inquirer_email, message, status)
                VALUES (
                    rental_ids[1 + ((i - 1) % array_length(rental_ids, 1))],
                    owner_id,
                    '詢價者_' || i,
                    'inquirer' || i || '@example.com',
                    '我想了解這間房子的詳細資訊，第 ' || i || ' 則留言',
                    CASE (i % 3) WHEN 0 THEN 'new' WHEN 1 THEN 'replied' ELSE 'closed' END
                );
            END LOOP;
            RAISE NOTICE 'tenant_inquiries: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 17. buyer_inquiries ==========
    IF sales_ids IS NOT NULL AND array_length(sales_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.buyer_inquiries;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.buyer_inquiries (property_id, landlord_id, inquirer_name, inquirer_email, message, status)
                VALUES (
                    sales_ids[1 + ((i - 1) % array_length(sales_ids, 1))],
                    owner_id,
                    '買方諮詢_' || i,
                    'buyer_inq' || i || '@example.com',
                    '請問這間房是否可議價？第 ' || i || ' 則諮詢',
                    CASE (i % 3) WHEN 0 THEN 'new' WHEN 1 THEN 'replied' ELSE 'closed' END
                );
            END LOOP;
            RAISE NOTICE 'buyer_inquiries: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 18. viewing_appointments_tenant ==========
    IF rental_ids IS NOT NULL AND array_length(rental_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.viewing_appointments_tenant;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.viewing_appointments_tenant (property_id, landlord_id, visitor_name, visitor_phone, preferred_date, preferred_time, status)
                VALUES (
                    rental_ids[1 + ((i - 1) % array_length(rental_ids, 1))],
                    owner_id,
                    '看房者_' || i,
                    '09' || lpad((50000000 + i)::text, 8, '0'),
                    CURRENT_DATE + (i % 30),
                    make_time(9 + (i % 8), 0, 0),
                    CASE (i % 4) WHEN 0 THEN 'pending' WHEN 1 THEN 'confirmed' WHEN 2 THEN 'completed' ELSE 'cancelled' END
                );
            END LOOP;
            RAISE NOTICE 'viewing_appointments_tenant: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 19. viewing_appointments_buyer ==========
    IF sales_ids IS NOT NULL AND array_length(sales_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.viewing_appointments_buyer;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.viewing_appointments_buyer (property_id, landlord_id, visitor_name, visitor_phone, preferred_date, preferred_time, status)
                VALUES (
                    sales_ids[1 + ((i - 1) % array_length(sales_ids, 1))],
                    owner_id,
                    '買方看房_' || i,
                    '09' || lpad((60000000 + i)::text, 8, '0'),
                    CURRENT_DATE + (i % 30),
                    make_time(10 + (i % 6), 0, 0),
                    CASE (i % 4) WHEN 0 THEN 'pending' WHEN 1 THEN 'confirmed' WHEN 2 THEN 'completed' ELSE 'cancelled' END
                );
            END LOOP;
            RAISE NOTICE 'viewing_appointments_buyer: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 20. lease_agreements ==========
    IF rental_ids IS NOT NULL AND array_length(rental_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.lease_agreements;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.lease_agreements (landlord_id, tenant_id, property_id, contract_number, start_date, end_date, monthly_rent, deposit_amount, payment_due_day, terms_and_conditions)
                VALUES (
                    owner_id,
                    owner_id,
                    rental_ids[1 + ((i - 1) % array_length(rental_ids, 1))],
                    'LEASE-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(i::text, 4, '0'),
                    CURRENT_DATE - (i * 30),
                    CURRENT_DATE + ((12 - i) * 30),
                    20000 + (i * 500),
                    40000 + (i * 1000),
                    5,
                    '租賃條款內容 ' || i
                );
            END LOOP;
            RAISE NOTICE 'lease_agreements: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 21. sales_agreements ==========
    IF sales_ids IS NOT NULL AND array_length(sales_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.sales_agreements;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.sales_agreements (seller_id, buyer_name, property_id, contract_number, purchase_price, down_payment, terms_and_conditions)
                VALUES (
                    owner_id,
                    '買家_' || i,
                    sales_ids[1 + ((i - 1) % array_length(sales_ids, 1))],
                    'SALE-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(i::text, 4, '0'),
                    15000000 + (i * 500000),
                    3000000 + (i * 100000),
                    '買賣合約條款 ' || i
                );
            END LOOP;
            RAISE NOTICE 'sales_agreements: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 22. service_providers ==========
    SELECT count(*)::int INTO cnt FROM public.service_providers;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.service_providers (provider_type, company_name, phone, specializations, rating)
            VALUES (
                CASE (i % 4) WHEN 0 THEN 'maintenance' WHEN 1 THEN 'legal' WHEN 2 THEN 'insurance' ELSE 'inspection' END,
                '服務商_' || i,
                '02-2500' || lpad((1000 + i)::text, 4, '0'),
                ARRAY['specialty_' || i],
                4.0 + (i % 10)::numeric / 10
            );
        END LOOP;
        RAISE NOTICE 'service_providers: 已補足至 20+ 筆';
    END IF;

    -- ========== 23. escrow_legal_services (schema: name, contact_info from full_schema) ==========
    SELECT count(*)::int INTO cnt FROM public.escrow_legal_services;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.escrow_legal_services (name, contact_info)
            VALUES (
                '代書事務所_' || i,
                jsonb_build_object('phone', '02-2700' || lpad((1000 + i)::text, 4, '0'), 'email', 'escrow' || i || '@example.com')
            );
        END LOOP;
        RAISE NOTICE 'escrow_legal_services: 已補足至 20+ 筆';
    END IF;

    -- ========== 24. insurance_plans ==========
    SELECT count(*)::int INTO cnt FROM public.insurance_plans;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.insurance_plans (plan_name, insurance_company, coverage_type, coverage_amount, premium_monthly)
            VALUES (
                '保險方案_' || i,
                CASE (i % 4) WHEN 0 THEN '富邦產險' WHEN 1 THEN '國泰產險' WHEN 2 THEN '新光產險' ELSE '南山產險' END,
                CASE (i % 3) WHEN 0 THEN 'property' WHEN 1 THEN 'liability' ELSE 'contents' END,
                1000000 * (i + 1),
                500 + (i * 50)
            );
        END LOOP;
        RAISE NOTICE 'insurance_plans: 已補足至 20+ 筆';
    END IF;

    -- ========== 25. interior_designers (schema: name, contact_info from full_schema) ==========
    SELECT count(*)::int INTO cnt FROM public.interior_designers;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.interior_designers (name, contact_info)
            VALUES (
                '設計師_' || i,
                jsonb_build_object('company', '設計公司_' || (1 + (i % 5)), 'phone', '02-2600' || lpad((1000 + i)::text, 4, '0'))
            );
        END LOOP;
        RAISE NOTICE 'interior_designers: 已補足至 20+ 筆';
    END IF;

    -- ========== 26. nearby_facilities ==========
    IF (rental_ids IS NOT NULL AND array_length(rental_ids, 1) > 0) OR (building_ids IS NOT NULL AND array_length(building_ids, 1) > 0) THEN
        SELECT count(*)::int INTO cnt FROM public.nearby_facilities;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                IF building_ids IS NOT NULL AND array_length(building_ids, 1) > 0 THEN
                    INSERT INTO public.nearby_facilities (building_community_id, facility_type, name, distance_meters, walking_time_minutes)
                    VALUES (
                        building_ids[1 + ((i - 1) % array_length(building_ids, 1))],
                        CASE (i % 4) WHEN 0 THEN 'school' WHEN 1 THEN 'hospital' WHEN 2 THEN 'shopping' ELSE 'transport' END,
                        '設施_' || i,
                        200 + (i * 50),
                        5 + (i % 15)
                    );
                ELSE
                    INSERT INTO public.nearby_facilities (property_id, facility_type, name, distance_meters, walking_time_minutes)
                    VALUES (
                        rental_ids[1 + ((i - 1) % array_length(rental_ids, 1))],
                        CASE (i % 4) WHEN 0 THEN 'school' WHEN 1 THEN 'hospital' WHEN 2 THEN 'shopping' ELSE 'transport' END,
                        '設施_' || i,
                        200 + (i * 50),
                        5 + (i % 15)
                    );
                END IF;
            END LOOP;
            RAISE NOTICE 'nearby_facilities: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 27. system_notifications ==========
    SELECT count(*)::int INTO cnt FROM public.system_notifications;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.system_notifications (user_id, title, message, is_read)
            VALUES (
                owner_id,
                '通知標題_' || i,
                '這是第 ' || i || ' 則系統通知內容',
                (i % 3) = 0
            );
        END LOOP;
        RAISE NOTICE 'system_notifications: 已補足至 20+ 筆';
    END IF;

    -- ========== 28. notification_queue ==========
    SELECT count(*)::int INTO cnt FROM public.notification_queue;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.notification_queue (user_id, notification_type, title, message, status)
            VALUES (
                owner_id,
                CASE (i % 4) WHEN 0 THEN 'email' WHEN 1 THEN 'sms' WHEN 2 THEN 'push' ELSE 'in_app' END,
                '通知_' || i,
                '通知訊息 ' || i,
                CASE (i % 3) WHEN 0 THEN 'pending' WHEN 1 THEN 'sent' ELSE 'failed' END
            );
        END LOOP;
        RAISE NOTICE 'notification_queue: 已補足至 20+ 筆';
    END IF;

    -- ========== 29. calendar_events ==========
    SELECT count(*)::int INTO cnt FROM public.calendar_events;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.calendar_events (user_id, title, start_time, end_time, event_type, status)
            VALUES (
                owner_id,
                '行事曆事件_' || i,
                now() + (i || ' days')::interval,
                now() + (i || ' days')::interval + interval '1 hour',
                CASE (i % 4) WHEN 0 THEN 'viewing' WHEN 1 THEN 'maintenance' WHEN 2 THEN 'meeting' ELSE 'personal' END,
                'scheduled'
            );
        END LOOP;
        RAISE NOTICE 'calendar_events: 已補足至 20+ 筆';
    END IF;

    -- ========== 30. todo_tasks ==========
    SELECT count(*)::int INTO cnt FROM public.todo_tasks;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.todo_tasks (user_id, title, description, status, priority)
            VALUES (
                owner_id,
                '待辦_' || i,
                '待辦事項描述 ' || i,
                CASE (i % 4) WHEN 0 THEN 'pending' WHEN 1 THEN 'in_progress' WHEN 2 THEN 'completed' ELSE 'cancelled' END,
                CASE (i % 3) WHEN 0 THEN 'low' WHEN 1 THEN 'medium' ELSE 'high' END
            );
        END LOOP;
        RAISE NOTICE 'todo_tasks: 已補足至 20+ 筆';
    END IF;

    -- ========== 31. tax_reports (UNIQUE: landlord_id, report_year, report_type) ==========
    SELECT count(*)::int INTO cnt FROM public.tax_reports;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.tax_reports (landlord_id, report_year, report_type, total_income, total_expenses)
            VALUES (
                owner_id,
                2015 + ((i - 1) / 3),
                CASE ((i - 1) % 3) WHEN 0 THEN 'rental_income' WHEN 1 THEN 'property_tax' ELSE 'capital_gains' END,
                500000 + (i * 10000),
                100000 + (i * 5000)
            )
            ON CONFLICT (landlord_id, report_year, report_type) DO NOTHING;
        END LOOP;
        RAISE NOTICE 'tax_reports: 已補足至 20+ 筆';
    END IF;

    -- ========== 32. contact_messages ==========
    BEGIN
        SELECT count(*)::int INTO cnt FROM public.contact_messages;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.contact_messages (name, email, inquiry_type, message, status)
                VALUES (
                    '聯絡人_' || i,
                    'contact' || i || '@example.com',
                    CASE (i % 4) WHEN 0 THEN 'general' WHEN 1 THEN 'viewing' WHEN 2 THEN 'pricing' ELSE 'availability' END,
                    '訊息內容 ' || i,
                    CASE (i % 4) WHEN 0 THEN 'new' WHEN 1 THEN 'read' WHEN 2 THEN 'replied' ELSE 'archived' END
                );
            END LOOP;
            RAISE NOTICE 'contact_messages: 已補足至 20+ 筆';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    -- ========== 33. logs ==========
    BEGIN
        SELECT count(*)::int INTO cnt FROM public.logs;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.logs (user_id, level, message, metadata)
                VALUES (
                    'seed',
                    CASE (i % 4) WHEN 0 THEN 'info' WHEN 1 THEN 'warn' WHEN 2 THEN 'error' ELSE 'debug' END,
                    'Log message ' || i,
                    jsonb_build_object('source', 'seed', 'index', i)
                );
            END LOOP;
            RAISE NOTICE 'logs: 已補足至 20+ 筆';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    -- 收集額外 IDs（用於 FK）
    SELECT array_agg(id) INTO mr_ids FROM (SELECT id FROM public.maintenance_requests LIMIT 25) t;
    SELECT array_agg(id) INTO blog_ids FROM (SELECT id FROM public.blog_posts LIMIT 25) t;
    SELECT array_agg(id) INTO lease_ids FROM (SELECT id FROM public.lease_agreements LIMIT 25) t;
    SELECT array_agg(id) INTO rl_ids FROM (SELECT id FROM public.rental_ledger LIMIT 25) t;

    -- ========== 34. user_sessions ==========
    SELECT count(*)::int INTO cnt FROM public.user_sessions;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.user_sessions (user_id, session_token, expires_at)
            VALUES (owner_id, 'seed-session-' || md5(random()::text || i::text), NOW() + interval '7 days');
        END LOOP;
        RAISE NOTICE 'user_sessions: 已補足至 20+ 筆';
    END IF;

    -- ========== 35. messages ==========
    SELECT count(*)::int INTO cnt FROM public.messages;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.messages (from_user_id, to_user_id, content, subject)
            VALUES (owner_id, owner_id, '訊息內容 ' || i, '主旨_' || i);
        END LOOP;
        RAISE NOTICE 'messages: 已補足至 20+ 筆';
    END IF;

    -- ========== 36. email_threads ==========
    SELECT count(*)::int INTO cnt FROM public.email_threads;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.email_threads (user_id, subject, participants, last_message_at)
            VALUES (owner_id, '郵件主題_' || i, ARRAY['user' || i || '@example.com'], NOW() - (i || ' days')::interval);
        END LOOP;
        RAISE NOTICE 'email_threads: 已補足至 20+ 筆';
    END IF;

    -- ========== 37. notification_preferences (1 per user) ==========
    INSERT INTO public.notification_preferences (user_id) VALUES (owner_id) ON CONFLICT (user_id) DO NOTHING;

    -- ========== 38. document_uploads ==========
    SELECT count(*)::int INTO cnt FROM public.document_uploads;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.document_uploads (user_id, document_type, file_name, original_file_name, file_path, file_size_bytes, mime_type)
            VALUES (owner_id, CASE (i % 4) WHEN 0 THEN 'contract' WHEN 1 THEN 'id' WHEN 2 THEN 'bank_statement' ELSE 'title_deed' END, 'doc_' || i || '.pdf', 'document_' || i || '.pdf', 'uploads/doc_' || i || '.pdf', 1024 * (i + 1), 'application/pdf');
        END LOOP;
        RAISE NOTICE 'document_uploads: 已補足至 20+ 筆';
    END IF;

    -- ========== 39. theme_settings (1 per user) ==========
    INSERT INTO public.theme_settings (user_id) VALUES (owner_id) ON CONFLICT (user_id) DO NOTHING;

    -- ========== 40. building_title_records ==========
    IF building_ids IS NOT NULL AND array_length(building_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.building_title_records;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.building_title_records (building_community_id, title_number, owner_name, building_address)
                VALUES (building_ids[1 + ((i - 1) % array_length(building_ids, 1))], 'TITLE-' || (10000 + cnt + i), '屋主_' || i, '台北市信義區信義路' || (200 + i) || '號')
                ON CONFLICT (title_number) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'building_title_records: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 41. rent_receipts ==========
    IF rl_ids IS NOT NULL AND array_length(rl_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.rent_receipts;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.rent_receipts (rental_ledger_id, receipt_number, issue_date, landlord_id, tenant_id, property_id, period_from, period_to, amount)
                VALUES (rl_ids[1 + ((i - 1) % array_length(rl_ids, 1))], 'RR-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((cnt + i)::text, 4, '0'), CURRENT_DATE - (i * 30), owner_id, owner_id, rental_ids[1 + ((i - 1) % array_length(rental_ids, 1))], CURRENT_DATE - (i * 30), CURRENT_DATE - ((i - 1) * 30), 20000)
                ON CONFLICT (receipt_number) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'rent_receipts: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 42. property_status_history ==========
    IF rental_ids IS NOT NULL AND array_length(rental_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.property_status_history;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.property_status_history (property_id, old_status, new_status, status_category, changed_by)
                VALUES (rental_ids[1 + ((i - 1) % array_length(rental_ids, 1))], 'vacant', 'occupied', 'occupancy', owner_id);
            END LOOP;
            RAISE NOTICE 'property_status_history: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 43. property_type_change_logs ==========
    IF rental_ids IS NOT NULL AND array_length(rental_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.property_type_change_logs;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.property_type_change_logs (property_id, old_type, new_type, effective_date, changed_by)
                VALUES (rental_ids[1 + ((i - 1) % array_length(rental_ids, 1))], 'for_rent', 'for_sale', CURRENT_DATE - i, owner_id);
            END LOOP;
            RAISE NOTICE 'property_type_change_logs: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 44. media_gallery ==========
    SELECT count(*)::int INTO cnt FROM public.media_gallery;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.media_gallery (owner_id, file_name, file_type, mime_type, file_path)
            VALUES (owner_id, 'media_' || i || '.jpg', 'image', 'image/jpeg', 'gallery/media_' || i || '.jpg');
        END LOOP;
        RAISE NOTICE 'media_gallery: 已補足至 20+ 筆';
    END IF;

    -- ========== 45. panorama_images ==========
    IF rental_ids IS NOT NULL AND array_length(rental_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.panorama_images;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.panorama_images (property_id, room_name, panorama_url, uploaded_by)
                VALUES (rental_ids[1 + ((i - 1) % array_length(rental_ids, 1))], CASE (i % 4) WHEN 0 THEN 'living_room' WHEN 1 THEN 'bedroom_1' WHEN 2 THEN 'kitchen' ELSE 'bathroom' END, 'https://example.com/pano_' || i || '.jpg', owner_id);
            END LOOP;
            RAISE NOTICE 'panorama_images: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 46. ocr_parsing_logs ==========
    SELECT count(*)::int INTO cnt FROM public.ocr_parsing_logs;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.ocr_parsing_logs (document_type, file_path, file_name, ocr_engine, status)
            VALUES (CASE (i % 3) WHEN 0 THEN 'building_title' WHEN 1 THEN 'land_title' ELSE 'contract' END, '/documents/doc_' || i || '.pdf', 'doc_' || i || '.pdf', 'tesseract', CASE (i % 3) WHEN 0 THEN 'completed' WHEN 1 THEN 'processing' ELSE 'pending' END);
        END LOOP;
        RAISE NOTICE 'ocr_parsing_logs: 已補足至 20+ 筆';
    END IF;

    -- ========== 47. blog_analytics ==========
    IF blog_ids IS NOT NULL AND array_length(blog_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.blog_analytics;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.blog_analytics (blog_post_id, metric_date, views, unique_visitors)
                VALUES (blog_ids[1 + ((i - 1) % array_length(blog_ids, 1))], CURRENT_DATE - i, 100 + (i * 10), 50 + (i * 5))
                ON CONFLICT (blog_post_id, metric_date) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'blog_analytics: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 48. property_faqs ==========
    IF rental_ids IS NOT NULL AND array_length(rental_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.property_faqs;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.property_faqs (property_id, question, answer, created_by)
                VALUES (rental_ids[1 + ((i - 1) % array_length(rental_ids, 1))], '常見問題 ' || i, '解答內容 ' || i, owner_id);
            END LOOP;
            RAISE NOTICE 'property_faqs: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 49. comfyui_styles ==========
    SELECT count(*)::int INTO cnt FROM public.comfyui_styles;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.comfyui_styles (name, style_type, workflow_json, created_by)
            VALUES ('風格_' || i, CASE (i % 3) WHEN 0 THEN 'interior' WHEN 1 THEN 'exterior' ELSE 'virtual_staging' END, '{}'::jsonb, owner_id);
        END LOOP;
        RAISE NOTICE 'comfyui_styles: 已補足至 20+ 筆';
    END IF;

    -- ========== 50. contracted_tenants ==========
    IF rental_ids IS NOT NULL AND array_length(rental_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.contracted_tenants;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.contracted_tenants (landlord_id, tenant_id, property_id, move_in_date, lease_end_date, monthly_rent, status)
                VALUES (owner_id, owner_id, rental_ids[1 + ((i - 1) % array_length(rental_ids, 1))], CURRENT_DATE - (i * 30), CURRENT_DATE + ((12 - i) * 30), 20000 + (i * 500), 'active');
            END LOOP;
            RAISE NOTICE 'contracted_tenants: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 51. contracted_buyers ==========
    IF sales_ids IS NOT NULL AND array_length(sales_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.contracted_buyers;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.contracted_buyers (landlord_id, buyer_name, property_id, purchase_price, status)
                VALUES (owner_id, '成交買家_' || i, sales_ids[1 + ((i - 1) % array_length(sales_ids, 1))], 15000000 + (i * 500000), 'in_process');
            END LOOP;
            RAISE NOTICE 'contracted_buyers: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 52. deposit_receipts ==========
    IF lease_ids IS NOT NULL AND array_length(lease_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.deposit_receipts;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.deposit_receipts (lease_agreement_id, landlord_id, tenant_id, receipt_number, amount, payment_date)
                VALUES (lease_ids[1 + ((i - 1) % array_length(lease_ids, 1))], owner_id, owner_id, 'DEP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((cnt + i)::text, 4, '0'), 40000 + (i * 1000), CURRENT_DATE - (i * 7))
                ON CONFLICT (receipt_number) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'deposit_receipts: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 53. earnest_money_receipts ==========
    IF sales_ids IS NOT NULL AND array_length(sales_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.earnest_money_receipts;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.earnest_money_receipts (property_id, buyer_name, receipt_number, amount, payment_date)
                VALUES (sales_ids[1 + ((i - 1) % array_length(sales_ids, 1))], '斡旋買家_' || i, 'ERN-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((cnt + i)::text, 4, '0'), 500000 + (i * 10000), CURRENT_DATE - (i * 5))
                ON CONFLICT (receipt_number) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'earnest_money_receipts: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 54. maintenance_quotes ==========
    IF mr_ids IS NOT NULL AND vendor_ids IS NOT NULL AND array_length(mr_ids, 1) > 0 AND array_length(vendor_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.maintenance_quotes;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.maintenance_quotes (maintenance_request_id, vendor_id, quote_amount, quote_details, status)
                VALUES (mr_ids[1 + ((i - 1) % array_length(mr_ids, 1))], vendor_ids[1 + ((i - 1) % array_length(vendor_ids, 1))], 3000 + (i * 500), '報價明細 ' || i, CASE (i % 3) WHEN 0 THEN 'pending' WHEN 1 THEN 'accepted' ELSE 'rejected' END);
            END LOOP;
            RAISE NOTICE 'maintenance_quotes: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 55. user_favorites ==========
    IF sales_ids IS NOT NULL AND array_length(sales_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.user_favorites;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.user_favorites (user_id, entity_type, entity_id)
                VALUES (owner_id, 'property', sales_ids[1 + ((i - 1) % array_length(sales_ids, 1))])
                ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'user_favorites: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 56. property_comparisons ==========
    IF sales_ids IS NOT NULL AND array_length(sales_ids, 1) >= 2 THEN
        SELECT count(*)::int INTO cnt FROM public.property_comparisons;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.property_comparisons (user_id, property_ids)
                VALUES (owner_id, ARRAY[sales_ids[1], sales_ids[1 + (i % (array_length(sales_ids, 1) - 1))]]);
            END LOOP;
            RAISE NOTICE 'property_comparisons: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 57. user_reviews ==========
    IF sales_ids IS NOT NULL AND array_length(sales_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.user_reviews;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.user_reviews (reviewer_id, entity_type, entity_id, rating, review_text)
                VALUES (owner_id, 'property', sales_ids[1 + ((i - 1) % array_length(sales_ids, 1))], 3 + (i % 3), '評論內容 ' || i);
            END LOOP;
            RAISE NOTICE 'user_reviews: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 58. vlm_parsing_logs ==========
    SELECT count(*)::int INTO cnt FROM public.vlm_parsing_logs;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.vlm_parsing_logs (image_url, vlm_model, prompt_text, extracted_data, status)
            VALUES ('https://example.com/img_' || i || '.jpg', 'gpt-4-vision', '解析此圖片', '{}'::jsonb, 'completed');
        END LOOP;
        RAISE NOTICE 'vlm_parsing_logs: 已補足至 20+ 筆';
    END IF;

    -- ========== 59. property_documents ==========
    IF sales_ids IS NOT NULL AND array_length(sales_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.property_documents;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.property_documents (property_id, property_type, owner_id, document_type, document_name, file_path, uploaded_by)
                VALUES (sales_ids[1 + ((i - 1) % array_length(sales_ids, 1))], 'sales', owner_id, CASE (i % 3) WHEN 0 THEN 'building_title' WHEN 1 THEN 'lease_contract' ELSE 'sales_contract' END, '文件_' || i, 'docs/doc_' || i || '.pdf', owner_id);
            END LOOP;
            RAISE NOTICE 'property_documents: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 60. payment_transactions ==========
    SELECT count(*)::int INTO cnt FROM public.payment_transactions;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.payment_transactions (user_id, transaction_type, amount, payment_method, status)
            VALUES (owner_id, CASE (i % 5) WHEN 0 THEN 'rent_payment' WHEN 1 THEN 'deposit_payment' WHEN 2 THEN 'utility_payment' WHEN 3 THEN 'commission' ELSE 'other' END, 20000 + (i * 500), 'bank_transfer', CASE (i % 3) WHEN 0 THEN 'pending' WHEN 1 THEN 'completed' ELSE 'processing' END);
        END LOOP;
        RAISE NOTICE 'payment_transactions: 已補足至 20+ 筆';
    END IF;

    -- ========== 61. invoice_records ==========
    SELECT count(*)::int INTO cnt FROM public.invoice_records;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.invoice_records (invoice_number, landlord_id, tenant_id, invoice_type, subtotal, tax_amount, total_amount, buyer_name, seller_name, seller_tax_id, line_items)
            VALUES ('INV-SEED-' || (cnt + i), owner_id, owner_id, CASE (i % 3) WHEN 0 THEN 'rent' WHEN 1 THEN 'sale' ELSE 'service' END, 20000 * i, 1000 * i, 21000 * i, '買方_' || i, '賣方_' || i, '00000000', '[{"description":"租金","quantity":1,"unit_price":20000,"amount":20000}]'::jsonb);
        END LOOP;
        RAISE NOTICE 'invoice_records: 已補足至 20+ 筆';
    END IF;

    -- ========== 62. user_activity_logs ==========
    SELECT count(*)::int INTO cnt FROM public.user_activity_logs;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.user_activity_logs (user_id, activity_type, resource_type, activity_description)
            VALUES (owner_id, CASE (i % 4) WHEN 0 THEN 'view' WHEN 1 THEN 'create' WHEN 2 THEN 'update' ELSE 'delete' END, CASE (i % 3) WHEN 0 THEN 'property' WHEN 1 THEN 'document' ELSE 'message' END, '活動描述 ' || i);
        END LOOP;
        RAISE NOTICE 'user_activity_logs: 已補足至 20+ 筆';
    END IF;

    -- ========== 63. user_feedback ==========
    SELECT count(*)::int INTO cnt FROM public.user_feedback;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.user_feedback (user_id, feedback_type, subject, description, status)
            VALUES (owner_id, CASE (i % 4) WHEN 0 THEN 'bug_report' WHEN 1 THEN 'feature_request' WHEN 2 THEN 'general_feedback' ELSE 'complaint' END, '回饋主旨_' || i, '回饋內容 ' || i, CASE (i % 4) WHEN 0 THEN 'new' WHEN 1 THEN 'under_review' WHEN 2 THEN 'resolved' ELSE 'closed' END);
        END LOOP;
        RAISE NOTICE 'user_feedback: 已補足至 20+ 筆';
    END IF;

    -- ========== 64. virtual_phone_numbers ==========
    SELECT count(*)::int INTO cnt FROM public.virtual_phone_numbers;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.virtual_phone_numbers (user_id, phone_number, country_code, provider)
            VALUES (owner_id, '02-2500' || lpad((1000 + i)::text, 4, '0'), '+886', 'twilio');
        END LOOP;
        RAISE NOTICE 'virtual_phone_numbers: 已補足至 20+ 筆';
    END IF;

    -- ========== 65. call_logs ==========
    SELECT count(*)::int INTO cnt FROM public.call_logs;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.call_logs (from_number, to_number, direction, call_status, started_at, user_id)
            VALUES ('0912345' || lpad((100 + i)::text, 3, '0'), '022500' || lpad((1000 + i)::text, 4, '0'), CASE (i % 2) WHEN 0 THEN 'inbound' ELSE 'outbound' END, 'completed', NOW() - (i || ' hours')::interval, owner_id);
        END LOOP;
        RAISE NOTICE 'call_logs: 已補足至 20+ 筆';
    END IF;

    -- ========== 66. ai_conversations ==========
    SELECT count(*)::int INTO cnt FROM public.ai_conversations;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.ai_conversations (user_id, session_id, conversation_type, ai_model, messages)
            VALUES (owner_id, gen_random_uuid(), CASE (i % 3) WHEN 0 THEN 'voice' WHEN 1 THEN 'text' ELSE 'chat' END, 'gpt-4', jsonb_build_array(jsonb_build_object('role', 'user', 'content', '訊息' || i)));
        END LOOP;
        RAISE NOTICE 'ai_conversations: 已補足至 20+ 筆';
    END IF;

    -- ========== 67. form_drafts ==========
    SELECT count(*)::int INTO cnt FROM public.form_drafts;
    IF cnt < target_count THEN
        FOR i IN 1..(target_count - cnt) LOOP
            INSERT INTO public.form_drafts (user_id, form_key, name, data)
            VALUES (owner_id, 'property_add_' || i, '草稿_' || i, jsonb_build_object('step', 1, 'data', '{}'));
        END LOOP;
        RAISE NOTICE 'form_drafts: 已補足至 20+ 筆';
    END IF;

    -- ========== 68. landlord_customers ==========
    BEGIN
        SELECT count(*)::int INTO cnt FROM public.landlord_customers;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.landlord_customers (landlord_id, name, email, phone)
                VALUES (owner_id, '客戶_' || i, 'customer' || i || '@example.com', '09' || lpad((70000000 + i)::text, 8, '0'));
            END LOOP;
            RAISE NOTICE 'landlord_customers: 已補足至 20+ 筆';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    -- ========== 69. digital_signatures ==========
    IF lease_ids IS NOT NULL AND array_length(lease_ids, 1) > 0 THEN
        SELECT count(*)::int INTO cnt FROM public.digital_signatures;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.digital_signatures (document_type, document_id, signer_id, signature_data)
                VALUES ('lease_agreement', lease_ids[1 + ((i - 1) % array_length(lease_ids, 1))], owner_id, 'base64_signature_data_' || i);
            END LOOP;
            RAISE NOTICE 'digital_signatures: 已補足至 20+ 筆';
        END IF;
    END IF;

    -- ========== 70-90. 其餘未填表格 ==========
    BEGIN
        SELECT count(*)::int INTO cnt FROM public.upload_progress;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.upload_progress (user_id, file_name, file_size_bytes, upload_status) VALUES (owner_id, 'upload_' || i || '.pdf', 1024 * i, 'completed');
            END LOOP;
            RAISE NOTICE 'upload_progress: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.media_processing_queue;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.media_processing_queue (user_id, source_file_path, processing_type, processing_status) VALUES (owner_id, '/uploads/img_' || i || '.jpg', 'resize', 'completed');
            END LOOP;
            RAISE NOTICE 'media_processing_queue: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.social_auth_connections;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.social_auth_connections (user_id, provider, provider_user_id) VALUES (owner_id, CASE (i % 4) WHEN 0 THEN 'google' WHEN 1 THEN 'facebook' WHEN 2 THEN 'line' ELSE 'apple' END, 'provider_' || i || '_' || owner_id::text) ON CONFLICT (provider, provider_user_id) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'social_auth_connections: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.draft_autosave;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.draft_autosave (user_id, draft_type, draft_key, content) VALUES (owner_id, 'property_listing', 'draft_' || i, jsonb_build_object('data', 'content_' || i)) ON CONFLICT (user_id, draft_type, draft_key) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'draft_autosave: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        INSERT INTO public.landlord_call_preferences (landlord_id, available_days, available_time_from, available_time_to) VALUES (owner_id, ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'], '09:00'::time, '18:00'::time) ON CONFLICT (landlord_id) DO NOTHING;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.users_track_history;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.users_track_history (user_id, event_type, event_name) VALUES (owner_id, CASE (i % 4) WHEN 0 THEN 'login' WHEN 1 THEN 'page_view' WHEN 2 THEN 'action' ELSE 'logout' END, 'event_' || i);
            END LOOP;
            RAISE NOTICE 'users_track_history: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.tax_rates;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.tax_rates (country_code, tax_type, rate_percentage, effective_from) VALUES ('TW', CASE (i % 4) WHEN 0 THEN 'income' WHEN 1 THEN 'property' WHEN 2 THEN 'sales' ELSE 'vat' END, 5.0 + (i % 10), '2020-01-01'::date + (i || ' months')::interval) ON CONFLICT (country_code, region_code, tax_type, effective_from) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'tax_rates: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.webhook_configs;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.webhook_configs (name, url, method, event_triggers) VALUES ('webhook_' || i, 'https://example.com/webhook/' || i, 'POST', ARRAY['property.created', 'user.registered']);
            END LOOP;
            RAISE NOTICE 'webhook_configs: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.elasticsearch_indices;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.elasticsearch_indices (index_name, index_type, mapping_schema) VALUES ('idx_' || i, CASE (i % 3) WHEN 0 THEN 'properties' WHEN 1 THEN 'users' ELSE 'blog_posts' END, '{}'::jsonb) ON CONFLICT (index_name) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'elasticsearch_indices: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.perf_metrics;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.perf_metrics (metric_type, metric_name, value, unit) VALUES ('api_response_time', 'metric_' || i, 100 + i, 'ms');
            END LOOP;
            RAISE NOTICE 'perf_metrics: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.recommendation_logs;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.recommendation_logs (user_id, recommendation_type, algorithm_used, input_data, recommendations) VALUES (owner_id, 'property', 'content_based', '{}'::jsonb, jsonb_build_array(jsonb_build_object('id', i, 'score', 0.9)));
            END LOOP;
            RAISE NOTICE 'recommendation_logs: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.unit_conversion_logs;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.unit_conversion_logs (conversion_type, from_unit, to_unit, from_value, to_value, conversion_rate, user_id) VALUES ('area', 'ping', 'sqm', 10 * i, 33 * i, 3.3, owner_id);
            END LOOP;
            RAISE NOTICE 'unit_conversion_logs: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.version_history;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.version_history (version_number, release_date, release_type, changelog) VALUES ('1.' || i || '.0', '2024-01-01'::date + (i || ' months')::interval, CASE (i % 4) WHEN 0 THEN 'major' WHEN 1 THEN 'minor' WHEN 2 THEN 'patch' ELSE 'hotfix' END, '{"added":[],"fixed":[],"changed":[],"removed":[]}'::jsonb) ON CONFLICT (version_number) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'version_history: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.roles;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.roles (name, display_name, description) VALUES ('role_' || i, '角色_' || i, '描述_' || i) ON CONFLICT (name) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'roles: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.permissions;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.permissions (code, module) VALUES ('perm.' || i, CASE (i % 4) WHEN 0 THEN 'users' WHEN 1 THEN 'properties' WHEN 2 THEN 'finance' ELSE 'system' END) ON CONFLICT (code) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'permissions: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.platform_settings;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.platform_settings (key, value) VALUES ('setting_' || i, '{}'::jsonb) ON CONFLICT (key) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'platform_settings: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.llm_configs;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.llm_configs (model_name, provider) VALUES ('model_' || i, CASE (i % 3) WHEN 0 THEN 'openai' WHEN 1 THEN 'anthropic' ELSE 'google' END);
            END LOOP;
            RAISE NOTICE 'llm_configs: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.seo_configs;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.seo_configs (page_route, title, meta_description) VALUES ('/page-' || i, 'Page ' || i, 'Meta ' || i) ON CONFLICT (page_route) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'seo_configs: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.notification_templates;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.notification_templates (code, channel, body_content) VALUES ('template_' || i, CASE (i % 4) WHEN 0 THEN 'email' WHEN 1 THEN 'sms' WHEN 2 THEN 'push' ELSE 'in_app' END, 'Body ' || i) ON CONFLICT (code) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'notification_templates: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        INSERT INTO public.currencies (code, name, symbol) VALUES ('TWD', '新台幣', 'NT$'), ('USD', '美金', '$'), ('JPY', '日圓', '¥'), ('EUR', '歐元', '€'), ('CNY', '人民幣', '¥') ON CONFLICT (code) DO NOTHING;
        SELECT count(*)::int INTO cnt FROM public.currencies;
        IF cnt < 20 THEN
            FOR i IN 6..20 LOOP
                INSERT INTO public.currencies (code, name, symbol) VALUES ('CCY' || i, '幣別_' || i, '#' || i) ON CONFLICT (code) DO NOTHING;
            END LOOP;
        END IF;
        RAISE NOTICE 'currencies: 已補足';
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.exchange_rates;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.exchange_rates (from_currency, to_currency, rate) VALUES ('TWD', 'USD', 0.032 + (i * 0.001));
            END LOOP;
            RAISE NOTICE 'exchange_rates: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table OR foreign_key_violation THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.i18n_glossary;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.i18n_glossary (key, lang_code, value) VALUES ('key_' || i, 'zh-TW', '值_' || i) ON CONFLICT (key, lang_code) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'i18n_glossary: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        INSERT INTO public.regions_settings (country_code, currency_code) VALUES ('TW', 'TWD'), ('US', 'USD'), ('JP', 'JPY') ON CONFLICT (country_code) DO NOTHING;
        FOR i IN 1..17 LOOP
            INSERT INTO public.regions_settings (country_code, currency_code) VALUES ('R' || i, 'TWD') ON CONFLICT (country_code) DO NOTHING;
        END LOOP;
        RAISE NOTICE 'regions_settings: 已補足';
    EXCEPTION WHEN undefined_table OR foreign_key_violation THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.whitelist_blacklist;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.whitelist_blacklist (type, list_type, value) VALUES (CASE (i % 3) WHEN 0 THEN 'ip' WHEN 1 THEN 'email_domain' ELSE 'user_id' END, CASE (i % 2) WHEN 0 THEN 'white' ELSE 'black' END, 'value_' || i);
            END LOOP;
            RAISE NOTICE 'whitelist_blacklist: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.rate_limit_configs;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.rate_limit_configs (route_pattern, max_requests, window_seconds) VALUES ('/api/' || i, 100 + i, 60);
            END LOOP;
            RAISE NOTICE 'rate_limit_configs: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.audit_logs;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.audit_logs (user_id, action, resource_table) VALUES (owner_id, 'action_' || i, 'table_' || i);
            END LOOP;
            RAISE NOTICE 'audit_logs: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.api_call_logs;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.api_call_logs (endpoint, method, status_code, duration_ms) VALUES ('/api/endpoint/' || i, 'GET', 200, 50 + i);
            END LOOP;
            RAISE NOTICE 'api_call_logs: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.error_logs;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.error_logs (source, level, message) VALUES (CASE (i % 3) WHEN 0 THEN 'frontend' WHEN 1 THEN 'backend' ELSE 'worker' END, 'error', 'Error ' || i);
            END LOOP;
            RAISE NOTICE 'error_logs: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.system_maintenance_logs;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.system_maintenance_logs (task_name, status, started_at) VALUES ('task_' || i, CASE (i % 3) WHEN 0 THEN 'success' WHEN 1 THEN 'failed' ELSE 'running' END, NOW() - (i || ' hours')::interval);
            END LOOP;
            RAISE NOTICE 'system_maintenance_logs: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.backup_restore_logs;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.backup_restore_logs (backup_type, file_path, status) VALUES (CASE (i % 2) WHEN 0 THEN 'full' ELSE 'incremental' END, '/backups/bak_' || i, 'completed');
            END LOOP;
            RAISE NOTICE 'backup_restore_logs: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.cloud_resources_monitoring;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.cloud_resources_monitoring (resource_type, metric_name, value) VALUES (CASE (i % 3) WHEN 0 THEN 'database' WHEN 1 THEN 'storage' ELSE 'function' END, 'metric_' || i, 50 + i);
            END LOOP;
            RAISE NOTICE 'cloud_resources_monitoring: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.ai_performance_metrics;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.ai_performance_metrics (model_id, prompt_tokens, completion_tokens, latency_ms) VALUES ('model_' || i, 100 * i, 50 * i, 200 + i);
            END LOOP;
            RAISE NOTICE 'ai_performance_metrics: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.web_analytics;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.web_analytics (page_path, visitor_id) VALUES ('/page/' || i, 'visitor_' || i);
            END LOOP;
            RAISE NOTICE 'web_analytics: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.ai_api_keys;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.ai_api_keys (user_id, provider, api_key_encrypted, iv, is_active) VALUES (owner_id, CASE (i % 5) WHEN 0 THEN 'openai' WHEN 1 THEN 'anthropic' WHEN 2 THEN 'gemini' WHEN 3 THEN 'deepseek' ELSE 'grok' END, 'enc_' || i, 'iv_' || i, (i <= 5));
            END LOOP;
            RAISE NOTICE 'ai_api_keys: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.ai_model_selections;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.ai_model_selections (user_id, provider, model_id, model_name) VALUES (owner_id, CASE (i % 5) WHEN 0 THEN 'openai' WHEN 1 THEN 'anthropic' WHEN 2 THEN 'gemini' WHEN 3 THEN 'deepseek' ELSE 'grok' END, 'model_' || i, 'Model ' || i);
            END LOOP;
            RAISE NOTICE 'ai_model_selections: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.ai_feature_modules;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.ai_feature_modules (user_id, module_key, is_enabled) VALUES (owner_id, CASE (i % 6) WHEN 0 THEN 'online_ocr' WHEN 1 THEN 'local_ocr' WHEN 2 THEN 'web_assistant' WHEN 3 THEN 'contract_assistant' WHEN 4 THEN 'blog_generator' ELSE 'ad_generator' END, (i % 2) = 0) ON CONFLICT (user_id, module_key) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'ai_feature_modules: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.ai_system_prompts;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.ai_system_prompts (user_id, module_key, provider, prompt_content) VALUES (owner_id, 'module_' || (i % 6), 'openai', 'Prompt ' || i);
            END LOOP;
            RAISE NOTICE 'ai_system_prompts: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.ai_usage_logs;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.ai_usage_logs (user_id, provider, model_id, tokens_input, tokens_output) VALUES (owner_id, 'openai', 'gpt-4', 100 * i, 50 * i);
            END LOOP;
            RAISE NOTICE 'ai_usage_logs: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.user_invitations;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.user_invitations (email, token, status, expires_at) VALUES ('invite' || i || '@example.com', 'token_' || md5(random()::text || i::text), 'pending', NOW() + interval '7 days') ON CONFLICT (token) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'user_invitations: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.user_vlm_credentials;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.user_vlm_credentials (user_id, provider, api_key_ciphertext, nonce, salt, is_active) VALUES (owner_id, CASE (i % 3) WHEN 0 THEN 'anthropic_claude' WHEN 1 THEN 'openai_gpt4v' ELSE 'google_gemini' END, decode(md5('key' || i), 'hex'), decode(md5('nonce' || i), 'hex'), decode(md5('salt' || i), 'hex'), (i > 3));
            END LOOP;
            RAISE NOTICE 'user_vlm_credentials: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table OR unique_violation THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.transfer_tokens;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.transfer_tokens (token, user_id, expires_at) VALUES ('tr_' || md5(random()::text || i::text), owner_id, NOW() + interval '1 hour') ON CONFLICT (token) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'transfer_tokens: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.agent_authorizations;
        IF cnt < 1 THEN
            INSERT INTO public.agent_authorizations (landlord_id, agent_id, valid_from, permissions) VALUES (owner_id, owner_id, NOW(), jsonb_build_object('can_view_properties', true, 'can_manage_leads', true)) ON CONFLICT (landlord_id, agent_id) DO NOTHING;
            RAISE NOTICE 'agent_authorizations: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table OR OTHERS THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.email_verifications;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.email_verifications (email, verification_token, status) VALUES ('verify' || i || '@example.com', 'vt_' || md5(random()::text || i::text), 'pending') ON CONFLICT (verification_token) DO NOTHING;
            END LOOP;
            RAISE NOTICE 'email_verifications: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        SELECT count(*)::int INTO cnt FROM public.identity_verification_records;
        IF cnt < target_count THEN
            FOR i IN 1..(target_count - cnt) LOOP
                INSERT INTO public.identity_verification_records (user_id, verification_type, full_name, status) VALUES (owner_id, 'id_card', '用戶_' || i, CASE WHEN i = 1 THEN 'approved' WHEN (i % 2) = 0 THEN 'pending' ELSE 'rejected' END);
            END LOOP;
            RAISE NOTICE 'identity_verification_records: 已補足';
        END IF;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seed 完成！全部表格已補足至至少 20 筆';
    RAISE NOTICE '========================================';
END $$;
