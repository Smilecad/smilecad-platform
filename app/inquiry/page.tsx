// app/inquiry/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import AppTopNav from '@/app/components/AppTopNav'

const COMPANY_MOBILE = '010-8551-2875'
const KAKAO_ID = 'edsdental'

export default function InquiryPage() {
  const router = useRouter()

  const phoneHref = `tel:${COMPANY_MOBILE.replace(/-/g, '')}`
  const smsHref = `sms:${COMPANY_MOBILE.replace(/-/g, '')}`

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      alert(`${label}이 복사되었습니다. 해당 연락처로 문의 부탁드립니다.`)
    } catch {
      alert(`${label}: ${value}`)
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f5f9] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[1180px]">
        <AppTopNav current="inquiry" />

        <section className="overflow-hidden rounded-[30px] border border-[#d9e0ea] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[#e5eaf2] bg-gradient-to-br from-[#eff6ff] to-white px-6 py-8 sm:px-10 sm:py-10">
            <div className="mb-3 text-[13px] font-black uppercase tracking-[0.32em] text-[#2563eb]">
              SMILECAD CONTACT
            </div>

            <h1 className="text-[30px] font-black tracking-tight text-[#111827] sm:text-[40px]">
              문의하기
            </h1>

            <p className="mt-4 max-w-[760px] text-[15px] font-semibold leading-relaxed text-[#64748b]">
              주문, 스캔 파일, 제작 일정, 수정 요청 관련 문의는 확인이 빠른 회사 휴대폰 문자
              또는 카카오톡으로 문의 부탁드립니다.
            </p>
          </div>

          <div className="grid gap-5 p-6 sm:p-8 lg:grid-cols-2">
            <section className="rounded-[24px] border border-[#d9e0ea] bg-[#f8fafc] p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#2563eb] text-white">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                  <path
                    d="M7.5 4.5H10L11.3 8L9.7 9.3C10.7 11.2 12.2 12.7 14.1 13.7L15.4 12.1L18.9 13.4V15.9C18.9 17 18 17.9 16.9 17.9C10.9 17.9 5.5 12.5 5.5 6.5C5.5 5.4 6.4 4.5 7.5 4.5Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h2 className="text-[22px] font-black text-[#111827]">회사 휴대폰 문의</h2>

              <p className="mt-2 text-[14px] font-semibold leading-relaxed text-[#64748b]">
                문자 또는 전화로 문의해주시면 확인 후 안내드리겠습니다.
              </p>

              <div className="mt-6 rounded-[18px] bg-white p-5 text-[28px] font-black tracking-tight text-[#1d4ed8] shadow-sm">
                {COMPANY_MOBILE}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <a
                  href={phoneHref}
                  className="flex h-12 items-center justify-center rounded-[14px] bg-[#2563eb] text-[14px] font-black text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)] transition hover:bg-[#1d4ed8]"
                >
                  전화 문의
                </a>

                <a
                  href={smsHref}
                  className="flex h-12 items-center justify-center rounded-[14px] border border-[#bfdbfe] bg-white text-[14px] font-black text-[#2563eb] transition hover:bg-[#eff6ff]"
                >
                  문자 문의
                </a>

                <button
                  type="button"
                  onClick={() => copyText(COMPANY_MOBILE, '회사 휴대폰 번호')}
                  className="h-12 rounded-[14px] border border-[#e2e8f0] bg-white text-[14px] font-black text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#111827]"
                >
                  번호 복사
                </button>
              </div>
            </section>

            <section className="rounded-[24px] border border-[#d9e0ea] bg-[#f8fafc] p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#facc15] text-[#111827]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                  <path
                    d="M12 5C7.6 5 4 7.8 4 11.2C4 13.4 5.5 15.3 7.8 16.4L7.1 19L10.2 17.2C10.8 17.3 11.4 17.4 12 17.4C16.4 17.4 20 14.6 20 11.2C20 7.8 16.4 5 12 5Z"
                    fill="currentColor"
                  />
                </svg>
              </div>

              <h2 className="text-[22px] font-black text-[#111827]">카카오톡 문의</h2>

              <p className="mt-2 text-[14px] font-semibold leading-relaxed text-[#64748b]">
                카카오톡 친구 추가 후 문의 내용을 남겨주세요. 주문 관련 문의는 주문번호,
                치과명, 환자명을 함께 남겨주시면 더 빠르게 확인할 수 있습니다.
              </p>

              <div className="mt-6 rounded-[18px] bg-white p-5 shadow-sm">
                <div className="text-[12px] font-black uppercase tracking-[0.2em] text-[#94a3b8]">
                  KakaoTalk ID
                </div>
                <div className="mt-2 text-[28px] font-black tracking-tight text-[#111827]">
                  {KAKAO_ID}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => copyText(KAKAO_ID, '카카오톡 아이디')}
                  className="h-12 rounded-[14px] bg-[#111827] text-[14px] font-black text-white shadow-[0_10px_22px_rgba(15,23,42,0.18)] transition hover:bg-[#0f172a]"
                >
                  카톡 ID 복사
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/orders')}
                  className="h-12 rounded-[14px] border border-[#e2e8f0] bg-white text-[14px] font-black text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#111827]"
                >
                  주문 목록으로
                </button>
              </div>
            </section>
          </div>

          <div className="border-t border-[#e5eaf2] bg-[#f8fafc] px-6 py-5 sm:px-8">
            <div className="rounded-[18px] border border-[#dbeafe] bg-[#eff6ff] p-5">
              <h3 className="text-[15px] font-black text-[#1d4ed8]">
                문의 시 함께 알려주시면 좋은 정보
              </h3>

              <div className="mt-3 grid gap-2 text-[14px] font-semibold text-[#475467] sm:grid-cols-2">
                <div>• 치과명</div>
                <div>• 주문번호</div>
                <div>• 환자명</div>
                <div>• 문의 내용 또는 수정 요청사항</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}