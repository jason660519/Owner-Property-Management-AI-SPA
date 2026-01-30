import { cn } from '@/lib/utils'
import { ButtonProps } from '@/types'
import { motion } from 'framer-motion'

/**
 * 基於 Figma 設計的按鈕組件
 */
export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  onClick, 
  disabled = false, 
  className 
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-60 focus:ring-offset-2 focus:ring-offset-grey-08'
  
  const variantClasses = {
    primary: 'bg-purple-60 text-white hover:bg-purple-70 active:bg-purple-80',
    secondary: 'bg-grey-10 text-white hover:bg-grey-15 active:bg-grey-20 border border-grey-15',
    outline: 'bg-transparent text-white hover:bg-grey-10 active:bg-grey-15 border border-grey-15',
  }
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm rounded-md',
    md: 'px-6 py-3 text-md rounded-lg',
    lg: 'px-8 py-4 text-lg rounded-xl',
  }
  
  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabled && 'opacity-50 cursor-not-allowed',
    className
  )
  
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.button>
  )
}