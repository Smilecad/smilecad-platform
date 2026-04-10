'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppTopNav from '@/app/components/AppTopNav'

const supabase = createClient()

type ProfileRow = {
  id: string
  role: string
  clinic_name: string | null
  clinic_address: string | null
  clinic_phone: string | null
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="border-b border-[#e9edf4] bg-[#f7f9fc] px-6 py-4 text-[17px] font-extrabold text-[#263142]">
      {title}
    </div>
  )
}

function FieldLabel({
  required = false,
  children,
}: {
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="mb-2 text-[14px] font-bold text-[#4b5565]">
      {required && <span className="mr-1 text-[#ef6b5a]">*</span>}
      {children}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder = '',
  disabled = false,
  readOnly = false,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      className={classNames(
        'h-12 w-full rounded-[12px] border border-[#d6dde8] bg-white px-4 text-[14px] text-[#344054] outline-none transition placeholder:text-[#9aa4b2] focus:border-[#9db7ff] focus:shadow-[0_0_0_4px_rgba(36,85,255,0.08)]',
        (disabled || readOnly) && 'bg-[#f8fafc] text-[#667085]'
      )}
    />
  )
}

export default function InquiryPage() {
  const router = useRouter()

  const [pageLoading, setPageLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [message, setMessage] = useState('')

  const [profile, setProfile] = useState<ProfileRow | null>(null)

  const [category, setCategory] = useState('일반 문의')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    const loadPage = async () => {
      try {
        setPageLoading(true)
        setErrorMessage('')
        setMessage('')

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          router.replace('/login')
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, clinic_name, clinic_address, clinic_phone')
          .eq('id', user.id)
          .single()

        if (profileError || !profileData) {
          throw new Error('프로필 정보를 불러오지 못했습니다.')
        }

        setProfile(profileData as ProfileRow)
      } catch (err) {
        console.error(err)
        setErrorMessage(err instanceof Error ? err.message : '페이지 로딩 중 오류가 발생했습니다.')
      } finally {
        setPageLoading(false)
      }
    }

    loadPage()
  }, [router])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setMessage('')

    if (!title.trim()) {
      setErrorMessage('문의 제목을 입력해주세요.')
      return
    }

    if (!content.trim()) {
      setErrorMessage('문의 내용을 입력해주세요.')
      return
    }

    if (!profile) {
      setErrorMessage('프로필 정보를 확인할 수 없습니다.')
      return
    }

    try {
      setSubmitting(true)

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        throw new Error('로그인 토큰을 확인할 수 없습니다. 다시 로그인해주세요.')
      }

      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          category,
          title: title.trim(),
          content: content.trim(),
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || '문의 등록에 실패했습니다.')
      }

      setTitle('')
      setContent('')
      setCategory('일반 문의')
      setMessage('문의가 정상적으로 접수되었습니다.')
    } catch (err) {
      console.error(err)
      setErrorMessage(err instanceof Error ? err.message : '문의 접수 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-[#f3f5f9] px-6 py-10">
        <div className="mx-auto w-full max-w-[1180px]">
          <div className="rounded-[28px] border border-[#d9e0ea] bg-white px-8 py-10 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="text-[15px] font-semibold text-[#667085]">문의 페이지를 불러오는 중입니다...</div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f3f5f9] px-6 py-10">
      <div className="mx-auto w-full max-w-[1180px]">
        <AppTopNav current="inquiry" />

        <div className="overflow-hidden rounded-[28px] border border-[#d9e0ea] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[#e8edf5] bg-[#fbfcfe] px-8 py-6">
            <div className="text-[30px] font-extrabold tracking-tight text-[#1f2937]">문의하기</div>
            <div className="mt-2 text-[14px] text-[#98a2b3]">
              문의 내용을 남겨주시면 확인 후 답변드리겠습니다.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-[360px_1fr] gap-6 p-8">
            <div className="overflow-hidden rounded-[22px] border border-[#e1e7ef] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <SectionTitle title="기본 정보" />

              <div className="space-y-5 p-6">
                <div>
                  <FieldLabel>치과명</FieldLabel>
                  <TextInput
                    value={profile?.clinic_name || ''}
                    onChange={() => {}}
                    readOnly
                  />
                </div>

                <div>
                  <FieldLabel>치과 주소</FieldLabel>
                  <textarea
                    value={profile?.clinic_address || ''}
                    readOnly
                    className="min-h-[90px] w-full resize-none rounded-[14px] border border-[#d6dde8] bg-[#f8fafc] p-4 text-[14px] text-[#667085] outline-none"
                  />
                </div>

                <div>
                  <FieldLabel>연락처</FieldLabel>
                  <TextInput
                    value={profile?.clinic_phone || ''}
                    onChange={() => {}}
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <SectionTitle title="문의 내용" />

              <div className="space-y-5 p-6">
                <div>
                  <FieldLabel required>문의 유형</FieldLabel>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-12 w-full rounded-[12px] border border-[#d6dde8] bg-white px-4 text-[14px] text-[#344054] outline-none transition focus:border-[#9db7ff] focus:shadow-[0_0_0_4px_rgba(36,85,255,0.08)]"
                  >
                    <option value="일반 문의">일반 문의</option>
                    <option value="주문 문의">주문 문의</option>
                    <option value="결제 문의">결제 문의</option>
                    <option value="배송 문의">배송 문의</option>
                    <option value="시스템 오류">시스템 오류</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div>
                  <FieldLabel required>문의 제목</FieldLabel>
                  <TextInput
                    value={title}
                    onChange={setTitle}
                    placeholder="문의 제목을 입력해주세요."
                  />
                </div>

                <div>
                  <FieldLabel required>문의 내용</FieldLabel>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="문의 내용을 자세히 입력해주세요."
                    className="min-h-[280px] w-full resize-none rounded-[14px] border border-[#d6dde8] bg-white p-4 text-[14px] text-[#344054] outline-none transition placeholder:text-[#9aa4b2] focus:border-[#9db7ff] focus:shadow-[0_0_0_4px_rgba(36,85,255,0.08)]"
                  />
                </div>

                {message ? (
                  <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    {message}
                  </div>
                ) : null}

                {errorMessage ? (
                  <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {errorMessage}
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-[14px] bg-[#3b82f6] px-6 py-3 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(59,130,246,0.24)] transition hover:bg-[#2563eb] disabled:opacity-60"
                  >
                    {submitting ? '접수 중...' : '문의 접수'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}