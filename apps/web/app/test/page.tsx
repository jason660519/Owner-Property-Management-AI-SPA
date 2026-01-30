import { Header } from '@/components/layout/Header'
import { HeroBanner } from '@/components/sections/HeroBanner'
import { FeaturedProperties } from '@/components/sections/FeaturedProperties'
import { mockProperties } from '@/data/properties'

export default function TestPage() {
  return (
    <div className="min-h-screen bg-grey-08">
      <Header />
      <HeroBanner />
      <FeaturedProperties properties={mockProperties} />
    </div>
  )
}