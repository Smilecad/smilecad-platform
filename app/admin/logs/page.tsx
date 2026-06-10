// app/admin/logs/page.tsx
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

type ActivityLogItem = {
  id: number
  event_type: string
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

const LIST_ACTIVITY_LOGS_API_URL =
  process.env.NEXT_PUBLIC_NCP_LIST_ACTIVITY_LOGS_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/list-activity-logs'

const EVENT_OPTIONS = [
  { value: '', label: '전체 이벤트' },
  { value: 'auth.login_success', label: '로그인 성공' },
  { value: 'auth.login_failed', label: '로그인 실패' },
  { value: 'order.created', label: '주문 생성' },
  { value: 'order.status_changed', label: '주문 상태 변경' },
  { value: 'order.file_download_url_created', label: '파일 다운로드 URL 발급' },
  { value: 'order.file_download_failed', label: '파일 다운로드 실패' },
  { value: 'billing.statement_created', label: '거래명세서 생성' },
  { value: 'design_card.created', label: '디자인 확인서 생성' },
  { value: 'design_card.image_url_created', label: '디자인 이미지 URL 발급' },
  { value: 'design_card.confirmed', label: '디자인 확정' },
  { value: 'design_card.revision_requested', label: '수정 요청' },
  { value: 'design_card.alimtalk_sent', label: '알림톡 발송' },
  { value: 'design_card.alimtalk_failed', label: '알림톡 실패' },
  { value: 'admin.clinic_list_viewed', label: '치과 회원 목록 조회' },
  { value: 'admin.user_role_changed', label: '사용자 권한 변경' },
  { value: 'password.reset_requested', label: '비밀번호 재설정 요청' },
  { value: 'password.reset_completed', label: '비밀번호 재설정 완료' },
]

function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem('smilecad_user')

  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function eventLabel(eventType?: string | null) {
  const found = EVENT_OPTIONS.find((item) => item.value === eventType)
  return found?.label || eventType || '-'
}

function successBadge(success?: boolean | null) {
  if (success === false) {
    return 'border-red-200 bg-red-50 text-red-600'
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

function eventBadgeClass(eventType?: string | null) {
  const value = eventType || ''

  if (value.startsWith('order.')) {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }

  if (value.startsWith('design_card.')) {
    return 'border-purple-200 bg-purple-50 text-purple-700'
  }

  if (value.startsWith('admin.')) {
    return 'border-slate-300 bg-slate-100 text-slate-700'
  }

  if (value.startsWith('password.')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  if (value.includes('failed') || value.includes('fail')) {
    return 'border-red-200 bg-red-50 text-red-600'
  }

  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function formatDetail(detail: any) {
  if (!detail) return ''

  try {
    return JSON.stringify(detail, null, 2)
  } catch {
    return String(detail)
  }
}

function getCreatedAt(log: ActivityLogItem) {
  return log.created_at_kst || log.created_at || '-'
}

export default function AdminLogsPage() {
  const router = useRouter()

  const [logs, setLogs] = useState<ActivityLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(100)
  const [offset, setOffset] = useState(0)

  const [eventType, setEventType] = useState('')
  const [orderId, setOrderId] = useState('')
  const [loginId, setLoginId] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const currentUser = useMemo(() => getStoredUser(), [])

  const fetchLogs = useCallback(async () => {
    const token = window.localStorage.getItem('smilecad_token')
    const user = getStoredUser()

    if (!token) {
      router.replace('/login?force=1')
      return
    }

    if (String(user?.role || '').toLowerCase() !== 'admin') {
      setLoading(false)
      setError('관리자만 감사 로그를 조회할 수 있습니다.')
      return
    }

    try {
      setLoading(true)
      setError('')

      const res = await fetch(LIST_ACTIVITY_LOGS_API_URL, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          limit,
          offset,
          eventType,
          orderId,
          loginId,
          success,
        }),
      })

      const text = await res.text()
      let data: any = null

      try {
        data = text ? JSON.parse(text) : null
      } catch {
        throw new Error('감사 로그 응답을 처리할 수 없습니다.')
      }

      if (res.status === 401 || res.status === 403) {
        window.localStorage.removeItem('smilecad_token')
        window.localStorage.removeItem('smilecad_user')
        router.replace('/login?force=1')
        return
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '감사 로그 조회 중 오류가 발생했습니다.')
      }

      setLogs(data.items || [])
      setTotal(Number(data.total || 0))
    } catch (err) {
      console.error('감사 로그 조회 실패:', err)
      setLogs([])
      setError(err instanceof Error ? err.message : '감사 로그 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [router, limit, offset, eventType, orderId, loginId, success])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const resetFilters = () => {
    setEventType('')
    setOrderId('')
    setLoginId('')
    setSuccess('')
    setOffset(0)
  }

  const canPrev = offset > 0
  const canNext = offset + limit < total

  const goPrev = () => {
    setOffset((prev) => Math.max(0, prev - limit))
  }

  const goNext = () => {
    setOffset((prev) => prev + limit)
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f9] px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-7 py-5 text-[15px] font-bold text-slate-500 shadow-sm">
          감사 로그를 불러오는 중입니다...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f3f5f9] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[1500px]">
        <AppTopNav current="admin-logs" />

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[28px] font-extrabold tracking-tight text-[#1f2937]">
              감사 로그
            </div>
            <div className="mt-2 text-[14px] font-semibold text-slate-500">
              관리자 전용 화면입니다. 주문 생성, 상태 변경, 파일 열람 시도 등 주요 활동을 조회합니다.
            </div>
            <div className="mt-1 text-[12px] font-bold text-slate-400">
              현재 사용자: {currentUser?.loginId || currentUser?.email || '-'}
            </div>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-full bg-slate-900 px-5 py-2">
            <span className="text-[12px] font-bold text-slate-300">Total</span>
            <span className="text-[20px] font-black text-white">{total}</span>
            <span className="text-[12px] font-bold text-slate-300">건</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-[18px] border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-600">
            <div>{error}</div>
            <button
              type="button"
              onClick={fetchLogs}
              className="mt-4 rounded-[12px] bg-red-600 px-5 py-2 text-[13px] font-bold text-white transition hover:bg-red-700"
            >
              다시 시도
            </button>
          </div>
        )}

        <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div>
              <label className="mb-2 block text-[12px] font-black text-slate-500">
                이벤트
              </label>
              <select
                value={eventType}
                onChange={(e) => {
                  setOffset(0)
                  setEventType(e.target.value)
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-bold text-slate-700 outline-none"
              >
                {EVENT_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[12px] font-black text-slate-500">
                주문 ID
              </label>
              <input
                value={orderId}
                onChange={(e) => {
                  setOffset(0)
                  setOrderId(e.target.value)
                }}
                placeholder="예: 20"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-bold text-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-[12px] font-black text-slate-500">
                로그인 ID
              </label>
              <input
                value={loginId}
                onChange={(e) => {
                  setOffset(0)
                  setLoginId(e.target.value)
                }}
                placeholder="예: smilecad-t"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-bold text-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-[12px] font-black text-slate-500">
                성공 여부
              </label>
              <select
                value={success}
                onChange={(e) => {
                  setOffset(0)
                  setSuccess(e.target.value)
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-bold text-slate-700 outline-none"
              >
                <option value="">전체</option>
                <option value="true">성공</option>
                <option value="false">실패</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[12px] font-black text-slate-500">
                표시 개수
              </label>
              <select
                value={limit}
                onChange={(e) => {
                  setOffset(0)
                  setLimit(Number(e.target.value))
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-bold text-slate-700 outline-none"
              >
                <option value={50}>50개</option>
                <option value={100}>100개</option>
                <option value={200}>200개</option>
                <option value={300}>300개</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchLogs}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-[13px] font-black text-white shadow-sm transition hover:bg-blue-700"
            >
              조회
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl bg-slate-100 px-5 py-2.5 text-[13px] font-black text-slate-600 transition hover:bg-slate-200"
            >
              필터 초기화
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          {logs.length === 0 ? (
            <div className="flex min-h-[260px] items-center justify-center p-8 text-[15px] font-bold text-slate-400">
              조건에 맞는 감사 로그가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1250px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[12px] font-black text-slate-500">
                    <th className="px-4 py-4">시간</th>
                    <th className="px-4 py-4">이벤트</th>
                    <th className="px-4 py-4">결과</th>
                    <th className="px-4 py-4">사용자</th>
                    <th className="px-4 py-4">역할</th>
                    <th className="px-4 py-4">치과명</th>
                    <th className="px-4 py-4">주문</th>
                    <th className="px-4 py-4">IP</th>
                    <th className="px-4 py-4">메시지</th>
                    <th className="px-4 py-4">상세</th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((log) => {
                    const expanded = expandedId === log.id

                    return (
                      <>
                        <tr
                          key={log.id}
                          className="border-b border-slate-100 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-4 py-4 font-bold text-slate-600">
                            {getCreatedAt(log)}
                          </td>

                          <td className="px-4 py-4">
                            <div
                              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${eventBadgeClass(
                                log.event_type
                              )}`}
                            >
                              {eventLabel(log.event_type)}
                            </div>
                            <div className="mt-1 text-[11px] font-bold text-slate-400">
                              {log.event_type}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${successBadge(
                                log.success
                              )}`}
                            >
                              {log.success === false ? '실패' : '성공'}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="font-black text-slate-800">
                              {log.login_id || '-'}
                            </div>
                            {log.user_id && (
                              <div className="mt-1 text-[11px] font-bold text-slate-400">
                                user_id: {log.user_id}
                              </div>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            {log.user_role || '-'}
                          </td>

                          <td className="max-w-[220px] px-4 py-4">
                            <div className="truncate font-bold text-slate-700">
                              {log.clinic_name || '-'}
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            {log.order_id ? (
                              <button
                                type="button"
                                onClick={() => router.push(`/orders/${log.order_id}`)}
                                className="rounded-lg bg-blue-50 px-3 py-1.5 text-[12px] font-black text-blue-700 transition hover:bg-blue-100"
                              >
                                ORD-{log.order_id}
                              </button>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                            {log.ip_address || '-'}
                          </td>

                          <td className="max-w-[250px] px-4 py-4">
                            <div className="truncate">
                              {log.message || '-'}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => setExpandedId(expanded ? null : log.id)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-black text-slate-600 transition hover:bg-slate-50"
                            >
                              {expanded ? '닫기' : '보기'}
                            </button>
                          </td>
                        </tr>

                        {expanded && (
                          <tr key={`${log.id}-detail`} className="border-b border-slate-100 bg-slate-50">
                            <td colSpan={10} className="px-4 py-4">
                              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                  <div className="mb-2 text-[12px] font-black text-slate-500">
                                    상세 JSON
                                  </div>
                                  <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-[12px] leading-5 text-slate-100">
                                    {formatDetail(log.detail) || '-'}
                                  </pre>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                  <div className="mb-2 text-[12px] font-black text-slate-500">
                                    추가 정보
                                  </div>
                                  <div className="space-y-2 text-[13px] font-semibold text-slate-600">
                                    <div>target_type: {log.target_type || '-'}</div>
                                    <div>target_id: {log.target_id || '-'}</div>
                                    <div>design_card_id: {log.design_card_id || '-'}</div>
                                    <div>event_action: {log.event_action || '-'}</div>
                                    <div className="break-words">user_agent: {log.user_agent || '-'}</div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[13px] font-bold text-slate-500">
              {total > 0 ? `${offset + 1} - ${Math.min(offset + limit, total)} / ${total}` : '0 / 0'}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canPrev}
                onClick={goPrev}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-black text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                이전
              </button>

              <button
                type="button"
                disabled={!canNext}
                onClick={goNext}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-black text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                다음
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}