'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-sans font-medium tracking-wide rounded transition-all duration-200 touch-manipulation focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-gold text-charcoal hover:bg-gold-600 focus:ring-gold-400 active:bg-gold-700',
    secondary: 'bg-charcoal text-white hover:bg-charcoal-700 focus:ring-charcoal-400 active:bg-charcoal-900',
    outline: 'border-2 border-charcoal text-charcoal hover:bg-charcoal hover:text-white focus:ring-charcoal-400',
    ghost: 'text-charcoal-400 hover:text-charcoal hover:bg-charcoal-50 focus:ring-charcoal-200',
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base min-h-[44px]',
    lg: 'px-8 py-4 text-lg min-h-[48px]',
  }

  const motionProps = {
    whileTap: { scale: 0.98 },
    className: cn(
      baseStyles,
      variants[variant],
      sizes[size],
      className
    ),
    disabled: disabled || isLoading,
    'aria-label': isLoading ? 'Loading...' : undefined,
    ...props,
  }

  return (
    <motion.button
      {...motionProps as any}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </motion.button>
  )
}
