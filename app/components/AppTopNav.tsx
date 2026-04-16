// app/components/AppTopNav.tsx
'use client'

import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

export default function AppTopNav({ current }: { current?: string }) {
  const router = useRouter()

  // 🚀 이동할 페이지 주소들을 정확히 매칭해 줍니다.
  const navItems = [
    { name: '대시보드', path: '/dashboard', id: 'dashboard' },
    { name: '주문 목록', path: '/orders', id: 'orders' },
    { name: '주문 접수', path: '/orders/new', id: 'new-order' },
    { name: '문의하기', path: '/inquiry', id: 'inquiry' },
    { name: '문의내역', path: '/inquiries', id: 'inquiries' }, // <- 여기에 연결 완료!
  ]

  return (
    <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div 
        className="cursor-pointer text-[20px] font-black tracking-widest text-blue-600 uppercase" 
        onClick={() => router.push('/dashboard')}
      >
        Smilecad Platform
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => router.push(item.path)}
            className={`rounded-full px-5 py-2 text-[14px] font-bold transition-all ${
              current === item.id || current === item.path.substring(1)
                ? 'bg-[#1e293b] text-white shadow-md'
                : 'bg-white text-[#64748b] border border-[#e2e8f0] hover:bg-[#f8fafc] hover:text-[#1e293b]'
            }`}
          >
            {item.name}
          </button>
        ))}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="rounded-full bg-white px-5 py-2 text-[14px] font-bold text-[#64748b] border border-[#e2e8f0] hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}