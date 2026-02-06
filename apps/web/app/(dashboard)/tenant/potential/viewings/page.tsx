'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Calendar, Clock, MapPin, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { getPotentialTenantViewings, type TenantViewing } from '@/lib/actions/dashboard'

export default function ViewingsPage() {
  const [viewings, setViewings] = useState<TenantViewing[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchViewings = async () => {
      setIsLoading(true)
      try {
        const data = await getPotentialTenantViewings()
        setViewings(data)
      } catch (error) {
        console.error('Failed to fetch viewings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchViewings()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded text-xs">已確認</span>
      case 'pending':
        return <span className="text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded text-xs">待確認</span>
      case 'completed':
        return <span className="text-blue-500 bg-blue-500/10 px-2 py-1 rounded text-xs">已完成</span>
      case 'cancelled':
        return <span className="text-red-500 bg-red-500/10 px-2 py-1 rounded text-xs">已取消</span>
      default:
        return null
    }
  }

  return (
    <DashboardLayout
      currentRole="potential_tenant"
      pageTitle="看房預約管理"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '租客專區', href: '/tenant' },
        { label: '看房預約' },
      ]}
      greeting="管理您的看房行程"
      headerActions={
        <Button>
          <Calendar className="w-5 h-5 mr-2" />
          新增預約
        </Button>
      }
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : viewings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">目前沒有預約記錄</p>
          </div>
        ) : (
          viewings.map((viewing) => (
            <Card key={viewing.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white">{viewing.property}</h3>
                      {getStatusBadge(viewing.status)}
                    </div>
                    <div className="flex items-center text-[#999999] text-sm">
                      <MapPin className="w-4 h-4 mr-1" />
                      {viewing.address}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#cccccc]">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-[#7C3AED]" />
                        {viewing.date}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-[#7C3AED]" />
                        {viewing.time}
                      </div>
                      <div className="flex items-center">
                        <span className="text-[#999999] mr-1">接待人:</span>
                        {viewing.agent}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {viewing.status === 'pending' && (
                      <Button variant="outline" className="text-red-500 hover:text-red-400">
                        取消預約
                      </Button>
                    )}
                    {viewing.status === 'confirmed' && (
                      <Button variant="outline">
                        更改時間
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  )
}
