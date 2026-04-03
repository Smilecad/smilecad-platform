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

type OrderRow = {
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

export default function DashboardPage() {
  const router = useRouter();

  const [pageLoading, setPageLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

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
            'id, order_number, clinic_name, patient_name, product_type, delivery_date, status, created_at, user_id, is_canceled, admin_revision_requested'
          )
          .order('created_at', { ascending: false })
          .limit(8);

        if (typedProfile.role !== 'admin') {
          query = query.eq('user_id', user.id);
        }

        const { data: orderRows, error: orderError } = await query;

        if (orderError) {
          throw new Error(orderError.message);
        }

        setOrders((orderRows ?? []) as OrderRow[]);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '대시보드를 불러오는 중 오류가 발생했습니다.';
        setErrorMessage(message);
      } finally {
        setPageLoading(false);
      }
    };

    initializePage();
  }, [router]);

  const dashboardStats = useMemo(() => {
    const activeOrders = orders.filter((order) => !order.is_canceled);
    const waitingCount = activeOrders.filter((order) => order.status === '접수 대기').length;
    const designingCount = activeOrders.filter((order) => order.status === '디자인 작업중').length;
    const shippingCount = activeOrders.filter((order) => order.status === '배송중').length;
    const canceledCount = orders.filter((order) => order.is_canceled).length;
    const revisionCount = activeOrders.filter((order) => order.admin_revision_requested).length;

    return {
      totalCount: orders.length,
      waitingCount,
      designingCount,
      shippingCount,
      canceledCount,
      revisionCount,
    };
  }, [orders]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
          대시보드를 불러오는 중입니다...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="bg-[linear-gradient(180deg,#0f172a_0%,#0b1b49_100%)] px-5 py-8 text-white">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">대시보드</h1>
            <p className="mt-2 text-base text-slate-300">
              {profileData?.role === 'admin' ? '관리자 계정' : '치과 계정'}
            </p>
          </div>

          <div className="mt-10 space-y-3">
            <Link
              href="/dashboard"
              className="block rounded-2xl bg-white/15 px-4 py-4 text-base font-semibold text-white"
            >
              대시보드
            </Link>

            <Link
              href="/orders"
              className="block rounded-2xl bg-white/10 px-4 py-4 text-base font-semibold text-white transition hover:bg-white/15"
            >
              주문목록으로
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
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                SmileCAD Platform
              </p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
                안녕하세요, {profileData?.clinic_name || '사용자'}님
              </h2>
              <p className="mt-3 text-lg text-slate-600">
                {profileData?.role === 'admin'
                  ? '전체 주문을 관리하고 상태를 확인할 수 있습니다.'
                  : '내 치과에서 등록한 주문 현황을 한눈에 확인할 수 있습니다.'}
              </p>
            </div>

            {errorMessage ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">최근 주문 수</p>
                <p className="mt-3 text-4xl font-bold text-slate-900">
                  {dashboardStats.totalCount}
                </p>
                <p className="mt-2 text-sm text-slate-500">최근 불러온 주문 기준</p>
              </div>

              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
                <p className="text-sm font-semibold text-blue-700">접수 대기</p>
                <p className="mt-3 text-4xl font-bold text-blue-800">
                  {dashboardStats.waitingCount}
                </p>
                <p className="mt-2 text-sm text-blue-700">처리 시작 전 주문</p>
              </div>

              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <p className="text-sm font-semibold text-amber-700">디자인 작업중</p>
                <p className="mt-3 text-4xl font-bold text-amber-800">
                  {dashboardStats.designingCount}
                </p>
                <p className="mt-2 text-sm text-amber-700">디자인 진행 중 주문</p>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                <p className="text-sm font-semibold text-emerald-700">배송중</p>
                <p className="mt-3 text-4xl font-bold text-emerald-800">
                  {dashboardStats.shippingCount}
                </p>
                <p className="mt-2 text-sm text-emerald-700">출고 진행 주문</p>
              </div>

              <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
                <p className="text-sm font-semibold text-red-700">수정 요청</p>
                <p className="mt-3 text-4xl font-bold text-red-800">
                  {dashboardStats.revisionCount}
                </p>
                <p className="mt-2 text-sm text-red-700">확인 필요한 주문</p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-600">주문 취소</p>
                <p className="mt-3 text-4xl font-bold text-slate-800">
                  {dashboardStats.canceledCount}
                </p>
                <p className="mt-2 text-sm text-slate-600">취소 처리된 주문</p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">최근 주문</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      최근 등록된 주문을 빠르게 확인할 수 있습니다.
                    </p>
                  </div>

                  <Link
                    href="/orders"
                    className="inline-flex rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    전체 주문 보기
                  </Link>
                </div>

                <div className="mt-6 space-y-3">
                  {orders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                      아직 등록된 주문이 없습니다.
                    </div>
                  ) : (
                    orders.map((order) => (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-base font-bold text-slate-900">
                                {order.order_number}
                              </p>

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

                            <p className="mt-2 text-sm text-slate-600">
                              치과명: {order.clinic_name} / 환자명: {order.patient_name}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              제품: {order.product_type} / 납기일: {order.delivery_date}
                            </p>
                          </div>

                          <div className="flex flex-col items-start gap-2 lg:items-end">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                order.is_canceled
                                  ? 'bg-slate-200 text-slate-700'
                                  : order.status === '접수 대기'
                                    ? 'bg-blue-100 text-blue-700'
                                    : order.status === '디자인 작업중'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {order.is_canceled ? '주문 취소' : order.status}
                            </span>

                            <p className="text-xs text-slate-500">
                              등록일: {formatDate(order.created_at)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-bold text-slate-900">빠른 이동</h3>
                  <div className="mt-6 grid gap-3">
                    <Link
                      href="/orders/new"
                      className="rounded-2xl bg-emerald-500 px-4 py-4 text-center text-base font-semibold text-white transition hover:bg-emerald-600"
                    >
                      신규 주문 등록
                    </Link>

                    <Link
                      href="/orders"
                      className="rounded-2xl bg-blue-600 px-4 py-4 text-center text-base font-semibold text-white transition hover:bg-blue-700"
                    >
                      주문 목록 보기
                    </Link>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-bold text-slate-900">운영 안내</h3>
                  <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
                    <p>
                      접수 대기 상태의 주문은 확인 후 디자인 작업중으로 변경할 수 있습니다.
                    </p>
                    <p>
                      수정 요청이 있는 주문은 주문 상세에서 내용을 확인하고 STL 파일을 다시 업로드하면 됩니다.
                    </p>
                    <p>
                      치과 계정은 본인 주문만 조회할 수 있고, 접수 대기 상태 주문만 취소할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}