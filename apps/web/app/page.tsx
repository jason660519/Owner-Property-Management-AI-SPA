import { Header } from '@/components/layout/Header'
import { HeroBanner } from '@/components/sections/HeroBanner'
import { FeaturedProperties } from '@/components/sections/FeaturedProperties'
import { Footer } from '@/components/sections/Footer'
import { Property } from '@/types'

// 模擬數據
const featuredProperties: Property[] = [
  {
    id: '1',
    title: 'Modern Downtown Loft',
    description: 'Stunning 2-bedroom loft in the heart of downtown with floor-to-ceiling windows and premium finishes throughout.',
    price: 850000,
    bedrooms: 2,
    bathrooms: 2,
    type: 'Apartment',
    image: '/images/property-1.jpg',
    location: 'Downtown',
    sqft: 1200,
    featured: true
  },
  {
    id: '2',
    title: 'Suburban Family Home',
    description: 'Beautiful 4-bedroom family home with large backyard, modern kitchen, and excellent school district.',
    price: 1250000,
    bedrooms: 4,
    bathrooms: 3,
    type: 'House',
    image: '/images/property-2.jpg',
    location: 'Suburbs',
    sqft: 2800,
    featured: true
  },
  {
    id: '3',
    title: 'Luxury Penthouse Suite',
    description: 'Exclusive penthouse with panoramic city views, private terrace, and world-class amenities.',
    price: 2500000,
    bedrooms: 3,
    bathrooms: 3,
    type: 'Penthouse',
    image: '/images/property-3.jpg',
    location: 'City Center',
    sqft: 3500,
    featured: true
  },
  {
    id: '4',
    title: 'Cozy Studio Apartment',
    description: 'Perfect starter home with efficient layout, modern appliances, and great natural light.',
    price: 320000,
    bedrooms: 1,
    bathrooms: 1,
    type: 'Studio',
    image: '/images/property-4.jpg',
    location: 'Midtown',
    sqft: 650,
    featured: true
  },
  {
    id: '5',
    title: 'Historic Townhouse',
    description: 'Beautifully restored Victorian townhouse with original details and modern conveniences.',
    price: 1800000,
    bedrooms: 5,
    bathrooms: 4,
    type: 'Townhouse',
    image: '/images/property-5.jpg',
    location: 'Historic District',
    sqft: 3200,
    featured: true
  },
  {
    id: '6',
    title: 'Waterfront Condo',
    description: 'Stunning waterfront condo with private balcony, marina access, and breathtaking views.',
    price: 975000,
    bedrooms: 2,
    bathrooms: 2,
    type: 'Condo',
    image: '/images/property-6.jpg',
    location: 'Waterfront',
    sqft: 1500,
    featured: true
  }
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-grey-08">
      <Header />
      <main>
        <HeroBanner />
        <FeaturedProperties properties={featuredProperties} />
      </main>
      <Footer />
    </div>
  )
}