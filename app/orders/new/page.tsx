'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type ProfileData = {
  id: string;
  role: 'admin' | 'clinic';
  clinic_name: string | null;
};

type StepType = 1 | 2 | 3;

type ProductType =
  | 'NT-TAINER'
  | 'NT-SPACER'
  | 'NT-Regainer'
  | 'NT-Lingual arch'
  | 'NT-Uprighter';

type GenderType = '남' | '여';

type JigType = 'Yes' | 'No';

const PRODUCT_OPTIONS: ProductType[] = [
  'NT-TAINER',
  'NT-SPACER',
  'NT-Regainer',
  'NT-Lingual arch',
  'NT-Uprighter',
];

const THICKNESS_OPTIONS = [
  '0.011inch(0.30mm)',
  '0.013inch(0.35mm)',
  '0.015inch(0.40mm)',
  '0.016inch(0.43mm)',
  '0.021inch(0.55mm)',
];

const PERMANENT_UPPER = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
const PERMANENT_LOWER = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];
const PRIMARY_UPPER = ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65'];
const PRIMARY_LOWER = ['85', '84', '83', '82', '81', '71', '72', '73', '74', '75'];

function generateOrderNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  return `ORD-${yyyy}${mm}${dd}-${hh}${min}${sec}`;
}

function getSafeFileName(name: string) {
  return name.replace(/[^\w.\-]/g, '_').toLowerCase();
}

function isAllowedFile(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith('.stl') || name.endsWith('.dcm') || name.endsWith('.zip');
}

function buttonBase(active: boolean) {
  return [
    'rounded-2xl border px-4 py-3 text-sm font-semibold transition',
    active
      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50',
  ].join(' ');
}

function stepCardClass(active: boolean, done: boolean) {
  if (active) {
    return 'border-blue-600 bg-blue-50 text-blue-700';
  }

  if (done) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border-slate-200 bg-white text-slate-500';
}

export default function NewOrderPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [currentStep, setCurrentStep] = useState<StepType>(1);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [orderNumber, setOrderNumber] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [gender, setGender] = useState<GenderType>('남');
  const [birthDate, setBirthDate] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [productType, setProductType] = useState<ProductType>('NT-TAINER');
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [thickness, setThickness] = useState('0.013inch(0.35mm)');
  const [jigRequired, setJigRequired] = useState<JigType>('No');
  const [requestNote, setRequestNote] = useState('');

  useEffect(() => {
    const initializePage = async () => {
      try {
        setPageLoading(true);
        setErrorMessage('');
        setStatusMessage('');

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

        setOrderNumber(generateOrderNumber());
        setClinicName(typedProfile.clinic_name ?? '');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '주문 등록 페이지를 불러오는 중 오류가 발생했습니다.';
        setErrorMessage(message);
      } finally {
        setPageLoading(false);
      }
    };

    initializePage();
  }, [router]);

  const selectedFileNames = useMemo(() => {
    return selectedFiles.map((file) => file.name);
  }, [selectedFiles]);

  const selectedTeethText = useMemo(() => {
    if (selectedTeeth.length === 0) return '-';
    return [...selectedTeeth].sort().join(', ');
  }, [selectedTeeth]);

  const resetMessages = () => {
    setStatusMessage('');
    setErrorMessage('');
  };

  const toggleTooth = (tooth: string) => {
    setSelectedTeeth((prev) => {
      if (prev.includes(tooth)) {
        return prev.filter((item) => item !== tooth);
      }
      return [...prev, tooth];
    });
  };

  const handleFileAdd = (files: FileList | File[]) => {
    resetMessages();

    const nextFiles = Array.from(files);
    const invalidFiles = nextFiles.filter((file) => !isAllowedFile(file));

    if (invalidFiles.length > 0) {
      setErrorMessage('STL, DCM, ZIP 파일만 업로드할 수 있습니다.');
      return;
    }

    setSelectedFiles((prev) => {
      const merged = [...prev];

      for (const file of nextFiles) {
        const alreadyExists = merged.some(
          (existing) => existing.name === file.name && existing.size === file.size
        );

        if (!alreadyExists) {
          merged.push(file);
        }
      }

      return merged;
    });
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    handleFileAdd(event.target.files);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileRemove = (targetIndex: number) => {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== targetIndex));
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    if (!event.dataTransfer.files || event.dataTransfer.files.length === 0) return;
    handleFileAdd(event.dataTransfer.files);
  };

  const validateStep1 = () => {
    if (!orderNumber.trim()) {
      setErrorMessage('주문번호를 확인해주세요.');
      return false;
    }

    if (!clinicName.trim()) {
      setErrorMessage('치과명을 입력해주세요.');
      return false;
    }

    if (!patientName.trim()) {
      setErrorMessage('환자명을 입력해주세요.');
      return false;
    }

    if (!birthDate) {
      setErrorMessage('생년월일을 입력해주세요.');
      return false;
    }

    if (selectedFiles.length === 0) {
      setErrorMessage('스캔 파일을 최소 1개 이상 업로드해주세요.');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (!productType) {
      setErrorMessage('제품을 선택해주세요.');
      return false;
    }

    if (selectedTeeth.length === 0) {
      setErrorMessage('치식을 하나 이상 선택해주세요.');
      return false;
    }

    if (!deliveryDate) {
      setErrorMessage('납기일을 선택해주세요.');
      return false;
    }

    if (!thickness) {
      setErrorMessage('두께를 선택해주세요.');
      return false;
    }

    if (!jigRequired) {
      setErrorMessage('지그 제작 여부를 선택해주세요.');
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    resetMessages();

    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!validateStep2()) return;
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    resetMessages();

    if (currentStep === 2) {
      setCurrentStep(1);
      return;
    }

    if (currentStep === 3) {
      setCurrentStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!profileData) return;

    resetMessages();

    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }

    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }

    try {
      setSaving(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session?.user) {
        throw new Error('로그인 정보를 확인할 수 없습니다.');
      }

      const user = session.user;

      const uploadedFileNames: string[] = [];
      const uploadedFilePaths: string[] = [];

      for (const file of selectedFiles) {
        const safeName = getSafeFileName(file.name);
        const filePath = `${orderNumber}/scan/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('order-files')
          .upload(filePath, file, {
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        uploadedFileNames.push(file.name);
        uploadedFilePaths.push(filePath);
      }

      const insertPayload = {
        order_number: orderNumber,
        clinic_name: clinicName.trim(),
        patient_name: patientName.trim(),
        gender,
        birth_date: birthDate,
        product_type: productType,
        selected_teeth: selectedTeeth,
        delivery_date: deliveryDate,
        thickness,
        jig_required: jigRequired,
        request_note: requestNote.trim(),
        scan_file_names: uploadedFileNames,
        scan_file_paths: uploadedFilePaths,
        status: '접수 대기',
        user_id: user.id,
        user_role: profileData.role,
        is_canceled: false,
      };

      const { data, error } = await supabase
        .from('orders')
        .insert(insertPayload)
        .select('id')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setStatusMessage('주문이 정상적으로 등록되었습니다.');

      const insertedId = data?.id;
      if (insertedId) {
        router.push(`/orders/${insertedId}`);
        return;
      }

      router.push('/orders');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '주문 저장 중 오류가 발생했습니다.';
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
          주문 등록 페이지를 불러오는 중입니다...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="bg-[linear-gradient(180deg,#0f172a_0%,#0b1b49_100%)] px-5 py-8 text-white">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">신규 주문 등록</h1>
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
              href="/orders"
              className="block rounded-2xl bg-white/10 px-4 py-4 text-base font-semibold text-white transition hover:bg-white/15"
            >
              주문목록으로
            </Link>

            <button
              type="button"
              onClick={() => router.back()}
              className="block w-full rounded-2xl bg-white/10 px-4 py-4 text-base font-semibold text-white transition hover:bg-white/15"
            >
              이전 페이지로
            </button>
          </div>
        </aside>

        <section className="px-4 py-6 md:px-8 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">신규 주문 등록</h2>
              <p className="mt-3 text-lg text-slate-600">
                환자 정보 입력부터 제품 선택, 최종 확인까지 단계별로 주문을 등록합니다.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`rounded-3xl border p-5 text-left transition ${stepCardClass(
                    currentStep === 1,
                    currentStep > 1
                  )}`}
                >
                  <p className="text-sm font-semibold">1단계</p>
                  <p className="mt-2 text-xl font-bold">환자 정보</p>
                  <p className="mt-2 text-sm">주문번호, 환자정보, 파일 업로드</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setCurrentStep(2);
                  }}
                  className={`rounded-3xl border p-5 text-left transition ${stepCardClass(
                    currentStep === 2,
                    currentStep > 2
                  )}`}
                >
                  <p className="text-sm font-semibold">2단계</p>
                  <p className="mt-2 text-xl font-bold">제품 / 옵션</p>
                  <p className="mt-2 text-sm">제품, 치식, 납기일, 옵션 선택</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1() && validateStep2()) setCurrentStep(3);
                  }}
                  className={`rounded-3xl border p-5 text-left transition ${stepCardClass(
                    currentStep === 3,
                    false
                  )}`}
                >
                  <p className="text-sm font-semibold">3단계</p>
                  <p className="mt-2 text-xl font-bold">최종 확인</p>
                  <p className="mt-2 text-sm">입력 내용 확인 후 최종 접수</p>
                </button>
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

            {currentStep === 1 ? (
              <div className="mt-6 space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-bold text-slate-900">1단계 · 환자 정보</h3>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        주문번호
                      </label>
                      <input
                        type="text"
                        value={orderNumber}
                        readOnly
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        치과명
                      </label>
                      <input
                        type="text"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        placeholder="치과명을 입력해주세요"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        환자명
                      </label>
                      <input
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="환자명을 입력해주세요"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        생년월일
                      </label>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="mb-3 text-sm font-semibold text-slate-700">성별</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setGender('남')}
                        className={buttonBase(gender === '남')}
                      >
                        남
                      </button>
                      <button
                        type="button"
                        onClick={() => setGender('여')}
                        className={buttonBase(gender === '여')}
                      >
                        여
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">스캔 파일 업로드</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        STL / DCM / ZIP 파일 업로드 가능
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      파일 선택
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".stl,.dcm,.zip,.STL,.DCM,.ZIP"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`mt-6 rounded-3xl border-2 border-dashed px-6 py-12 text-center transition ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    <p className="text-lg font-semibold text-slate-800">
                      파일을 여기로 드래그해서 업로드하세요
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      또는 위의 파일 선택 버튼으로 업로드할 수 있습니다.
                    </p>
                  </div>

                  <div className="mt-6 space-y-3">
                    {selectedFiles.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                        아직 선택된 파일이 없습니다.
                      </div>
                    ) : (
                      selectedFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${file.size}-${index}`}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-base font-medium text-slate-800">
                              {file.name}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleFileRemove(index)}
                            className="inline-flex shrink-0 rounded-2xl bg-red-100 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-200"
                          >
                            삭제
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="mt-6 space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-bold text-slate-900">2단계 · 제품 / 옵션 선택</h3>

                  <div className="mt-6">
                    <p className="mb-3 text-sm font-semibold text-slate-700">제품 선택</p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      {PRODUCT_OPTIONS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setProductType(item)}
                          className={buttonBase(productType === item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-bold text-slate-900">치식 선택</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    원하는 치식을 버튼으로 선택하거나 해제할 수 있습니다.
                  </p>

                  <div className="mt-6 space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <h4 className="text-lg font-bold text-slate-900">영구치</h4>

                      <div className="mt-5 space-y-5">
                        <div>
                          <p className="mb-3 text-center text-sm font-semibold text-slate-600">
                            상악
                          </p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {PERMANENT_UPPER.map((tooth) => (
                              <button
                                key={tooth}
                                type="button"
                                onClick={() => toggleTooth(tooth)}
                                className={`min-w-[52px] rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                                  selectedTeeth.includes(tooth)
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                                }`}
                              >
                                {tooth}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="mb-3 text-center text-sm font-semibold text-slate-600">
                            하악
                          </p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {PERMANENT_LOWER.map((tooth) => (
                              <button
                                key={tooth}
                                type="button"
                                onClick={() => toggleTooth(tooth)}
                                className={`min-w-[52px] rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                                  selectedTeeth.includes(tooth)
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                                }`}
                              >
                                {tooth}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <h4 className="text-lg font-bold text-slate-900">유치</h4>

                      <div className="mt-5 space-y-5">
                        <div>
                          <p className="mb-3 text-center text-sm font-semibold text-slate-600">
                            상악
                          </p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {PRIMARY_UPPER.map((tooth) => (
                              <button
                                key={tooth}
                                type="button"
                                onClick={() => toggleTooth(tooth)}
                                className={`min-w-[52px] rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                                  selectedTeeth.includes(tooth)
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                                }`}
                              >
                                {tooth}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="mb-3 text-center text-sm font-semibold text-slate-600">
                            하악
                          </p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {PRIMARY_LOWER.map((tooth) => (
                              <button
                                key={tooth}
                                type="button"
                                onClick={() => toggleTooth(tooth)}
                                className={`min-w-[52px] rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                                  selectedTeeth.includes(tooth)
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                                }`}
                              >
                                {tooth}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-700">
                      선택된 치식: {selectedTeethText}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        납기일
                      </label>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="mb-3 text-sm font-semibold text-slate-700">두께 선택</p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      {THICKNESS_OPTIONS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setThickness(item)}
                          className={buttonBase(thickness === item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-700">지그 제작 여부</p>
                      <span className="text-sm font-semibold text-red-500">
                        (제작시 5000원 추가 비용 발생)
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setJigRequired('Yes')}
                        className={buttonBase(jigRequired === 'Yes')}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setJigRequired('No')}
                        className={buttonBase(jigRequired === 'No')}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      요청사항
                    </label>
                    <textarea
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      rows={5}
                      placeholder=""
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500"
                    />
                    <p className="mt-3 text-sm text-slate-500">
                      예시: #14,24 missing 되어있어요 / 교합 가능한 선에서 최대한 치은 or 절단측으로 제작해주세요
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="mt-6 space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-bold text-slate-900">3단계 · 최종 확인</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    입력한 정보를 확인한 뒤 최종 접수 버튼을 눌러주세요.
                  </p>

                  <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <h4 className="text-xl font-bold text-slate-900">환자 정보</h4>
                      <div className="mt-4 space-y-3 text-sm text-slate-700">
                        <p>
                          <span className="font-semibold text-slate-900">주문번호:</span> {orderNumber}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">치과명:</span> {clinicName || '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">환자명:</span> {patientName || '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">성별:</span> {gender}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">생년월일:</span> {birthDate || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <h4 className="text-xl font-bold text-slate-900">제품 정보</h4>
                      <div className="mt-4 space-y-3 text-sm text-slate-700">
                        <p>
                          <span className="font-semibold text-slate-900">제품:</span> {productType}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">치식:</span> {selectedTeethText}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">납기일:</span> {deliveryDate || '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">두께:</span> {thickness}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">지그 제작:</span> {jigRequired}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <h4 className="text-xl font-bold text-slate-900">업로드 파일</h4>
                    <div className="mt-4 space-y-3">
                      {selectedFileNames.length === 0 ? (
                        <div className="text-sm text-slate-500">업로드 파일이 없습니다.</div>
                      ) : (
                        selectedFileNames.map((name, index) => (
                          <div
                            key={`${name}-${index}`}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          >
                            {name}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <h4 className="text-xl font-bold text-slate-900">요청사항</h4>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm whitespace-pre-wrap text-slate-700">
                      {requestNote.trim() ? requestNote : '요청사항이 없습니다.'}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    이전 단계
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    다음 단계
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    {saving ? '접수 저장 중...' : '최종 접수'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}