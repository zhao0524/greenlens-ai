import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GreenLens AI',
  description: "Measure and reduce your organisation's AI carbon footprint",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
