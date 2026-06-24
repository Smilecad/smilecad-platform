// app/admin/activity-logs/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppTopNav from '@/app/components/AppTopNav'

const LIST_ACTIVITY_LOGS_API_URL =
  process.env.NEXT_PUBLIC_NCP_LIST_ACTIVITY_LOGS_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/list-activity-logs'

type ActivityLogItem = {
  id: number
  event_type?: string | null
  event_action?: string | null
  order_id?: number | null
  design_card_id?: number | null
  target_type?: string | null
  target_id?: string | null
  user_id?: number | null
  login_id?: string | null
  user_role?: string | null
  clinic_name?: string | null
  ip_address?: string | null
  user_agent?: string | null
  success?: boolean | null
  message?: string | null
  detail?: any
  created_at?: string | null
  created_at_kst?: string | null
  created_date_kst?: string | null
  created_time_kst?: string | null
}

type ApiResponse = {
  success?: boolean
  total?: number
  count?: number
  limit?: number
  offset?: number
  timezone?: string
  items?: ActivityLogItem[]
  logs?: ActivityLogItem[]
  activityLogs?: ActivityLogItem[]
  error?: string
}

const EVENT_TYPE_OPTIONS = [
  { label: '전체 이벤트', value: '' },
  { label: '주문 생성', value: 'order.created' },
  { label: '주문 생성 실패', value: 'order.create_failed' },
  { label: '상태 변경', value: 'order.status_changed' },
  { label: '상태 변경 실패', value: 'order.status_change_failed' },
  { label: '파일 다운로드 URL 생성', value: 'order.file_download_url_created' },
  { label: '파일 다운로드 실패', value: 'order.file_download_failed' },
  { label: '프로필 수정', value: 'profile.updated' },
  { label: '디자인 확인서', value: 'design_confirmation' },
]

const SUCCESS_OPTIONS = [
  { label: '전체 결과', value: '' },
  { label: '성공', value: 'true' },
  { label: '실패', value: 'false' },
]

function formatDateTime(value?: string | null) {
  if (!value) return '-'

  const text = String(value).trim()
  const directMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)

  if (directMatch) {
    const [, year, month, day, hour, minute, second] = directMatch
    return `${Number(year)}. ${Number(month)}. ${Number(day)}. ${hour}:${minute}:${second || '00'}`
  }

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function eventLabel(eventType?: string | null) {
  const value = String(eventType || '').trim()

  const labels: Record<string, string> = {
    'order.created': '주문 생성',
    'order.create_failed': '주문 생성 실패',
    'order.status_changed': '상태 변경',
    'order.status_change_failed': '상태 변경 실패',
    'order.file_download_url_created': '파일 다운로드',
    'order.file_download_failed': '파일 다운로드 실패',
    'profile.updated': '회원정보 수정',
    'design_confirmation.created': '확인서 생성',
    'design_confirmation.create_failed': '확인서 생성 실패',
    'design_confirmation.sms_failed': '확인서 문자 실패',
    'design_confirmation.responded': '확인서 응답',
    'design_confirmation.response_failed': '확인서 응답 실패',
  }

  return labels[value] || value || '-'
}

function eventBadgeClass(eventType?: string | null, success?: boolean | null) {
  const value = String(eventType || '')

  if (success === false || value.includes('failed') || value.includes('fail')) {
    return 'border-red-100 bg-red-50 text-red-700'
  }

  if (value.includes('status')) return 'border-blue-100 bg-blue-50 text-blue-700'
  if (value.includes('download')) return 'border-indigo-100 bg-indigo-50 text-indigo-700'
  if (value.includes('confirmation') || value.includes('design')) {
    return 'border-amber-100 bg-amber-50 text-amber-700'
  }
  if (value.includes('profile')) return 'border-emerald-100 bg-emerald-50 text-emerald-700'

  return 'border-slate-100 bg-slate-50 text-slate-700'
}

function stringifyDetail(detail: any) {
  if (!detail) return ''

  if (typeof detail === 'string') {
    try {
      return JSON.stringify(JSON.parse(detail), null, 2)
    } catch {
      return detail
    }
  }

  try {
    return JSON.stringify(detail, null, 2)
  } catch {
    return String(detail)
  }
}

function getDetailSummary(detail: any) {
  if (!detail) return ''

  const value = typeof detail === 'string' ? (() => {
    try {
      return JSON.parse(detail)
    } catch {
      return null
    }
  })() : detail

  if (!value || typeof value !== 'object') return ''

  const parts = [
    value.previousStatus && value.nextStatus ? `${value.previousStatus} → ${value.nextStatus}` : '',
    value.fileName ? `파일: ${value.fileName}` : '',
    value.productType ? `제품: ${value.productType}` : '',
    value.totalPrice ? `금액: ${Number(value.totalPrice).toLocaleString('ko-KR')}원` : '',
    value.patientMaskedName ? `환자: ${value.patientMaskedName}` : '',
    value.trigger ? `트리거: ${value.trigger}` : '',
  ].filter(Boolean)

  return parts.join(' · ')
}

export default function AdminActivityLogsPage() {
  const router = useRouter()

  const [items, setItems] = useState<ActivityLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(100)
  const [offset, setOffset] = useState(0)

  const [eventType, setEventType] = useState('')
  const [orderId, setOrderId] = useState('')
  const [loginId, setLoginId] = useState('')
  const [targetType, setTargetType] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const readJsonSafely = async (res: Response) => {
    const text = await res.text()

    try {
      return text ? JSON.parse(text) : null
    } catch {
      throw new Error('API 응답이 JSON 형식이 아닙니다.')
    }
  }

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

  const loadLogs = useCallback(
    async (nextOffset = offset) => {
      setLoading(true)
      setErrorMessage('')

      try {
        const token = window.localStorage.getItem('smilecad_token') || ''

        if (!token) {
          router.replace('/login')
          return
        }

        const requestBody = {
          limit,
          offset: nextOffset,
          ...(eventType ? { eventType } : {}),
          ...(orderId.trim() ? { orderId: orderId.trim() } : {}),
          ...(loginId.trim() ? { loginId: loginId.trim() } : {}),
          ...(targetType.trim() ? { targetType: targetType.trim() } : {}),
          ...(success ? { success } : {}),
        }

        const res = await fetch(LIST_ACTIVITY_LOGS_API_URL, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        })

        if (handleAuthError(res.status)) return

        const data: ApiResponse = await readJsonSafely(res)

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || '활동 로그를 불러오지 못했습니다.')
        }

        const rows = data.items || data.logs || data.activityLogs || []
        setItems(Array.isArray(rows) ? rows : [])
        setTotal(Number(data.total || rows.length || 0))
        setOffset(nextOffset)
      } catch (error) {
        setItems([])
        setErrorMessage(
          error instanceof Error
            ? error.message
            : '활동 로그를 불러오는 중 오류가 발생했습니다.'
        )
      } finally {
        setLoading(false)
      }
    },
    [eventType, handleAuthError, limit, loginId, offset, orderId, router, success, targetType]
  )

  useEffect(() => {
    loadLogs(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalPages = useMemo(() => {
    if (!total || !limit) return 1
    return Math.max(1, Math.ceil(total / limit))
  }, [total, limit])

  const currentPage = useMemo(() => {
    return Math.floor(offset / limit) + 1
  }, [offset, limit])

  const successCount = useMemo(() => items.filter((item) => item.success !== false).length, [items])
  const failCount = useMemo(() => items.filter((item) => item.success === false).length, [items])

  const resetFilters = () => {
    setEventType('')
    setOrderId('')
    setLoginId('')
    setTargetType('')
    setSuccess('')
    window.setTimeout(() => loadLogs(0), 0)
  }

  const applyFilters = () => {
    loadLogs(0)
  }

  const goPrev = () => {
    const nextOffset = Math.max(0, offset - limit)
    loadLogs(nextOffset)
  }

  const goNext = () => {
    const nextOffset = offset + limit
    if (nextOffset >= total) return
    loadLogs(nextOffset)
  }

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto w-full max-w-[1480px] px-6 py-8">
        <AppTopNav current="admin-activity-logs" />

        <section className="mb-6 rounded-[30px] border border-slate-200 bg-white p-7 shadow-[0_14px_45px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[14px] font-black text-blue-600">관리자</p>
              <h1 className="mt-2 text-[32px] font-black tracking-[-0.04em] text-slate-950">
                활동 로그
              </h1>
              <p className="mt-2 text-[14px] font-semibold text-slate-500">
                주문 생성, 상태 변경, 파일 다운로드, 확인서 발송/응답, 회원정보 수정 기록을 확인합니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadLogs(offset)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[14px] font-black text-slate-700 transition hover:bg-slate-50"
              >
                새로고침
              </button>

              <button
                type="button"
                onClick={() => router.push('/orders')}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-[14px] font-black text-white transition hover:bg-slate-800"
              >
                주문 목록
              </button>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">전체 로그</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{total}</p>
          </div>

          <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
            <p className="text-sm font-bold text-emerald-700">현재 페이지 성공</p>
            <p className="mt-3 text-3xl font-black text-emerald-800">{successCount}</p>
          </div>

          <div className="rounded-[24px] border border-red-100 bg-red-50 p-5 shadow-sm">
            <p className="text-sm font-bold text-red-700">현재 페이지 실패</p>
            <p className="mt-3 text-3xl font-black text-red-800">{failCount}</p>
          </div>
        </section>

        <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">검색 / 필터</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                이벤트 종류, 주문번호, 처리자, 대상, 성공 여부로 조회할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <label className="block md:col-span-2">
              <span className="mb-2 block text-[12px] font-black text-slate-500">이벤트</span>
              <select
                value={eventType}
                onChange={(event) => setEventType(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[14px] font-bold text-slate-700 outline-none focus:border-blue-300 focus:bg-white"
              >
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[12px] font-black text-slate-500">주문 ID</span>
              <input
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                placeholder="예: 123"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[14px] font-bold text-slate-700 outline-none focus:border-blue-300 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[12px] font-black text-slate-500">처리자</span>
              <input
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
                placeholder="login id"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[14px] font-bold text-slate-700 outline-none focus:border-blue-300 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[12px] font-black text-slate-500">대상</span>
              <input
                value={targetType}
                onChange={(event) => setTargetType(event.target.value)}
                placeholder="order"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[14px] font-bold text-slate-700 outline-none focus:border-blue-300 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[12px] font-black text-slate-500">결과</span>
              <select
                value={success}
                onChange={(event) => setSuccess(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[14px] font-bold text-slate-700 outline-none focus:border-blue-300 focus:bg-white"
              >
                {SUCCESS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-[14px] font-black text-white shadow-sm transition hover:bg-blue-700"
            >
              조회
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[14px] font-black text-slate-600 transition hover:bg-slate-50"
            >
              초기화
            </button>

            <select
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value))
                setOffset(0)
              }}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-black text-slate-600 outline-none"
            >
              <option value={50}>50개</option>
              <option value={100}>100개</option>
              <option value={200}>200개</option>
              <option value={300}>300개</option>
            </select>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">로그 목록</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {currentPage} / {totalPages} 페이지 · {items.length}건 표시
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={offset <= 0 || loading}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                이전
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={offset + limit >= total || loading}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-12 text-center text-sm font-bold text-slate-500">
              활동 로그를 불러오는 중입니다...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-12 text-center text-sm font-bold text-slate-500">
              표시할 활동 로그가 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const detailText = stringifyDetail(item.detail)
                const detailSummary = getDetailSummary(item.detail)
                const expanded = expandedId === item.id

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:bg-blue-50/20"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-black ${eventBadgeClass(
                              item.event_type,
                              item.success
                            )}`}
                          >
                            {eventLabel(item.event_type)}
                          </span>

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[12px] font-black ${
                              item.success === false
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {item.success === false ? '실패' : '성공'}
                          </span>

                          <span className="text-[12px] font-bold text-slate-400">
                            #{item.id}
                          </span>
                        </div>

                        <p className="mt-3 text-[15px] font-black leading-6 text-slate-900">
                          {item.message || item.event_action || '-'}
                        </p>

                        {detailSummary && (
                          <p className="mt-2 text-[13px] font-bold leading-5 text-slate-500">
                            {detailSummary}
                          </p>
                        )}
                      </div>

                      <div className="grid min-w-0 grid-cols-2 gap-3 text-[12px] font-bold text-slate-500 md:grid-cols-4 lg:min-w-[620px]">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-slate-400">발생 시간</p>
                          <p className="mt-1 text-slate-700">{formatDateTime(item.created_at_kst || item.created_at)}</p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-slate-400">주문</p>
                          <p className="mt-1 text-slate-700">
                            {item.order_id ? `ORD-${item.order_id}` : '-'}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-slate-400">처리자</p>
                          <p className="mt-1 truncate text-slate-700" title={item.login_id || ''}>
                            {item.login_id || '-'}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-slate-400">치과명</p>
                          <p className="mt-1 truncate text-slate-700" title={item.clinic_name || ''}>
                            {item.clinic_name || '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] font-bold text-slate-400">
                      <span>event_type: {item.event_type || '-'}</span>
                      <span>·</span>
                      <span>target: {item.target_type || '-'} / {item.target_id || '-'}</span>
                      {item.ip_address && (
                        <>
                          <span>·</span>
                          <span>IP: {item.ip_address}</span>
                        </>
                      )}
                    </div>

                    {detailText && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : item.id)}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-black text-slate-600 transition hover:bg-slate-50"
                        >
                          {expanded ? '상세 닫기' : '상세 보기'}
                        </button>

                        {expanded && (
                          <pre className="mt-3 max-h-[360px] overflow-auto rounded-2xl bg-slate-950 p-4 text-[12px] leading-5 text-slate-100">
                            {detailText}
                          </pre>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
