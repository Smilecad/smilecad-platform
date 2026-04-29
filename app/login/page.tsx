'use client'

import Script from 'next/script'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, getSession } from 'next-auth/react'
type AuthMode = 'login' | 'signup'

type DaumPostcodeData = {
  zonecode: string
  address: string
  addressType: 'R' | 'J'
  roadAddress: string
  jibunAddress: string
  buildingName: string
  apartment: 'Y' | 'N'
  bname: string
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void
      }) => {
        open: () => void
      }
    }
  }
}

export default function LoginPage() {
  const router = useRouter()

  const sendOtpApiUrl =
    process.env.NEXT_PUBLIC_NCP_SEND_OTP_API_URL ||
    'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/send-otp'

  const verifyOtpApiUrl =
    process.env.NEXT_PUBLIC_NCP_VERIFY_OTP_API_URL ||
    'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/verify-otp'

  const createProfileApiUrl =
    process.env.NEXT_PUBLIC_NCP_CREATE_PROFILE_API_URL ||
    'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/create-profile'
  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [loginId, setLoginId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [signupLoginId, setSignupLoginId] = useState('')
  const [signupClinicName, setSignupClinicName] = useState('')
  const [signupClinicZipcode, setSignupClinicZipcode] = useState('')
  const [signupClinicAddressBase, setSignupClinicAddressBase] = useState('')
  const [signupClinicAddressDetail, setSignupClinicAddressDetail] = useState('')
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

  const [checkingLoginId, setCheckingLoginId] = useState(false)
  const [loginIdChecked, setLoginIdChecked] = useState(false)
  const [loginIdAvailable, setLoginIdAvailable] = useState(false)

  // 🚀 [추가됨] 법적 동의 상태 관리
  const [isTermsAgreed, setIsTermsAgreed] = useState(false)
  const [isPrivacyAgreed, setIsPrivacyAgreed] = useState(false)
  const [isEntrustAgreed, setIsEntrustAgreed] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      setPageLoading(true)
      const session = await getSession()
      if (session?.user) {
        router.replace('/orders')
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

  const signupPhoneE164 = useMemo(() => {
    return toKoreanPhoneE164(signupClinicPhone)
  }, [signupClinicPhone])

  const isPhoneReadyForOtp = useMemo(() => {
    return !!signupPhoneE164
  }, [signupPhoneE164])

  const canSendOtp = useMemo(() => {
    return isPhoneReadyForOtp && !otpSending
  }, [isPhoneReadyForOtp, otpSending])

  const fullSignupClinicAddress = useMemo(() => {
    return [signupClinicAddressBase.trim(), signupClinicAddressDetail.trim()]
      .filter(Boolean)
      .join(' ')
      .trim()
  }, [signupClinicAddressBase, signupClinicAddressDetail])

  const otpButtonLabel = useMemo(() => {
    if (otpSending) return '발송 중...'
    if (!signupClinicPhone.trim()) return '번호를 먼저 입력하세요'
    if (!signupPhoneE164) return '번호 형식을 확인하세요'
    return '인증번호 발송'
  }, [otpSending, signupClinicPhone, signupPhoneE164])

  const openAddressSearch = () => {
    resetMessages()
    if (!window.daum?.Postcode) {
      setErrorMessage('주소 검색 서비스를 아직 불러오지 못했습니다.')
      return
    }

    new window.daum.Postcode({
      oncomplete: (data: DaumPostcodeData) => {
        let extraAddress = ''
        if (data.addressType === 'R') {
          if (data.bname) extraAddress += data.bname
          if (data.buildingName && data.apartment === 'Y') {
            extraAddress += extraAddress ? `, ${data.buildingName}` : data.buildingName
          }
        }
        const baseAddress = extraAddress ? `${data.address} (${extraAddress})` : data.address
        setSignupClinicZipcode(data.zonecode || '')
        setSignupClinicAddressBase(baseAddress)
      },
    }).open()
  }

  const resetPhoneVerification = () => {
    setOtpCode('')
    setOtpSent(false)
    setPhoneVerified(false)
    setVerifiedPhoneE164('')
  }

  const resetLoginIdCheck = () => {
    setLoginIdChecked(false)
    setLoginIdAvailable(false)
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
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', loginId: normalizedLoginId }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setLoginIdChecked(true)
        setLoginIdAvailable(false)
        setErrorMessage(data.error)
        return
      }

      setLoginIdChecked(true)
      setLoginIdAvailable(true)
      setMessage('사용 가능한 아이디입니다.')
    } catch (error) {
      setErrorMessage('아이디 중복 확인 중 오류가 발생했습니다.')
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

    try {
      setLoading(true)
      
      const result = await signIn('credentials', {
        redirect: false,
        email: normalizedLoginId,
        password: loginPassword,
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      setMessage('로그인되었습니다. 주문 목록으로 이동합니다.')
      router.replace('/orders')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async () => {
    resetMessages()

    if (!signupPhoneE164) {
      setErrorMessage('올바른 휴대폰 번호를 입력해주세요.')
      return
    }

    try {
      setOtpSending(true)

      const res = await fetch(sendOtpApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: signupPhoneE164 }),
      })

      const data = await res.json()

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '인증번호 발송에 실패했습니다.')
      }

      setOtpSent(true)
      setPhoneVerified(false)
      setVerifiedPhoneE164('')
      setOtpCode('')
      setMessage('인증번호를 발송했습니다.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '인증번호 발송 중 오류가 발생했습니다.')
    } finally {
      setOtpSending(false)
    }
  }

  const handleVerifyOtp = async () => {
    resetMessages()

    if (!signupPhoneE164 || !otpCode.trim()) {
      setErrorMessage('휴대폰 번호와 인증번호를 확인해주세요.')
      return
    }

    try {
      setOtpVerifying(true)

      const res = await fetch(verifyOtpApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: signupPhoneE164,
          code: otpCode.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '인증번호가 올바르지 않습니다.')
      }

      setPhoneVerified(true)
      setVerifiedPhoneE164(signupPhoneE164)
      setMessage('휴대폰 인증이 완료되었습니다.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '인증번호가 올바르지 않습니다.')
    } finally {
      setOtpVerifying(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()

    const normalizedLoginId = normalizeLoginId(signupLoginId)
    const clinicName = signupClinicName.trim()
    const clinicAddress = fullSignupClinicAddress
    const clinicPhone = signupClinicPhone.trim()

    if (!normalizedLoginId || !loginIdChecked || !loginIdAvailable) {
      setErrorMessage('아이디 입력 및 중복 확인을 해주세요.')
      return
    }

    if (!clinicName || !clinicAddress || !signupPhoneE164) {
      setErrorMessage('필수 정보를 모두 입력해주세요.')
      return
    }

    if (!phoneVerified || verifiedPhoneE164 !== signupPhoneE164) {
      setErrorMessage('휴대폰 인증을 완료해주세요.')
      return
    }

    if (signupPassword.length < 6 || signupPassword !== signupPasswordConfirm) {
      setErrorMessage('비밀번호 확인이 일치하지 않거나 6자 미만입니다.')
      return
    }

    if (!isTermsAgreed || !isPrivacyAgreed || !isEntrustAgreed) {
      setErrorMessage('필수 약관 및 개인정보 처리 위탁 계약에 모두 동의해주세요.')
      return
    }

    try {
      setLoading(true)

      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          loginId: normalizedLoginId,
          password: signupPassword,
          clinicName,
          clinicAddress,
          clinicPhone,
        }),
      })

      const signupData = await signupRes.json()

      if (!signupRes.ok) {
        throw new Error(signupData?.error || '회원가입에 실패했습니다.')
      }

      const profileRes = await fetch(createProfileApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedLoginId,
          clinicName,
          clinicAddress,
          role: 'clinic',
        }),
      })

      const profileData = await profileRes.json()

      if (!profileRes.ok || !profileData?.success) {
        throw new Error(profileData?.error || '회원 프로필 저장에 실패했습니다.')
      }

      setMessage('회원가입이 완료되었습니다. 로그인해주세요.')
      setMode('login')

      setSignupLoginId('')
      setSignupClinicName('')
      setSignupClinicZipcode('')
      setSignupClinicAddressBase('')
      setSignupClinicAddressDetail('')
      setSignupClinicPhone('')
      setSignupClinicEmail('')
      setSignupPassword('')
      setSignupPasswordConfirm('')
      setOtpCode('')
      setOtpSent(false)
      setPhoneVerified(false)
      setVerifiedPhoneE164('')
      setLoginIdChecked(false)
      setLoginIdAvailable(false)
      setIsTermsAgreed(false)
      setIsPrivacyAgreed(false)
      setIsEntrustAgreed(false)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) return <main className="flex min-h-screen items-center justify-center bg-slate-100">불러오는 중...</main>

  return (
    <>
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />

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
                    <p className="text-sm text-slate-200">교정유지장치 주문 플랫폼</p>
                  </div>
                </div>

                <div className="mt-12 max-w-xl">
                  <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">치과 주문 접수를 <br /> 더 빠르고 정확하게</h1>
                  <p className="mt-6 text-base leading-7 text-slate-200 md:text-lg">주문 접수부터 상태 확인까지 한 번에.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center bg-white px-5 py-8 md:px-8 lg:px-10 overflow-y-auto">
            <div className="w-full max-w-xl">
              <div>
                <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">{mode === 'login' ? '로그인' : '회원가입'}</h2>
              </div>

              <div className="mt-8 grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5">
                <button type="button" onClick={() => { resetMessages(); setMode('login') }} className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>로그인</button>
                <button type="button" onClick={() => { resetMessages(); setMode('signup') }} className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>회원가입</button>
              </div>

              {message ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
              {errorMessage ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div> : null}

              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="mt-8 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">아이디</label>
                    <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="아이디를 입력하세요" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4" required />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">비밀번호</label>
                    <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="비밀번호를 입력하세요" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4" required />
                  </div>
                  <button type="submit" disabled={loading} className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-blue-700">{loading ? '로그인 중...' : '로그인'}</button>
                </form>
              ) : (
                <form onSubmit={handleSignup} className="mt-8 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">아이디</label>
                    <div className="flex gap-3">
                      <input type="text" value={signupLoginId} onChange={(e) => { setSignupLoginId(e.target.value); resetLoginIdCheck(); }} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4" required />
                      <button type="button" onClick={checkDuplicateLoginId} disabled={checkingLoginId} className="shrink-0 rounded-2xl bg-slate-900 px-5 py-4 text-sm text-white">{checkingLoginId ? '확인 중...' : '중복 확인'}</button>
                    </div>
                    {loginIdChecked && loginIdAvailable ? <p className="mt-2 text-sm text-emerald-600">사용 가능한 아이디입니다.</p> : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">치과명</label>
                    <input type="text" value={signupClinicName} onChange={(e) => setSignupClinicName(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4" required />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">치과 주소</label>
                    <div className="grid grid-cols-[140px_1fr] gap-3">
                      <button type="button" onClick={openAddressSearch} className="rounded-2xl bg-slate-900 text-white">주소 검색</button>
                      <input type="text" value={signupClinicZipcode} readOnly className="w-full rounded-2xl bg-slate-100 px-4 py-4" />
                    </div>
                    <input type="text" value={signupClinicAddressBase} readOnly className="mt-3 w-full rounded-2xl bg-slate-100 px-4 py-4" />
                    <input type="text" value={signupClinicAddressDetail} onChange={(e) => setSignupClinicAddressDetail(e.target.value)} placeholder="상세주소를 입력해주세요" className="mt-3 w-full rounded-2xl bg-slate-50 px-4 py-4" required />
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="font-bold mb-2">휴대폰 인증</p>
                    <div className="flex gap-3 mb-2">
                      <input type="text" value={signupClinicPhone} onChange={(e) => { setSignupClinicPhone(formatPhoneForDisplay(e.target.value)); resetPhoneVerification(); }} placeholder="예: 010-1234-5678" className="w-full rounded-2xl border px-4 py-4" required />
                      <button type="button" onClick={handleSendOtp} disabled={!canSendOtp} className="shrink-0 rounded-2xl bg-slate-900 px-5 text-white">{otpButtonLabel}</button>
                    </div>
                    <div className="flex gap-3">
                      <input type="text" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6자리 코드" disabled={!otpSent} className="w-full rounded-2xl border px-4 py-4" />
                      <button type="button" onClick={handleVerifyOtp} disabled={otpVerifying || phoneVerified || !otpSent} className="shrink-0 rounded-2xl bg-blue-600 px-5 text-white">{phoneVerified ? '인증 완료' : 'OTP 확인'}</button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">비밀번호</label>
                    <input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4" required />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">비밀번호 확인</label>
                    <input type="password" value={signupPasswordConfirm} onChange={(e) => setSignupPasswordConfirm(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4" required />
                  </div>

                  {/* 🚀 [추가됨] 이용약관 및 개인정보 처리 위탁 동의 영역 */}
                  <div className="mt-6 flex flex-col gap-4 rounded-[20px] border border-slate-200 bg-white p-5">
                    <h3 className="text-sm font-bold text-slate-800">이용약관 및 보안 확약</h3>

                    {/* 1. 개인정보 처리 위탁 계약 */}
                    <div className="space-y-2">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={isEntrustAgreed} onChange={(e) => setIsEntrustAgreed(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                        <span className="text-[13px] font-bold text-blue-900">[필수] 개인정보 처리 위탁 계약 동의</span>
                      </label>
                      <div className="h-[80px] overflow-y-auto rounded-xl border border-blue-100 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 shadow-inner">
                        <strong>제1조 (목적 및 대상)</strong><br />
                        본 계약은 위탁자(치과)가 맞춤형 의료기기 제작을 위해 수탁자(스마일캐드)에게 환자의 성명, 구강 스캔 데이터(STL 등 민감정보)를 제공함에 있어 필요한 보안 사항을 규정합니다.<br /><br />
                        <strong>제2조 (데이터 무결성 및 보안)</strong><br />
                        수탁자는 ISMS-P 및 HIPAA 기준에 준하는 보안 시스템을 구축하고, 모든 데이터 접근 이력(Audit Trail)을 조작 불가능한 형태로 보존하여 데이터 무결성을 입증합니다.<br /><br />
                        <strong>제3조 (보존 기간)</strong><br />
                        의료기기법 및 당사 품질관리 규정에 따라, 제품 추적성을 위해 모든 주문 데이터는 <strong>생성일로부터 5년간</strong> 안전하게 보존되며, 기간 만료 시 지체 없이 파기됩니다.<br /><br />
                        <strong>제4조 (책임 권한)</strong><br />
                        본 서비스 가입은 당사 품질절차서 및 고객자산 관리 규정에 따른 적법한 개인정보 처리 위탁 계약의 체결로 간주됩니다.
                      </div>
                    </div>

                    {/* 2. 일반 서비스 이용약관 */}
                    <div className="space-y-2">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={isTermsAgreed} onChange={(e) => setIsTermsAgreed(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                        <span className="text-[13px] font-bold text-slate-700">[필수] 서비스 이용약관 동의</span>
                      </label>
                    </div>

                    {/* 3. 개인정보 수집 및 이용 동의 */}
                    <div className="space-y-2">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={isPrivacyAgreed} onChange={(e) => setIsPrivacyAgreed(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                        <span className="text-[13px] font-bold text-slate-700">[필수] 개인정보 수집 및 이용 동의</span>
                      </label>
                    </div>
                  </div>

                  {/* 회원가입 버튼 */}
                  <button 
                    type="submit" 
                    disabled={loading || !phoneVerified || !loginIdChecked || !loginIdAvailable || !isTermsAgreed || !isPrivacyAgreed || !isEntrustAgreed} 
                    className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-semibold text-white disabled:opacity-50"
                  >
                    {loading ? '가입 중...' : '회원가입'}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}