// app/inquiries/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import AppTopNav from '@/app/components/AppTopNav'

export default function InquiriesPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()

  const [inquiries, setInquiries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('clinic')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 답변 입력을 위한 상태
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchInquiries = async () => {
    if (!session?.user?.email) return
    try {
      setLoading(true)
      const res = await fetch(`/api/inquiries?email=${session?.user?.email}`)
      const data = await res.json()
      if (res.ok) {
        setInquiries(data.inquiries || [])
        setUserRole(data.role || 'clinic')
      }
    } catch (err) {
      console.error("데이터 로드 실패:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchInquiries()
    } else if (sessionStatus === 'unauthenticated') {
      router.replace('/login')
    }
  }, [sessionStatus])

  const toggleExpand = (id: string, currentReply: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setReplyText('')
    } else {
      setExpandedId(id)
      setReplyText(currentReply || '') // 기존 답변이 있으면 불러오기
    }
  }

  // 🚀 답변 등록 함수
  const handleReplySubmit = async (inquiryId: string) => {
    if (!replyText.trim()) return alert('답변 내용을 입력해주세요.')

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/inquiries/reply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryId, adminReply: replyText })
      })

      if (res.ok) {
        alert('답변이 등록되었습니다.')
        fetchInquiries() // 목록 새로고침
      } else {
        alert('답변 등록에 실패했습니다.')
      }
    } catch (err) {
      alert('오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (sessionStatus === 'loading' || loading) {
    return <div className="flex min-h-screen items-center justify-center font-bold text-slate-500 text-lg">데이터를 불러오는 중입니다...</div>
  }

  return (
    <main className="min-h-screen bg-[#f3f5f9] px-6 py-10">
      <div className="mx-auto w-full max-w-[1200px]">
        <AppTopNav current="inquiries" />

        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="text-[30px] font-extrabold tracking-tight text-[#1f2937]">
              {userRole === 'admin' ? '전체 문의 관리 (관리자)' : '나의 문의 내역'}
            </div>
            <div className="mt-2 text-[14px] text-[#98a2b3]">
              {userRole === 'admin' 
                ? '치과에서 접수한 모든 문의를 확인하고 답변을 등록합니다.' 
                : '접수하신 문의와 답변 상태를 확인하실 수 있습니다.'}
            </div>
          </div>
          {userRole !== 'admin' && (
            <button
              onClick={() => router.push('/inquiry')}
              className="rounded-[14px] bg-[#3b82f6] px-6 py-3 text-[15px] font-bold text-white shadow-lg transition hover:bg-[#2563eb]"
            >
              + 새 문의하기
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-[28px] border border-[#d9e0ea] bg-white shadow-sm">
          {inquiries.length === 0 ? (
            <div className="py-20 text-center text-[15px] font-semibold text-[#98a2b3]">내역이 없습니다.</div>
          ) : (
            <div className="flex flex-col">
              {inquiries.map((inq) => (
                <div key={inq.id} className="border-b border-[#eef2f6] last:border-none">
                  
                  <div 
                    onClick={() => toggleExpand(inq.id, inq.admin_reply)}
                    className="flex cursor-pointer items-center justify-between p-6 transition hover:bg-[#f8fafc]"
                  >
                    <div className="flex items-center gap-5">
                      <span className={`flex w-[85px] shrink-0 items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-black ${
                        inq.status === '답변 완료' ? 'bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]' : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {inq.status}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[16px] font-extrabold text-[#1f2937]">{inq.title}</span>
                        <div className="mt-1 flex items-center gap-3 text-[12px] font-bold text-[#98a2b3]">
                          <span>{inq.category}</span>
                          {userRole === 'admin' && (
                            <span className="text-blue-500">| {inq.clinic_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-slate-400">
                      <svg className={`h-5 w-5 transition-transform ${expandedId === inq.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {expandedId === inq.id && (
                    <div className="bg-[#f8fafc] p-8 border-t border-[#eef2f6] space-y-6">
                      {/* 질문 내용 */}
                      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-slate-800 text-[12px] font-bold text-white flex items-center justify-center">Q</span>
                          <span className="text-[14px] font-black text-slate-800">문의 내용</span>
                        </div>
                        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#475467]">{inq.content}</p>
                      </div>

                      {/* 답변 영역 */}
                      <div className="rounded-2xl bg-blue-50/50 p-6 border border-blue-100">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-blue-600 text-[12px] font-bold text-white flex items-center justify-center">A</span>
                          <span className="text-[14px] font-black text-blue-800">관리자 답변</span>
                        </div>

                        {userRole === 'admin' ? (
                          /* 🛠️ 관리자: 답변 작성 칸 표시 */
                          <div className="space-y-4">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="답변 내용을 입력해주세요."
                              className="w-full min-h-[120px] rounded-xl border border-blue-200 bg-white p-4 text-[14px] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition"
                            />
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleReplySubmit(inq.id)}
                                disabled={isSubmitting}
                                className="rounded-xl bg-blue-600 px-6 py-2.5 text-[14px] font-black text-white hover:bg-blue-700 transition disabled:opacity-50"
                              >
                                {inq.admin_reply ? '답변 수정하기' : '답변 등록하기'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* 🦷 치과: 답변 내용 표시 */
                          inq.admin_reply ? (
                            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-blue-900">{inq.admin_reply}</p>
                          ) : (
                            <p className="text-[14px] font-bold text-slate-400 text-center py-4 italic">아직 등록된 답변이 없습니다. 확인 중입니다.</p>
                          )
                        )}
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}