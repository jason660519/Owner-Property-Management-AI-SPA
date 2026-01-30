import { cn } from '@/lib/utils'
import { CardProps } from '@/types'
import { motion } from 'framer-motion'

/**
 * 基於 Figma 設計的卡片組件
 * 
 * 設計規範:
 * - 圓角: 12px (rounded-lg)
 * - 背景: Grey/08 (#1A1A1A) 或 Grey/10 (#2A2A2A)
 * - 邊框: 1px Grey/15 (#333333)
 * - 內邊距: 24px (p-6)
 */
export function Card({ children, className, onClick }: CardProps) {
  const isClickable = !!onClick
  
  return (
    <motion.div
      className={cn(
        'bg-grey-08 border border-grey-15 rounded-lg p-6',
        isClickable && 'cursor-pointer hover:bg-grey-10 hover:shadow-card transition-all duration-300',
        className
      )}
      whileHover={isClickable ? { y: -4 } : undefined}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}