// app/inquiry/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppTopNav from '@/app/components/AppTopNav'

const CREATE_INQUIRY_API_URL =
  process.env.NEXT_PUBLIC_NCP_CREATE_INQUIRY_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/create-inquiry'

const DEFAULT_INQUIRY_ERROR =
  '문의 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요. 문제가 반복되면 스마일캐드에 문의해주세요.'

function isTechnicalErrorMessage(message: string) {
  const value = message.toLowerCase()

  const technicalKeywords = [
    'failed to fetch',
    'networkerror',
    'cors',
    'access-control',
    'column',
    'relation',
    'constraint',
    'violates',
    'not-null',
    'null value',
    'syntax error',
    'jwt_secret',
    'object storage',
    'access key',
    'secret key',
    '환경변수',
    'statuscode',
    '상태코드',
    'internal server error',
    'bad gateway',
    'gateway',
    'unexpected token',
    'json',
    'database',
    'db_',
    'postgres',
    'sql',
    'api gateway',
    '토큰 서명',
  ]

  return technicalKeywords.some((keyword) => value.includes(keyword))
}

function toSafeUserMessage(error: unknown, fallback = DEFAULT_INQUIRY_ERROR) {
  const message = error instanceof Error ? error.message : String(error || '')

  if (!message) return fallback

  const safeMessages = [
    '제목과 내용을 모두 작성해주세요.',
    '문의 유형을 선택해주세요.',
    '제목을 입력해주세요.',
    '상세 내용을 입력해주세요.',
    '인증 토큰이 필요합니다.',
    '토큰이 만료되었습니다.',
    '로그인 정보가 없습니다. 다시 로그인해주세요.',
  ]

  if (safeMessages.some((safeMessage) => message.includes(safeMessage))) {
    return message
  }

  if (isTechnicalErrorMessage(message)) {
    return fallback
  }

  return fallback
}

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
    } catch (error) {
      console.error('create-inquiry JSON 파싱 실패:', {
        status: res.status,
        text,
        error,
      })

      throw new Error('API 응답을 처리할 수 없습니다.')
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
        console.error('create-inquiry 응답 오류:', data)
        throw new Error(data?.error || DEFAULT_INQUIRY_ERROR)
      }

      alert('문의가 성공적으로 접수되었습니다. 담당자가 확인 후 답변 드리겠습니다.')
      router.push('/inquiries')
    } catch (error) {
      console.error('문의 접수 실패:', error)
      alert(toSafeUserMessage(error, DEFAULT_INQUIRY_ERROR))
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