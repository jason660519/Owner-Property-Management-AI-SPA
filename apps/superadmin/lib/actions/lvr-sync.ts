
'use server';

import { forceFetchLvrData, resolveCityName, LvrAutoFetchResult } from '@/lib/utils/lvr-open-data';
import { createAdminClient } from '@/utils/supabase/admin';

export type LvrSyncResult = {
  success: boolean;
  message: string;
  data?: LvrAutoFetchResult;
};

/**
 * 手動觸發特定縣市的實價登錄資料更新
 */
export async function syncLvrDataAction(cityName: string): Promise<LvrSyncResult> {
  try {
    const resolved = resolveCityName(cityName);
    const result = await forceFetchLvrData(resolved);
    
    return {
      success: result.fetched,
      message: result.message,
      data: result,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : '同步過程中發生未知錯誤',
    };
  }
}

export type LvrStatItem = {
  count: number;
  lastUpdated: string | null;
};

/**
 * 取得目前資料庫中各縣市的資料筆數統計與最後更新日
 */
export async function getLvrStatsAction() {
  const adminClient = createAdminClient();
  
  // 取得所有縣市清單 (直接從 Open Data 定義中取得)
  const TAIWAN_CITIES = [
    '臺北市', '新北市', '桃園市', '臺中市', '臺南市', '高雄市',
    '基隆市', '新竹市', '嘉義市', '新竹縣', '苗栗縣', '彰化縣',
    '南投縣', '雲林縣', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣',
    '臺東縣', '澎湖縣', '金門縣', '連江縣'
  ];

  // 並行查詢每個縣市的正確筆數與最後更新日 (created_at)
  const results = await Promise.all(
    TAIWAN_CITIES.map(async (city) => {
      // 查詢總數
      const countRes = await adminClient
        .from('lvr_land_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('city', city);
      
      // 查詢該縣市最新一筆資料的匯入時間 (created_at)
      const lastUpdateRes = await adminClient
        .from('lvr_land_transactions')
        .select('created_at')
        .eq('city', city)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      return { 
        city, 
        count: countRes.count || 0, 
        lastUpdated: lastUpdateRes.data?.created_at || null,
        error: countRes.error 
      };
    })
  );

  const stats: Record<string, LvrStatItem> = {};
  for (const r of results) {
    if (r.error) {
      console.error(`[LVR Stats] Failed to count ${r.city}:`, r.error.message);
      continue;
    }
    if (r.count > 0) {
      stats[r.city] = {
        count: r.count,
        lastUpdated: r.lastUpdated,
      };
    }
  }

  return { success: true, stats };
}
