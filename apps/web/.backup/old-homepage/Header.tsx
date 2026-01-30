'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { Icon } from '@/components/ui/Icon'
import { NavigationItem } from '@/types'

const navigationItems: NavigationItem[] = [
  { label: 'Home', href: '#', isActive: true },
  { label: 'About Us', href: '#' },
  { label: 'My Properties', href: '#' },
  { label: 'Services', href: '#' },
]

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-grey-10 border-b border-grey-15">
      {/* Banner Section */}
      <div className="bg-grey-10 border-b border-grey-15 py-3 lg:py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 lg:space-x-4">
              {/* Abstract Design Pattern */}
              <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-purple-60 to-purple-80 rounded-full opacity-20"></div>
              <Text variant="body-sm" className="text-white lg:body-md">
                ✨ Manage Your Property with RESA AI
              </Text>
            </div>
            <div className="hidden sm:flex items-center space-x-3 lg:space-x-4">
              <Text variant="body-sm" className="text-grey-60 hover:text-white transition-colors cursor-pointer">
                Learn More
              </Text>
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-60 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-70 transition-colors">
                <Icon name="arrow-right" size="sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="bg-grey-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <div className="flex items-center space-x-2 lg:space-x-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-60 rounded-lg flex items-center justify-center">
                <Icon name="logo" size="sm" className="lg:text-md" />
              </div>
              <Text variant="heading-sm" className="text-white lg:heading-md">
                RESA AI
              </Text>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              {navigationItems.map((item) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  className={cn(
                    'text-white hover:text-grey-60 transition-colors text-sm lg:text-base',
                    item.isActive && 'text-purple-60'
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.label}
                </motion.a>
              ))}
            </div>

            {/* Contact Button */}
            <div className="hidden lg:block">
              <Button variant="secondary" size="sm" className="lg:text-base">
                Contact Us
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                <motion.span
                  className="block w-full h-0.5 bg-white"
                  animate={isMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                />
                <motion.span
                  className="block w-full h-0.5 bg-white"
                  animate={isMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                />
                <motion.span
                  className="block w-full h-0.5 bg-white"
                  animate={isMenuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="lg:hidden bg-grey-08 border-t border-grey-15"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="container mx-auto px-6 py-4">
                <div className="flex flex-col space-y-4">
                  {navigationItems.map((item) => (
                    <motion.a
                      key={item.label}
                      href={item.href}
                      className={cn(
                        'text-white hover:text-grey-60 transition-colors py-2',
                        item.isActive && 'text-purple-60'
                      )}
                      whileHover={{ x: 8 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {item.label}
                    </motion.a>
                  ))}
                  <Button variant="secondary" size="md" className="w-full">
                    Contact Us
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  )
}