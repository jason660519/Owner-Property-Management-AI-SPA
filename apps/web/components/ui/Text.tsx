import { cn } from '@/lib/utils'
import { TextProps } from '@/types'
import { motion } from 'framer-motion'

/**
 * 基於 Figma 設計的文字組件
 */
export function Text({ 
  children, 
  variant = 'body-md', 
  color = 'white',
  className 
}: TextProps) {
  const variantClasses = {
    'heading-xl': 'text-heading-xl',
    'heading-lg': 'text-heading-lg',
    'heading-md': 'text-heading-md',
    'body-lg': 'text-body-lg',
    'body-md': 'text-body-md',
    'body-sm': 'text-body-sm',
  }
  
  const colorClasses = {
    white: 'text-white',
    'grey-60': 'text-grey-60',
    'purple-60': 'text-purple-60',
  }
  
  const classes = cn(
    variantClasses[variant],
    colorClasses[color],
    className
  )
  
  const Tag = variant.startsWith('heading') ? 'h1' : 'p'
  const MotionTag = motion[Tag as keyof typeof motion]
  
  return (
    <MotionTag
      className={classes}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </MotionTag>
  )
}