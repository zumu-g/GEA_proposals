'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  variant?: 'default' | 'bordered' | 'dark'
}

export function Card({ children, className, padding = 'md', hover = false, variant = 'default' }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  const variants = {
    default: 'bg-white shadow-sm',
    bordered: 'bg-white border border-charcoal-100',
    dark: 'bg-charcoal text-white',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={cn(
        'rounded-lg',
        variants[variant],
        paddings[padding],
        className
      )}
    >
      {children}
    </motion.div>
  )
}
