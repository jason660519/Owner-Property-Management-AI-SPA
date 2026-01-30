import { cn } from '@/lib/utils'
import { ButtonProps } from '@/types'
import { motion } from 'framer-motion'

/**
 * 基於 Figma 設計的按鈕組件
 * 
 * 設計規範:
 * - 主要 CTA: Purple/60 (#7C3AED) 背景，白色文字
 * - 次要按鈕: Grey/10 (#2A2A2A) 背景，Grey/15 邊框
 * - Outline 按鈕: 透明背景，Grey/15 邊框
 * - 圓角: 小 8px, 中 10px, 大 12px
 * - 內邊距: 垂直 12px, 水平 24px (中型)
 */
export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  onClick, 
  disabled = false, 
  className 
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-60 focus:ring-offset-2 focus:ring-offset-grey-08 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'bg-purple-60 text-white hover:bg-purple-70 active:bg-purple-80 shadow-button',
    secondary: 'bg-grey-10 text-white hover:bg-grey-15 border border-grey-15',
    outline: 'bg-transparent text-white hover:bg-grey-10 active:bg-grey-15 border border-grey-15',
  }
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm rounded-sm',      // 8px 圓角
    md: 'px-6 py-3 text-base rounded-md',    // 10px 圓角
    lg: 'px-8 py-4 text-lg rounded-lg',      // 12px 圓角
  }
  
  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  )
  
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  )
}