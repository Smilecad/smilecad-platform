'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const RESET_PASSWORD_API_URL =
  process.env.NEXT_PUBLIC_NCP_RESET_PASSWORD_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/reset-password'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const token = useMemo(() => {
    return searchParams.get('token') || ''
  }, [searchParams])

  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

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

    if (!token) {
      setErrorMessage('재설정 토큰이 없습니다. 비밀번호 찾기를 다시 진행해주세요.')
      return
    }

    if (newPassword.length < 6) {
      setErrorMessage('비밀번호는 6자 이상으로 입력해주세요.')
      return
    }

    if (newPassword !== newPasswordConfirm) {
      setErrorMessage('비밀번호 확인이 일치하지 않습니다.')
      return
    }

    try {
      setLoading(true)

      const res = await fetch(RESET_PASSWORD_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      })

      const data = await readJsonSafely(res)

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '비밀번호 변경 중 오류가 발생했습니다.')
      }

      setMessage(data.message || '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.')
      setNewPassword('')
      setNewPasswordConfirm('')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '비밀번호 변경 중 오류가 발생했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-[520px] rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_20px_80px_rgba(15,23,42,0.12)]">
        <div className="mb-7">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white">
            S
          </div>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900">
            새 비밀번호 설정
          </h1>

          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
            새로 사용할 비밀번호를 입력해주세요.
          </p>
        </div>

        {!token ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            재설정 토큰이 없습니다. 비밀번호 찾기를 다시 진행해주세요.
          </div>
        ) : null}

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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              새 비밀번호
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="6자 이상 입력"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-blue-500 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              새 비밀번호 확인
            </label>
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(event) => setNewPasswordConfirm(event.target.value)}
              placeholder="새 비밀번호를 다시 입력"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-blue-500 focus:bg-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100">
          불러오는 중...
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}