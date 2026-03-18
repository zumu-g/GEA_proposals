'use client'

import React from 'react'
import { motion } from 'framer-motion'

export function PdfButton() {
  const handleDownload = () => {
    window.print()
  }

  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2 }}
      onClick={handleDownload}
      className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded text-white/70 hover:text-white hover:bg-white/20 font-sans text-sm transition-all print:hidden"
      aria-label="Download as PDF"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      <span>save pdf</span>
    </motion.button>
  )
}
