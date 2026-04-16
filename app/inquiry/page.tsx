// app/inquiry/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import AppTopNav from '@/app/components/AppTopNav'

export default function InquiryPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()

  // 입력값 상태 관리
  const [category, setCategory] = useState('시스템 및 오류 문의')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (sessionStatus === 'loading') {
    return <div className="flex min-h-screen items-center justify-center font-bold text-slate-500">로딩 중...</div>
  }

  if (sessionStatus === 'unauthenticated') {
    router.replace('/login')
    return null
  }

  // 🚀 제출 버튼을 눌렀을 때 실행되는 함수
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault() // 새로고침 방지

    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 작성해주세요.')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.user?.email,
          category,
          title,
          content
        })
      })

      if (res.ok) {
        alert('문의가 성공적으로 접수되었습니다. 담당자가 확인 후 답변 드리겠습니다.')
        // 등록 후 문의 내역 페이지로 이동 (임시로 대시보드로 이동)
        router.push('/dashboard') 
      } else {
        const data = await res.json()
        alert(data.error || '문의 접수에 실패했습니다.')
      }
    } catch (error) {
      alert('네트워크 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f5f9] px-6 py-10">
      <div className="mx-auto w-full max-w-[1000px]">
        <AppTopNav current="inquiry" />

        {/* 상단 헤더 영역 */}
        <div className="mb-8">
          <div className="text-[30px] font-extrabold tracking-tight text-[#1f2937]">
            문의하기
          </div>
          <div className="mt-2 text-[14px] text-[#98a2b3]">
            시스템, 주문, 결제 등 궁금하신 점이나 불편한 점을 남겨주시면 신속하게 답변해 드립니다.
          </div>
        </div>

        {/* 입력 폼 영역 */}
        <div className="rounded-[28px] border border-[#d9e0ea] bg-white p-10 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            
            {/* 1. 카테고리 선택 */}
            <div className="flex flex-col gap-3">
              <label className="text-[14px] font-black text-[#1e293b]">문의 유형 <span className="text-red-500">*</span></label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full md:w-1/2 rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3.5 text-[15px] font-bold text-[#475467] outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="시스템 및 오류 문의">시스템 및 오류 문의</option>
                <option value="주문 및 배송 관련">주문 및 배송 관련</option>
                <option value="결제 및 정산 관련">결제 및 정산 관련</option>
                <option value="기타 문의">기타 문의</option>
              </select>
            </div>

            {/* 2. 제목 입력 */}
            <div className="flex flex-col gap-3">
              <label className="text-[14px] font-black text-[#1e293b]">제목 <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="문의하실 내용의 제목을 입력해주세요."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3.5 text-[15px] font-bold text-[#1f2937] outline-none transition placeholder:font-medium placeholder:text-[#94a3b8] focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            {/* 3. 내용 입력 */}
            <div className="flex flex-col gap-3">
              <label className="text-[14px] font-black text-[#1e293b]">상세 내용 <span className="text-red-500">*</span></label>
              <textarea
                placeholder="답변에 필요한 상세 정보를 구체적으로 적어주시면 더욱 빠르고 정확한 처리가 가능합니다."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="w-full resize-none rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] p-4 text-[15px] font-medium text-[#1f2937] outline-none transition placeholder:text-[#94a3b8] focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            {/* 4. 제출 버튼 */}
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`rounded-[14px] bg-[#3b82f6] px-10 py-4 text-[16px] font-black text-white transition ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2563eb] shadow-[0_10px_24px_rgba(59,130,246,0.24)]'
                }`}
              >
                {isSubmitting ? '접수 중...' : '문의 등록하기'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </main>
  )
}