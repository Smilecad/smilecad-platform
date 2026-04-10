'use client'

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppTopNav from '@/app/components/AppTopNav'

const supabase = createClient()

type OrderStatus = '접수 대기' | '디자인 작업중' | '수정 요청 중' | '주문 재접수'
type ProductType =
  | 'NT-tainer'
  | 'NT-spacer'
  | 'NT-regainer'
  | 'NT-lingual arch'
  | 'NT-uprighter'

const PRODUCT_TYPES: ProductType[] = [
  'NT-tainer',
  'NT-spacer',
  'NT-regainer',
  'NT-lingual arch',
  'NT-uprighter',
]

const THICKNESS_OPTIONS = [
  '0.011inch(0.30mm)',
  '0.013inch(0.35mm)',
  '0.015inch(0.40mm)',
  '0.016inch(0.43mm)',
  '0.021inch(0.55mm)',
] as const

const PERMANENT_TOP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const PERMANENT_BOTTOM = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

const PRIMARY_TOP = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65]
const PRIMARY_BOTTOM = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]

function toToothKey(value: number) {
  return String(value)
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="border-b border-[#e9edf4] bg-[#f7f9fc] px-6 py-4 text-[17px] font-extrabold text-[#263142]">
      {title}
    </div>
  )
}

function FieldLabel({
  required = false,
  children,
}: {
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="text-[14px] font-bold text-[#4b5565]">
      {required && <span className="mr-1 text-[#ef6b5a]">*</span>}
      {children}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={classNames(
        'h-11 w-full rounded-[12px] border border-[#d6dde8] bg-white px-4 text-[14px] text-[#344054] outline-none transition placeholder:text-[#9aa4b2] focus:border-[#9db7ff] focus:shadow-[0_0_0_4px_rgba(36,85,255,0.08)]',
        disabled && 'bg-[#f8fafc] text-[#667085]'
      )}
    />
  )
}

function PermanentTooth({
  selected,
  onClick,
  flipped = false,
}: {
  selected: boolean
  onClick: () => void
  flipped?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'flex h-[68px] w-[38px] items-center justify-center rounded-[12px] transition',
        selected ? 'bg-[#fff8df]' : 'hover:bg-[#f8fafc]'
      )}
    >
      <svg
        viewBox="0 0 36 58"
        className={classNames('h-[56px] w-[30px]', flipped && 'rotate-180')}
        fill={selected ? '#fff4cf' : 'none'}
        stroke={selected ? '#d4a72c' : '#c9cdd5'}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6 C7 12, 7 19, 9 26 C10 31, 10 37, 10 45 C10 50, 12 51, 14 46 L16.5 34 C17 31, 19 31, 19.5 34 L22 46 C24 51, 26 50, 26 45 C26 37, 26 31, 27 26 C29 19, 29 12, 27 6" />
        <path d="M9 6 C12 2, 24 2, 27 6" />
      </svg>
    </button>
  )
}

function PrimaryMolarTooth({
  selected,
  onClick,
}: {
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'flex h-[68px] w-[40px] items-center justify-center rounded-[12px] transition',
        selected ? 'bg-[#fff8df]' : 'hover:bg-[#f8fafc]'
      )}
    >
      <svg
        viewBox="0 0 40 58"
        className="h-[56px] w-[34px]"
        fill={selected ? '#fff4cf' : 'none'}
        stroke={selected ? '#d4a72c' : '#c9cdd5'}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 9 C8 4, 15 3, 20 7 C25 3, 32 4, 33 9 C33 16, 32 24, 29 30 C28 35, 28 41, 28 48 C28 52, 26 53, 24 48 L21.5 36 C21 33, 19 33, 18.5 36 L16 48 C14 53, 12 52, 12 48 C12 41, 12 35, 11 30 C8 24, 7 16, 7 9 Z" />
      </svg>
    </button>
  )
}

function PrimarySlimTooth({
  selected,
  onClick,
}: {
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'flex h-[68px] w-[40px] items-center justify-center rounded-[12px] transition',
        selected ? 'bg-[#fff8df]' : 'hover:bg-[#f8fafc]'
      )}
    >
      <svg
        viewBox="0 0 36 58"
        className="h-[56px] w-[34px]"
        fill={selected ? '#fff4cf' : 'none'}
        stroke={selected ? '#d4a72c' : '#c9cdd5'}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 7 C9 12, 9 18, 10 24 C11 29, 11 35, 11 43 C11 48, 13 50, 15 45 L17 33 C17.5 30, 18.5 30, 19 33 L21 45 C23 50, 25 48, 25 43 C25 35, 25 29, 26 24 C27 18, 27 12, 26 7" />
        <path d="M10 7 C13 4, 23 4, 26 7" />
      </svg>
    </button>
  )
}

function PermanentChart({
  topNumbers,
  bottomNumbers,
  selectedTeeth,
  onToggle,
}: {
  topNumbers: number[]
  bottomNumbers: number[]
  selectedTeeth: string[]
  onToggle: (tooth: string) => void
}) {
  const leftTop = topNumbers.slice(0, 8)
  const rightTop = topNumbers.slice(8)
  const leftBottom = bottomNumbers.slice(0, 8)
  const rightBottom = bottomNumbers.slice(8)

  const renderGroup = (numbers: number[], bottom = false) => (
    <div className="grid grid-cols-8 gap-x-3">
      {numbers.map((n) => {
        const key = toToothKey(n)

        return (
          <div key={`${bottom ? 'pb' : 'pt'}-${n}`} className="flex flex-col items-center">
            {!bottom && <div className="mb-2 text-[12px] font-semibold text-[#525c6b]">{n}</div>}
            <PermanentTooth
              selected={selectedTeeth.includes(key)}
              onClick={() => onToggle(key)}
              flipped={!bottom}
            />
            {bottom && <div className="mt-2 text-[12px] font-semibold text-[#525c6b]">{n}</div>}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="px-6 py-6">
      <div className="grid grid-cols-[1fr_24px_1fr] items-start">
        {renderGroup(leftTop)}
        <div className="flex h-full items-stretch justify-center">
          <div className="w-px self-stretch bg-[#d8dde6]" />
        </div>
        {renderGroup(rightTop)}
      </div>

      <div className="my-4 border-t border-[#e5e9f0]" />

      <div className="grid grid-cols-[1fr_24px_1fr] items-start">
        {renderGroup(leftBottom, true)}
        <div className="flex h-full items-stretch justify-center">
          <div className="w-px self-stretch bg-[#d8dde6]" />
        </div>
        {renderGroup(rightBottom, true)}
      </div>
    </div>
  )
}

function PrimaryChart({
  topNumbers,
  bottomNumbers,
  selectedTeeth,
  onToggle,
}: {
  topNumbers: number[]
  bottomNumbers: number[]
  selectedTeeth: string[]
  onToggle: (tooth: string) => void
}) {
  const leftTop = topNumbers.slice(0, 5)
  const rightTop = topNumbers.slice(5)
  const leftBottom = bottomNumbers.slice(0, 5)
  const rightBottom = bottomNumbers.slice(5)

  const renderGroup = (numbers: number[], bottom = false) => (
    <div className="grid grid-cols-5 gap-x-5">
      {numbers.map((n, i) => {
        const key = toToothKey(n)
        const isMolar = i === 0 || i === 1 || i === 3 || i === 4

        return (
          <div key={`${bottom ? 'cb' : 'ct'}-${n}`} className="flex flex-col items-center">
            {!bottom && <div className="mb-2 text-[12px] font-semibold text-[#525c6b]">{n}</div>}
            {isMolar ? (
              <PrimaryMolarTooth
                selected={selectedTeeth.includes(key)}
                onClick={() => onToggle(key)}
              />
            ) : (
              <PrimarySlimTooth
                selected={selectedTeeth.includes(key)}
                onClick={() => onToggle(key)}
              />
            )}
            {bottom && <div className="mt-2 text-[12px] font-semibold text-[#525c6b]">{n}</div>}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="px-6 py-6">
      <div className="grid grid-cols-[1fr_20px_1fr] items-start">
        {renderGroup(leftTop)}
        <div className="flex h-full items-stretch justify-center">
          <div className="w-px self-stretch bg-[#d8dde6]" />
        </div>
        {renderGroup(rightTop)}
      </div>

      <div className="my-4 border-t border-[#e5e9f0]" />

      <div className="grid grid-cols-[1fr_20px_1fr] items-start">
        {renderGroup(leftBottom, true)}
        <div className="flex h-full items-stretch justify-center">
          <div className="w-px self-stretch bg-[#d8dde6]" />
        </div>
        {renderGroup(rightBottom, true)}
      </div>
    </div>
  )
}

function SelectButton({
  label,
  selected,
  onClick,
  wide = false,
}: {
  label: string
  selected: boolean
  onClick: () => void
  wide?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'rounded-[18px] border px-5 py-4 text-[16px] font-semibold transition',
        wide ? 'w-full' : 'w-[210px]',
        selected
          ? 'border-[#d4a72c] bg-[#efc34a] text-white shadow-[0_10px_24px_rgba(212,167,44,0.18)]'
          : 'border-[#efc34a] bg-[#fffdf7] text-[#4d5968] hover:bg-[#fff8e8]'
      )}
    >
      {label}
    </button>
  )
}

export default function NewOrderPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [loadingClinicInfo, setLoadingClinicInfo] = useState(true)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const [patientName, setPatientName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [clinicAddress, setClinicAddress] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [requestNote, setRequestNote] = useState('')

  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([])
  const [productType, setProductType] = useState<ProductType | ''>('')
  const [thickness, setThickness] = useState('')
  const [jigRequired, setJigRequired] = useState('No')

  const [files, setFiles] = useState<File[]>([])

  useEffect(() => {
    let mounted = true

    const loadClinicInfo = async () => {
      try {
        setLoadingClinicInfo(true)

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          if (mounted) {
            router.replace('/login')
          }
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('clinic_name, clinic_address')
          .eq('id', user.id)
          .single()

        if (profileError) {
          throw new Error('치과 정보를 불러오지 못했습니다.')
        }

        if (mounted) {
          setClinicName(profileData?.clinic_name ?? '')
          setClinicAddress(profileData?.clinic_address ?? '')
        }
      } catch (err) {
        console.error(err)
        if (mounted) {
          setError(err instanceof Error ? err.message : '치과 정보를 불러오는 중 오류가 발생했습니다.')
        }
      } finally {
        if (mounted) {
          setLoadingClinicInfo(false)
        }
      }
    }

    loadClinicInfo()

    return () => {
      mounted = false
    }
  }, [router])

  const selectedTeethSummary = useMemo(() => {
    if (selectedTeeth.length === 0) return '선택 전'
    return selectedTeeth.join(', ')
  }, [selectedTeeth])

  const toggleTooth = (tooth: string) => {
    setSelectedTeeth((prev) =>
      prev.includes(tooth) ? prev.filter((item) => item !== tooth) : [...prev, tooth]
    )
  }

  const mergeFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return

    const nextFiles = Array.from(incoming)
    setFiles((prev) => {
      const merged = [...prev]

      for (const file of nextFiles) {
        const exists = merged.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified
        )

        if (!exists) {
          merged.push(file)
        }
      }

      return merged
    })
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    mergeFiles(event.target.files)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)
    mergeFiles(event.dataTransfer?.files || null)
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async (orderId: string, nextFiles: File[]) => {
    if (nextFiles.length === 0) {
      return {
        scanFileNames: [] as string[],
        scanFilePaths: [] as string[],
      }
    }

    const scanFileNames: string[] = []
    const scanFilePaths: string[] = []

    for (const file of nextFiles) {
      const filePath = `orders/${orderId}/scan/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('order-files')
        .upload(filePath, file)

      if (uploadError) {
        throw new Error('파일 업로드에 실패했습니다.')
      }

      scanFileNames.push(file.name)
      scanFilePaths.push(filePath)
    }

    return { scanFileNames, scanFilePaths }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (loadingClinicInfo) {
      setError('치과 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    if (!patientName.trim()) {
      setError('환자 명을 입력해주세요.')
      return
    }

    if (!clinicName.trim()) {
      setError('치과명을 입력해주세요.')
      return
    }

    if (!clinicAddress.trim()) {
      setError('치과 주소를 입력해주세요.')
      return
    }

    if (!deliveryDate) {
      setError('희망 완료일을 입력해주세요.')
      return
    }

    if (selectedTeeth.length === 0) {
      setError('치아 번호를 하나 이상 선택해주세요.')
      return
    }

    if (!productType) {
      setError('유형을 선택해주세요.')
      return
    }

    if (!thickness) {
      setError('두께를 선택해주세요.')
      return
    }

    if (!jigRequired) {
      setError('지그 제작 여부를 선택해주세요.')
      return
    }

    try {
      setSubmitting(true)
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
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw new Error('회원 정보를 불러오지 못했습니다.')
      }

      const { data: insertedOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          clinic_name: clinicName.trim(),
          clinic_address: clinicAddress.trim(),
          patient_name: patientName.trim(),
          gender: gender || null,
          birth_date: birthDate || null,
          product_type: productType,
          selected_teeth: selectedTeeth,
          delivery_date: deliveryDate || null,
          thickness,
          jig_required: jigRequired,
          request_note: requestNote.trim() || null,
          status: '접수 대기' as OrderStatus,
          user_id: user.id,
          user_role: profileData?.role || 'clinic',
        })
        .select('id')
        .single()

      if (insertError || !insertedOrder) {
        throw new Error('주문 저장에 실패했습니다.')
      }

      const orderId = insertedOrder.id

      const { error: historyInsertError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: '접수 대기',
          title: '주문 접수',
          description: `${patientName.trim()} 환자 주문이 접수되었습니다.`,
          created_by: user.id,
        })

      if (historyInsertError) {
        throw new Error('주문 히스토리 저장에 실패했습니다.')
      }

      const { scanFileNames, scanFilePaths } = await uploadFiles(orderId, files)

      if (scanFileNames.length > 0 || scanFilePaths.length > 0) {
        const { error: updateFilesError } = await supabase
          .from('orders')
          .update({
            scan_file_names: scanFileNames,
            scan_file_paths: scanFilePaths,
          })
          .eq('id', orderId)

        if (updateFilesError) {
          throw new Error('업로드 파일 저장에 실패했습니다.')
        }
      }

      router.push('/orders')
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : '주문 접수 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f5f9] px-6 py-10">
      <div className="mx-auto w-full max-w-[1480px]">
        <AppTopNav current="orders-new" />

        <div className="overflow-hidden rounded-[28px] border border-[#d9e0ea] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[#e8edf5] bg-[#fbfcfe] px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[30px] font-extrabold tracking-tight text-[#1f2937]">
                  주문하기
                </div>
                <div className="mt-2 text-[14px] text-[#98a2b3]">
                  * 항목은 필수 입력 사항입니다.
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/orders')}
                  className="rounded-[14px] border border-[#cfd7e3] bg-white px-6 py-3 text-[15px] font-bold text-[#475467] transition hover:bg-[#f8fafc]"
                >
                  임시저장
                </button>
                <button
                  type="submit"
                  form="new-order-form"
                  disabled={submitting || loadingClinicInfo}
                  className="rounded-[14px] bg-[#3b82f6] px-6 py-3 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(59,130,246,0.24)] transition hover:bg-[#2563eb] disabled:opacity-60"
                >
                  {submitting ? '저장 중...' : loadingClinicInfo ? '정보 불러오는 중...' : '보내기'}
                </button>
              </div>
            </div>
          </div>

          <form
            id="new-order-form"
            onSubmit={handleSubmit}
            className="grid grid-cols-[340px_1fr_300px] gap-6 p-8"
          >
            <div className="overflow-hidden rounded-[22px] border border-[#e1e7ef] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <SectionTitle title="기본 정보" />

              <div className="space-y-5 p-6">
                <div className="grid grid-cols-[82px_1fr] items-center gap-4">
                  <FieldLabel required>환자 명</FieldLabel>
                  <TextInput value={patientName} onChange={setPatientName} />
                </div>

                <div className="grid grid-cols-[82px_1fr] items-center gap-4">
                  <FieldLabel>생년월일</FieldLabel>
                  <TextInput
                    value={birthDate}
                    onChange={setBirthDate}
                    placeholder="연도-월-일"
                    type="date"
                  />
                </div>

                <div className="grid grid-cols-[82px_1fr] items-center gap-4">
                  <FieldLabel>성별</FieldLabel>
                  <div className="flex items-center gap-5 text-[14px] font-medium text-[#4b5565]">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="gender"
                        value="남"
                        checked={gender === '남'}
                        onChange={(e) => setGender(e.target.value)}
                        className="h-4 w-4"
                      />
                      남
                    </label>

                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="gender"
                        value="여"
                        checked={gender === '여'}
                        onChange={(e) => setGender(e.target.value)}
                        className="h-4 w-4"
                      />
                      여
                    </label>

                    <button
                      type="button"
                      onClick={() => setGender('')}
                      className="text-[13px] font-semibold text-[#98a2b3]"
                    >
                      선택 해제
                    </button>
                  </div>
                </div>

                <div className="border-t border-[#eef2f6] pt-5">
                  <div className="grid grid-cols-[82px_1fr] items-center gap-4">
                    <FieldLabel required>치과명</FieldLabel>
                    <div>
                      <TextInput
                        value={clinicName}
                        onChange={setClinicName}
                        disabled={loadingClinicInfo}
                        placeholder={loadingClinicInfo ? '치과명 불러오는 중...' : '치과명을 입력하세요'}
                      />
                      <div className="mt-2 text-[12px] text-[#98a2b3]">
                        회원가입 시 등록된 치과명이 자동 입력되며, 필요하면 수정할 수 있습니다.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#eef2f6] pt-5">
                  <div className="grid grid-cols-[82px_1fr] items-start gap-4">
                    <FieldLabel required>치과주소</FieldLabel>
                    <div>
                      <textarea
                        value={clinicAddress}
                        onChange={(e) => setClinicAddress(e.target.value)}
                        disabled={loadingClinicInfo}
                        placeholder={loadingClinicInfo ? '치과주소 불러오는 중...' : '치과 주소를 입력하세요'}
                        className={classNames(
                          'min-h-[96px] w-full resize-none rounded-[14px] border border-[#d6dde8] bg-white p-4 text-[14px] outline-none transition focus:border-[#9db7ff] focus:shadow-[0_0_0_4px_rgba(36,85,255,0.08)]',
                          loadingClinicInfo && 'bg-[#f8fafc] text-[#667085]'
                        )}
                      />
                      <div className="mt-2 text-[12px] text-[#98a2b3]">
                        회원가입 시 등록된 주소가 자동 입력되며, 필요하면 수정할 수 있습니다.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#eef2f6] pt-5">
                  <div className="grid grid-cols-[82px_1fr] items-center gap-4">
                    <FieldLabel required>희망 완료일</FieldLabel>
                    <TextInput
                      value={deliveryDate}
                      onChange={setDeliveryDate}
                      placeholder="연도-월-일"
                      type="date"
                    />
                  </div>
                </div>

                <div className="border-t border-[#eef2f6] pt-5">
                  <div className="mb-3 text-[14px] font-bold text-[#4b5565]">메모</div>
                  <textarea
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    className="h-[150px] w-full resize-none rounded-[14px] border border-[#d6dde8] bg-white p-4 text-[14px] outline-none transition focus:border-[#9db7ff] focus:shadow-[0_0_0_4px_rgba(36,85,255,0.08)]"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <SectionTitle title="치아 번호 (영구치) *" />
              <PermanentChart
                topNumbers={PERMANENT_TOP}
                bottomNumbers={PERMANENT_BOTTOM}
                selectedTeeth={selectedTeeth}
                onToggle={toggleTooth}
              />

              <div className="border-y border-[#e9edf4] bg-[#f7f9fc] px-6 py-4 text-[17px] font-extrabold text-[#263142]">
                치아 번호 (유치) *
              </div>
              <PrimaryChart
                topNumbers={PRIMARY_TOP}
                bottomNumbers={PRIMARY_BOTTOM}
                selectedTeeth={selectedTeeth}
                onToggle={toggleTooth}
              />

              <div className="border-y border-[#e9edf4] bg-[#f7f9fc] px-6 py-4 text-[17px] font-extrabold text-[#263142]">
                유형 *
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-3">
                  {PRODUCT_TYPES.map((type) => (
                    <SelectButton
                      key={type}
                      label={type}
                      selected={productType === type}
                      onClick={() => setProductType(type)}
                    />
                  ))}
                </div>
              </div>

              <div className="border-y border-[#e9edf4] bg-[#f7f9fc] px-6 py-4 text-[17px] font-extrabold text-[#263142]">
                두께 선택 *
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-3">
                  {THICKNESS_OPTIONS.map((option) => (
                    <SelectButton
                      key={option}
                      label={option}
                      selected={thickness === option}
                      onClick={() => setThickness(option)}
                    />
                  ))}
                </div>
              </div>

              <div className="border-y border-[#e9edf4] bg-[#f7f9fc] px-6 py-4">
                <div className="text-[17px] font-extrabold text-[#263142]">지그 제작 여부 *</div>
                <div className="mt-2 text-[13px] font-bold text-red-500">
                  (제작시 5000원 추가 비용 발생)
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  <SelectButton
                    label="Yes"
                    selected={jigRequired === 'Yes'}
                    onClick={() => setJigRequired('Yes')}
                    wide
                  />
                  <SelectButton
                    label="No"
                    selected={jigRequired === 'No'}
                    onClick={() => setJigRequired('No')}
                    wide
                  />
                </div>
              </div>

              <div className="border-y border-[#e9edf4] bg-[#f7f9fc] px-6 py-4 text-[17px] font-extrabold text-[#263142]">
                파일 업로드
              </div>
              <div className="p-6">
                <label
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={classNames(
                    'flex min-h-[164px] cursor-pointer items-center justify-center rounded-[18px] border border-dashed text-center transition',
                    dragActive
                      ? 'border-[#d4a72c] bg-[#fff8e8] text-[#8a6510]'
                      : 'border-[#d5dde8] bg-[#fbfcfe] text-[#8b95a5]'
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="px-6 py-8">
                    <div className="mb-2 text-[16px] font-semibold text-[#667085]">
                      업로드할 파일을 끌어 넣어주세요.
                    </div>
                    <div className="text-[13px]">첨부파일 최대 크기: 200MB</div>

                    {files.length > 0 && (
                      <div className="mt-5 space-y-2 text-left">
                        {files.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between rounded-[12px] border border-[#e4e8ef] bg-white px-4 py-3"
                          >
                            <div className="truncate text-[13px] font-semibold text-[#475467]">
                              {file.name}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleRemoveFile(index)
                              }}
                              className="ml-3 rounded-[10px] border border-[#e4e8ef] px-3 py-1.5 text-[12px] font-bold text-[#667085]"
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {error && <div className="px-6 pb-6 text-sm font-semibold text-red-600">{error}</div>}
            </div>

            <div className="overflow-hidden rounded-[22px] border border-[#e1e7ef] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <SectionTitle title="요약" />

              <div className="p-5">
                <div className="rounded-[18px] border border-dashed border-[#d8dfe8] bg-[#fbfcfe] p-5">
                  <div className="mb-5 rounded-[14px] bg-[#f5f7fb] p-4 text-center">
                    <div className="mb-2 text-[13px] font-bold text-[#97a0ae]">유형</div>
                    <div className="text-[15px] font-bold text-[#475467]">
                      {productType || '선택 전'}
                    </div>
                  </div>

                  <div className="mb-5 rounded-[14px] bg-[#f5f7fb] p-4 text-center">
                    <div className="mb-2 text-[13px] font-bold text-[#97a0ae]">치아 번호</div>
                    <div className="break-words text-[15px] font-bold text-[#475467]">
                      {selectedTeethSummary}
                    </div>
                  </div>

                  <div className="mb-5 rounded-[14px] bg-[#f5f7fb] p-4 text-center">
                    <div className="mb-2 text-[13px] font-bold text-[#97a0ae]">두께</div>
                    <div className="text-[15px] font-bold text-[#475467]">
                      {thickness || '선택 전'}
                    </div>
                  </div>

                  <div className="rounded-[14px] bg-[#f5f7fb] p-4 text-center">
                    <div className="mb-2 text-[13px] font-bold text-[#97a0ae]">지그 제작 여부</div>
                    <div className="text-[15px] font-bold text-[#475467]">
                      {jigRequired || '선택 전'}
                    </div>
                  </div>

                  <div className="mt-5 text-center text-[28px] text-[#a5afbd]">↺</div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}