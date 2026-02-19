import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

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

export const metadata: Metadata = {
  title: 'CivicPie - Your Chicago Civic Connection',
  description: 'Connect with your ward, alderman, and local government. AI-powered civic engagement for Chicago neighborhoods.',
  keywords: ['Chicago', 'civic engagement', 'alderman', 'ward', 'local government', 'politics'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-slate-50">
        {children}
      </body>
    </html>
  )
}
