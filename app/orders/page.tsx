// app/orders/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppTopNav from '@/app/components/AppTopNav'

type OrderStatus = '전체' | '주문 접수' | '디자인 작업중' | '디자인 확인서 발송' | '수정 요청 중' | '제작 진행'

type StoredUser = {
  id?: number
  loginId?: string
  email?: string
  role?: string
  phone?: string | null
}

type OrderItem = {
  id: string | number
  order_number?: string | null
  status?: string | null
  patient_name?: string | null
  product_type?: string | null
  delivery_date?: string | null
  clinic_name?: string | null

  created_at?: string | null
  created_at_kst?: string | null
  created_date_kst?: string | null
  created_time_kst?: string | null

  updated_at?: string | null
  updated_at_kst?: string | null
  updated_date_kst?: string | null
  updated_time_kst?: string | null
}

const STATUS_TABS: OrderStatus[] = [
  '전체',
  '주문 접수',
  '디자인 작업중',
  '디자인 확인서 발송',
  '수정 요청 중',
  '제작 진행',
]

const LIST_ORDERS_API_URL =
  process.env.NEXT_PUBLIC_NCP_LIST_ORDERS_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/list-orders'

const DEFAULT_LIST_ERROR =
  '주문 목록을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요. 문제가 반복되면 스마일캐드에 문의해주세요.'

function isTechnicalErrorMessage(message: string) {
  const value = message.toLowerCase()

  const technicalKeywords = [
    'failed to fetch',
    'networkerror',
    'cors',
    'access-control',
    'column',
    'relation',
    'constraint',
    'violates',
    'not-null',
    'null value',
    'syntax error',
    'jwt_secret',
    'object storage',
    'access key',
    'secret key',
    '환경변수',
    'statuscode',
    '상태코드',
    'internal server error',
    'bad gateway',
    'gateway',
    'unexpected token',
    'json',
    'database',
    'db_',
    'postgres',
    'sql',
    'api gateway',
    '토큰 서명',
  ]

  return technicalKeywords.some((keyword) => value.includes(keyword))
}

function toSafeUserMessage(error: unknown, fallback = DEFAULT_LIST_ERROR) {
  const message = error instanceof Error ? error.message : String(error || '')

  if (!message) return fallback

  const safeMessages = [
    '인증 토큰이 필요합니다.',
    '토큰이 만료되었습니다.',
    '로그인 정보가 없습니다. 다시 로그인해주세요.',
    '주문을 찾을 수 없거나 접근 권한이 없습니다.',
  ]

  if (safeMessages.some((safeMessage) => message.includes(safeMessage))) {
    return message
  }

  if (isTechnicalErrorMessage(message)) {
    return fallback
  }

  return fallback
}

function getDisplayStatus(status?: string | null) {
  const value = String(status || '').trim()

  if (!value || value === '접수 대기') return '주문 접수'

  return value
}

function getPlainPatientName(name?: string | null) {
  return (
    String(name || '-')
      .replace(/\s*환자님\s*$/g, '')
      .replace(/\s*환자\s*$/g, '')
      .trim() || '-'
  )
}

function statusBadgeClass(status?: string | null) {
  const value = getDisplayStatus(status)

  if (value.includes('제작 진행') || value.includes('완료')) {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }

  if (value.includes('수정') || value.includes('재접수')) {
    return 'border-red-200 bg-red-50 text-red-700'
  }

  if (value.includes('확인서')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (value.includes('디자인') || value.includes('작업')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  return 'border-blue-200 bg-blue-50 text-blue-700'
}

function statusAccentClass(status?: string | null) {
  const value = getDisplayStatus(status)

  if (value.includes('제작 진행') || value.includes('완료')) {
    return 'before:bg-blue-500'
  }

  if (value.includes('수정') || value.includes('재접수')) {
    return 'before:bg-red-500'
  }

  if (value.includes('확인서')) {
    return 'before:bg-emerald-500'
  }

  if (value.includes('디자인') || value.includes('작업')) {
    return 'before:bg-amber-400'
  }

  return 'before:bg-blue-400'
}

function extractDateKey(value?: string | null) {
  if (!value) return ''

  const text = String(value).trim()

  const directMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (directMatch) {
    return `${directMatch[1]}-${directMatch[2]}-${directMatch[3]}`
  }

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return ''

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return formatter.format(date)
}

function getOrderCreatedDateKey(order: OrderItem) {
  return (
    extractDateKey(order.created_date_kst) ||
    extractDateKey(order.created_at_kst) ||
    extractDateKey(order.created_at)
  )
}

function formatDate(value?: string | null) {
  const dateKey = extractDateKey(value)

  if (!dateKey) return '-'

  const [year, month, day] = dateKey.split('-')

  return `${Number(year)}. ${Number(month)}. ${Number(day)}.`
}

function formatOrderCreatedDate(order: OrderItem) {
  return formatDate(
    order.created_date_kst ||
      order.created_at_kst ||
      order.created_at
  )
}

export default function OrdersPage() {
  const router = useRouter()

  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('전체')
  const [userRole, setUserRole] = useState('clinic')
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [patientSearch, setPatientSearch] = useState('')

  const fetchOrders = useCallback(async () => {
    const token = window.localStorage.getItem('smilecad_token')
    const userRaw = window.localStorage.getItem('smilecad_user')

    if (!token) {
      router.replace('/login?force=1')
      return
    }

    let storedUser: StoredUser | null = null

    try {
      storedUser = userRaw ? JSON.parse(userRaw) : null
    } catch (parseError) {
      console.error('저장된 사용자 정보 파싱 실패:', parseError)
      storedUser = null
    }

    setCurrentUser(storedUser)

    try {
      setLoading(true)
      setError('')

      const res = await fetch(LIST_ORDERS_API_URL, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const text = await res.text()
      let data: any = null

      try {
        data = text ? JSON.parse(text) : null
      } catch (parseError) {
        console.error('list-orders JSON 파싱 실패:', {
          status: res.status,
          text,
          error: parseError,
        })

        throw new Error('API 응답을 처리할 수 없습니다.')
      }

      if (res.status === 401 || res.status === 403) {
        window.localStorage.removeItem('smilecad_token')
        window.localStorage.removeItem('smilecad_user')
        router.replace('/login?force=1')
        return
      }

      if (!res.ok || !data?.success) {
        console.error('list-orders 응답 오류:', data)
        throw new Error(data?.error || DEFAULT_LIST_ERROR)
      }

      setOrders(data.orders || [])
      setUserRole(data.role || storedUser?.role || 'clinic')
    } catch (err) {
      console.error('주문 목록 조회 실패:', err)
      setOrders([])
      setError(toSafeUserMessage(err, DEFAULT_LIST_ERROR))
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const filteredOrders = useMemo(() => {
    const patientKeyword = patientSearch.trim().toLowerCase()

    return orders.filter((order) => {
      const matchStatus = selectedStatus === '전체' || getDisplayStatus(order.status) === selectedStatus
      const matchPatient =
        !patientKeyword || String(order.patient_name || '').toLowerCase().includes(patientKeyword)

      const orderDateKey = getOrderCreatedDateKey(order)

      if (!orderDateKey) {
        return matchStatus && matchPatient
      }

      let matchStartDate = true
      if (startDate) {
        matchStartDate = orderDateKey >= startDate
      }

      let matchEndDate = true
      if (endDate) {
        matchEndDate = orderDateKey <= endDate
      }

      return matchStatus && matchPatient && matchStartDate && matchEndDate
    })
  }, [orders, selectedStatus, startDate, endDate, patientSearch])

  const resetDateFilter = () => {
    setStartDate('')
    setEndDate('')
    setPatientSearch('')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f9] px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-7 py-5 text-[15px] font-bold text-slate-500 shadow-sm">
          데이터를 불러오는 중입니다...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f3f5f9] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[1480px]">
        <AppTopNav current="orders" />

        <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="text-[28px] font-extrabold leading-tight tracking-tight text-[#1f2937] sm:text-[30px]">
                {userRole === 'admin' ? '전체 주문 관리' : '주문 목록'}
              </div>

              <div className="flex w-fit items-center gap-2 rounded-full bg-blue-600 px-5 py-2 shadow-lg shadow-blue-100">
                <span className="text-[12px] font-bold uppercase tracking-wider text-blue-100">
                  Total
                </span>
                <span className="text-[20px] font-black text-white">
                  {filteredOrders.length}
                </span>
                <span className="text-[12px] font-bold text-blue-100">건</span>
              </div>
            </div>

            <div className="mt-2 text-[13px] text-[#98a2b3] sm:text-[14px]">
              {userRole === 'admin'
                ? '모든 치과의 주문 내역을 조회합니다.'
                : `${currentUser?.email || currentUser?.loginId || ''}님의 주문 내역입니다.`}
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/orders/new')}
            className="w-full rounded-[14px] bg-[#3b82f6] px-6 py-3 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(59,130,246,0.24)] transition hover:bg-[#2563eb] sm:w-auto"
          >
            + 새 주문하기
          </button>
        </div>

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {STATUS_TABS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedStatus(status)}
                className={`rounded-[12px] px-4 py-3 text-[13px] font-bold transition sm:px-5 sm:py-2.5 sm:text-[14px] ${
                  selectedStatus === status
                    ? 'bg-[#1f2937] text-white shadow-md'
                    : 'border border-[#e1e7ef] bg-white text-[#667085] hover:bg-[#f8fafc]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-[minmax(220px,300px)_auto] lg:w-auto lg:items-start">
            <div className="rounded-[16px] border border-[#e1e7ef] bg-white p-3 shadow-sm">
              <div className="mb-3 whitespace-nowrap text-[13px] font-bold text-[#667085]">
                환자명 검색
              </div>

              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="예: 홍길동"
                className="h-10 w-full rounded-[10px] bg-[#f8fafc] px-3 text-[14px] font-semibold text-[#475467] outline-none focus:border-[#9db7ff] focus:bg-white"
              />
            </div>

            <div className="rounded-[16px] border border-[#e1e7ef] bg-white p-3 shadow-sm">
              <div className="mb-3 whitespace-nowrap text-[13px] font-bold text-[#667085]">
                접수일 조회
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 w-full rounded-[10px] bg-[#f8fafc] px-3 text-[14px] text-[#475467] outline-none focus:border-[#9db7ff] sm:w-auto"
                />

                <span className="hidden text-[#98a2b3] sm:inline">~</span>

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 w-full rounded-[10px] bg-[#f8fafc] px-3 text-[14px] text-[#475467] outline-none focus:border-[#9db7ff] sm:w-auto"
                />

                <button
                  type="button"
                  onClick={resetDateFilter}
                  className="h-10 w-full rounded-[10px] bg-[#f1f5f9] px-4 text-[13px] font-bold text-[#64748b] transition hover:bg-[#e2e8f0] sm:w-auto"
                >
                  초기화
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-[18px] border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-600">
            <div>{error}</div>
            <button
              type="button"
              onClick={fetchOrders}
              className="mt-4 rounded-[12px] bg-red-600 px-5 py-2 text-[13px] font-bold text-white transition hover:bg-red-700"
            >
              다시 시도
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-[24px] border border-[#d9e0ea] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:rounded-[28px] sm:p-7">
          {filteredOrders.length === 0 ? (
            <div className="flex min-h-[210px] items-center justify-center px-4 py-16 text-center text-[15px] font-semibold text-[#98a2b3]">
              조건에 맞는 주문이 없습니다.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="hidden rounded-[16px] border border-[#e7edf5] bg-[#f8fafc] px-5 py-3 text-[12px] font-black text-[#667085] lg:grid lg:grid-cols-[70px_120px_140px_minmax(260px,1.2fr)_minmax(220px,1fr)_130px] lg:items-center lg:gap-5">
                <div className="text-center">#</div>
                <div>접수일</div>
                <div>납기일</div>
                <div>치과</div>
                <div>환자</div>
                <div className="text-center">상태</div>
              </div>

              {filteredOrders.map((order, index) => {
                const orderIndex = filteredOrders.length - index
                const displayStatus = getDisplayStatus(order.status)
                const patientName = getPlainPatientName(order.patient_name)

                return (
                  <div
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/orders/${order.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        router.push(`/orders/${order.id}`)
                      }
                    }}
                    className={`relative grid cursor-pointer grid-cols-1 gap-3 overflow-hidden rounded-[18px] border border-[#e1e7ef] bg-white px-5 py-3.5 shadow-sm transition before:absolute before:left-0 before:top-0 before:h-full before:w-[4px] hover:border-[#3b82f6] hover:shadow-[0_8px_24px_rgba(59,130,246,0.12)] focus:outline-none focus:ring-4 focus:ring-blue-100 lg:grid-cols-[70px_120px_140px_minmax(260px,1.2fr)_minmax(220px,1fr)_130px] lg:items-center lg:gap-5 ${statusAccentClass(
                      order.status
                    )}`}
                  >
                    <div className="flex items-start gap-3 lg:justify-center">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[14px] font-black text-blue-600">
                        {String(orderIndex).padStart(2, '0')}
                      </div>

                      <div className="min-w-0 flex-1 lg:hidden">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex w-fit shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-bold ${statusBadgeClass(
                              order.status
                            )}`}
                          >
                            {displayStatus}
                          </span>
                        </div>

                        <div className="mt-2 text-[16px] font-black leading-tight text-[#1f2937]">
                          {patientName}
                        </div>

                        <div className="mt-1 text-[11px] font-bold text-[#98a2b3]">
                          {order.order_number || `ORDER-${order.id}`}
                        </div>
                      </div>
                    </div>

                    <div className="hidden min-w-0 text-[13px] font-extrabold text-[#475467] lg:block">
                      {formatOrderCreatedDate(order)}
                    </div>

                    <div className="hidden min-w-0 text-[15px] font-black text-blue-600 lg:block">
                      {formatDate(order.delivery_date)}
                    </div>

                    <div className="hidden min-w-0 lg:block">
                      <div className="truncate text-[15px] font-black text-[#1f2937]" title={order.clinic_name || '-'}>
                        {order.clinic_name || '-'}
                      </div>
                      <div className="mt-1 text-[11px] font-bold text-[#94a3b8]">
                        {order.product_type || '-'}
                      </div>
                    </div>

                    <div className="hidden min-w-0 lg:block">
                      <div className="truncate text-[15px] font-black text-[#1f2937]" title={patientName}>
                        {patientName}
                      </div>
                      <div className="mt-1 text-[11px] font-bold text-[#64748b]">
                        {order.order_number || `ORDER-${order.id}`}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-[14px] bg-[#f8fafc] p-3 text-[12px] text-[#475467] sm:grid-cols-4 lg:hidden">
                      <div className="flex min-w-0 flex-col">
                        <span className="mb-1 text-[10px] font-bold text-[#98a2b3]">접수일</span>
                        <span className="truncate font-extrabold">{formatOrderCreatedDate(order)}</span>
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <span className="mb-1 text-[10px] font-bold text-[#98a2b3]">납기일</span>
                        <span className="truncate font-extrabold text-blue-600">{formatDate(order.delivery_date)}</span>
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <span className="mb-1 text-[10px] font-bold text-[#98a2b3]">치과</span>
                        <span className="truncate font-extrabold" title={order.clinic_name || '-'}>
                          {order.clinic_name || '-'}
                        </span>
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <span className="mb-1 text-[10px] font-bold text-[#98a2b3]">제품</span>
                        <span className="truncate font-extrabold text-[#64748b]" title={order.product_type || '-'}>
                          {order.product_type || '-'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-[#eef2f6] pt-2 lg:justify-center lg:border-t-0 lg:pt-0">
                      <span className="text-[11px] font-bold text-[#98a2b3] lg:hidden">현재 상태</span>
                      <span
                        className={`inline-flex min-w-[98px] justify-center whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-black ${statusBadgeClass(
                          order.status
                        )}`}
                      >
                        {displayStatus}
                      </span>
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
