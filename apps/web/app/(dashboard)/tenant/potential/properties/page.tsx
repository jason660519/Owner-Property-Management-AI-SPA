'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MapPin, Home, Ruler, Calendar, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getPotentialTenantProperties, type TenantProperty } from '@/lib/actions/dashboard'

export default function PotentialPropertiesPage() {
  const [properties, setProperties] = useState<TenantProperty[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProperties = async () => {
      setIsLoading(true)
      try {
        const data = await getPotentialTenantProperties()
        setProperties(data)
      } catch (error) {
        console.error('Failed to fetch properties:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProperties()
  }, [])

  return (
    <DashboardLayout
      currentRole="potential_tenant"
      pageTitle="房東邀請物件"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '租客專區', href: '/tenant' },
        { label: '邀請物件' },
      ]}
      greeting="房東為您精選的推薦物件"
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">目前沒有邀請的物件</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Card key={property.id} className="overflow-hidden group hover:border-[#7C3AED] transition-colors">
              <div className="aspect-video relative">
                <img 
                  src={property.image} 
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  可預約
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-[#7C3AED] transition-colors">
                    {property.title}
                  </h3>
                  <div className="flex items-center text-[#999999] text-sm mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    {property.address}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-[#cccccc]">
                  <div className="flex items-center">
                    <Home className="w-4 h-4 mr-1 text-[#7C3AED]" />
                    {property.specs}
                  </div>
                  <div className="flex items-center">
                    <Ruler className="w-4 h-4 mr-1 text-[#7C3AED]" />
                    {property.area}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#333333]">
                  <span className="text-xl font-bold text-white">
                    NT$ {property.price.toLocaleString()}
                    <span className="text-xs text-[#999999] font-normal"> / 月</span>
                  </span>
                  <Link href={`/tenant/potential/viewings?propertyId=${property.id}`}>
                    <Button size="sm">
                      <Calendar className="w-4 h-4 mr-2" />
                      預約看房
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
