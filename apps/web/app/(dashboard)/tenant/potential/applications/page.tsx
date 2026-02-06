'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FileText, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

// Mock data for applications
const applications = [
  {
    id: 'app-001',
    property: {
      id: 'prop-001',
      title: '信義區豪華公寓',
      address: '台北市信義區信義路五段',
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=60',
    },
    status: 'pending', // pending, approved, rejected, draft
    submittedAt: '2024-02-05',
    offerAmount: 45000,
    leaseTerm: '12 months',
  },
  {
    id: 'app-002',
    property: {
      id: 'prop-002',
      title: '大安森林公園景觀宅',
      address: '台北市大安區新生南路',
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=60',
    },
    status: 'draft',
    lastModified: '2024-02-06',
    offerAmount: 52000,
    leaseTerm: '24 months',
  },
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-500 hover:bg-green-600">已核准</Badge>
    case 'rejected':
      return <Badge variant="destructive">已婉拒</Badge>
    case 'pending':
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">審核中</Badge>
    case 'draft':
      return <Badge variant="secondary">草稿</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function ApplicationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">租賃申請</h1>
          <p className="text-[#999999]">追蹤您的租賃要約書與申請進度</p>
        </div>
        <Link href="/tenant/potential/properties">
          <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white">
            <FileText className="w-4 h-4 mr-2" />
            新建申請
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        {applications.length === 0 ? (
          <Card className="bg-[#262626] border-[#333333]">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-16 h-16 text-[#666666] mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">目前沒有申請記錄</h3>
              <p className="text-[#999999] mb-6">您可以在房東邀請的物件中遞交租賃要約書</p>
              <Link href="/tenant/potential/properties">
                <Button variant="outline">瀏覽物件</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          applications.map((app) => (
            <Card key={app.id} className="bg-[#262626] border-[#333333] overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-48 h-32 md:h-auto relative">
                  <img 
                    src={app.property.image} 
                    alt={app.property.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="flex-1 p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(app.status)}
                        <span className="text-sm text-[#999999]">
                          ID: {app.id}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white">{app.property.title}</h3>
                      <p className="text-[#999999]">{app.property.address}</p>
                      
                      <div className="flex items-center gap-6 mt-4 text-sm text-[#CCCCCC]">
                        <div className="flex items-center gap-2">
                          <span className="text-[#999999]">出價金額:</span>
                          <span className="font-semibold">NT$ {app.offerAmount.toLocaleString()} / 月</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#999999]">租期:</span>
                          <span>{app.leaseTerm}</span>
                        </div>
                        {app.submittedAt && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#999999]" />
                            <span>提交於 {app.submittedAt}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button variant="outline" className="border-[#333333] text-white hover:bg-[#333333]">
                        查看詳情
                      </Button>
                      {app.status === 'draft' && (
                        <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white">
                          繼續填寫
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
