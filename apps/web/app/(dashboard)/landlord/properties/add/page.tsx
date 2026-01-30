'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

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
  auxiliary_area_sqm: z.number().optional(),
  common_area_sqm: z.number().optional(),
  
  // Step 4: 其他資料
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  floor: z.number().optional(),
  total_floors: z.number().optional(),
  description: z.string().optional(),
})

type AddPropertyFormData = z.infer<typeof addPropertySchema>

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
    defaultValues: {
      type: 'rental',
    },
  })

  const totalSteps = 5
  const mainAreaSqm = watch('main_area_sqm')
  const auxiliaryAreaSqm = watch('auxiliary_area_sqm')
  const commonAreaSqm = watch('common_area_sqm')

  // m² to 坪 conversion (1 m² = 0.3025 坪)
  const sqmToPing = (sqm: number) => (sqm * 0.3025).toFixed(2)
  const pingToSqm = (ping: number) => (ping / 0.3025).toFixed(2)

  const onSubmit = async (data: AddPropertyFormData) => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // TODO: 上傳至 Supabase
      console.log('提交物件資料:', data)
      
      // 模擬 API 請求
      await new Promise((resolve) => setTimeout(resolve, 1000))
      
      router.push('/landlord/properties')
    } catch (err: any) {
      setError(err.message || '新增物件失敗，請稍後再試')
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
      </div>

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
      <form onSubmit={handleSubmit(onSubmit)}>
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

                <div className="space-y-4">
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

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="附屬建物面積（平方公尺）"
                      type="number"
                      step="0.01"
                      placeholder="陽台、雨遮等（選填）"
                      {...register('auxiliary_area_sqm', { valueAsNumber: true })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">換算（坪）</label>
                      <div className="px-4 py-3 bg-[#2A2A2A] border border-[#333333] rounded-lg text-[#999999]">
                        {auxiliaryAreaSqm ? sqmToPing(auxiliaryAreaSqm) : '0.00'} 坪
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="公共設施面積（平方公尺）"
                      type="number"
                      step="0.01"
                      placeholder="停車位等（選填）"
                      {...register('common_area_sqm', { valueAsNumber: true })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">換算（坪）</label>
                      <div className="px-4 py-3 bg-[#2A2A2A] border border-[#333333] rounded-lg text-[#999999]">
                        {commonAreaSqm ? sqmToPing(commonAreaSqm) : '0.00'} 坪
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#2A2A2A] border border-[#333333] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">總面積</span>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#7C3AED]">
                          {sqmToPing((mainAreaSqm || 0) + (auxiliaryAreaSqm || 0) + (commonAreaSqm || 0))} 坪
                        </p>
                        <p className="text-sm text-[#999999]">
                          {((mainAreaSqm || 0) + (auxiliaryAreaSqm || 0) + (commonAreaSqm || 0)).toFixed(2)} m²
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
              <div className="space-y-4">
                <div className="border-2 border-dashed border-[#333333] rounded-lg p-12 text-center hover:border-[#7C3AED] transition-colors cursor-pointer">
                  <svg className="w-12 h-12 text-[#666666] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-white font-medium mb-2">點擊或拖曳照片至此處上傳</p>
                  <p className="text-sm text-[#999999]">支援 JPG、PNG、HEIC 格式，單檔最大 10MB</p>
                  <p className="text-sm text-[#999999] mt-1">可上傳最多 20 張照片</p>
                </div>

                <div className="bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-lg p-4">
                  <p className="text-sm text-[#7C3AED]">
                    💡 提示：第一張照片將作為主圖顯示，建議上傳高質量的物件外觀或客廳照片
                  </p>
                </div>
              </div>
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
                <Button type="button" variant="ghost">
                  儲存草稿
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isLoading}
                >
                  {currentStep === totalSteps ? '完成' : '下一步'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </form>
    </div>
  )
}
