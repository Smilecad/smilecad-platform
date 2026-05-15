// app/components/AppTopNav.tsx
'use client'

import { useRouter } from 'next/navigation'

export default function AppTopNav({ current }: { current?: string }) {
  const router = useRouter()

  const navItems = [
    { name: '대시보드', path: '/dashboard', id: 'dashboard' },
    { name: '주문 목록', path: '/orders', id: 'orders' },
    { name: '주문 접수', path: '/orders/new', id: 'orders-new' },
    { name: '문의하기', path: '/inquiry', id: 'inquiry' },
    { name: '문의내역', path: '/inquiries', id: 'inquiries' },
  ]

  const handleLogout = () => {
    window.localStorage.removeItem('smilecad_token')
    window.localStorage.removeItem('smilecad_user')
    router.replace('/login')
  }

  const isActive = (item: { id: string; path: string }) => {
    return current === item.id || current === item.path.substring(1)
  }

  return (
    <header className="mb-8 rounded-[26px] border border-[#e5eaf2] bg-white px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)] sm:px-7 sm:py-5 lg:mb-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <button
          type="button"
          onClick={() => router.push('/orders')}
          className="flex items-center gap-3 text-left"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_10px_22px_rgba(37,99,235,0.24)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <path
                d="M12 21C12 21 18 15.8 18 9.8C18 6.5 15.3 4 12 4C8.7 4 6 6.5 6 9.8C6 15.8 12 21 12 21Z"
                fill="currentColor"
              />
              <circle cx="12" cy="9.8" r="2.2" fill="white" opacity="0.9" />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="whitespace-nowrap text-[23px] font-black leading-none tracking-[-0.04em] text-[#111827] sm:text-[26px]">
              SmileCAD
              <span className="ml-1 text-[14px] font-black text-[#94a3b8] sm:text-[16px]">
                Platform
              </span>
            </div>
          </div>
        </button>

        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center lg:justify-end">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => router.push(item.path)}
              className={`min-h-[42px] rounded-[14px] px-4 py-2 text-[14px] font-black transition-all ${
                isActive(item)
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
            className="min-h-[42px] rounded-[14px] border border-[#e2e8f0] bg-white px-4 py-2 text-[14px] font-black text-[#64748b] transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500 sm:col-span-1"
          >
            로그아웃
          </button>
        </nav>
      </div>
    </header>
  )
}