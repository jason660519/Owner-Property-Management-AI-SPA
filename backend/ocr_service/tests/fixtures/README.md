# Test Fixtures

> **創建日期**: 2026-01-30  
> **創建者**: Project Team  
> **最後修改**: 2026-01-30  
> **修改者**: Project Team  
> **版本**: 1.0  
> **文件類型**: 測試報告

---


此目錄存放測試用的固定資料集。

## 目錄結構

```
fixtures/
├── pdf_samples/         # 裁切後的 PDF 測試樣本
├── json_samples/        # Jason JSON 範例檔案
└── ocr_outputs/         # OCR 輸出結果範例
```

## 資料管理原則

1. **去識別化**: 所有測試資料必須移除個人資訊
2. **最小化**: 僅保留必要的測試範例
3. **版本控制**: 小型測試資料可提交至 Git
4. **隔離**: 不使用 production 資料

## 測試資料來源

- 基於 `resources/samples/建物謄本PDF範例/` 裁切
- 手動標註的欄位資料
- Mock 的 OCR 輸出結果
