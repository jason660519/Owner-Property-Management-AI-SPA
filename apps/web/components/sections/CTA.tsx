'use client'

import { motion } from 'framer-motion'
import { Text } from '@/components/ui/Text'
import { Button } from '@/components/ui/Button'

/**
 * Call-to-Action section
 * Based on Figma design system
 */
export function CTA() {
  return (
    <section className="relative py-20 lg:py-32 bg-grey-08 overflow-hidden">
      {/* Background Gradient Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 lg:w-[600px] lg:h-[600px] bg-purple-60 rounded-full filter blur-3xl"></div>
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Main Heading */}
          <Text variant="heading-xl" className="text-white mb-6 lg:mb-8">
            Ready to Transform Your Property Management?
          </Text>

          {/* Description */}
          <Text variant="body-lg" color="grey-60" className="mb-8 lg:mb-12 max-w-2xl mx-auto">
            Join thousands of landlords who are already using RESA AI to automate their property management and maximize their returns.
          </Text>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Button variant="primary" size="lg">
              Start Free Trial
            </Button>
            <Button variant="outline" size="lg">
              Schedule a Demo
            </Button>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            className="mt-12 lg:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="text-center">
              <Text variant="heading-lg" className="text-purple-60 mb-2">
                5,000+
              </Text>
              <Text variant="body-sm" color="grey-60">
                Active Landlords
              </Text>
            </div>
            <div className="text-center">
              <Text variant="heading-lg" className="text-purple-60 mb-2">
                50,000+
              </Text>
              <Text variant="body-sm" color="grey-60">
                Properties Managed
              </Text>
            </div>
            <div className="text-center">
              <Text variant="heading-lg" className="text-purple-60 mb-2">
                99.9%
              </Text>
              <Text variant="body-sm" color="grey-60">
                Uptime Guarantee
              </Text>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
