// app/profile/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppTopNav from '@/app/components/AppTopNav'

const GET_PROFILE_WEB_API_URL =
  process.env.NEXT_PUBLIC_NCP_GET_PROFILE_WEB_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/get-profile-web'

const UPDATE_PROFILE_WEB_API_URL =
  process.env.NEXT_PUBLIC_NCP_UPDATE_PROFILE_WEB_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/update-profile-web'

type Profile = {
  loginId: string
  role: string
  phone: string
  clinicName: string
  clinicAddress: string
  contactName: string
  contactRole: string
}

function normalizePhone(value: string) {
  return String(value || '').replace(/\D/g, '')
}

function formatPhone(value: string) {
  const digits = normalizePhone(value)

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  return value
}

export default function ProfilePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [loginId, setLoginId] = useState('')
  const [role, setRole] = useState('clinic')
  const [clinicName, setClinicName] = useState('')
  const [clinicAddress, setClinicAddress] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')

  const readJsonSafely = async (res: Response) => {
    const text = await res.text()

    try {
      return text ? JSON.parse(text) : null
    } catch {
      throw new Error('API 응답이 JSON 형식이 아닙니다.')
    }
  }

  const handleAuthError = (status: number) => {
    if (status === 401 || status === 403) {
      window.localStorage.removeItem('smilecad_token')
      window.localStorage.removeItem('smilecad_user')
      router.replace('/login')
      return true
    }

    return false
  }

  const loadProfile = async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const token = window.localStorage.getItem('smilecad_token') || ''

      if (!token) {
        router.replace('/login')
        return
      }

      const res = await fetch(GET_PROFILE_WEB_API_URL, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (handleAuthError(res.status)) return

      const data = await readJsonSafely(res)

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '회원정보를 불러오지 못했습니다.')
      }

      const profile: Profile = data.profile || data

      setLoginId(profile.loginId || '')
      setRole(profile.role || 'clinic')
      setClinicName(profile.clinicName || '')
      setClinicAddress(profile.clinicAddress || '')
      setContactName(profile.contactName || '')
      setContactRole(profile.contactRole || '')
      setPhone(formatPhone(profile.phone || ''))
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '회원정보를 불러오는 중 오류가 발생했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleSave = async () => {
    setErrorMessage('')
    setSuccessMessage('')

    const cleanPhone = normalizePhone(phone)

    if (!contactName.trim()) {
      setErrorMessage('담당자명을 입력해주세요.')
      return
    }

    if (!cleanPhone || (cleanPhone.length !== 10 && cleanPhone.length !== 11)) {
      setErrorMessage('올바른 휴대폰 번호를 입력해주세요.')
      return
    }

    if (!clinicAddress.trim()) {
      setErrorMessage('치과 주소를 입력해주세요.')
      return
    }

    if (newPassword || newPasswordConfirm || currentPassword) {
      if (!currentPassword) {
        setErrorMessage('비밀번호를 변경하려면 현재 비밀번호를 입력해주세요.')
        return
      }

      if (newPassword.length < 6) {
        setErrorMessage('새 비밀번호는 6자 이상이어야 합니다.')
        return
      }

      if (newPassword !== newPasswordConfirm) {
        setErrorMessage('새 비밀번호 확인이 일치하지 않습니다.')
        return
      }
    }

    try {
      setSaving(true)

      const token = window.localStorage.getItem('smilecad_token') || ''

      if (!token) {
        router.replace('/login')
        return
      }

      const res = await fetch(UPDATE_PROFILE_WEB_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contactName: contactName.trim(),
          contactRole: contactRole.trim(),
          phone: cleanPhone,
          clinicAddress: clinicAddress.trim(),
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      })

      if (handleAuthError(res.status)) return

      const data = await readJsonSafely(res)

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '회원정보 수정에 실패했습니다.')
      }

      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
      setPhone(formatPhone(cleanPhone))
      setSuccessMessage('회원정보가 수정되었습니다.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '회원정보 수정 중 오류가 발생했습니다.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto w-full max-w-[1180px] px-6 py-8">
        <AppTopNav current="profile" />

        <section className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-[0_14px_45px_rgba(15,23,42,0.06)]">
          <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[14px] font-black text-blue-600">계정 관리</p>
              <h1 className="mt-2 text-[30px] font-black tracking-[-0.04em] text-slate-950">
                회원정보 수정
              </h1>
              <p className="mt-2 text-[14px] font-semibold text-slate-500">
                담당자명, 휴대폰 번호, 치과 주소와 비밀번호를 수정할 수 있습니다.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push('/orders')}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-[14px] font-black text-white shadow-sm transition hover:bg-slate-800"
            >
              주문 목록으로
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-12 text-center text-[14px] font-bold text-slate-500">
              회원정보를 불러오는 중입니다...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_360px]">
              <div className="space-y-5">
                {errorMessage && (
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[14px] font-bold text-red-600">
                    {errorMessage}
                  </div>
                )}

                {successMessage && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[14px] font-black text-emerald-700">
                    {successMessage}
                  </div>
                )}

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-[18px] font-black text-slate-950">기본 정보</h2>

                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-[13px] font-black text-slate-500">
                        아이디
                      </span>
                      <input
                        value={loginId}
                        disabled
                        className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-[14px] font-bold text-slate-500"
                      />
                      <span className="mt-2 block text-[12px] font-semibold text-slate-400">
                        아이디는 주문 및 이력 기준값이라 수정할 수 없습니다.
                      </span>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[13px] font-black text-slate-500">
                        권한
                      </span>
                      <input
                        value={role}
                        disabled
                        className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-[14px] font-bold text-slate-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[13px] font-black text-slate-500">
                        담당자명
                      </span>
                      <input
                        value={contactName}
                        onChange={(event) => setContactName(event.target.value)}
                        placeholder="예: 홍길동"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-bold text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[13px] font-black text-slate-500">
                        직책/구분
                      </span>
                      <select
                        value={contactRole}
                        onChange={(event) => setContactRole(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-bold text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      >
                        <option value="">선택 안 함</option>
                        <option value="원장">원장</option>
                        <option value="실장">실장</option>
                        <option value="스텝">스텝</option>
                        <option value="기타">기타</option>
                      </select>
                    </label>

                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-[13px] font-black text-slate-500">
                        휴대폰 번호
                      </span>
                      <input
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="010-1234-5678"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-bold text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      />
                      <span className="mt-2 block text-[12px] font-semibold text-slate-400">
                        디자인 확인서 문자 발송 기본 번호로 사용됩니다.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-[18px] font-black text-slate-950">치과 정보</h2>

                  <div className="mt-5 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-[13px] font-black text-slate-500">
                        치과명
                      </span>
                      <input
                        value={clinicName}
                        disabled
                        className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-[14px] font-bold text-slate-500"
                      />
                      <span className="mt-2 block text-[12px] font-semibold text-slate-400">
                        치과명 변경은 스마일캐드에 문의해주세요.
                      </span>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[13px] font-black text-slate-500">
                        치과 주소
                      </span>
                      <textarea
                        value={clinicAddress}
                        onChange={(event) => setClinicAddress(event.target.value)}
                        rows={3}
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-bold leading-6 text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-[18px] font-black text-slate-950">비밀번호 변경</h2>
                  <p className="mt-2 text-[13px] font-semibold text-slate-500">
                    비밀번호를 변경하지 않으려면 아래 칸은 비워두면 됩니다.
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className="mb-2 block text-[13px] font-black text-slate-500">
                        현재 비밀번호
                      </span>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-bold text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[13px] font-black text-slate-500">
                        새 비밀번호
                      </span>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-bold text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[13px] font-black text-slate-500">
                        새 비밀번호 확인
                      </span>
                      <input
                        type="password"
                        value={newPasswordConfirm}
                        onChange={(event) => setNewPasswordConfirm(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-bold text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-[15px] font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? '저장 중...' : '회원정보 저장'}
                </button>
              </div>

              <aside className="rounded-[24px] border border-blue-100 bg-blue-50 p-5">
                <h2 className="text-[17px] font-black text-blue-900">운영 안내</h2>
                <div className="mt-4 space-y-3 text-[13px] font-semibold leading-6 text-blue-800">
                  <p>아이디와 치과명은 주문 연결 기준값이라 직접 수정할 수 없습니다.</p>
                  <p>스텝 퇴사 등으로 담당자가 바뀐 경우 담당자명과 휴대폰 번호를 변경해주세요.</p>
                  <p>휴대폰 번호는 디자인 확인서 문자 발송 기본 번호로 사용됩니다.</p>
                  <p>치과명 변경이 필요하면 스마일캐드로 문의해주세요.</p>
                </div>
              </aside>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
