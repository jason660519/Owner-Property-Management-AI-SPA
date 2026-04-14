'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

interface MyPropertyItem {
  id: string
  title: string
  address: string
  address_city: string | null
  address_district: string | null
  type: 'rental' | 'sale'
  status: string
  price: number
  area: number
  imageUrl: string
  created_at: string
  updated_at: string
}

const landlordSaleStatusValues = ['for_sale', 'pending', 'sold', 'expired', 'invalid'] as const
const landlordRentalStatusValues = [
  'for_rent',
  'collecting_rent',
  'rented',
  'pending',
  'expired',
  'invalid',
] as const

function canonicalStatus(status: string, type: 'sale' | 'rental'): string {
  if (type === 'sale') {
    if (status === 'available') return 'for_sale'
    if (status === 'archived') return 'expired'
    return status
  }

  switch (status) {
    case 'vacant':
      return 'for_rent'
    case 'occupied':
      return 'collecting_rent'
    case 'maintenance':
      return 'pending'
    case 'archived':
      return 'expired'
    default:
      return status
  }
}

function districtLabel(property: MyPropertyItem): string {
  const district = property.address_district?.trim()
  if (district) return district
  const matched = property.address.match(/([^市縣]+?區)/)
  return matched ? matched[1] : ''
}

function isVacantListing(property: MyPropertyItem): boolean {
  const status = canonicalStatus(property.status, property.type)
  if (property.type === 'sale') return status === 'for_sale'
  return status === 'for_rent'
}

const STATUS_LABEL: Record<string, string> = {
  for_sale: '待售',
  for_rent: '待出租',
  collecting_rent: '收租中',
  rented: '已出租',
  pending: '處理中',
  sold: '已售出',
  expired: '已失效',
  invalid: '無效',
  available: '待售',
  vacant: '待出租',
  occupied: '已出租',
  maintenance: '維護中',
  archived: '已封存',
}

function statusBadgeVariant(
  status: string,
  type: 'sale' | 'rental',
): 'success' | 'warning' | 'error' | 'info' | 'default' | 'secondary' {
  const normalized = canonicalStatus(status, type)
  if (normalized === 'for_sale' || normalized === 'for_rent') return 'success'
  if (normalized === 'collecting_rent' || normalized === 'rented') return 'info'
  if (normalized === 'pending') return 'warning'
  if (normalized === 'invalid') return 'error'
  return 'secondary'
}

function formatPrice(price: number, type: 'sale' | 'rental'): string {
  if (type === 'sale') {
    return `NT$ ${(price / 10000).toFixed(0)} 萬`
  }
  return `NT$ ${price.toLocaleString()} /月`
}

const selectClass =
  'px-4 py-3 bg-bg-secondary border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<MyPropertyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'rental' | 'sale'>('all')
  const [filterDistrict, setFilterDistrict] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState<
    'newest' | 'price_high' | 'price_low' | 'district_az' | 'district_za' | 'status_az'
  >('newest')
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProperties() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/landlord/properties')
        const result = (await response.json()) as {
          success: boolean
          properties: MyPropertyItem[]
          error?: string
        }
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

    void fetchProperties()
  }, [])

  const districtOptions = useMemo(() => {
    const options = new Set<string>()
    for (const property of properties) {
      const district = districtLabel(property)
      if (district) options.add(district)
    }
    return [...options].sort((a, b) => a.localeCompare(b, 'zh-Hant'))
  }, [properties])

  const filteredProperties = useMemo(() => {
    return [...properties]
      .filter((property) => {
        if (
          searchTerm &&
          !property.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !property.address.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false
        }
        if (filterType !== 'all' && property.type !== filterType) {
          return false
        }
        if (filterStatus !== 'all' && canonicalStatus(property.status, property.type) !== filterStatus) {
          return false
        }
        if (filterDistrict !== 'all' && districtLabel(property) !== filterDistrict) {
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
          case 'district_az':
            return districtLabel(a).localeCompare(districtLabel(b), 'zh-Hant')
          case 'district_za':
            return districtLabel(b).localeCompare(districtLabel(a), 'zh-Hant')
          case 'status_az': {
            const aLabel = STATUS_LABEL[canonicalStatus(a.status, a.type)] ?? a.status
            const bLabel = STATUS_LABEL[canonicalStatus(b.status, b.type)] ?? b.status
            return aLabel.localeCompare(bLabel, 'zh-Hant')
          }
          case 'newest':
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
      })
  }, [properties, searchTerm, filterType, filterStatus, filterDistrict, sortBy])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">我的物件</h1>
          <p className="mt-1 text-text-muted">管理您的所有出租與出售物件</p>
        </div>
        <Link href="/landlord/properties/add">
          <Button as="span">
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增物件
          </Button>
        </Link>
      </div>

      <Card>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
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
              className={selectClass}
            >
              <option value="all">所有類型</option>
              <option value="rental">出租</option>
              <option value="sale">出售</option>
            </select>

            <select
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
              className={selectClass}
            >
              <option value="all">所有地區</option>
              {districtOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={selectClass}
            >
              <option value="all">所有狀態</option>
              <option value="for_sale">待售</option>
              <option value="for_rent">待出租</option>
              <option value="collecting_rent">收租中</option>
              <option value="rented">已出租</option>
              <option value="pending">處理中</option>
              <option value="sold">已售出</option>
              <option value="expired">已失效</option>
              <option value="invalid">無效</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              共找到 <span className="font-medium text-text-primary">{filteredProperties.length}</span> 個物件
            </p>
            <select
              value={sortBy}
              onChange={(e) => {
                const value = e.target.value
                if (
                  value === 'newest' ||
                  value === 'price_high' ||
                  value === 'price_low' ||
                  value === 'district_az' ||
                  value === 'district_za' ||
                  value === 'status_az'
                ) {
                  setSortBy(value)
                }
              }}
              className={`${selectClass} min-w-[11rem] py-2`}
            >
              <option value="newest">排序：最新發布</option>
              <option value="price_high">排序：價格高 → 低</option>
              <option value="price_low">排序：價格低 → 高</option>
              <option value="district_az">排序：地區 A → Z</option>
              <option value="district_za">排序：地區 Z → A</option>
              <option value="status_az">排序：狀態（筆劃）</option>
            </select>
          </div>
        </div>
      </Card>

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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
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
              {searchTerm || filterType !== 'all' || filterStatus !== 'all' || filterDistrict !== 'all'
                ? '請嘗試調整搜尋條件'
                : '開始新增您的第一個物件'}
            </p>
            <Link href="/landlord/properties/add">
              <Button as="span">新增物件</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6">
          {filteredProperties.map((property) => {
            const vacant = isVacantListing(property)
            const statusOptions = property.type === 'sale' ? landlordSaleStatusValues : landlordRentalStatusValues

            return (
              <Card
                key={property.id}
                padding="none"
                hoverable
                className={`flex h-full flex-col overflow-hidden border transition-colors ${
                  vacant
                    ? 'bg-bg-secondary/90 ring-1 ring-border-light border-dashed'
                    : 'border-border-default'
                }`}
              >
                <Link
                  href={`/landlord/properties/${property.id}`}
                  className="block min-h-0 flex-1 rounded-t-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="relative h-48 overflow-hidden bg-bg-secondary">
                    {property.imageUrl ? (
                      <Image src={property.imageUrl} alt={property.title} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg className="h-12 w-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute right-3 top-3">
                      <Badge variant={statusBadgeVariant(property.status, property.type)} size="sm">
                        {STATUS_LABEL[canonicalStatus(property.status, property.type)] ?? property.status}
                      </Badge>
                    </div>
                    <div className="absolute left-3 top-3">
                      <span className="rounded border border-border-default bg-bg-primary/70 px-2 py-1 text-xs font-medium text-text-primary backdrop-blur-sm">
                        {property.type === 'rental' ? '出租' : '出售'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 pb-3">
                    <h3 className="mb-2 line-clamp-1 text-lg font-semibold text-text-primary">{property.title}</h3>
                    <p className="mb-3 line-clamp-2 text-sm text-text-muted">
                      <svg className="mr-1 inline h-4 w-4 shrink-0 align-text-bottom" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {property.address}
                    </p>

                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <p className="text-2xl font-bold text-accent">{formatPrice(property.price, property.type)}</p>
                        <p className="mt-1 text-xs text-text-muted">{property.area} 坪</p>
                      </div>
                      <span className="whitespace-nowrap text-sm text-accent">查看詳情 →</span>
                    </div>
                  </div>
                </Link>

                <div
                  className="border-t border-border-default bg-bg-primary/30 px-5 pb-5 pt-0"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <label className="mb-1.5 block text-xs text-text-muted">快速變更狀態</label>
                  <select
                    value={canonicalStatus(property.status, property.type)}
                    disabled={statusSavingId === property.id}
                    onChange={async (e) => {
                      const next = e.target.value
                      const current = canonicalStatus(property.status, property.type)
                      if (next === current) return
                      setStatusSavingId(property.id)
                      const response = await fetch(`/api/landlord/properties/${property.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ propertyType: property.type, status: next }),
                      })
                      const result = (await response.json()) as { success: boolean; error?: string }
                      setStatusSavingId(null)
                      if (result.success) {
                        setProperties((prev) =>
                          prev.map((item) => (item.id === property.id ? { ...item, status: next } : item)),
                        )
                      } else {
                        console.error(result.error)
                      }
                    }}
                    className="w-full rounded-lg border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABEL[status] ?? status}
                      </option>
                    ))}
                  </select>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
