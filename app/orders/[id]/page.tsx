// app/orders/[id]/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppTopNav from '@/app/components/AppTopNav'

const PERMANENT_TOP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const PERMANENT_BOTTOM = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

const GET_ORDER_DETAIL_API_URL =
  process.env.NEXT_PUBLIC_NCP_GET_ORDER_DETAIL_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/get-order-detail'

const UPDATE_ORDER_STATUS_API_URL =
  process.env.NEXT_PUBLIC_NCP_UPDATE_ORDER_STATUS_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/update-order-status'

const GET_DOWNLOAD_URL_API_URL =
  process.env.NEXT_PUBLIC_NCP_GET_DOWNLOAD_URL_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/get-download-url'

function ToothIcon({
  selected,
  flipped = false,
}: {
  selected: boolean
  flipped?: boolean
}) {
  return (
    <div
      className={`flex h-[60px] w-[36px] items-center justify-center rounded-[12px] border-2 transition-all duration-300 ${
        selected
          ? 'border-blue-500 bg-blue-50 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
          : 'border-[#f1f5f9] bg-white hover:border-[#e2e8f0]'
      }`}
    >
      <svg
        viewBox="0 0 36 58"
        className={`h-[48px] w-[28px] ${flipped ? 'rotate-180' : ''}`}
        fill={selected ? '#3b82f6' : 'none'}
        stroke={selected ? '#2563eb' : '#94a3b8'}
        strokeWidth="1.8"
      >
        <path
          d="M9 6 C7 12, 7 19, 9 26 C10 31, 10 37, 10 45 C10 50, 12 51, 14 46 L16.5 34 C17 31, 19 31, 19.5 34 L22 46 C24 51, 26 50, 26 45 C26 37, 26 31, 27 26 C29 19, 29 12, 27 6 M9 6 C12 2, 24 2, 27 6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
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

    try {
      const res = await fetch(GET_DOWNLOAD_URL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filePath: path,
          orderId: id,
        }),
      })

      if (handleAuthError(res.status)) return

      const data = await parseJsonResponse(res)

      if (!res.ok || !data?.success || !data?.downloadUrl) {
        throw new Error(data?.error || '다운로드 URL 발급에 실패했습니다.')
      }

      const link = document.createElement('a')
      link.href = data.downloadUrl
      link.setAttribute('download', fileName || 'download')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err: any) {
      alert(err.message || '다운로드 실패')
    }
  }

  const handleDownloadAll = async () => {
    if (!order?.scan_file_paths) return

    const paths = String(order.scan_file_paths).split(',')
    const names = String(order.scan_file_names || '').split(',')

    for (let i = 0; i < paths.length; i += 1) {
      await handleDownload(paths[i].trim(), names[i]?.trim() || `scan-file-${i + 1}`)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  const selectedTeethList = useMemo(() => {
    if (!order?.selected_teeth) return []

    if (Array.isArray(order.selected_teeth)) {
      return order.selected_teeth.map(String)
    }

    return String(order.selected_teeth)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-bold text-slate-400">
        로딩 중...
      </div>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f8fafc] px-6 py-10">
        <div className="mx-auto w-full max-w-[1440px]">
          <AppTopNav current="orders" />
          <div className="rounded-[24px] border border-red-100 bg-red-50 p-8 text-center font-bold text-red-600">
            {error}
          </div>
        </div>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-[#f8fafc] px-6 py-10">
        <div className="mx-auto w-full max-w-[1440px]">
          <AppTopNav current="orders" />
          <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
            주문을 찾을 수 없습니다.
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] px-6 py-10">
      <div className="mx-auto w-full max-w-[1440px]">
        <AppTopNav current="orders" />

        <div className="mb-8 flex flex-col gap-2 rounded-[32px] border border-[#e2e8f0] bg-white p-10 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-black uppercase text-blue-600/50">
              Smilecad Platform
            </span>
            <div className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="text-[14px] font-bold text-slate-400">
              Order Detail View
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <h1 className="text-[36px] font-black text-[#1e293b]">
                {order.patient_name || '-'} 환자님
              </h1>
              <span
                className={`rounded-full border px-5 py-1.5 text-[14px] font-black ${
                  order.status === '접수 대기'
                    ? 'border-blue-100 bg-blue-50 text-blue-600'
                    : 'border-slate-100 bg-slate-50 text-slate-600'
                }`}
              >
                {order.status || '접수 대기'}
              </span>
            </div>
            <span className="text-[22px] font-bold text-slate-300">
              #{order.order_number || order.id}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[400px_1fr]">
          <div className="space-y-8">
            <div className="rounded-[32px] border border-[#e2e8f0] bg-white p-10 shadow-sm">
              <h3 className="mb-8 text-[18px] font-black text-[#1e293b]">
                주문 히스토리
              </h3>

              <div className="relative space-y-10 pl-10 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-24px)] before:w-[2px] before:bg-slate-100">
                <div className="relative">
                  <div className="absolute -left-[39px] flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-[12px] text-white shadow-lg shadow-green-100 ring-8 ring-white">
                    ✓
                  </div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[15px] font-black text-[#1e293b]">
                      주문 접수됨
                    </span>
                    <span className="text-[12px] font-bold text-slate-400">
                      {formatDateTime(order.created_at)}
                    </span>
                  </div>
                  <div className="rounded-[20px] border border-slate-100 bg-slate-50 p-5 text-[14px] font-medium text-slate-600">
                    주문이 접수되었습니다.
                  </div>
                </div>

                {order.history?.map((h: any, idx: number) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[39px] flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-[12px] text-white shadow-lg ring-8 ring-white">
                      ●
                    </div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[15px] font-black text-[#1e293b]">
                        {h.status}
                      </span>
                      <span className="text-[12px] font-bold text-slate-400">
                        {formatDateTime(h.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {userRole === 'admin' && (
              <div className="rounded-[32px] border-2 border-blue-100 bg-white p-10 shadow-lg shadow-blue-50">
                <h3 className="mb-6 text-[18px] font-black text-[#1e293b]">
                  관리자 전용 액션
                </h3>
                <div className="flex flex-col gap-3">
                  {['접수 대기', '디자인 작업중', '수정 요청 중', '주문 재접수'].map((s) => (
                    <button
                      key={s}
                      disabled={updating || order.status === s}
                      onClick={() => handleStatusUpdate(s)}
                      className={`rounded-2xl py-4 text-[15px] font-black transition-all ${
                        order.status === s
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="rounded-[32px] border border-[#e2e8f0] bg-white p-10 shadow-sm">
              <h3 className="mb-10 text-[20px] font-black text-[#1e293b]">
                상세 주문 데이터
              </h3>

              <div className="grid grid-cols-2 gap-x-20 gap-y-6 text-[14px]">
                {[
                  { label: '환자 성함', value: order.patient_name },
                  { label: '희망 완료일', value: formatDate(order.delivery_date) },
                  { label: '주문 생성일', value: formatDateTime(order.created_at) },
                  { label: '치과명', value: order.clinic_name },
                  { label: '지그 제작', value: order.jig_required, highlight: true },
                  { label: '와이어 두께', value: order.thickness, highlight: true },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between border-b border-slate-50 pb-5"
                  >
                    <span
                      className={`font-bold ${
                        item.highlight ? 'text-blue-500' : 'text-slate-400'
                      }`}
                    >
                      {item.label}
                    </span>

                    {item.highlight ? (
                      <span className="rounded-[8px] border border-blue-100 bg-blue-50 px-3 py-1.5 text-[14px] font-black text-blue-600 shadow-sm">
                        {item.value || '-'}
                      </span>
                    ) : (
                      <span className="font-black text-slate-700">{item.value || '-'}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-[#e2e8f0] bg-white p-10 shadow-sm">
              <div className="mb-10 flex items-center justify-between">
                <h3 className="text-[20px] font-black text-[#1e293b]">치식 정보</h3>
                <span className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-1.5 text-[13px] font-black text-blue-600">
                  {order.product_type || '-'}
                </span>
              </div>

              <div className="flex flex-col items-center gap-8 rounded-[24px] border border-slate-100 bg-[#f8fafc]/50 py-12">
                <div className="flex gap-4">
                  {PERMANENT_TOP.map((n) => (
                    <ToothIcon
                      key={n}
                      selected={selectedTeethList.includes(String(n))}
                      flipped
                    />
                  ))}
                </div>

                <div className="h-[2px] w-[90%] bg-slate-200" />

                <div className="flex gap-4">
                  {PERMANENT_BOTTOM.map((n) => (
                    <ToothIcon key={n} selected={selectedTeethList.includes(String(n))} />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-[32px] border border-[#e2e8f0] bg-white p-8 shadow-sm">
                <h3 className="mb-5 text-[16px] font-extrabold text-[#1f2937]">
                  요청사항
                </h3>
                <div className="min-h-[120px] rounded-2xl bg-[#f8fafc] p-6 text-[14px] text-[#64748b]">
                  {order.request_note || '없음'}
                </div>
              </div>

              <div className="flex flex-col rounded-[32px] border border-[#e2e8f0] bg-white p-8 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-[16px] font-extrabold text-[#1f2937]">
                    스캔 파일
                  </h3>

                  {order.scan_file_paths && (
                    <button
                      onClick={handleDownloadAll}
                      className="rounded-lg bg-blue-50 px-4 py-1.5 text-[12px] font-extrabold text-blue-600 hover:bg-blue-100"
                    >
                      전체 다운로드 ↓
                    </button>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-center gap-3">
                  {order.scan_file_paths ? (
                    String(order.scan_file_paths)
                      .split(',')
                      .map((p: string, i: number) => {
                        const fileName =
                          String(order.scan_file_names || '')
                            .split(',')
                            [i]?.trim() || `scan-file-${i + 1}`

                        return (
                          <div
                            key={i}
                            className="flex w-full items-center justify-between rounded-xl border border-[#eef2f6] bg-[#f8fafc] p-4 transition hover:border-blue-300"
                          >
                            <span className="truncate pr-4 text-[13px] font-bold text-[#1f2937]">
                              {fileName}
                            </span>
                            <button
                              onClick={() => handleDownload(p.trim(), fileName)}
                              className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-blue-500 hover:bg-blue-50"
                            >
                              다운로드
                            </button>
                          </div>
                        )
                      })
                  ) : (
                    <p className="text-center text-[13px] text-slate-400">파일 없음</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}