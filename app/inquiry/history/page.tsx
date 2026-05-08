// app/inquiry/history/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppTopNav from '@/app/components/AppTopNav'

const LIST_INQUIRIES_API_URL =
  process.env.NEXT_PUBLIC_NCP_LIST_INQUIRIES_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/list-inquiries'

type InquiryItem = {
  id: string
  user_id?: string | null
  user_role?: string | null
  clinic_name?: string | null
  clinic_address?: string | null
  clinic_phone?: string | null
  title?: string | null
  category?: string | null
  content?: string | null
  status?: string | null
  admin_reply?: string | null
  replied_at?: string | null
  replied_by?: string | null
  created_at?: string | null
  updated_at?: string | null
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function StatusBadge({ status }: { status?: string | null }) {
  if (status === '답변 완료') {
    return (
      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        답변 완료
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
      접수
    </span>
  )
}

export default function InquiryHistoryPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [items, setItems] = useState<InquiryItem[]>([])
  const [selectedId, setSelectedId] = useState('')

  const readJsonSafely = async (res: Response) => {
    const text = await res.text()

    try {
      return text ? JSON.parse(text) : null
    } catch {
      throw new Error('API 응답이 JSON 형식이 아닙니다. API Gateway URL 또는 배포 상태를 확인해주세요.')
    }
  }

  const handleAuthError = useCallback(
    (status: number) => {
      if (status === 401 || status === 403) {
        window.localStorage.removeItem('smilecad_token')
        window.localStorage.removeItem('smilecad_user')
        router.replace('/login?force=1')
        return true
      }

      return false
    },
    [router]
  )

  const loadPage = useCallback(async () => {
    const token = window.localStorage.getItem('smilecad_token')

    if (!token) {
      router.replace('/login?force=1')
      return
    }

    try {
      setLoading(true)
      setErrorMessage('')

      const res = await fetch(LIST_INQUIRIES_API_URL, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (handleAuthError(res.status)) return

      const data = await readJsonSafely(res)

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '문의 내역을 불러오지 못했습니다.')
      }

      const nextItems: InquiryItem[] = data.inquiries || data.items || []

      setItems(nextItems)

      if (nextItems.length > 0) {
        setSelectedId(nextItems[0].id)
      } else {
        setSelectedId('')
      }
    } catch (err) {
      console.error(err)
      setErrorMessage(err instanceof Error ? err.message : '문의 내역 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [router, handleAuthError])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === selectedId) || null
  }, [items, selectedId])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f3f5f9] px-6 py-10">
        <div className="mx-auto w-full max-w-[1380px]">
          <div className="rounded-[28px] border border-[#d9e0ea] bg-white px-8 py-10 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="text-[15px] font-semibold text-[#667085]">
              문의 내역을 불러오는 중입니다...
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f3f5f9] px-6 py-10">
      <div className="mx-auto w-full max-w-[1380px]">
        <AppTopNav current="inquiry-history" />

        {errorMessage ? (
          <div className="mb-6 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
          <div className="overflow-hidden rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="border-b border-[#e9edf4] bg-[#f7f9fc] px-6 py-4 text-[17px] font-extrabold text-[#263142]">
              문의 내역
            </div>

            <div className="p-4">
              {items.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-[#d9e0ea] bg-[#fbfcfe] px-5 py-10 text-center text-[14px] text-[#98a2b3]">
                  등록된 문의가 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => {
                    const selected = item.id === selectedId

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={classNames(
                          'w-full rounded-[16px] border px-4 py-4 text-left transition',
                          selected
                            ? 'border-[#9db7ff] bg-[#f5f9ff]'
                            : 'border-[#e4e8ef] bg-white hover:bg-[#fbfcfe]'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="truncate text-[14px] font-bold text-[#344054]">
                            {item.title || '-'}
                          </div>
                          <StatusBadge status={item.status} />
                        </div>

                        <div className="mt-2 text-[12px] font-semibold text-[#98a2b3]">
                          {item.category || '-'} · {formatDateTime(item.created_at)}
                        </div>

                        <div className="mt-2 line-clamp-2 text-[13px] leading-6 text-[#667085]">
                          {item.content || '-'}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <div className="border-b border-[#e9edf4] bg-[#f7f9fc] px-6 py-4 text-[17px] font-extrabold text-[#263142]">
              문의 상세
            </div>

            <div className="p-6">
              {!selectedItem ? (
                <div className="rounded-[16px] border border-dashed border-[#d9e0ea] bg-[#fbfcfe] px-5 py-10 text-center text-[14px] text-[#98a2b3]">
                  문의를 선택해주세요.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-[16px] border border-[#e4e8ef] bg-[#f9fbfd] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[20px] font-extrabold text-[#1f2937]">
                        {selectedItem.title || '-'}
                      </div>
                      <StatusBadge status={selectedItem.status} />
                    </div>

                    <div className="mt-3 text-[13px] font-semibold text-[#98a2b3]">
                      {selectedItem.category || '-'} · {formatDateTime(selectedItem.created_at)}
                    </div>

                    <div className="mt-5 whitespace-pre-wrap text-[14px] leading-7 text-[#344054]">
                      {selectedItem.content || '-'}
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-[#e4e8ef] bg-white p-5">
                    <div className="mb-3 text-[16px] font-extrabold text-[#263142]">답변</div>

                    {selectedItem.admin_reply ? (
                      <>
                        <div className="whitespace-pre-wrap text-[14px] leading-7 text-[#344054]">
                          {selectedItem.admin_reply}
                        </div>
                        <div className="mt-4 text-[12px] font-semibold text-[#98a2b3]">
                          답변일시: {formatDateTime(selectedItem.replied_at)}
                        </div>
                      </>
                    ) : (
                      <div className="text-[14px] text-[#98a2b3]">
                        아직 등록된 답변이 없습니다.
                      </div>
                    )}
                  </div>

                  <div className="rounded-[16px] border border-[#e4e8ef] bg-white p-5">
                    <div className="mb-3 text-[16px] font-extrabold text-[#263142]">치과 정보</div>
                    <div className="space-y-2 text-[14px] text-[#344054]">
                      <div>
                        <span className="font-bold text-[#98a2b3]">치과명:</span>{' '}
                        {selectedItem.clinic_name || '-'}
                      </div>
                      <div>
                        <span className="font-bold text-[#98a2b3]">연락처:</span>{' '}
                        {selectedItem.clinic_phone || '-'}
                      </div>
                      <div className="whitespace-pre-wrap break-all">
                        <span className="font-bold text-[#98a2b3]">주소:</span>{' '}
                        {selectedItem.clinic_address || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}