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

const PAGE_SIZE = 10

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
  return String(name || '-')
    .replace(/\s*환자님\s*$/g, '')
    .replace(/\s*환자\s*$/g, '')
    .trim() || '-'
}

function statusBadgeClass(status?: string | null) {
  const value = getDisplayStatus(status)

  if (value.includes('제작 진행') || value.includes('완료')) {
    return 'bg-blue-50 text-blue-700 ring-blue-100'
  }

  if (value.includes('수정') || value.includes('재접수')) {
    return 'bg-red-50 text-red-700 ring-red-100'
  }

  if (value.includes('확인서')) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
  }

  if (value.includes('디자인') || value.includes('작업')) {
    return 'bg-amber-50 text-amber-700 ring-amber-100'
  }

  return 'bg-blue-50 text-blue-700 ring-blue-100'
}

function rowAccentClass(status?: string | null) {
  const value = getDisplayStatus(status)

  if (value.includes('제작 진행') || value.includes('완료')) return 'border-l-blue-400'
  if (value.includes('수정') || value.includes('재접수')) return 'border-l-red-400'
  if (value.includes('확인서')) return 'border-l-emerald-400'
  if (value.includes('디자인') || value.includes('작업')) return 'border-l-amber-400'

  return 'border-l-slate-200'
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

  return `${Number(year)}. ${Number(month)}. ${Number(day)}`
}

function formatOrderCreatedDate(order: OrderItem) {
  return formatDate(order.created_date_kst || order.created_at_kst || order.created_at)
}

function normalizeOrderNumber(order: OrderItem) {
  return String(order.order_number || `ORD-${order.id}`).trim()
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
  const [page, setPage] = useState(1)

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
        !patientKeyword ||
        String(order.patient_name || '').toLowerCase().includes(patientKeyword) ||
        String(order.clinic_name || '').toLowerCase().includes(patientKeyword) ||
        String(order.order_number || '').toLowerCase().includes(patientKeyword)

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

  useEffect(() => {
    setPage(1)
  }, [selectedStatus, startDate, endDate, patientSearch])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filteredOrders.length)
  const pageOrders = filteredOrders.slice(pageStart, pageEnd)

  const resetDateFilter = () => {
    setStartDate('')
    setEndDate('')
    setPatientSearch('')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-7 py-5 text-[15px] font-bold text-slate-500 shadow-sm">
          데이터를 불러오는 중입니다...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white px-5 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-[1920px]">
        <AppTopNav current="orders" />

        <section className="mt-8">
          <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[26px] font-black tracking-[-0.04em] text-slate-950 sm:text-[30px]">
                  {userRole === 'admin' ? '전체 주문 관리' : '주문 목록'}
                </h1>
                <span className="text-[13px] font-black text-slate-500">총 {filteredOrders.length}건</span>
              </div>

              <p className="mt-2 text-[13px] font-medium text-slate-500">
                {userRole === 'admin'
                  ? '모든 치과의 주문 내역을 조회합니다.'
                  : `${currentUser?.email || currentUser?.loginId || ''}님의 주문 내역입니다.`}
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[12px] font-black text-slate-700">환자명 검색</label>
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(event) => setPatientSearch(event.target.value)}
                  placeholder="예: 홍길동"
                  className="h-9 w-[180px] border-0 border-b border-slate-300 bg-transparent px-2 text-[13px] font-semibold text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-slate-900"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[12px] font-black text-slate-700">접수일 조회</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="h-9 w-[138px] border-0 border-b border-slate-300 bg-transparent px-2 text-[13px] font-semibold text-slate-700 outline-none focus:border-slate-900"
                />
                <span className="text-slate-400">~</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="h-9 w-[138px] border-0 border-b border-slate-300 bg-transparent px-2 text-[13px] font-semibold text-slate-700 outline-none focus:border-slate-900"
                />
                <button
                  type="button"
                  onClick={resetDateFilter}
                  className="h-9 px-3 text-[13px] font-black text-slate-500 transition hover:text-slate-950"
                >
                  초기화
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/orders/new')}
                  className="h-9 px-3 text-[13px] font-black text-slate-950 transition hover:text-blue-600"
                >
                  새 주문
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-2">
            {STATUS_TABS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedStatus(status)}
                className={`h-9 rounded-full px-3 text-[12px] font-black transition ${
                  selectedStatus === status
                    ? 'bg-slate-950 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
              <div>{error}</div>
              <button
                type="button"
                onClick={fetchOrders}
                className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-[13px] font-bold text-white transition hover:bg-red-700"
              >
                다시 시도
              </button>
            </div>
          )}

          {filteredOrders.length === 0 ? (
            <div className="flex min-h-[240px] items-center justify-center border-y border-slate-200 text-[14px] font-bold text-slate-400">
              조건에 맞는 주문이 없습니다.
            </div>
          ) : (
            <div>
              <div className="hidden grid-cols-[56px_88px_94px_minmax(220px,1fr)_minmax(160px,0.9fr)_132px] border-b border-slate-200 px-3 pb-3 text-[12px] font-black text-slate-700 lg:grid xl:grid-cols-[56px_88px_94px_minmax(260px,1.4fr)_minmax(180px,1fr)_132px]">
                <div className="text-center">#</div>
                <div>접수일</div>
                <div>납기일</div>
                <div>치과</div>
                <div>환자</div>
                <div className="text-center">상태</div>
              </div>

              <div>
                {pageOrders.map((order, index) => {
                  const orderIndex = filteredOrders.length - (pageStart + index)
                  const displayStatus = getDisplayStatus(order.status)
                  const patientName = getPlainPatientName(order.patient_name)
                  const orderNumber = normalizeOrderNumber(order)

                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => router.push(`/orders/${order.id}`)}
                      className={`group grid w-full grid-cols-1 gap-3 border-b border-l-4 border-slate-100 px-3 py-4 text-left transition hover:bg-slate-50 lg:grid-cols-[56px_88px_94px_minmax(220px,1fr)_minmax(160px,0.9fr)_132px] lg:items-center lg:gap-0 xl:grid-cols-[56px_88px_94px_minmax(260px,1.4fr)_minmax(180px,1fr)_132px] ${rowAccentClass(order.status)}`}
                    >
                      <div className="flex items-center justify-between gap-3 lg:block lg:text-center">
                        <span className="text-[13px] font-black text-slate-800 lg:text-[14px]">{orderIndex}</span>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 lg:hidden ${statusBadgeClass(order.status)}`}>
                          {displayStatus}
                        </span>
                      </div>

                      <div className="text-[13px] font-bold leading-snug text-slate-700">
                        {formatOrderCreatedDate(order)}
                      </div>

                      <div className="text-[13px] font-black leading-snug text-slate-950">
                        {formatDate(order.delivery_date)}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-black text-slate-950" title={order.clinic_name || '-'}>
                          {order.clinic_name || '-'}
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-slate-400 lg:hidden">
                          {order.product_type || '-'}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-black text-slate-950" title={patientName}>
                          {patientName}
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-slate-600">
                          {orderNumber}
                        </div>
                      </div>

                      <div className="hidden justify-center lg:flex">
                        <span className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${statusBadgeClass(order.status)}`}>
                          {displayStatus}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-5 flex flex-col gap-4 px-3 text-[13px] font-bold text-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {filteredOrders.length === 0 ? '0건' : `${pageStart + 1}-${pageEnd} / ${filteredOrders.length}건`}
                </div>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, pageIndex) => pageIndex + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`h-8 min-w-8 rounded-full px-2 text-[13px] font-black transition ${
                        safePage === pageNumber
                          ? 'bg-slate-950 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
