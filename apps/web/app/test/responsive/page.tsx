import { Header } from '@/components/layout/Header'
import { HeroBanner } from '@/components/sections/HeroBanner'
import { FeaturedProperties } from '@/components/sections/FeaturedProperties'
import { Footer } from '@/components/sections/Footer'
import { Property } from '@/types'
import { AccessibilityTester } from '@/components/utils/AccessibilityTester'
import { PerformanceMonitor } from '@/components/utils/PerformanceMonitor'

const testProperties: Property[] = [
  {
    id: '1',
    title: 'Modern Downtown Loft',
    description: 'Stunning modern loft in the heart of downtown with panoramic city views.',
    price: 850000,
    type: 'Apartment',
    bedrooms: 2,
    bathrooms: 2,
    area: 1200,
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
    location: 'Downtown',
    featured: true,
    amenities: ['Gym', 'Pool', 'Parking']
  },
  {
    id: '2',
    title: 'Suburban Family Home',
    description: 'Beautiful family home with large backyard and modern amenities.',
    price: 650000,
    type: 'House',
    bedrooms: 4,
    bathrooms: 3,
    area: 2500,
    image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
    location: 'Suburbs',
    featured: true,
    amenities: ['Garden', 'Garage', 'Fireplace']
  },
  {
    id: '3',
    title: 'Luxury Penthouse Suite',
    description: 'Exclusive penthouse with private terrace and breathtaking views.',
    price: 1200000,
    type: 'Penthouse',
    bedrooms: 3,
    bathrooms: 2,
    area: 1800,
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
    location: 'City Center',
    featured: true,
    amenities: ['Terrace', 'Concierge', 'Wine Cellar']
  },
  {
    id: '4',
    title: 'Cozy Studio Apartment',
    description: 'Perfect starter home with efficient layout and great location.',
    price: 320000,
    type: 'Studio',
    bedrooms: 1,
    bathrooms: 1,
    area: 500,
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
    location: 'Midtown',
    featured: true,
    amenities: ['Laundry', 'Storage']
  },
  {
    id: '5',
    title: 'Historic Townhouse',
    description: 'Charming historic property with original features and modern updates.',
    price: 780000,
    type: 'Townhouse',
    bedrooms: 3,
    bathrooms: 2,
    area: 1600,
    image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
    location: 'Historic District',
    featured: true,
    amenities: ['Original Features', 'Garden']
  },
  {
    id: '6',
    title: 'Waterfront Villa',
    description: 'Stunning waterfront property with private beach and dock.',
    price: 2500000,
    type: 'Villa',
    bedrooms: 5,
    bathrooms: 4,
    area: 3500,
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
    location: 'Waterfront',
    featured: true,
    amenities: ['Private Beach', 'Dock', 'Pool', 'Tennis Court']
  }
]

export default function ResponsiveTestPage() {
  return (
    <div className="min-h-screen bg-grey-08">
      <Header />
      <main>
        <HeroBanner />
        <FeaturedProperties properties={testProperties} />
      </main>
      <Footer />
      
      {/* 可訪問性測試工具 */}
      <AccessibilityTester />
      
      {/* 性能監控工具 */}
      <PerformanceMonitor />
      
      {/* 響應式測試指示器 */}
      <div className="fixed bottom-4 left-4 z-50">
        <div className="bg-grey-10 border border-grey-15 rounded-lg p-3 shadow-lg">
          <div className="text-xs text-grey-60 mb-2">Breakpoint Indicator</div>
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500 sm:bg-gray-300" title="Mobile (< 640px)"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500 md:bg-gray-300" title="Tablet (640px - 1024px)"></div>
            <div className="w-3 h-3 rounded-full bg-green-500 lg:bg-gray-300" title="Desktop (1024px - 1440px)"></div>
            <div className="w-3 h-3 rounded-full bg-blue-500 xl:bg-gray-300" title="Large Desktop (> 1440px)"></div>
          </div>
          <div className="text-xs text-grey-60 mt-2">
            <span className="sm:hidden">Mobile</span>
            <span className="hidden sm:inline md:hidden">Tablet</span>
            <span className="hidden md:inline lg:hidden">Desktop</span>
            <span className="hidden lg:inline xl:hidden">Large Desktop</span>
            <span className="hidden xl:inline">Extra Large</span>
          </div>
        </div>
      </div>

      {/* 性能測試工具 */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-grey-10 border border-grey-15 rounded-lg p-3 shadow-lg">
          <div className="text-xs text-grey-60 mb-2">Performance</div>
          <div className="text-xs text-white">
            Images: {testProperties.length} loaded
          </div>
          <div className="text-xs text-grey-60">
            Components: 4 sections
          </div>
        </div>
      </div>
    </div>
  )
}