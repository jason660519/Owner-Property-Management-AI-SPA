-- Seed Featured Properties
-- Date: 2026-02-05
-- Description: Creates 6 sample properties (3 sales, 3 rentals) for featured section

-- First, ensure we have a test user to own these properties
-- This uses the user email: a0405142777@gmail.com
-- The user should already exist from signup

DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get the user ID for a0405142777@gmail.com
    -- If user doesn't exist, this will be handled by the application
    SELECT id INTO test_user_id
    FROM auth.users
    WHERE email = 'a0405142777@gmail.com'
    LIMIT 1;

    -- Only proceed if user exists
    IF test_user_id IS NOT NULL THEN
        -- Delete existing test properties if any
        DELETE FROM public.property_sales WHERE owner_id = test_user_id;
        DELETE FROM public.property_rentals WHERE owner_id = test_user_id;

        -- Insert 3 Sales Properties
        INSERT INTO public.property_sales (id, owner_id, address, price, status, details, created_at) VALUES
        (
            gen_random_uuid(),
            test_user_id,
            '台北市信義區信義路五段7號',
            25000000,
            'available',
            jsonb_build_object(
                'title', '信義區現代都會公寓',
                'description', '位於台北市中心的精品公寓，擁有絕佳視野與完善生活機能。寬敞的客廳採用落地窗設計，採光充足。開放式廚房配備頂級 Miele 家電，包含烤箱、洗碗機與電磁爐。主臥室附設獨立更衣室與景觀浴室。大樓設有健身房、游泳池、空中花園與 24 小時保全管理。',
                'bedrooms', 3,
                'bathrooms', 2,
                'area', 35,
                'type', '公寓',
                'imageUrl', '/images/property-1.jpg',
                'images', jsonb_build_array('/images/property-1.jpg')
            ),
            NOW() - INTERVAL '2 days'
        ),
        (
            gen_random_uuid(),
            test_user_id,
            '新北市新店區華城路100號',
            48000000,
            'available',
            jsonb_build_object(
                'title', '新店悠然獨棟別墅',
                'description', '鄰近碧潭風景區的獨棟別墅，享受寧靜的山居生活。獨立 4 房 3 衛設計，每房皆有對外窗，通風採光極佳。客廳挑高 6 米搭配大面積採光天窗，氣派非凡。室內設計採用進口實木地板與溫暖木質調，營造放鬆氛圍。戶外擁有私人庭院與車庫，可停放 2 輛車。適合喜愛大自然與重視家庭隱私的買家。',
                'bedrooms', 4,
                'bathrooms', 3,
                'area', 85,
                'type', '別墅',
                'imageUrl', '/images/property-2.jpg',
                'images', jsonb_build_array('/images/property-2.jpg')
            ),
            NOW() - INTERVAL '5 days'
        ),
        (
            gen_random_uuid(),
            test_user_id,
            '台北市大安區敦化南路二段',
            38000000,
            'available',
            jsonb_build_object(
                'title', '大安區精品豪宅',
                'description', '位於台北東區核心地段的精品豪宅，步行 3 分鐘即達捷運信義安和站。全棟僅 12 戶，一層兩戶設計確保隱私。室內採用義大利進口大理石地板與德國精品衛浴設備。智慧家庭系統可遠端控制燈光、窗簾與空調。附專屬車位兩個與儲藏室。管理費包含 24 小時禮賓服務與每週清潔服務。',
                'bedrooms', 4,
                'bathrooms', 3,
                'area', 60,
                'type', '豪宅',
                'imageUrl', '/images/property-4.jpg',
                'images', jsonb_build_array('/images/property-4.jpg')
            ),
            NOW() - INTERVAL '1 day'
        );

        -- Insert 3 Rental Properties
        INSERT INTO public.property_rentals (id, owner_id, address, monthly_rent, status, lease_term, details, created_at) VALUES
        (
            gen_random_uuid(),
            test_user_id,
            '新北市淡水區中正東路50號',
            35000,
            'vacant',
            12,
            jsonb_build_object(
                'title', '淡水河岸海景套房',
                'description', '面海而居的高級套房，每天醒來都能擁抱淡水河與觀音山美景。位於淡水老街附近，步行 5 分鐘即達捷運淡水站。室內 15 坪精緻空間，配備獨立衛浴與開放式廚房。擁有景觀陽台可欣賞著名的淡水夕陽。室內裝潢採用現代簡約風格，並配備 LG 智慧家電。適合單身或新婚小家庭。',
                'bedrooms', 2,
                'bathrooms', 1,
                'area', 15,
                'type', '套房',
                'imageUrl', '/images/property-3.jpg',
                'images', jsonb_build_array('/images/property-3.jpg')
            ),
            NOW() - INTERVAL '3 days'
        ),
        (
            gen_random_uuid(),
            test_user_id,
            '台北市中山區民生東路三段',
            45000,
            'vacant',
            12,
            jsonb_build_object(
                'title', '中山區溫馨兩房公寓',
                'description', '位於民生社區的溫馨兩房公寓，周邊生活機能完善。鄰近多所明星學校，適合有學齡兒童的家庭。公寓內採光良好，南北通風。客廳與餐廳分離設計，空間利用極佳。廚房配備完整廚具與抽油煙機。樓下即有全聯超市與傳統市場，採買便利。附近公園綠地多，環境清幽。',
                'bedrooms', 2,
                'bathrooms', 1,
                'area', 25,
                'type', '公寓',
                'imageUrl', '/images/property-5.jpg',
                'images', jsonb_build_array('/images/property-5.jpg')
            ),
            NOW() - INTERVAL '4 days'
        ),
        (
            gen_random_uuid(),
            test_user_id,
            '台北市內湖區成功路四段',
            55000,
            'vacant',
            12,
            jsonb_build_object(
                'title', '內湖科學園區三房華廈',
                'description', '鄰近內湖科學園區的優質三房華廈，適合科技業上班族。步行至捷運文德站僅需 8 分鐘，通勤便利。室內 30 坪，三房兩廳兩衛格局方正，無浪費空間。主臥室附設衛浴與更衣空間。客廳落地窗面向中庭花園，景觀優美。廚房採用系統廚具與 Rinnai 瓦斯爐。大樓設施包含健身房、閱覽室與會議室。管理嚴謹，居住品質優良。',
                'bedrooms', 3,
                'bathrooms', 2,
                'area', 30,
                'type', '華廈',
                'imageUrl', '/images/property-6.jpg',
                'images', jsonb_build_array('/images/property-6.jpg')
            ),
            NOW() - INTERVAL '6 days'
        );

        RAISE NOTICE '✅ Successfully created 6 featured properties for user: %', test_user_id;
    ELSE
        RAISE NOTICE '⚠️  User a0405142777@gmail.com not found. Please sign up first.';
    END IF;
END $$;
