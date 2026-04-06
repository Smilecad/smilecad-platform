'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

type AuthMode = 'login' | 'signup'

type ProfileRow = {
  id: string
  role: string
  clinic_name: string | null
  clinic_address?: string | null
  clinic_phone?: string | null
}

export default function LoginPage() {
  const router = useRouter()

  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [signupClinicName, setSignupClinicName] = useState('')
  const [signupClinicAddress, setSignupClinicAddress] = useState('')
  const [signupClinicPhone, setSignupClinicPhone] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('')

  useEffect(() => {
    const checkSession = async () => {
      setPageLoading(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        router.replace('/dashboard')
        return
      }

      setPageLoading(false)
    }

    checkSession()
  }, [router])

  const resetMessages = () => {
    setMessage('')
    setErrorMessage('')
  }

  const ensureProfileAfterLogin = async (userId: string, email: string) => {
    const { data: existingProfile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('id, role, clinic_name, clinic_address, clinic_phone')
      .eq('id', userId)
      .maybeSingle<ProfileRow>()

    if (profileFetchError) {
      throw new Error(profileFetchError.message)
    }

    if (!existingProfile) {
      const fallbackClinicName = email.split('@')[0] || '치과'

      const { error: insertProfileError } = await supabase.from('profiles').insert({
        id: userId,
        role: 'clinic',
        clinic_name: fallbackClinicName,
        clinic_address: '',
        clinic_phone: '',
      })

      if (insertProfileError) {
        throw new Error(insertProfileError.message)
      }
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMessage('이메일과 비밀번호를 입력해주세요.')
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      })

      if (error) {
        throw new Error(error.message)
      }

      const user = data.user
      if (!user) {
        throw new Error('로그인 사용자 정보를 확인할 수 없습니다.')
      }

      await ensureProfileAfterLogin(user.id, user.email ?? loginEmail.trim())

      setMessage('로그인되었습니다. 대시보드로 이동합니다.')
      router.replace('/dashboard')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()

    if (!signupClinicName.trim()) {
      setErrorMessage('치과명을 입력해주세요.')
      return
    }

    if (!signupClinicAddress.trim()) {
      setErrorMessage('치과 주소를 입력해주세요.')
      return
    }

    if (!signupClinicPhone.trim()) {
      setErrorMessage('연락처를 입력해주세요.')
      return
    }

    if (!signupEmail.trim()) {
      setErrorMessage('이메일을 입력해주세요.')
      return
    }

    if (!signupPassword.trim()) {
      setErrorMessage('비밀번호를 입력해주세요.')
      return
    }

    if (signupPassword.length < 6) {
      setErrorMessage('비밀번호는 6자 이상으로 입력해주세요.')
      return
    }

    if (signupPassword !== signupPasswordConfirm) {
      setErrorMessage('비밀번호 확인이 일치하지 않습니다.')
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
      })

      if (error) {
        throw new Error(error.message)
      }

      const user = data.user
      if (!user) {
        throw new Error('회원가입 사용자 정보를 확인할 수 없습니다.')
      }

      const { error: profileUpsertError } = await supabase.from('profiles').upsert({
        id: user.id,
        role: 'clinic',
        clinic_name: signupClinicName.trim(),
        clinic_address: signupClinicAddress.trim(),
        clinic_phone: signupClinicPhone.trim(),
      })

      if (profileUpsertError) {
        throw new Error(profileUpsertError.message)
      }

      setMessage(
        '회원가입이 완료되었습니다. 이메일 인증을 사용하는 경우 인증 후 로그인해주세요.'
      )

      setSignupClinicName('')
      setSignupClinicAddress('')
      setSignupClinicPhone('')
      setSignupEmail('')
      setSignupPassword('')
      setSignupPasswordConfirm('')
      setMode('login')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.'
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
          페이지를 불러오는 중입니다...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_30%),linear-gradient(135deg,#0f172a_0%,#0b1f4d_45%,#0f172a_100%)] px-6 py-8 text-white md:px-10 md:py-10 lg:px-12 lg:py-12">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(255,255,255,0.04),transparent,rgba(255,255,255,0.02))]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-xl font-bold shadow-lg shadow-blue-500/30">
                  S
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">SmileCAD Platform</p>
                  <p className="text-sm text-slate-200">
                    교정유지장치 주문 · 진행상태 · 파일관리 플랫폼
                  </p>
                </div>
              </div>

              <div className="mt-12 max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-300">
                  Digital Orthodontic Workflow
                </p>
                <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
                  치과 주문 접수를
                  <br />
                  더 빠르고 정확하게
                </h1>
                <p className="mt-6 text-base leading-7 text-slate-200 md:text-lg">
                  주문 접수부터 진행 상태 확인, 스캔 파일 관리와 디자인 파일 전달까지
                  한 화면에서 간편하게 관리할 수 있습니다.
                </p>
              </div>

              <div className="mt-10 grid gap-3">
                {[
                  '주문 접수와 상세 확인을 빠르게',
                  '진행 상태를 한눈에 확인',
                  '스캔 / 디자인 파일을 체계적으로 관리',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/8 px-5 py-4 backdrop-blur-sm"
                  >
                    <p className="text-sm font-semibold text-slate-100">
                      <span className="mr-2 text-blue-300">✔</span>
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 text-sm text-slate-300">
              정확한 주문 접수, 명확한 상태 관리, 체계적인 파일 운영
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-white px-5 py-8 md:px-8 lg:px-10">
          <div className="w-full max-w-xl">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">
                SmileCAD
              </p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
                {mode === 'login' ? '로그인' : '회원가입'}
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-500">
                {mode === 'login'
                  ? '계정에 로그인하여 주문 플랫폼을 시작하세요.'
                  : '치과 정보를 등록하고 주문 플랫폼 계정을 생성하세요.'}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5">
              <button
                type="button"
                onClick={() => {
                  resetMessages()
                  setMode('login')
                }}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => {
                  resetMessages()
                  setMode('signup')
                }}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                회원가입
              </button>
            </div>

            {message ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="예: clinic@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                    autoComplete="current-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {loading ? '로그인 중...' : '로그인'}
                </button>

                <div className="pt-2 text-center text-sm text-slate-500">
                  계정이 없으신가요?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      resetMessages()
                      setMode('signup')
                    }}
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    회원가입
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    치과명
                  </label>
                  <input
                    type="text"
                    value={signupClinicName}
                    onChange={(e) => setSignupClinicName(e.target.value)}
                    placeholder="예: 스마일치과"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    치과 주소
                  </label>
                  <input
                    type="text"
                    value={signupClinicAddress}
                    onChange={(e) => setSignupClinicAddress(e.target.value)}
                    placeholder="예: 서울시 강남구 테헤란로 123"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    연락처
                  </label>
                  <input
                    type="text"
                    value={signupClinicPhone}
                    onChange={(e) => setSignupClinicPhone(e.target.value)}
                    placeholder="예: 02-1234-5678"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    이메일(아이디)
                  </label>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="예: clinic@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="6자 이상 입력해주세요"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    비밀번호 확인
                  </label>
                  <input
                    type="password"
                    value={signupPasswordConfirm}
                    onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                    placeholder="비밀번호를 한 번 더 입력해주세요"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {loading ? '회원가입 처리 중...' : '회원가입'}
                </button>

                <div className="pt-1 text-center text-sm text-slate-500">
                  이미 계정이 있으신가요?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      resetMessages()
                      setMode('login')
                    }}
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    로그인
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}