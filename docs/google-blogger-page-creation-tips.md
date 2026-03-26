# Google Blogger 網頁創建 Tips 說明書（Owner SaaS 專案對齊版）

> **用途**：供 **Superadmin 物件部落格** 與 **Google Blogger** 整合時參考；並作為 **AI 生成／發佈** 內容時的依據，與本 repo 實作一致。  
> **產品脈絡**：**Owner Real Estate Agent SaaS** — 房東／仲介物件管理；`apps/superadmin` 內 **物件編輯 → 部落格產生器** 可將 **出售／出租** 物件產成 HTML 文章並透過 **Blogger API** 發佈至指定網誌。  
> **免責**：Blogger 後台介面以 [Google 官方](https://www.blogger.com/) 為準；以下「手動設定」與「API 行為」分開標示。

---

## 1. 本專案中的 Blogger 角色

| 面向 | 說明 |
| :--- | :--- |
| 與產品的關係 | 物件廣告頁可選 **Google Blogger** 作為對外曝光管道（相對於僅存 **Supabase 地端**），利於 Google 索引與分享連結。 |
| 程式位置 | UI：`apps/superadmin/components/admin/properties/PropertyBlogGenerator.tsx`、`BlogGooglePanel.tsx`。發佈邏輯：`apps/superadmin/lib/actions/google-blogger.ts`。內容生成：`apps/superadmin/lib/actions/blog.ts`。 |
| 發佈方式 | 使用 **Blogger API v3** `POST .../blogs/{blogId}/posts`（`isDraft=false`），非在 blogger.com 手動貼 HTML（但發佈後仍可在後台編修）。 |
| 登入與網誌選擇 | 使用者需在整合設定中 **連結 Google（OAuth）** 並 **選定一個 blogId**；金鑰與權杖存於 `user_integrations`（細節見環境與後台設定，勿將 token 寫進提示詞或 repo）。 |

---

## 2. 手動建立 Blogger 網誌（營運／一次性設定）

以下與一般 Blogger 教學一致，**AI 無法代替**完成帳號與網域層級設定：

1. **建立網誌**：登入 [blogger.com](https://www.blogger.com/) →「建立你的網誌」。  
2. **標題與網址**：標題顯示於頁首／品牌；預設網址多為 `*.blogspot.com`，須唯一。  
3. **作者顯示名稱**：於設定中確認與品牌一致。  
4. **SEO 基本欄位**：填寫網誌 **說明（Description）**、**語言**，利於搜尋摘要。  
5. **固定頁面**：建議新增「關於／聯絡／隱私與免責」等（不動產廣告與個資法遵視實際營運補齊）。  
6. **版面與主題**：用「版面配置」放導覽與小工具；主題決定全站外框（**本專案發佈的文章內文為 HTML，會嵌入該主題的 article 區**）。  
7. **自訂網域／HTTPS**：若不用 `blogspot.com` 子網域，於設定中連結網域並完成 DNS。  
8. **營利**：AdSense、聯盟連結等需符合 [Google 政策](https://support.google.com/adsense/answer/48182) 與在地法規；聯盟與業配應**揭露**。  
9. **`robots.txt` / `ads.txt`**：依後台「設定」與廣告平台說明；**自訂網域**時較常要處理 `ads.txt`。

**永久連結（Permalink）**：手動發文可在編輯器設「自訂永久連結」。**本專案目前以 API 建立文章**，網址規則主要由 Blogger 依標題產生；若 SEO 需固定英文 slug，可在 **發佈後** 至 Blogger 後台調整（若介面允許）或接受預設規則。

---

## 3. 與本專案整合的技術限制（AI 與工程必讀）

這些行為來自 `google-blogger.ts` 等實作，**生成或修改提示詞時不得假設**與下列不符：

| 項目 | 行為 |
| :--- | :--- |
| 文章標題 | 使用資料庫中該筆部落格文章的 `title` 欄位（物件標題或地址等）。 |
| 內文格式 | 傳入 **HTML 字串**；伺服器會再包一層 `wrapForBlogger()`（外層 class：`property-listing-post`），並帶入可點擊連結、圖片響應式等樣式。 |
| 標籤（Labels） | 對應 `tags` 陣列；**最多 20 個**（程式內 `slice(0, 20)`）。 |
| 草稿 | 目前 API 呼叫為 **`isDraft=false`**，發佈即**正式上線**（非草稿）。 |
| 排程發佈 | **未**在程式內實作；若要排程，需在 Blogger 後台手動調整或使用未來擴充。 |
| 更新／刪除 | 支援以 `PUT`／`DELETE` 同步更新或刪除已對應的站外文章（見 `updateBloggerPost`、`deleteBloggerPost`）。 |

---

## 4. AI 生成內容規範（對齊 `blog.ts`）

Superadmin 以 **Claude** 等模型生成物件廣告頁 HTML 時，提示詞已要求與 **Google Blogger 嵌入**相容。任何在本專案內**新增／改寫**的生成邏輯應維持下列約束（與 `generatePresetStyleHtml` 等函式一致）：

### 4.1 結構與標籤

- 僅輸出 **一段** 包在 `<div class="property-listing-container">` 內的內容。  
- **禁止**輸出 `<!DOCTYPE>`、`<html>`、`<head>`、`<body>`（由 Blogger 頁面承載）。  
- **禁止**用 markdown 包裝（例如 \`\`\`html）；輸出**原始 HTML 字串**。

### 4.2 CSS

- 全站樣式需 **作用域化**：CSS 放在開頭 `<style>`，**所有選擇器加前綴** `.property-listing-container`，避免污染 Blogger 主題。  
- 按鈕、連結等需足夠 **z-index**，避免被 Blogger 版面或遮罩擋住點擊（與提示詞中 z-index 要求一致）。

### 4.3 圖片

- 物件照片必須使用後端提供的 **完整圖片 URL**，以 `<img src="..." alt="...">` 呈現；**不要用** `background-image` 承載主要物件圖（利於無障礙與點擊行為）。  
- 使用 `object-fit: cover`、`width: 100%` 等避免跑版。

### 4.4 連結與 CTA

- 聯絡方式須為可點擊的 `<a href>`：`tel:`、`mailto:`、`https://line.me/ti/p/~...`、`https://wa.me/...` 等。  
- 外部連結使用 `target="_blank"`、`rel="noopener noreferrer"`。  
- 錨點（如 `#gallery`）需在容器內有對應 `id`。

### 4.5 文案語言與資料

- 可見文字使用 **繁體中文**。  
- 價格、坪數、房型等須忠於傳入的物件資料；**不捏造**法拍、產權、坪數、價格或配套。

### 4.6 版型風格（Style Preset）

下列 ID 與 **物件編輯 → 部落格產生器** 選項一致，並對應 `lib/blog-style-templates/blogger/*.ts` 的設計說明：

| `StylePreset` | 使用者介面標籤（約） |
| :--- | :--- |
| `luxury_dark` | 豪宅暗色調 |
| `bright_clean` | 清爽明亮 |
| `corporate` | 商務簡潔 |
| `warm_japanese` | 溫馨日系 |

`targetPlatform: 'google_blogger'` 時使用 **Blogger 版** 模板描述，與地端 Supabase 預覽用的 Local 版區分。

### 4.7 參考網址模式

若使用者提供 **參考網址**，系統可擷取參考頁 HTML 做風格分析後再生成（見 `generateCustomStyleHtml`）。AI 應**重現設計語言**，但仍須遵守上方結構、CSS 作用域與資料正確性。

---

## 5. 不動產內容與法遵提醒（給 AI 與編輯）

- 將內容視為**不動產廣告／行銷素材**：避免誇大投報、保證獲利、歧視性用語；依營運地法規補充應揭露事項。  
- 個資（電話、LINE、Email）來自系統時應如實呈現；**勿**在生成階段虛構聯絡方式。  
- 若同一物件更新後重新發佈，應以產品內「更新／同步」流程更新 Blogger，避免站內與站外資訊不一致。

---

## 6. 營運流程建議（與後台操作順序）

1. **Google**：在專案設定的整合頁完成 Blogger 授權與**選定網誌**。  
2. **Superadmin**：於物件頁開啟部落格產生器 → 選 **Google Blogger** → 選風格或參考網址 → **生成預覽**。  
3. **檢查**：標題、價格、地址、照片、聯絡方式與 CTA 連結。  
4. **發佈**：確認無誤後再執行發佈（正式文章）。  
5. **後續**：若需全站 SEO、導覽列、AdSense，仍回 **Blogger 後台** 設定；站內僅負責單篇文章 HTML 與標籤。

---

## 7. 快速檢查清單

**手動（網誌層級）**

- [ ] 網誌標題、說明、語言、作者名稱  
- [ ] 固定頁面與導覽（關於、聲明等）  
- [ ] 主題／版面可讀性與行動裝置顯示  

**本專案發佈前（文章層級）**

- [ ] Google 整合已連線且已選定正確網誌  
- [ ] 標題與物件事實一致  
- [ ] HTML 符合第 4 節（容器 class、無整頁 `<html>`、CSS 有前綴）  
- [ ] 圖片 URL 正確、`alt` 合理  
- [ ] 聯絡連結可點且有效  
- [ ] 標籤（labels）**不超過 20 個**  

---

## 8. 參考連結

- [Blogger 說明中心](https://support.google.com/blogger/)  
- [Blogger API v3](https://developers.google.com/blogger)（貼文建立／更新／刪除）  
- [Google AdSense 政策](https://support.google.com/adsense/answer/48182)  

---

*本文件與 `apps/superadmin/lib/actions/blog.ts`、`google-blogger.ts` 行為對齊；若程式變更，請同步更新本節與檢查清單。*
