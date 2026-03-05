'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function HomePage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message?: string } | null>(null)
  const [result, setResult] = useState<{ success: boolean; url?: string; id?: string; error?: string } | null>(null)
  const [origin, setOrigin] = useState('')
  const submittingRef = useRef(false)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    setResult(null)
    setSendResult(null)

    const formData = new FormData(e.currentTarget)

    try {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          url: data.proposal.url,
          id: data.proposal.id,
        })
        ;(e.target as HTMLFormElement).reset()
      } else {
        setResult({
          success: false,
          error: data.details || data.error || 'Failed to create proposal',
        })
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      })
    } finally {
      setIsSubmitting(false)
      submittingRef.current = false
    }
  }

  const handleSend = async () => {
    if (!result?.id) return
    setIsSending(true)
    setSendResult(null)

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: result.id }),
      })

      const data = await response.json()

      if (response.ok) {
        setSendResult({ success: true, message: data.message })
      } else {
        setSendResult({ success: false, message: data.error || 'Failed to send' })
      }
    } catch (error) {
      setSendResult({ success: false, message: 'Failed to send email' })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Gold accent line at top */}
      <div className="w-full h-1 bg-gold" />

      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-16 sm:py-20 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12 sm:mb-16 gap-4">
            <div>
              <p className="text-gold font-sans text-sm tracking-wider-custom mb-6">
                grant estate agents
              </p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-white lowercase mb-4">
                create proposal
              </h1>
              <div className="gold-accent-line mb-6" />
              <p className="text-white/50 font-sans text-lg font-light max-w-lg">
                generate a professional online proposal for your clients
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-5 py-3 bg-white/5 border border-white/10 rounded text-white/60 hover:text-white hover:bg-white/10 font-sans text-sm font-medium transition-colors min-h-[44px]"
            >
              view all proposals
            </Link>
          </div>

          {/* Form */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 sm:p-8 lg:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Result - shown instead of form fields on success */}
              {result?.success ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-8 space-y-8"
                >
                  <div>
                    <div className="gold-accent-line mb-6" />
                    <p className="font-display text-2xl text-white lowercase mb-3">proposal created</p>
                    <p className="text-white/40 font-sans text-base font-light">
                      your proposal is ready to share
                    </p>
                  </div>

                  {/* Shareable link */}
                  <div>
                    <p className="text-sm text-white/40 font-sans font-light mb-2">shareable link:</p>
                    <div className="bg-white/5 p-3 rounded border border-white/10 flex items-center justify-between gap-3">
                      <span className="text-sm font-mono text-gold truncate">
                        {origin}{result.url}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(`${origin}${result.url}`)}
                        className="shrink-0 px-3 py-1.5 bg-white/5 border border-white/10 rounded text-white/50 hover:text-white font-sans text-xs transition-colors"
                      >
                        copy
                      </button>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3 bg-white/5 border border-white/10 rounded text-white/70 hover:text-white hover:bg-white/10 font-sans text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center"
                    >
                      preview proposal
                    </a>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={isSending || sendResult?.success === true}
                      className="px-5 py-3 bg-gold text-charcoal rounded font-sans text-sm font-medium hover:bg-gold-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                    >
                      {isSending ? 'sending...' : sendResult?.success ? 'sent' : 'send to vendor'}
                    </button>
                  </div>

                  {/* Send result */}
                  {sendResult && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`text-sm font-sans font-light ${
                        sendResult.success ? 'text-sage-300' : 'text-white/50'
                      }`}
                    >
                      {sendResult.message}
                    </motion.p>
                  )}

                  {/* Create another */}
                  <button
                    type="button"
                    onClick={() => { setResult(null); setSendResult(null) }}
                    className="text-white/30 font-sans text-sm hover:text-white/50 transition-colors"
                  >
                    create another proposal
                  </button>
                </motion.div>
              ) : (
                <>
                  <div>
                    <label htmlFor="clientName" className="block text-sm font-sans font-medium text-white/60 mb-2 lowercase">
                      client name
                    </label>
                    <input
                      type="text"
                      id="clientName"
                      name="clientName"
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded text-white font-sans placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold text-base touch-manipulation transition-colors"
                      placeholder="John Smith"
                    />
                  </div>

                  <div>
                    <label htmlFor="clientEmail" className="block text-sm font-sans font-medium text-white/60 mb-2 lowercase">
                      client email
                    </label>
                    <input
                      type="email"
                      id="clientEmail"
                      name="clientEmail"
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded text-white font-sans placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold text-base touch-manipulation transition-colors"
                      placeholder="john.smith@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="propertyAddress" className="block text-sm font-sans font-medium text-white/60 mb-2 lowercase">
                      property address
                    </label>
                    <input
                      type="text"
                      id="propertyAddress"
                      name="propertyAddress"
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded text-white font-sans placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold text-base touch-manipulation transition-colors"
                      placeholder="123 Main Street, London, SW1A 1AA"
                    />
                  </div>

                  {/* Divider */}
                  <div className="border-t border-white/5 pt-8">
                    <p className="text-white/30 font-sans text-xs tracking-wider-custom mb-8">property details</p>
                  </div>

                  <div>
                    <label htmlFor="heroImage" className="block text-sm font-sans font-medium text-white/60 mb-2 lowercase">
                      hero image url
                      <span className="text-white/30 text-xs ml-2">optional</span>
                    </label>
                    <input
                      type="url"
                      id="heroImage"
                      name="heroImage"
                      className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded text-white font-sans placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold text-base touch-manipulation transition-colors"
                      placeholder="https://example.com/property-photo.jpg"
                    />
                  </div>

                  <div>
                    <label htmlFor="commissionRate" className="block text-sm font-sans font-medium text-white/60 mb-2 lowercase">
                      commission rate (%)
                      <span className="text-white/30 text-xs ml-2">defaults to agency config</span>
                    </label>
                    <input
                      type="number"
                      id="commissionRate"
                      name="commissionRate"
                      step="0.1"
                      min="0"
                      max="10"
                      className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded text-white font-sans placeholder-white/20 focus:ring-1 focus:ring-gold focus:border-gold text-base touch-manipulation transition-colors"
                      placeholder="1.5"
                    />
                  </div>

                  {/* Divider */}
                  <div className="border-t border-white/5 pt-8">
                    <p className="text-white/30 font-sans text-xs tracking-wider-custom mb-8">comparable data</p>
                  </div>

                  <div>
                    <label htmlFor="file" className="block text-sm font-sans font-medium text-white/60 mb-2 lowercase">
                      recent sales spreadsheet
                      <span className="text-white/30 text-xs ml-2">optional</span>
                    </label>
                    <input
                      type="file"
                      id="file"
                      name="file"
                      accept=".csv,.xlsx,.xls"
                      className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded text-white/60 font-sans text-base touch-manipulation file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gold file:text-charcoal hover:file:bg-gold-600 transition-colors"
                    />
                    <p className="text-sm text-white/30 mt-2 font-sans font-light">
                      CSV or Excel with columns: address, price, date, bedrooms, bathrooms, sq ft, distance
                    </p>
                  </div>

                  {/* Error */}
                  {result && !result.success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded bg-white/5 border border-white/10"
                    >
                      <p className="font-sans font-medium text-white/60">{result.error}</p>
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isSubmitting}
                    className="w-auto"
                  >
                    create proposal
                  </Button>
                </>
              )}
            </form>
          </div>

          {/* Footer note */}
          <div className="mt-12 text-left mb-16">
            <p className="text-sm text-white/20 font-sans font-light">
              proposals include sale process, marketing plan, and comparable sales data.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
