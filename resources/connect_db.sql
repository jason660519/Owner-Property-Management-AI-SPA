-- 請先點選右下角的 "Disconnected" 或 "選擇連線" (若未出現請按 Cmd+Shift+P 輸入 "SQL: Connect")
-- 連線資訊：
-- Server: localhost
-- Database: house063
-- User: SA
-- Password: StrongPass123!

-- 連線成功後，您可以隨時選取下方的 SQL 語句並按 Cmd+Shift+E 執行

-- 1. 查詢前 100 筆客戶資料
SELECT TOP 100 * FROM hbcust;

-- 2. 查詢前 100 筆成交紀錄
SELECT TOP 100 * FROM hbtrade;

-- 3. 查詢前 100 筆房屋物件
SELECT TOP 100 * FROM hbhouseowner;
