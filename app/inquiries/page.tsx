// app/inquiries/page.tsx
'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppTopNav from '@/app/components/AppTopNav'

const LIST_INQUIRIES_API_URL =
  process.env.NEXT_PUBLIC_NCP_LIST_INQUIRIES_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/list-inquiries'

const REPLY_INQUIRY_API_URL =
  process.env.NEXT_PUBLIC_NCP_REPLY_INQUIRY_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/reply-inquiry'

type InquiryItem = {
  id: string
  user_id?: string | number | null
  user_role?: string | null
  login_id?: string | null
  clinic_name?: string | null
  clinic_address?: string | null
  clinic_phone?: string | null
  title?: string | null
  category?: string | null
  content?: string | null
  status?: string | null
  answer?: string | null
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

function normalizeInquiryItem(raw: any): InquiryItem {
  return {
    id: String(raw?.id ?? ''),
    user_id: raw?.user_id ?? null,
    user_role: raw?.user_role ?? null,
    login_id: raw?.login_id ?? null,
    clinic_name: raw?.clinic_name ?? null,
    clinic_address: raw?.clinic_address ?? null,
    clinic_phone: raw?.clinic_phone ?? null,
    title: raw?.title ?? null,
    category: raw?.category ?? null,
    content: raw?.content ?? null,
    status: raw?.status ?? null,
    answer: raw?.answer ?? null,
    admin_reply: raw?.admin_reply ?? raw?.answer ?? null,
    replied_at: raw?.replied_at ?? null,
    replied_by: raw?.replied_by ?? null,
    created_at: raw?.created_at ?? null,
    updated_at: raw?.updated_at ?? null,
  }
}

function StatusBadge({ status }: { status?: string | null }) {
  const value = status || '답변 대기'

  if (value === '답변 완료' || value.includes('완료')) {
    return (
      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        답변 완료
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
      답변 대기
    </span>
  )
}

export default function InquiriesPage() {
  const router = useRouter()
  const selectedIdRef = useRef('')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [message, setMessage] = useState('')
  const [items, setItems] = useState<InquiryItem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [replyText, setReplyText] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [scope, setScope] = useState<'all' | 'mine' | null>(null)

  const isAdmin = userRole === 'admin'

  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  const readJsonSafely = async (res: Response) => {
    const text = await res.text()

    try {
      return text ? JSON.parse(text) : null
    } catch {
      throw new Error('API 응답이 JSON 형식이 아닙니다. API Gateway URL 또는 배포 상태를 확인해주세요.')
    }
  }

  const loadData = useCallback(async () => {
    const token = window.localStorage.getItem('smilecad_token')

    if (!token) {
      router.replace('/login?force=1')
      return
    }

    try {
      setLoading(true)
      setErrorMessage('')
      setMessage('')

      const res = await fetch(LIST_INQUIRIES_API_URL, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      })

      const data = await readJsonSafely(res)

      if (res.status === 401) {
        window.localStorage.removeItem('smilecad_token')
        window.localStorage.removeItem('smilecad_user')
        router.replace('/login?force=1')
        return
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '문의 목록을 불러오지 못했습니다.')
      }

      const role = String(data.role || 'clinic').toLowerCase()
      setUserRole(role)
      setScope(data.scope === 'all' ? 'all' : 'mine')

      const nextItems: InquiryItem[] = (data.inquiries || data.items || [])
        .map(normalizeInquiryItem)
        .filter((item: InquiryItem) => item.id)

      setItems(nextItems)

      if (nextItems.length > 0) {
        const currentSelectedId = selectedIdRef.current

        const firstId =
          currentSelectedId && nextItems.some((item) => item.id === currentSelectedId)
            ? currentSelectedId
            : nextItems[0].id

        setSelectedId(firstId)

        const selected = nextItems.find((item) => item.id === firstId)
        setReplyText(selected?.admin_reply || '')
      } else {
        setSelectedId('')
        setReplyText('')
      }
    } catch (err) {
      console.error(err)
      setUserRole(null)
      setScope(null)
      setItems([])
      setSelectedId('')
      setReplyText('')
      setErrorMessage(err instanceof Error ? err.message : '문의 목록 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === selectedId) || null
  }, [items, selectedId])

  useEffect(() => {
    setReplyText(selectedItem?.admin_reply || '')
  }, [selectedItem])

  const handleReplySubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!isAdmin) {
      setErrorMessage('관리자만 답변을 저장할 수 있습니다.')
      return
    }

    const token = window.localStorage.getItem('smilecad_token')

    if (!token) {
      router.replace('/login?force=1')
      return
    }

    if (!selectedItem) {
      setErrorMessage('문의를 선택해주세요.')
      return
    }

    if (!replyText.trim()) {
      setErrorMessage('답변 내용을 입력해주세요.')
      return
    }

    try {
      setSubmitting(true)
      setErrorMessage('')
      setMessage('')

      const res = await fetch(REPLY_INQUIRY_API_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          inquiryId: selectedItem.id,
          adminReply: replyText.trim(),
        }),
      })

      const data = await readJsonSafely(res)

      if (res.status === 401) {
        window.localStorage.removeItem('smilecad_token')
        window.localStorage.removeItem('smilecad_user')
        router.replace('/login?force=1')
        return
      }

      if (res.status === 403) {
        setErrorMessage(data?.error || '관리자만 답변을 저장할 수 있습니다.')
        return
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '답변 저장에 실패했습니다.')
      }

      setMessage('답변이 저장되었습니다.')
      await loadData()
    } catch (err) {
      console.error(err)
      setErrorMessage(err instanceof Error ? err.message : '답변 저장 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f3f5f9] px-6 py-10">
        <div className="mx-auto w-full max-w-[1480px]">
          <AppTopNav current="inquiries" />

          <div className="rounded-[28px] border border-[#d9e0ea] bg-white px-8 py-10 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="text-[15px] font-semibold text-[#667085]">
              문의내역을 불러오는 중입니다...
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f3f5f9] px-6 py-10">
      <div className="mx-auto w-full max-w-[1480px]">
        <AppTopNav current="inquiries" />

        <section className="mb-6 rounded-[28px] border border-[#dce3ec] bg-white p-7 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[13px] font-black uppercase tracking-[0.22em] text-blue-500">
                SmileCAD Support
              </div>
              <h1 className="mt-2 text-[30px] font-black tracking-[-0.04em] text-[#111827]">
                문의내역
              </h1>
              <p className="mt-2 text-[14px] font-semibold text-[#667085]">
                {isAdmin
                  ? '관리자 계정으로 전체 치과 문의를 확인하고 답변할 수 있습니다.'
                  : '내 계정으로 등록한 문의와 관리자 답변을 확인할 수 있습니다.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={classNames(
                  'rounded-full px-4 py-2 text-[13px] font-black',
                  isAdmin
                    ? 'bg-slate-900 text-white'
                    : 'border border-blue-100 bg-blue-50 text-blue-700'
                )}
              >
                {isAdmin ? '관리자 모드' : '치과 계정'}
              </span>

              <span className="rounded-full border border-[#dce3ec] bg-[#f8fafc] px-4 py-2 text-[13px] font-black text-[#475467]">
                {scope === 'all' ? `전체 문의 ${items.length}건` : `내 문의 ${items.length}건`}
              </span>

              {!isAdmin ? (
                <button
                  type="button"
                  onClick={() => router.push('/inquiry')}
                  className="rounded-full bg-[#3b82f6] px-5 py-2 text-[13px] font-black text-white shadow-[0_10px_22px_rgba(59,130,246,0.24)]"
                >
                  문의 작성하기
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {message ? (
          <div className="mb-6 rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-6 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {userRole ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[430px_1fr]">
            <div className="overflow-hidden rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between border-b border-[#e9edf4] bg-[#f7f9fc] px-6 py-4">
                <div className="text-[17px] font-extrabold text-[#263142]">문의 목록</div>
                <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  총 {items.length}건
                </div>
              </div>

              <div className="p-4">
                {items.length === 0 ? (
                  <div className="rounded-[16px] border border-dashed border-[#d9e0ea] bg-[#fbfcfe] px-5 py-10 text-center text-[14px] text-[#98a2b3]">
                    {isAdmin ? '등록된 문의가 없습니다.' : '내 계정으로 등록한 문의가 없습니다.'}
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
                            {item.clinic_name || item.login_id || '-'} · {item.category || '일반 문의'}
                          </div>

                          <div className="mt-1 text-[12px] text-[#98a2b3]">
                            {formatDateTime(item.created_at)}
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

            <div className="space-y-6">
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
                    <div className="space-y-5">
                      <div className="rounded-[16px] border border-[#e4e8ef] bg-[#f9fbfd] p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[20px] font-extrabold text-[#1f2937]">
                            {selectedItem.title || '-'}
                          </div>
                          <StatusBadge status={selectedItem.status} />
                        </div>

                        <div className="mt-3 text-[13px] font-semibold text-[#98a2b3]">
                          {selectedItem.category || '일반 문의'} ·{' '}
                          {formatDateTime(selectedItem.created_at)}
                        </div>

                        <div className="mt-5 whitespace-pre-wrap text-[14px] leading-7 text-[#344054]">
                          {selectedItem.content || '-'}
                        </div>
                      </div>

                      {isAdmin ? (
                        <div className="rounded-[16px] border border-[#e4e8ef] bg-white p-5">
                          <div className="mb-3 text-[16px] font-extrabold text-[#263142]">
                            치과 정보
                          </div>

                          <div className="space-y-2 text-[14px] text-[#344054]">
                            <div>
                              <span className="font-bold text-[#98a2b3]">치과명:</span>{' '}
                              {selectedItem.clinic_name || '-'}
                            </div>

                            <div>
                              <span className="font-bold text-[#98a2b3]">로그인 ID:</span>{' '}
                              {selectedItem.login_id || '-'}
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
                      ) : null}

                      <div
                        className={classNames(
                          'rounded-[16px] border p-5',
                          selectedItem.admin_reply
                            ? 'border-emerald-100 bg-emerald-50'
                            : 'border-[#e4e8ef] bg-white'
                        )}
                      >
                        <div
                          className={classNames(
                            'mb-3 text-[16px] font-extrabold',
                            selectedItem.admin_reply ? 'text-emerald-800' : 'text-[#263142]'
                          )}
                        >
                          관리자 답변
                        </div>

                        {selectedItem.admin_reply ? (
                          <>
                            <div className="whitespace-pre-wrap text-[14px] leading-7 text-emerald-900">
                              {selectedItem.admin_reply}
                            </div>
                            {selectedItem.replied_at ? (
                              <div className="mt-3 text-[12px] font-semibold text-emerald-700">
                                답변일: {formatDateTime(selectedItem.replied_at)}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <div className="text-[14px] font-semibold text-[#98a2b3]">
                            아직 등록된 답변이 없습니다.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isAdmin ? (
                <div className="overflow-hidden rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <div className="border-b border-[#e9edf4] bg-[#f7f9fc] px-6 py-4 text-[17px] font-extrabold text-[#263142]">
                    답변 작성
                  </div>

                  <form onSubmit={handleReplySubmit} className="p-6">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="문의에 대한 답변을 입력해주세요."
                      className="min-h-[220px] w-full resize-none rounded-[14px] border border-[#d6dde8] bg-white p-4 text-[14px] text-[#344054] outline-none transition placeholder:text-[#9aa4b2] focus:border-[#9db7ff] focus:shadow-[0_0_0_4px_rgba(36,85,255,0.08)]"
                    />

                    {selectedItem?.replied_at ? (
                      <div className="mt-3 text-[12px] font-semibold text-[#98a2b3]">
                        마지막 답변 저장: {formatDateTime(selectedItem.replied_at)}
                      </div>
                    ) : null}

                    <div className="mt-5 flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting || !selectedItem}
                        className="rounded-[14px] bg-[#3b82f6] px-6 py-3 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(59,130,246,0.24)] transition hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting ? '저장 중...' : '답변 저장'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-red-100 bg-white p-10 text-center shadow-sm">
            <div className="text-[18px] font-black text-red-600">
              문의내역을 불러오지 못했습니다.
            </div>

            <div className="mt-3 text-[14px] font-semibold text-[#667085]">
              로그인 상태 또는 API 연결 상태를 확인해주세요.
            </div>

            <button
              type="button"
              onClick={loadData}
              className="mt-6 rounded-[14px] bg-[#3b82f6] px-6 py-3 text-[15px] font-bold text-white"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </main>
  )
}