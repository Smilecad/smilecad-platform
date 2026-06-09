'use client'

import { useRouter } from 'next/navigation'

export default function InquiryPage() {
  const router = useRouter()

  const companyPhone = '010-8551-2875'
  const companyPhoneDigits = '01085512875'
  const kakaoId = 'edsdental'

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert(`${label}을(를) 복사했습니다.`)
    } catch {
      alert('복사에 실패했습니다. 직접 선택해서 복사해주세요.')
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 bg-white px-6 py-8 md:px-10 md:py-10">
          <p className="text-xs font-black uppercase tracking-[0.45em] text-blue-600">
            SmileCAD Contact
          </p>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900">
            문의하기
          </h1>

          <p className="mt-5 text-sm font-bold leading-7 text-slate-600 md:text-base">
            주문, 스캔 파일, 제작 일정, 수정 요청 관련 문의는 전화, 문자 또는
            카카오톡으로 문의 부탁드립니다.
          </p>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2 md:p-8">
          <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <span className="text-xl">☎</span>
            </div>

            <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900">
              전화 문의
            </h2>

            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              전화 또는 문자로 문의해주시면 확인 후 안내드리겠습니다.
            </p>

            <div className="mt-7 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <p className="text-3xl font-black tracking-tight text-blue-600">
                {companyPhone}
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <a
                href={`tel:${companyPhoneDigits}`}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                전화 문의
              </a>

              <a
                href={`sms:${companyPhoneDigits}`}
                className="rounded-2xl border border-blue-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-900 transition hover:bg-blue-50"
              >
                문자 문의
              </a>

              <button
                type="button"
                onClick={() => copyToClipboard(companyPhone, '회사 휴대폰 번호')}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                번호 복사
              </button>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-slate-950">
              <span className="text-xl">●</span>
            </div>

            <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900">
              카카오톡 문의
            </h2>

            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              카카오톡 친구 추가 후 문의 내용을 남겨주세요.
            </p>

            <div className="mt-7 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Kakaotalk ID
              </p>
              <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                {kakaoId}
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => copyToClipboard(kakaoId, '카카오톡 ID')}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800"
              >
                카톡 ID 복사
              </button>

              <button
                type="button"
                onClick={() => router.push('/orders')}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                주문 목록으로
              </button>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}