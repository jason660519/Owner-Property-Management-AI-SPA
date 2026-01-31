// 測試 Supabase 連接
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
    console.log('🔍 開始測試 Supabase 連接...\n');

    // 1. 測試資料庫連接
    console.log('1️⃣ 測試資料庫連接...');
    try {
        const { data, error } = await supabase.from('properties').select('count');
        if (error) {
            console.log('❌ 資料庫連接失敗:', error.message);
        } else {
            console.log('✅ 資料庫連接成功！');
            console.log('   properties 表格存在並可訪問');
        }
    } catch (err) {
        console.log('❌ 資料庫連接異常:', err.message);
    }

    // 2. 測試認證服務
    console.log('\n2️⃣ 測試認證服務...');
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.log('⚠️  認證服務異常:', error.message);
        } else {
            console.log('✅ 認證服務正常運行');
            console.log('   當前會話:', data.session ? '已登入' : '未登入');
        }
    } catch (err) {
        console.log('❌ 認證服務異常:', err.message);
    }

    // 3. 測試 Storage 服務
    console.log('\n3️⃣ 測試 Storage 服務...');
    try {
        const { data, error } = await supabase.storage.listBuckets();
        if (error) {
            console.log('⚠️  Storage 服務異常:', error.message);
        } else {
            console.log('✅ Storage 服務正常運行');
            console.log('   可用的 buckets:', data.map(b => b.name).join(', ') || '(無)');
        }
    } catch (err) {
        console.log('❌ Storage 服務異常:', err.message);
    }

    // 4. 檢查資料表結構
    console.log('\n4️⃣ 檢查資料表結構...');
    try {
        const { data, error } = await supabase.from('properties').select('*').limit(1);
        if (error) {
            console.log('❌ 無法查詢 properties 表:', error.message);
        } else {
            console.log('✅ properties 表結構正常');
            if (data && data.length > 0) {
                console.log('   表格欄位:', Object.keys(data[0]).join(', '));
            } else {
                console.log('   表格目前為空');
            }
        }
    } catch (err) {
        console.log('❌ 查詢異常:', err.message);
    }

    console.log('\n✨ 測試完成！\n');
}

testConnection().catch(console.error);
