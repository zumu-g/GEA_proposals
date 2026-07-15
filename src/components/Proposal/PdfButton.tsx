'use client'

import React, { useEffect } from 'react'
import { motion } from 'framer-motion'

const BUTTON_CLASSES =
  'flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded text-white/70 hover:text-white hover:bg-white/20 font-sans text-sm transition-all'

function proposalRoot(): Element | null {
  return document.querySelector('.proposal-print-root')
}

export function PdfButton({ showShort = false }: { showShort?: boolean }) {
  // ?print=short pre-applies short mode so headless printing (and internal
  // automation) gets the condensed variant without any interaction.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('print') === 'short') {
      proposalRoot()?.classList.add('print-short')
    }
  }, [])

  const handleDownload = () => {
    window.print()
  }

  const handleShortDownload = () => {
    const root = proposalRoot()
    root?.classList.add('print-short')
    const cleanup = () => root?.classList.remove('print-short')
    window.addEventListener('afterprint', cleanup, { once: true })
    window.print()
    // window.print() blocks in most browsers; afterprint is the fallback for
    // the ones where it doesn't. Removing twice is harmless.
    cleanup()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2 }}
      className="fixed top-6 right-6 z-50 flex flex-col items-end gap-2 print:hidden"
    >
      <button onClick={handleDownload} className={BUTTON_CLASSES} aria-label="Download as PDF">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        <span>save pdf</span>
      </button>
      {showShort && (
        <button
          onClick={handleShortDownload}
          className={BUTTON_CLASSES}
          aria-label="Download short summary as PDF"
          title="Condensed pack: price, comparables, campaign costs and fees"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span>save short pdf</span>
        </button>
      )}
    </motion.div>
  )
}
