'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuxiliaryBuildingsManager, type AuxiliaryBuilding } from '@/components/property/AuxiliaryBuildingsManager'
import { ParkingManager, type ParkingSpace } from '@/components/property/ParkingManager'
import { PhotoUpload, type Photo } from '@/components/property/PhotoUpload'
import { useFormDraft } from '@/hooks/useFormDraft'
import { useToast } from '@/components/ui/Toast'
import { createProperty, uploadPropertyPhoto } from '@/lib/actions/properties'
import { Save, FolderOpen } from 'lucide-react'

const addPropertySchema = z.object({
  // Step 1: 基本資料
  title: z.string().min(5, '標題至少需要 5 個字元'),
  address: z.string().min(5, '地址至少需要 5 個字元'),
  type: z.enum(['rental', 'sale']),
  price: z.number().min(1, '請輸入價格'),

  // Step 2: 權狀資料
  owner_name: z.string().min(2, '所有權人姓名至少需要 2 個字元'),
  owner_contact: z.string().optional(),
  building_number: z.string().optional(),
  land_number: z.string().optional(),

  // Step 3: 面積資料
  main_area_sqm: z.number().min(1, '請輸入主建物面積'),
  auxiliary_buildings: z.array(z.object({
    id: z.string(),
    name: z.string(),
    area_sqm: z.number(),
    location: z.string(),
  })).optional(),
  parking_spaces: z.array(z.object({
    id: z.string(),
    type: z.enum(['independent', 'shared']),
    category: z.string(),
    number: z.string(),
    area_sqm: z.number(),
    location: z.string(),
  })).optional(),
  common_area_sqm: z.number().optional(),

  // Step 4: 其他資料
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  floor: z.number().optional(),
  total_floors: z.number().optional(),
  description: z.string().optional(),

  // Step 5: 照片上傳
  photos: z.array(z.object({
    id: z.string(),
    url: z.string(),
    file: z.any().nullable(),
    name: z.string().optional(),
  })).optional(),
})

type AddPropertyFormData = z.infer<typeof addPropertySchema>

export default function AddPropertyPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDraftDrawer, setShowDraftDrawer] = useState(false)
  const [draftName, setDraftName] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<AddPropertyFormData>({
    resolver: zodResolver(addPropertySchema),
    mode: 'onChange',
    defaultValues: {
      type: 'rental',
      auxiliary_buildings: [],
      parking_spaces: [],
      photos: [],
    },
  })

  // Draft management
  const {
    drafts,
    saveDraft,
    loadDraft,
    deleteDraft,
    renameDraft,
    lastSavedAt,
  } = useFormDraft<AddPropertyFormData>('property_add_form')

  const totalSteps = 5
  const mainAreaSqm = watch('main_area_sqm')
  const auxiliaryBuildings = watch('auxiliary_buildings') || []
  const parkingSpaces = watch('parking_spaces') || []
  const commonAreaSqm = watch('common_area_sqm')
  const photos = watch('photos') || []

  // Helper: 將 data URL 轉回 File（用於從草稿還原照片後上傳到 Supabase）
  const dataUrlToFile = (dataUrl: string, defaultFileName: string): File | null => {
    try {
      const arr = dataUrl.split(',')
      if (arr.length !== 2) {
        return null
      }
      const mimeMatch = arr[0].match(/data:(.*?);base64/)
      const mime = mimeMatch?.[1] || 'image/jpeg'
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }
      return new File([u8arr], defaultFileName, { type: mime })
    } catch (error) {
      console.error('[Submit] 無法從 data URL 還原檔案:', error)
      return null
    }
  }

  // m² to 坪 conversion (1 m² = 0.3025 坪)
  const sqmToPing = (sqm: number) => (sqm * 0.3025).toFixed(2)
  const pingToSqm = (ping: number) => (ping / 0.3025).toFixed(2)

  // Draft handlers
  const handleSaveDraft = async (customName?: string) => {
    const formData = watch()
    try {
      // 使用物件標題作為預設檔名
      const title = formData.title || '未命名物件'
      const defaultName = `${title} - ${formData.type === 'rental' ? '出租' : '出售'}`
      const finalName = customName || draftName.trim() || defaultName

      await saveDraft(formData, finalName)
      setError(null)
      setDraftName('')

      // 更友善的提示訊息
      alert(`✅ 草稿已儲存！\n\n檔名: ${finalName}`)
    } catch (err: any) {
      setError(err.message || '儲存草稿失敗')
      alert(`❌ ${err.message || '儲存草稿失敗'}`)
    }
  }

  // Quick save handler (for button click)
  const handleQuickSave = () => {
    handleSaveDraft()
  }

  const handleLoadDraft = (draftId: string) => {
    const data = loadDraft(draftId)
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        setValue(key as keyof AddPropertyFormData, value)
      })
      setShowDraftDrawer(false)
      alert('草稿已載入！')
    }
  }

  const handleNext = async () => {
    let fieldsToValidate: (keyof AddPropertyFormData)[] = []
    
    // 根據當前步驟驗證對應欄位
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['title', 'address', 'type', 'price']
        break
      case 2:
        fieldsToValidate = ['owner_name']
        break
      case 3:
        fieldsToValidate = ['main_area_sqm']
        break
      case 4:
        // 第4步都是選填，不需要驗證
        setCurrentStep(currentStep + 1)
        return
      case 5:
        // 第5步是照片上傳，暫時跳過
        setCurrentStep(currentStep + 1)
        return
    }

    // 驗證當前步驟的欄位
    const isValid = await trigger(fieldsToValidate)
    
    if (isValid) {
      setCurrentStep(currentStep + 1)
    }
  }

  const onSubmit = async (data: AddPropertyFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('[Submit] 開始提交物件資料...', {
        title: data.title,
        type: data.type,
        address: data.address,
      })

      // Step 1: 創建物件記錄
      showToast({
        type: 'info',
        message: '正在儲存物件資料...',
        description: '請稍候，正在處理中',
      })

      const result = await createProperty({
        title: data.title,
        address: data.address,
        type: data.type,
        price: data.price,
        owner_name: data.owner_name,
        owner_contact: data.owner_contact,
        building_number: data.building_number,
        land_number: data.land_number,
        main_area_sqm: data.main_area_sqm,
        auxiliary_buildings: data.auxiliary_buildings,
        parking_spaces: data.parking_spaces,
        common_area_sqm: data.common_area_sqm,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        floor: data.floor,
        total_floors: data.total_floors,
        description: data.description,
      })

      if (!result.success) {
        console.error('[Submit] 物件創建失敗:', result.error)
        throw new Error(result.error || '物件創建失敗')
      }

      const propertyId = result.property_id!
      console.log('[Submit] 物件創建成功:', propertyId)

      // Step 2: 上傳照片（如果有）
      if (data.photos && data.photos.length > 0) {
        showToast({
          type: 'info',
          message: `正在上傳照片 (0/${data.photos.length})...`,
        })

        let uploadedCount = 0
        const uploadErrors: string[] = []

        for (let i = 0; i < data.photos.length; i++) {
          const photo = data.photos[i]

          // 1️⃣ 優先使用現有的 File（同一瀏覽器 session 內）
          let file = photo.file as File | null

          // 2️⃣ 若 File 已被草稿序列化移除，但 url 為 data URL，則嘗試還原為 File
          if (!file && typeof photo.url === 'string' && photo.url.startsWith('data:')) {
            const fallbackName = photo.name || `property-photo-${i + 1}.jpg`
            file = dataUrlToFile(photo.url, fallbackName)
          }

          if (!file) {
            console.warn('[Submit] 照片缺少有效檔案，跳過:', photo.id)
            continue
          }

          const isPrimary = i === 0 // 第一張照片為主圖
          const uploadResult = await uploadPropertyPhoto(propertyId, data.type, file, isPrimary)

          if (uploadResult.success) {
            uploadedCount++
            console.log(`[Submit] 照片上傳成功 (${uploadedCount}/${data.photos.length}):`, uploadResult.storage_path)
          } else {
            uploadErrors.push(`照片 ${i + 1}: ${uploadResult.error}`)
            console.error(`[Submit] 照片上傳失敗:`, uploadResult.error)
          }
        }

        if (uploadErrors.length > 0) {
          console.warn('[Submit] 部分照片上傳失敗:', uploadErrors)
        }
      }

      // Step 3: 顯示成功訊息
      showToast({
        type: 'success',
        message: '✅ 物件新增成功！',
        description: `物件「${data.title}」已儲存至 ${data.type === 'rental' ? 'Property_Rentals' : 'Property_Sales'} 資料表`,
      })

      console.log('[Submit] 完成！準備跳轉到列表頁')

      // Step 4: 等待 1 秒後跳轉（讓用戶看到成功訊息）
      await new Promise((resolve) => setTimeout(resolve, 1000))
      router.push('/landlord/properties')
    } catch (err: any) {
      console.error('[Submit] 提交失敗:', err)
      const errorMessage = err.message || '新增物件失敗，請稍後再試'

      setError(errorMessage)
      showToast({
        type: 'error',
        message: '❌ 新增物件失敗',
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const steps = [
    { number: 1, title: '基本資料', description: '物件類型、地址、價格' },
    { number: 2, title: '權狀資料', description: '所有權人、建號、地號' },
    { number: 3, title: '面積換算', description: '主建物、附屬建物、公設面積' },
    { number: 4, title: '物件詳情', description: '房間數、樓層、描述' },
    { number: 5, title: '照片上傳', description: '上傳物件照片' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">新增物件</h1>
        <p className="text-[#999999] mt-1">填寫物件資訊以新增至您的物件清單</p>
        {lastSavedAt && (
          <p className="text-xs text-[#666666] mt-1">
            最後儲存: {lastSavedAt.toLocaleString('zh-TW')}
          </p>
        )}
      </div>

      {/* Draft Management Drawer */}
      {showDraftDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>草稿管理</CardTitle>
                <button
                  onClick={() => setShowDraftDrawer(false)}
                  className="text-[#999999] hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <CardDescription>選擇要載入的草稿，或管理現有草稿</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Save New Draft */}
              <div className="bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-lg p-4 space-y-3">
                <label className="block text-sm text-white font-medium">儲存當前表單為草稿</label>
                <div className="space-y-2">
                  {/* 顯示預設檔名預覽 */}
                  {watch('title') && (
                    <div className="text-xs text-[#999999]">
                      預設檔名: {watch('title')} - {watch('type') === 'rental' ? '出租' : '出售'}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder={
                        watch('title')
                          ? `預設: ${watch('title')} - ${watch('type') === 'rental' ? '出租' : '出售'}`
                          : '輸入自訂名稱（選填）'
                      }
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        handleSaveDraft()
                        setShowDraftDrawer(false)
                      }}
                    >
                      儲存
                    </Button>
                  </div>
                </div>
              </div>

              {/* Draft List */}
              {drafts.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm text-[#999999] font-medium">
                    已儲存的草稿 ({drafts.length}/10)
                  </h4>
                  {drafts.map((draft) => {
                    const draftData = draft.data as AddPropertyFormData
                    return (
                      <div
                        key={draft.id}
                        className="bg-[#2A2A2A] border border-[#333333] rounded-lg p-3 hover:border-[#7C3AED]/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* 草稿名稱 */}
                            <p className="text-white font-medium truncate">{draft.name}</p>

                            {/* 物件資訊 */}
                            {draftData && (
                              <div className="mt-1 space-y-0.5">
                                {draftData.address && (
                                  <p className="text-xs text-[#999999] truncate">
                                    📍 {draftData.address}
                                  </p>
                                )}
                                {draftData.price && (
                                  <p className="text-xs text-[#999999]">
                                    💰 NT$ {draftData.price.toLocaleString()}
                                    {draftData.type === 'rental' ? '/月' : ''}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* 儲存時間 */}
                            <p className="text-xs text-[#666666] mt-1">
                              儲存於 {new Date(draft.savedAt).toLocaleString('zh-TW', {
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>

                          {/* 操作按鈕 */}
                          <div className="flex flex-col gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleLoadDraft(draft.id)}
                            >
                              載入
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`確定要刪除「${draft.name}」？`)) {
                                  deleteDraft(draft.id)
                                }
                              }}
                              className="text-red-500 hover:text-red-400"
                            >
                              刪除
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-[#666666] text-sm">
                  尚無儲存的草稿
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      currentStep >= step.number
                        ? 'bg-[#7C3AED] text-white'
                        : 'bg-[#333333] text-[#666666]'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </div>
                  <p className={`text-xs mt-2 text-center ${currentStep >= step.number ? 'text-white' : 'text-[#666666]'}`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.number ? 'bg-[#7C3AED]' : 'bg-[#333333]'}`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {/* Step 1: 基本資料 */}
            {currentStep === 1 && (
              <>
                <Input
                  label="物件標題"
                  placeholder="例：台北市大安區精緻公寓"
                  error={errors.title?.message}
                  required
                  {...register('title')}
                />

                <Input
                  label="完整地址"
                  placeholder="例：台北市大安區和平東路三段 123 號"
                  error={errors.address?.message}
                  required
                  {...register('address')}
                />

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    物件類型 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: 'rental', label: '出租', icon: '🏠' },
                      { value: 'sale', label: '出售', icon: '💰' },
                    ].map((option) => (
                      <label key={option.value} className="relative">
                        <input
                          type="radio"
                          value={option.value}
                          {...register('type')}
                          className="peer sr-only"
                        />
                        <div className="p-4 border border-[#333333] rounded-lg text-center cursor-pointer transition-colors peer-checked:border-[#7C3AED] peer-checked:bg-[#7C3AED]/10 hover:border-[#7C3AED]/50">
                          <span className="text-2xl mb-2 block">{option.icon}</span>
                          <span className="text-white font-medium">{option.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <Input
                  label="價格"
                  type="number"
                  placeholder={watch('type') === 'rental' ? '每月租金 (TWD)' : '售價 (TWD)'}
                  error={errors.price?.message}
                  required
                  {...register('price', { valueAsNumber: true })}
                />
              </>
            )}

            {/* Step 2: 權狀資料 */}
            {currentStep === 2 && (
              <>
                <Input
                  label="所有權人姓名"
                  placeholder="請輸入所有權人姓名"
                  error={errors.owner_name?.message}
                  required
                  {...register('owner_name')}
                />

                <Input
                  label="聯絡地址"
                  placeholder="所有權人聯絡地址（選填）"
                  error={errors.owner_contact?.message}
                  {...register('owner_contact')}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="建號"
                    placeholder="例：A12345678（選填）"
                    error={errors.building_number?.message}
                    {...register('building_number')}
                  />

                  <Input
                    label="地號"
                    placeholder="例：L98765432（選填）"
                    error={errors.land_number?.message}
                    {...register('land_number')}
                  />
                </div>
              </>
            )}

            {/* Step 3: 面積換算 */}
            {currentStep === 3 && (
              <>
                <div className="bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-lg p-4">
                  <p className="text-sm text-[#7C3AED] flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    自動換算：1 平方公尺 = 0.3025 坪
                  </p>
                </div>

                <div className="space-y-6">
                  {/* 主建物面積 */}
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="主建物面積（平方公尺）"
                      type="number"
                      step="0.01"
                      placeholder="例：30.5"
                      error={errors.main_area_sqm?.message}
                      required
                      {...register('main_area_sqm', { valueAsNumber: true })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">換算（坪）</label>
                      <div className="px-4 py-3 bg-[#2A2A2A] border border-[#333333] rounded-lg text-[#7C3AED]">
                        {mainAreaSqm ? sqmToPing(mainAreaSqm) : '0.00'} 坪
                      </div>
                    </div>
                  </div>

                  {/* 附屬建物管理 */}
                  <div className="border-t border-[#333333] pt-6">
                    <AuxiliaryBuildingsManager
                      buildings={auxiliaryBuildings}
                      onChange={(buildings) => setValue('auxiliary_buildings', buildings)}
                    />
                  </div>

                  {/* 車位管理 */}
                  <div className="border-t border-[#333333] pt-6">
                    <ParkingManager
                      parkingSpaces={parkingSpaces}
                      onChange={(spaces) => setValue('parking_spaces', spaces)}
                    />
                  </div>

                  {/* 公共設施面積 */}
                  <div className="border-t border-[#333333] pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="其他公共設施面積（平方公尺）"
                        type="number"
                        step="0.01"
                        placeholder="管委會、健身房等（選填）"
                        {...register('common_area_sqm', { valueAsNumber: true })}
                      />
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">換算（坪）</label>
                        <div className="px-4 py-3 bg-[#2A2A2A] border border-[#333333] rounded-lg text-[#999999]">
                          {commonAreaSqm ? sqmToPing(commonAreaSqm) : '0.00'} 坪
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 總面積計算 */}
                  <div className="bg-[#2A2A2A] border border-[#333333] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">總面積</span>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#7C3AED]">
                          {sqmToPing(
                            (mainAreaSqm || 0) +
                              auxiliaryBuildings.reduce((sum, b) => sum + b.area_sqm, 0) +
                              parkingSpaces.reduce((sum, p) => sum + p.area_sqm, 0) +
                              (commonAreaSqm || 0)
                          )}{' '}
                          坪
                        </p>
                        <p className="text-sm text-[#999999]">
                          {(
                            (mainAreaSqm || 0) +
                            auxiliaryBuildings.reduce((sum, b) => sum + b.area_sqm, 0) +
                            parkingSpaces.reduce((sum, p) => sum + p.area_sqm, 0) +
                            (commonAreaSqm || 0)
                          ).toFixed(2)}{' '}
                          m²
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 4: 物件詳情 */}
            {currentStep === 4 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="房間數"
                    type="number"
                    placeholder="例：3"
                    {...register('bedrooms', { valueAsNumber: true })}
                  />

                  <Input
                    label="衛浴數"
                    type="number"
                    placeholder="例：2"
                    {...register('bathrooms', { valueAsNumber: true })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="所在樓層"
                    type="number"
                    placeholder="例：5"
                    {...register('floor', { valueAsNumber: true })}
                  />

                  <Input
                    label="總樓層"
                    type="number"
                    placeholder="例：12"
                    {...register('total_floors', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">物件描述</label>
                  <textarea
                    className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#333333] rounded-lg text-white placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-colors resize-none"
                    rows={6}
                    placeholder="請描述物件的特色、周邊環境、交通狀況等..."
                    {...register('description')}
                  />
                </div>
              </>
            )}

            {/* Step 5: 照片上傳 */}
            {currentStep === 5 && (
              <PhotoUpload
                photos={photos}
                onChange={(newPhotos) => setValue('photos', newPhotos)}
              />
            )}
          </CardContent>

          {/* Navigation Buttons */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (currentStep > 1) {
                    setCurrentStep(currentStep - 1)
                  } else {
                    router.back()
                  }
                }}
              >
                {currentStep === 1 ? '取消' : '上一步'}
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowDraftDrawer(true)}
                >
                  <FolderOpen className="w-4 h-4 mr-1" />
                  讀取草稿
                </Button>
                <Button type="button" variant="ghost" onClick={handleQuickSave}>
                  <Save className="w-4 h-4 mr-1" />
                  儲存草稿
                </Button>
                {currentStep === totalSteps ? (
                  <Button
                    type="button"
                    variant="primary"
                    loading={isLoading}
                    onClick={handleSubmit(onSubmit)}
                  >
                    完成
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNext}
                  >
                    下一步
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
    </div>
  )
}
