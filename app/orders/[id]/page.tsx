'use client'

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

type OrderStatus = '접수 대기' | '디자인 작업중' | '수정 요청 중' | '주문 재접수'

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
  selected_teeth: string[] | string | null
  delivery_date: string | null
  thickness: string | null
  jig_required: string | null
  request_note: string | null
  scan_file_names: string[] | string | null
  scan_file_paths: string[] | string | null
  design_file_names: string[] | string | null
  design_file_paths: string[] | string | null
  resubmission_file_names: string[] | string | null
  resubmission_file_paths: string[] | string | null
  status: OrderStatus
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

type FileItem = {
  name: string
  path: string
}

type ApiResult = {
  error?: string
  success?: boolean
  url?: string
  items?: HistoryItem[]
  history?: HistoryItem[]
}

type HistoryItem = {
  id: string
  order_id: string
  status: string
  title: string
  description: string | null
  created_by: string | null
  created_at: string
}

type StepItem = {
  key: string
  label: string
  active: boolean
  done: boolean
}

const PERMANENT_TOP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const PERMANENT_BOTTOM = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
const PRIMARY_TOP = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65]
const PRIMARY_BOTTOM = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string')
      }
    } catch {
      return [trimmed]
    }

    return [trimmed]
  }

  return []
}

async function parseJsonSafe(response: Response): Promise<ApiResult> {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

function extractHistoryItems(payload: unknown): HistoryItem[] {
  if (Array.isArray(payload)) {
    return payload as HistoryItem[]
  }

  if (payload && typeof payload === 'object') {
    const data = payload as { items?: unknown; history?: unknown }

    if (Array.isArray(data.items)) {
      return data.items as HistoryItem[]
    }

    if (Array.isArray(data.history)) {
      return data.history as HistoryItem[]
    }
  }

  return []
}

function formatDate(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatDateTime(value: string | null) {
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

function LogoBadge() {
  return (
    <div className="inline-flex items-center rounded-[18px] border border-[#d7deea] bg-white px-6 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <span className="text-[14px] font-extrabold tracking-[0.28em] text-[#2455ff]">
        SMILECAD PLATFORM
      </span>
    </div>
  )
}

function TopActionButton({
  label,
  active = false,
  onClick,
}: {
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'rounded-[18px] border px-7 py-4 text-[15px] font-bold transition',
        active
          ? 'border-[#0f1b3d] bg-[#0f1b3d] text-white shadow-[0_10px_25px_rgba(15,27,61,0.18)]'
          : 'border-[#cfd7e3] bg-white text-[#344054] hover:bg-[#f8fafc]'
      )}
    >
      {label}
    </button>
  )
}

function SectionTitle({
  title,
  right,
}: {
  title: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#e9edf4] bg-[#f7f9fc] px-6 py-4">
      <div className="text-[17px] font-extrabold text-[#263142]">{title}</div>
      {right}
    </div>
  )
}

function StatusBadge({ status, canceled = false }: { status: string; canceled?: boolean }) {
  if (canceled) {
    return (
      <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
        주문 취소
      </span>
    )
  }

  if (status === '접수 대기') {
    return (
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
        접수 대기
      </span>
    )
  }

  if (status === '디자인 작업중') {
    return (
      <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
        디자인 작업중
      </span>
    )
  }

  if (status === '수정 요청 중') {
    return (
      <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">
        주문 수정
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
      주문 재접수
    </span>
  )
}

function ValueBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full border border-[#efc34a] bg-[#fff8e8] px-4 py-1.5 text-sm font-bold text-[#8a6510]">
      {value || '-'}
    </span>
  )
}

function InfoCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-[14px] border border-[#e4e8ef] bg-[#f9fbfd] px-4 py-4">
      <div className="mb-2 text-[12px] font-bold text-[#98a2b3]">{label}</div>
      <div className="text-[14px] font-semibold text-[#344054]">{value || '-'}</div>
    </div>
  )
}

function OrderSteps({ steps }: { steps: StepItem[] }) {
  return (
    <div className="rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="px-8 py-7">
        <div className={classNames('grid gap-4', steps.length === 2 ? 'grid-cols-2' : 'grid-cols-4')}>
          {steps.map((step, index) => (
            <div key={step.key} className="relative flex flex-col items-start gap-2">
              <div className="relative flex w-full items-center">
                <div
                  className={classNames(
                    'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-extrabold',
                    step.active || step.done
                      ? 'border-[#8cbc55] bg-[#8cbc55] text-white'
                      : 'border-[#d7dde7] bg-white text-[#a8b0bc]'
                  )}
                >
                  {step.done || step.active ? '✓' : index + 1}
                </div>

                {index < steps.length - 1 && (
                  <div className="ml-3 h-px flex-1 bg-[#d9dee7]" />
                )}
              </div>

              <div
                className={classNames(
                  'pl-1 text-[14px] font-bold',
                  step.active || step.done ? 'text-[#344054]' : 'text-[#98a2b3]'
                )}
              >
                {step.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function VerticalTimeline({
  items,
}: {
  items: HistoryItem[]
}) {
  return (
    <div className="rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <SectionTitle title="히스토리" />

      <div className="p-6">
        {items.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#d9e0ea] bg-[#fbfcfe] px-5 py-8 text-center text-[14px] text-[#98a2b3]">
            표시할 히스토리가 없습니다.
          </div>
        ) : (
          <div className="relative pl-3">
            <div className="absolute bottom-0 left-[18px] top-0 w-px bg-[#e1e6ee]" />

            <div className="space-y-5">
              {items.map((item, index) => {
                const isLatest = index === 0

                return (
                  <div key={item.id} className="relative pl-10">
                    <div
                      className={classNames(
                        'absolute left-[5px] top-1 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-extrabold',
                        isLatest
                          ? 'border-[#8cbc55] bg-[#8cbc55] text-white'
                          : 'border-[#d7dde7] bg-white text-[#a8b0bc]'
                      )}
                    >
                      {isLatest ? '✓' : '•'}
                    </div>

                    <div className="rounded-[16px] border border-[#e4e8ef] bg-white px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[14px] font-bold text-[#344054]">{item.title}</div>
                        <div className="text-[12px] font-semibold text-[#98a2b3]">
                          {formatDateTime(item.created_at)}
                        </div>
                      </div>

                      {item.description && (
                        <div className="mt-2 text-[13px] leading-6 text-[#667085]">
                          {item.description}
                        </div>
                      )}

                      <div className="mt-3">
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PermanentTooth({
  selected,
  flipped = false,
}: {
  selected: boolean
  flipped?: boolean
}) {
  return (
    <div
      className={classNames(
        'flex h-[68px] w-[38px] items-center justify-center rounded-[12px]',
        selected && 'bg-[#eff6ff]'
      )}
    >
      <svg
        viewBox="0 0 36 58"
        className={classNames('h-[56px] w-[30px]', flipped && 'rotate-180')}
        fill={selected ? '#eef4ff' : 'none'}
        stroke={selected ? '#5b8ef7' : '#c9cdd5'}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6 C7 12, 7 19, 9 26 C10 31, 10 37, 10 45 C10 50, 12 51, 14 46 L16.5 34 C17 31, 19 31, 19.5 34 L22 46 C24 51, 26 50, 26 45 C26 37, 26 31, 27 26 C29 19, 29 12, 27 6" />
        <path d="M9 6 C12 2, 24 2, 27 6" />
      </svg>
    </div>
  )
}

function PrimaryMolarTooth({ selected }: { selected: boolean }) {
  return (
    <div
      className={classNames(
        'flex h-[68px] w-[40px] items-center justify-center rounded-[12px]',
        selected && 'bg-[#eff6ff]'
      )}
    >
      <svg
        viewBox="0 0 40 58"
        className="h-[56px] w-[34px]"
        fill={selected ? '#eef4ff' : 'none'}
        stroke={selected ? '#5b8ef7' : '#c9cdd5'}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 9 C8 4, 15 3, 20 7 C25 3, 32 4, 33 9 C33 16, 32 24, 29 30 C28 35, 28 41, 28 48 C28 52, 26 53, 24 48 L21.5 36 C21 33, 19 33, 18.5 36 L16 48 C14 53, 12 52, 12 48 C12 41, 12 35, 11 30 C8 24, 7 16, 7 9 Z" />
      </svg>
    </div>
  )
}

function PrimarySlimTooth({ selected }: { selected: boolean }) {
  return (
    <div
      className={classNames(
        'flex h-[68px] w-[40px] items-center justify-center rounded-[12px]',
        selected && 'bg-[#eff6ff]'
      )}
    >
      <svg
        viewBox="0 0 36 58"
        className="h-[56px] w-[34px]"
        fill={selected ? '#eef4ff' : 'none'}
        stroke={selected ? '#5b8ef7' : '#c9cdd5'}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 7 C9 12, 9 18, 10 24 C11 29, 11 35, 11 43 C11 48, 13 50, 15 45 L17 33 C17.5 30, 18.5 30, 19 33 L21 45 C23 50, 25 48, 25 43 C25 35, 25 29, 26 24 C27 18, 27 12, 26 7" />
        <path d="M10 7 C13 4, 23 4, 26 7" />
      </svg>
    </div>
  )
}

function TeethChart({
  selectedTeeth,
  productType,
}: {
  selectedTeeth: string[]
  productType: string
}) {
  const hasPrimarySelection = selectedTeeth.some((tooth) => {
    const normalized = String(tooth)
    return normalized.startsWith('5') || normalized.startsWith('6') || normalized.startsWith('7') || normalized.startsWith('8')
  })

  const renderPermanentGroup = (numbers: number[], bottom = false) => (
    <div className="grid grid-cols-8 gap-x-3">
      {numbers.map((n) => {
        const selected = selectedTeeth.includes(String(n))
        return (
          <div key={`${bottom ? 'pb' : 'pt'}-${n}`} className="flex flex-col items-center">
            {!bottom && <div className="mb-2 text-[12px] font-semibold text-[#525c6b]">{n}</div>}
            <PermanentTooth selected={selected} flipped={!bottom} />
            {bottom && <div className="mt-2 text-[12px] font-semibold text-[#525c6b]">{n}</div>}
          </div>
        )
      })}
    </div>
  )

  const renderPrimaryGroup = (numbers: number[], bottom = false) => (
    <div className="grid grid-cols-5 gap-x-5">
      {numbers.map((n, i) => {
        const selected = selectedTeeth.includes(String(n))
        const isMolar = i === 0 || i === 1 || i === 3 || i === 4

        return (
          <div key={`${bottom ? 'cb' : 'ct'}-${n}`} className="flex flex-col items-center">
            {!bottom && <div className="mb-2 text-[12px] font-semibold text-[#525c6b]">{n}</div>}
            {isMolar ? <PrimaryMolarTooth selected={selected} /> : <PrimarySlimTooth selected={selected} />}
            {bottom && <div className="mt-2 text-[12px] font-semibold text-[#525c6b]">{n}</div>}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <SectionTitle
        title="치식 정보"
        right={<ValueBadge value={productType || '-'} />}
      />

      <div className="px-6 py-6">
        <div className="grid grid-cols-[1fr_24px_1fr] items-start">
          {renderPermanentGroup(PERMANENT_TOP.slice(0, 8))}
          <div className="flex h-full items-stretch justify-center">
            <div className="w-px self-stretch bg-[#d8dde6]" />
          </div>
          {renderPermanentGroup(PERMANENT_TOP.slice(8))}
        </div>

        <div className="my-4 border-t border-[#e5e9f0]" />

        <div className="grid grid-cols-[1fr_24px_1fr] items-start">
          {renderPermanentGroup(PERMANENT_BOTTOM.slice(0, 8), true)}
          <div className="flex h-full items-stretch justify-center">
            <div className="w-px self-stretch bg-[#d8dde6]" />
          </div>
          {renderPermanentGroup(PERMANENT_BOTTOM.slice(8), true)}
        </div>
      </div>

      {hasPrimarySelection && (
        <>
          <div className="border-y border-[#e9edf4] bg-[#f7f9fc] px-6 py-4 text-[17px] font-extrabold text-[#263142]">
            유치
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-[1fr_20px_1fr] items-start">
              {renderPrimaryGroup(PRIMARY_TOP.slice(0, 5))}
              <div className="flex h-full items-stretch justify-center">
                <div className="w-px self-stretch bg-[#d8dde6]" />
              </div>
              {renderPrimaryGroup(PRIMARY_TOP.slice(5))}
            </div>

            <div className="my-4 border-t border-[#e5e9f0]" />

            <div className="grid grid-cols-[1fr_20px_1fr] items-start">
              {renderPrimaryGroup(PRIMARY_BOTTOM.slice(0, 5), true)}
              <div className="flex h-full items-stretch justify-center">
                <div className="w-px self-stretch bg-[#d8dde6]" />
              </div>
              {renderPrimaryGroup(PRIMARY_BOTTOM.slice(5), true)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function RequestSection({ text }: { text: string | null }) {
  return (
    <div className="rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <SectionTitle title="요청사항" />
      <div className="p-6">
        <div className="rounded-[16px] border border-[#e4e8ef] bg-[#f9fbfd] px-4 py-4 text-[14px] leading-6 text-[#344054]">
          {text || '입력된 요청사항이 없습니다.'}
        </div>
      </div>
    </div>
  )
}

function SummaryInfo({
  orderNumber,
  patientName,
  createdAt,
  deliveryDate,
  clinicName,
  thickness,
  jigRequired,
}: {
  orderNumber: string
  patientName: string
  createdAt: string | null
  deliveryDate: string | null
  clinicName: string
  thickness: string | null
  jigRequired: string | null
}) {
  return (
    <div className="rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <SectionTitle
        title="주문 정보"
        right={
          <div className="inline-flex rounded-full border border-[#d7deea] bg-[#fbfcfe] px-4 py-1.5 text-sm font-bold text-[#344054]">
            {clinicName || '-'}
          </div>
        }
      />

      <div className="px-6 py-5">
        <div className="grid grid-cols-[120px_1fr_120px_1fr] gap-y-4 text-[14px]">
          <div className="font-bold text-[#98a2b3]">주문 번호</div>
          <div className="font-semibold text-[#344054]">{orderNumber || '-'}</div>

          <div className="font-bold text-[#98a2b3]">환자명</div>
          <div className="font-semibold text-[#344054]">{patientName || '-'}</div>

          <div className="font-bold text-[#98a2b3]">주문 일자</div>
          <div className="font-semibold text-[#344054]">{formatDateTime(createdAt)}</div>

          <div className="font-bold text-[#98a2b3]">희망 완료일</div>
          <div className="font-semibold text-[#344054]">{formatDate(deliveryDate)}</div>

          <div className="font-bold text-[#98a2b3]">두께</div>
          <div className="font-semibold text-[#344054]">
            <ValueBadge value={thickness || '-'} />
          </div>

          <div className="font-bold text-[#98a2b3]">지그 제작 여부</div>
          <div className="font-semibold text-[#344054]">
            <ValueBadge value={jigRequired || '-'} />
          </div>
        </div>
      </div>
    </div>
  )
}

function FileListSection({
  title,
  type,
  files,
  canDownload,
  onDownload,
  onDownloadAll,
}: {
  title: string
  type: 'scan' | 'design' | 'resubmission'
  files: FileItem[]
  canDownload: boolean
  onDownload: (filePath: string, type: 'scan' | 'design' | 'resubmission') => void
  onDownloadAll?: () => void
}) {
  return (
    <div className="rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <SectionTitle
        title={title}
        right={
          canDownload && files.length > 0 && onDownloadAll ? (
            <button
              type="button"
              onClick={onDownloadAll}
              className="rounded-[12px] border border-[#cfd7e3] bg-white px-4 py-2 text-[13px] font-bold text-[#344054] transition hover:bg-[#f8fafc]"
            >
              전체 다운로드
            </button>
          ) : null
        }
      />

      <div className="p-6">
        {files.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#d9e0ea] bg-[#fbfcfe] px-5 py-8 text-center text-[14px] text-[#98a2b3]">
            파일이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file, index) => (
              <div
                key={`${file.path}-${index}`}
                className="flex items-center justify-between rounded-[16px] border border-[#e4e8ef] bg-[#f9fbfd] px-4 py-4"
              >
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-[#344054]">{file.name}</div>
                </div>

                {canDownload ? (
                  <button
                    type="button"
                    onClick={() => onDownload(file.path, type)}
                    className="rounded-[12px] border border-[#cfd7e3] bg-white px-4 py-2 text-[13px] font-bold text-[#344054] transition hover:bg-[#f8fafc]"
                  >
                    다운로드
                  </button>
                ) : (
                  <div className="text-[12px] font-semibold text-[#98a2b3]">권한 없음</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [order, setOrder] = useState<OrderItem | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  const [statusLoading, setStatusLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [revisionLoading, setRevisionLoading] = useState(false)
  const [uploadingDesign, setUploadingDesign] = useState(false)
  const [uploadingResubmission, setUploadingResubmission] = useState(false)

  const [cancelReason, setCancelReason] = useState('')
  const [revisionNote, setRevisionNote] = useState('')

  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const [resubmissionDragActive, setResubmissionDragActive] = useState(false)
  const [selectedResubmissionFiles, setSelectedResubmissionFiles] = useState<File[]>([])

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const resubmissionFileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadPage = async () => {
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

        const { data: orderData, error: orderError } = await supabase
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
            resubmission_file_names,
            resubmission_file_paths,
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
          .eq('id', orderId)
          .single()

        if (orderError || !orderData) {
          setError('주문 정보를 불러오지 못했습니다.')
          return
        }

        if (!isMounted) return
        setProfile(profileData as Profile)
        setOrder(orderData as OrderItem)
        setRevisionNote(orderData.admin_revision_request_note || '')

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          const historyRes = await fetch(`/api/orders/${orderId}/history`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })

          const historyJson = await parseJsonSafe(historyRes)

          if (historyRes.ok) {
            const parsedHistory = extractHistoryItems(historyJson).sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            setHistory(parsedHistory)
          }
        }
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setError('주문 상세 로딩 중 오류가 발생했습니다.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    if (orderId) {
      loadPage()
    }

    return () => {
      isMounted = false
    }
  }, [orderId, router])

  const isAdmin = profile?.role === 'admin'
  const isOwnerClinic = !!profile && !!order && profile.id === order.user_id
  const canUploadDesign = !!order && (isAdmin || isOwnerClinic)
  const canDownloadDesign = !!order && (isAdmin || isOwnerClinic)
  const canDownloadScan = !!order && isAdmin

  const designFiles = useMemo<FileItem[]>(() => {
    if (!order) return []
    const names = normalizeStringArray(order.design_file_names)
    const paths = normalizeStringArray(order.design_file_paths)
    return paths.map((path, index) => ({
      name: names[index] || `design-file-${index + 1}`,
      path,
    }))
  }, [order])

  const scanFiles = useMemo<FileItem[]>(() => {
    if (!order) return []
    const names = normalizeStringArray(order.scan_file_names)
    const paths = normalizeStringArray(order.scan_file_paths)
    return paths.map((path, index) => ({
      name: names[index] || `scan-file-${index + 1}`,
      path,
    }))
  }, [order])

  const resubmissionFiles = useMemo<FileItem[]>(() => {
    if (!order) return []
    const names = normalizeStringArray(order.resubmission_file_names)
    const paths = normalizeStringArray(order.resubmission_file_paths)
    return paths.map((path, index) => ({
      name: names[index] || `resubmission-file-${index + 1}`,
      path,
    }))
  }, [order])

  const selectedTeeth = useMemo(() => {
    if (!order) return []
    return normalizeStringArray(order.selected_teeth)
  }, [order])

  const hasRevisionFlow = useMemo(() => {
    if (!order) return false
    return (
      order.status === '수정 요청 중' ||
      order.status === '주문 재접수' ||
      order.admin_revision_requested ||
      resubmissionFiles.length > 0
    )
  }, [order, resubmissionFiles.length])

  const steps = useMemo<StepItem[]>(() => {
    if (!order) return []

    if (!hasRevisionFlow) {
      return [
        {
          key: 'received',
          label: '접수 대기',
          active: order.status === '접수 대기',
          done: order.status === '디자인 작업중',
        },
        {
          key: 'design',
          label: '디자인 작업중',
          active: order.status === '디자인 작업중',
          done: false,
        },
      ]
    }

    return [
      {
        key: 'received',
        label: '접수 대기',
        active: order.status === '접수 대기',
        done: order.status !== '접수 대기',
      },
      {
        key: 'revision',
        label: '주문 수정',
        active: order.status === '수정 요청 중',
        done: order.status === '주문 재접수' || order.status === '디자인 작업중',
      },
      {
        key: 'resubmitted',
        label: '주문 재접수',
        active: order.status === '주문 재접수',
        done: order.status === '디자인 작업중',
      },
      {
        key: 'design',
        label: '디자인 작업중',
        active: order.status === '디자인 작업중',
        done: false,
      },
    ]
  }, [order, hasRevisionFlow])

  const safeFileName = (name: string) => {
    return name.replace(/[^\w.\-]/g, '_').toLowerCase()
  }

  const getAccessToken = async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.access_token) {
      throw new Error('로그인 토큰을 확인할 수 없습니다. 다시 로그인해주세요.')
    }

    return session.access_token
  }

  const refreshOrder = async () => {
    if (!orderId) return

    const { data, error } = await supabase
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
        resubmission_file_names,
        resubmission_file_paths,
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
      .eq('id', orderId)
      .single()

    if (!error && data) {
      setOrder(data as OrderItem)
      setRevisionNote(data.admin_revision_request_note || '')
    }

    const accessToken = await getAccessToken().catch(() => '')
    if (accessToken) {
      const historyRes = await fetch(`/api/orders/${orderId}/history`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const historyJson = await parseJsonSafe(historyRes)

      if (historyRes.ok) {
        const parsedHistory = extractHistoryItems(historyJson).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setHistory(parsedHistory)
      }
    }
  }

  const handleDownload = async (
    filePath: string,
    type: 'scan' | 'design' | 'resubmission'
  ) => {
    try {
      const accessToken = await getAccessToken()

      const res = await fetch(
        `/api/files/download?orderId=${orderId}&filePath=${encodeURIComponent(filePath)}&type=${type}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      const data = await parseJsonSafe(res)

      if (!res.ok) {
        alert(data.error || '다운로드에 실패했습니다.')
        return
      }

      if (!data.url) {
        alert('다운로드 URL을 받지 못했습니다.')
        return
      }

      window.open(data.url, '_blank')
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '다운로드 중 오류가 발생했습니다.')
    }
  }

  const handleDownloadAll = async (
    files: FileItem[],
    type: 'scan' | 'design' | 'resubmission'
  ) => {
    for (const file of files) {
      await handleDownload(file.path, type)
    }
  }

  const handleStatusChange = async (nextStatus: '접수 대기' | '디자인 작업중') => {
    if (!isAdmin || !order) return

    try {
      setStatusLoading(true)
      const accessToken = await getAccessToken()

      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      })

      const data = await parseJsonSafe(res)

      if (!res.ok) {
        alert(data.error || '상태 변경에 실패했습니다.')
        return
      }

      await refreshOrder()
      alert('주문 상태가 변경되었습니다.')
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '상태 변경 중 오류가 발생했습니다.')
    } finally {
      setStatusLoading(false)
    }
  }

  const handleRevisionRequest = async () => {
    if (!isAdmin || !order) return

    try {
      setRevisionLoading(true)
      const accessToken = await getAccessToken()

      const res = await fetch(`/api/orders/${order.id}/revision-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          note: revisionNote,
        }),
      })

      const data = await parseJsonSafe(res)

      if (!res.ok) {
        alert(data.error || '수정 요청 등록에 실패했습니다.')
        return
      }

      await refreshOrder()
      alert('수정 요청이 등록되었습니다.')
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '수정 요청 처리 중 오류가 발생했습니다.')
    } finally {
      setRevisionLoading(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!order) return

    try {
      setCancelLoading(true)
      const accessToken = await getAccessToken()

      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          reason: cancelReason,
        }),
      })

      const data = await parseJsonSafe(res)

      if (!res.ok) {
        alert(data.error || '주문 취소에 실패했습니다.')
        return
      }

      await refreshOrder()
      alert('주문이 취소되었습니다.')
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '주문 취소 중 오류가 발생했습니다.')
    } finally {
      setCancelLoading(false)
    }
  }

  const mergeFiles = (prevFiles: File[], files: FileList | null) => {
    if (!files) return prevFiles

    const nextFiles = Array.from(files).filter((file) => {
      const lower = file.name.toLowerCase()
      return lower.endsWith('.stl') || lower.endsWith('.zip')
    })

    if (nextFiles.length === 0) {
      alert('STL 또는 ZIP 파일만 업로드할 수 있습니다.')
      return prevFiles
    }

    const merged = [...prevFiles]

    for (const file of nextFiles) {
      const alreadyExists = merged.some(
        (existing) => existing.name === file.name && existing.size === file.size
      )

      if (!alreadyExists) {
        merged.push(file)
      }
    }

    return merged
  }

  const setFilesFromInput = (files: FileList | null) => {
    setSelectedFiles((prev) => mergeFiles(prev, files))
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFilesFromInput(e.target.files)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileRemove = (targetIndex: number) => {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== targetIndex))
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setFilesFromInput(e.dataTransfer.files)
  }

  const handleResubmissionFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedResubmissionFiles((prev) => mergeFiles(prev, e.target.files))

    if (resubmissionFileInputRef.current) {
      resubmissionFileInputRef.current.value = ''
    }
  }

  const handleResubmissionFileRemove = (targetIndex: number) => {
    setSelectedResubmissionFiles((prev) => prev.filter((_, index) => index !== targetIndex))
  }

  const handleResubmissionDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setResubmissionDragActive(true)
  }

  const handleResubmissionDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setResubmissionDragActive(false)
  }

  const handleResubmissionDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setResubmissionDragActive(false)
    setSelectedResubmissionFiles((prev) => mergeFiles(prev, e.dataTransfer.files))
  }

  const handleDesignUpload = async () => {
    if (!order || selectedFiles.length === 0) {
      alert('업로드할 파일을 먼저 선택해주세요.')
      return
    }

    try {
      setUploadingDesign(true)

      const existingNames = normalizeStringArray(order.design_file_names)
      const existingPaths = normalizeStringArray(order.design_file_paths)

      const uploadedNames = [...existingNames]
      const uploadedPaths = [...existingPaths]

      for (const file of selectedFiles) {
        const safeName = safeFileName(file.name)
        const storagePath = `${order.order_number}/designed/${Date.now()}_${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('order-files')
          .upload(storagePath, file, {
            upsert: false,
          })

        if (uploadError) {
          alert(`파일 업로드 실패: ${file.name}`)
          return
        }

        uploadedNames.push(file.name)
        uploadedPaths.push(storagePath)
      }

      const accessToken = await getAccessToken()

      const res = await fetch(`/api/orders/${order.id}/design-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          design_file_names: uploadedNames,
          design_file_paths: uploadedPaths,
        }),
      })

      const data = await parseJsonSafe(res)

      if (!res.ok) {
        alert(data.error || '디자인 파일 정보 저장에 실패했습니다.')
        return
      }

      setSelectedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      await refreshOrder()
      alert('디자인 파일 업로드가 완료되었습니다.')
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '디자인 파일 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploadingDesign(false)
    }
  }

  const handleResubmissionUpload = async () => {
    if (!order || selectedResubmissionFiles.length === 0) {
      alert('업로드할 재접수 파일을 먼저 선택해주세요.')
      return
    }

    try {
      setUploadingResubmission(true)

      const existingNames = normalizeStringArray(order.resubmission_file_names)
      const existingPaths = normalizeStringArray(order.resubmission_file_paths)

      const uploadedNames = [...existingNames]
      const uploadedPaths = [...existingPaths]

      for (const file of selectedResubmissionFiles) {
        const safeName = safeFileName(file.name)
        const storagePath = `${order.order_number}/resubmission/${Date.now()}_${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('order-files')
          .upload(storagePath, file, {
            upsert: false,
          })

        if (uploadError) {
          alert(`파일 업로드 실패: ${file.name}`)
          return
        }

        uploadedNames.push(file.name)
        uploadedPaths.push(storagePath)
      }

      const accessToken = await getAccessToken()

      const res = await fetch(`/api/orders/${order.id}/resubmission-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          resubmission_file_names: uploadedNames,
          resubmission_file_paths: uploadedPaths,
        }),
      })

      const data = await parseJsonSafe(res)

      if (!res.ok) {
        alert(data.error || '재접수 파일 저장에 실패했습니다.')
        return
      }

      setSelectedResubmissionFiles([])
      if (resubmissionFileInputRef.current) {
        resubmissionFileInputRef.current.value = ''
      }

      await refreshOrder()
      alert('재접수 파일 업로드가 완료되었습니다.')
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '재접수 파일 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploadingResubmission(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f3f5f9] px-6 py-10">
        <div className="mx-auto w-full max-w-[1480px]">
          <div className="rounded-[28px] border border-[#d9e0ea] bg-white px-8 py-10 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="text-[15px] font-semibold text-[#667085]">주문 상세를 불러오는 중입니다...</div>
          </div>
        </div>
      </main>
    )
  }

  if (error || !order || !profile) {
    return (
      <main className="min-h-screen bg-[#f3f5f9] px-6 py-10">
        <div className="mx-auto w-full max-w-[1480px]">
          <div className="rounded-[28px] border border-red-200 bg-red-50 px-8 py-10 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="text-[15px] font-semibold text-red-600">
              {error || '주문 정보를 표시할 수 없습니다.'}
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f3f5f9] px-6 py-10">
      <div className="mx-auto w-full max-w-[1480px]">
        <div className="mb-8 flex items-start justify-between">
          <LogoBadge />
          <div className="flex items-center gap-4">
            <TopActionButton label="주문 목록" active onClick={() => router.push('/orders')} />
          </div>
        </div>

        <div className="mb-6 rounded-[28px] border border-[#d9e0ea] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="px-8 py-6">
            <div className="mb-2 text-[12px] font-extrabold tracking-[0.22em] text-[#2455ff]">
              SMILECAD PLATFORM
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-[30px] font-extrabold tracking-tight text-[#1f2937]">주문 상세</h1>
              <StatusBadge status={order.status} canceled={order.is_canceled} />
            </div>
            <div className="mt-2 text-[14px] font-semibold text-[#667085]">{order.order_number}</div>
          </div>
        </div>

        <div className="mb-6">
          <OrderSteps steps={steps} />
        </div>

        <div className="grid grid-cols-[380px_1fr] gap-6">
          <div className="space-y-6">
            <VerticalTimeline items={history} />

            {isAdmin && (
              <div className="rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <SectionTitle title="관리자 액션" />

                <div className="space-y-5 p-6">
                  <div>
                    <div className="mb-3 text-[14px] font-bold text-[#344054]">상태 변경</div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleStatusChange('접수 대기')}
                        disabled={statusLoading || order.is_canceled}
                        className="rounded-[12px] border border-[#cfd7e3] bg-white px-4 py-3 text-[13px] font-bold text-[#344054] transition hover:bg-[#f8fafc] disabled:opacity-50"
                      >
                        접수 대기
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange('디자인 작업중')}
                        disabled={statusLoading || order.is_canceled}
                        className="rounded-[12px] border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                      >
                        디자인 작업중
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[#e9edf4] pt-5">
                    <div className="mb-3 text-[14px] font-bold text-[#344054]">수정 요청</div>
                    <textarea
                      value={revisionNote}
                      onChange={(e) => setRevisionNote(e.target.value)}
                      rows={4}
                      className="w-full rounded-[14px] border border-[#d6dde8] px-4 py-3 text-[14px] outline-none transition focus:border-[#9db7ff] focus:shadow-[0_0_0_4px_rgba(36,85,255,0.08)]"
                      placeholder="수정 요청 내용을 입력해주세요."
                    />

                    <button
                      type="button"
                      onClick={handleRevisionRequest}
                      disabled={revisionLoading || order.is_canceled}
                      className="mt-4 w-full rounded-[12px] bg-rose-600 px-5 py-3 text-[13px] font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                    >
                      {revisionLoading ? '처리 중...' : '수정 요청 등록'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <SectionTitle title="주문 취소" />

              <div className="p-6">
                <div className="mb-3 text-[13px] text-[#98a2b3]">
                  관리자 또는 권한 있는 치과가 주문 취소를 요청할 수 있습니다.
                </div>

                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={4}
                  className="w-full rounded-[14px] border border-[#d6dde8] px-4 py-3 text-[14px] outline-none transition focus:border-[#9db7ff] focus:shadow-[0_0_0_4px_rgba(36,85,255,0.08)]"
                  placeholder="취소 사유를 입력해주세요."
                />

                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={cancelLoading || order.is_canceled}
                  className="mt-4 w-full rounded-[12px] bg-red-600 px-5 py-3 text-[13px] font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelLoading ? '처리 중...' : '주문 취소'}
                </button>
              </div>
            </div>

            <div className="rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <SectionTitle title="진행 정보" />

              <div className="space-y-3 p-6">
                <InfoCard
                  label="현재 상태"
                  value={order.is_canceled ? '주문 취소' : order.status}
                />
                <InfoCard
                  label="수정 요청 여부"
                  value={order.admin_revision_requested ? '요청됨' : '없음'}
                />
                <InfoCard
                  label="수정 요청 시간"
                  value={formatDateTime(order.admin_revision_requested_at)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <SummaryInfo
              orderNumber={order.order_number}
              patientName={order.patient_name}
              createdAt={order.created_at}
              deliveryDate={order.delivery_date}
              clinicName={order.clinic_name}
              thickness={order.thickness}
              jigRequired={order.jig_required}
            />

            <TeethChart selectedTeeth={selectedTeeth} productType={order.product_type || '-'} />

            <RequestSection text={order.request_note} />

            <FileListSection
              title="스캔 파일"
              type="scan"
              files={scanFiles}
              canDownload={canDownloadScan}
              onDownload={handleDownload}
              onDownloadAll={() => handleDownloadAll(scanFiles, 'scan')}
            />

            <div className="rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <SectionTitle
                title="디자인 파일"
                right={
                  canUploadDesign ? (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-[12px] bg-[#0f1b3d] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#1a2954]"
                      >
                        파일 선택
                      </button>
                      <span className="text-[12px] font-semibold text-[#98a2b3]">
                        {selectedFiles.length > 0 ? `${selectedFiles.length}개 선택됨` : '선택된 파일 없음'}
                      </span>
                    </div>
                  ) : null
                }
              />

              <div className="p-6">
                {canUploadDesign && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".stl,.zip,.STL,.ZIP"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={classNames(
                        'mb-5 rounded-[18px] border-2 border-dashed p-6 transition',
                        dragActive ? 'border-blue-400 bg-blue-50' : 'border-[#d5dde8] bg-[#fbfcfe]'
                      )}
                    >
                      <div className="text-[14px] font-semibold text-[#344054]">
                        여기에 디자인 파일을 드래그하거나, 파일 선택 버튼을 눌러 업로드하세요.
                      </div>
                      <div className="mt-2 text-[12px] text-[#98a2b3]">허용 파일 형식: STL, ZIP</div>

                      {selectedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="flex items-center justify-between rounded-[12px] border border-[#e4e8ef] bg-white px-4 py-3"
                            >
                              <span className="text-[14px] font-semibold text-[#344054]">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => handleFileRemove(index)}
                                className="rounded-[10px] bg-red-100 px-3 py-2 text-[12px] font-bold text-red-700 transition hover:bg-red-200"
                              >
                                삭제
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-5">
                        <button
                          type="button"
                          onClick={handleDesignUpload}
                          disabled={uploadingDesign || selectedFiles.length === 0}
                          className="rounded-[12px] bg-[#5b8ef7] px-5 py-3 text-[13px] font-bold text-white transition hover:bg-[#4b7ce0] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {uploadingDesign ? '업로드 중...' : '수정본 업로드 / 재접수'}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <FileListSection
                  title=""
                  type="design"
                  files={designFiles}
                  canDownload={canDownloadDesign}
                  onDownload={handleDownload}
                  onDownloadAll={() => handleDownloadAll(designFiles, 'design')}
                />
              </div>
            </div>

            {order.status === '수정 요청 중' && (
              <div className="rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <SectionTitle title="재접수 파일 업로드" />

                <div className="p-6">
                  <input
                    ref={resubmissionFileInputRef}
                    type="file"
                    multiple
                    accept=".stl,.zip,.STL,.ZIP"
                    onChange={handleResubmissionFileInputChange}
                    className="hidden"
                  />

                  <div className="mb-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => resubmissionFileInputRef.current?.click()}
                      className="rounded-[12px] bg-[#0f1b3d] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#1a2954]"
                    >
                      파일 선택
                    </button>
                    <span className="text-[12px] font-semibold text-[#98a2b3]">
                      {selectedResubmissionFiles.length > 0
                        ? `${selectedResubmissionFiles.length}개 선택됨`
                        : '선택된 파일 없음'}
                    </span>
                  </div>

                  <div
                    onDragOver={handleResubmissionDragOver}
                    onDragLeave={handleResubmissionDragLeave}
                    onDrop={handleResubmissionDrop}
                    className={classNames(
                      'rounded-[18px] border-2 border-dashed p-6 transition',
                      resubmissionDragActive
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-[#d5dde8] bg-[#fbfcfe]'
                    )}
                  >
                    <div className="text-[14px] font-semibold text-[#344054]">
                      여기에 재접수 파일을 드래그하거나, 파일 선택 버튼을 눌러 업로드하세요.
                    </div>
                    <div className="mt-2 text-[12px] text-[#98a2b3]">허용 파일 형식: STL, ZIP</div>

                    {selectedResubmissionFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {selectedResubmissionFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between rounded-[12px] border border-[#e4e8ef] bg-white px-4 py-3"
                          >
                            <span className="text-[14px] font-semibold text-[#344054]">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => handleResubmissionFileRemove(index)}
                              className="rounded-[10px] bg-red-100 px-3 py-2 text-[12px] font-bold text-red-700 transition hover:bg-red-200"
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={handleResubmissionUpload}
                        disabled={uploadingResubmission || selectedResubmissionFiles.length === 0}
                        className="rounded-[12px] bg-[#f59e0b] px-5 py-3 text-[13px] font-bold text-white transition hover:bg-[#d98b08] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {uploadingResubmission ? '업로드 중...' : '재접수 파일 업로드'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5">
                    <FileListSection
                      title=""
                      type="resubmission"
                      files={resubmissionFiles}
                      canDownload={canDownloadDesign}
                      onDownload={handleDownload}
                      onDownloadAll={() => handleDownloadAll(resubmissionFiles, 'resubmission')}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}