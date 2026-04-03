'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type ProfileData = {
  id: string;
  role: 'admin' | 'clinic';
  clinic_name: string | null;
};

type OrderData = {
  id: string;
  order_number: string;
  clinic_name: string;
  patient_name: string;
  product_type: string;
  delivery_date: string;
  status: '접수 대기' | '디자인 작업중' | '배송중';
  created_at: string;
  user_id: string;
  is_canceled: boolean;
  admin_revision_requested: boolean | null;
  admin_revision_requested_at: string | null;
};

function formatDate(dateString?: string | null) {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function OrdersPage() {
  const router = useRouter();

  const [pageLoading, setPageLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const initializePage = async () => {
      try {
        setPageLoading(true);
        setErrorMessage('');

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        if (!session?.user) {
          router.replace('/login');
          return;
        }

        const user = session.user;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, clinic_name')
          .eq('id', user.id)
          .single();

        if (profileError) {
          throw new Error(profileError.message);
        }

        const typedProfile = profile as ProfileData;
        setProfileData(typedProfile);

        let query = supabase
          .from('orders')
          .select(
            'id, order_number, clinic_name, patient_name, product_type, delivery_date, status, created_at, user_id, is_canceled, admin_revision_requested, admin_revision_requested_at'
          )
          .order('created_at', { ascending: false });

        if (typedProfile.role !== 'admin') {
          query = query.eq('user_id', user.id);
        }

        const { data: orderRows, error: orderError } = await query;

        if (orderError) {
          throw new Error(orderError.message);
        }

        setOrders((orderRows ?? []) as OrderData[]);

        let notificationQuery = supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('admin_revision_requested', true)
          .eq('is_canceled', false);

        if (typedProfile.role !== 'admin') {
          notificationQuery = notificationQuery.eq('user_id', user.id);
        }

        const { count, error: notificationError } = await notificationQuery;

        if (notificationError) {
          throw new Error(notificationError.message);
        }

        setNotificationCount(count ?? 0);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '주문 목록을 불러오는 중 오류가 발생했습니다.';
        setErrorMessage(message);
      } finally {
        setPageLoading(false);
      }
    };

    initializePage();
  }, [router]);

  const filteredOrders = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return orders;

    return orders.filter((order) => {
      return (
        order.order_number.toLowerCase().includes(keyword) ||
        order.clinic_name.toLowerCase().includes(keyword) ||
        order.patient_name.toLowerCase().includes(keyword) ||
        order.product_type.toLowerCase().includes(keyword)
      );
    });
  }, [orders, searchKeyword]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
          주문 목록을 불러오는 중입니다...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="bg-[linear-gradient(180deg,#0f172a_0%,#0b1b49_100%)] px-5 py-8 text-white">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">주문 목록</h1>
            <p className="mt-2 text-base text-slate-300">
              {profileData?.role === 'admin' ? '관리자 계정' : '치과 계정'}
            </p>
          </div>

          <div className="mt-10 space-y-3">
            <Link
              href="/dashboard"
              className="block rounded-2xl bg-white/10 px-4 py-4 text-base font-semibold text-white transition hover:bg-white/15"
            >
              메인페이지로
            </Link>

            <Link
              href="/orders/new"
              className="block rounded-2xl bg-emerald-500 px-4 py-4 text-base font-semibold text-white transition hover:bg-emerald-600"
            >
              신규 주문 등록
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="block w-full rounded-2xl bg-red-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-red-700"
            >
              로그아웃
            </button>
          </div>
        </aside>

        <section className="px-4 py-6 md:px-8 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                  Header
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">주문 목록 페이지</h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                  {profileData?.clinic_name || '계정'}
                </div>

                <div className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  알림
                  {notificationCount > 0 ? (
                    <span className="ml-2 inline-flex min-w-6 justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                      {notificationCount}
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex min-w-6 justify-center rounded-full bg-slate-300 px-2 py-0.5 text-xs font-bold text-slate-700">
                      0
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-4xl font-bold tracking-tight text-slate-900">주문 목록</h2>
                <p className="mt-3 text-lg text-slate-600">
                  {profileData?.role === 'admin'
                    ? '전체 주문을 확인하고 관리할 수 있습니다.'
                    : '내 치과에서 등록한 주문만 확인할 수 있습니다.'}
                </p>
              </div>

              <div className="w-full max-w-md">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="주문번호, 치과명, 환자명, 제품명 검색"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {errorMessage ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                        주문번호
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                        치과명
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                        환자명
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                        제품
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                        납기일
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                        상태
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                        등록일
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                        보기
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                          표시할 주문이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order.id} className="border-t border-slate-100">
                          <td className="px-5 py-4 text-sm text-slate-800">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{order.order_number}</span>
                              {order.admin_revision_requested ? (
                                <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                                  수정 요청
                                </span>
                              ) : null}
                              {order.is_canceled ? (
                                <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                  취소
                                </span>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">{order.clinic_name}</td>
                          <td className="px-5 py-4 text-sm text-slate-700">{order.patient_name}</td>
                          <td className="px-5 py-4 text-sm text-slate-700">{order.product_type}</td>
                          <td className="px-5 py-4 text-sm text-slate-700">{order.delivery_date}</td>
                          <td className="px-5 py-4 text-sm text-slate-700">
                            {order.is_canceled ? '주문 취소' : order.status}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-700">
                            {formatDate(order.created_at)}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-700">
                            <Link
                              href={`/orders/${order.id}`}
                              className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                            >
                              상세보기
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}