// app/layout.tsx
import './globals.css'
import Providers from './providers'

export const metadata = {
  title: 'SmileCAD 주문 플랫폼',
  description: '치과 주문 접수 플랫폼',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}