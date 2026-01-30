'use client';

import { motion } from 'framer-motion'
import { Text } from '@/components/ui/Text'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

const footerLinks = {
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Services', href: '/services' },
    { name: 'Properties', href: '/properties' },
    { name: 'Contact', href: '/contact' }
  ],
  resources: [
    { name: 'Blog', href: '/blog' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Support', href: '/support' },
    { name: 'Privacy Policy', href: '/privacy' }
  ],
  contact: [
    { name: 'info@estatein.com', href: 'mailto:info@estatein.com' },
    { name: '+1 (555) 123-4567', href: 'tel:+15551234567' },
    { name: '123 Real Estate Ave', href: '#' }
  ]
}

export function Footer() {
  return (
    <footer className="bg-grey-08 border-t border-grey-15" role="contentinfo">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* 主要內容 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* 公司信息 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-60 rounded-lg flex items-center justify-center">
                <Icon name="logo" size="sm" />
              </div>
              <Text variant="heading-md" className="text-white">
                RESA AI
              </Text>
            </div>
            <Text variant="body-sm" className="text-grey-60 mb-6">
              Your trusted AI-powered property management platform. Empowering landlords with smart automation and intelligent insights.
            </Text>
            <div className="flex space-x-3">
              <button 
                className="p-2 text-grey-60 hover:text-white hover:bg-grey-10 rounded-lg transition-all duration-200"
                aria-label="Follow us on Facebook"
              >
                <Icon name="facebook" size="sm" />
              </button>
              <button 
                className="p-2 text-grey-60 hover:text-white hover:bg-grey-10 rounded-lg transition-all duration-200"
                aria-label="Follow us on Twitter"
              >
                <Icon name="twitter" size="sm" />
              </button>
              <button 
                className="p-2 text-grey-60 hover:text-white hover:bg-grey-10 rounded-lg transition-all duration-200"
                aria-label="Connect with us on LinkedIn"
              >
                <Icon name="linkedin" size="sm" />
              </button>
              <button 
                className="p-2 text-grey-60 hover:text-white hover:bg-grey-10 rounded-lg transition-all duration-200"
                aria-label="Follow us on Instagram"
              >
                <Icon name="instagram" size="sm" />
              </button>
            </div>
          </motion.div>

          {/* 公司鏈接 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Text variant="heading-md" className="text-white mb-4">
              Company
            </Text>
            <ul className="space-y-2" role="list">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-grey-60 hover:text-white transition-colors duration-200 text-sm"
                    aria-label={`Navigate to ${link.name}`}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* 資源鏈接 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Text variant="heading-md" className="text-white mb-4">
              Resources
            </Text>
            <ul className="space-y-2" role="list">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-grey-60 hover:text-white transition-colors duration-200 text-sm"
                    aria-label={`Access ${link.name}`}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* 聯繫信息 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Text variant="heading-md" className="text-white mb-4">
              Contact
            </Text>
            <ul className="space-y-2" role="list">
              {footerLinks.contact.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-grey-60 hover:text-white transition-colors duration-200 text-sm"
                    aria-label={link.name.startsWith('mailto:') ? `Send email to ${link.name}` : link.name.startsWith('tel:') ? `Call ${link.name}` : `Visit ${link.name}`}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* 分隔線 */}
        <div className="border-t border-grey-15 mt-8 lg:mt-12 pt-6 lg:pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <Text variant="body-sm" className="text-grey-60">
              © 2024 Estatein. All rights reserved.
            </Text>
            <div className="flex space-x-4 lg:space-x-6">
              <a 
                href="/terms" 
                className="text-grey-60 hover:text-white transition-colors duration-200 text-sm"
                aria-label="Read our Terms of Service"
              >
                Terms of Service
              </a>
              <a 
                href="/privacy" 
                className="text-grey-60 hover:text-white transition-colors duration-200 text-sm"
                aria-label="Read our Privacy Policy"
              >
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}