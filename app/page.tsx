'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const token = window.localStorage.getItem('smilecad_token')

    if (token) {
      router.replace('/orders')
    } else {
      router.replace('/login')
    }
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
      이동 중...
    </main>
  )
}