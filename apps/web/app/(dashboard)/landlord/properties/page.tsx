'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import Image from 'next/image'

interface Property {
  id: string
  title: string
  address: string
  type: 'rental' | 'sale'
  status: 'available' | 'rented' | 'sold'
  price: number
  area: number
  imageUrl: string
  created_at: string
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'rental' | 'sale'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'rented' | 'sold'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'price_high' | 'price_low'>('newest')

  useEffect(() => {
    // TODO: 從 Supabase 查詢實際數據
    // 目前使用模擬數據
    setProperties([
      {
        id: '1',
        title: '台北市大安區精緻公寓',
        address: '台北市大安區和平東路三段',
        type: 'rental',
        status: 'available',
        price: 25000,
        area: 25,
        imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
        created_at: '2026-01-15',
      },
      {
        id: '2',
        title: '新竹市東區溫馨套房',
        address: '新竹市東區光復路二段',
        type: 'rental',
        status: 'rented',
        price: 12000,
        area: 15,
        imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
        created_at: '2026-01-10',
      },
      {
        id: '3',
        title: '台中市西屯區豪華別墅',
        address: '台中市西屯區文心路三段',
        type: 'sale',
        status: 'available',
        price: 25000000,
        area: 120,
        imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
        created_at: '2026-01-20',
      },
    ])
  }, [])

  const filteredProperties = properties
    .filter((p) => {
      if (searchTerm && !p.title.toLowerCase().includes(searchTerm.toLowerCase()) && !p.address.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      if (filterType !== 'all' && p.type !== filterType) {
        return false
      }
      if (filterStatus !== 'all' && p.status !== filterStatus) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_high':
          return b.price - a.price
        case 'price_low':
          return a.price - b.price
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const getStatusBadge = (status: string) => {
    const badges = {
      available: { text: '可出租', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
      rented: { text: '已出租', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
      sold: { text: '已售出', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
    }
    const badge = badges[status as keyof typeof badges] || badges.available
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded border ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  const formatPrice = (price: number, type: string) => {
    if (type === 'sale') {
      return `NT$ ${(price / 10000).toFixed(0)} 萬`
    }
    return `NT$ ${price.toLocaleString()} /月`
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">我的物件</h1>
          <p className="text-[#999999] mt-1">管理您的所有出租與出售物件</p>
        </div>
        <Link href="/landlord/properties/add">
          <Button>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增物件
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                type="text"
                placeholder="搜尋物件標題或地址..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-3 bg-[#2A2A2A] border border-[#333333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            >
              <option value="all">所有類型</option>
              <option value="rental">出租</option>
              <option value="sale">出售</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-3 bg-[#2A2A2A] border border-[#333333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            >
              <option value="all">所有狀態</option>
              <option value="available">可出租/售</option>
              <option value="rented">已出租</option>
              <option value="sold">已售出</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-[#999999]">
              共找到 <span className="text-white font-medium">{filteredProperties.length}</span> 個物件
            </p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-[#2A2A2A] border border-[#333333] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            >
              <option value="newest">最新發布</option>
              <option value="price_high">價格：高到低</option>
              <option value="price_low">價格：低到高</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-[#333333] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">沒有找到物件</h3>
            <p className="text-[#999999] mb-6">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? '請嘗試調整搜尋條件'
                : '開始新增您的第一個物件'}
            </p>
            <Link href="/landlord/properties/add">
              <Button>新增物件</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <Link key={property.id} href={`/landlord/properties/${property.id}`}>
              <Card hoverable className="h-full">
                <div className="relative h-48 rounded-t-xl overflow-hidden">
                  <Image
                    src={property.imageUrl}
                    alt={property.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(property.status)}
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-black/50 text-white backdrop-blur-sm">
                      {property.type === 'rental' ? '出租' : '出售'}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">
                    {property.title}
                  </h3>
                  <p className="text-sm text-[#999999] mb-4 line-clamp-1">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {property.address}
                  </p>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-[#7C3AED]">
                        {formatPrice(property.price, property.type)}
                      </p>
                      <p className="text-xs text-[#999999] mt-1">{property.area} 坪</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      查看詳情
                    </Button>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
