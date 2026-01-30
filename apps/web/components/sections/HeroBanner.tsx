'use client';

import { Text } from '@/components/ui/Text'
import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'

/**
 * 基於 Figma 設計的 Hero Banner 組件
 */
export function HeroBanner() {
  return (
    <section className="relative bg-grey-10 border-b border-grey-15 overflow-hidden">
      {/* 抽象背景設計 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-64 h-64 lg:w-96 lg:h-96 bg-purple-60 rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 lg:w-96 lg:h-96 bg-grey-15 rounded-full filter blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 xl:py-32">
        <div className="max-w-3xl lg:max-w-4xl mx-auto text-center">
          {/* 主標題 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Text variant="heading-lg" className="text-white mb-4 lg:heading-xl lg:mb-6">
              ✨ Manage Your Property with RESA AI
            </Text>
          </motion.div>

          {/* 副標題 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Text variant="body-md" className="text-grey-60 mb-8 lg:body-lg lg:mb-12 max-w-xl lg:max-w-2xl mx-auto">
              Streamline your property management with AI-powered automation. 
              From tenant screening to maintenance tracking, RESA AI handles it all so you can focus on growing your portfolio.
            </Text>
          </motion.div>

          {/* CTA 按鈕 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center items-center"
          >
            <Button variant="primary" size="md" className="lg:text-lg">
              Get Started
            </Button>
            <Button variant="outline" size="md" className="lg:text-lg">
              Learn More
            </Button>
          </motion.div>

          {/* 統計資訊 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8 mt-12 lg:mt-16 max-w-2xl lg:max-w-3xl mx-auto"
          >
            <div className="text-center">
              <Text variant="heading-md" className="text-purple-60 mb-1 lg:heading-lg lg:mb-2">
                500+
              </Text>
              <Text variant="body-sm" className="text-grey-60">
                Properties Managed
              </Text>
            </div>
            <div className="text-center">
              <Text variant="heading-md" className="text-purple-60 mb-1 lg:heading-lg lg:mb-2">
                98%
              </Text>
              <Text variant="body-sm" className="text-grey-60">
                Client Satisfaction
              </Text>
            </div>
            <div className="text-center">
              <Text variant="heading-md" className="text-purple-60 mb-1 lg:heading-lg lg:mb-2">
                24/7
              </Text>
              <Text variant="body-sm" className="text-grey-60">
                AI Support
              </Text>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}