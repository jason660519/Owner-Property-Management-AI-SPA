import { motion } from 'framer-motion'
import { PropertyCard } from './PropertyCard'
import { Text } from '@/components/ui/Text'
import { Button } from '@/components/ui/Button'
import { Property } from '@/types'

interface FeaturedPropertiesProps {
  properties: Property[]
}

/**
 * 基於 Figma 設計的精選房產區域
 */
export function FeaturedProperties({ properties }: FeaturedPropertiesProps) {
  return (
    <section className="py-20 lg:py-32 bg-grey-08">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* 區域標題 */}
        <motion.div
          className="text-center mb-12 lg:mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Text variant="heading-xl" className="text-white mb-4 lg:mb-6">
            Featured Properties
          </Text>
          <div className="max-w-2xl lg:max-w-3xl mx-auto">
            <Text variant="body-lg" color="grey-60" className="mb-6 lg:mb-8">
              Explore our handpicked selection of featured properties. Each listing offers a glimpse into exceptional homes and investments available through Estatein. Click "View Details" for more information.
            </Text>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Button variant="secondary" size="md">
              View All Properties
            </Button>
          </motion.div>
        </motion.div>

        {/* 房產卡片網格 - 響應式設計 */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3
              }
            }
          }}
        >
          {properties.map((property, index) => (
            <motion.div
              key={property.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
            >
              <PropertyCard
                property={property}
                index={index}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}