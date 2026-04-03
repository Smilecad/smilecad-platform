'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()

      if (data.user) {
        router.replace('/dashboard')
      } else {
        router.replace('/login')
      }
    }

    checkUser()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="text-lg font-medium text-slate-600">이동 중...</div>
    </div>
  )
}