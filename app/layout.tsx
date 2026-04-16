// app/layout.tsx
import './globals.css'
import { NextAuthProvider } from "./providers"; // '@/app/providers' 대신 상대경로 사용

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
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  )
}