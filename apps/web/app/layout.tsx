import type { Metadata } from 'next'
import { Noto_Sans_Bengali } from 'next/font/google'
import localFont from 'next/font/local'
import { Providers } from '@/lib/providers'
import './globals.css'

/**
 * Noto Sans Bengali — supports the full Unicode Bengali block (U+0980–U+09FF).
 * Used as the primary font for Bangla text rendering.
 */
const notoSansBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-noto-sans-bengali',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
})

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'আমারস্পেস - অ্যাপার্টমেন্ট ব্যবস্থাপনা',
  description:
    'বাংলাদেশের অ্যাপার্টমেন্ট মালিক, ম্যানেজার এবং ভাড়াটিয়াদের জন্য সম্পূর্ণ ব্যবস্থাপনা প্ল্যাটফর্ম',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body
        className={`${notoSansBengali.variable} ${geistSans.variable} ${geistMono.variable} font-sans`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
