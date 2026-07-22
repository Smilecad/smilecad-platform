// app/orders/[id]/edit/page.tsx
'use client'

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  PointerEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppTopNav from '@/app/components/AppTopNav'

type ProductType =
  | 'NT-tainer'
  | 'NT-spacer'
  | 'NT-regainer'
  | 'NT-lingual arch'
  | 'NT-uprighter'

type StoredUser = {
  id?: number
  loginId?: string
  email?: string
  role?: string
  phone?: string | null
}

type PriceInfo = {
  toothCount: number
  selectedToothCount: number
  missingToothCount: number
  productBasePrice: number
  toothAdjustmentPrice: number
  jigPrice: number
  totalPrice: number
  priceDescription: string
}

type ExistingScanFile = {
  name: string
  path: string
}

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
  '0.015inch(0.38mm)',
  '0.017inch(0.43mm)',
  '0.021inch(0.55mm)',
] as const

const PERMANENT_TOP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const PERMANENT_BOTTOM = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
const PRIMARY_TOP = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65]
const PRIMARY_BOTTOM = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]

const TOOTH_ROWS = [PERMANENT_TOP, PERMANENT_BOTTOM, PRIMARY_TOP, PRIMARY_BOTTOM]
const UPPER_TOOTH_SET = new Set([...PERMANENT_TOP, ...PRIMARY_TOP].map(toToothKey))
const LOWER_TOOTH_SET = new Set([...PERMANENT_BOTTOM, ...PRIMARY_BOTTOM].map(toToothKey))

const MAX_FILE_SIZE = 500 * 1024 * 1024
const MAX_FILE_COUNT = 10
const BASE_TOOTH_COUNT = 6
const NT_TAINER_BASE_PRICE = 35000
const NT_TAINER_TOOTH_UNIT_PRICE = 5000
const JIG_PRICE = 5000

const FIXED_PRODUCT_PRICES: Record<ProductType, number | null> = {
  'NT-tainer': null,
  'NT-spacer': 35000,
  'NT-regainer': 45000,
  'NT-lingual arch': 65000,
  'NT-uprighter': 45000,
}

const GET_ORDER_DETAIL_API_URL =
  process.env.NEXT_PUBLIC_NCP_GET_ORDER_DETAIL_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/get-order-detail'

const UPDATE_ORDER_BY_CLINIC_API_URL =
  process.env.NEXT_PUBLIC_NCP_UPDATE_ORDER_BY_CLINIC_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/update-order-by-clinic'

const GET_UPLOAD_URL_API_URL =
  process.env.NEXT_PUBLIC_NCP_GET_UPLOAD_URL_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/get-upload-url'

const DEFAULT_ERROR =
  '주문 수정 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요. 문제가 반복되면 스마일캐드에 문의해주세요.'

function toToothKey(value: number) {
  return String(value)
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function formatMoney(value: number) {
  return `${value.toLocaleString('ko-KR')}원`
}

function parseTextArray(value: any): string[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean)
  }

  return String(value)
    .replace(/[{}"]+/g, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function extractDateKey(value?: string | null) {
  if (!value) return ''
  const text = String(value).trim()
  const directMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (directMatch) return `${directMatch[1]}-${directMatch[2]}-${directMatch[3]}`
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return ''
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(date)
}

function getToothRange(startTooth: string, endTooth: string) {
  const startNumber = Number(startTooth)
  const endNumber = Number(endTooth)

  for (const row of TOOTH_ROWS) {
    const startIndex = row.indexOf(startNumber)
    const endIndex = row.indexOf(endNumber)

    if (startIndex !== -1 && endIndex !== -1) {
      const from = Math.min(startIndex, endIndex)
      const to = Math.max(startIndex, endIndex)
      return row.slice(from, to + 1).map(toToothKey)
    }
  }

  return [startTooth, endTooth]
}

function getJigUnitCount(teeth: string[]) {
  const hasUpper = teeth.some((tooth) => UPPER_TOOTH_SET.has(String(tooth)))
  const hasLower = teeth.some((tooth) => LOWER_TOOTH_SET.has(String(tooth)))
  if (hasUpper && hasLower) return 2
  if (hasUpper || hasLower) return 1
  return 0
}

function getArchCounts(teeth: string[]) {
  let upperCount = 0
  let lowerCount = 0

  for (const tooth of teeth) {
    const key = String(tooth)
    if (UPPER_TOOTH_SET.has(key)) upperCount += 1
    else if (LOWER_TOOTH_SET.has(key)) lowerCount += 1
  }

  return { upperCount, lowerCount }
}

function calculateNtTainerArchPrice(count: number) {
  if (count <= 0) return 0
  return Math.max(
    0,
    NT_TAINER_BASE_PRICE + (count - BASE_TOOTH_COUNT) * NT_TAINER_TOOTH_UNIT_PRICE
  )
}

function calculateNtTainerArchAdjustment(count: number) {
  if (count <= 0) return 0
  return (count - BASE_TOOTH_COUNT) * NT_TAINER_TOOTH_UNIT_PRICE
}

function getBillableTeeth(selectedTeeth: string[], missingTeeth: string[]) {
  return selectedTeeth.filter((tooth) => !missingTeeth.includes(tooth))
}

function calculateJigPrice(teeth: string[], jigRequired: string) {
  if (jigRequired !== 'Yes') return 0
  return getJigUnitCount(teeth) * JIG_PRICE
}

function calculatePrice(
  productType: ProductType | '',
  selectedTeeth: string[],
  missingTeeth: string[],
  jigRequired: string
): PriceInfo {
  const billableTeeth = getBillableTeeth(selectedTeeth, missingTeeth)
  const toothCount = billableTeeth.length
  const selectedToothCount = selectedTeeth.length
  const missingToothCount = missingTeeth.length
  const jigPrice = calculateJigPrice(billableTeeth, jigRequired)

  if (!productType) {
    return {
      toothCount,
      selectedToothCount,
      missingToothCount,
      productBasePrice: 0,
      toothAdjustmentPrice: 0,
      jigPrice,
      totalPrice: jigPrice,
      priceDescription: '제품 유형 선택 전',
    }
  }

  if (productType === 'NT-tainer') {
    const { upperCount, lowerCount } = getArchCounts(billableTeeth)
    const upperPrice = calculateNtTainerArchPrice(upperCount)
    const lowerPrice = calculateNtTainerArchPrice(lowerCount)
    const upperBasePrice = upperCount > 0 ? NT_TAINER_BASE_PRICE : 0
    const lowerBasePrice = lowerCount > 0 ? NT_TAINER_BASE_PRICE : 0
    const upperAdjustmentPrice = calculateNtTainerArchAdjustment(upperCount)
    const lowerAdjustmentPrice = calculateNtTainerArchAdjustment(lowerCount)
    const productBasePrice = upperBasePrice + lowerBasePrice
    const toothAdjustmentPrice = upperAdjustmentPrice + lowerAdjustmentPrice
    const productPrice = upperPrice + lowerPrice

    return {
      toothCount,
      selectedToothCount,
      missingToothCount,
      productBasePrice,
      toothAdjustmentPrice,
      jigPrice,
      totalPrice: productPrice + jigPrice,
      priceDescription: `NT-tainer 악별 계산: 상악 ${upperCount}개 ${formatMoney(
        upperPrice
      )}, 하악 ${lowerCount}개 ${formatMoney(
        lowerPrice
      )}, 1악 ${BASE_TOOTH_COUNT}전치 기준 ${formatMoney(
        NT_TAINER_BASE_PRICE
      )}, 치아 1개당 ±${formatMoney(NT_TAINER_TOOTH_UNIT_PRICE)}`,
    }
  }

  const productBasePrice = FIXED_PRODUCT_PRICES[productType] || 0

  return {
    toothCount,
    selectedToothCount,
    missingToothCount,
    productBasePrice,
    toothAdjustmentPrice: 0,
    jigPrice,
    totalPrice: productBasePrice + jigPrice,
    priceDescription: `${productType} 기본 단가 ${formatMoney(productBasePrice)}`,
  }
}

function parseNcpResponse(raw: any) {
  const parseJsonString = (value: any) => {
    if (typeof value !== 'string') return value
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  const candidates = [
    raw?.body,
    raw?.result?.body,
    raw?.response?.body,
    raw?.response?.result?.body,
    raw?.response?.result,
    raw?.result,
    raw,
  ]

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue
    const parsed = parseJsonString(candidate)
    if (parsed && typeof parsed === 'object' && ('success' in parsed || 'order' in parsed || 'error' in parsed)) {
      return parsed
    }
  }

  return raw
}

function toSafeUserMessage(error: unknown, fallback = DEFAULT_ERROR) {
  const message = error instanceof Error ? error.message : String(error || '')
  if (!message) return fallback

  const safeMessages = [
    '로그인 정보가 없습니다. 다시 로그인해주세요.',
    '환자 명을 입력해주세요.',
    '치아 번호를 하나 이상 선택해주세요.',
    '실제 제작할 치아가 하나 이상 있어야 합니다.',
    '유형을 선택해주세요.',
    '두께를 선택해주세요.',
    '스캔 파일을 첨부해주세요.',
    '수정 권한이 없거나 이미 수정 완료된 주문입니다.',
    '이 주문을 수정할 권한이 없습니다.',
    '취소된 주문은 수정할 수 없습니다.',
    '주문을 찾을 수 없습니다.',
  ]

  if (safeMessages.some((safeMessage) => message.includes(safeMessage))) return message
  return fallback
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-[#e9edf4] bg-[#f7f9fc] px-4 py-4 sm:px-6">
      <div className="text-[16px] font-extrabold text-[#263142] sm:text-[17px]">{title}</div>
      {description && <div className="mt-1 text-[12px] font-semibold text-[#98a2b3]">{description}</div>}
    </div>
  )
}

function FieldLabel({ required = false, children }: { required?: boolean; children: ReactNode }) {
  return (
    <div className="text-[14px] font-bold text-[#4b5565]">
      {required && <span className="mr-1 text-[#ef6b5a]">*</span>}
      {children}
    </div>
  )
}

function SelectButton({
  label,
  selected,
  onClick,
  compact = false,
}: {
  label: string
  selected: boolean
  onClick: () => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'w-full rounded-[14px] border text-center font-semibold transition sm:rounded-[16px]',
        compact
          ? 'h-11 whitespace-nowrap px-2 py-2 text-[12px] leading-tight sm:h-12 sm:px-2 sm:text-[13px]'
          : 'px-4 py-3 text-[14px] sm:px-5 sm:py-4 sm:text-[16px]',
        selected
          ? 'border-[#2563eb] bg-[#2563eb] text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]'
          : 'border-[#d6dde8] bg-white text-[#4d5968] hover:bg-[#f8fafc]'
      )}
    >
      {label}
    </button>
  )
}

function ToothButton({
  tooth,
  selected,
  missing,
  preview,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  tooth: string
  selected: boolean
  missing: boolean
  preview: boolean
  onClick: () => void
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void
}) {
  const active = selected || preview

  return (
    <button
      type="button"
      data-tooth={tooth}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={classNames(
        'flex h-[52px] w-[44px] touch-none select-none items-center justify-center rounded-[14px] border text-[13px] font-black transition',
        missing
          ? 'border-red-200 bg-red-50 text-red-600'
          : active
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
      )}
    >
      {tooth}
    </button>
  )
}

function ToothRow({
  label,
  teeth,
  selectedTeeth,
  missingTeeth,
  previewTeeth,
  onToggle,
  onPointerDownTooth,
  onPointerMoveTooth,
  onPointerUpTooth,
}: {
  label: string
  teeth: number[]
  selectedTeeth: string[]
  missingTeeth: string[]
  previewTeeth: string[]
  onToggle: (tooth: string) => void
  onPointerDownTooth: (tooth: string, event: PointerEvent<HTMLButtonElement>) => void
  onPointerMoveTooth: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerUpTooth: (event: PointerEvent<HTMLButtonElement>) => void
}) {
  return (
    <div className="grid grid-cols-[86px_1fr] items-center gap-4">
      <div className="text-[14px] font-black text-slate-500">{label}</div>
      <div className="flex flex-wrap gap-2">
        {teeth.map((n) => {
          const tooth = String(n)
          return (
            <ToothButton
              key={`${label}-${tooth}`}
              tooth={tooth}
              selected={selectedTeeth.includes(tooth)}
              missing={missingTeeth.includes(tooth)}
              preview={previewTeeth.includes(tooth)}
              onClick={() => onToggle(tooth)}
              onPointerDown={(event) => onPointerDownTooth(tooth, event)}
              onPointerMove={onPointerMoveTooth}
              onPointerUp={onPointerUpTooth}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function EditOrderPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const suppressNextClickRef = useRef(false)
  const toothDragRef = useRef({ active: false, startTooth: '', currentTooth: '', hasMoved: false })

  const [authToken, setAuthToken] = useState('')
  const [authUser, setAuthUser] = useState<StoredUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [editReason, setEditReason] = useState('')

  const [patientName, setPatientName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [clinicAddress, setClinicAddress] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [isRemake, setIsRemake] = useState(false)
  const [remakeReason, setRemakeReason] = useState('')
  const [requestNote, setRequestNote] = useState('')
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([])
  const [missingTeeth, setMissingTeeth] = useState<string[]>([])
  const [productType, setProductType] = useState<ProductType | ''>('')
  const [thickness, setThickness] = useState('')
  const [jigRequired, setJigRequired] = useState('No')
  const [existingFiles, setExistingFiles] = useState<ExistingScanFile[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)

  const [toothDragStart, setToothDragStart] = useState('')
  const [toothDragCurrent, setToothDragCurrent] = useState('')
  const [isToothDragging, setIsToothDragging] = useState(false)

  const previewTeeth = useMemo(() => {
    if (!isToothDragging || !toothDragStart || !toothDragCurrent) return []
    return getToothRange(toothDragStart, toothDragCurrent)
  }, [isToothDragging, toothDragStart, toothDragCurrent])

  const priceInfo = useMemo(
    () => calculatePrice(productType, selectedTeeth, missingTeeth, jigRequired),
    [productType, selectedTeeth, missingTeeth, jigRequired]
  )

  const selectedTeethSummary = selectedTeeth.length > 0 ? selectedTeeth.join(', ') : '선택 전'
  const missingTeethSummary = missingTeeth.length > 0 ? missingTeeth.join(', ') : '없음'
  const billableTeethSummary =
    getBillableTeeth(selectedTeeth, missingTeeth).length > 0
      ? getBillableTeeth(selectedTeeth, missingTeeth).join(', ')
      : '선택 전'

  const loadOrder = useCallback(async () => {
    const token = window.localStorage.getItem('smilecad_token')
    const userRaw = window.localStorage.getItem('smilecad_user')

    if (!token) {
      router.replace('/login')
      return
    }

    let storedUser: StoredUser | null = null
    try {
      storedUser = userRaw ? JSON.parse(userRaw) : null
    } catch {
      storedUser = null
    }

    setAuthToken(token)
    setAuthUser(storedUser)

    try {
      setLoading(true)
      setError('')

      const res = await fetch(`${GET_ORDER_DETAIL_API_URL}?id=${encodeURIComponent(id)}`, {
        method: 'GET',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      })

      const raw = await res.json().catch(() => ({}))
      const data = parseNcpResponse(raw)

      if (!res.ok || !data?.success || !data?.order) {
        throw new Error(data?.error || '주문 정보를 불러오지 못했습니다.')
      }

      const role = String(data.role || storedUser?.role || '').toLowerCase()
      if (role !== 'clinic') {
        throw new Error('치과 계정만 주문을 수정할 수 있습니다.')
      }

      const order = data.order
      const editStatus = String(order.edit_request_status || order.editRequestStatus || '').toLowerCase()
      const editAllowed = order.edit_allowed_once === true || String(order.edit_allowed_once || '').toLowerCase() === 'true'

      if (editStatus !== 'pending' || !editAllowed) {
        throw new Error('수정 권한이 없거나 이미 수정 완료된 주문입니다.')
      }

      setEditReason(String(order.edit_request_reason || order.editRequestReason || '').trim())
      setPatientName(order.patient_name || '')
      setBirthDate(extractDateKey(order.patient_birth || order.patientBirth))
      setGender(order.patient_gender || '')
      setClinicName(order.clinic_name || '')
      setClinicAddress(order.clinic_address || '')
      setDeliveryDate(extractDateKey(order.delivery_date || order.deliveryDate))
      setProductType((order.product_type || '') as ProductType)
      setSelectedTeeth(parseTextArray(order.selected_teeth))
      setMissingTeeth(parseTextArray(order.missing_teeth))
      setThickness(order.thickness || '')
      setJigRequired(order.jig_required || 'No')
      setRequestNote(order.request_note || '')
      setIsRemake(order.is_remake === true || String(order.is_remake || '').toLowerCase() === 'true')
      setRemakeReason(order.remake_reason || '')

      const names = parseTextArray(order.scan_file_names)
      const paths = parseTextArray(order.scan_file_paths)
      setExistingFiles(
        paths.map((path, index) => ({
          path,
          name: names[index] || `scan-file-${index + 1}.stl`,
        }))
      )
    } catch (err) {
      console.error('주문 수정 정보 로드 실패:', err)
      setError(toSafeUserMessage(err, DEFAULT_ERROR))
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  const getToothFromPoint = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY)
    const toothElement = element?.closest?.('[data-tooth]') as HTMLElement | null
    return toothElement?.dataset?.tooth || ''
  }

  const toggleTooth = (tooth: string) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }

    const isSelected = selectedTeeth.includes(tooth)
    const isMissing = missingTeeth.includes(tooth)

    if (!isSelected) {
      setSelectedTeeth((prev) => Array.from(new Set([...prev, tooth])))
      return
    }

    if (isSelected && !isMissing) {
      setMissingTeeth((prev) => Array.from(new Set([...prev, tooth])))
      return
    }

    setMissingTeeth((prev) => prev.filter((item) => item !== tooth))
    setSelectedTeeth((prev) => prev.filter((item) => item !== tooth))
  }

  const handleToothPointerDown = (tooth: string, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    toothDragRef.current = { active: true, startTooth: tooth, currentTooth: tooth, hasMoved: false }
    setToothDragStart(tooth)
    setToothDragCurrent(tooth)
    setIsToothDragging(true)
  }

  const handleToothPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!toothDragRef.current.active) return
    event.preventDefault()
    const currentTooth = getToothFromPoint(event.clientX, event.clientY)
    if (!currentTooth) return
    if (currentTooth !== toothDragRef.current.startTooth) toothDragRef.current.hasMoved = true
    toothDragRef.current.currentTooth = currentTooth
    setToothDragCurrent(currentTooth)
  }

  const finishToothDrag = () => {
    const { active, startTooth, currentTooth, hasMoved } = toothDragRef.current
    if (!active || !startTooth) return

    const endTooth = currentTooth || startTooth
    const isRangeDrag = hasMoved && startTooth !== endTooth

    if (isRangeDrag) {
      const range = getToothRange(startTooth, endTooth)
      setSelectedTeeth((prev) => Array.from(new Set([...prev, ...range])))
      setMissingTeeth((prev) => prev.filter((tooth) => !range.includes(tooth)))
      suppressNextClickRef.current = true
    }

    toothDragRef.current = { active: false, startTooth: '', currentTooth: '', hasMoved: false }
    setToothDragStart('')
    setToothDragCurrent('')
    setIsToothDragging(false)
  }

  const handleToothPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    finishToothDrag()
  }

  const mergeFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return
    const nextFiles = Array.from(incoming)

    setNewFiles((prev) => {
      const merged = [...prev]

      for (const file of nextFiles) {
        if (existingFiles.length + merged.length >= MAX_FILE_COUNT) {
          alert(`파일은 최대 ${MAX_FILE_COUNT}개까지 업로드 가능합니다.`)
          break
        }

        if (file.size > MAX_FILE_SIZE) {
          alert(`${file.name} 파일은 500MB 이하만 업로드 가능합니다.`)
          continue
        }

        const exists = merged.some(
          (item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified
        )
        if (!exists) merged.push(file)
      }

      return merged
    })
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    mergeFiles(event.target.files)
    if (fileInputRef.current) fileInputRef.current.value = ''
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!authToken || !(authUser?.email || authUser?.loginId)) {
      setError('로그인 정보가 없습니다. 다시 로그인해주세요.')
      router.replace('/login')
      return
    }

    if (!patientName.trim()) {
      setError('환자 명을 입력해주세요.')
      return
    }

    if (selectedTeeth.length === 0) {
      setError('치아 번호를 하나 이상 선택해주세요.')
      return
    }

    if (priceInfo.toothCount === 0) {
      setError('실제 제작할 치아가 하나 이상 있어야 합니다.')
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

    if (existingFiles.length + newFiles.length === 0) {
      setError('스캔 파일을 첨부해주세요.')
      return
    }

    if (!confirm('수정 내용을 저장하시겠습니까? 이 주문은 수정 후 다시 수정할 수 없습니다.')) return

    try {
      setSubmitting(true)
      setError('')

      const scanFileNames = existingFiles.map((file) => file.name)
      const scanFilePaths = existingFiles.map((file) => file.path)
      const uploadBatchId = crypto.randomUUID()

      for (const file of newFiles) {
        const uniqueFileName = `order_${uploadBatchId}_${Date.now()}_${file.name}`
        const keyResponse = await fetch(GET_UPLOAD_URL_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            fileName: uniqueFileName,
            filename: uniqueFileName,
            name: uniqueFileName,
            contentType: file.type || 'application/octet-stream',
            fileType: file.type || 'application/octet-stream',
          }),
        })

        const keyRaw = await keyResponse.json().catch(() => ({}))
        const uploadInfo = parseNcpResponse(keyRaw)
        const uploadUrl = uploadInfo?.uploadUrl || uploadInfo?.presignedUrl || uploadInfo?.signedUrl || uploadInfo?.url
        const filePath = uploadInfo?.filePath || uploadInfo?.objectKey || uploadInfo?.key || uploadInfo?.path || uniqueFileName

        if (!keyResponse.ok || !uploadInfo?.success || !uploadUrl || !filePath) {
          throw new Error('파일 업로드를 준비하는 중 문제가 발생했습니다.')
        }

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'x-amz-content-sha256': 'UNSIGNED-PAYLOAD' },
          body: file,
        })

        if (!uploadResponse.ok) {
          throw new Error('파일을 전송하는 중 문제가 발생했습니다.')
        }

        scanFileNames.push(file.name)
        scanFilePaths.push(filePath)
      }

      const updateRes = await fetch(UPDATE_ORDER_BY_CLINIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          authToken,
          token: authToken,
          order_id: Number(id),
          orderId: Number(id),
          patientName: patientName.trim(),
          gender: gender || null,
          birthDate: birthDate || null,
          clinicName: clinicName.trim(),
          clinicAddress: clinicAddress.trim(),
          productType,
          selectedTeeth,
          missingTeeth,
          billableTeeth: selectedTeeth.filter((tooth) => !missingTeeth.includes(tooth)),
          billableToothCount: priceInfo.toothCount,
          selectedToothCount: priceInfo.selectedToothCount,
          missingToothCount: priceInfo.missingToothCount,
          deliveryDate,
          thickness,
          jigRequired,
          requestNote: requestNote?.trim() || null,
          isRemake,
          remakeReason: isRemake ? remakeReason.trim() || null : null,
          scanFileNames,
          scanFilePaths,
          toothCount: priceInfo.toothCount,
          productBasePrice: priceInfo.productBasePrice,
          toothAdjustmentPrice: priceInfo.toothAdjustmentPrice,
          jigPrice: priceInfo.jigPrice,
          totalPrice: priceInfo.totalPrice,
          priceDescription: priceInfo.priceDescription,
        }),
      })

      const updateRaw = await updateRes.json().catch(() => ({}))
      const updateData = parseNcpResponse(updateRaw)

      if (!updateRes.ok || !updateData?.success) {
        throw new Error(updateData?.error || DEFAULT_ERROR)
      }

      alert('주문 수정이 완료되었습니다. 수정 권한은 사용 처리되었습니다.')
      router.push(`/orders/${id}`)
    } catch (err) {
      console.error('주문 수정 실패:', err)
      setError(toSafeUserMessage(err, DEFAULT_ERROR))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f9] px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-7 py-5 text-[15px] font-bold text-slate-500 shadow-sm">
          주문 수정 정보를 불러오는 중...
        </div>
      </main>
    )
  }

  if (error && !authToken) {
    return (
      <main className="min-h-screen bg-[#f3f5f9] px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-[980px] rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-[14px] font-bold text-red-600">
          {error}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f3f5f9] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[1480px]">
        <AppTopNav current="orders" />

        <div className="overflow-hidden rounded-[24px] border border-[#d9e0ea] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:rounded-[28px]">
          <div className="border-b border-[#e8edf5] bg-[#fbfcfe] px-4 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[28px] font-extrabold tracking-tight text-[#1f2937] sm:text-[30px]">
                  주문 수정
                </div>
                <div className="mt-2 text-[13px] font-semibold leading-5 text-[#667085] sm:text-[14px]">
                  스마일캐드 요청에 따라 1회만 수정할 수 있습니다. 저장 후에는 다시 수정할 수 없습니다.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
                <button
                  type="button"
                  onClick={() => router.push(`/orders/${id}`)}
                  className="rounded-[14px] border border-[#cfd7e3] bg-white px-4 py-3 text-[14px] font-bold text-[#475467] transition hover:bg-[#f8fafc] sm:px-6 sm:text-[15px]"
                >
                  취소
                </button>

                <button
                  type="submit"
                  form="edit-order-form"
                  disabled={submitting}
                  className="rounded-[14px] bg-[#2563eb] px-4 py-3 text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)] transition hover:bg-[#1d4ed8] disabled:opacity-60 sm:px-6 sm:text-[15px]"
                >
                  {submitting ? '저장 중...' : '수정 저장'}
                </button>
              </div>
            </div>
          </div>

          {editReason && (
            <div className="border-b border-blue-100 bg-blue-50 px-4 py-4 sm:px-8">
              <p className="text-[13px] font-black text-blue-700">스마일캐드 수정 요청 사유</p>
              <p className="mt-2 whitespace-pre-wrap text-[14px] font-bold leading-6 text-blue-800">{editReason}</p>
            </div>
          )}

          <form
            id="edit-order-form"
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-5 p-4 sm:gap-6 sm:p-6 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start xl:p-8"
          >
            <div className="min-w-0 space-y-5 xl:col-start-1">
              <div className="overflow-hidden rounded-[22px] border border-[#e1e7ef] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <SectionTitle title="기본 정보" />

                <div className="space-y-5 p-4 sm:p-6">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[82px_1fr] sm:items-center sm:gap-4">
                    <FieldLabel required>환자 명</FieldLabel>
                    <input
                      value={patientName}
                      onChange={(event) => setPatientName(event.target.value)}
                      className="h-11 w-full rounded-[12px] border border-[#d6dde8] bg-white px-4 text-[14px] text-[#344054] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[82px_1fr] sm:items-center sm:gap-4">
                    <FieldLabel>생년월일</FieldLabel>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(event) => setBirthDate(event.target.value)}
                      className="h-11 w-full rounded-[12px] border border-[#d6dde8] bg-white px-4 text-[14px] text-[#344054] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[82px_1fr] sm:items-center sm:gap-4">
                    <FieldLabel>성별</FieldLabel>
                    <div className="flex flex-wrap items-center gap-4 text-[14px] font-medium text-[#4b5565]">
                      {['남', '여'].map((value) => (
                        <label key={value} className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            name="gender"
                            value={value}
                            checked={gender === value}
                            onChange={(event) => setGender(event.target.value)}
                            className="h-4 w-4"
                          />
                          {value}
                        </label>
                      ))}
                      <button type="button" onClick={() => setGender('')} className="text-[13px] font-semibold text-[#98a2b3]">
                        선택 해제
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[#eef2f6] pt-5">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[82px_1fr] sm:items-center sm:gap-4">
                      <FieldLabel required>치과명</FieldLabel>
                      <input
                        value={clinicName}
                        disabled
                        className="h-11 w-full rounded-[12px] border border-[#d6dde8] bg-[#f8fafc] px-4 text-[14px] text-[#667085] outline-none"
                      />
                    </div>
                  </div>

                  <div className="border-t border-[#eef2f6] pt-5">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[82px_1fr] sm:items-start sm:gap-4">
                      <FieldLabel required>치과주소</FieldLabel>
                      <textarea
                        value={clinicAddress}
                        disabled
                        className="min-h-[86px] w-full resize-none rounded-[14px] border border-[#d6dde8] bg-[#f8fafc] p-4 text-[14px] text-[#667085] outline-none"
                      />
                    </div>
                  </div>

                  <div className="border-t border-[#eef2f6] pt-5">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[82px_1fr] sm:items-center sm:gap-4">
                      <FieldLabel required>희망 완료일</FieldLabel>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(event) => setDeliveryDate(event.target.value)}
                        className="h-11 w-full rounded-[12px] border border-[#d6dde8] bg-white px-4 text-[14px] text-[#344054] outline-none"
                      />
                    </div>
                  </div>

                  <div className="border-t border-[#eef2f6] pt-5">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[82px_1fr] sm:items-start sm:gap-4">
                      <FieldLabel>remake여부</FieldLabel>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 text-[14px] font-medium text-[#4b5565]">
                          <input
                            type="checkbox"
                            checked={isRemake}
                            onChange={(event) => {
                              const checked = event.target.checked
                              setIsRemake(checked)
                              if (!checked) setRemakeReason('')
                            }}
                            className="h-4 w-4"
                          />
                          remake
                        </label>
                        <input
                          type="text"
                          value={remakeReason}
                          onChange={(event) => setRemakeReason(event.target.value)}
                          disabled={!isRemake}
                          placeholder="ex) 끊어짐, 안맞음, 떨어짐"
                          className={classNames(
                            'h-11 w-full rounded-[12px] border border-[#d6dde8] bg-white px-4 text-[14px] text-[#344054] outline-none',
                            !isRemake && 'bg-[#f8fafc] text-[#98a2b3]'
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#eef2f6] pt-5">
                    <div className="mb-3 text-[14px] font-bold text-[#4b5565]">메모</div>
                    <textarea
                      value={requestNote}
                      onChange={(event) => setRequestNote(event.target.value)}
                      className="h-[140px] w-full resize-none rounded-[14px] border border-[#d6dde8] bg-white p-4 text-[14px] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[22px] border border-[#e1e7ef] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <SectionTitle title="요약 / 예상 금액" />
                <div className="p-4 sm:p-5">
                  <div className="grid gap-3 rounded-[18px] border border-dashed border-[#d8dfe8] bg-[#fbfcfe] p-4 sm:p-5">
                    <div className="rounded-[14px] bg-white p-4 text-center shadow-sm">
                      <div className="mb-2 text-[13px] font-bold text-[#97a0ae]">총 예상 금액</div>
                      <div className="text-[26px] font-black text-[#2563eb]">{formatMoney(priceInfo.totalPrice)}</div>
                    </div>
                    <div className="rounded-[14px] bg-[#f5f7fb] p-4 text-center">
                      <div className="mb-2 text-[13px] font-bold text-[#97a0ae]">유형</div>
                      <div className="text-[15px] font-bold text-[#475467]">{productType || '선택 전'}</div>
                    </div>
                    <div className="rounded-[14px] bg-[#eaf2ff] p-4 text-center">
                      <div className="mb-2 text-[13px] font-bold text-[#2563eb]">제작 범위 치아</div>
                      <div className="break-words text-[15px] font-bold text-[#1d4ed8]">{selectedTeethSummary}</div>
                      <div className="mt-2 text-[13px] font-black text-[#2563eb]">범위 총 {priceInfo.selectedToothCount}개</div>
                    </div>
                    <div className="rounded-[14px] bg-[#fff1f2] p-4 text-center">
                      <div className="mb-2 text-[13px] font-bold text-red-400">없는 치아 / 발치 치아</div>
                      <div className="break-words text-[15px] font-bold text-red-500">{missingTeethSummary}</div>
                      <div className="mt-2 text-[13px] font-black text-red-500">제외 {priceInfo.missingToothCount}개</div>
                    </div>
                    <div className="rounded-[14px] bg-[#ecfdf5] p-4 text-center">
                      <div className="mb-2 text-[13px] font-bold text-emerald-600">실제 청구 치아</div>
                      <div className="break-words text-[15px] font-bold text-emerald-700">{billableTeethSummary}</div>
                      <div className="mt-2 text-[13px] font-black text-emerald-600">총 {priceInfo.toothCount}개</div>
                    </div>
                    <div className="rounded-[14px] bg-white p-3 text-[12px] font-semibold leading-5 text-[#667085]">
                      {priceInfo.priceDescription}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <SectionTitle
                title="치아 번호 *"
                description="드래그로 제작 범위를 선택하고, 선택된 치아를 클릭하면 없는 치아로 표시되어 금액에서 제외됩니다."
              />

              <div className="space-y-5 overflow-x-auto px-4 py-5 sm:px-6 sm:py-6">
                <ToothRow
                  label="영구치 상악"
                  teeth={PERMANENT_TOP}
                  selectedTeeth={selectedTeeth}
                  missingTeeth={missingTeeth}
                  previewTeeth={previewTeeth}
                  onToggle={toggleTooth}
                  onPointerDownTooth={handleToothPointerDown}
                  onPointerMoveTooth={handleToothPointerMove}
                  onPointerUpTooth={handleToothPointerUp}
                />
                <ToothRow
                  label="영구치 하악"
                  teeth={PERMANENT_BOTTOM}
                  selectedTeeth={selectedTeeth}
                  missingTeeth={missingTeeth}
                  previewTeeth={previewTeeth}
                  onToggle={toggleTooth}
                  onPointerDownTooth={handleToothPointerDown}
                  onPointerMoveTooth={handleToothPointerMove}
                  onPointerUpTooth={handleToothPointerUp}
                />
                <div className="h-px bg-slate-200" />
                <ToothRow
                  label="유치 상악"
                  teeth={PRIMARY_TOP}
                  selectedTeeth={selectedTeeth}
                  missingTeeth={missingTeeth}
                  previewTeeth={previewTeeth}
                  onToggle={toggleTooth}
                  onPointerDownTooth={handleToothPointerDown}
                  onPointerMoveTooth={handleToothPointerMove}
                  onPointerUpTooth={handleToothPointerUp}
                />
                <ToothRow
                  label="유치 하악"
                  teeth={PRIMARY_BOTTOM}
                  selectedTeeth={selectedTeeth}
                  missingTeeth={missingTeeth}
                  previewTeeth={previewTeeth}
                  onToggle={toggleTooth}
                  onPointerDownTooth={handleToothPointerDown}
                  onPointerMoveTooth={handleToothPointerMove}
                  onPointerUpTooth={handleToothPointerUp}
                />
              </div>

              <div className="border-y border-[#e9edf4] bg-[#f7f9fc] px-4 py-4 text-[16px] font-extrabold text-[#263142] sm:px-6 sm:text-[17px]">
                유형 *
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {PRODUCT_TYPES.map((type) => (
                    <SelectButton key={type} label={type} selected={productType === type} onClick={() => setProductType(type)} compact />
                  ))}
                </div>
              </div>

              <div className="border-y border-[#e9edf4] bg-[#f7f9fc] px-4 py-4 text-[16px] font-extrabold text-[#263142] sm:px-6 sm:text-[17px]">
                두께 선택 *
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {THICKNESS_OPTIONS.map((option) => (
                    <SelectButton key={option} label={option} selected={thickness === option} onClick={() => setThickness(option)} compact />
                  ))}
                </div>
              </div>

              <div className="border-y border-[#e9edf4] bg-[#f7f9fc] px-4 py-4 sm:px-6">
                <div className="text-[16px] font-extrabold text-[#263142] sm:text-[17px]">지그 제작 여부 *</div>
                <div className="mt-2 text-[13px] font-bold text-red-500">상악 또는 하악 1악당 {formatMoney(JIG_PRICE)} 추가 비용 발생</div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-3">
                  <SelectButton label="Yes" selected={jigRequired === 'Yes'} onClick={() => setJigRequired('Yes')} />
                  <SelectButton label="No" selected={jigRequired === 'No'} onClick={() => setJigRequired('No')} />
                </div>
              </div>

              <SectionTitle title="스캔 파일 *" description="기존 파일을 유지하거나 삭제할 수 있고, 필요한 경우 새 스캔 파일을 추가할 수 있습니다." />
              <div className="p-4 sm:p-6">
                <div className="mb-4 space-y-2">
                  {existingFiles.map((file, index) => (
                    <div key={`${file.path}-${index}`} className="flex items-center justify-between gap-3 rounded-[12px] border border-[#e4e8ef] bg-white px-4 py-3">
                      <div className="min-w-0 truncate text-[13px] font-semibold text-[#475467]">기존 파일: {file.name}</div>
                      <button
                        type="button"
                        onClick={() => setExistingFiles((prev) => prev.filter((_, i) => i !== index))}
                        className="shrink-0 rounded-[10px] border border-[#e4e8ef] px-3 py-1.5 text-[12px] font-bold text-[#667085]"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>

                <label
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={classNames(
                    'flex min-h-[150px] cursor-pointer items-center justify-center rounded-[18px] border border-dashed text-center transition sm:min-h-[164px]',
                    dragActive ? 'border-[#2563eb] bg-[#eaf2ff] text-[#1d4ed8]' : 'border-[#d5dde8] bg-[#fbfcfe] text-[#8b95a5]'
                  )}
                >
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                  <div className="w-full px-4 py-6 sm:px-6 sm:py-8">
                    <div className="mb-2 text-[15px] font-semibold text-[#667085] sm:text-[16px]">새로 추가할 파일을 선택해주세요.</div>
                    <div className="text-[12px] text-[#98a2b3]">기존 파일 포함 최대 {MAX_FILE_COUNT}개 / 파일당 최대 500MB</div>
                    {newFiles.length > 0 && (
                      <div className="mt-5 space-y-2 text-left">
                        {newFiles.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-[12px] border border-[#e4e8ef] bg-white px-4 py-3">
                            <div className="min-w-0 truncate text-[13px] font-semibold text-[#475467]">새 파일: {file.name}</div>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                setNewFiles((prev) => prev.filter((_, i) => i !== index))
                              }}
                              className="shrink-0 rounded-[10px] border border-[#e4e8ef] px-3 py-1.5 text-[12px] font-bold text-[#667085]"
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

              {error && <div className="px-4 pb-6 text-sm font-semibold text-red-600 sm:px-6">{error}</div>}
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
