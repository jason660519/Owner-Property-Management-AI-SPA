# 本地開發：物件照片與文件持久化

## 問題現象

重啟 IDE 或執行 `./start.sh` 後，已上傳的**物件照片、謄本、權狀、合約、部落格**等檔案在畫面上消失。

## 可能原因

1. **執行過 `supabase db reset`**  
   會重建整個資料庫（含 `property_photos`、`property_documents`），**所有中繼資料被清空**。  
   Storage 裡的實體檔案可能還在 Docker volume，但畫面上是依 DB 查詢結果顯示，所以會變成「看不到任何檔案」。

2. **執行過 `supabase stop --no-backup`**  
   會刪除 Docker volumes，**DB 與 Storage 資料都會被清掉**。

3. **Storage 僅存在 Docker volume**  
   若未設定 host 綁定，檔案只存在 Docker 的 named volume；在部分環境（如 Docker Desktop 重裝、清理 volumes）可能被清空。

## 專案已做的設定

- **`supabase/config.toml`**  
  已為 `property-photos`、`property-documents` 設定 `objects_path`，指向專案目錄：
  - `supabase/storage-data/property-photos`
  - `supabase/storage-data/property-documents`  
  依 Supabase CLI 版本，可能用於本地寫入或僅用於 seed；若支援寫入 host 目錄，重啟後檔案會保留。**首次設定後請執行 `supabase stop` 再 `supabase start`（或重新跑 `./start.sh`）讓設定生效。**

- 若 CLI 未將上傳寫入上述目錄，實體檔仍會存在 Docker named volume `supabase_storage_Owner_Real_Estate_Agent_SaaS`；只要**不要執行 `supabase db reset` 或 `supabase stop --no-backup`**，重啟 IDE 或 `./start.sh` 後 DB 與 volume 都會保留，畫面上的照片/文件就不會消失。

- **`start.sh`**  
  啟動前會自動建立 `supabase/storage-data/property-photos` 與 `supabase/storage-data/property-documents`，避免目錄不存在。

- **`.gitignore`**  
  已忽略 `supabase/storage-data/`，上傳的檔案不會被 commit。

## 建議操作

1. **不要隨意執行 `supabase db reset`**  
   除非你刻意要清空本地 DB 並重跑 migrations；否則會讓畫面上的照片/文件全部消失。

2. **停止 Supabase 時不要加 `--no-backup`**  
   使用 `supabase stop` 即可保留 volumes；若使用 `supabase stop --no-backup` 會刪除所有資料。

3. **若剛加入 `objects_path` 設定**  
   需重新啟動 Supabase 讓設定生效：
   ```bash
   supabase stop
   ./start.sh
   ```
   或只啟動 Supabase：`supabase start`。  
   之後新上傳的檔案會寫入 `supabase/storage-data/`，重啟 IDE 或 `./start.sh` 後仍會存在。

4. **正式環境**  
   使用 Supabase Cloud 時，Storage 與 DB 皆由 Supabase 管理，無需上述本地目錄設定。
