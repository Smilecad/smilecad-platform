'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

type ConfirmationStatus = 'pending' | 'confirmed' | 'revision_requested' | string

type ConfirmationData = {
  confirmation_id?: number
  confirmationId?: number
  order_id?: number
  orderId?: number
  clinic_name?: string
  clinicName?: string
  patient_name?: string
  patientName?: string
  status?: ConfirmationStatus
  revision_note?: string | null
  revisionNote?: string | null
  created_at?: string
  createdAt?: string
  responded_at?: string | null
  respondedAt?: string | null
  expires_at?: string
  expiresAt?: string
  image_url?: string | null
  imageUrl?: string | null
  image_error?: string | null
  imageError?: string | null
  image_expires_seconds?: number
  imageExpiresSeconds?: number
}

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

function getStatusLabel(status?: ConfirmationStatus) {
  if (status === 'pending') return '확인 대기'
  if (status === 'confirmed') return '디자인 확정'
  if (status === 'revision_requested') return '수정 요청됨'

  return status || '-'
}

function getStatusDescription(status?: ConfirmationStatus) {
  if (status === 'pending') {
    return '디자인 확인하신 뒤 확정 또는 수정 요청을 선택해주세요.'
  }

  if (status === 'confirmed') {
    return '이미 디자인 확정이 완료된 확인서입니다.'
  }

  if (status === 'revision_requested') {
    return '이미 수정 요청이 접수된 확인서입니다.'
  }

  return ''
}

export default function ConfirmPage() {
  const params = useParams()
  const token = useMemo(() => String(params?.token || '').trim(), [params])

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<ConfirmationData | null>(null)
  const [revisionNote, setRevisionNote] = useState('')
  const [submitMessage, setSubmitMessage] = useState('')

  const getConfirmationUrl =
    process.env.NEXT_PUBLIC_NCP_GET_CONFIRMATION_API_URL ||
    'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/get-confirmation'

  const respondConfirmationUrl =
    process.env.NEXT_PUBLIC_NCP_RESPOND_CONFIRMATION_API_URL ||
    'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/respond-confirmation'

  async function loadConfirmation() {
    if (!token) {
      setError('확인 링크가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    if (!getConfirmationUrl) {
      setError('확인서 조회 API 주소가 설정되지 않았습니다.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await fetch(getConfirmationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || '확인서를 불러오지 못했습니다.')
      }

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '확인서를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function submitResponse(action: 'approved' | 'revision_requested') {
    if (!respondConfirmationUrl) {
      setError('확인서 응답 API 주소가 설정되지 않았습니다.')
      return
    }

    if (action === 'revision_requested' && !revisionNote.trim()) {
      setError('수정 요청 내용을 입력해 주세요.')
      return
    }

    const confirmMessage =
      action === 'approved'
        ? '디자인을 확정하시겠습니까? 확정 후에는 수정 요청으로 변경할 수 없습니다.'
        : '수정 요청을 접수하시겠습니까?'

    if (!window.confirm(confirmMessage)) return

    try {
      setSubmitting(true)
      setError('')
      setSubmitMessage('')

      const response = await fetch(respondConfirmationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          action,
          revision_note: action === 'revision_requested' ? revisionNote.trim() : undefined,
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || '응답 처리에 실패했습니다.')
      }

      setSubmitMessage(result.message || '처리되었습니다.')

      await loadConfirmation()
    } catch (err) {
      setError(err instanceof Error ? err.message : '응답 처리에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    loadConfirmation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const status = data?.status
  const imageUrl = data?.image_url || data?.imageUrl || null
  const imageError = data?.image_error || data?.imageError || null
  const clinicName = data?.clinic_name || data?.clinicName || '-'
  const patientName = data?.patient_name || data?.patientName || '-'
  const orderId = data?.order_id || data?.orderId || '-'
  const revisionNoteSaved = data?.revision_note || data?.revisionNote || null
  const respondedAt = data?.responded_at || data?.respondedAt || null
  const expiresAt = data?.expires_at || data?.expiresAt || null

  const isPending = status === 'pending'

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-2 text-sm font-semibold text-blue-600">NT-Tainer 디자인 확인서</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            디자인 확인 부탁드립니다.
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            디자인 확인하신 뒤 확정 또는 수정 요청을 선택해주세요.
          </p>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-8 text-center text-slate-600 shadow-sm ring-1 ring-slate-200">
            확인서를 불러오는 중입니다.
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-red-200">
            <div className="text-lg font-bold text-red-600">확인할 수 없습니다</div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{error}</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-500">주문번호</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">#{orderId}</div>
                </div>

                <div
                  className={[
                    'inline-flex rounded-full px-4 py-2 text-sm font-bold',
                    status === 'pending'
                      ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                      : status === 'confirmed'
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
                  ].join(' ')}
                >
                  {getStatusLabel(status)}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold text-slate-500">치과명</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{clinicName}</div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold text-slate-500">환자명</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{patientName}</div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold text-slate-500">응답 시각</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {formatDateTime(respondedAt)}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold text-slate-500">링크 만료</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {formatDateTime(expiresAt)}
                  </div>
                </div>
              </div>

              <p className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                {getStatusDescription(status)}
              </p>

              {revisionNoteSaved ? (
                <div className="mt-5 rounded-2xl bg-rose-50 p-4">
                  <div className="text-sm font-bold text-rose-700">수정 요청 내용</div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-rose-900">
                    {revisionNoteSaved}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">디자인 확인서 이미지</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    이미지는 보안 URL로 표시되며 일정 시간이 지나면 만료됩니다.
                  </p>
                </div>
              </div>

              {imageUrl ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="디자인 확인서"
                    className="mx-auto max-h-[720px] w-full object-contain"
                  />
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-600">
                  디자인 확인서 이미지를 불러오지 못했습니다.
                  {imageError ? (
                    <div className="mt-2 text-xs text-red-600">{imageError}</div>
                  ) : null}
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-bold text-slate-900">확인 결과 선택</h2>

              {isPending ? (
                <div className="mt-5 space-y-4">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => submitResponse('approved')}
                    className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-base font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    디자인 확정
                  </button>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <label className="text-sm font-bold text-slate-800">
                      수정 요청 내용
                    </label>
                    <textarea
                      value={revisionNote}
                      onChange={(event) => setRevisionNote(event.target.value)}
                      placeholder="수정이 필요한 내용을 입력해 주세요."
                      rows={5}
                      className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submitResponse('revision_requested')}
                      className="mt-3 w-full rounded-2xl bg-slate-900 px-5 py-4 text-base font-bold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      수정 요청 보내기
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-700">
                  이미 처리된 확인서입니다. 추가 응답은 할 수 없습니다.
                </div>
              )}

              {submitMessage ? (
                <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                  {submitMessage}
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </main>
  )
}