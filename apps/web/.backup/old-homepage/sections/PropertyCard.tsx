'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Property } from '@/types'
import { formatPrice, truncateText } from '@/lib/utils'
import { generateSizesString, IMAGE_CONFIG } from '@/lib/image-optimization'

interface PropertyCardProps {
  property: Property
  index?: number
}

export function PropertyCard({ property, index = 0 }: PropertyCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(true) // 避免無限載入狀態
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8 }}
      className="h-full"
      role="article"
      aria-label={`Property: ${property.title}`}
    >
      <Card className="overflow-hidden hover:shadow-card transition-all duration-300 h-full flex flex-col rounded-lg">
        {/* Property Image */}
        <div className="relative aspect-video overflow-hidden rounded-lg mb-4">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-grey-10 animate-pulse" />
          )}
          
          {imageError ? (
            <div className="absolute inset-0 bg-grey-10 flex items-center justify-center">
              <Icon name="home" size="lg" className="text-grey-60" />
            </div>
          ) : (
            <Image
              src={property.image}
              alt={`${property.title} - ${property.type} property`}
              fill
              className={`object-cover transition-transform duration-300 hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              sizes={generateSizesString({
                mobile: '(max-width: 640px)',
                tablet: '(max-width: 1024px)',
                desktop: '(min-width: 1025px)'
              })}
              quality={IMAGE_CONFIG.quality.preview}
              priority={index < 3}
              loading={index >= 3 ? 'lazy' : 'eager'}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-grey-08/50 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Property Info */}
        <div className="flex-1 flex flex-col">
          <div className="mb-4">
            <Text variant="heading-md" className="text-white mb-2" role="heading" aria-level="3">
              {property.title}
            </Text>
            <Text variant="body-sm" color="grey-60" className="line-clamp-2">
              {truncateText(property.description, 120)}
            </Text>
          </div>

          {/* Property Features */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center space-x-2 bg-grey-10 border border-grey-15 rounded-2xl px-3 py-1.5">
              <Icon name="bed" size="sm" />
              <Text variant="body-sm" className="text-white">
                {property.bedrooms} Bedroom{property.bedrooms !== 1 ? 's' : ''}
              </Text>
            </div>
            <div className="flex items-center space-x-2 bg-grey-10 border border-grey-15 rounded-2xl px-3 py-1.5">
              <Icon name="bath" size="sm" />
              <Text variant="body-sm" className="text-white">
                {property.bathrooms} Bathroom{property.bathrooms !== 1 ? 's' : ''}
              </Text>
            </div>
            <div className="flex items-center space-x-2 bg-grey-10 border border-grey-15 rounded-2xl px-3 py-1.5">
              <Icon name="home" size="sm" />
              <Text variant="body-sm" className="text-white">
                {property.type}
              </Text>
            </div>
          </div>

          {/* Price and Action */}
          <div className="mt-auto pt-4 border-t border-grey-15">
            <div className="flex items-center justify-between">
              <div>
                <Text variant="body-sm" color="grey-60" className="mb-1">
                  Price
                </Text>
                <Text variant="heading-md" className="text-white" aria-label={`Price: ${formatPrice(property.price)}`}>
                  {formatPrice(property.price)}
                </Text>
              </div>
              <Button 
                variant="primary" 
                size="sm"
                aria-label={`View details for ${property.title}`}
                className="hover:scale-105 transition-transform duration-200"
              >
                View Property Details
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}