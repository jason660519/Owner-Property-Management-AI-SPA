# 一鍵部落格／靜態頁面與資產存放可行性

> **創建日期**: 2026-02-20  
> **目的**: 釐清「房東物件照片、網頁、部落格」存放位置，以及「房東自備 GitHub 帳號 + GitHub Pages」之可行性。

---

## 1. 專案現況：東西放哪裡？

### 1.1 房東物件照片（已實作）

| 項目 | 現況 |
|------|------|
| **儲存位置** | **Supabase Storage**，bucket：`property-photos` |
| **存取** | 公開讀取（可直連 URL），登入用戶可上傳 |
| **紀錄** | `property_photos` 表 + 物件 `details.images` / `details.imageUrl` |

結論：**照片已集中在 Supabase，不需為了部落格/靜態頁再搬一份；生成內容時直接引用 Supabase 的公開 URL 即可。**

### 1.2 部落格文章（DB 已有結構）

| 項目 | 現況 |
|------|------|
| **儲存位置** | **PostgreSQL**：`blog_posts`（title, slug, content, content_html, featured_image_url, property_id 等） |
| **AI 模組** | Superadmin 的「部落格生成器」「靜態網頁廣告生成器」會產出內容／HTML |

結論：**部落格「內容」在資料庫；對外「要展示在哪裡」尚未定案。**

### 1.3 靜態網頁／廣告頁（規劃中）

- AI「靜態網頁廣告生成器」會產出 **HTML/CSS**。
- 目前沒有定義：這些 HTML 要**發佈到哪個網址**（只產出內容，未定 hosting）。

---

## 2. 方案 A：房東自備 GitHub 帳號 + GitHub Pages

### 2.1 流程想像

1. 房東在我們系統外，**自己去 GitHub 註冊帳號**。
2. 房東在系統內**綁定 GitHub**（例如提供 Personal Access Token，或授權 OAuth）。
3. 系統用 AI 生成部落格／靜態頁後，**代為 push 到房東的 repo**，並觸發 GitHub Pages 發布。
4. 照片：可繼續用 **Supabase 的公開 URL** 嵌在 HTML 裡，不一定要放到 GitHub repo。

### 2.2 優點

- GitHub Pages **免費**、靜態、可自訂網域。
- 內容在房東自己的 repo，**資料主權**在房東。
- 不需我們額外負擔靜態網站頻寬。

### 2.3 缺點與風險（可行性關鍵）

| 問題 | 說明 |
|------|------|
| **門檻高** | 房東多為非技術用戶，要求「先申請 GitHub、建 repo、設 Token」會大幅提高流失率，與「一鍵生成」體驗衝突。 |
| **權限與資安** | 需儲存或使用房東的 GitHub Token；若做 OAuth 要處理 scope、refresh、撤銷，實作與維運成本高。 |
| **發佈流程** | 每次發文都要 push + 等 GitHub Actions / Pages build，延遲與失敗情境需處理（rate limit、build 失敗）。 |
| **多租戶** | 每位房東一個 repo 或一個 branch，維運、教學、客服成本都增加。 |
| **條款** | GitHub 對自動化、高頻 push、商業用途有使用政策，需確認合規。 |

### 2.4 可行性結論（方案 A）

- **技術上可行**：照片用 Supabase URL，部落格/靜態頁產出 HTML 推送到房東 GitHub repo 並用 GitHub Pages 發布，是可以做得到的。
- **產品與營運上不建議當「預設」**：  
  要求房東先申請 GitHub 會顯著拉高使用門檻，與「一鍵生成」的目標相悖，較適合作為**進階／選配**（例如給懂技術的房東或仲介使用）。

---

## 3. 方案 B：由 SaaS 統一代管（推薦）

### 3.1 概念

- **照片**：維持現狀，全部在 **Supabase Storage**，生成內容時直接帶入公開 URL。
- **部落格／靜態廣告頁**：  
  - 內容仍存在 **PostgreSQL**（已有 `blog_posts`）。  
  - **對外網址**由我們自己的網域提供，例如：
    - 部落格：`https://yourapp.com/blog/{slug}` 或 `https://{tenant}.yourapp.com/blog/{slug}`
    - 靜態廣告頁：`https://yourapp.com/p/{page_id}` 或 `https://{tenant}.yourapp.com/p/{page_id}`

### 3.2 優點

- **真正一鍵**：房東不需額外帳號，生成後立即可分享連結。
- **技術棧一致**：沿用現有 Vercel/Next.js + Supabase，無需維護 GitHub API、Token、多 repo。
- **維運簡單**：權限、備份、監控都在既有架構內。
- **體驗可控**：版型、SEO、載速都由我們統一優化。

### 3.3 實作要點

- 在 **Next.js** 用動態路由提供「公開閱讀」的部落格與靜態頁（例如 `/blog/[slug]`、`/p/[id]`）。
- 圖片一律使用 **Supabase Storage 的 public URL**，不複製到別處。
- 若未來要支援「匯出靜態檔給房東自己掛站」，可再加「下載 ZIP」或「一鍵 deploy 到 GitHub Pages」當進階功能。

---

## 4. 建議總結

| 項目 | 建議 |
|------|------|
| **房東物件照片** | 繼續放在 **Supabase Storage**，部落格/靜態頁只引用其 URL。 |
| **部落格／靜態網頁「放哪裡」** | **優先由 SaaS 代管**（同一網域下之路由），房東零門檻、一鍵取得連結。 |
| **GitHub Pages** | **可行但不建議當預設**；可列為進階選項（需房東自備 GitHub 帳號與授權）。 |

若你希望，下一步可以在 `docs/` 或產品規格裡補上「一鍵部落格／靜態頁」的發佈流程（僅 SaaS 代管版），或再細化「進階：匯出至 GitHub Pages」的流程與權限設計。
