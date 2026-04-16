// app/orders/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import AppTopNav from '@/app/components/AppTopNav'

type OrderStatus = '전체' | '접수 대기' | '디자인 작업중' | '수정 요청 중' | '주문 재접수'
const STATUS_TABS: OrderStatus[] = ['전체', '접수 대기', '디자인 작업중', '수정 요청 중', '주문 재접수']

export default function OrdersPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('전체')
  
  const [userRole, setUserRole] = useState('clinic')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.replace('/login')
      return
    }

    if (sessionStatus === 'authenticated' && session?.user?.email) {
      const fetchOrders = async () => {
        try {
          setLoading(true)
          const res = await fetch(`/api/orders?email=${session.user.email}`)
          const data = await res.json()
          
          if (!res.ok) throw new Error(data.error || '목록 로드 실패')
          
          setOrders(data.orders || [])
          setUserRole(data.role || 'clinic')
        } catch (err: any) {
          setError(err.message)
        } finally {
          setLoading(false)
        }
      }
      fetchOrders()
    }
  }, [sessionStatus, session, router])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchStatus = selectedStatus === '전체' || order.status === selectedStatus

      const orderDate = new Date(order.created_at)
      orderDate.setHours(0, 0, 0, 0)

      let matchStartDate = true
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        matchStartDate = orderDate >= start
      }

      let matchEndDate = true
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        matchEndDate = orderDate <= end
      }

      return matchStatus && matchStartDate && matchEndDate
    })
  }, [orders, selectedStatus, startDate, endDate])

  const resetDateFilter = () => {
    setStartDate('')
    setEndDate('')
  }

  if (sessionStatus === 'loading' || loading) {
    return <div className="flex min-h-screen items-center justify-center font-bold text-slate-500 text-lg">데이터를 불러오는 중입니다...</div>
  }

  return (
    <main className="min-h-screen bg-[#f3f5f9] px-6 py-10">
      <div className="mx-auto w-full max-w-[1480px]">
        <AppTopNav current="orders" />

        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4">
              <div className="text-[30px] font-extrabold tracking-tight text-[#1f2937]">
                {userRole === 'admin' ? '전체 주문 관리 (관리자)' : '주문 목록'}
              </div>
              
              <div className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 shadow-lg shadow-blue-100">
                <span className="text-[13px] font-bold text-blue-100 uppercase tracking-wider">Total</span>
                <span className="text-[22px] font-black text-white">
                  {filteredOrders.length}
                </span>
                <span className="text-[13px] font-bold text-blue-100">건</span>
              </div>
            </div>
            
            <div className="mt-2 text-[14px] text-[#98a2b3]">
              {userRole === 'admin' 
                ? '모든 치과의 주문 내역을 조회합니다.' 
                : `${session?.user?.email}님의 주문 내역입니다.`
              }
            </div>
          </div>
          
          <button
            onClick={() => router.push('/orders/new')}
            className="rounded-[14px] bg-[#3b82f6] px-6 py-3 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(59,130,246,0.24)] transition hover:bg-[#2563eb]"
          >
            + 새 주문하기
          </button>
        </div>

        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`rounded-[12px] px-5 py-2.5 text-[14px] font-bold transition ${
                  selectedStatus === status
                    ? 'bg-[#1f2937] text-white shadow-md'
                    : 'bg-white text-[#667085] hover:bg-[#f8fafc] border border-[#e1e7ef]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-[14px] bg-white p-2 border border-[#e1e7ef] shadow-sm">
            <div className="px-3 text-[13px] font-bold text-[#667085]">접수일 조회</div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-[8px] bg-[#f8fafc] px-3 py-1.5 text-[14px] text-[#475467] outline-none border border-transparent focus:border-[#9db7ff]"
            />
            <span className="text-[#98a2b3]">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-[8px] bg-[#f8fafc] px-3 py-1.5 text-[14px] text-[#475467] outline-none border border-transparent focus:border-[#9db7ff]"
            />
            <button
              onClick={resetDateFilter}
              className="rounded-[8px] bg-[#f1f5f9] px-4 py-1.5 text-[13px] font-bold text-[#64748b] transition hover:bg-[#e2e8f0]"
            >
              초기화
            </button>
          </div>
        </div>

        {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-600 border border-red-100">{error}</div>}

        <div className="overflow-hidden rounded-[28px] border border-[#d9e0ea] bg-white p-8 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          {filteredOrders.length === 0 ? (
            <div className="py-20 text-center text-[15px] font-semibold text-[#98a2b3]">조건에 맞는 주문이 없습니다.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredOrders.map((order) => {
                const orderIndex = orders.length - orders.indexOf(order);

                return (
                  // 🚀 p-5를 p-4로, gap-5를 gap-4로 줄여서 정보 밀도를 높임
                  <div
                    key={order.id}
                    className="flex flex-col items-center justify-between gap-4 rounded-[18px] border border-[#e1e7ef] bg-white p-4 shadow-sm transition hover:border-[#3b82f6] hover:shadow-[0_8px_24px_rgba(59,130,246,0.12)] sm:flex-row"
                  >
                    <div className="flex w-[60px] shrink-0 items-center justify-center font-black text-blue-600/30 text-[20px]">
                      {String(orderIndex).padStart(2, '0')}
                    </div>

                    <div className="flex w-fit min-w-[72px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1.5 text-[11px] font-bold text-[#16a34a]">
                      {order.status}
                    </div>

                    <div className="flex flex-1 flex-col min-w-[160px]">
                      <span className="text-[17px] font-black text-[#1f2937]">
                        {order.patient_name || '-'} 환자님
                      </span>
                      <span className="mt-1 text-[11px] font-bold text-[#98a2b3]">
                        {order.order_number}
                      </span>
                    </div>

                    <div className="flex flex-[2.5] items-center justify-between text-[13px] text-[#475467] sm:justify-around">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-bold text-[#98a2b3] mb-1">제품 유형</span>
                        <span className="font-extrabold text-[#1f2937]">{order.product_type || '-'}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-bold text-[#98a2b3] mb-1">희망 납기일</span>
                        <span className="font-extrabold text-blue-600">{order.delivery_date || '-'}</span>
                      </div>
                      {userRole === 'admin' && (
                        <div className="flex flex-col items-center">
                          <span className="text-[11px] font-bold text-[#98a2b3] mb-1">치과명</span>
                          <span className="font-extrabold text-[#3b82f6]">{order.clinic_name || '-'}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex w-full shrink-0 items-center justify-between sm:w-auto sm:flex-col sm:items-end sm:gap-2">
                      <span className="text-[11px] font-bold text-[#98a2b3]">
                        접수일: {new Date(order.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="rounded-[10px] border border-[#d6dde8] px-5 py-2 text-[13px] font-bold text-[#475467] transition hover:bg-[#f8fafc] hover:text-[#1f2937]"
                      >
                        상세 보기
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}