'use client'

import AppTopNav from '@/app/components/AppTopNav'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-[#f3f5f9] px-6 py-10">
      <div className="mx-auto w-full max-w-[1480px]">
        <AppTopNav current="dashboard" />

        <div className="rounded-[28px] border border-[#d9e0ea] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[#e8edf5] bg-[#fbfcfe] px-8 py-6">
            <div className="text-[30px] font-extrabold tracking-tight text-[#1f2937]">
              대시보드
            </div>
            <div className="mt-2 text-[14px] text-[#98a2b3]">
              원하는 메뉴를 선택해서 이동하세요.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 p-8 md:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => router.push('/orders')}
              className="rounded-[22px] border border-[#dce3ec] bg-white p-6 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
            >
              <div className="text-[20px] font-extrabold text-[#1f2937]">주문 목록</div>
              <div className="mt-2 text-[14px] leading-6 text-[#667085]">
                접수된 주문과 진행 상태를 확인합니다.
              </div>
            </button>

            <button
              type="button"
              onClick={() => router.push('/orders/new')}
              className="rounded-[22px] border border-[#dce3ec] bg-white p-6 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
            >
              <div className="text-[20px] font-extrabold text-[#1f2937]">주문 접수</div>
              <div className="mt-2 text-[14px] leading-6 text-[#667085]">
                새 교정유지장치 주문을 등록합니다.
              </div>
            </button>

            <button
              type="button"
              onClick={() => router.push('/inquiry')}
              className="rounded-[22px] border border-[#dce3ec] bg-white p-6 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
            >
              <div className="text-[20px] font-extrabold text-[#1f2937]">문의하기</div>
              <div className="mt-2 text-[14px] leading-6 text-[#667085]">
                시스템, 주문, 결제 관련 문의를 남길 수 있습니다.
              </div>
            </button>

            <button
              type="button"
              onClick={() => router.push('/inquiry/history')}
              className="rounded-[22px] border border-[#dce3ec] bg-white p-6 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
            >
              <div className="text-[20px] font-extrabold text-[#1f2937]">문의내역</div>
              <div className="mt-2 text-[14px] leading-6 text-[#667085]">
                내가 남긴 문의와 답변 상태를 확인합니다.
              </div>
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}