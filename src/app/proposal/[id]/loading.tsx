export default function Loading() {
  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-gold border-t-transparent mb-6"></div>
        <p className="text-white/40 font-sans font-light text-sm lowercase tracking-wider-custom">loading proposal</p>
      </div>
    </div>
  )
}
