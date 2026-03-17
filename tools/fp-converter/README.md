# fp-converter — FinePrint .fp 謄本轉檔工具

在 macOS 上直接讀取 Windows FinePrint `.fp` 格式，輸出 **HTML / Markdown / PDF**，  
無需安裝 Windows、FinePrint 或任何虛擬機器。

---

## 快速開始

```bash
# 1. 安裝依賴（只需一次，PDF 輸出才需要）
pip3 install fpdf2

# 2. 單一檔案轉換（預設 HTML）
python3 convert_fp.py 某謄本.fp

# 3. 整個資料夾批次轉換 → HTML
python3 convert_fp.py --input ./新謄本/ --output ./output/

# 4. 在瀏覽器查看結果
open ./output/
```

---

## 指令選項

```
python3 convert_fp.py [輸入檔] [選項]

位置參數:
  輸入檔            單一 .fp 檔案路徑（也可用 --input）

選項:
  --input  / -i     輸入 .fp 檔案或資料夾
  --output / -o     輸出資料夾 (預設: ./fp-output)
  --format / -f     輸出格式:
                      html  ★ 推薦，在瀏覽器直接開啟，支援列印為 PDF
                      md    Markdown，可在 VS Code / Obsidian 閱讀
                      pdf   PDF（需要 fpdf2 + Arial Unicode 字型）
                      all   同時輸出三種格式
  --verbose / -v    顯示每個檔案提取的文字數
```

---

## 格式說明

| 格式 | 優點 | 使用方式 |
|:-----|:-----|:---------|
| **HTML** ★ | 中文顯示最佳，支援列印/另存 PDF | Safari/Chrome 開啟 → 列印 → 儲存為 PDF |
| **Markdown** | 純文字，可 git 版本管理 | VS Code、Obsidian、任何文字編輯器 |
| **PDF** | 直接用 Preview 開啟 | 需要 `pip3 install fpdf2`，系統要有 Arial Unicode.ttf |

---

## 技術原理

`.fp` 是 FinePrint 的專有二進位格式，但文字以 **UTF-16LE** 儲存於固定結構的 record 中：

```
Offset  Byte   意義
  0     0x1E   文字 record 標記 (opcode)
  1     XX     = 8 + char_count × 4  (body 描述字節)
  2     0x40   常數旗標
  3     YY     = char_count  (字元數)
  4..   [YY×2 bytes]  UTF-16LE 文字內容
  ...   [YY×2 bytes]  每字元字寬資料（渲染用）
```

本工具透過逆向工程發現此結構（magic bytes `FINC`），直接解析二進位取出文字，  
無需執行 FinePrint 或任何 Windows 程式。

---

## 依賴

- Python 3.9+（macOS 內建或 Homebrew）
- `fpdf2`：僅 `--format pdf` 或 `--format all` 需要

```bash
brew install python3  # 如尚未安裝
pip3 install fpdf2
```

---

## 範例輸出

```md
# 謄本：內江街39號-仁瑋

> 光特版地政電傳資訊系統
- 臺北市
- 民國 101 年 05 月 04 日

## 建物標示部

- **登記原因**：第一次登記
- **建物門牌**：內江街 ３９ 號
- **主要建材**：磚造

## 建物所有權部

- **所有權人**：林輝炳
- **權利範圍**：全部
```
