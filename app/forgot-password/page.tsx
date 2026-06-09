'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const REQUEST_PASSWORD_RESET_API_URL =
  process.env.NEXT_PUBLIC_NCP_REQUEST_PASSWORD_RESET_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/request-password-reset'

function formatPhoneForDisplay(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [loginId, setLoginId] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [resetUrl, setResetUrl] = useState('')

  const readJsonSafely = async (res: Response) => {
    const text = await res.text()

    try {
      return text ? JSON.parse(text) : null
    } catch {
      throw new Error('API 응답이 JSON 형식이 아닙니다. API Gateway URL 또는 배포 상태를 확인해주세요.')
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    setMessage('')
    setErrorMessage('')
    setResetUrl('')

    const normalizedLoginId = loginId.trim().toLowerCase()
    const normalizedPhone = phone.replace(/\D/g, '')

    if (!normalizedLoginId || !normalizedPhone) {
      setErrorMessage('아이디와 가입 휴대폰 번호를 입력해주세요.')
      return
    }

    try {
      setLoading(true)

      const res = await fetch(REQUEST_PASSWORD_RESET_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loginId: normalizedLoginId,
          phone: normalizedPhone,
        }),
      })

      const data = await readJsonSafely(res)

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '비밀번호 재설정 요청 중 오류가 발생했습니다.')
      }

      setMessage(
        data.message ||
          '입력하신 정보가 가입 정보와 일치하면 비밀번호 재설정 절차가 진행됩니다.'
      )

      if (data.resetUrl) {
        setResetUrl(data.resetUrl)
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '비밀번호 재설정 요청 중 오류가 발생했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleMoveToReset = () => {
    if (!resetUrl) return
    window.location.href = resetUrl
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-[520px] rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_20px_80px_rgba(15,23,42,0.12)]">
        <div className="mb-7">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white">
            S
          </div>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900">
            비밀번호 찾기
          </h1>

          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
            가입한 아이디와 휴대폰 번호를 입력해주세요. 정보가 일치하면 비밀번호
            재설정 링크를 생성합니다.
          </p>
        </div>

        {message ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {resetUrl ? (
          <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="text-sm font-black text-blue-700">테스트용 재설정 링크</div>
            <p className="mt-2 text-xs font-semibold leading-5 text-blue-600">
              운영 전에는 Cloud Function의 DEBUG_RETURN_RESET_URL 값을 false로 변경해야 합니다.
            </p>
            <button
              type="button"
              onClick={handleMoveToReset}
              className="mt-3 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700"
            >
              비밀번호 재설정으로 이동
            </button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              아이디
            </label>
            <input
              type="text"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              placeholder="가입한 아이디"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-blue-500 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              가입 휴대폰 번호
            </label>
            <input
              type="text"
              value={phone}
              onChange={(event) => setPhone(formatPhoneForDisplay(event.target.value))}
              placeholder="010-1234-5678"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-blue-500 focus:bg-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '확인 중...' : '재설정 링크 생성'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            로그인으로 돌아가기
          </button>
        </form>
      </section>
    </main>
  )
}