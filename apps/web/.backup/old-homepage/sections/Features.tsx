'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import { Icon } from '@/components/ui/Icon'

const features = [
  {
    icon: 'home',
    title: 'AI-Powered Property Management',
    description: 'Leverage cutting-edge AI technology to streamline your property management workflow and maximize efficiency.'
  },
  {
    icon: 'phone',
    title: '24/7 Virtual Assistant',
    description: 'Never miss an inquiry with our AI voice assistant handling tenant questions and scheduling viewings automatically.'
  },
  {
    icon: 'chart',
    title: 'Smart Analytics',
    description: 'Get actionable insights from comprehensive analytics to make data-driven decisions about your properties.'
  },
  {
    icon: 'shield',
    title: 'Secure & Compliant',
    description: 'Bank-level security with full compliance to protect your data and meet all regulatory requirements.'
  },
  {
    icon: 'users',
    title: 'Tenant Portal',
    description: 'Provide tenants with a modern self-service portal for maintenance requests, payments, and communication.'
  },
  {
    icon: 'document',
    title: 'Smart Contracts',
    description: 'Automate contract generation, e-signatures, and renewals with AI-assisted document management.'
  }
]

/**
 * Features section showcasing platform capabilities
 * Based on Figma design system
 */
export function Features() {
  return (
    <section className="py-20 lg:py-32 bg-grey-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12 lg:mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Text variant="heading-xl" className="text-white mb-4 lg:mb-6">
            Why Choose RESA AI?
          </Text>
          <div className="max-w-2xl lg:max-w-3xl mx-auto">
            <Text variant="body-lg" color="grey-60">
              Experience the future of property management with our comprehensive AI-powered platform designed specifically for landlords.
            </Text>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
              }
            }
          }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
            >
              <Card className="h-full hover:border-purple-60 transition-all duration-300">
                {/* Icon */}
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-purple-60/10 rounded-lg flex items-center justify-center mb-4 lg:mb-6">
                  <Icon name={feature.icon} size="lg" className="text-purple-60" />
                </div>
                
                {/* Content */}
                <Text variant="heading-md" className="text-white mb-3">
                  {feature.title}
                </Text>
                <Text variant="body-sm" color="grey-60" className="leading-relaxed">
                  {feature.description}
                </Text>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
