// 屋況說明書欄位（與 PropertyConditionStatement 鍵名一致；不依賴 types 以避免循環引用）
export const CONDITION_STATEMENT_META = [
  {
    key: 'structureInterior',
    title: '建物及室內外裝修現況',
    hint: '例如：牆面、地坪、天花板、門窗、衛浴廚具等現況；是否為空屋或出租中等。',
  },
  {
    key: 'waterLeakage',
    title: '漏水、滲水或壁癌情形',
    hint: '例如：無／曾修繕／特定位置雨季滲水等（依實際看屋及賣方說明填寫）。',
  },
  {
    key: 'pests',
    title: '白蟻、蟲鼠或其他公害',
    hint: '例如：無／曾施作防治／社區定期消毒等。',
  },
  {
    key: 'unregisteredParts',
    title: '增建、違建或未登記部分',
    hint: '例如：陽台外推、頂加、雨遮等是否與謄本或使用執照一致；有無使用協議。',
  },
  {
    key: 'neighborsSpecial',
    title: '鄰地、鄰房或特殊使用關係',
    hint: '例如：防火巷使用、採光、噪音、管線經過等。',
  },
  {
    key: 'equipmentFacilities',
    title: '固定設備與附屬設施現況',
    hint: '例如：冷氣、熱水器、機械車位、儲藏室等是否正常；管理辦法摘要。',
  },
  {
    key: 'otherRemarks',
    title: '其他約定或重要說明',
    hint: '未列於上述欄位但與屋況或交易有關之揭露事項。',
  },
] as const;
