'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Clinic = {
  id: number
  loginId: string
  phone: string
  role: string
  clinicName: string
  clinicAddress: string
  createdAt: string | null
  updatedAt: string | null
}

const LIST_CLINICS_API_URL =
  process.env.NEXT_PUBLIC_NCP_LIST_CLINICS_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/list-clinics'

function formatDate(value: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatPhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '')

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  return value || '-'
}

export default function AdminClinicsPage() {
  const router = useRouter()

  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [searchText, setSearchText] = useState('')

  const readJsonSafely = async (res: Response) => {
    const text = await res.text()

    try {
      return text ? JSON.parse(text) : null
    } catch {
      throw new Error('API 응답이 JSON 형식이 아닙니다.')
    }
  }

  const loadClinics = async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const token = window.localStorage.getItem('smilecad_token') || ''

      if (!token) {
        router.replace('/login')
        return
      }

      const res = await fetch(LIST_CLINICS_API_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await readJsonSafely(res)

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || '치과 회원 목록을 불러오지 못했습니다.')
      }

      setClinics(Array.isArray(data.clinics) ? data.clinics : [])
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '치과 회원 목록을 불러오는 중 오류가 발생했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClinics()
  }, [])

  const filteredClinics = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) return clinics

    return clinics.filter((clinic) => {
      return [
        clinic.loginId,
        clinic.phone,
        clinic.clinicName,
        clinic.clinicAddress,
        clinic.role,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    })
  }, [clinics, searchText])

  const totalCount = clinics.length
  const filteredCount = filteredClinics.length

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-600">관리자</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              치과 회원 목록
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              플랫폼에 가입한 치과 계정과 프로필 정보를 확인합니다.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadClinics}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              새로고침
            </button>

            <button
              type="button"
              onClick={() => router.push('/orders')}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              주문 목록
            </button>
          </div>
        </div>

        <section className="mb-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">전체 치과 회원</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{totalCount}</p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">검색 결과</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{filteredCount}</p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">목록 기준</p>
            <p className="mt-3 text-base font-black text-slate-900">
              users + profiles
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">가입 치과</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                아이디, 치과명, 휴대폰 번호, 주소로 검색할 수 있습니다.
              </p>
            </div>

            <input
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="치과명, 아이디, 전화번호 검색"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white md:w-[320px]"
            />
          </div>

          {errorMessage ? (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm font-bold text-slate-500">
              치과 회원 목록을 불러오는 중입니다...
            </div>
          ) : filteredClinics.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm font-bold text-slate-500">
              표시할 치과 회원이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-200 px-4 py-3">가입일</th>
                    <th className="border-b border-slate-200 px-4 py-3">아이디</th>
                    <th className="border-b border-slate-200 px-4 py-3">치과명</th>
                    <th className="border-b border-slate-200 px-4 py-3">휴대폰 번호</th>
                    <th className="border-b border-slate-200 px-4 py-3">주소</th>
                    <th className="border-b border-slate-200 px-4 py-3">권한</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredClinics.map((clinic) => (
                    <tr key={clinic.id} className="text-sm font-semibold text-slate-700">
                      <td className="border-b border-slate-100 px-4 py-4">
                        {formatDate(clinic.createdAt)}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                          {clinic.loginId || '-'}
                        </span>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 font-black text-slate-900">
                        {clinic.clinicName || '-'}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        {formatPhone(clinic.phone)}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        <div className="max-w-[360px] truncate" title={clinic.clinicAddress}>
                          {clinic.clinicAddress || '-'}
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                          {clinic.role || 'clinic'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}