'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PropertyImageCarousel } from '@/components/property/PropertyImageCarousel'
import { PLACEHOLDER_IMAGE } from '@/lib/properties/constants'
import {
  getLandlordPropertyById,
  getPropertyViewingAppointments,
  type LandlordPropertyDetail,
  type PropertyViewingAppointmentRow,
} from '@/lib/actions/properties'

interface PropertyDetailsProps {
  params: Promise<{ id: string }>
}

function statusBadgeClasses(status: string, listingType: 'rental' | 'sale') {
  const sale: Record<string, string> = {
    available: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    sold: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border-[var(--color-border-default)]',
  }
  const rental: Record<string, string> = {
    vacant: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    occupied: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
    maintenance: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
    archived: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border-[var(--color-border-default)]',
  }
  const map = listingType === 'sale' ? sale : rental
  const fallback = 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border-[var(--color-border-default)]'
  return map[status] ?? fallback
}

function statusLabel(status: string, listingType: 'rental' | 'sale') {
  if (listingType === 'sale') {
    const m: Record<string, string> = {
      available: '待售',
      pending: '交易中',
      sold: '已售',
    }
    return m[status] ?? status
  }
  const m: Record<string, string> = {
    vacant: '空置',
    occupied: '出租中',
    maintenance: '維護中',
    archived: '已封存',
  }
  return m[status] ?? status
}

function viewingStatusLabel(status: string | null) {
  const m: Record<string, string> = {
    pending: '待確認',
    confirmed: '已確認',
    completed: '已完成',
    cancelled: '已取消',
  }
  if (!status) return '—'
  return m[status] ?? status
}

export default function PropertyDetailPage({ params }: PropertyDetailsProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [property, setProperty] = useState<LandlordPropertyDetail | null>(null)
  const [appointments, setAppointments] = useState<PropertyViewingAppointmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qrOpen, setQrOpen] = useState(false)

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/properties/${resolvedParams.id}`
  }, [resolvedParams.id])

  const qrImageSrc = useMemo(() => {
    if (!shareUrl) return ''
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(shareUrl)}`
  }, [shareUrl])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const [propRes, aptRes] = await Promise.all([
        getLandlordPropertyById(resolvedParams.id),
        getPropertyViewingAppointments(resolvedParams.id, 10),
      ])
      if (cancelled) return
      if (!propRes.success || !propRes.property) {
        setError(propRes.error || '無法載入物件')
        setProperty(null)
      } else {
        setProperty(propRes.property)
      }
      if (aptRes.success) {
        setAppointments(aptRes.appointments)
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [resolvedParams.id])

  const formatPrice = (price: number, type: 'rental' | 'sale') => {
    if (type === 'sale') {
      return `NT$ ${(price / 10000).toFixed(0)} 萬`
    }
    return `NT$ ${price.toLocaleString()} /月`
  }

  const sqmToPing = (sqm: number) => (sqm * 0.3025).toFixed(1)

  const copyShareLink = useCallback(async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      /* ignore */
    }
  }, [shareUrl])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--color-text-secondary)]">
        載入物件詳情…
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="space-y-4">
        <p className="text-[var(--color-error)]">{error || '找不到物件'}</p>
        <Link href="/landlord/properties">
          <Button variant="outline">返回物件列表</Button>
        </Link>
      </div>
    )
  }

  const displayImages = property.images.length > 0 ? property.images : [PLACEHOLDER_IMAGE]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/landlord/properties" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            我的物件
          </Link>
          <span className="text-[var(--color-text-muted)]">/</span>
          <span className="text-[var(--color-text-primary)]">物件詳情</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push(`/landlord/properties/${property.id}/edit`)}>
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            編輯
          </Button>
          <Button variant="danger">
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            刪除
          </Button>
        </div>
      </div>

      <Card padding="none">
        <PropertyImageCarousel title={property.title} images={displayImages} placeholder={PLACEHOLDER_IMAGE} />
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="mb-2 text-2xl">{property.title}</CardTitle>
                  <p className="flex items-center gap-2 text-[var(--color-text-muted)]">
                    <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="break-words">{property.address}</span>
                  </p>
                </div>
                <span
                  className={`inline-flex flex-shrink-0 self-start rounded border px-3 py-1 text-sm font-medium ${statusBadgeClasses(property.status, property.type)}`}
                >
                  {statusLabel(property.status, property.type)}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-2 text-4xl font-bold text-[var(--color-accent)]">
                  {formatPrice(property.price, property.type)}
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {property.type === 'rental' ? '每月租金' : '售價'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-[var(--color-bg-tertiary)] p-4 text-center">
                  <p className="mb-1 text-2xl font-bold text-[var(--color-text-primary)]">{sqmToPing(property.areaSqm)}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">坪（約 {property.areaSqm} m²）</p>
                </div>
                <div className="rounded-lg bg-[var(--color-bg-tertiary)] p-4 text-center">
                  <p className="mb-1 text-2xl font-bold text-[var(--color-text-primary)]">{property.bedrooms}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">房</p>
                </div>
                <div className="rounded-lg bg-[var(--color-bg-tertiary)] p-4 text-center">
                  <p className="mb-1 text-2xl font-bold text-[var(--color-text-primary)]">{property.bathrooms}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">衛</p>
                </div>
                <div className="rounded-lg bg-[var(--color-bg-tertiary)] p-4 text-center">
                  <p className="mb-1 text-2xl font-bold text-[var(--color-text-primary)]">
                    {property.floor != null ? property.floor : '—'}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    樓層{property.totalFloors != null ? ` / 共 ${property.totalFloors} 樓` : ''}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">物件描述</h4>
                <p className="whitespace-pre-line leading-relaxed text-[var(--color-text-secondary)]">
                  {property.description || '（尚無描述）'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>設備與附屬</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[var(--color-text-secondary)]">
              {property.commonAreaSqm != null && (
                <p>
                  <span className="text-[var(--color-text-muted)]">公設面積：</span>
                  {property.commonAreaSqm} m²
                </p>
              )}
              {property.auxiliaryBuildings && property.auxiliaryBuildings.length > 0 && (
                <div>
                  <p className="mb-2 font-medium text-[var(--color-text-primary)]">附屬建物</p>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {property.auxiliaryBuildings.map((b) => (
                      <li key={b.id}>
                        {b.name} · {b.area_sqm} m² · {b.location}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {property.parkingSpaces && property.parkingSpaces.length > 0 && (
                <div>
                  <p className="mb-2 font-medium text-[var(--color-text-primary)]">停車位</p>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {property.parkingSpaces.map((p) => (
                      <li key={p.id}>
                        {p.category} #{p.number} · {p.area_sqm} m² · {p.location}（
                        {p.type === 'independent' ? '獨立' : '共用'}）
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!property.commonAreaSqm &&
                (!property.auxiliaryBuildings || property.auxiliaryBuildings.length === 0) &&
                (!property.parkingSpaces || property.parkingSpaces.length === 0) && (
                  <p className="text-[var(--color-text-muted)]">尚無附屬建物或停車位資料</p>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>物件詳細資訊</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-sm text-[var(--color-text-muted)]">物件類型</p>
                  <p className="text-[var(--color-text-primary)]">{property.type === 'rental' ? '出租' : '出售'}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-[var(--color-text-muted)]">所在樓層</p>
                  <p className="text-[var(--color-text-primary)]">
                    {property.floor != null ? `${property.floor} 樓` : '—'}
                    {property.totalFloors != null ? ` / 共 ${property.totalFloors} 樓` : ''}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-[var(--color-text-muted)]">建號</p>
                  <p className="text-[var(--color-text-primary)]">{property.buildingNumber || '—'}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-[var(--color-text-muted)]">地號</p>
                  <p className="text-[var(--color-text-primary)]">{property.landNumber || '—'}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-[var(--color-text-muted)]">所有權人</p>
                  <p className="text-[var(--color-text-primary)]">{property.ownerName}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-[var(--color-text-muted)]">發布日期</p>
                  <p className="text-[var(--color-text-primary)]">
                    {new Date(property.createdAt).toLocaleDateString('zh-TW')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>看房預約（最近 10 筆）</CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <p className="text-[var(--color-text-muted)]">目前沒有預約紀錄</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border-default)] text-[var(--color-text-muted)]">
                        <th className="pb-2 pr-2 font-medium">訪客</th>
                        <th className="pb-2 pr-2 font-medium">電話</th>
                        <th className="pb-2 pr-2 font-medium">日期</th>
                        <th className="pb-2 pr-2 font-medium">時段</th>
                        <th className="pb-2 font-medium">狀態</th>
                      </tr>
                    </thead>
                    <tbody className="text-[var(--color-text-primary)]">
                      {appointments.map((a) => (
                        <tr key={`${a.source}-${a.id}`} className="border-b border-[var(--color-border-light)]/30">
                          <td className="py-2 pr-2">{a.visitorName}</td>
                          <td className="py-2 pr-2">{a.visitorPhone}</td>
                          <td className="py-2 pr-2">{a.preferredDate}</td>
                          <td className="py-2 pr-2">{a.preferredTime}</td>
                          <td className="py-2">{viewingStatusLabel(a.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>快速操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button fullWidth variant="primary" onClick={() => setQrOpen(true)}>
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0H9m3 0h3M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                QR Code 分享
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => {
                  if (shareUrl) window.open(shareUrl, '_blank', 'noopener,noreferrer')
                }}
              >
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                預覽公開頁
              </Button>
              <Link href={`/blog?propertyId=${encodeURIComponent(property.id)}`} className="block">
                <Button fullWidth variant="outline">
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  生成銷售部落格
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>統計資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">瀏覽次數</span>
                <span className="font-semibold text-[var(--color-text-primary)]">—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">收藏次數</span>
                <span className="font-semibold text-[var(--color-text-primary)]">—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">詢問次數</span>
                <span className="font-semibold text-[var(--color-text-primary)]">—</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">統計將於後端串接後顯示</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {qrOpen && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-dialog-title"
        >
          <div className="w-full max-w-sm rounded-xl bg-[var(--color-bg-secondary)] p-6 shadow-xl">
            <h2 id="qr-dialog-title" className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
              分享此物件（公開頁）
            </h2>
            {qrImageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- external QR API; avoid next/image remote config
              <img src={qrImageSrc} alt="物件頁面 QR Code" className="mx-auto h-[220px] w-[220px] rounded-lg bg-white p-2" />
            ) : null}
            <p className="mt-3 break-all text-center text-xs text-[var(--color-text-muted)]">{shareUrl}</p>
            <div className="mt-4 flex gap-2">
              <Button fullWidth variant="primary" onClick={copyShareLink}>
                複製連結
              </Button>
              <Button fullWidth variant="outline" onClick={() => setQrOpen(false)}>
                關閉
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
