'use client'

import { useState } from 'react'

type ConfidenceLevel = 'high' | 'medium' | 'low'

type PreviewResult = {
  clinic_name?: string
  patient_name?: string
  gender?: string
  birth_date?: string
  product_type?: string
  due_date?: string
  phone?: string
  address?: string
  teeth?: string
  request_note?: string
  confidence?: {
    clinic_name?: ConfidenceLevel
    patient_name?: ConfidenceLevel
    due_date?: ConfidenceLevel
    product_type?: ConfidenceLevel
    teeth?: ConfidenceLevel
  }
}

export default function OrderImportPage() {
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<PreviewResult | null>(null)

  const handlePreview = async () => {
    if (!rawText.trim()) {
      setError('주문 내용을 먼저 붙여넣어주세요.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setResult(null)

      const res = await fetch('/api/order-import/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: rawText,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || '미리보기에 실패했습니다.')
      }

      setResult(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const badgeClass = (value?: ConfidenceLevel) => {
    if (value === 'high') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (value === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-slate-100 text-slate-600 border-slate-200'
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold tracking-[0.2em] text-blue-600">
            SMILECAD PLATFORM
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            주문 자동 초안 테스트
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            메일, 문자, 카카오톡, 구글드라이브 메모 등으로 받은 주문 내용을 그대로
            붙여넣으면 주문 초안을 자동으로 추출합니다.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                1. 원문 붙여넣기
              </h2>
              <button
                onClick={handlePreview}
                disabled={loading}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? '추출 중...' : '주문 정보 추출'}
              </button>
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`예시)
에스아치과
박희정 NT tainer
26.4.10일
13~23
33~43

또는

[스마일치과] 홍길동 환자
유지장치 제작 부탁드립니다.
금요일까지 부탁드립니다.
서울시 강남구 ...
010-1234-5678
`}
              className="mt-5 min-h-[420px] w-full rounded-2xl border border-slate-300 px-4 py-4 text-sm leading-7 outline-none transition focus:border-blue-500"
            />

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              2. 추출 결과 미리보기
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              자동으로 읽어낸 정보입니다. 정확하지 않으면 나중에 수정하는 방식으로
              발전시키면 됩니다.
            </p>

            {!result ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-sm text-slate-500">
                아직 추출 결과가 없습니다.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <PreviewField
                  label="치과명"
                  value={result.clinic_name}
                  confidence={result.confidence?.clinic_name}
                  badgeClass={badgeClass}
                />
                <PreviewField
                  label="환자명"
                  value={result.patient_name}
                  confidence={result.confidence?.patient_name}
                  badgeClass={badgeClass}
                />
                <PreviewField label="성별" value={result.gender} />
                <PreviewField label="생년월일" value={result.birth_date} />
                <PreviewField
                  label="제품명"
                  value={result.product_type}
                  confidence={result.confidence?.product_type}
                  badgeClass={badgeClass}
                />
                <PreviewField
                  label="납기일"
                  value={result.due_date}
                  confidence={result.confidence?.due_date}
                  badgeClass={badgeClass}
                />
                <PreviewField
                  label="치아"
                  value={result.teeth}
                  confidence={result.confidence?.teeth}
                  badgeClass={badgeClass}
                />
                <PreviewField label="전화번호" value={result.phone} />
                <PreviewField label="주소" value={result.address} />
                <PreviewField label="요청사항" value={result.request_note} multiline />
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function PreviewField({
  label,
  value,
  confidence,
  multiline = false,
  badgeClass,
}: {
  label: string
  value?: string
  confidence?: ConfidenceLevel
  multiline?: boolean
  badgeClass?: (value?: ConfidenceLevel) => string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        {confidence && badgeClass ? (
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(confidence)}`}
          >
            {confidence === 'high' ? '높음' : confidence === 'medium' ? '보통' : '낮음'}
          </span>
        ) : null}
      </div>

      <p
        className={`mt-2 text-sm font-semibold text-slate-900 ${
          multiline ? 'whitespace-pre-wrap leading-6' : ''
        }`}
      >
        {value || '-'}
      </p>
    </div>
  )
}