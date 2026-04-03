'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

type Profile = {
  id: string
  role: 'admin' | 'clinic'
  clinic_name: string | null
  clinic_address: string | null
  clinic_phone: string | null
}

type OrderItem = {
  id: string
  order_number: string
  clinic_name: string
  patient_name: string
  gender: string
  birth_date: string | null
  product_type: string
  selected_teeth: string[] | null
  delivery_date: string | null
  thickness: string | null
  jig_required: string | null
  request_note: string | null
  scan_file_names: string[] | null
  scan_file_paths: string[] | null
  design_file_names: string[] | null
  design_file_paths: string[] | null
  status: '접수 대기' | '디자인 작업중' | '배송중'
  created_at: string
  user_id: string
  user_role: string
  is_canceled: boolean
  canceled_at: string | null
  canceled_by: string | null
  cancel_reason: string | null
  admin_revision_requested: boolean
  admin_revision_requested_at: string | null
  admin_revision_request_note: string | null
  admin_revision_requested_by: string | null
}

export default function OrdersPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadOrders = async () => {
      try {
        setLoading(true)
        setError('')

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
          setError('프로필 정보를 불러오지 못했습니다.')
          return
        }

        if (!isMounted) return
        setProfile(profileData as Profile)

        let query = supabase
          .from('orders')
          .select(`
            id,
            order_number,
            clinic_name,
            patient_name,
            gender,
            birth_date,
            product_type,
            selected_teeth,
            delivery_date,
            thickness,
            jig_required,
            request_note,
            scan_file_names,
            scan_file_paths,
            design_file_names,
            design_file_paths,
            status,
            created_at,
            user_id,
            user_role,
            is_canceled,
            canceled_at,
            canceled_by,
            cancel_reason,
            admin_revision_requested,
            admin_revision_requested_at,
            admin_revision_request_note,
            admin_revision_requested_by
          `)
          .order('created_at', { ascending: false })

        if (profileData.role !== 'admin') {
          query = query.eq('user_id', user.id)
        }

        const { data: ordersData, error: ordersError } = await query

        if (ordersError) {
          setError('주문 목록을 불러오지 못했습니다.')
          return
        }

        if (!isMounted) return
        setOrders((ordersData as OrderItem[]) || [])
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setError('주문 목록 로딩 중 오류가 발생했습니다.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadOrders()

    return () => {
      isMounted = false
    }
  }, [router])

  const isAdmin = profile?.role === 'admin'

  const filteredOrders = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    if (!keyword) return orders

    return orders.filter((order) => {
      const targetText = [
        order.order_number,
        order.clinic_name,
        order.patient_name,
        order.product_type,
        order.status,
        order.delivery_date,
      ]
        .join(' ')
        .toLowerCase()

      return targetText.includes(keyword)
    })
  }, [orders, searchKeyword])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const goToDashboard = () => {
    router.push('/dashboard')
  }

  const goToOrderDetail = (orderId: string) => {
    router.push(`/orders/${orderId}`)
  }

  const goToNewOrder = () => {
    router.push('/orders/new')
  }

  const formatDate = (value: string | null) => {
    if (!value) return '-'

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'

    return new Intl.DateTimeFormat('ko-KR', {
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  }

  const formatDateTime = (value: string | null) => {
    if (!value) return '-'

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'

    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const renderStatusBadge = (order: OrderItem) => {
    if (order.is_canceled) {
      return (
        <span className="inline-flex rounded-md bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200">
          주문 취소
        </span>
      )
    }

    if (order.status === '접수 대기') {
      return (
        <span className="inline-flex rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
          접수 대기
        </span>
      )
    }

    if (order.status === '디자인 작업중') {
      return (
        <span className="inline-flex rounded-md bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 ring-1 ring-blue-200">
          디자인 작업중
        </span>
      )
    }

    return (
      <span className="inline-flex rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-200">
        배송중
      </span>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] px-6 py-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
          <p className="text-base text-slate-500">주문 목록을 불러오는 중입니다...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] px-6 py-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-red-200 bg-red-50 px-8 py-10 shadow-sm">
          <p className="text-base font-medium text-red-600">{error}</p>
        </div>
      </main>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 md:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold tracking-[0.2em] text-blue-600">
                  SMILECAD PLATFORM
                </p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                  {isAdmin ? '전체 주문 목록' : '내 주문 목록'}
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  {isAdmin
                    ? '치과에서 접수한 전체 주문을 확인하고 관리할 수 있습니다.'
                    : '내 치과에서 접수한 주문만 확인할 수 있습니다.'}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {!isAdmin && (
                  <button
                    onClick={goToNewOrder}
                    className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
                  >
                    신규 주문 등록
                  </button>
                )}

                <button
                  onClick={goToDashboard}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  대시보드
                </button>

                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 px-5 py-4 md:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900">
                  {isAdmin ? '전체 주문' : '내 주문'}
                </h2>
                <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-700">
                  총 {filteredOrders.length}건
                </span>
              </div>

              <div className="w-full max-w-md">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder={
                    isAdmin
                      ? '주문번호, 치과명, 환자명, 제품명 검색'
                      : '주문번호, 환자명, 제품명 검색'
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-6 py-4 font-bold">주문 번호</th>
                  <th className="px-6 py-4 font-bold">주문 일시</th>
                  <th className="px-6 py-4 font-bold">납기일</th>
                  <th className="px-6 py-4 font-bold">환자 이름 / 성별</th>
                  <th className="px-6 py-4 font-bold">유형</th>
                  {isAdmin && <th className="px-6 py-4 font-bold">치과</th>}
                  <th className="px-6 py-4 font-bold">주문 상태</th>
                  <th className="px-6 py-4 font-bold">상세</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 8 : 7}
                      className="px-6 py-16 text-center text-sm text-slate-500"
                    >
                      표시할 주문이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-5 font-semibold text-slate-900">
                        {order.order_number}
                      </td>
                      <td className="px-6 py-5 text-slate-600">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-5 text-slate-600">
                        {order.delivery_date || '-'}
                      </td>
                      <td className="px-6 py-5 text-slate-700">
                        <div className="font-medium text-slate-900">{order.patient_name || '-'}</div>
                        <div className="mt-1 text-xs text-slate-500">{order.gender || '-'}</div>
                      </td>
                      <td className="px-6 py-5 text-slate-700">{order.product_type || '-'}</td>
                      {isAdmin && (
                        <td className="px-6 py-5 text-slate-700">{order.clinic_name || '-'}</td>
                      )}
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap items-center gap-2">
                          {renderStatusBadge(order)}
                          {order.admin_revision_requested && !order.is_canceled && (
                            <span className="inline-flex rounded-md bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 ring-1 ring-rose-200">
                              수정 요청
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <button
                          onClick={() => goToOrderDetail(order.id)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          상세 보기
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 p-4 lg:hidden">
            {filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                표시할 주문이 없습니다.
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{order.order_number}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        등록일 {formatDateTime(order.created_at)}
                      </p>
                    </div>
                    {renderStatusBadge(order)}
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-800">환자명</span> :{' '}
                      {order.patient_name || '-'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">성별</span> :{' '}
                      {order.gender || '-'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">제품</span> :{' '}
                      {order.product_type || '-'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">납기일</span> :{' '}
                      {order.delivery_date || '-'}
                    </p>
                    {isAdmin && (
                      <p>
                        <span className="font-semibold text-slate-800">치과명</span> :{' '}
                        {order.clinic_name || '-'}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {order.admin_revision_requested && !order.is_canceled && (
                        <span className="inline-flex rounded-md bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 ring-1 ring-rose-200">
                          수정 요청
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => goToOrderDetail(order.id)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      상세 보기
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  )
}