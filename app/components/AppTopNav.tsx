// app/components/AppTopNav.tsx
'use client'

import { useRouter } from 'next/navigation'

export default function AppTopNav({ current }: { current?: string }) {
  const router = useRouter()

  const navItems = [
    { name: '대시보드', path: '/dashboard', id: 'dashboard' },
    { name: '주문 목록', path: '/orders', id: 'orders' },
    { name: '주문 접수', path: '/orders/new', id: 'new-order' },
    { name: '문의하기', path: '/inquiry', id: 'inquiry' },
    { name: '문의내역', path: '/inquiries', id: 'inquiries' },
  ]

  const handleLogout = () => {
    window.localStorage.removeItem('smilecad_token')
    window.localStorage.removeItem('smilecad_user')
    router.replace('/login')
  }

  return (
    <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div
        className="cursor-pointer text-[20px] font-black uppercase tracking-widest text-blue-600"
        onClick={() => router.push('/orders')}
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
                : 'border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f8fafc] hover:text-[#1e293b]'
            }`}
          >
            {item.name}
          </button>
        ))}

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-[#e2e8f0] bg-white px-5 py-2 text-[14px] font-bold text-[#64748b] transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}