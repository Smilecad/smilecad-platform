// app/admin/confirmations/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppTopNav from '@/app/components/AppTopNav'

type ConfirmationStatus = 'all' | 'pending' | 'confirmed' | 'revision_requested' | 'expired'

type DesignConfirmation = {
  confirmation_id?: number
  confirmationId?: number
  order_id?: number
  orderId?: number
  order_number?: string | null
  orderNumber?: string | null
  clinic_name?: string | null
  clinicName?: string | null
  patient_name?: string | null
  patientName?: string | null
  status?: string | null
  status_label?: string | null
  statusLabel?: string | null
  revision_note?: string | null
  revisionNote?: string | null
  created_at?: string | null
  createdAt?: string | null
  responded_at?: string | null
  respondedAt?: string | null
  expires_at?: string | null
  expiresAt?: string | null
  confirm_url?: string | null
  confirmUrl?: string | null
  is_expired?: boolean
  isExpired?: boolean
}

const LIST_CONFIRMATIONS_API_URL =
  process.env.NEXT_PUBLIC_NCP_LIST_CONFIRMATIONS_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/list-confirmations'

const STATUS_OPTIONS: { value: ConfirmationStatus; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '확인 대기' },
  { value: 'confirmed', label: '디자인 확정' },
  { value: 'revision_requested', label: '수정 요청됨' },
  { value: 'expired', label: '링크 만료' },
]

function formatDateTime(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getConfirmationId(item: DesignConfirmation) {
  return item.confirmation_id || item.confirmationId || 0
}

function getOrderId(item: DesignConfirmation) {
  return item.order_id || item.orderId || 0
}

function getClinicName(item: DesignConfirmation) {
  return item.clinic_name || item.clinicName || '-'
}

function getPatientName(item: DesignConfirmation) {
  return item.patient_name || item.patientName || '-'
}

function getStatusLabel(item: DesignConfirmation) {
  return item.status_label || item.statusLabel || getFallbackStatusLabel(item.status)
}

function getFallbackStatusLabel(status?: string | null) {
  if (status === 'pending') return '확인 대기'
  if (status === 'confirmed') return '디자인 확정'
  if (status === 'revision_requested') return '수정 요청됨'
  if (status === 'sms_failed') return '문자 발송 실패'
  return status || '-'
}

function isExpired(item: DesignConfirmation) {
  return Boolean(item.is_expired ?? item.isExpired)
}

function getStatusClass(item: DesignConfirmation) {
  if (isExpired(item)) return 'border-slate-200 bg-slate-100 text-slate-500'

  const status = String(item.status || '')

  if (status === 'confirmed') return 'border-emerald-100 bg-emerald-50 text-emerald-700'
  if (status === 'revision_requested') return 'border-orange-100 bg-orange-50 text-orange-700'
  if (status === 'sms_failed') return 'border-red-100 bg-red-50 text-red-600'
  return 'border-blue-100 bg-blue-50 text-blue-700'
}

export default function AdminConfirmationsPage() {
  const router = useRouter()

  const [items, setItems] = useState<DesignConfirmation[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [status, setStatus] = useState<ConfirmationStatus>('all')
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(20)

  const readJsonSafely = async (res: Response) => {
    const text = await res.text()

    try {
      return text ? JSON.parse(text) : null
    } catch {
      throw new Error('API 응답이 JSON 형식이 아닙니다.')
    }
  }

  const loadConfirmations = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMessage('')

      const token = window.localStorage.getItem('smilecad_token') || ''

      if (!token) {
        router.replace('/login')
        return
      }

      const requestStatus = status === 'all' || status === 'expired' ? '' : status

      const res = await fetch(LIST_CONFIRMATIONS_API_URL, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: requestStatus || undefined,
          page,
          limit,
        }),
      })

      if (res.status === 401 || res.status === 403) {
        window.localStorage.removeItem('smilecad_token')
        window.localStorage.removeItem('smilecad_user')
        router.replace('/login')
        return
      }

      const data = await readJsonSafely(res)

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '디자인 확인서 목록을 불러오지 못했습니다.')
      }

      setItems(Array.isArray(data.confirmations) ? data.confirmations : [])
      setTotal(Number(data.total || 0))
    } catch (error) {
      setItems([])
      setTotal(0)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '디자인 확인서 목록 조회 중 오류가 발생했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }, [router, status, page, limit])

  useEffect(() => {
    loadConfirmations()
  }, [loadConfirmations])

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return items.filter((item) => {
      if (status === 'expired' && !isExpired(item)) return false

      if (!keyword) return true

      return [
        getConfirmationId(item),
        getOrderId(item),
        item.order_number || item.orderNumber || '',
        getClinicName(item),
        getPatientName(item),
        item.status,
        getStatusLabel(item),
        item.revision_note || item.revisionNote || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    })
  }, [items, searchText, status])

  const summary = useMemo(() => {
    return {
      total,
      current: filteredItems.length,
      pending: items.filter((item) => item.status === 'pending').length,
      confirmed: items.filter((item) => item.status === 'confirmed').length,
      revision: items.filter((item) => item.status === 'revision_requested').length,
      expired: items.filter((item) => isExpired(item)).length,
    }
  }, [items, filteredItems.length, total])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const handleCopy = async (url?: string | null) => {
    if (!url) return

    try {
      await navigator.clipboard.writeText(url)
      setCopyMessage('확인 링크를 복사했습니다.')
      window.setTimeout(() => setCopyMessage(''), 1800)
    } catch {
      alert('링크 복사에 실패했습니다.')
    }
  }

  const resetFilters = () => {
    setStatus('all')
    setSearchText('')
    setPage(1)
  }

  return (
    <main className="min-h-screen bg-[#f3f5f9] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[1480px]">
        <AppTopNav current="admin-confirmations" />

        <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_14px_45px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[14px] font-black text-blue-600">관리자</p>
              <h1 className="mt-2 text-[30px] font-black tracking-[-0.04em] text-slate-950">
                디자인 확인서 관리
              </h1>
              <p className="mt-2 text-[14px] font-semibold text-slate-500">
                발송된 디자인 확인서의 상태, 만료 여부, 치과 응답을 한눈에 확인합니다.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={loadConfirmations}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[14px] font-black text-slate-600 transition hover:bg-slate-50"
              >
                새로고침
              </button>
              <button
                type="button"
                onClick={() => router.push('/orders')}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-[14px] font-black text-white shadow-sm transition hover:bg-slate-800"
              >
                주문 목록
              </button>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            { label: '전체 확인서', value: summary.total, tone: 'slate' },
            { label: '현재 표시', value: summary.current, tone: 'blue' },
            { label: '확인 대기', value: summary.pending, tone: 'amber' },
            { label: '디자인 확정', value: summary.confirmed, tone: 'emerald' },
            { label: '수정/만료', value: summary.revision + summary.expired, tone: 'orange' },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-[13px] font-black text-slate-500">{card.label}</p>
              <p className="mt-3 text-[30px] font-black tracking-[-0.04em] text-slate-950">
                {card.value}
              </p>
            </div>
          ))}
        </section>

        <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[240px_1fr_120px_120px]">
            <label className="block">
              <span className="mb-2 block text-[12px] font-black text-slate-500">상태</span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as ConfirmationStatus)
                  setPage(1)
                }}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[14px] font-bold text-slate-700 outline-none focus:border-blue-300 focus:bg-white"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[12px] font-black text-slate-500">검색</span>
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="주문 ID, 치과명, 환자명, 상태, 수정 요청 내용 검색"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[14px] font-bold text-slate-700 outline-none focus:border-blue-300 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[12px] font-black text-slate-500">표시 수</span>
              <select
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value))
                  setPage(1)
                }}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[14px] font-bold text-slate-700 outline-none focus:border-blue-300 focus:bg-white"
              >
                <option value={20}>20개</option>
                <option value={50}>50개</option>
                <option value={100}>100개</option>
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[14px] font-black text-slate-600 transition hover:bg-slate-50"
              >
                초기화
              </button>
            </div>
          </div>
        </section>

        {copyMessage && (
          <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[14px] font-black text-emerald-700">
            {copyMessage}
          </div>
        )}

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[20px] font-black tracking-[-0.03em] text-slate-950">
                확인서 목록
              </h2>
              <p className="mt-1 text-[13px] font-semibold text-slate-500">
                {page} / {totalPages} 페이지 · {filteredItems.length}건 표시
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1 || loading}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                이전
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page >= totalPages || loading}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                다음
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[14px] font-bold text-red-600">
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-12 text-center text-[14px] font-bold text-slate-500">
              디자인 확인서 목록을 불러오는 중입니다...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-12 text-center text-[14px] font-bold text-slate-500">
              표시할 디자인 확인서가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-[12px] font-black uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-200 px-4 py-3">상태</th>
                    <th className="border-b border-slate-200 px-4 py-3">주문</th>
                    <th className="border-b border-slate-200 px-4 py-3">치과명</th>
                    <th className="border-b border-slate-200 px-4 py-3">환자명</th>
                    <th className="border-b border-slate-200 px-4 py-3">등록일</th>
                    <th className="border-b border-slate-200 px-4 py-3">응답일</th>
                    <th className="border-b border-slate-200 px-4 py-3">만료일</th>
                    <th className="border-b border-slate-200 px-4 py-3">작업</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredItems.map((item) => {
                    const confirmationId = getConfirmationId(item)
                    const orderId = getOrderId(item)
                    const confirmUrl = item.confirm_url || item.confirmUrl || ''

                    return (
                      <tr key={confirmationId || `${orderId}-${confirmUrl}`} className="text-[14px] font-semibold text-slate-700">
                        <td className="border-b border-slate-100 px-4 py-4 align-top">
                          <div className="flex flex-col gap-2">
                            <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-[12px] font-black ${getStatusClass(item)}`}>
                              {getStatusLabel(item)}
                            </span>
                            {isExpired(item) && (
                              <span className="text-[12px] font-black text-slate-400">만료됨</span>
                            )}
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 align-top">
                          <button
                            type="button"
                            onClick={() => orderId && router.push(`/orders/${orderId}`)}
                            className="rounded-full bg-blue-50 px-3 py-1 text-[12px] font-black text-blue-700 transition hover:bg-blue-100"
                          >
                            #{orderId || '-'}
                          </button>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 align-top">
                          <div className="max-w-[240px] truncate" title={getClinicName(item)}>
                            {getClinicName(item)}
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 align-top">
                          {getPatientName(item)}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 align-top">
                          {formatDateTime(item.created_at || item.createdAt)}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 align-top">
                          {formatDateTime(item.responded_at || item.respondedAt)}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 align-top">
                          {formatDateTime(item.expires_at || item.expiresAt)}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 align-top">
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(confirmUrl)}
                              disabled={!confirmUrl}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-black text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              링크 복사
                            </button>

                            <button
                              type="button"
                              onClick={() => orderId && router.push(`/orders/${orderId}`)}
                              className="rounded-xl bg-slate-900 px-3 py-2 text-[12px] font-black text-white transition hover:bg-slate-800"
                            >
                              주문 상세
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
