# OCR Backend Refactoring & Architecture Report

> **Date**: 2026-02-01
> **Status**: Completed
> **Context**: Refactoring backend to use **Cloud VLM Only** approach (Local Fallback Abandoned).

---

## 1. 核心架構重構 (Core Architecture Refactoring)

為了提升繁體中文（台灣建物所有權狀）的辨識準確率與開發效率，我們確立了 **"Cloud VLM First & Only"** 的技術路線，並果斷放棄維護成本極高的本地 OCR 方案。

### 1.1 統一處理流程 (Unified Processing)
系統採用統一的處理管線：
1. **圖片前處理**: 自動校正、降噪、增強對比。
2. **VLM 優先識別**: 直接使用大型視覺語言模型 (VLM) 讀取圖片並輸出結構化 JSON。
3. **備援機制**: 當主要 VLM 服務不可用時，自動切換至備用雲端模型。

### 1.2 容錯與備援策略 (Failover Strategy)

我們實作了 `OCREngineManager`，依序嘗試以下引擎直到成功：

1. **Primary (首選)**: `GPT-4o` (OpenAI) - 繁體中文與複雜表格理解能力最強。
2. **Backup 1**: `Claude 3.5 Sonnet` (Anthropic) - 結構化輸出穩定，視覺能力極佳。
3. **Backup 2**: `Gemini 1.5 Pro` (Google) - 長文本與多模態能力強。
4. **Backup 3**: `Qwen-VL-Max` (Alibaba) - 中文特化備援。

**變更說明**: 已移除 `FallbackEngine` (PaddleOCR/Tesseract)。因 Mac Mini 本地環境配置極為複雜且效能不佳，我們決定完全依賴高可用性的雲端 API。若全數失敗，將拋出錯誤並由前端引導用戶「稍後重試」或「手動輸入」。

---

## 2. 遇到的技術問題與解決方案 (Technical Issues & Solutions)

### 2.1 本地部署困境 (Local Deployment Challenges)
*   **問題**: 在 macOS (Apple Silicon) 上部署 PaddleOCR 遇到嚴重的 Python 版本相容性問題 (Python 3.9/3.14 與 Paddle 依賴衝突) 及權限問題。
*   **影響**: 環境建置耗時過長，且推論速度 (CPU Mode) 不如預期。
*   **解決方案**: **徹底棄用本地方案**。轉而使用維護成本低、準確率更高的雲端 VLM API。

### 2.2 程式碼清理 (Cleanup)
已執行以下清理動作，確保專案乾淨：
*   刪除所有 PaddleOCR 相關測試腳本 (`test_paddle_local.py`) 與文檔。
*   移除 `requirements.txt` 中的 `paddlepaddle`, `paddleocr` 等依賴。
*   移除 `src/ocr_engine/fallback.py` 實作。
*   清理暫存的虛擬環境與測試結果資料夾。

---

## 3. 下一步工作計劃 (Next Steps)

### Phase 4: Cloud VLM Integration (預計 2 天)
1.  **API 金鑰配置**: 在 `.env` 中設定 `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`。
2.  **API 串接實作**: 完善 `VLMEngine` 的錯誤處理與重試邏輯 (Tenacity)。
3.  **整合測試**: 使用 `complete_workflow.py` 測試端對端流程 (PDF -> Image -> GPT-4o -> JSON)。

### Phase 5: Frontend Integration (預計 3 天)
1.  **結果校對介面**: 開發前端 UI 讓用戶核對並修正 VLM 識別的結果。
2.  **狀態回饋**: 優化上傳進度條與錯誤提示。

---

## 4. 結論
本次重構確立了以 **OpenAI GPT-4o** 為核心的識別引擎。雖然放棄了本地備援，但換來了更快的開發速度、更低的維護成本以及更高的識別準確率，是符合現階段專案利益的最佳決策。
