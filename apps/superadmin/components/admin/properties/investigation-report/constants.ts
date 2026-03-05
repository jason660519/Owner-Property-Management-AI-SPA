// filepath: apps/superadmin/components/admin/properties/investigation-report/constants.ts
// 物件調查報告書 — 下拉選項 + 預設注意事項 (from Excel 秘書-注意事項)

export const CURRENT_CONDITIONS = ['空屋', '出租中', '自住', '營業中', '其他'] as const;

export const ORIENTATIONS = [
  '座北朝南', '座南朝北', '座東朝西', '座西朝東',
  '座東北朝西南', '座西南朝東北', '座東南朝西北', '座西北朝東南',
] as const;

export const MAIN_MATERIALS = [
  '鋼筋混凝土', '鋼骨鋼筋混凝土', '鋼骨造', '加強磚造',
  '磚造', '木造', '其他',
] as const;

export const GAS_TYPES = [
  '天然瓦斯', '桶裝瓦斯', '無瓦斯,用電', '其他',
] as const;

export const SECURITY_OPTIONS = [
  '24HR', '白天', '夜間', '管委會管理', '無',
] as const;

export const PARKING_METHODS = [
  '坡道平面', '坡道機械', '升降平面', '升降機械',
  '塔式車位', '一樓平面', '無',
] as const;

export const PARKING_USAGE = [
  '自用', '法定停車位', '增設停車位', '獎勵停車位', '無',
] as const;

/** 預設注意事項 — column B (主要) from 秘書-注意事項 */
export interface PredefinedNote {
  id: string;
  text: string;
  category: 'main' | 'extra';
}

export const PREDEFINED_NOTES: PredefinedNote[] = [
  // ── 主要注意事項 (column B) ──
  {
    id: 'main_01',
    category: 'main',
    text: '樓高六層以上之集合住宅亦屬公眾使用建築物,其中任一樓層室內裝修前均應依「建築法」及「建築物室內裝修管理辦法」有關規定申請審查,並經取得許可文件後始得施工。',
  },
  {
    id: 'main_02',
    category: 'main',
    text: '主建物面積>112平方公尺,不能辦理國宅貸款。',
  },
  {
    id: 'main_03',
    category: 'main',
    text: '本物件建築完成日期係依建築物謄本標示部第一次登記日期為準。',
  },
  {
    id: 'main_04',
    category: 'main',
    text: '本物件頂樓、陽台、天井、平台外推之增建物為未經合法建管程序建築之使用範圍,係屬違建。',
  },
  {
    id: 'main_05',
    category: 'main',
    text: '主建物面積是否含當層電樓梯間,須比對建築物測量成果圖及實際現況方能確定。',
  },
  {
    id: 'main_06',
    category: 'main',
    text: '建物各項面積合計係依地政機關登記簿謄本登載的面積平方公尺換算為坪所得。(1平方公尺=0.3025坪)，小數點第三位四捨五入取二位。',
  },
  {
    id: 'main_07',
    category: 'main',
    text: '本物件成交後辦理產權移轉手續時，若有委託人未提供之土地地號，但地政機關查到所有權人持有同為建築基地之其他筆土地須併同移轉之情形時，委託人應無條件配合辦理。',
  },
  {
    id: 'main_08',
    category: 'main',
    text: '建物登記用途請以地政機關辦法為準。',
  },
  // ── 額外注意事項 (column E) ──
  {
    id: 'extra_01',
    category: 'extra',
    text: '本物件謄本登記之主要用途為空白,使用執照登記為集合住宅,本說明書依使用執照為登錄依據。',
  },
  {
    id: 'extra_02',
    category: 'extra',
    text: '本物件法定空地之增建物為未經合法建管程序建築之使用範圍，係屬違建，其是否占用鄰地或公共設施用地需辦理土地鑑界方能確定。',
  },
  {
    id: 'extra_03',
    category: 'extra',
    text: '本物件現況夾層係屬非合法夾層,簽約前須與金融機構確認貸款條件。',
  },
  {
    id: 'extra_04',
    category: 'extra',
    text: '本物件經上網查詢台北市政府工務局網站本標的曾被列為違建查報案件。',
  },
  {
    id: 'extra_05',
    category: 'extra',
    text: '本物件謄本登記之主要用途與建物測量成果圖及使用執照登記者不符，本不動產說明書以謄本為登錄依據，若須申請優惠購屋貸款，收定前須先確認。',
  },
  {
    id: 'extra_06',
    category: 'extra',
    text: '本案為土地或二十年以上屋齡之透天厝,買方如欲新建或改建,建議於收訂前徵詢專業建築師之意見;另買方若欲確認土地界址,建議買賣雙方可於過戶前辦理土地鑑界方能確定。',
  },
  {
    id: 'extra_07',
    category: 'extra',
    text: '本物件陽台外移、頂樓加蓋之增建物為未經合法建管程序建築之使用範圍，係屬違建。',
  },
  {
    id: 'extra_08',
    category: 'extra',
    text: '本建物因建物謄本未登記建築完成日期,在此以使用執照之發照日期登錄,實際建築完成日期可能在此之前。',
  },
];

/** 標準買賣雙方義務條款 (注意事項 一～七) */
export const STANDARD_CLAUSES = [
  {
    number: '一',
    text: '買賣雙方就本標的物買賣事宜,已確知以下事項,並知悉其權利義務。',
  },
  {
    number: '二',
    text: '買方若欲辦理優惠性貸款（公教、國宅、勞工、首購等）其應具備之資格及條件，由買方自行負責，若因金融機關提供之優惠貸款額度不足時，買方同意依一般利率完成貸款交屋手續。',
  },
  {
    number: '三',
    text: '買方就承購本標的物若欲供營業用途時，請自行確認是否能辦理公司營業登記等相關事宜。住商不動產不保證買方一定可以辦理工商登記。',
  },
  {
    number: '四',
    text: '增建部份（含頂樓、露台、夾層、一樓空地、平台、一樓圍牆、天井、防火巷、陽台外推、上下樓層打通之內梯等），無所有權，不保證過去沒有被通知拆除或未來不會被拆除及可永久使用，買方已知悉增建所在位置及其權利、義務。',
  },
  {
    number: '五',
    text: '本案若有頂樓、一樓前後院空地增建者，買方願依原住戶間協議或使用習慣承受。',
  },
  {
    number: '六',
    text: '本案買方並未承購停車位者，買方同意依原住戶間協議或大樓管委會規定及住戶規約來使用持分共有地下室、停車空間。',
  },
  {
    number: '七',
    text: '依稅法規定，「先賣後買」或「先買後賣」符合條件者，得向稅捐機關辦理增值稅重購退稅。買賣方如欲辦理退稅時，應自行洽詢稅捐機關以確認資格是否相符，住商不動產不保證一定可以辦理重購退稅。',
  },
];
