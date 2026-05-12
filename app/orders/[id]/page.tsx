// app/orders/[id]/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppTopNav from '@/app/components/AppTopNav'

const PERMANENT_TOP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const PERMANENT_BOTTOM = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

const PRIMARY_TOP = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65]
const PRIMARY_BOTTOM = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]

const PERMANENT_SET = new Set([...PERMANENT_TOP, ...PERMANENT_BOTTOM].map(String))
const PRIMARY_SET = new Set([...PRIMARY_TOP, ...PRIMARY_BOTTOM].map(String))

const GET_ORDER_DETAIL_API_URL =
  process.env.NEXT_PUBLIC_NCP_GET_ORDER_DETAIL_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/get-order-detail'

const UPDATE_ORDER_STATUS_API_URL =
  process.env.NEXT_PUBLIC_NCP_UPDATE_ORDER_STATUS_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/update-order-status'

const GET_DOWNLOAD_URL_API_URL =
  process.env.NEXT_PUBLIC_NCP_GET_DOWNLOAD_URL_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/get-download-url'

function IconUser() {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none">
      <circle cx="24" cy="17" r="8" stroke="currentColor" strokeWidth="3" />
      <path
        d="M10 40C12.8 31.5 18 28 24 28C30 28 35.2 31.5 38 40"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7V12L15.5 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconDocument() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <path
        d="M7 3H14L19 8V21H7V3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 3V8H19" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 13H16M10 17H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconTooth() {
  return (
    <svg viewBox="0 0 36 48" className="h-7 w-7" fill="none">
      <path
        d="M9 5C6 10 6 17 8 23C9 27 9 33 9 39C9 44 12 45 14 40L16.5 29C17 26.5 19 26.5 19.5 29L22 40C24 45 27 44 27 39C27 33 27 27 28 23C30 17 30 10 27 5C24 1 12 1 9 5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path
        d="M12 4V14M12 14L8 10M12 14L16 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 19H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ToothIcon({
  selected,
  flipped = false,
}: {
  selected: boolean
  flipped?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex h-[48px] w-[34px] items-center justify-center rounded-[13px] transition-all duration-300 ${
          selected ? 'bg-blue-500 shadow-lg shadow-blue-100' : 'bg-white'
        }`}
      >
        <svg
          viewBox="0 0 36 58"
          className={`h-[42px] w-[27px] ${flipped ? 'rotate-180' : ''}`}
          fill={selected ? '#2563eb' : 'none'}
          stroke={selected ? '#ffffff' : '#b6c2d2'}
          strokeWidth="1.8"
        >
          <path
            d="M9 6 C7 12, 7 19, 9 26 C10 31, 10 37, 10 45 C10 50, 12 51, 14 46 L16.5 34 C17 31, 19 31, 19.5 34 L22 46 C24 51, 26 50, 26 45 C26 37, 26 31, 27 26 C29 19, 29 12, 27 6 M9 6 C12 2, 24 2, 27 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}

function sanitizeDownloadFileName(fileName?: string | null) {
  const raw = String(fileName || '').trim()

  if (!raw) return 'scan-file.stl'

  return raw
    .replace(/[\r\n]/g, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim() || 'scan-file.stl'
}

function normalizeGender(value?: string | null) {
  const raw = String(value || '').trim().toLowerCase()

  if (!raw) return ''
  if (raw === 'male' || raw === 'm' || raw === '남') return '남'
  if (raw === 'female' || raw === 'f' || raw === '여') return '여'

  return String(value)
}

function getAgeFromBirth(value?: string | null) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1
  }

  return age > 0 ? `${age}세` : ''
}

function statusStyle(status?: string | null) {
  const value = status || '접수 대기'

  if (value.includes('완료')) {
    return 'border-emerald-100 bg-emerald-50 text-emerald-700'
  }

  if (value.includes('작업') || value.includes('제작') || value.includes('디자인')) {
    return 'border-amber-100 bg-amber-50 text-amber-700'
  }

  if (value.includes('수정') || value.includes('재접수')) {
    return 'border-orange-100 bg-orange-50 text-orange-700'
  }

  return 'border-blue-100 bg-blue-50 text-blue-700'
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState('clinic')

  const getTokenOrRedirect = useCallback(() => {
    const token = window.localStorage.getItem('smilecad_token')

    if (!token) {
      router.replace('/login')
      return null
    }

    return token
  }, [router])

  const parseJsonResponse = async (res: Response) => {
    const text = await res.text()

    try {
      return text ? JSON.parse(text) : null
    } catch {
      throw new Error('API 응답이 JSON 형식이 아닙니다. API Gateway 연결을 확인해주세요.')
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

  const fetchOrderDetail = useCallback(async () => {
    if (!id) return

    const token = getTokenOrRedirect()
    if (!token) return

    try {
      setLoading(true)
      setError('')

      const res = await fetch(`${GET_ORDER_DETAIL_API_URL}?id=${encodeURIComponent(id)}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (handleAuthError(res.status)) return

      const data = await parseJsonResponse(res)

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '주문 상세 정보를 불러오지 못했습니다.')
      }

      setOrder(data.order || null)
      setUserRole(data.role || 'clinic')
    } catch (err: any) {
      setError(err.message || '주문 상세 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [id, getTokenOrRedirect, handleAuthError])

  useEffect(() => {
    fetchOrderDetail()
  }, [fetchOrderDetail])

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return
    if (!confirm(`주문 상태를 '${newStatus}'(으)로 변경하시겠습니까?`)) return

    const token = getTokenOrRedirect()
    if (!token) return

    try {
      setUpdating(true)
      setError('')

      const res = await fetch(UPDATE_ORDER_STATUS_API_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          status: newStatus,
        }),
      })

      if (handleAuthError(res.status)) return

      const data = await parseJsonResponse(res)

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '상태 변경에 실패했습니다.')
      }

      alert('상태가 변경되었습니다.')
      await fetchOrderDetail()
    } catch (err: any) {
      alert(err.message || '상태 변경 중 오류가 발생했습니다.')
    } finally {
      setUpdating(false)
    }
  }

  const handleDownload = async (path: string, fileName: string) => {
    const token = getTokenOrRedirect()
    if (!token) return

    const cleanPath = String(path || '').trim()
    const cleanFileName = sanitizeDownloadFileName(fileName)

    if (!cleanPath) {
      alert('다운로드할 파일 경로가 없습니다.')
      return
    }

    try {
      setDownloading(true)

      const res = await fetch(GET_DOWNLOAD_URL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          authToken: token,
          token,
          orderId: id,
          filePath: cleanPath,
          objectKey: cleanPath,
          key: cleanPath,
          path: cleanPath,
          fileName: cleanFileName,
          filename: cleanFileName,
          name: cleanFileName,
        }),
      })

      if (handleAuthError(res.status)) return

      const data = await parseJsonResponse(res)

      if (!res.ok || !data?.success || !data?.downloadUrl) {
        throw new Error(data?.error || '다운로드 URL 발급에 실패했습니다.')
      }

      const fileRes = await fetch(data.downloadUrl)

      if (!fileRes.ok) {
        throw new Error(`파일 다운로드에 실패했습니다. 상태코드 ${fileRes.status}`)
      }

      const blob = await fileRes.blob()
      const blobUrl = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = cleanFileName || data.fileName || 'scan-file.stl'
      document.body.appendChild(link)
      link.click()
      link.remove()

      window.URL.revokeObjectURL(blobUrl)
    } catch (err: any) {
      alert(err.message || '다운로드 실패')
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadAll = async () => {
    if (!order?.scan_file_paths) return

    const paths = String(order.scan_file_paths)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    const names = String(order.scan_file_names || '')
      .split(',')
      .map((value) => value.trim())

    for (let i = 0; i < paths.length; i += 1) {
      const originalName = names[i] || `scan-file-${i + 1}.stl`
      await handleDownload(paths[i], originalName)
      await new Promise((resolve) => setTimeout(resolve, 700))
    }
  }

  const selectedTeethList = useMemo<string[]>(() => {
    if (!order?.selected_teeth) return []

    if (Array.isArray(order.selected_teeth)) {
      return order.selected_teeth.map(String)
    }

    return String(order.selected_teeth)
      .replace(/[{}"]/g, '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  }, [order])

  const selectedToothType = useMemo<'permanent' | 'primary' | 'mixed'>(() => {
    const hasPrimary = selectedTeethList.some((tooth) => PRIMARY_SET.has(tooth))
    const hasPermanent = selectedTeethList.some((tooth) => PERMANENT_SET.has(tooth))

    if (hasPrimary && !hasPermanent) return 'primary'
    if (hasPermanent && !hasPrimary) return 'permanent'

    return 'mixed'
  }, [selectedTeethList])

  const toothChartRows = useMemo<
    {
      label: string
      teeth: number[]
      flipped: boolean
    }[]
  >(() => {
    if (selectedToothType === 'primary') {
      return [
        { label: '유치 상악', teeth: PRIMARY_TOP, flipped: true },
        { label: '유치 하악', teeth: PRIMARY_BOTTOM, flipped: false },
      ]
    }

    if (selectedToothType === 'permanent') {
      return [
        { label: '영구치 상악', teeth: PERMANENT_TOP, flipped: true },
        { label: '영구치 하악', teeth: PERMANENT_BOTTOM, flipped: false },
      ]
    }

    return [
      { label: '영구치 상악', teeth: PERMANENT_TOP, flipped: true },
      { label: '영구치 하악', teeth: PERMANENT_BOTTOM, flipped: false },
      { label: '유치 상악', teeth: PRIMARY_TOP, flipped: true },
      { label: '유치 하악', teeth: PRIMARY_BOTTOM, flipped: false },
    ]
  }, [selectedToothType])

  const scanFiles = useMemo<{ path: string; name: string }[]>(() => {
    const paths = String(order?.scan_file_paths || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    const names = String(order?.scan_file_names || '')
      .split(',')
      .map((value) => value.trim())

    return paths.map((path, index) => ({
      path,
      name: names[index] || `scan-file-${index + 1}.stl`,
    }))
  }, [order])

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-'

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'

    return date.toLocaleString('ko-KR')
  }

  const formatDate = (value?: string | null) => {
    if (!value) return '-'

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'

    return date.toLocaleDateString('ko-KR')
  }

  const gender = normalizeGender(order?.patient_gender)
  const age = getAgeFromBirth(order?.patient_birth)
  const patientMeta = [gender, age].filter(Boolean).join(' / ')

  const historySteps = [
    {
      label: '주문 접수',
      time: formatDateTime(order?.created_at),
      active: true,
      done: true,
    },
    {
      label: '접수 완료',
      time: order?.accepted_at ? formatDateTime(order.accepted_at) : '대기 중',
      active: false,
      done: Boolean(order?.accepted_at),
    },
    {
      label: '제작 중',
      time: order?.production_started_at ? formatDateTime(order.production_started_at) : '대기 중',
      active: false,
      done: Boolean(order?.production_started_at),
    },
    {
      label: '제작 완료',
      time: order?.completed_at ? formatDateTime(order.completed_at) : '대기 중',
      active: false,
      done: Boolean(order?.completed_at),
    },
  ]

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-5 text-[15px] font-extrabold text-slate-500 shadow-sm">
          로딩 중...
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f8fafc]">
        <AppTopNav current="orders" />
        <div className="mx-auto w-full max-w-[1480px] px-6 pb-12">
          <div className="rounded-[26px] border border-red-100 bg-red-50 p-8 text-center font-bold text-red-600">
            {error}
          </div>
        </div>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-[#f8fafc]">
        <AppTopNav current="orders" />
        <div className="mx-auto w-full max-w-[1480px] px-6 pb-12">
          <div className="rounded-[26px] border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
            주문을 찾을 수 없습니다.
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <AppTopNav current="orders" />

      <div className="mx-auto w-full max-w-[1480px] px-6 pb-12">
        <section className="mb-7 rounded-[30px] border border-slate-200 bg-white p-7 shadow-[0_14px_45px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-slate-100 text-blue-700">
                <IconUser />
              </div>

              <div>
                <p className="text-[13px] font-black text-blue-600">환자명</p>
                <div className="mt-1 flex flex-wrap items-end gap-3">
                  <h1 className="text-[36px] font-black leading-none tracking-[-0.04em] text-slate-950">
                    {order.patient_name || '-'}
                  </h1>
                  {patientMeta && (
                    <span className="mb-1 text-[15px] font-bold text-slate-500">
                      ({patientMeta})
                    </span>
                  )}
                </div>

                <span
                  className={`mt-4 inline-flex rounded-lg border px-3 py-1 text-[13px] font-black ${statusStyle(
                    order.status
                  )}`}
                >
                  {order.status || '접수 대기'}
                </span>
              </div>
            </div>

            <div className="hidden h-24 w-px bg-slate-200 lg:block" />

            <div className="min-w-0 lg:min-w-[370px]">
              <p className="text-[13px] font-bold text-slate-500">주문번호</p>
              <div className="mt-2 flex items-center gap-3">
                <p className="truncate text-[24px] font-black tracking-[-0.02em] text-slate-950">
                  {order.order_number || `ORD-${order.id}`}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard?.writeText(order.order_number || `ORD-${order.id}`)
                  }
                  className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  title="주문번호 복사"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                    <path
                      d="M9 9H19V19H9V9Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 15H4V5H14V6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <p className="mt-5 text-[14px] font-bold text-slate-500">
                주문 생성일{' '}
                <span className="ml-2 text-slate-700">{formatDateTime(order.created_at)}</span>
              </p>
            </div>
          </div>
        </section>

        <section className="mb-7 grid grid-cols-1 gap-7 lg:grid-cols-[360px_1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-8 flex items-center gap-3">
              <div className="text-blue-600">
                <IconClock />
              </div>
              <h2 className="text-[22px] font-black tracking-[-0.03em] text-slate-950">
                주문 이력
              </h2>
            </div>

            <div className="relative space-y-8 pl-10 before:absolute before:left-[10px] before:top-3 before:h-[calc(100%-30px)] before:w-[2px] before:bg-slate-200">
              {historySteps.map((step, index) => (
                <div key={step.label} className="relative">
                  <div
                    className={`absolute -left-[39px] top-1 h-5 w-5 rounded-full border-[3px] ring-4 ring-white ${
                      step.active
                        ? 'border-emerald-500 bg-emerald-500 shadow-lg shadow-emerald-100'
                        : step.done
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-slate-300 bg-white'
                    }`}
                  />

                  <p
                    className={`text-[16px] font-black ${
                      step.active ? 'text-emerald-700' : 'text-slate-800'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="mt-1 text-[14px] font-semibold text-slate-500">{step.time}</p>

                  {index === 0 && (
                    <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-[13px] font-semibold text-slate-500">
                      주문이 접수되었습니다.
                    </p>
                  )}
                </div>
              ))}
            </div>

            {userRole === 'admin' && (
              <div className="mt-9 border-t border-slate-100 pt-6">
                <h3 className="mb-4 text-[15px] font-black text-slate-800">관리자 상태 변경</h3>
                <div className="grid grid-cols-1 gap-2">
                  {['접수 대기', '디자인 작업중', '수정 요청 중', '주문 재접수'].map((s) => (
                    <button
                      key={s}
                      disabled={updating || order.status === s}
                      onClick={() => handleStatusUpdate(s)}
                      className={`rounded-2xl px-4 py-3 text-[14px] font-black transition-all ${
                        order.status === s
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-7 flex items-center gap-3">
              <div className="text-blue-600">
                <IconDocument />
              </div>
              <h2 className="text-[22px] font-black tracking-[-0.03em] text-slate-950">
                주문 상세 정보
              </h2>
            </div>

            <div className="border-t border-slate-200">
              <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-4 md:divide-x md:divide-y-0">
                {[
                  { label: '환자명', value: order.patient_name },
                  { label: '희망 완료일', value: formatDate(order.delivery_date) },
                  { label: '치과명', value: order.clinic_name },
                  { label: '주문 생성일', value: formatDateTime(order.created_at) },
                ].map((item) => (
                  <div key={item.label} className="px-0 py-5 md:px-7">
                    <p className="text-[13px] font-bold text-slate-500">{item.label}</p>
                    <p className="mt-3 text-[16px] font-black text-slate-950">
                      {item.value || '-'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 py-5">
                <p className="text-[13px] font-bold text-slate-500">치과 주소</p>
                <p className="mt-3 text-[16px] font-black leading-relaxed text-slate-950">
                  {order.clinic_address || '-'}
                </p>
              </div>

              <div className="grid grid-cols-1 border-t border-slate-100 md:grid-cols-3 md:divide-x md:divide-slate-100">
                <div className="px-0 py-5 md:px-7">
                  <p className="text-[13px] font-bold text-slate-500">지그 제작</p>
                  <span className="mt-3 inline-flex rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-1.5 text-[14px] font-black text-emerald-700">
                    {order.jig_required || '-'}
                  </span>
                </div>

                <div className="px-0 py-5 md:px-7">
                  <p className="text-[13px] font-bold text-slate-500">와이어 두께</p>
                  <span className="mt-3 inline-flex rounded-lg border border-blue-100 bg-blue-50 px-4 py-1.5 text-[14px] font-black text-blue-700">
                    {order.thickness || '-'}
                  </span>
                </div>

                <div className="px-0 py-5 md:px-7">
                  <p className="text-[13px] font-bold text-slate-500">특이사항</p>
                  <p className="mt-3 text-[16px] font-black text-slate-950">
                    {order.request_note || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-7 rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
            <div className="border-b border-slate-100 pb-7 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
              <div className="mb-7 flex items-center gap-3">
                <div className="text-blue-600">
                  <IconTooth />
                </div>
                <h2 className="text-[22px] font-black tracking-[-0.03em] text-slate-950">
                  치식 정보
                </h2>
              </div>

              <div>
                <p className="text-[14px] font-bold text-slate-500">선택 치식</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {selectedTeethList.length > 0 ? (
                    selectedTeethList.map((tooth: string) => (
                      <span
                        key={tooth}
                        className="rounded-xl bg-blue-50 px-4 py-2 text-[15px] font-black text-blue-700"
                      >
                        {tooth}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-xl bg-slate-100 px-4 py-2 text-[14px] font-bold text-slate-500">
                      없음
                    </span>
                  )}

                  <span className="text-[14px] font-black text-slate-700">
                    / 총 {selectedTeethList.length}개
                  </span>
                </div>

                <div className="mt-8 space-y-3">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-slate-600">
                    <span className="h-3 w-3 rounded-full bg-blue-600" />
                    선택된 치아
                  </div>
                  <div className="flex items-center gap-2 text-[13px] font-bold text-slate-500">
                    <span className="h-3 w-3 rounded-full bg-slate-300" />
                    선택되지 않은 치아
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className={selectedToothType === 'primary' ? 'min-w-[620px]' : 'min-w-[900px]'}>
                {toothChartRows.map((row, rowIndex) => (
                  <div key={row.label}>
                    {rowIndex > 0 && <div className="my-6 h-px w-full bg-slate-200" />}

                    <div className="grid grid-cols-[90px_1fr] items-center gap-4">
                      <p className="text-[15px] font-black text-slate-500">{row.label}</p>

                      <div className="flex items-center justify-between gap-4">
                        {row.teeth.map((n) => {
                          const selected = selectedTeethList.includes(String(n))

                          return (
                            <div key={n} className="flex flex-col items-center gap-2">
                              <ToothIcon selected={selected} flipped={row.flipped} />
                              <span
                                className={`text-[13px] font-black ${
                                  selected ? 'text-blue-700' : 'text-slate-600'
                                }`}
                              >
                                {n}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-7 lg:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
            <h2 className="mb-6 text-[22px] font-black tracking-[-0.03em] text-slate-950">
              요청사항
            </h2>
            <div className="min-h-[120px] rounded-2xl border border-slate-100 bg-slate-50 p-6 text-[15px] font-semibold leading-relaxed text-slate-600">
              {order.request_note || '없음'}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-[22px] font-black tracking-[-0.03em] text-slate-950">
                스캔 파일
              </h2>

              {scanFiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {downloading ? '다운로드 중...' : '전체 다운로드'}
                  <IconDownload />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {scanFiles.length > 0 ? (
                scanFiles.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-black text-slate-900">{file.name}</p>
                      <p className="mt-1 text-[12px] font-bold text-slate-400">STL Scan File</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownload(file.path, file.name)}
                      disabled={downloading}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-black text-blue-600 transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      다운로드
                      <IconDownload />
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-center text-[14px] font-bold text-slate-400">
                  파일 없음
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}