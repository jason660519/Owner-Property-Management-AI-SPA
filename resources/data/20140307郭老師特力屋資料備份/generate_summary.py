import os
import glob

EXPORT_DIR = "/Users/jason66/Owner Real Estate Agent SaaS/resources/data/exported_tables"
SUMMARY_FILE = "/Users/jason66/Owner Real Estate Agent SaaS/resources/data/restored_tables_summary.md"

def generate_summary():
    csv_files = glob.glob(os.path.join(EXPORT_DIR, "*.csv"))
    csv_files.sort()
    
    summary = []
    summary.append("# 房屋仲介資料庫備份還原報告")
    summary.append(f"**還原日期**: 2026-01-15")
    summary.append(f"**來源檔案**: house063_backup_2012_11_01_003215_3150000.bak")
    summary.append("\n## 資料表清單與筆數統計")
    summary.append("| 資料表名稱 (Table) | 筆數 (Rows) | 備註 (Guesstimate) |")
    summary.append("| --- | --- | --- |")
    
    total_rows = 0
    tables_with_data = 0
    
    for f in csv_files:
        filename = os.path.basename(f)
        tablename = filename.replace('.csv', '')
        
        # Count lines
        with open(f, 'rb') as fp:
            lines = sum(1 for _ in fp)
        
        # Subtract header
        data_rows = max(0, lines - 1)
        
        if data_rows > 0:
            tables_with_data += 1
            total_rows += data_rows
            
            # Guess content
            note = ""
            if "cust" in tablename: note = "客戶資料"
            elif "trade" in tablename: note = "交易紀錄"
            elif "house" in tablename: note = "房屋物件"
            elif "emp" in tablename: note = "員工資料"
            elif "log" in tablename: note = "系統紀錄"
            elif "build" in tablename: note = "建物資料"
            elif "auth" in tablename: note = "權限設定"
            
            summary.append(f"| {tablename} | {data_rows:,} | {note} |")
            
    summary.append(f"\n**總計**: {tables_with_data} 個資料表包含資料，共 {total_rows:,} 筆紀錄。")
    summary.append("\n## 下一步")
    summary.append("所有資料已匯出為 CSV 格式，位於 `resources/data/exported_tables/` 目錄下。您可以使用 Excel 開啟檢視。")
    
    with open(SUMMARY_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(summary))
        
    print(f"Summary generated at {SUMMARY_FILE}")

if __name__ == "__main__":
    generate_summary()
