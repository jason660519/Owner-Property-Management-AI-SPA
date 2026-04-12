# ADR-019: 公司產品教學 (Company Product Tutorial) — 架構決策記錄

**建立日期**: 2026-04-12
**建立者**: Architect Agent (bdd18be5)
**狀態**: Accepted
**Row ID**: 019
**功能**: 公司產品教學
**相關 TDD**: `/project-process/features/tdd-company-pages-thirdparty-20260221.md`

---

## 背景 (Context)

Owner AI 平台服務多個不同角色（房東、租客、買家、仲介等），新用戶上手障礙高。需要一個分角色的教學系統，讓用戶能按自己的身份了解平台核心流程，並能追蹤學習進度。

驗收標準要求：
1. 分角色教學（房東、租客、買家）
2. 每步驟附截圖或短影片（< 2 分鐘）
3. 教學進度可儲存並從中斷點繼續
4. 完成所有步驟顯示完成徽章
5. 教學連結至對應功能頁面

---

## 決策 (Decisions)

### 1. 頁面路由設計：靜態 + 動態路由

**選定方案**：
- `/tutorial` — 角色選擇頁（Server Component，SSG）
- `/tutorial/[role]` — 角色教學頁（Client Component，CSR）

**理由**：
- 角色選擇頁內容完全靜態，使用 Server Component 可獲得最快 LCP（利於 SEO/Lighthouse）。
- 角色教學頁需要 `localStorage`、useState（進度追蹤、標記完成），必須使用 Client Component。
- `[role]` 動態路由讓 URL 語義清晰且可分享（如 `/tutorial/landlord`），未來可擴充更多角色。

**備選方案**：Single-page tab 切換（拒絕）— 不利於深度連結分享、SEO 與 Lighthouse 分頁效能分析。

### 2. 進度儲存：localStorage（階段一）

**選定方案**：以 `localStorage` 儲存每個角色的教學進度（JSON）。

**理由**：
- 教學功能不需要登入，`localStorage` 零摩擦。
- 資料結構簡單（completedStepIds、lastStepId、completedAt）。
- 瀏覽器端無網路延遲，互動即時。
- Key 格式：`ownerai_tutorial_progress_{role}`，防止跨角色衝突。

**風險與限制**：
- 清除瀏覽器資料後進度遺失。
- 跨裝置不同步。

**後續規劃（階段二）**：登入用戶的進度同步至 Supabase `user_tutorial_progress` 資料表，以 `user_id + role` 作 unique key。此階段設計不阻擋未來擴充——`useTutorialProgress` hook 可在後端 API 就緒後替換儲存層，不影響 UI 元件。

### 3. 教學內容資料結構：靜態 TypeScript Module

**選定方案**：`apps/web/lib/tutorial-data.ts` 硬編碼教學內容，匯出類型安全的 `TUTORIAL_DATA` 物件。

**理由**：
- 教學內容更新頻率低（每次產品大改版才更改），CMS 的建置成本不合理。
- TypeScript 類型系統保障每個 Step 必填欄位（title、description、mediaType）。
- 版本控制（git）就是內容歷史。
- 測試更容易：可直接在 Jest 中 import 並驗證資料完整性。

**後續規劃**：若行銷團隊需要非工程師也能更新教學內容，可遷移至 Supabase 資料表或 CMS（如 Contentful）。遷移時只需替換 data source，型別介面維持相同。

### 4. 媒體資源：靜態截圖（階段一）

**選定方案**：教學截圖放在 `public/tutorial/screenshots/`，使用 Next.js `<Image>` 元件進行 WebP 轉換與尺寸優化。

**理由**：
- 截圖製作成本低，更新方便。
- Next.js Image Optimization 自動處理格式轉換與響應式 srcset。
- 截圖路徑定義在 `tutorial-data.ts` 中，替換只需改 `mediaSrc` 欄位。

**影片支援**：`TutorialStep` 型別已預留 `mediaType: 'video'` 與 `videoDurationSec` 欄位，但階段一不實作影片（資產製作成本高）。

### 5. 元件設計：Server/Client 邊界

```
/tutorial/page.tsx          → Server Component
  ↳ Header (Client)         → 現有元件
  ↳ Footer (Client)         → 現有元件
  ↳ Role card links         → <Link> (純 HTML, zero JS)

/tutorial/[role]/page.tsx   → Client Component ('use client')
  ↳ useTutorialProgress()   → 自訂 hook (localStorage)
  ↳ StepCard (inline)       → 含 Button 互動
  ↳ progressbar (aria)      → ARIA role="progressbar"
  ↳ completion badge        → role="status" + aria-live="polite"
```

**無障礙（A11Y）設計**：
- 進度條使用 `role="progressbar"` + `aria-valuenow/min/max`
- 完成徽章使用 `role="status"` + `aria-live="polite"`（螢幕閱讀器宣告）
- 所有角色卡連結有明確 `aria-label`
- 步驟完成按鈕有 `aria-label` 含步驟編號

---

## 架構一致性檢查

| 規則 | 符合 |
|------|------|
| TypeScript strict，無 `any` | ✅ (`useTutorialProgress.ts` 無 `any`，`[role]/page.tsx` 的 mock 備註已標記) |
| 預設 Server Component，有互動才 `'use client'` | ✅ |
| CSS token（`text-text-primary`、`bg-bg-secondary` 等）| ✅ |
| 新頁面需加入 Sidebar navItems | ⚠️ 教學頁為公開頁（非後台），不在 superadmin Sidebar，Header navLinks 暫未加入（待 PM 確認是否要顯示在主導覽） |
| 單檔不超過 500 行 | ✅ 所有新檔均 < 300 行 |
| SQL 放 `supabase/migrations/` | ✅ 階段一無 DB 變更 |

---

## 風險評估

| 風險 | 機率 | 衝擊 | 緩解措施 |
|------|------|------|----------|
| localStorage 被使用者清除，進度遺失 | 中 | 低 | 重置只影響教學進度，不影響主功能；後續版本支援登入同步 |
| 截圖資產尚未製作，頁面顯示圖片載入失敗 | 高（初期） | 低 | `unoptimized={true}` + `alt` 文字確保可讀性；截圖為可選功能 |
| 教學內容與實際 UI 不同步 | 中 | 中 | 教學步驟描述以「功能說明」為主，避免截圖細節過度依賴 UI 像素 |
| 新角色擴充（如 agent, service_provider） | 中 | 低 | `TutorialRole` 為 union type，新增角色只需在 `tutorial-data.ts` 加 key |

---

## 後續工作（Phase 2）

1. **截圖資產製作**：為每個步驟製作 800×450px 截圖並放入 `public/tutorial/screenshots/`。
2. **Supabase 進度同步**：新增 `user_tutorial_progress` 資料表 + API，登入用戶自動同步進度。
3. **Header 導覽整合**：與 PM 確認是否在主導覽加入「教學」連結。
4. **Google Analytics 事件追蹤**：追蹤教學步驟完成率，優化使用者旅程。
