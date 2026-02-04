# VLM 文件掃描整合範例

> **創建日期**: 2026-02-04
> **創建者**: Claude Sonnet 4.5
> **用途**: 展示如何將 VLM 文件掃描整合到現有表單

---

## 整合到新增物件表單

### 修改 `apps/web/app/(dashboard)/landlord/properties/add/page.tsx`

在 Step 2 (權狀資料) 加入 VLM 文件掃描組件：

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Separator } from '@/components/ui/separator'
import { VLMDocumentUpload } from '@/components/vlm/VLMDocumentUpload'

// ... existing schema and types ...

export default function AddPropertyPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddPropertyFormData>({
    resolver: zodResolver(addPropertySchema),
  })

  // Handle VLM auto-fill
  const handleVLMAutoFill = (data: {
    owner_name?: string
    property_address?: string
    building_number?: string
    land_lot_number?: string
  }) => {
    // Auto-fill form fields
    if (data.owner_name) {
      setValue('owner_name', data.owner_name)
    }
    if (data.property_address) {
      setValue('address', data.property_address)
    }
    if (data.building_number) {
      setValue('building_number', data.building_number)
    }
    if (data.land_lot_number) {
      setValue('land_number', data.land_lot_number)
    }
  }

  // ... existing submit handler and other logic ...

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>新增物件</CardTitle>
          <CardDescription>請填寫物件資料</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: 基本資料 */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Step 1: 基本資料</h3>

                <div>
                  <label>物件標題</label>
                  <Input {...register('title')} />
                  {errors.title && <p className="text-red-500">{errors.title.message}</p>}
                </div>

                <div>
                  <label>物件地址</label>
                  <Input {...register('address')} />
                  {errors.address && <p className="text-red-500">{errors.address.message}</p>}
                </div>

                {/* Other Step 1 fields... */}
              </div>
            )}

            {/* Step 2: 權狀資料 (整合 VLM) */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Step 2: 權狀資料</h3>

                {/* VLM Document Scan */}
                <div>
                  <h4 className="text-md font-medium mb-2">智能文件掃描</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    上傳謄本或權狀照片，AI 將自動解析並填入表單
                  </p>
                  <VLMDocumentUpload onComplete={handleVLMAutoFill} />
                </div>

                <Separator className="my-6" />

                {/* Manual Input Fields */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium">手動輸入</h4>

                  <div>
                    <label>所有權人姓名 *</label>
                    <Input {...register('owner_name')} />
                    {errors.owner_name && (
                      <p className="text-red-500">{errors.owner_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label>所有權人聯絡方式</label>
                    <Input {...register('owner_contact')} />
                  </div>

                  <div>
                    <label>建號</label>
                    <Input {...register('building_number')} />
                  </div>

                  <div>
                    <label>地號</label>
                    <Input {...register('land_number')} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3, 4, 5... */}
            {/* ... existing steps ... */}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  上一步
                </Button>
              )}

              {currentStep < 5 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="ml-auto"
                >
                  下一步
                </Button>
              ) : (
                <Button type="submit" className="ml-auto" disabled={isLoading}>
                  {isLoading ? '送出中...' : '送出'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 使用流程示意

### 用戶操作步驟

1. **進入 Step 2 (權狀資料)**
   - 用戶看到「智能文件掃描」區塊和「手動輸入」區塊

2. **首次使用：設定 API Key**
   - 系統自動彈出 VLMApiKeyDrawer
   - 用戶選擇 VLM 提供商 (推薦 Anthropic Claude)
   - 輸入 API Key 並儲存

3. **上傳文件**
   - 點擊「選擇檔案上傳」
   - 選擇謄本或權狀 PDF/照片
   - 系統顯示「上傳中...」

4. **AI 解析**
   - 系統顯示「AI 解析中...」
   - 約 5-8 秒後完成

5. **查看結果**
   - 系統顯示「文件解析完成」
   - 顯示解析出的「所有權人姓名」和「物件地址」
   - 顯示驗證圖示和信度評分

6. **自動填入**
   - 點擊「一鍵帶入全部」
   - 表單欄位自動填入
   - 用戶可手動修改

7. **繼續填寫**
   - 填寫其他必填欄位
   - 點擊「下一步」繼續

---

## UI/UX 設計建議

### 佈局建議

```
┌─────────────────────────────────────────┐
│  Step 2: 權狀資料                        │
├─────────────────────────────────────────┤
│                                         │
│  📄 智能文件掃描                         │
│  上傳謄本或權狀照片，AI 將自動解析...     │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  [📷 選擇檔案上傳] [⚙️ 設定 API Key] │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ─────────── 或 ───────────             │
│                                         │
│  ✏️ 手動輸入                             │
│                                         │
│  所有權人姓名 *                          │
│  ┌───────────────────────────────────┐ │
│  │ [輸入框]                            │ │
│  └───────────────────────────────────┘ │
│                                         │
│  建號                                   │
│  ┌───────────────────────────────────┐ │
│  │ [輸入框]                            │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### 狀態顯示

#### 1. 未上傳狀態
```
┌─────────────────────────────────┐
│  📄 智能文件掃描                 │
│                                 │
│  上傳謄本或權狀照片，AI 將自動解析 │
│  所有權人姓名和物件地址           │
│                                 │
│  [📤 選擇檔案上傳] [⚙️ 設定 API Key] │
└─────────────────────────────────┘
```

#### 2. 上傳中狀態
```
┌─────────────────────────────────┐
│  ⏳ 上傳中...                    │
│                                 │
│  [旋轉圖示]                      │
│  正在將文件上傳至伺服器           │
└─────────────────────────────────┘
```

#### 3. 解析中狀態
```
┌─────────────────────────────────┐
│  🤖 AI 解析中...                 │
│                                 │
│  [旋轉圖示]                      │
│  正在使用 VLM 解析文件內容 (8秒)  │
└─────────────────────────────────┘
```

#### 4. 解析完成狀態
```
┌─────────────────────────────────┐
│  ✅ 文件解析完成    [🟢 高信度 92%] │
│                                 │
│  所有權人姓名 [✓]                │
│  ┌─────────────────────────────┐│
│  │ 王小明                       ││
│  └─────────────────────────────┘│
│                                 │
│  物件地址 [✓]                    │
│  ┌─────────────────────────────┐│
│  │ 台北市大安區忠孝東路四段123號  ││
│  └─────────────────────────────┘│
│                                 │
│  [➡️ 一鍵帶入全部] [✏️ 選擇性帶入]  │
└─────────────────────────────────┘
```

---

## 錯誤處理

### 無 API Key
```tsx
if (!hasKey) {
  return (
    <Alert>
      <Settings className="h-4 w-4" />
      <AlertDescription>
        請先設定 VLM API Key 以啟用智能掃描功能
      </AlertDescription>
      <Button onClick={() => setShowKeyDrawer(true)}>
        設定 API Key
      </Button>
    </Alert>
  )
}
```

### 上傳失敗
```tsx
if (uploadState === 'failed') {
  return (
    <Alert variant="destructive">
      <AlertDescription>
        <strong>上傳失敗</strong>
        <p className="mt-1">{error}</p>
      </AlertDescription>
      <Button variant="outline" onClick={handleRetry}>
        重新嘗試
      </Button>
    </Alert>
  )
}
```

### 解析失敗
```tsx
if (parsedData.status === 'failed') {
  return (
    <Alert variant="destructive">
      <AlertDescription>
        <strong>AI 解析失敗</strong>
        <p className="mt-1">無法識別文件內容，請確認上傳的是謄本或權狀文件</p>
      </AlertDescription>
      <Button variant="outline" onClick={handleUploadAnother}>
        上傳其他文件
      </Button>
    </Alert>
  )
}
```

---

## 進階功能 (未來版本)

### 批次上傳
```tsx
<VLMDocumentUpload
  mode="batch"
  maxFiles={5}
  onComplete={(results) => {
    // Handle multiple results
    results.forEach((result) => {
      // Process each document
    })
  }}
/>
```

### 自訂驗證規則
```tsx
<VLMDocumentUpload
  validators={{
    owner_name: (name) => {
      // Custom validation logic
      return name.length >= 2 && name.length <= 10
    }
  }}
  onComplete={handleAutoFill}
/>
```

### 解析歷史
```tsx
<VLMDocumentUpload
  showHistory={true}
  onHistorySelect={(historyItem) => {
    // Re-use previously parsed result
    handleAutoFill(historyItem.extracted_data)
  }}
/>
```

---

**最後更新**: 2026-02-04
**版本**: 1.0.0
