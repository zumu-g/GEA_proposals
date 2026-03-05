import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-charcoal">
      <div className="w-full h-1 bg-gold" />
      <div className="text-left max-w-md pt-32 sm:pt-40 px-6 sm:px-12 lg:px-24">
        <p className="text-gold font-sans text-sm tracking-wider-custom mb-8">
          grant estate agents
        </p>
        <div className="gold-accent-line mb-8" />
        <h1 className="font-display text-5xl font-normal text-white lowercase mb-3">404</h1>
        <h2 className="font-display text-2xl font-normal text-white/80 lowercase mb-4">proposal not found</h2>
        <p className="text-white/40 font-sans font-light mb-8">
          the proposal you're looking for doesn't exist or has been removed.
        </p>
        <Link href="/">
          <Button variant="primary">
            go home
          </Button>
        </Link>
      </div>
    </div>
  )
}
