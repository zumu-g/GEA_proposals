import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import '../styles/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#1A1A1A',
}

export const metadata: Metadata = {
  title: 'GEA Property Proposal',
  description: 'Professional estate agency proposal',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GEA Proposal',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
