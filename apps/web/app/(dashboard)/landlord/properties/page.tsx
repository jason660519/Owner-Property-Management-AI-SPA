'use client'

import { useEffect, useMemo, useState } from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import Image from 'next/image'
import { getMyProperties, type MyPropertyItem } from '@/lib/actions/properties'
import { PropertyListTable } from './PropertyListTable'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<MyPropertyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'rental' | 'sale'>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'price_high' | 'price_low'>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    async function fetchProperties() {
      setLoading(true)
      setError(null)
      try {
        const result = await getMyProperties()
        if (result.success) {
          setProperties(result.properties)
        } else {
          setError(result.error || '無法載入物件資料')
        }
      } catch (err) {
        console.error('[PropertiesPage] fetch error:', err)
        setError('載入物件資料時發生錯誤')
      } finally {
        setLoading(false)
      }
    }
    fetchProperties()
  }, [])


  const filteredProperties = useMemo(
    () =>
      properties.filter((p) => {
        if (
          searchTerm &&
          !p.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !p.address.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false
        }
        if (filterType !== 'all' && p.type !== filterType) {
          return false
        }
        if (filterStatus !== 'all' && p.status !== filterStatus) {
          return false
        }
        return true
      }),
    [properties, searchTerm, filterType, filterStatus]
  )

  const gridSortedProperties = useMemo(() => {
    const sorted = [...filteredProperties]
    sorted.sort((a, b) => {
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
    return sorted
  }, [filteredProperties, sortBy])

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      // 出售物件狀態
      available: { text: '待售', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
      pending: { text: '交易中', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
      sold: { text: '已售出', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
      // 出租物件狀態
      vacant: { text: '待出租', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
      occupied: { text: '已出租', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
      maintenance: { text: '維護中', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
      // 共用
      archived: { text: '已封存', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
    }
    const badge = badges[status] || { text: status, color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' }
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
          <h1 className="text-3xl font-bold text-text-primary">我的物件</h1>
          <p className="mt-1 text-text-muted">管理您的所有出租與出售物件</p>
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
              onChange={(e) => {
                const value = e.target.value
                if (value === 'all' || value === 'rental' || value === 'sale') {
                  setFilterType(value)
                }
              }}
              className="rounded-lg border border-border-default bg-bg-secondary px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">所有類型</option>
              <option value="rental">出租</option>
              <option value="sale">出售</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-border-default bg-bg-secondary px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">所有狀態</option>
              <option value="available">待售</option>
              <option value="vacant">待出租</option>
              <option value="occupied">已出租</option>
              <option value="pending">交易中</option>
              <option value="sold">已售出</option>
              <option value="maintenance">維護中</option>
              <option value="archived">已封存</option>
            </select>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-muted">
              共找到 <span className="font-medium text-text-primary">{filteredProperties.length}</span> 個物件
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-lg border border-border-default bg-bg-primary p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-accent text-white'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  aria-pressed={viewMode === 'grid'}
                >
                  <LayoutGrid className="h-4 w-4" aria-hidden />
                  網格
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-accent text-white'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  aria-pressed={viewMode === 'list'}
                >
                  <List className="h-4 w-4" aria-hidden />
                  列表
                </button>
              </div>
              {viewMode === 'grid' ? (
                <select
                  value={sortBy}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === 'newest' || value === 'price_high' || value === 'price_low') {
                      setSortBy(value)
                    }
                  }}
                  className="rounded-lg border border-border-default bg-bg-secondary px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="newest">最新發布</option>
                  <option value="price_high">價格：高到低</option>
                  <option value="price_low">價格：低到高</option>
                </select>
              ) : (
                <span className="text-xs text-text-muted">列表模式：點欄位標題排序</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Properties Grid */}
      {loading ? (
        <Card>
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-text-muted">載入中...</p>
          </div>
        </Card>
      ) : error ? (
        <Card>
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-text-primary">載入失敗</h3>
            <p className="mb-6 text-text-muted">{error}</p>
            <Button onClick={() => window.location.reload()}>重新載入</Button>
          </div>
        </Card>
      ) : filteredProperties.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-tertiary">
              <svg className="h-8 w-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-text-primary">沒有找到物件</h3>
            <p className="mb-6 text-text-muted">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? '請嘗試調整搜尋條件'
                : '開始新增您的第一個物件'}
            </p>
            <Link href="/landlord/properties/add">
              <Button>新增物件</Button>
            </Link>
          </div>
        </Card>
      ) : viewMode === 'list' ? (
        <PropertyListTable
          data={filteredProperties}
          onStatusPatched={(patch) => {
            const now = new Date().toISOString()
            setProperties((prev) =>
              prev.map((p) => {
                const hit = patch.find((x) => x.id === p.id && x.type === p.type)
                return hit ? { ...p, status: hit.status, updated_at: now } : p
              })
            )
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gridSortedProperties.map((property) => (
            <Link key={property.id} href={`/landlord/properties/${property.id}`}>
              <Card hoverable className="h-full">
                <div className="relative h-48 overflow-hidden rounded-t-xl bg-bg-secondary">
                  {property.imageUrl ? (
                    <Image
                      src={property.imageUrl}
                      alt={property.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="h-12 w-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  )}
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
                  <h3 className="mb-2 line-clamp-1 text-lg font-semibold text-text-primary">
                    {property.title}
                  </h3>
                  <p className="mb-4 line-clamp-1 text-sm text-text-muted">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {property.address}
                  </p>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-accent">
                        {formatPrice(property.price, property.type)}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">{property.area} 坪</p>
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
