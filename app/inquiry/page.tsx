// app/inquiry/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppTopNav from '@/app/components/AppTopNav'

const CREATE_INQUIRY_API_URL =
  process.env.NEXT_PUBLIC_NCP_CREATE_INQUIRY_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/create-inquiry'

export default function InquiryPage() {
  const router = useRouter()

  const [pageLoading, setPageLoading] = useState(true)
  const [category, setCategory] = useState('시스템 및 오류 문의')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const token = window.localStorage.getItem('smilecad_token')

    if (!token) {
      router.replace('/login?force=1')
      return
    }

    setPageLoading(false)
  }, [router])

  const readJsonSafely = async (res: Response) => {
    const text = await res.text()

    try {
      return text ? JSON.parse(text) : null
    } catch {
      throw new Error('API 응답이 JSON 형식이 아닙니다. API Gateway URL 또는 배포 상태를 확인해주세요.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const token = window.localStorage.getItem('smilecad_token')

    if (!token) {
      router.replace('/login?force=1')
      return
    }

    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 작성해주세요.')
      return
    }

    try {
      setIsSubmitting(true)

      const res = await fetch(CREATE_INQUIRY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          title: title.trim(),
          content: content.trim(),
        }),
      })

      if (res.status === 401 || res.status === 403) {
        window.localStorage.removeItem('smilecad_token')
        window.localStorage.removeItem('smilecad_user')
        router.replace('/login?force=1')
        return
      }

      const data = await readJsonSafely(res)

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '문의 접수에 실패했습니다.')
      }

      alert('문의가 성공적으로 접수되었습니다. 담당자가 확인 후 답변 드리겠습니다.')
      router.push('/inquiries')
    } catch (error) {
      alert(error instanceof Error ? error.message : '네트워크 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        불러오는 중...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f3f5f9] px-6 py-10">
      <div className="mx-auto w-full max-w-[1000px]">
        <AppTopNav current="inquiry" />

        <div className="mb-8">
          <div className="text-[30px] font-extrabold tracking-tight text-[#1f2937]">
            문의하기
          </div>
          <div className="mt-2 text-[14px] text-[#98a2b3]">
            시스템, 주문, 결제 등 궁금하신 점이나 불편한 점을 남겨주시면 신속하게 답변해 드립니다.
          </div>
        </div>

        <div className="rounded-[28px] border border-[#d9e0ea] bg-white p-10 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <label className="text-[14px] font-black text-[#1e293b]">
                문의 유형 <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3.5 text-[15px] font-bold text-[#475467] outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 md:w-1/2"
              >
                <option value="시스템 및 오류 문의">시스템 및 오류 문의</option>
                <option value="주문 및 배송 관련">주문 및 배송 관련</option>
                <option value="결제 및 정산 관련">결제 및 정산 관련</option>
                <option value="기타 문의">기타 문의</option>
              </select>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[14px] font-black text-[#1e293b]">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="문의하실 내용의 제목을 입력해주세요."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3.5 text-[15px] font-bold text-[#1f2937] outline-none transition placeholder:font-medium placeholder:text-[#94a3b8] focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[14px] font-black text-[#1e293b]">
                상세 내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="답변에 필요한 상세 정보를 구체적으로 적어주시면 더욱 빠르고 정확한 처리가 가능합니다."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="w-full resize-none rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] p-4 text-[15px] font-medium text-[#1f2937] outline-none transition placeholder:text-[#94a3b8] focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`rounded-[14px] bg-[#3b82f6] px-10 py-4 text-[16px] font-black text-white transition ${
                  isSubmitting
                    ? 'cursor-not-allowed opacity-50'
                    : 'shadow-[0_10px_24px_rgba(59,130,246,0.24)] hover:bg-[#2563eb]'
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