import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SmileCAD 주문 플랫폼',
  description: '교정유지장치 주문 및 관리 시스템',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}