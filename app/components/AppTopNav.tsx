'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

type CurrentMenu =
  | 'orders'
  | 'orders-new'
  | 'inquiry'
  | 'inquiry-history'
  | 'admin-inquiries'
  | 'dashboard'

type ProfileRow = {
  id: string
  role: string
  clinic_name: string | null
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function LogoBadge() {
  return (
    <div className="inline-flex items-center rounded-[18px] border border-[#d7deea] bg-white px-6 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <span className="text-[14px] font-extrabold tracking-[0.28em] text-[#2455ff]">
        SMILECAD PLATFORM
      </span>
    </div>
  )
}

function TopActionButton({
  label,
  active = false,
  onClick,
}: {
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'rounded-[18px] border px-6 py-3 text-[14px] font-bold transition whitespace-nowrap',
        active
          ? 'border-[#0f1b3d] bg-[#0f1b3d] text-white shadow-[0_10px_25px_rgba(15,27,61,0.18)]'
          : 'border-[#cfd7e3] bg-white text-[#344054] hover:bg-[#f8fafc]'
      )}
    >
      {label}
    </button>
  )
}

export default function AppTopNav({ current }: { current: CurrentMenu }) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!isMounted) return
      setIsAdmin(data?.role === 'admin')
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <LogoBadge />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <TopActionButton
          label="대시보드"
          active={current === 'dashboard'}
          onClick={() => router.push('/dashboard')}
        />

        <TopActionButton
          label="주문 목록"
          active={current === 'orders'}
          onClick={() => router.push('/orders')}
        />

        {!isAdmin && (
          <>
            <TopActionButton
              label="주문 접수"
              active={current === 'orders-new'}
              onClick={() => router.push('/orders/new')}
            />

            <TopActionButton
              label="문의하기"
              active={current === 'inquiry'}
              onClick={() => router.push('/inquiry')}
            />

            <TopActionButton
              label="문의내역"
              active={current === 'inquiry-history'}
              onClick={() => router.push('/inquiry/history')}
            />
          </>
        )}

        {isAdmin && (
          <TopActionButton
            label="문의관리"
            active={current === 'admin-inquiries'}
            onClick={() => router.push('/admin/inquiries')}
          />
        )}

        <TopActionButton label="로그아웃" onClick={handleLogout} />
      </div>
    </div>
  )
}