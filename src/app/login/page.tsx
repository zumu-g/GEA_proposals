'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'

function LoginForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/'

  const go = () => {
    router.push(from)
    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mode }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        go()
      } else {
        setError(data.error || (mode === 'signup' ? 'Could not create account' : 'Incorrect email or password'))
        setPassword('')
      }
    } catch {
      setError('Connection error. Please try again.')
    }

    setIsLoading(false)
  }

  const handleSkip = async () => {
    setSkipping(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'skip' }),
      })
      if (res.ok) {
        go()
        return
      }
      setError('Could not skip. Please try again.')
    } catch {
      setError('Connection error. Please try again.')
    }
    setSkipping(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Login / sign up toggle */}
      <div className="inline-flex w-full rounded-xl border border-white/10 bg-white/5 p-1 gap-1 mb-2">
        {(['login', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError('') }}
            className={`flex-1 py-2.5 rounded-lg font-sans text-sm font-medium transition-all ${
              mode === m ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {m === 'login' ? 'sign in' : 'create account'}
          </button>
        ))}
      </div>
      <div>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError('')
          }}
          placeholder="email address"
          autoFocus
          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-sans text-base placeholder-white/25 focus:ring-2 focus:ring-[#C41E2A]/50 focus:border-[#C41E2A]/30 transition-all outline-none"
        />
      </div>
      <div>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError('')
          }}
          placeholder="password"
          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-sans text-base placeholder-white/25 focus:ring-2 focus:ring-[#C41E2A]/50 focus:border-[#C41E2A]/30 transition-all outline-none"
        />
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[#C41E2A] font-sans text-sm text-center"
        >
          {error}
        </motion.p>
      )}

      <button
        type="submit"
        disabled={isLoading || !email.trim() || !password.trim()}
        className="w-full py-4 bg-[#C41E2A] hover:bg-[#a81823] rounded-xl text-white font-sans text-base font-medium transition-all disabled:opacity-30 active:scale-[0.98] shadow-lg shadow-[#C41E2A]/20"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        ) : (
          mode === 'signup' ? 'create account' : 'sign in'
        )}
      </button>

      {/* Skip for now — auth is not yet enforced */}
      <button
        type="button"
        onClick={handleSkip}
        disabled={skipping}
        className="w-full py-3 text-white/40 hover:text-white/70 font-sans text-sm transition-colors disabled:opacity-30"
      >
        {skipping ? 'skipping…' : 'skip for now →'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="w-12 h-1 bg-[#C41E2A] mx-auto mb-8" />
          <h1 className="font-display text-3xl text-white font-light lowercase tracking-tight">
            grant&rsquo;s estate agents
          </h1>
          <p className="text-white/30 font-sans text-sm mt-3 lowercase">
            proposal system
          </p>
        </div>

        <Suspense fallback={<div className="h-40" />}>
          <LoginForm />
        </Suspense>

        <p className="text-white/15 font-sans text-xs text-center mt-10">
          proposalto.com
        </p>
      </motion.div>
    </div>
  )
}
