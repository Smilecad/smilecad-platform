'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { firebaseAuth } from '@/lib/firebase'
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
} from 'firebase/auth'

const supabase = createClient()

type AuthMode = 'login' | 'signup'

type ProfileRow = {
  id: string
  role: string
  login_id?: string | null
  clinic_name: string | null
  clinic_address?: string | null
  clinic_phone?: string | null
}

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier
  }
}

export default function LoginPage() {
  const router = useRouter()
  const recaptchaContainerId = 'firebase-recaptcha-container'
  const recaptchaInitializedRef = useRef(false)

  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [loginId, setLoginId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [signupLoginId, setSignupLoginId] = useState('')
  const [signupClinicName, setSignupClinicName] = useState('')
  const [signupClinicAddress, setSignupClinicAddress] = useState('')
  const [signupClinicPhone, setSignupClinicPhone] = useState('')
  const [signupClinicEmail, setSignupClinicEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('')

  const [otpCode, setOtpCode] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [verifiedPhoneE164, setVerifiedPhoneE164] = useState('')
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null)

  const [checkingLoginId, setCheckingLoginId] = useState(false)
  const [loginIdChecked, setLoginIdChecked] = useState(false)
  const [loginIdAvailable, setLoginIdAvailable] = useState(false)

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

  useEffect(() => {
    if (mode !== 'signup') {
      return
    }

    if (recaptchaInitializedRef.current) {
      return
    }

    const initRecaptcha = async () => {
      const container = document.getElementById(recaptchaContainerId)
      if (!container) return

      try {
        window.recaptchaVerifier = new RecaptchaVerifier(
          firebaseAuth,
          recaptchaContainerId,
          {
            size: 'normal',
            callback: () => {
              setMessage('reCAPTCHA 확인이 완료되었습니다. 인증번호를 발송해주세요.')
            },
          }
        )

        await window.recaptchaVerifier.render()
        recaptchaInitializedRef.current = true
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : 'reCAPTCHA 초기화 중 오류가 발생했습니다.'
        setErrorMessage(msg)
      }
    }

    initRecaptcha()

    return () => {
      // signup -> login 탭 전환 시 재생성 문제를 막기 위해 clear는 하지 않음
      // 페이지 unmount 시 브라우저가 정리하도록 둔다.
    }
  }, [mode])

  const resetMessages = () => {
    setMessage('')
    setErrorMessage('')
  }

  const resetPhoneVerification = () => {
    setOtpCode('')
    setOtpSent(false)
    setPhoneVerified(false)
    setVerifiedPhoneE164('')
    setConfirmationResult(null)

    if (firebaseAuth.currentUser) {
      void firebaseSignOut(firebaseAuth)
    }
  }

  const resetLoginIdCheck = () => {
    setLoginIdChecked(false)
    setLoginIdAvailable(false)
  }

  const formatPhoneForDisplay = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)

    if (digits.length <= 3) return digits
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }

  const toKoreanPhoneE164 = (value: string) => {
    const digits = value.replace(/\D/g, '')

    if (digits.startsWith('82')) {
      if (digits.length < 11 || digits.length > 12) return null
      return `+${digits}`
    }

    if (!digits.startsWith('0')) return null
    if (digits.length < 10 || digits.length > 11) return null

    return `+82${digits.slice(1)}`
  }

  const normalizeLoginId = (value: string) => value.trim().toLowerCase()

  const isValidLoginId = (value: string) => {
    return /^[a-zA-Z0-9._-]{4,20}$/.test(value)
  }

  const toAuthEmailFromLoginId = (value: string) => {
    const normalized = normalizeLoginId(value)
    if (!normalized) return ''
    return `${normalized}@smilecad.local`
  }

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  const signupPhoneE164 = useMemo(() => {
    return toKoreanPhoneE164(signupClinicPhone)
  }, [signupClinicPhone])

  const resolvedSignupAuthEmail = useMemo(() => {
    const normalized = normalizeLoginId(signupLoginId)

    if (!isValidLoginId(normalized)) {
      return null
    }

    return toAuthEmailFromLoginId(normalized)
  }, [signupLoginId])

  const ensureProfileAfterLogin = async (userId: string, fallbackLoginId: string) => {
    const { data: existingProfile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('id, role, login_id, clinic_name, clinic_address, clinic_phone')
      .eq('id', userId)
      .maybeSingle()

    if (profileFetchError) {
      throw new Error(profileFetchError.message)
    }

    const profile = existingProfile as ProfileRow | null

    if (!profile) {
      const fallbackClinicName = fallbackLoginId || '치과'

      const { error: insertProfileError } = await supabase.from('profiles').insert({
        id: userId,
        role: 'clinic',
        login_id: fallbackLoginId,
        clinic_name: fallbackClinicName,
        clinic_address: '',
        clinic_phone: '',
      })

      if (insertProfileError) {
        throw new Error(insertProfileError.message)
      }
    }
  }

  const checkDuplicateLoginId = async () => {
    resetMessages()

    const normalizedLoginId = normalizeLoginId(signupLoginId)

    if (!normalizedLoginId) {
      setErrorMessage('아이디를 입력해주세요.')
      resetLoginIdCheck()
      return
    }

    if (!isValidLoginId(normalizedLoginId)) {
      setErrorMessage('아이디는 4~20자의 영문, 숫자, 점(.), 밑줄(_), 하이픈(-)만 사용할 수 있습니다.')
      resetLoginIdCheck()
      return
    }

    try {
      setCheckingLoginId(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('login_id', normalizedLoginId)
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      if (data) {
        setLoginIdChecked(true)
        setLoginIdAvailable(false)
        setErrorMessage('이미 사용 중인 아이디입니다.')
        return
      }

      setLoginIdChecked(true)
      setLoginIdAvailable(true)
      setMessage('사용 가능한 아이디입니다.')
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : '아이디 중복 확인 중 오류가 발생했습니다.'
      setErrorMessage(msg)
      resetLoginIdCheck()
    } finally {
      setCheckingLoginId(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()

    const normalizedLoginId = normalizeLoginId(loginId)

    if (!normalizedLoginId || !loginPassword.trim()) {
      setErrorMessage('아이디와 비밀번호를 입력해주세요.')
      return
    }

    if (!isValidLoginId(normalizedLoginId)) {
      setErrorMessage('아이디 형식이 올바르지 않습니다.')
      return
    }

    try {
      setLoading(true)

      const authEmail = toAuthEmailFromLoginId(normalizedLoginId)

      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: loginPassword,
      })

      if (error) {
        throw new Error(error.message)
      }

      const user = data.user
      if (!user) {
        throw new Error('로그인 사용자 정보를 확인할 수 없습니다.')
      }

      await ensureProfileAfterLogin(user.id, normalizedLoginId)

      setMessage('로그인되었습니다. 대시보드로 이동합니다.')
      router.replace('/dashboard')
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.'
      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async () => {
    resetMessages()

    if (!signupLoginId.trim()) {
      setErrorMessage('아이디를 입력해주세요.')
      return
    }

    if (!isValidLoginId(normalizeLoginId(signupLoginId))) {
      setErrorMessage('아이디는 4~20자의 영문, 숫자, 점(.), 밑줄(_), 하이픈(-)만 사용할 수 있습니다.')
      return
    }

    if (!loginIdChecked || !loginIdAvailable) {
      setErrorMessage('아이디 중복 확인을 먼저 완료해주세요.')
      return
    }

    if (!signupClinicName.trim()) {
      setErrorMessage('치과명을 입력해주세요.')
      return
    }

    if (!signupClinicAddress.trim()) {
      setErrorMessage('치과 주소를 입력해주세요.')
      return
    }

    if (!signupClinicPhone.trim()) {
      setErrorMessage('휴대폰 번호를 입력해주세요.')
      return
    }

    if (!signupPhoneE164) {
      setErrorMessage('올바른 휴대폰 번호 형식으로 입력해주세요.')
      return
    }

    if (signupClinicEmail.trim() && !isValidEmail(signupClinicEmail.trim())) {
      setErrorMessage('치과 이메일 형식이 올바르지 않습니다.')
      return
    }

    if (!window.recaptchaVerifier) {
      setErrorMessage('reCAPTCHA가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.')
      return
    }

    try {
      setOtpSending(true)

      const result = await signInWithPhoneNumber(
        firebaseAuth,
        signupPhoneE164,
        window.recaptchaVerifier
      )

      setConfirmationResult(result)
      setOtpSent(true)
      setPhoneVerified(false)
      setVerifiedPhoneE164('')
      setOtpCode('')
      setMessage('인증번호를 발송했습니다. 문자로 받은 6자리 코드를 입력해주세요.')
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : '인증번호 발송 중 오류가 발생했습니다.'

      if (rawMessage.toLowerCase().includes('too-many-requests')) {
        setErrorMessage('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.')
      } else if (rawMessage.toLowerCase().includes('invalid-phone-number')) {
        setErrorMessage('휴대폰 번호 형식이 올바르지 않습니다.')
      } else {
        setErrorMessage(rawMessage)
      }
    } finally {
      setOtpSending(false)
    }
  }

  const handleVerifyOtp = async () => {
    resetMessages()

    if (!confirmationResult) {
      setErrorMessage('먼저 인증번호를 발송해주세요.')
      return
    }

    if (!signupPhoneE164) {
      setErrorMessage('올바른 휴대폰 번호를 입력해주세요.')
      return
    }

    if (!otpCode.trim()) {
      setErrorMessage('인증번호를 입력해주세요.')
      return
    }

    try {
      setOtpVerifying(true)

      const credential = await confirmationResult.confirm(otpCode.trim())
      const verifiedPhone = credential.user.phoneNumber

      if (!verifiedPhone) {
        throw new Error('인증된 휴대폰 번호를 확인할 수 없습니다.')
      }

      if (verifiedPhone !== signupPhoneE164) {
        throw new Error('인증된 번호와 입력한 번호가 일치하지 않습니다.')
      }

      setPhoneVerified(true)
      setVerifiedPhoneE164(verifiedPhone)
      setMessage('휴대폰 인증이 완료되었습니다.')

      await firebaseSignOut(firebaseAuth)
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : '인증번호 확인 중 오류가 발생했습니다.'

      if (rawMessage.toLowerCase().includes('invalid-verification-code')) {
        setErrorMessage('인증번호가 올바르지 않습니다.')
      } else if (rawMessage.toLowerCase().includes('code-expired')) {
        setErrorMessage('인증번호가 만료되었습니다. 다시 발송해주세요.')
      } else {
        setErrorMessage(rawMessage)
      }
    } finally {
      setOtpVerifying(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()

    const normalizedLoginId = normalizeLoginId(signupLoginId)

    if (!normalizedLoginId) {
      setErrorMessage('아이디를 입력해주세요.')
      return
    }

    if (!isValidLoginId(normalizedLoginId)) {
      setErrorMessage('아이디는 4~20자의 영문, 숫자, 점(.), 밑줄(_), 하이픈(-)만 사용할 수 있습니다.')
      return
    }

    if (!loginIdChecked || !loginIdAvailable) {
      setErrorMessage('아이디 중복 확인을 먼저 완료해주세요.')
      return
    }

    if (!signupClinicName.trim()) {
      setErrorMessage('치과명을 입력해주세요.')
      return
    }

    if (!signupClinicAddress.trim()) {
      setErrorMessage('치과 주소를 입력해주세요.')
      return
    }

    if (!signupClinicPhone.trim()) {
      setErrorMessage('휴대폰 번호를 입력해주세요.')
      return
    }

    if (!signupPhoneE164) {
      setErrorMessage('올바른 휴대폰 번호 형식으로 입력해주세요.')
      return
    }

    if (!phoneVerified || verifiedPhoneE164 !== signupPhoneE164) {
      setErrorMessage('휴대폰 OTP 인증을 완료해야 회원가입할 수 있습니다.')
      return
    }

    if (signupClinicEmail.trim() && !isValidEmail(signupClinicEmail.trim())) {
      setErrorMessage('치과 이메일 형식이 올바르지 않습니다.')
      return
    }

    if (!resolvedSignupAuthEmail) {
      setErrorMessage('아이디 처리 중 오류가 발생했습니다.')
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

      const { data: duplicateRow, error: duplicateCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('login_id', normalizedLoginId)
        .maybeSingle()

      if (duplicateCheckError) {
        throw new Error(duplicateCheckError.message)
      }

      if (duplicateRow) {
        setLoginIdChecked(true)
        setLoginIdAvailable(false)
        throw new Error('이미 사용 중인 아이디입니다.')
      }

      const { data, error } = await supabase.auth.signUp({
        email: resolvedSignupAuthEmail,
        password: signupPassword,
        options: {
          data: {
            login_id: normalizedLoginId,
            clinic_name: signupClinicName.trim(),
            clinic_address: signupClinicAddress.trim(),
            clinic_phone: signupClinicPhone.trim(),
            clinic_email: signupClinicEmail.trim() || null,
            phone_verified: true,
            role: 'clinic',
          },
        },
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
        login_id: normalizedLoginId,
        clinic_name: signupClinicName.trim(),
        clinic_address: signupClinicAddress.trim(),
        clinic_phone: signupClinicPhone.trim(),
      })

      if (profileUpsertError) {
        if (profileUpsertError.message.toLowerCase().includes('duplicate key')) {
          throw new Error('이미 사용 중인 아이디입니다.')
        }
        throw new Error(profileUpsertError.message)
      }

      setMessage('회원가입이 완료되었습니다. 아이디와 비밀번호로 로그인해주세요.')

      setSignupLoginId('')
      setSignupClinicName('')
      setSignupClinicAddress('')
      setSignupClinicPhone('')
      setSignupClinicEmail('')
      setSignupPassword('')
      setSignupPasswordConfirm('')
      resetPhoneVerification()
      resetLoginIdCheck()
      setMode('login')
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.'
      setErrorMessage(msg)
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
                  ? '아이디와 비밀번호로 로그인하여 주문 플랫폼을 시작하세요.'
                  : '치과 정보를 등록하고 같은 페이지에서 휴대폰 인증 후 계정을 생성하세요.'}
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
                    아이디
                  </label>
                  <input
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="아이디를 입력하세요"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                    autoComplete="username"
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
                    아이디 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={signupLoginId}
                      onChange={(e) => {
                        setSignupLoginId(e.target.value)
                        resetLoginIdCheck()
                        resetMessages()
                      }}
                      placeholder="4~20자 영문, 숫자, . _ - 사용 가능"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={checkDuplicateLoginId}
                      disabled={checkingLoginId}
                      className="shrink-0 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {checkingLoginId ? '확인 중...' : '중복 확인'}
                    </button>
                  </div>

                  {loginIdChecked && loginIdAvailable ? (
                    <p className="mt-2 text-sm font-semibold text-emerald-600">
                      사용 가능한 아이디입니다.
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    치과명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={signupClinicName}
                    onChange={(e) => setSignupClinicName(e.target.value)}
                    placeholder="예: 스마일치과"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    치과 주소 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={signupClinicAddress}
                    onChange={(e) => setSignupClinicAddress(e.target.value)}
                    placeholder="예: 서울시 강남구 테헤란로 123"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    휴대폰 번호 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={signupClinicPhone}
                      onChange={(e) => {
                        const nextValue = formatPhoneForDisplay(e.target.value)
                        setSignupClinicPhone(nextValue)
                        resetPhoneVerification()
                        resetMessages()
                      }}
                      placeholder="예: 010-1234-5678"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSending}
                      className="shrink-0 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {otpSending ? '발송 중...' : '인증번호 발송'}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    인증번호 입력
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="문자로 받은 6자리 코드"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpVerifying || phoneVerified || !otpSent}
                      className="shrink-0 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                      {phoneVerified ? '인증 완료' : otpVerifying ? '확인 중...' : 'OTP 확인'}
                    </button>
                  </div>

                  {phoneVerified ? (
                    <div className="mt-3 text-sm font-semibold text-emerald-600">
                      휴대폰 인증이 완료되었습니다.
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-slate-500">
                      인증번호 발송 후 6자리 코드를 입력해주세요.
                    </div>
                  )}
                </div>

                <div id={recaptchaContainerId} className="overflow-hidden rounded-2xl" />

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    치과 이메일 (선택)
                  </label>
                  <input
                    type="email"
                    value={signupClinicEmail}
                    onChange={(e) => setSignupClinicEmail(e.target.value)}
                    placeholder="예: clinic@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                    autoComplete="email"
                  />
                  <p className="mt-2 text-sm text-slate-500">
                    치과 대표 이메일이 있는 경우에만 입력하세요. 로그인 아이디와는 별개입니다.
                  </p>
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
                  disabled={loading || !phoneVerified || !loginIdChecked || !loginIdAvailable}
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