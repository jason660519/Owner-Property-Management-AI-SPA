# 自動化合約更名程式使用說明

本程式旨在自動掃描 `resources/samples/contracted_sample` 資料夾中的合約文件，解析標題並進行重新命名。

## 功能特點
- **支援格式**：
  - **PDF**：嘗試讀取文字層，若無文字層則自動嘗試 OCR (需安裝 Tesseract)。
  - **Text (.txt, .md)**：直接讀取內容。
  - **DOC/XLS**：目前僅提供基本支援或略過（建議先轉為 PDF 或 TXT）。
- **智能解析**：自動尋找文件首行的標題。
- **檔名清洗**：移除非法字元，確保檔名在 Windows/Mac/Linux 皆可使用。
- **完整報告**：執行後生成 `renaming_report.csv` 報告所有變更。

## 安裝需求

本程式使用 Python 編寫，需要以下環境：

1. **Python 3.8+**
2. **Python 套件**：
   ```bash
   pip install pytesseract pdf2image Pillow pypdf
   ```
3. **系統工具 (OCR 必須)**：
   - **macOS**:
     ```bash
     brew install tesseract poppler
     ```
   - **Windows**:
     - 下載並安裝 [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki)
     - 下載並安裝 [Poppler](http://blog.alivate.com.au/poppler-windows/) (用於 PDF 轉圖片)
     - 確保兩者皆加入系統 PATH 環境變數。
   - **Linux (Ubuntu/Debian)**:
     ```bash
     sudo apt-get install tesseract-ocr poppler-utils
     ```

## 使用方式

1. 確保目標資料夾 `resources/samples/contracted_sample` 存在且有檔案。
2. 執行程式：
   ```bash
   python3 rename_contracts.py
   ```
3. 查看結果：
   - 程式會自動重新命名成功解析的檔案。
   - 查看 `renaming_process.log` 了解詳細執行過程。
   - 查看 `renaming_report.csv` 取得完整變更清單。

## 注意事項
- **掃描檔/圖片 PDF**：必須安裝 Tesseract 才能進行 OCR 辨識。若未安裝，程式會自動略過這些檔案。
- **DOC/XLS**：二進位 Office 檔案支援度有限，建議轉檔後再處理。
