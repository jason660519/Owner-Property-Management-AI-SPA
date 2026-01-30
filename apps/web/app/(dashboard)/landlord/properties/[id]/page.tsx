'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Image from 'next/image'
import Link from 'next/link'

interface PropertyDetailsProps {
  params: Promise<{ id: string }>
}

interface PropertyDetail {
  id: string
  title: string
  address: string
  type: 'rental' | 'sale'
  status: 'available' | 'rented' | 'sold'
  price: number
  area: number
  bedrooms: number
  bathrooms: number
  floor: number
  totalFloors: number
  description: string
  images: string[]
  ownerName: string
  buildingNumber?: string
  landNumber?: string
  createdAt: string
}

export default function PropertyDetailPage({ params }: PropertyDetailsProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    // TODO: 從 Supabase 查詢實際數據
    // 目前使用模擬數據
    setProperty({
      id: resolvedParams.id,
      title: '台北市大安區精緻公寓',
      address: '台北市大安區和平東路三段 123 號',
      type: 'rental',
      status: 'available',
      price: 25000,
      area: 25,
      bedrooms: 2,
      bathrooms: 1,
      floor: 5,
      totalFloors: 12,
      description: '位於大安區精華地段的優質公寓，鄰近捷運站僅需步行 5 分鐘，周邊生活機能完善，有全聯、家樂福等購物商場。\n\n房屋採光良好，南北通風，格局方正實用。社區管理完善，24小時保全服務，讓您住得安心。\n\n適合小家庭或上班族居住。',
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200',
      ],
      ownerName: '張先生',
      buildingNumber: 'A12345678',
      landNumber: 'L98765432',
      createdAt: '2026-01-15',
    })
  }, [resolvedParams.id])

  if (!property) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#999999]">載入中...</p>
        </div>
      </div>
    )
  }

  const formatPrice = (price: number, type: string) => {
    if (type === 'sale') {
      return `NT$ ${(price / 10000).toFixed(0)} 萬`
    }
    return `NT$ ${price.toLocaleString()} /月`
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      available: { text: '可出租', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
      rented: { text: '已出租', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
      sold: { text: '已售出', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
    }
    const badge = badges[status as keyof typeof badges] || badges.available
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded border ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/landlord/properties" className="text-[#999999] hover:text-white">
            我的物件
          </Link>
          <span className="text-[#666666]">/</span>
          <span className="text-white">物件詳情</span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/landlord/properties/${property.id}/edit`)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            編輯
          </Button>
          <Button variant="danger">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            刪除
          </Button>
        </div>
      </div>

      {/* Image Gallery */}
      <Card padding="none">
        <div className="relative h-96">
          <Image
            src={property.images[currentImageIndex]}
            alt={property.title}
            fill
            className="object-cover rounded-t-xl"
          />
          
          {/* Navigation Arrows */}
          {property.images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentImageIndex((prev) => (prev === property.images.length - 1 ? 0 : prev + 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Image Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white text-sm backdrop-blur-sm">
            {currentImageIndex + 1} / {property.images.length}
          </div>
        </div>

        {/* Thumbnails */}
        <div className="p-4 flex gap-2 overflow-x-auto">
          {property.images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                currentImageIndex === index ? 'border-[#7C3AED]' : 'border-transparent'
              }`}
            >
              <Image src={image} alt={`${property.title} ${index + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      </Card>

      {/* Property Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">{property.title}</CardTitle>
                  <p className="text-[#999999] flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {property.address}
                  </p>
                </div>
                {getStatusBadge(property.status)}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <h3 className="text-4xl font-bold text-[#7C3AED] mb-2">
                  {formatPrice(property.price, property.type)}
                </h3>
                <p className="text-sm text-[#999999]">
                  {property.type === 'rental' ? '每月租金' : '售價'}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-[#2A2A2A] rounded-lg">
                  <p className="text-2xl font-bold text-white mb-1">{property.area}</p>
                  <p className="text-xs text-[#999999]">坪</p>
                </div>
                <div className="text-center p-4 bg-[#2A2A2A] rounded-lg">
                  <p className="text-2xl font-bold text-white mb-1">{property.bedrooms}</p>
                  <p className="text-xs text-[#999999]">房</p>
                </div>
                <div className="text-center p-4 bg-[#2A2A2A] rounded-lg">
                  <p className="text-2xl font-bold text-white mb-1">{property.bathrooms}</p>
                  <p className="text-xs text-[#999999]">衛</p>
                </div>
                <div className="text-center p-4 bg-[#2A2A2A] rounded-lg">
                  <p className="text-2xl font-bold text-white mb-1">{property.floor}</p>
                  <p className="text-xs text-[#999999]">樓層</p>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-3">物件描述</h4>
                <p className="text-[#999999] whitespace-pre-line leading-relaxed">
                  {property.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle>物件詳細資訊</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#999999] mb-1">物件類型</p>
                  <p className="text-white">{property.type === 'rental' ? '出租' : '出售'}</p>
                </div>
                <div>
                  <p className="text-sm text-[#999999] mb-1">所在樓層</p>
                  <p className="text-white">{property.floor} 樓 / 共 {property.totalFloors} 樓</p>
                </div>
                <div>
                  <p className="text-sm text-[#999999] mb-1">建號</p>
                  <p className="text-white">{property.buildingNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-[#999999] mb-1">地號</p>
                  <p className="text-white">{property.landNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-[#999999] mb-1">所有權人</p>
                  <p className="text-white">{property.ownerName}</p>
                </div>
                <div>
                  <p className="text-sm text-[#999999] mb-1">發布日期</p>
                  <p className="text-white">{new Date(property.createdAt).toLocaleDateString('zh-TW')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>快速操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button fullWidth variant="primary">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                分享物件
              </Button>
              <Button fullWidth variant="outline">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                預覽頁面
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>統計資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[#999999]">瀏覽次數</span>
                <span className="text-white font-semibold">156</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#999999]">收藏次數</span>
                <span className="text-white font-semibold">23</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#999999]">詢問次數</span>
                <span className="text-white font-semibold">8</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
