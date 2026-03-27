'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WizardStep {
  id: string
  title: string
  icon: React.ReactNode
  description: string
}

interface WizardLayoutProps {
  steps: WizardStep[]
  currentStep: number
  onStepChange: (step: number) => void
  children: React.ReactNode
  canProceed?: boolean
  isSubmitting?: boolean
  /** Unique key for localStorage persistence (defaults to 'wizard-draft') */
  storageKey?: string
  /** Called when the final step's "Generate Proposal" button is clicked */
  onComplete?: () => void
  /** Optional form data to persist to localStorage on step changes */
  formData?: Record<string, unknown>
  /** Called when draft is restored from localStorage */
  onRestoreDraft?: (data: { step: number; formData: Record<string, unknown> }) => void
  /** Called when user clicks "start over" — resets the entire form */
  onStartOver?: () => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BRAND_RED = '#C41E2A'
const CHARCOAL = '#1A1A1A'
const SAGE = '#8B9F82'

const SIDEBAR_WIDTH = 'w-72'

// ─── Draft Persistence ──────────────────────────────────────────────────────

function saveDraft(
  key: string,
  step: number,
  formData?: Record<string, unknown>
) {
  try {
    const draft = { step, formData: formData ?? {}, savedAt: Date.now() }
    localStorage.setItem(key, JSON.stringify(draft))
  } catch {
    // localStorage may be unavailable — silently ignore
  }
}

function loadDraft(
  key: string
): { step: number; formData: Record<string, unknown> } | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed.step === 'number') return parsed
    return null
  } catch {
    return null
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // noop
  }
}

// ─── Checkmark Icon ─────────────────────────────────────────────────────────

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

// ─── Arrow Icons ────────────────────────────────────────────────────────────

function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg className="w-4 h-4 ml-1.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  )
}

// ─── Step Indicator (Sidebar Item) ──────────────────────────────────────────

function SidebarStepItem({
  step,
  index,
  currentStep,
  highestVisited,
  onClick,
}: {
  step: WizardStep
  index: number
  currentStep: number
  highestVisited: number
  onClick: () => void
}) {
  const isActive = index === currentStep
  const isCompleted = index < currentStep
  const isVisited = index <= highestVisited
  const isClickable = isVisited

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 group',
        isActive && 'bg-white/10',
        isClickable && !isActive && 'hover:bg-white/5 cursor-pointer',
        !isClickable && 'opacity-40 cursor-not-allowed'
      )}
      aria-current={isActive ? 'step' : undefined}
    >
      {/* Step number / check circle */}
      <span
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-200 border-2',
          isCompleted && 'border-transparent',
          isActive && 'border-transparent',
          !isActive && !isCompleted && 'border-white/30'
        )}
        style={{
          backgroundColor: isActive
            ? BRAND_RED
            : isCompleted
              ? SAGE
              : 'transparent',
          color: isActive || isCompleted ? '#fff' : 'rgba(255,255,255,0.5)',
        }}
      >
        {isCompleted ? (
          <CheckIcon className="w-4 h-4" />
        ) : (
          index + 1
        )}
      </span>

      {/* Title + description */}
      <span className="flex-1 min-w-0">
        <span
          className={cn(
            'block text-sm font-medium leading-tight transition-colors duration-200',
            isActive ? 'text-white' : 'text-white/60'
          )}
        >
          {step.title}
        </span>
        <span
          className={cn(
            'block text-xs mt-0.5 leading-snug transition-colors duration-200',
            isActive ? 'text-white/70' : 'text-white/30'
          )}
        >
          {step.description}
        </span>
      </span>
    </button>
  )
}

// ─── Mobile Step Indicator ──────────────────────────────────────────────────

function MobileStepDots({
  steps,
  currentStep,
  highestVisited,
  onStepChange,
}: {
  steps: WizardStep[]
  currentStep: number
  highestVisited: number
  onStepChange: (step: number) => void
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {steps.map((step, i) => {
        const isActive = i === currentStep
        const isCompleted = i < currentStep
        const isClickable = i <= highestVisited

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => isClickable && onStepChange(i)}
            disabled={!isClickable}
            className={cn(
              'relative flex items-center justify-center transition-all duration-200',
              isActive ? 'w-8 h-8' : 'w-6 h-6',
              !isClickable && 'opacity-40 cursor-not-allowed'
            )}
            aria-label={`Step ${i + 1}: ${step.title}`}
            aria-current={isActive ? 'step' : undefined}
          >
            <span
              className={cn(
                'rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200',
                isActive ? 'w-8 h-8' : 'w-6 h-6'
              )}
              style={{
                backgroundColor: isActive
                  ? BRAND_RED
                  : isCompleted
                    ? SAGE
                    : '#d1d5db',
                color: isActive || isCompleted ? '#fff' : '#6b7280',
              }}
            >
              {isCompleted ? (
                <CheckIcon className="w-3.5 h-3.5" />
              ) : (
                i + 1
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Main WizardLayout Component ────────────────────────────────────────────

export function WizardLayout({
  steps,
  currentStep,
  onStepChange,
  children,
  canProceed = true,
  isSubmitting = false,
  storageKey = 'wizard-draft',
  onComplete,
  formData,
  onRestoreDraft,
  onStartOver,
}: WizardLayoutProps) {
  const prefersReducedMotion = useReducedMotion()
  const contentRef = useRef<HTMLDivElement>(null)
  const [direction, setDirection] = useState(0) // -1 = back, 1 = forward
  const [highestVisited, setHighestVisited] = useState(currentStep)
  const [hasMounted, setHasMounted] = useState(false)

  const totalSteps = steps.length
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1
  const progressPercent = ((currentStep + 1) / totalSteps) * 100

  // ── Mount & draft restoration ──────────────────────────────────────────

  useEffect(() => {
    setHasMounted(true)
    const draft = loadDraft(storageKey)
    if (draft && onRestoreDraft) {
      onRestoreDraft(draft)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Track highest visited step ─────────────────────────────────────────

  useEffect(() => {
    setHighestVisited((prev) => Math.max(prev, currentStep))
  }, [currentStep])

  // ── Persist draft on step change ───────────────────────────────────────

  useEffect(() => {
    if (hasMounted) {
      saveDraft(storageKey, currentStep, formData as Record<string, unknown>)
    }
  }, [currentStep, formData, storageKey, hasMounted])

  // ── Auto-scroll to top on step change ──────────────────────────────────

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

  // ── Navigation handlers ────────────────────────────────────────────────

  const goNext = useCallback(() => {
    if (!canProceed || isSubmitting) return
    if (isLastStep) {
      onComplete?.()
      return
    }
    setDirection(1)
    onStepChange(currentStep + 1)
  }, [currentStep, isLastStep, canProceed, isSubmitting, onStepChange, onComplete])

  const goBack = useCallback(() => {
    if (isFirstStep) return
    setDirection(-1)
    onStepChange(currentStep - 1)
  }, [currentStep, isFirstStep, onStepChange])

  const goToStep = useCallback(
    (step: number) => {
      if (step > highestVisited) return
      setDirection(step > currentStep ? 1 : -1)
      onStepChange(step)
    },
    [currentStep, highestVisited, onStepChange]
  )

  // ── Keyboard: Enter to advance (when not in textarea) ─────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter') return
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      // Don't advance if user is in a textarea or contenteditable
      if (tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return
      // Don't advance if inside a select or if modifier keys are held
      if (tag === 'select' || e.shiftKey || e.ctrlKey || e.metaKey) return
      // Don't advance if the target is a button (let the button handle its own click)
      if (tag === 'button' || tag === 'a') return
      e.preventDefault()
      goNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext])

  // ── Animation variants ────────────────────────────────────────────────

  // Track if this is the first render — skip enter animation on mount so content is immediately visible
  const isFirstRenderRef = useRef(true)
  useEffect(() => {
    isFirstRenderRef.current = false
  }, [])

  const slideVariants = {
    enter: (dir: number) => ({
      x: prefersReducedMotion ? 0 : dir > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: prefersReducedMotion ? 0 : dir > 0 ? -80 : 80,
      opacity: 0,
    }),
  }

  const transition = prefersReducedMotion
    ? { duration: 0.05 }
    : { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ── Progress bar (top) ────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200">
        <motion.div
          className="h-full"
          style={{ backgroundColor: BRAND_RED }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
      </div>

      {/* ── Mobile header ─────────────────────────────────────────────── */}
      <div className="lg:hidden pt-1">
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-4 pt-3 pb-1">
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ color: BRAND_RED }}
            >
              Step {currentStep + 1} of {totalSteps}
            </p>
            <h2
              className="text-lg font-semibold mt-0.5"
              style={{ color: CHARCOAL, fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}
            >
              {steps[currentStep]?.title}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 mb-1">
              {steps[currentStep]?.description}
            </p>
          </div>
          <MobileStepDots
            steps={steps}
            currentStep={currentStep}
            highestVisited={highestVisited}
            onStepChange={goToStep}
          />
        </div>
      </div>

      {/* ── Desktop layout: sidebar + content ─────────────────────────── */}
      <div className="flex flex-1 pt-1">
        {/* Sidebar (desktop only) */}
        <aside
          className={cn(
            'hidden lg:flex flex-col flex-shrink-0 fixed top-1 bottom-0 left-0 z-40',
            SIDEBAR_WIDTH
          )}
          style={{ backgroundColor: CHARCOAL }}
        >
          {/* Brand header */}
          <div className="px-6 pt-8 pb-6 border-b border-white/10">
            <h1
              className="text-xl font-bold text-white tracking-tight"
              style={{ fontFamily: 'var(--font-playfair, Playfair Display, serif)' }}
            >
              new proposal
            </h1>
            <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">
              Grant Estate Agents
            </p>
          </div>

          {/* Step list */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Wizard steps">
            {steps.map((step, i) => (
              <SidebarStepItem
                key={step.id}
                step={step}
                index={i}
                currentStep={currentStep}
                highestVisited={highestVisited}
                onClick={() => goToStep(i)}
              />
            ))}
          </nav>

          {/* Step counter at bottom */}
          <div className="px-6 py-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>Progress</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: BRAND_RED }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            </div>
            {onStartOver && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Start a new proposal? All unsaved changes will be lost.')) {
                    clearDraft(storageKey)
                    onStartOver()
                  }
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all text-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                new proposal
              </button>
            )}
          </div>
        </aside>

        {/* ── Main content area ───────────────────────────────────────── */}
        <main
          ref={contentRef}
          className={cn('flex-1 flex flex-col min-h-0', 'lg:ml-72')}
        >
          <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={steps[currentStep]?.id ?? currentStep}
                custom={direction}
                variants={slideVariants}
                initial={isFirstRenderRef.current ? false : 'enter'}
                animate="center"
                exit="exit"
                transition={transition}
                className="w-full"
              >
                {/* Desktop step heading (hidden on mobile since the mobile header shows it) */}
                <div className="hidden lg:block mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="flex items-center justify-center w-10 h-10 rounded-xl"
                      style={{ backgroundColor: `${BRAND_RED}15`, color: BRAND_RED }}
                    >
                      {steps[currentStep]?.icon}
                    </span>
                    <div>
                      <p
                        className="text-xs font-medium uppercase tracking-widest"
                        style={{ color: BRAND_RED }}
                      >
                        Step {currentStep + 1} of {totalSteps}
                      </p>
                      <h2
                        className="text-2xl font-bold"
                        style={{
                          color: CHARCOAL,
                          fontFamily: 'var(--font-playfair, Playfair Display, serif)',
                        }}
                      >
                        {steps[currentStep]?.title}
                      </h2>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm ml-[52px]">
                    {steps[currentStep]?.description}
                  </p>
                </div>

                {/* Step content */}
                {children}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Navigation footer ─────────────────────────────────────── */}
          <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-gray-200 z-30">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
              {/* Back button */}
              {!isFirstStep ? (
                <button
                  type="button"
                  onClick={goBack}
                  className={cn(
                    'flex items-center px-5 py-2.5 rounded-lg text-sm font-medium',
                    'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                    'transition-all duration-200 min-h-[44px]',
                    'focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2'
                  )}
                >
                  <ArrowLeftIcon />
                  Back
                </button>
              ) : (
                <div /> // Spacer to keep Next button right-aligned
              )}

              {/* Next / Generate button */}
              <motion.button
                type="button"
                onClick={goNext}
                disabled={!canProceed || isSubmitting}
                whileTap={canProceed && !isSubmitting ? { scale: 0.97 } : undefined}
                className={cn(
                  'flex items-center px-6 py-2.5 rounded-lg text-sm font-semibold text-white',
                  'transition-all duration-200 min-h-[44px] shadow-sm',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isLastStep && 'px-8'
                )}
                style={{
                  backgroundColor: canProceed && !isSubmitting ? BRAND_RED : '#9ca3af',
                  ...(canProceed && !isSubmitting
                    ? { boxShadow: `0 2px 8px ${BRAND_RED}40` }
                    : {}),
                }}
                onMouseEnter={(e) => {
                  if (canProceed && !isSubmitting) {
                    e.currentTarget.style.backgroundColor = '#a8182a'
                  }
                }}
                onMouseLeave={(e) => {
                  if (canProceed && !isSubmitting) {
                    e.currentTarget.style.backgroundColor = BRAND_RED
                  }
                }}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating...
                  </>
                ) : isLastStep ? (
                  <>
                    Generate Proposal
                    <ArrowRightIcon />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRightIcon />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
