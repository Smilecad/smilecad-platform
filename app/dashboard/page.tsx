// app/dashboard/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppTopNav from '@/app/components/AppTopNav'

type StoredUser = {
  id?: number
  loginId?: string
  email?: string
  role?: string
}

type OrderItem = {
  id: string | number
  order_number?: string | null
  status?: string | null
  patient_name?: string | null
  product_type?: string | null
  delivery_date?: string | null
  clinic_name?: string | null
  total_price?: number | string | null
  created_at?: string | null
  created_at_kst?: string | null
  created_date_kst?: string | null
  created_time_kst?: string | null
}

type ActivityLogItem = {
  id?: number
  event_type?: string | null
  event_action?: string | null
  order_id?: number | null
  target_type?: string | null
  target_id?: string | null
  login_id?: string | null
  user_role?: string | null
  clinic_name?: string | null
  success?: boolean | null
  message?: string | null
  created_at?: string | null
  created_at_kst?: string | null
}

type SummaryCard = {
  label: string
  value: number | string
  description: string
  tone: 'blue' | 'amber' | 'emerald' | 'orange' | 'slate'
}

const LIST_ORDERS_API_URL =
  process.env.NEXT_PUBLIC_NCP_LIST_ORDERS_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/list-orders'

const LIST_ACTIVITY_LOGS_API_URL =
  process.env.NEXT_PUBLIC_NCP_LIST_ACTIVITY_LOGS_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/list-activity-logs'

const DEFAULT_DASHBOARD_ERROR =
  '대시보드 정보를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'

const STATUS_FLOW = [
  '주문 접수',
  '디자인 작업중',
  '디자인 확인서 발송',
  '수정 요청 중',
  '제작 진행',
]

function getDisplayStatus(status?: string | null) {
  const value = String(status || '').trim()

  if (!value || value === '접수 대기') return '주문 접수'
  if (value === '주문 재접수') return '수정 요청 중'
  if (value === '제작 완료') return '제작 진행'

  return value
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

function extractTimeKey(value?: string | null) {
  if (!value) return ''

  const text = String(value).trim()
  const directMatch = text.match(/^\d{4}-\d{2}-\d{2}[ T](\d{2}):(\d{2})(?::(\d{2}))?/)

  if (directMatch) {
    return `${directMatch[1]}:${directMatch[2]}:${directMatch[3] || '00'}`
  }

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

function formatDate(value?: string | null) {
  const dateKey = extractDateKey(value)

  if (!dateKey) return '-'

  const [year, month, day] = dateKey.split('-')

  return `${Number(year)}. ${Number(month)}. ${Number(day)}.`
}

function formatDateTime(value?: string | null) {
  const dateKey = extractDateKey(value)
  const timeKey = extractTimeKey(value)

  if (!dateKey) return '-'

  const [year, month, day] = dateKey.split('-')
  const dateText = `${Number(year)}. ${Number(month)}. ${Number(day)}.`

  return timeKey ? `${dateText} ${timeKey}` : dateText
}

function getTodayDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getOrderCreatedDateKey(order: OrderItem) {
  return (
    extractDateKey(order.created_date_kst) ||
    extractDateKey(order.created_at_kst) ||
    extractDateKey(order.created_at)
  )
}

function getOrderCreatedDateTime(order: OrderItem) {
  return formatDateTime(order.created_at_kst || order.created_at)
}

function getToneClass(tone: SummaryCard['tone']) {
  if (tone === 'blue') return 'border-blue-100 bg-blue-50 text-blue-700'
  if (tone === 'amber') return 'border-amber-100 bg-amber-50 text-amber-700'
  if (tone === 'emerald') return 'border-emerald-100 bg-emerald-50 text-emerald-700'
  if (tone === 'orange') return 'border-orange-100 bg-orange-50 text-orange-700'

  return 'border-slate-200 bg-slate-50 text-slate-700'
}

function getStatusBadgeClass(status?: string | null) {
  const value = getDisplayStatus(status)

  if (value.includes('제작 진행') || value.includes('완료')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (value.includes('디자인') || value.includes('작업') || value.includes('확인서')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  if (value.includes('수정') || value.includes('재접수')) {
    return 'border-orange-200 bg-orange-50 text-orange-700'
  }

  return 'border-blue-200 bg-blue-50 text-blue-700'
}

function getEventLabel(eventType?: string | null) {
  const value = String(eventType || '').trim()

  const labels: Record<string, string> = {
    'order.created': '주문 생성',
    'order.create_failed': '주문 생성 실패',
    'order.status_changed': '상태 변경',
    'order.status_change_failed': '상태 변경 실패',
    'order.file_download_url_created': '파일 다운로드',
    'order.file_download_failed': '파일 다운로드 실패',
    'design_confirmation.created': '확인서 발송',
    'design_confirmation.create_failed': '확인서 발송 실패',
    'design_confirmation.responded': '확인서 응답',
    'profile.updated': '회원정보 수정',
  }

  return labels[value] || value || '-'
}

async function readJsonSafely(res: Response) {
  const text = await res.text()

  try {
    return text ? JSON.parse(text) : null
  } catch {
    throw new Error('API 응답을 처리할 수 없습니다.')
  }
}

export default function DashboardPage() {
  const router = useRouter()

  const [orders, setOrders] = useState<OrderItem[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [userRole, setUserRole] = useState('clinic')
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null)

  const handleAuthError = useCallback(
    (status: number) => {
      if (status === 401 || status === 403) {
        window.localStorage.removeItem('smilecad_token')
        window.localStorage.removeItem('smilecad_user')
        router.replace('/login')
        return true
      }

      return false
    },
    [router]
  )

  const loadDashboard = useCallback(async () => {
    const token = window.localStorage.getItem('smilecad_token') || ''
    const userRaw = window.localStorage.getItem('smilecad_user') || ''

    if (!token) {
      router.replace('/login')
      return
    }

    let storedUser: StoredUser | null = null

    try {
      storedUser = userRaw ? JSON.parse(userRaw) : null
    } catch {
      storedUser = null
    }

    setCurrentUser(storedUser)

    try {
      setLoading(true)
      setErrorMessage('')

      const orderRes = await fetch(LIST_ORDERS_API_URL, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (handleAuthError(orderRes.status)) return

      const orderData = await readJsonSafely(orderRes)

      if (!orderRes.ok || !orderData?.success) {
        throw new Error(orderData?.error || DEFAULT_DASHBOARD_ERROR)
      }

      const resolvedRole = String(orderData.role || storedUser?.role || 'clinic').toLowerCase()
      const nextOrders = Array.isArray(orderData.orders) ? orderData.orders : []

      setOrders(nextOrders)
      setUserRole(resolvedRole)

      if (resolvedRole === 'admin') {
        const logRes = await fetch(LIST_ACTIVITY_LOGS_API_URL, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            limit: 5,
            offset: 0,
          }),
        })

        if (handleAuthError(logRes.status)) return

        const logData = await readJsonSafely(logRes)

        if (logRes.ok && logData?.success) {
          setActivityLogs(Array.isArray(logData.items) ? logData.items : [])
        } else {
          setActivityLogs([])
        }
      } else {
        setActivityLogs([])
      }
    } catch (error) {
      console.error('대시보드 조회 실패:', error)
      setOrders([])
      setActivityLogs([])
      setErrorMessage(error instanceof Error ? error.message : DEFAULT_DASHBOARD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [router, handleAuthError])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const todayOrderCount = useMemo(() => {
    const todayKey = getTodayDateKey()
    return orders.filter((order) => getOrderCreatedDateKey(order) === todayKey).length
  }, [orders])

  const statusCounts = useMemo(() => {
    return orders.reduce<Record<string, number>>((acc, order) => {
      const status = getDisplayStatus(order.status)
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})
  }, [orders])

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders])

  const successfulActivityCount = useMemo(
    () => activityLogs.filter((item) => item.success !== false).length,
    [activityLogs]
  )

  const failedActivityCount = useMemo(
    () => activityLogs.filter((item) => item.success === false).length,
    [activityLogs]
  )

  const summaryCards: SummaryCard[] = [
    {
      label: '오늘 접수',
      value: todayOrderCount,
      description: '오늘 생성된 주문',
      tone: 'blue',
    },
    {
      label: '전체 주문',
      value: orders.length,
      description: userRole === 'admin' ? '전체 치과 주문' : '내 주문 전체',
      tone: 'slate',
    },
    {
      label: '주문 접수',
      value: statusCounts['주문 접수'] || 0,
      description: '아직 다운로드 전',
      tone: 'blue',
    },
    {
      label: '디자인 작업중',
      value: statusCounts['디자인 작업중'] || 0,
      description: '디자인 진행 중',
      tone: 'amber',
    },
    {
      label: '확인서 발송',
      value: statusCounts['디자인 확인서 발송'] || 0,
      description: '치과 확인 대기',
      tone: 'amber',
    },
    {
      label: '수정 요청 중',
      value: statusCounts['수정 요청 중'] || 0,
      description: '확인서 수정 요청',
      tone: 'orange',
    },
    {
      label: '제작 진행',
      value: statusCounts['제작 진행'] || 0,
      description: '확정 후 제작 단계',
      tone: 'emerald',
    },
  ]

  return (
    <main className="min-h-screen bg-[#f3f5f9] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[1480px]">
        <AppTopNav current="dashboard" />

        <section className="mb-7 rounded-[28px] border border-[#d9e0ea] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[14px] font-black text-blue-600">
                {userRole === 'admin' ? '관리자' : '치과 계정'}
              </p>
              <h1 className="mt-2 text-[32px] font-black tracking-[-0.04em] text-slate-950">
                대시보드
              </h1>
              <p className="mt-2 text-[14px] font-semibold text-slate-500">
                {userRole === 'admin'
                  ? '주문 현황, 최근 주문, 최근 활동 로그를 한눈에 확인합니다.'
                  : `${currentUser?.email || currentUser?.loginId || ''}님의 주문 현황을 확인합니다.`}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={loadDashboard}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[14px] font-black text-slate-600 transition hover:bg-slate-50"
              >
                새로고침
              </button>
              <button
                type="button"
                onClick={() => router.push('/orders/new')}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-[14px] font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
              >
                + 새 주문하기
              </button>
            </div>
          </div>
        </section>

        {errorMessage && (
          <div className="mb-7 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-[14px] font-bold text-red-600">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-16 text-center text-[15px] font-black text-slate-500 shadow-sm">
            대시보드 정보를 불러오는 중입니다...
          </div>
        ) : (
          <>
            <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-7">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className={`rounded-[24px] border p-5 shadow-sm ${getToneClass(card.tone)}`}
                >
                  <p className="text-[13px] font-black opacity-80">{card.label}</p>
                  <p className="mt-3 text-[32px] font-black tracking-[-0.05em]">{card.value}</p>
                  <p className="mt-2 text-[12px] font-bold opacity-70">{card.description}</p>
                </div>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-7 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[22px] font-black tracking-[-0.03em] text-slate-950">
                      최근 주문
                    </h2>
                    <p className="mt-1 text-[13px] font-semibold text-slate-500">
                      가장 최근 접수된 주문 5건입니다.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push('/orders')}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-black text-blue-600 transition hover:bg-blue-50"
                  >
                    전체 보기
                  </button>
                </div>

                {recentOrders.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-12 text-center text-[14px] font-bold text-slate-400">
                    표시할 최근 주문이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="grid w-full grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/30 lg:grid-cols-[130px_1fr_140px_150px_160px] lg:items-center"
                      >
                        <span
                          className={`w-fit rounded-full border px-3 py-1.5 text-[12px] font-black ${getStatusBadgeClass(
                            order.status
                          )}`}
                        >
                          {getDisplayStatus(order.status)}
                        </span>

                        <div className="min-w-0">
                          <p className="truncate text-[16px] font-black text-slate-950">
                            {order.patient_name || '-'} 환자님
                          </p>
                          <p className="mt-1 text-[12px] font-bold text-slate-400">
                            {order.order_number || `ORD-${order.id}`}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black text-slate-400">제품</p>
                          <p className="mt-1 truncate text-[13px] font-black text-slate-800">
                            {order.product_type || '-'}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black text-slate-400">희망 납기일</p>
                          <p className="mt-1 text-[13px] font-black text-blue-600">
                            {formatDate(order.delivery_date)}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-400">치과명</p>
                          <p className="mt-1 truncate text-[13px] font-black text-slate-700" title={order.clinic_name || ''}>
                            {order.clinic_name || '-'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[22px] font-black tracking-[-0.03em] text-slate-950">
                      최근 활동 로그
                    </h2>
                    <p className="mt-1 text-[13px] font-semibold text-slate-500">
                      관리자만 확인할 수 있는 최근 활동 기록입니다.
                    </p>
                  </div>

                  {userRole === 'admin' && (
                    <button
                      type="button"
                      onClick={() => router.push('/admin/activity-logs')}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-black text-blue-600 transition hover:bg-blue-50"
                    >
                      로그 보기
                    </button>
                  )}
                </div>

                {userRole !== 'admin' ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-12 text-center text-[14px] font-bold text-slate-400">
                    활동 로그는 관리자 계정에서만 표시됩니다.
                  </div>
                ) : activityLogs.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-12 text-center text-[14px] font-bold text-slate-400">
                    표시할 최근 활동 로그가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                        <p className="text-[12px] font-black text-emerald-600">최근 성공</p>
                        <p className="mt-2 text-[24px] font-black text-emerald-700">
                          {successfulActivityCount}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                        <p className="text-[12px] font-black text-red-600">최근 실패</p>
                        <p className="mt-2 text-[24px] font-black text-red-700">
                          {failedActivityCount}
                        </p>
                      </div>
                    </div>

                    {activityLogs.map((item) => (
                      <div
                        key={item.id || `${item.event_type}-${item.created_at}`}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-black text-slate-950">
                              {getEventLabel(item.event_type)}
                            </p>
                            <p className="mt-1 text-[12px] font-bold text-slate-400">
                              {formatDateTime(item.created_at_kst || item.created_at)}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-black ${
                              item.success === false
                                ? 'bg-red-50 text-red-600'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {item.success === false ? '실패' : '성공'}
                          </span>
                        </div>

                        <p className="mt-3 line-clamp-2 text-[13px] font-semibold leading-5 text-slate-600">
                          {item.message || '-'}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-bold text-slate-400">
                          {item.order_id ? <span>ORD-{item.order_id}</span> : null}
                          {item.login_id ? <span>{item.login_id}</span> : null}
                          {item.clinic_name ? <span>{item.clinic_name}</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
