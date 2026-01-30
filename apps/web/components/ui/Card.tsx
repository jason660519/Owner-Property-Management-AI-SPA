import { cn } from '@/lib/utils'
import { CardProps } from '@/types'
import { motion } from 'framer-motion'

/**
 * 基於 Figma 設計的卡片組件
 */
export function Card({ children, className, onClick }: CardProps) {
  const isClickable = !!onClick
  
  return (
    <motion.div
      className={cn(
        'bg-grey-08 border border-grey-15 rounded-xl p-6',
        isClickable && 'cursor-pointer hover:bg-grey-10 transition-colors duration-200',
        className
      )}
      whileHover={isClickable ? { scale: 1.02 } : undefined}
      whileTap={isClickable ? { scale: 0.98 } : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}