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

  const isActive = (item: { id: string; path: string }) =>
    current === item.id || current === item.path.substring(1)

  return (
    <header className="mb-8 border-b border-slate-200/70 bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <button
          type="button"
          onClick={() => router.push('/orders')}
          className="group flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-100 transition-transform group-hover:scale-105">
            <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none">
              <path
                d="M11 10C15 5 25 5 29 10C33 15 31 22 27 26C24 29 24 35 20 35C16 35 16 29 13 26C9 22 7 15 11 10Z"
                fill="white"
                opacity="0.95"
              />
              <path
                d="M15 13C18 10 22 10 25 13"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-[25px] font-black tracking-tight text-slate-900">
              SmileCAD
            </span>
            <span className="text-[16px] font-semibold text-slate-400">Platform</span>
          </div>
        </button>

        <nav className="flex flex-wrap items-center gap-2 lg:justify-end">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => router.push(item.path)}
              className={`relative rounded-2xl px-5 py-2.5 text-[15px] font-extrabold transition-all ${
                isActive(item)
                  ? 'bg-blue-50 text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              {item.name}
              {isActive(item) && (
                <span className="absolute inset-x-5 -bottom-[19px] h-[3px] rounded-full bg-blue-600" />
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={handleLogout}
            className="ml-0 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-[15px] font-extrabold text-slate-600 shadow-sm transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500 lg:ml-5"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M15 7V5.8C15 4.8 14.2 4 13.2 4H6.8C5.8 4 5 4.8 5 5.8V18.2C5 19.2 5.8 20 6.8 20H13.2C14.2 20 15 19.2 15 18.2V17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M10 12H20M20 12L17 9M20 12L17 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            로그아웃
          </button>
        </nav>
      </div>
    </header>
  )
}