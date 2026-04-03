'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  gender: string;
  birth_date: string;
  product_type: string;
  selected_teeth: string[] | null;
  delivery_date: string;
  thickness: string;
  jig_required: string;
  request_note: string | null;
  scan_file_names: string[] | null;
  scan_file_paths: string[] | null;
  design_file_names: string[] | null;
  design_file_paths: string[] | null;
  status: '접수 대기' | '디자인 작업중' | '배송중';
  created_at: string;
  user_id: string;
  user_role: string;
  is_canceled: boolean;
  canceled_at: string | null;
  canceled_by: string | null;
  cancel_reason: string | null;
  admin_revision_requested: boolean | null;
  admin_revision_requested_at: string | null;
  admin_revision_request_note: string | null;
  admin_revision_requested_by: string | null;
};

const ORDER_STATUSES: Array<OrderData['status']> = ['접수 대기', '디자인 작업중', '배송중'];

function formatDate(dateString?: string | null) {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDateOnly(dateString?: string | null) {
  if (!dateString) return '-';
  return dateString;
}

function safeArray(value: string[] | null | undefined) {
  if (!Array.isArray(value)) return [];
  return value;
}

function getSafeFileName(name: string) {
  return name.replace(/[^\w.\-]/g, '_').toLowerCase();
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const designFileInputRef = useRef<HTMLInputElement | null>(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingDesignFiles, setUploadingDesignFiles] = useState(false);
  const [sendingRevisionRequest, setSendingRevisionRequest] = useState(false);
  const [cancelingOrder, setCancelingOrder] = useState(false);

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderData['status']>('접수 대기');
  const [revisionRequestNote, setRevisionRequestNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const initializePage = async () => {
      try {
        setPageLoading(true);
        setStatusMessage('');
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

        let orderQuery = supabase.from('orders').select('*').eq('id', orderId);

        if (typedProfile.role !== 'admin') {
          orderQuery = orderQuery.eq('user_id', user.id);
        }

        const { data: order, error: orderError } = await orderQuery.single();

        if (orderError) {
          throw new Error('주문 정보를 불러오지 못했습니다.');
        }

        const typedOrder = order as OrderData;
        setOrderData(typedOrder);
        setSelectedStatus(typedOrder.status);
        setRevisionRequestNote(typedOrder.admin_revision_request_note ?? '');

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
          error instanceof Error ? error.message : '페이지를 불러오는 중 오류가 발생했습니다.';
        setErrorMessage(message);
      } finally {
        setPageLoading(false);
      }
    };

    if (orderId) {
      initializePage();
    }
  }, [orderId, router]);

  const isAdmin = profileData?.role === 'admin';
  const isClinic = profileData?.role === 'clinic';
  const canDownloadDesignFiles = !!profileData;
  const canUploadDesignFiles = !!profileData;

  const selectedTeethText = useMemo(() => {
    if (!orderData) return '-';

    const teeth = safeArray(orderData.selected_teeth);
    if (teeth.length === 0) return '-';

    return teeth.join(', ');
  }, [orderData]);

  const scanFileNames = safeArray(orderData?.scan_file_names);
  const scanFilePaths = safeArray(orderData?.scan_file_paths);
  const designFileNames = safeArray(orderData?.design_file_names);
  const designFilePaths = safeArray(orderData?.design_file_paths);

  const canCancelOrder = useMemo(() => {
    if (!orderData || !profileData) return false;
    if (orderData.is_canceled) return false;
    if (isAdmin) return true;
    if (isClinic && orderData.user_id === profileData.id && orderData.status === '접수 대기') {
      return true;
    }
    return false;
  }, [orderData, profileData, isAdmin, isClinic]);

  const resetMessages = () => {
    setStatusMessage('');
    setErrorMessage('');
  };

  const refreshOrderData = async () => {
    if (!orderId || !profileData) return;

    let query = supabase.from('orders').select('*').eq('id', orderId);

    if (profileData.role !== 'admin') {
      query = query.eq('user_id', profileData.id);
    }

    const { data, error } = await query.single();

    if (error) {
      throw new Error(error.message);
    }

    const typedOrder = data as OrderData;
    setOrderData(typedOrder);
    setSelectedStatus(typedOrder.status);
    setRevisionRequestNote(typedOrder.admin_revision_request_note ?? '');

    let notificationQuery = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('admin_revision_requested', true)
      .eq('is_canceled', false);

    if (profileData.role !== 'admin') {
      notificationQuery = notificationQuery.eq('user_id', profileData.id);
    }

    const { count } = await notificationQuery;
    setNotificationCount(count ?? 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handleChangeStatus = async () => {
    if (!isAdmin || !orderData) return;

    try {
      resetMessages();
      setActionLoading(true);

      const { error } = await supabase
        .from('orders')
        .update({
          status: selectedStatus,
        })
        .eq('id', orderData.id);

      if (error) {
        throw new Error(error.message);
      }

      await refreshOrderData();
      setStatusMessage('주문 상태가 변경되었습니다.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '상태 변경 중 오류가 발생했습니다.';
      setErrorMessage(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendRevisionRequest = async () => {
    if (!isAdmin || !orderData || !profileData) return;

    try {
      resetMessages();
      setSendingRevisionRequest(true);

      const note = revisionRequestNote.trim();

      const { error } = await supabase
        .from('orders')
        .update({
          admin_revision_requested: true,
          admin_revision_requested_at: new Date().toISOString(),
          admin_revision_request_note: note,
          admin_revision_requested_by: profileData.id,
        })
        .eq('id', orderData.id);

      if (error) {
        throw new Error(error.message);
      }

      await refreshOrderData();
      setStatusMessage('주문 수정 요청이 등록되었습니다.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '주문 수정 요청 등록 중 오류가 발생했습니다.';
      setErrorMessage(message);
    } finally {
      setSendingRevisionRequest(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderData || !profileData || !canCancelOrder) return;

    const confirmed = window.confirm('이 주문을 취소하시겠습니까?');
    if (!confirmed) return;

    try {
      resetMessages();
      setCancelingOrder(true);

      const updatePayload = {
        is_canceled: true,
        canceled_at: new Date().toISOString(),
        canceled_by: profileData.role,
        cancel_reason: cancelReason.trim() || (isAdmin ? '관리자 취소' : '치과 취소'),
      };

      let updateQuery = supabase.from('orders').update(updatePayload).eq('id', orderData.id);

      if (!isAdmin) {
        updateQuery = updateQuery.eq('user_id', profileData.id).eq('status', '접수 대기');
      }

      const { error } = await updateQuery;

      if (error) {
        throw new Error(error.message);
      }

      await refreshOrderData();
      setStatusMessage('주문이 취소되었습니다.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '주문 취소 중 오류가 발생했습니다.';
      setErrorMessage(message);
    } finally {
      setCancelingOrder(false);
    }
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      resetMessages();

      const { data, error } = await supabase.storage
        .from('order-files')
        .createSignedUrl(filePath, 60);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || '다운로드 URL 생성에 실패했습니다.');
      }

      const response = await fetch(data.signedUrl);

      if (!response.ok) {
        throw new Error('파일 다운로드에 실패했습니다.');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '파일 다운로드 중 오류가 발생했습니다.';
      setErrorMessage(message);
    }
  };

  const handleDownloadAllFiles = async (filePaths: string[], fileNames: string[]) => {
    if (filePaths.length === 0) return;

    for (let i = 0; i < filePaths.length; i += 1) {
      const path = filePaths[i];
      const name = fileNames[i] || `file_${i + 1}`;
      await handleDownloadFile(path, name);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  };

  const handleUploadDesignFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUploadDesignFiles || !orderData) return;

    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      resetMessages();
      setUploadingDesignFiles(true);

      const uploadedNames: string[] = [];
      const uploadedPaths: string[] = [];

      for (const file of Array.from(files)) {
        const safeName = getSafeFileName(file.name);
        const filePath = `${orderData.order_number}/designed/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('order-files')
          .upload(filePath, file, {
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        uploadedNames.push(file.name);
        uploadedPaths.push(filePath);
      }

      const updatePayload: Partial<OrderData> & {
        design_file_names: string[];
        design_file_paths: string[];
      } = {
        design_file_names: [...designFileNames, ...uploadedNames],
        design_file_paths: [...designFilePaths, ...uploadedPaths],
      };

      if (isClinic) {
        updatePayload.admin_revision_requested = false;
        updatePayload.admin_revision_requested_at = null;
        updatePayload.admin_revision_request_note = null;
        updatePayload.admin_revision_requested_by = null;
      }

      let updateQuery = supabase.from('orders').update(updatePayload).eq('id', orderData.id);

      if (!isAdmin && profileData?.id) {
        updateQuery = updateQuery.eq('user_id', profileData.id);
      }

      const { error: updateError } = await updateQuery;

      if (updateError) {
        throw new Error(updateError.message);
      }

      await refreshOrderData();
      setStatusMessage(
        isClinic
          ? '디자인 파일이 업로드되었습니다. 수정 요청 상태도 해제되었습니다.'
          : '디자인 파일이 업로드되었습니다.'
      );

      if (designFileInputRef.current) {
        designFileInputRef.current.value = '';
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '디자인 파일 업로드 중 오류가 발생했습니다.';
      setErrorMessage(message);
    } finally {
      setUploadingDesignFiles(false);
    }
  };

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
          주문 상세 정보를 불러오는 중입니다...
        </div>
      </main>
    );
  }

  if (!orderData || !profileData) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700 shadow-sm">
          {errorMessage || '주문 정보를 찾을 수 없습니다.'}
          <div className="mt-4">
            <Link
              href="/orders"
              className="inline-flex rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              주문목록으로 돌아가기
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="bg-[linear-gradient(180deg,#0f172a_0%,#0b1b49_100%)] px-5 py-8 text-white">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">주문 상세</h1>
            <p className="mt-2 text-base text-slate-300">
              {isAdmin ? '관리자 계정' : '치과 계정'}
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
            <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                  Header
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">주문 상세 페이지</h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                  {profileData.clinic_name || '계정'}
                </div>

                <Link
                  href="/orders"
                  className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
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
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                    주문 상세 정보
                  </h2>

                  {orderData.admin_revision_requested ? (
                    <span className="inline-flex rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
                      수정 요청
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 text-lg text-slate-600">
                  주문번호: {orderData.order_number}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex rounded-full px-5 py-2 text-sm font-semibold ${
                    orderData.is_canceled
                      ? 'bg-red-100 text-red-700'
                      : orderData.status === '접수 대기'
                        ? 'bg-blue-100 text-blue-700'
                        : orderData.status === '디자인 작업중'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {orderData.is_canceled ? '주문 취소' : orderData.status}
                </span>
              </div>
            </div>

            {statusMessage ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {statusMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {isClinic && orderData.admin_revision_requested ? (
              <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-red-800">관리자 수정 요청</h3>
                <p className="mt-3 text-sm text-red-700">
                  파일이 다르거나 열리지 않는 경우 등으로 수정 요청이 등록되었습니다.
                </p>
                <div className="mt-4 rounded-2xl bg-white/70 px-4 py-4 text-sm text-red-800">
                  <p className="font-semibold">요청 시간</p>
                  <p className="mt-1">{formatDate(orderData.admin_revision_requested_at)}</p>

                  <p className="mt-4 font-semibold">요청 메모</p>
                  <p className="mt-1 whitespace-pre-wrap">
                    {orderData.admin_revision_request_note?.trim()
                      ? orderData.admin_revision_request_note
                      : '별도 메모는 없습니다.'}
                  </p>
                </div>
                <p className="mt-4 text-sm text-red-700">
                  수정 파일을 다시 업로드하면 요청 상태가 자동으로 해제됩니다.
                </p>
              </div>
            ) : null}

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900">환자 정보</h3>
                <div className="mt-6 space-y-4 text-base text-slate-700">
                  <p>
                    <span className="font-semibold text-slate-900">치과명:</span>{' '}
                    {orderData.clinic_name}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">환자명:</span>{' '}
                    {orderData.patient_name}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">성별:</span>{' '}
                    {orderData.gender}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">생년월일:</span>{' '}
                    {formatDateOnly(orderData.birth_date)}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">등록일:</span>{' '}
                    {formatDate(orderData.created_at)}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900">제품 정보</h3>
                <div className="mt-6 space-y-4 text-base text-slate-700">
                  <p>
                    <span className="font-semibold text-slate-900">제품:</span>{' '}
                    {orderData.product_type}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">납기일:</span>{' '}
                    {formatDateOnly(orderData.delivery_date)}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">두께:</span>{' '}
                    {orderData.thickness}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">지그 제작:</span>{' '}
                    {orderData.jig_required}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">치식:</span>{' '}
                    {selectedTeethText}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-2xl font-bold text-slate-900">업로드 파일</h3>

                {isAdmin && scanFilePaths.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleDownloadAllFiles(scanFilePaths, scanFileNames)}
                    className="inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    전체 파일 다운로드
                  </button>
                ) : null}
              </div>

              {!isAdmin ? (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  스캔 원본 파일 다운로드는 관리자 계정에서만 가능합니다.
                </div>
              ) : null}

              <div className="mt-6 space-y-3">
                {scanFilePaths.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    업로드된 스캔 파일이 없습니다.
                  </div>
                ) : (
                  scanFilePaths.map((filePath, index) => {
                    const fileName = scanFileNames[index] || `scan_file_${index + 1}`;

                    return (
                      <div
                        key={`${filePath}-${index}`}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-base text-slate-800">{fileName}</p>
                        </div>

                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(filePath, fileName)}
                            className="inline-flex shrink-0 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                          >
                            개별 다운로드
                          </button>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">디자인 파일</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    관리자와 치과 모두 STL 또는 ZIP 파일을 업로드하고 다운로드할 수 있습니다.
                  </p>
                </div>

                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                  {canUploadDesignFiles ? (
                    <input
                      ref={designFileInputRef}
                      type="file"
                      accept=".stl,.zip,.STL,.ZIP"
                      multiple
                      onChange={handleUploadDesignFiles}
                      className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
                      disabled={uploadingDesignFiles}
                    />
                  ) : null}

                  {canDownloadDesignFiles && designFilePaths.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => handleDownloadAllFiles(designFilePaths, designFileNames)}
                      className="inline-flex shrink-0 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      전체 다운로드
                    </button>
                  ) : null}
                </div>
              </div>

              {isAdmin ? (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-700">
                  관리자 계정은 디자인 STL 파일을 업로드하고 다운로드할 수 있습니다.
                </div>
              ) : isClinic ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                  치과 계정도 디자인 STL 파일을 직접 업로드하고 다운로드할 수 있습니다.
                </div>
              ) : null}

              {uploadingDesignFiles ? (
                <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  디자인 파일 업로드 중입니다...
                </div>
              ) : null}

              <div className="mt-6 space-y-3">
                {designFilePaths.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    아직 업로드된 디자인 파일이 없습니다.
                  </div>
                ) : (
                  designFilePaths.map((filePath, index) => {
                    const fileName = designFileNames[index] || `design_file_${index + 1}`;

                    return (
                      <div
                        key={`${filePath}-${index}`}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-base text-slate-800">{fileName}</p>
                        </div>

                        {canDownloadDesignFiles ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(filePath, fileName)}
                            className="inline-flex shrink-0 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                          >
                            개별 다운로드
                          </button>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {isAdmin ? (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900">주문 수정 요청</h3>
                <p className="mt-3 text-sm text-slate-500">
                  파일이 다르거나 열리지 않는 경우 치과 측에 바로 수정 요청을 보낼 수 있습니다.
                </p>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    요청 메모
                  </label>
                  <textarea
                    value={revisionRequestNote}
                    onChange={(e) => setRevisionRequestNote(e.target.value)}
                    rows={4}
                    placeholder="예: 상악 STL 파일이 열리지 않습니다. 파일 다시 확인 후 재업로드 부탁드립니다."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSendRevisionRequest}
                    disabled={sendingRevisionRequest}
                    className="inline-flex rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
                  >
                    {sendingRevisionRequest ? '요청 전송 중...' : '주문 수정 요청'}
                  </button>

                  {orderData.admin_revision_requested ? (
                    <span className="text-sm text-slate-500">
                      현재 수정 요청이 등록된 상태입니다. 마지막 요청 시간:{' '}
                      {formatDate(orderData.admin_revision_requested_at)}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-bold text-slate-900">주문 취소</h3>
              <p className="mt-3 text-sm text-slate-500">
                관리자 계정은 언제든 취소할 수 있고, 치과 계정은 접수 대기 상태에서만 자기 주문을 취소할 수 있습니다.
              </p>

              {orderData.is_canceled ? (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                  이미 취소된 주문입니다.
                  <div className="mt-2">
                    취소 시간: {formatDate(orderData.canceled_at)} / 취소 주체:{' '}
                    {orderData.canceled_by || '-'}
                  </div>
                  <div className="mt-1">취소 사유: {orderData.cancel_reason || '-'}</div>
                </div>
              ) : (
                <>
                  <div className="mt-6">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      취소 사유
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                      placeholder="예: 환자 일정 변경으로 주문 취소"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500"
                      disabled={!canCancelOrder}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCancelOrder}
                      disabled={cancelingOrder || !canCancelOrder}
                      className="inline-flex rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                    >
                      {cancelingOrder ? '취소 처리 중...' : '주문 취소'}
                    </button>

                    {!canCancelOrder ? (
                      <span className="text-sm text-slate-500">
                        {isClinic
                          ? '치과 계정은 자기 주문이면서 접수 대기 상태일 때만 취소할 수 있습니다.'
                          : '현재 이 주문은 취소할 수 없습니다.'}
                      </span>
                    ) : null}
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-bold text-slate-900">요청사항</h3>
              <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-5 text-base text-slate-700">
                {orderData.request_note?.trim() ? orderData.request_note : '요청사항이 없습니다.'}
              </div>
            </div>

            {isAdmin ? (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900">관리자 상태 변경</h3>

                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as OrderData['status'])}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500 sm:max-w-xs"
                    disabled={orderData.is_canceled}
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleChangeStatus}
                    disabled={actionLoading || orderData.is_canceled}
                    className="inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    {actionLoading ? '변경 중...' : '상태 변경 저장'}
                  </button>
                </div>

                {orderData.is_canceled ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    취소된 주문은 상태를 변경할 수 없습니다.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}