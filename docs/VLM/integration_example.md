# VLM 文件掃描整合範例

> **創建日期**: 2026-02-04
> **最後修改**: 2026-02-15 | 整合至 docs/VLM
> **用途**: 將 VLM 文件掃描整合到新增物件表單

---

## 整合到新增物件表單

在 Step 2（權狀資料）加入 VLM 組件：

```tsx
import { VLMDocumentUpload } from '@/components/vlm/VLMDocumentUpload'

// 在 Step 2 區塊內
{currentStep === 2 && (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold">Step 2: 權狀資料</h3>

    <div>
      <h4 className="text-md font-medium mb-2">智能文件掃描</h4>
      <p className="text-sm text-gray-600 mb-4">
        上傳謄本或權狀照片，AI 將自動解析並填入表單
      </p>
      <VLMDocumentUpload onComplete={handleVLMAutoFill} />
    </div>

    <Separator className="my-6" />

    {/* 手動輸入欄位 */}
    <div className="space-y-4">
      <h4 className="text-md font-medium">手動輸入</h4>
      {/* owner_name, building_number, land_number 等 */}
    </div>
  </div>
)}
```

### 自動帶入處理

```tsx
const handleVLMAutoFill = (data: {
  owner_name?: string
  property_address?: string
  building_number?: string
  land_lot_number?: string
}) => {
  if (data.owner_name) setValue('owner_name', data.owner_name)
  if (data.property_address) setValue('address', data.property_address)
  if (data.building_number) setValue('building_number', data.building_number)
  if (data.land_lot_number) setValue('land_number', data.land_lot_number)
}
```

---

## 使用流程示意

1. 進入 Step 2 → 看到「智能文件掃描」與「手動輸入」
2. 首次：彈出 VLMApiKeyDrawer，選擇 Provider、輸入 API Key、儲存
3. 上傳文件 → 上傳中 → AI 解析中（約 5–8 秒）
4. 顯示解析結果（所有權人、地址、驗證圖示、信度）
5. 「一鍵帶入全部」或「選擇性帶入」
6. 可手動修改後繼續下一步

---

## UI 狀態建議

- **未上傳**: 說明文字 + 「選擇檔案上傳」「設定 API Key」
- **上傳中**: 進度/旋轉圖示
- **解析中**: 「AI 解析中...」
- **解析完成**: 欄位預覽、驗證圖示、信度、「一鍵帶入全部」「選擇性帶入」

---

## 錯誤處理範例

### 無 API Key

```tsx
if (!hasKey) {
  return (
    <Alert>
      <AlertDescription>請先設定 VLM API Key 以啟用智能掃描</AlertDescription>
      <Button onClick={() => setShowKeyDrawer(true)}>設定 API Key</Button>
    </Alert>
  )
}
```

### 上傳／解析失敗

- 顯示錯誤訊息與「重新嘗試」或「上傳其他文件」。

---

## 進階（未來）

- 批次上傳（mode="batch", maxFiles）
- 自訂驗證規則（validators）
- 解析歷史（showHistory, onHistorySelect）

---

## 相關文檔

- [實作總結](./implementation_summary.md)
- [快速啟動](./quickstart.md)

---

**最後更新**: 2026-02-15
