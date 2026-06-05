'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppTopNav from '@/app/components/AppTopNav'

type StoredUser = {
  id?: number
  loginId?: string
  email?: string
  role?: string
  phone?: string | null
}

type BillingOrder = {
  id: string | number
  order_number?: string | null
  user_id?: string | number | null
  email?: string | null
  clinic_name?: string | null
  patient_name?: string | null
  product_type?: string | null
  selected_teeth?: string[]
  missing_teeth?: string[]
  billable_teeth?: string[]
  selected_tooth_count?: number
  missing_tooth_count?: number
  billable_tooth_count?: number
  tooth_count?: number
  product_base_price?: number
  base_price?: number
  tooth_adjustment_price?: number
  tooth_extra_price?: number
  jig_price?: number
  total_price?: number
  price_description?: string | null
  status?: string | null
  delivery_date?: string | null
  created_at?: string | null
}

type ClinicSummary = {
  clinic_name: string
  order_count: number
  total_price: number
  total_billable_tooth_count: number
  total_selected_tooth_count: number
  total_missing_tooth_count: number
}

type BillingSummary = {
  orderCount: number
  totalPrice: number
  totalBillableToothCount: number
  totalSelectedToothCount: number
  totalMissingToothCount: number
}

type BillingApiResponse = {
  success: boolean
  role?: string
  period?: {
    startDate?: string
    endDate?: string
    label?: string
  }
  filters?: {
    clinicName?: string
  }
  summary?: BillingSummary
  clinicOptions?: string[]
  clinicSummaries?: ClinicSummary[]
  orders?: BillingOrder[]
  error?: string
}

const LIST_BILLING_SUMMARY_API_URL =
  process.env.NEXT_PUBLIC_NCP_LIST_BILLING_SUMMARY_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/list-billing-summary'

const DEFAULT_BILLING_ERROR =
  '명세서 정보를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'

function formatMoney(value?: number | string | null) {
  const numberValue = Number(value || 0)
  return `${numberValue.toLocaleString('ko-KR')}원`
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('ko-KR')
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function safeArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean)
  }

  return []
}

function getMonthStartDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

function getTodayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
    'statuscode',
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

function toSafeUserMessage(error: unknown, fallback = DEFAULT_BILLING_ERROR) {
  const message = error instanceof Error ? error.message : String(error || '')

  if (!message) return fallback

  const safeMessages = [
    '인증 토큰이 없습니다.',
    '인증 토큰이 필요합니다.',
    '토큰이 만료되었습니다.',
    '로그인 정보가 없습니다. 다시 로그인해주세요.',
  ]

  if (safeMessages.some((safeMessage) => message.includes(safeMessage))) {
    return message
  }

  if (isTechnicalErrorMessage(message)) {
    return fallback
  }

  return fallback
}

function statusBadgeClass(status?: string | null) {
  const value = status || '접수 대기'

  if (value.includes('디자인') || value.includes('작업')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  if (value.includes('수정') || value.includes('재접수')) {
    return 'border-orange-200 bg-orange-50 text-orange-700'
  }

  if (value.includes('완료')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  return 'border-blue-200 bg-blue-50 text-blue-700'
}

export default function BillingPage() {
  const router = useRouter()

  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null)
  const [role, setRole] = useState('clinic')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [startDate, setStartDate] = useState(getMonthStartDate())
  const [endDate, setEndDate] = useState(getTodayDate())
  const [selectedClinicName, setSelectedClinicName] = useState('')

  const [summary, setSummary] = useState<BillingSummary>({
    orderCount: 0,
    totalPrice: 0,
    totalBillableToothCount: 0,
    totalSelectedToothCount: 0,
    totalMissingToothCount: 0,
  })

  const [clinicOptions, setClinicOptions] = useState<string[]>([])
  const [clinicSummaries, setClinicSummaries] = useState<ClinicSummary[]>([])
  const [orders, setOrders] = useState<BillingOrder[]>([])
  const [periodLabel, setPeriodLabel] = useState('')

  const isAdmin = role === 'admin'

  const fetchBillingSummary = useCallback(async () => {
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

      const url = new URL(LIST_BILLING_SUMMARY_API_URL)

      if (startDate) {
        url.searchParams.set('startDate', startDate)
      }

      if (endDate) {
        url.searchParams.set('endDate', endDate)
      }

      if (selectedClinicName) {
        url.searchParams.set('clinicName', selectedClinicName)
      }

      const res = await fetch(url.toString(), {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const text = await res.text()
      let data: BillingApiResponse | null = null

      try {
        data = text ? JSON.parse(text) : null
      } catch (parseError) {
        console.error('list-billing-summary JSON 파싱 실패:', {
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
        console.error('list-billing-summary 응답 오류:', data)
        throw new Error(data?.error || DEFAULT_BILLING_ERROR)
      }

      setRole(data.role || storedUser?.role || 'clinic')
      setSummary(
        data.summary || {
          orderCount: 0,
          totalPrice: 0,
          totalBillableToothCount: 0,
          totalSelectedToothCount: 0,
          totalMissingToothCount: 0,
        }
      )
      setClinicOptions(data.clinicOptions || [])
      setClinicSummaries(data.clinicSummaries || [])
      setOrders(data.orders || [])
      setPeriodLabel(data.period?.label || '')
    } catch (err) {
      console.error('명세서 조회 실패:', err)
      setError(toSafeUserMessage(err, DEFAULT_BILLING_ERROR))
      setSummary({
        orderCount: 0,
        totalPrice: 0,
        totalBillableToothCount: 0,
        totalSelectedToothCount: 0,
        totalMissingToothCount: 0,
      })
      setClinicSummaries([])
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [router, startDate, endDate, selectedClinicName])

  useEffect(() => {
    fetchBillingSummary()
  }, [fetchBillingSummary])

  const displayOrders = useMemo(() => {
    return orders.map((order) => {
      const selectedTeeth = safeArray(order.selected_teeth)
      const missingTeeth = safeArray(order.missing_teeth)
      const billableTeethFromApi = safeArray(order.billable_teeth)

      const billableTeeth =
        billableTeethFromApi.length > 0
          ? billableTeethFromApi
          : selectedTeeth.filter((tooth) => !missingTeeth.includes(tooth))

      return {
        ...order,
        selected_teeth: selectedTeeth,
        missing_teeth: missingTeeth,
        billable_teeth: billableTeeth,
        selected_tooth_count:
          normalizeNumber(order.selected_tooth_count, 0) || selectedTeeth.length,
        missing_tooth_count:
          normalizeNumber(order.missing_tooth_count, 0) || missingTeeth.length,
        billable_tooth_count:
          normalizeNumber(order.billable_tooth_count, 0) ||
          normalizeNumber(order.tooth_count, 0) ||
          billableTeeth.length,
        total_price: normalizeNumber(order.total_price, 0),
        product_base_price: normalizeNumber(order.product_base_price, 0),
        tooth_adjustment_price: normalizeNumber(order.tooth_adjustment_price, 0),
        jig_price: normalizeNumber(order.jig_price, 0),
      }
    })
  }, [orders])

  const resetFilters = () => {
    setStartDate('')
    setEndDate('')
    setSelectedClinicName('')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f9] px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-7 py-5 text-[15px] font-bold text-slate-500 shadow-sm">
          명세서 정보를 불러오는 중입니다...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f3f5f9] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[1480px]">
        <AppTopNav current="billing" />

        <section className="mb-6 rounded-[28px] border border-[#d9e0ea] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 text-[13px] font-black uppercase tracking-[0.32em] text-[#2563eb]">
                SMILECAD BILLING
              </div>

              <h1 className="text-[30px] font-black tracking-tight text-[#111827] sm:text-[38px]">
                {isAdmin ? '정산 관리' : '명세서'}
              </h1>

              <p className="mt-3 text-[14px] font-semibold leading-relaxed text-[#667085]">
                {isAdmin
                  ? '기간과 치과를 선택해 주문 금액을 조회할 수 있습니다.'
                  : '내 계정으로 접수한 주문의 기간별 금액을 확인할 수 있습니다.'}
              </p>

              {periodLabel && (
                <div className="mt-4 inline-flex rounded-full bg-[#eff6ff] px-4 py-2 text-[13px] font-bold text-[#2563eb]">
                  조회 기간: {periodLabel}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[680px]">
              <div className="rounded-[20px] bg-[#f8fafc] p-4">
                <div className="text-[12px] font-bold text-[#98a2b3]">주문 수</div>
                <div className="mt-2 text-[26px] font-black text-[#111827]">
                  {summary.orderCount}
                  <span className="ml-1 text-[14px] font-bold text-[#667085]">건</span>
                </div>
              </div>

              <div className="rounded-[20px] bg-[#1d4ed8] p-4 text-white shadow-[0_12px_28px_rgba(29,78,216,0.26)]">
                <div className="text-[12px] font-bold text-blue-100">총 금액</div>
                <div className="mt-2 text-[25px] font-black">
                  {formatMoney(summary.totalPrice)}
                </div>
              </div>

              <div className="rounded-[20px] bg-[#ecfdf5] p-4">
                <div className="text-[12px] font-bold text-emerald-600">청구 치아</div>
                <div className="mt-2 text-[26px] font-black text-emerald-700">
                  {summary.totalBillableToothCount}
                  <span className="ml-1 text-[14px] font-bold">개</span>
                </div>
              </div>

              <div className="rounded-[20px] bg-[#fff1f2] p-4">
                <div className="text-[12px] font-bold text-red-500">없는 치아</div>
                <div className="mt-2 text-[26px] font-black text-red-500">
                  {summary.totalMissingToothCount}
                  <span className="ml-1 text-[14px] font-bold">개</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-[24px] border border-[#d9e0ea] bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-end">
            <div>
              <label className="mb-2 block text-[13px] font-bold text-[#475467]">
                시작일
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-12 w-full rounded-[14px] border border-[#d6dde8] bg-[#f8fafc] px-4 text-[14px] font-semibold text-[#475467] outline-none transition focus:border-[#3b82f6] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-bold text-[#475467]">
                종료일
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-12 w-full rounded-[14px] border border-[#d6dde8] bg-[#f8fafc] px-4 text-[14px] font-semibold text-[#475467] outline-none transition focus:border-[#3b82f6] focus:bg-white"
              />
            </div>

            {isAdmin ? (
              <div>
                <label className="mb-2 block text-[13px] font-bold text-[#475467]">
                  치과 선택
                </label>
                <select
                  value={selectedClinicName}
                  onChange={(event) => setSelectedClinicName(event.target.value)}
                  className="h-12 w-full rounded-[14px] border border-[#d6dde8] bg-[#f8fafc] px-4 text-[14px] font-semibold text-[#475467] outline-none transition focus:border-[#3b82f6] focus:bg-white"
                >
                  <option value="">전체 치과</option>
                  {clinicOptions.map((clinicName) => (
                    <option key={clinicName} value={clinicName}>
                      {clinicName}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-[13px] font-bold text-[#475467]">
                  계정
                </label>
                <div className="flex h-12 items-center rounded-[14px] border border-[#d6dde8] bg-[#f8fafc] px-4 text-[14px] font-semibold text-[#475467]">
                  {currentUser?.email || currentUser?.loginId || '내 계정'}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={fetchBillingSummary}
              className="h-12 rounded-[14px] bg-[#2563eb] px-6 text-[14px] font-black text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)] transition hover:bg-[#1d4ed8]"
            >
              조회
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="h-12 rounded-[14px] bg-[#eef2f7] px-6 text-[14px] font-black text-[#64748b] transition hover:bg-[#e2e8f0]"
            >
              초기화
            </button>
          </div>
        </section>

        {error && (
          <section className="mb-6 rounded-[18px] border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-600">
            <div>{error}</div>
            <button
              type="button"
              onClick={fetchBillingSummary}
              className="mt-4 rounded-[12px] bg-red-600 px-5 py-2 text-[13px] font-bold text-white transition hover:bg-red-700"
            >
              다시 시도
            </button>
          </section>
        )}

        {isAdmin && (
          <section className="mb-6 rounded-[24px] border border-[#d9e0ea] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[21px] font-black text-[#111827]">치과별 합계</h2>
                <p className="mt-1 text-[13px] font-semibold text-[#98a2b3]">
                  선택한 기간 기준 치과별 주문 금액입니다.
                </p>
              </div>
            </div>

            {clinicSummaries.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-[#d9e0ea] p-8 text-center text-[14px] font-bold text-[#98a2b3]">
                집계할 치과별 내역이 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-[12px] font-black uppercase tracking-wide text-[#98a2b3]">
                      <th className="px-4 py-2">치과명</th>
                      <th className="px-4 py-2 text-right">주문 수</th>
                      <th className="px-4 py-2 text-right">제작 범위</th>
                      <th className="px-4 py-2 text-right">없는 치아</th>
                      <th className="px-4 py-2 text-right">청구 치아</th>
                      <th className="px-4 py-2 text-right">합계 금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clinicSummaries.map((clinic) => (
                      <tr key={clinic.clinic_name} className="rounded-[14px] bg-[#f8fafc]">
                        <td className="rounded-l-[14px] px-4 py-4 text-[14px] font-black text-[#1f2937]">
                          {clinic.clinic_name}
                        </td>
                        <td className="px-4 py-4 text-right text-[14px] font-bold text-[#475467]">
                          {clinic.order_count}건
                        </td>
                        <td className="px-4 py-4 text-right text-[14px] font-bold text-[#475467]">
                          {clinic.total_selected_tooth_count}개
                        </td>
                        <td className="px-4 py-4 text-right text-[14px] font-bold text-red-500">
                          {clinic.total_missing_tooth_count}개
                        </td>
                        <td className="px-4 py-4 text-right text-[14px] font-bold text-emerald-600">
                          {clinic.total_billable_tooth_count}개
                        </td>
                        <td className="rounded-r-[14px] px-4 py-4 text-right text-[15px] font-black text-[#2563eb]">
                          {formatMoney(clinic.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section className="rounded-[24px] border border-[#d9e0ea] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[21px] font-black text-[#111827]">주문별 상세 내역</h2>
              <p className="mt-1 text-[13px] font-semibold text-[#98a2b3]">
                주문별 금액 산정 내역을 확인할 수 있습니다.
              </p>
            </div>

            <div className="text-[13px] font-bold text-[#667085]">
              총 {displayOrders.length}건
            </div>
          </div>

          {displayOrders.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-[18px] border border-dashed border-[#d9e0ea] px-4 py-12 text-center text-[15px] font-bold text-[#98a2b3]">
              조회 조건에 맞는 주문이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-[12px] font-black uppercase tracking-wide text-[#98a2b3]">
                    <th className="px-4 py-2">주문번호</th>
                    {isAdmin && <th className="px-4 py-2">치과명</th>}
                    <th className="px-4 py-2">환자명</th>
                    <th className="px-4 py-2">제품</th>
                    <th className="px-4 py-2 text-right">제작 범위</th>
                    <th className="px-4 py-2 text-right">없는 치아</th>
                    <th className="px-4 py-2 text-right">청구 치아</th>
                    <th className="px-4 py-2 text-right">기본 금액</th>
                    <th className="px-4 py-2 text-right">치아 조정</th>
                    <th className="px-4 py-2 text-right">지그</th>
                    <th className="px-4 py-2 text-right">합계</th>
                    <th className="px-4 py-2">접수일</th>
                    <th className="px-4 py-2">상태</th>
                  </tr>
                </thead>

                <tbody>
                  {displayOrders.map((order) => (
                    <tr key={order.id} className="bg-[#f8fafc]">
                      <td className="rounded-l-[14px] px-4 py-4">
                        <button
                          type="button"
                          onClick={() => router.push(`/orders/${order.id}`)}
                          className="font-black text-[#2563eb] hover:underline"
                        >
                          {order.order_number || `ORD-${order.id}`}
                        </button>
                      </td>

                      {isAdmin && (
                        <td className="px-4 py-4 text-[13px] font-bold text-[#475467]">
                          {order.clinic_name || '-'}
                        </td>
                      )}

                      <td className="px-4 py-4 text-[13px] font-bold text-[#111827]">
                        {order.patient_name || '-'}
                      </td>

                      <td className="px-4 py-4 text-[13px] font-bold text-[#475467]">
                        {order.product_type || '-'}
                      </td>

                      <td className="px-4 py-4 text-right text-[13px] font-bold text-[#475467]">
                        {order.selected_tooth_count}개
                      </td>

                      <td className="px-4 py-4 text-right text-[13px] font-bold text-red-500">
                        {order.missing_tooth_count}개
                      </td>

                      <td className="px-4 py-4 text-right text-[13px] font-bold text-emerald-600">
                        {order.billable_tooth_count}개
                      </td>

                      <td className="px-4 py-4 text-right text-[13px] font-bold text-[#475467]">
                        {formatMoney(order.product_base_price)}
                      </td>

                      <td
                        className={`px-4 py-4 text-right text-[13px] font-bold ${
                          normalizeNumber(order.tooth_adjustment_price, 0) >= 0
                            ? 'text-red-500'
                            : 'text-emerald-600'
                        }`}
                      >
                        {normalizeNumber(order.tooth_adjustment_price, 0) > 0 ? '+' : ''}
                        {formatMoney(order.tooth_adjustment_price)}
                      </td>

                      <td className="px-4 py-4 text-right text-[13px] font-bold text-[#475467]">
                        {formatMoney(order.jig_price)}
                      </td>

                      <td className="px-4 py-4 text-right text-[15px] font-black text-[#2563eb]">
                        {formatMoney(order.total_price)}
                      </td>

                      <td className="px-4 py-4 text-[12px] font-bold text-[#667085]">
                        {formatDateTime(order.created_at)}
                      </td>

                      <td className="rounded-r-[14px] px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-bold ${statusBadgeClass(
                            order.status
                          )}`}
                        >
                          {order.status || '접수 대기'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}