# ID 029 E2E 測試規劃（房東預約看房管理）

目前已完成單元/整合層驗證，E2E 驗收建議補上以下路徑：

1. 房東於 `/landlord/appointments` 將 `pending` 預約改為 `confirmed`，訪客收到通知。
2. 日曆視圖在同一天顯示多個預約時段與筆數標記。

建議以 `apps/web/e2e/flows/landlord/` 建立專用 spec，並在 CI 具備測試帳號與 SMTP 測試服務後啟用。
