'use client'

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  PointerEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
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

const DEFAULT_USER_ERROR =
  '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요. 문제가 반복되면 스마일캐드에 문의해주세요.'

const DEFAULT_ORDER_ERROR =
  '주문 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요. 문제가 반복되면 스마일캐드에 문의해주세요.'

function toToothKey(value: number) {
  return String(value)
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function formatMoney(value: number) {
  return `${value.toLocaleString('ko-KR')}원`
}

function toLocalDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toCompactDateString(date: Date) {
  return toLocalDateString(date).replaceAll('-', '')
}

function isWeekend(date: Date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

function isBusinessDay(date: Date, holidays: Set<string>) {
  if (isWeekend(date)) return false
  return !holidays.has(toCompactDateString(date))
}

function addBusinessDaysInclusive(startDate: Date, businessDays: number, holidays: Set<string>) {
  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)

  let counted = 0
  while (true) {
    if (isBusinessDay(current, holidays)) {
      counted += 1
      if (counted >= businessDays) return new Date(current)
    }

    current.setDate(current.getDate() + 1)
  }
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

    if (UPPER_TOOTH_SET.has(key)) {
      upperCount += 1
    } else if (LOWER_TOOTH_SET.has(key)) {
      lowerCount += 1
    }
  }

  return {
    upperCount,
    lowerCount,
  }
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

function isTechnicalErrorMessage(message: string) {
  const value = message.toLowerCase()

  const technicalKeywords = [
    'failed to fetch',
    'networkerror',
    'cors',
    'access-control',
    'column',
    'relation',
    'constraint',
    'violates',
    'not-null',
    'null value',
    'syntax error',
    'jwt_secret',
    'object storage',
    'access key',
    'secret key',
    '환경변수',
    'statuscode',
    '상태코드',
    'internal server error',
    'bad gateway',
    'gateway',
    'unexpected token',
    'json',
    'database',
    'db_',
    'postgres',
    'sql',
  ]

  return technicalKeywords.some((keyword) => value.includes(keyword))
}

function toSafeUserMessage(error: unknown, fallback = DEFAULT_USER_ERROR) {
  const message = error instanceof Error ? error.message : String(error || '')

  if (!message) return fallback

  const userFixableMessages = [
    '치과 정보를 불러오는 중입니다.',
    '로그인 정보가 없습니다. 다시 로그인해주세요.',
    '환자 명을 입력해주세요.',
    '치과명을 입력해주세요.',
    '치과주소를 입력해주세요.',
    '희망 완료일을 입력해주세요.',
    '희망 완료일 형식이 올바르지 않습니다.',
    '주말은 희망 완료일로 선택할 수 없습니다.',
    '공휴일은 희망 완료일로 선택할 수 없습니다.',
    '치아 번호를 하나 이상 선택해주세요.',
    '실제 제작할 치아가 하나 이상 있어야 합니다.',
    '유형을 선택해주세요.',
    '두께를 선택해주세요.',
    '지그 제작 여부를 선택해주세요.',
    '환자 고지 및 동의 확인 항목에 체크해주세요.',
    '인증 토큰이 필요합니다.',
    '토큰이 만료되었습니다.',
  ]

  if (userFixableMessages.some((safeMessage) => message.includes(safeMessage))) {
    return message
  }

  if (message.includes('희망 완료일은') && message.includes('이후부터 선택할 수 있습니다')) {
    return message
  }

  if (message.includes('파일은 최대') || message.includes('500MB 이하')) {
    return message
  }

  if (isTechnicalErrorMessage(message)) {
    return fallback
  }

  return fallback
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

    if (
      parsed &&
      typeof parsed === 'object' &&
      ('success' in parsed || 'orderId' in parsed || 'error' in parsed || 'uploadUrl' in parsed || 'url' in parsed)
    ) {
      return parsed
    }
  }

  return raw
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
  tooth,
  selected,
  missing,
  preview,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  flipped = false,
}: {
  tooth: string
  selected: boolean
  missing?: boolean
  preview?: boolean
  onClick: () => void
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void
  flipped?: boolean
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
      onPointerCancel={onPointerCancel}
      className={classNames(
        'touch-none select-none flex h-[68px] w-[38px] items-center justify-center rounded-[12px] transition',
        missing ? 'bg-[#fff1f2]' : active ? 'bg-[#eaf2ff]' : 'hover:bg-[#f8fafc]'
      )}
    >
      <svg
        viewBox="0 0 36 58"
        className={classNames('pointer-events-none h-[56px] w-[30px]', flipped && 'rotate-180')}
        fill={missing ? '#ef4444' : active ? '#2563eb' : 'none'}
        stroke={missing ? '#ef4444' : active ? '#2563eb' : '#c9cdd5'}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6 C7 12, 7 19, 9 26 C10 31, 10 37, 10 45 C10 50, 12 51, 14 46 L16.5 34 C17 31, 19 31, 19.5 34 L22 46 C24 51, 26 50, 26 45 C26 37, 26 31, 27 26 C29 19, 29 12, 27 6" />
        <path d="M9 6 C12 2, 24 2, 27 6" />
        {missing && (
          <>
            <path d="M11 18 L25 40" stroke="white" strokeWidth="3" />
            <path d="M25 18 L11 40" stroke="white" strokeWidth="3" />
          </>
        )}
      </svg>
    </button>
  )
}

function PrimaryMolarTooth({
  tooth,
  selected,
  missing,
  preview,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  tooth: string
  selected: boolean
  missing?: boolean
  preview?: boolean
  onClick: () => void
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void
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
      onPointerCancel={onPointerCancel}
      className={classNames(
        'touch-none select-none flex h-[68px] w-[40px] items-center justify-center rounded-[12px] transition',
        missing ? 'bg-[#fff1f2]' : active ? 'bg-[#eaf2ff]' : 'hover:bg-[#f8fafc]'
      )}
    >
      <svg
        viewBox="0 0 40 58"
        className="pointer-events-none h-[56px] w-[34px]"
        fill={missing ? '#ef4444' : active ? '#2563eb' : 'none'}
        stroke={missing ? '#ef4444' : active ? '#2563eb' : '#c9cdd5'}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 9 C8 4, 15 3, 20 7 C25 3, 32 4, 33 9 C33 16, 32 24, 29 30 C28 35, 28 41, 28 48 C28 52, 26 53, 24 48 L21.5 36 C21 33, 19 33, 18.5 36 L16 48 C14 53, 12 52, 12 48 C12 41, 12 35, 11 30 C8 24, 7 16, 7 9 Z" />
        {missing && (
          <>
            <path d="M12 18 L28 40" stroke="white" strokeWidth="3" />
            <path d="M28 18 L12 40" stroke="white" strokeWidth="3" />
          </>
        )}
      </svg>
    </button>
  )
}

function PrimarySlimTooth({
  tooth,
  selected,
  missing,
  preview,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  tooth: string
  selected: boolean
  missing?: boolean
  preview?: boolean
  onClick: () => void
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void
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
      onPointerCancel={onPointerCancel}
      className={classNames(
        'touch-none select-none flex h-[68px] w-[40px] items-center justify-center rounded-[12px] transition',
        missing ? 'bg-[#fff1f2]' : active ? 'bg-[#eaf2ff]' : 'hover:bg-[#f8fafc]'
      )}
    >
      <svg
        viewBox="0 0 36 58"
        className="pointer-events-none h-[56px] w-[34px]"
        fill={missing ? '#ef4444' : active ? '#2563eb' : 'none'}
        stroke={missing ? '#ef4444' : active ? '#2563eb' : '#c9cdd5'}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 7 C9 12, 9 18, 10 24 C11 29, 11 35, 11 43 C11 48, 13 50, 15 45 L17 33 C17.5 30, 18.5 30, 19 33 L21 45 C23 50, 25 48, 25 43 C25 35, 25 29, 26 24 C27 18, 27 12, 26 7" />
        <path d="M10 7 C13 4, 23 4, 26 7" />
        {missing && (
          <>
            <path d="M11 18 L25 40" stroke="white" strokeWidth="3" />
            <path d="M25 18 L11 40" stroke="white" strokeWidth="3" />
          </>
        )}
      </svg>
    </button>
  )
}

function PermanentChart({
  topNumbers,
  bottomNumbers,
  selectedTeeth,
  missingTeeth,
  previewTeeth,
  onToggle,
  onPointerDownTooth,
  onPointerMoveTooth,
  onPointerUpTooth,
}: {
  topNumbers: number[]
  bottomNumbers: number[]
  selectedTeeth: string[]
  missingTeeth: string[]
  previewTeeth: string[]
  onToggle: (tooth: string) => void
  onPointerDownTooth: (tooth: string, event: PointerEvent<HTMLButtonElement>) => void
  onPointerMoveTooth: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerUpTooth: (event: PointerEvent<HTMLButtonElement>) => void
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
              tooth={key}
              selected={selectedTeeth.includes(key)}
              missing={missingTeeth.includes(key)}
              preview={previewTeeth.includes(key)}
              onClick={() => onToggle(key)}
              onPointerDown={(event) => onPointerDownTooth(key, event)}
              onPointerMove={onPointerMoveTooth}
              onPointerUp={onPointerUpTooth}
              onPointerCancel={onPointerUpTooth}
              flipped={!bottom}
            />
            {bottom && <div className="mt-2 text-[12px] font-semibold text-[#525c6b]">{n}</div>}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="overflow-x-auto px-4 py-5 sm:px-6 sm:py-6">
      <div className="min-w-[820px]">
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
    </div>
  )
}

function PrimaryChart({
  topNumbers,
  bottomNumbers,
  selectedTeeth,
  missingTeeth,
  previewTeeth,
  onToggle,
  onPointerDownTooth,
  onPointerMoveTooth,
  onPointerUpTooth,
}: {
  topNumbers: number[]
  bottomNumbers: number[]
  selectedTeeth: string[]
  missingTeeth: string[]
  previewTeeth: string[]
  onToggle: (tooth: string) => void
  onPointerDownTooth: (tooth: string, event: PointerEvent<HTMLButtonElement>) => void
  onPointerMoveTooth: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerUpTooth: (event: PointerEvent<HTMLButtonElement>) => void
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
                tooth={key}
                selected={selectedTeeth.includes(key)}
                missing={missingTeeth.includes(key)}
                preview={previewTeeth.includes(key)}
                onClick={() => onToggle(key)}
                onPointerDown={(event) => onPointerDownTooth(key, event)}
                onPointerMove={onPointerMoveTooth}
                onPointerUp={onPointerUpTooth}
                onPointerCancel={onPointerUpTooth}
              />
            ) : (
              <PrimarySlimTooth
                tooth={key}
                selected={selectedTeeth.includes(key)}
                missing={missingTeeth.includes(key)}
                preview={previewTeeth.includes(key)}
                onClick={() => onToggle(key)}
                onPointerDown={(event) => onPointerDownTooth(key, event)}
                onPointerMove={onPointerMoveTooth}
                onPointerUp={onPointerUpTooth}
                onPointerCancel={onPointerUpTooth}
              />
            )}
            {bottom && <div className="mt-2 text-[12px] font-semibold text-[#525c6b]">{n}</div>}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="overflow-x-auto px-4 py-5 sm:px-6 sm:py-6">
      <div className="min-w-[540px]">
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
        'rounded-[16px] border px-4 py-3 text-[14px] font-semibold transition sm:rounded-[18px] sm:px-5 sm:py-4 sm:text-[16px]',
        wide ? 'w-full' : 'w-full sm:w-[210px]',
        selected
          ? 'border-[#2563eb] bg-[#2563eb] text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]'
          : 'border-[#d6dde8] bg-white text-[#4d5968] hover:bg-[#f8fafc]'
      )}
    >
      {label}
    </button>
  )
}

export default function NewOrderPage() {
  const router = useRouter()
  const [authToken, setAuthToken] = useState('')
  const [authUser, setAuthUser] = useState<StoredUser | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const suppressNextClickRef = useRef(false)
  const toothDragRef = useRef({
    active: false,
    startTooth: '',
    currentTooth: '',
    hasMoved: false,
  })

  const [submitting, setSubmitting] = useState(false)
  const [loadingClinicInfo, setLoadingClinicInfo] = useState(true)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const [toothDragStart, setToothDragStart] = useState('')
  const [toothDragCurrent, setToothDragCurrent] = useState('')
  const [isToothDragging, setIsToothDragging] = useState(false)
  const [, setDidToothDrag] = useState(false)

  const [patientName, setPatientName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [clinicAddress, setClinicAddress] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [isRemake, setIsRemake] = useState(false)
  const [requestNote, setRequestNote] = useState('')

  const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set())
  const [minimumDeliveryDate, setMinimumDeliveryDate] = useState('')

  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([])
  const [missingTeeth, setMissingTeeth] = useState<string[]>([])
  const [productType, setProductType] = useState<ProductType | ''>('')
  const [thickness, setThickness] = useState('')
  const [jigRequired, setJigRequired] = useState('No')
  const [files, setFiles] = useState<File[]>([])

  const [isAgreed, setIsAgreed] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const previewTeeth = useMemo(() => {
    if (!isToothDragging || !toothDragStart || !toothDragCurrent) return []
    return getToothRange(toothDragStart, toothDragCurrent)
  }, [isToothDragging, toothDragStart, toothDragCurrent])

  const priceInfo = useMemo(
    () => calculatePrice(productType, selectedTeeth, missingTeeth, jigRequired),
    [productType, selectedTeeth, missingTeeth, jigRequired]
  )

  useEffect(() => {
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

    const loadClinicInfo = async () => {
      try {
        setLoadingClinicInfo(true)

        const profileApiUrl =
          process.env.NEXT_PUBLIC_NCP_PROFILE_API_URL ||
          'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/get-profile-web'

        const res = await fetch(profileApiUrl, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const raw = await res.json().catch(() => ({}))
        const data = parseNcpResponse(raw)

        if (!res.ok) {
          throw new Error(data?.error || '치과 정보를 불러오지 못했습니다.')
        }

        setClinicName(data?.clinicName || '')
        setClinicAddress(data?.clinicAddress || '')
      } catch (err) {
        console.error('치과 정보 로드 실패:', err)
      } finally {
        setLoadingClinicInfo(false)
      }
    }

    loadClinicInfo()
  }, [router])

  useEffect(() => {
    const loadHolidays = async () => {
      try {
        const holidaysApiUrl = process.env.NEXT_PUBLIC_NCP_HOLIDAYS_API_URL

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (!holidaysApiUrl) {
          const fallbackMinDate = addBusinessDaysInclusive(today, 4, new Set())
          setMinimumDeliveryDate(toLocalDateString(fallbackMinDate))
          return
        }

        const currentYear = String(today.getFullYear())
        const nextYear = String(today.getFullYear() + 1)

        const currentUrl = new URL(holidaysApiUrl)
        currentUrl.searchParams.set('year', currentYear)

        const nextUrl = new URL(holidaysApiUrl)
        nextUrl.searchParams.set('year', nextYear)

        const [currentRes, nextRes] = await Promise.all([
          fetch(currentUrl.toString(), { cache: 'no-store' }),
          fetch(nextUrl.toString(), { cache: 'no-store' }),
        ])

        const currentRaw = await currentRes.json().catch(() => ({}))
        const nextRaw = await nextRes.json().catch(() => ({}))

        const currentJson = parseNcpResponse(currentRaw)
        const nextJson = parseNcpResponse(nextRaw)

        const holidayDates = [
          ...((currentJson.holidays as Array<{ date: string }>) || []),
          ...((nextJson.holidays as Array<{ date: string }>) || []),
        ].map((item) => item.date)

        const nextHolidaySet = new Set(holidayDates)
        const minDate = addBusinessDaysInclusive(today, 4, nextHolidaySet)

        setHolidaySet(nextHolidaySet)
        setMinimumDeliveryDate(toLocalDateString(minDate))
      } catch (err) {
        console.error('휴일 정보 로드 실패:', err)

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const fallbackMinDate = addBusinessDaysInclusive(today, 4, new Set())
        setMinimumDeliveryDate(toLocalDateString(fallbackMinDate))
      }
    }

    loadHolidays()
  }, [])

  const selectedTeethSummary = useMemo(() => {
    if (selectedTeeth.length === 0) return '선택 전'
    return selectedTeeth.join(', ')
  }, [selectedTeeth])

  const missingTeethSummary = useMemo(() => {
    if (missingTeeth.length === 0) return '없음'
    return missingTeeth.join(', ')
  }, [missingTeeth])

  const billableTeethSummary = useMemo(() => {
    const billable = selectedTeeth.filter((tooth) => !missingTeeth.includes(tooth))
    if (billable.length === 0) return '선택 전'
    return billable.join(', ')
  }, [selectedTeeth, missingTeeth])

  const getToothFromPoint = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY)
    const toothElement = element?.closest?.('[data-tooth]') as HTMLElement | null
    return toothElement?.dataset?.tooth || ''
  }

  const updateDragPreview = (currentTooth: string) => {
    const startTooth = toothDragRef.current.startTooth

    if (!startTooth || !currentTooth) return

    if (currentTooth !== startTooth) {
      toothDragRef.current.hasMoved = true
      setDidToothDrag(true)
    }

    toothDragRef.current.currentTooth = currentTooth
    setToothDragCurrent(currentTooth)
  }

  const toggleTooth = (tooth: string) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }

    const isSelected = selectedTeeth.includes(tooth)
    const isMissing = missingTeeth.includes(tooth)

    // 1단계: 미선택 -> 제작 치아 선택
    if (!isSelected) {
      setSelectedTeeth((prev) => Array.from(new Set([...prev, tooth])))
      return
    }

    // 2단계: 제작 치아 -> 없는 치아 / 발치 치아
    if (isSelected && !isMissing) {
      setMissingTeeth((prev) => Array.from(new Set([...prev, tooth])))
      return
    }

    // 3단계: 없는 치아 -> 완전 선택 해제
    setMissingTeeth((prev) => prev.filter((item) => item !== tooth))
    setSelectedTeeth((prev) => prev.filter((item) => item !== tooth))
  }

  const handleToothPointerDown = (tooth: string, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()

    toothDragRef.current = {
      active: true,
      startTooth: tooth,
      currentTooth: tooth,
      hasMoved: false,
    }

    setToothDragStart(tooth)
    setToothDragCurrent(tooth)
    setIsToothDragging(true)
    setDidToothDrag(false)
  }

  const handleToothPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!toothDragRef.current.active) return

    event.preventDefault()

    const currentTooth = getToothFromPoint(event.clientX, event.clientY)
    if (!currentTooth) return

    updateDragPreview(currentTooth)
  }

  const finishToothDrag = () => {
    const { active, startTooth, currentTooth, hasMoved } = toothDragRef.current

    if (!active || !startTooth) return

    const endTooth = currentTooth || startTooth
    const isRangeDrag = hasMoved && startTooth !== endTooth

    if (isRangeDrag) {
      const range = getToothRange(startTooth, endTooth)

      setSelectedTeeth((prev) => Array.from(new Set([...prev, ...range])))

      // 드래그로 다시 제작 범위에 포함한 치아는 없는 치아 표시를 해제합니다.
      setMissingTeeth((prev) => prev.filter((tooth) => !range.includes(tooth)))

      suppressNextClickRef.current = true
    }

    toothDragRef.current = {
      active: false,
      startTooth: '',
      currentTooth: '',
      hasMoved: false,
    }

    setToothDragStart('')
    setToothDragCurrent('')
    setIsToothDragging(false)
    setDidToothDrag(false)
  }

  const handleToothPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    finishToothDrag()
  }

  const clearAllTeeth = () => {
    setSelectedTeeth([])
    setMissingTeeth([])
  }

  const validateDeliveryDate = (value: string) => {
    if (!value) return '희망 완료일을 입력해주세요.'

    const selected = new Date(`${value}T00:00:00`)
    selected.setHours(0, 0, 0, 0)

    if (Number.isNaN(selected.getTime())) return '희망 완료일 형식이 올바르지 않습니다.'

    if (minimumDeliveryDate) {
      const minDate = new Date(`${minimumDeliveryDate}T00:00:00`)
      minDate.setHours(0, 0, 0, 0)

      if (selected < minDate) {
        return `희망 완료일은 ${minimumDeliveryDate} 이후부터 선택할 수 있습니다.`
      }
    }

    if (isWeekend(selected)) return '주말은 희망 완료일로 선택할 수 없습니다.'
    if (holidaySet.has(toCompactDateString(selected))) return '공휴일은 희망 완료일로 선택할 수 없습니다.'

    return ''
  }

  const mergeFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return

    const nextFiles = Array.from(incoming)

    setFiles((prev) => {
      const merged = [...prev]

      for (const file of nextFiles) {
        if (merged.length >= MAX_FILE_COUNT) {
          alert(`파일은 최대 ${MAX_FILE_COUNT}개까지 업로드 가능합니다.`)
          break
        }

        if (file.size > MAX_FILE_SIZE) {
          alert(`${file.name} 파일은 500MB 이하만 업로드 가능합니다.`)
          continue
        }

        const exists = merged.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified
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

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (loadingClinicInfo) {
      setError('치과 정보를 불러오는 중입니다.')
      return
    }

    const loginEmail = authUser?.email || authUser?.loginId || ''

    if (!authToken || !loginEmail) {
      setError('로그인 정보가 없습니다. 다시 로그인해주세요.')
      router.replace('/login')
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
      setError('치과주소를 입력해주세요.')
      return
    }

    const deliveryDateError = validateDeliveryDate(deliveryDate)
    if (deliveryDateError) {
      setError(deliveryDateError)
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

    if (!jigRequired) {
      setError('지그 제작 여부를 선택해주세요.')
      return
    }

    if (!isAgreed) {
      setError('환자 고지 및 동의 확인 항목에 체크해주세요.')
      return
    }

    setError('')
    setShowConfirmModal(true)
  }

  const submitConfirmedOrder = async () => {
    const loginEmail = authUser?.email || authUser?.loginId || ''

    if (!authToken || !loginEmail) {
      setError('로그인 정보가 없습니다. 다시 로그인해주세요.')
      setShowConfirmModal(false)
      router.replace('/login')
      return
    }

    try {
      setSubmitting(true)
      setShowConfirmModal(false)
      setError('')

      const createOrderApiUrl =
        process.env.NEXT_PUBLIC_NCP_CREATE_ORDER_API_URL ||
        'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/create-order'

      const getUploadUrlApiUrl =
        process.env.NEXT_PUBLIC_NCP_GET_UPLOAD_URL_API_URL ||
        'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/get-upload-url'

      const uploadBatchId = crypto.randomUUID()
      const scanFileNames: string[] = []
      const scanFilePaths: string[] = []

      if (files.length > 0) {
        for (const file of files) {
          const uniqueFileName = `order_${uploadBatchId}_${Date.now()}_${file.name}`

          const keyResponse = await fetch(getUploadUrlApiUrl, {
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

          const uploadUrl =
            uploadInfo?.uploadUrl ||
            uploadInfo?.presignedUrl ||
            uploadInfo?.signedUrl ||
            uploadInfo?.url

          const filePath =
            uploadInfo?.filePath ||
            uploadInfo?.objectKey ||
            uploadInfo?.key ||
            uploadInfo?.path ||
            uniqueFileName

          if (!keyResponse.ok || !uploadInfo?.success || !uploadUrl || !filePath) {
            console.error('get-upload-url 응답 오류:', keyRaw, uploadInfo)
            throw new Error('파일 업로드를 준비하는 중 문제가 발생했습니다.')
          }

          const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
            },
            body: file,
          })

          if (!uploadResponse.ok) {
            const uploadErrorText = await uploadResponse.text().catch(() => '')
            console.error('Object Storage 업로드 실패:', uploadResponse.status, uploadErrorText)
            throw new Error('파일을 전송하는 중 문제가 발생했습니다.')
          }

          scanFileNames.push(file.name)
          scanFilePaths.push(filePath)
        }
      }

      const createOrderRes = await fetch(createOrderApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          authToken,
          token: authToken,
          email: loginEmail,
          clinicName: clinicName.trim(),
          clinicAddress: clinicAddress.trim(),
          patientName: patientName.trim(),
          gender: gender || null,
          birthDate: birthDate || null,
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
          isAgreed,
          scanFileNames,
          scanFilePaths,

          toothCount: priceInfo.toothCount,
          productBasePrice: priceInfo.productBasePrice,
          basePrice: priceInfo.productBasePrice,
          toothAdjustmentPrice: priceInfo.toothAdjustmentPrice,
          toothExtraPrice: priceInfo.toothAdjustmentPrice,
          jigPrice: priceInfo.jigPrice,
          totalPrice: priceInfo.totalPrice,
          priceDescription: priceInfo.priceDescription,
        }),
      })

      const createOrderRaw = await createOrderRes.json().catch(() => ({}))
      const createOrderData = parseNcpResponse(createOrderRaw)

      if (!createOrderRes.ok || createOrderData?.success === false) {
        console.error('create-order 응답 오류:', createOrderRaw, createOrderData)
        throw new Error(createOrderData?.error || DEFAULT_ORDER_ERROR)
      }

      alert('주문과 파일 업로드가 성공적으로 완료되었습니다!')
      router.push('/orders')
    } catch (err) {
      console.error('주문 접수 실패:', err)
      setError(toSafeUserMessage(err, DEFAULT_ORDER_ERROR))
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingClinicInfo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f5f9] px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-7 py-5 text-[15px] font-bold text-slate-500 shadow-sm">
          치과 정보를 불러오는 중...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f3f5f9] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[1480px]">
        <AppTopNav current="orders-new" />

        <div className="overflow-hidden rounded-[24px] border border-[#d9e0ea] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:rounded-[28px]">
          <div className="border-b border-[#e8edf5] bg-[#fbfcfe] px-4 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[28px] font-extrabold tracking-tight text-[#1f2937] sm:text-[30px]">
                  주문하기
                </div>
                <div className="mt-2 text-[13px] text-[#98a2b3] sm:text-[14px]">
                  * 항목은 필수 입력 사항입니다.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/orders')}
                  className="rounded-[14px] border border-[#cfd7e3] bg-white px-4 py-3 text-[14px] font-bold text-[#475467] transition hover:bg-[#f8fafc] sm:px-6 sm:text-[15px]"
                >
                  취소
                </button>

                <button
                  type="submit"
                  form="new-order-form"
                  disabled={submitting || loadingClinicInfo || !isAgreed}
                  className="rounded-[14px] bg-[#3b82f6] px-4 py-3 text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(59,130,246,0.24)] transition hover:bg-[#2563eb] disabled:opacity-60 sm:px-6 sm:text-[15px]"
                >
                  {submitting ? '저장 중...' : '보내기'}
                </button>
              </div>
            </div>
          </div>

          <form
            id="new-order-form"
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-5 p-4 sm:gap-6 sm:p-6 xl:grid-cols-[340px_minmax(0,1fr)_320px] xl:p-8"
          >
            <div className="min-w-0 overflow-hidden rounded-[22px] border border-[#e1e7ef] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <SectionTitle title="기본 정보" />

              <div className="space-y-5 p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[82px_1fr] sm:items-center sm:gap-4">
                  <FieldLabel required>환자 명</FieldLabel>
                  <TextInput value={patientName} onChange={setPatientName} />
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[82px_1fr] sm:items-center sm:gap-4">
                  <FieldLabel>생년월일</FieldLabel>
                  <TextInput value={birthDate} onChange={setBirthDate} placeholder="연도-월-일" type="date" />
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[82px_1fr] sm:items-center sm:gap-4">
                  <FieldLabel>성별</FieldLabel>
                  <div className="flex flex-wrap items-center gap-4 text-[14px] font-medium text-[#4b5565]">
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
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[82px_1fr] sm:items-center sm:gap-4">
                    <FieldLabel required>치과명</FieldLabel>
                    <div>
                      <TextInput
                        value={clinicName}
                        onChange={setClinicName}
                        disabled={loadingClinicInfo}
                        placeholder={loadingClinicInfo ? '치과명 불러오는 중...' : '치과명을 입력하세요'}
                      />
                      <div className="mt-2 text-[12px] text-[#98a2b3]">
                        회원가입 시 등록된 치과명이 자동 입력되며, 수정할 수 있습니다.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#eef2f6] pt-5">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[82px_1fr] sm:items-start sm:gap-4">
                    <FieldLabel required>치과주소</FieldLabel>
                    <textarea
                      value={clinicAddress}
                      onChange={(e) => setClinicAddress(e.target.value)}
                      disabled={loadingClinicInfo}
                      placeholder={loadingClinicInfo ? '치과주소 불러오는 중...' : '치과 주소를 입력하세요'}
                      className={classNames(
                        'min-h-[96px] w-full resize-none rounded-[14px] border border-[#d6dde8] bg-white p-4 text-[14px] outline-none transition focus:border-[#9db7ff]',
                        loadingClinicInfo && 'bg-[#f8fafc] text-[#667085]'
                      )}
                    />
                  </div>
                </div>

                <div className="border-t border-[#eef2f6] pt-5">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[82px_1fr] sm:items-center sm:gap-4">
                    <FieldLabel required>희망 완료일</FieldLabel>
                    <div>
                      <input
                        type="date"
                        value={deliveryDate}
                        min={minimumDeliveryDate || undefined}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="h-11 w-full rounded-[12px] border border-[#d6dde8] bg-white px-4 text-[14px] text-[#344054] outline-none"
                      />
                      <div className="mt-2 text-[12px] text-[#98a2b3]">
                        {minimumDeliveryDate
                          ? `최소 선택 가능일: ${minimumDeliveryDate}`
                          : '최소 선택 가능일을 계산 중입니다.'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#eef2f6] pt-5">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[82px_1fr] sm:items-center sm:gap-4">
                    <FieldLabel>remake여부</FieldLabel>
                    <label className="flex items-center gap-3 text-[14px] font-medium text-[#4b5565]">
                      <input
                        type="checkbox"
                        checked={isRemake}
                        onChange={(e) => setIsRemake(e.target.checked)}
                        className="h-4 w-4"
                      />
                      remake입니다
                    </label>
                  </div>
                </div>

                <div className="border-t border-[#eef2f6] pt-5">
                  <div className="mb-3 text-[14px] font-bold text-[#4b5565]">메모</div>
                  <textarea
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    className="h-[150px] w-full resize-none rounded-[14px] border border-[#d6dde8] bg-white p-4 text-[14px] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-[22px] border border-[#dce3ec] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <SectionTitle
                title="치아 번호 (영구치) *"
                description="드래그로 제작 범위를 선택하고, 선택된 치아를 클릭하면 없는 치아로 표시되어 금액에서 제외됩니다."
              />

              <div className="border-b border-[#e9edf4] bg-[#f8fafc] px-4 py-4 sm:px-6">
                <div className="rounded-[18px] border border-blue-100 bg-blue-50 p-4">
                  <div className="mb-3 text-[14px] font-black text-[#1d4ed8]">
                    치식 선택 방법
                  </div>

                  <div className="grid gap-3 text-[13px] font-bold leading-5 text-[#2563eb] md:grid-cols-3">
                    <div className="rounded-[14px] bg-white/70 p-3">
                      <div className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-blue-400">
                        STEP 1
                      </div>
                      드래그로 제작할 치아 범위를 한 번에 선택합니다.
                    </div>

                    <div className="rounded-[14px] bg-white/70 p-3">
                      <div className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-blue-400">
                        STEP 2
                      </div>
                      선택된 치아를 한 번 더 클릭하면 없는 치아 / 발치 치아로 표시됩니다.
                    </div>

                    <div className="rounded-[14px] bg-white/70 p-3">
                      <div className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-blue-400">
                        STEP 3
                      </div>
                      빨간 치아를 다시 클릭하면 선택이 해제됩니다.
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3 text-[12px] font-black">
                    <span className="inline-flex items-center gap-1.5 text-[#2563eb]">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
                      파란색: 제작 범위
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-red-500">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      빨간색: 없는 치아 / 발치 치아
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[#94a3b8]">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#cbd5e1]" />
                      회색: 선택 안 됨
                    </span>
                  </div>
                </div>
              </div>

              <PermanentChart
                topNumbers={PERMANENT_TOP}
                bottomNumbers={PERMANENT_BOTTOM}
                selectedTeeth={selectedTeeth}
                missingTeeth={missingTeeth}
                previewTeeth={previewTeeth}
                onToggle={toggleTooth}
                onPointerDownTooth={handleToothPointerDown}
                onPointerMoveTooth={handleToothPointerMove}
                onPointerUpTooth={handleToothPointerUp}
              />

              <div className="border-y border-[#e9edf4] bg-[#f7f9fc] px-4 py-4 sm:px-6">
                <div className="text-[16px] font-extrabold text-[#263142] sm:text-[17px]">치아 번호 (유치) *</div>
                <div className="mt-1 text-[12px] font-semibold text-[#98a2b3]">
                  드래그로 제작 범위를 선택하고, 선택된 치아를 클릭하면 없는 치아로 표시되어 금액에서 제외됩니다.
                </div>
              </div>

              <PrimaryChart
                topNumbers={PRIMARY_TOP}
                bottomNumbers={PRIMARY_BOTTOM}
                selectedTeeth={selectedTeeth}
                missingTeeth={missingTeeth}
                previewTeeth={previewTeeth}
                onToggle={toggleTooth}
                onPointerDownTooth={handleToothPointerDown}
                onPointerMoveTooth={handleToothPointerMove}
                onPointerUpTooth={handleToothPointerUp}
              />

              <div className="border-t border-[#e9edf4] px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-3 rounded-[18px] bg-[#f8fafc] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[13px] font-bold text-[#667085]">제작 범위</div>
                    <div className="mt-1 text-[18px] font-black text-[#1f2937]">
                      {priceInfo.selectedToothCount}개
                    </div>
                    <div className="mt-1 text-[12px] font-bold text-red-500">
                      없는 치아 {priceInfo.missingToothCount}개
                    </div>
                    <div className="mt-1 text-[12px] font-bold text-[#2563eb]">
                      실제 청구 {priceInfo.toothCount}개
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearAllTeeth}
                    className="rounded-[12px] border border-[#d6dde8] bg-white px-4 py-2 text-[13px] font-bold text-[#64748b]"
                  >
                    전체 선택 해제
                  </button>
                </div>
              </div>

              <div className="border-y border-[#e9edf4] bg-[#f7f9fc] px-4 py-4 text-[16px] font-extrabold text-[#263142] sm:px-6 sm:text-[17px]">
                유형 *
              </div>

              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
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

              <div className="border-y border-[#e9edf4] bg-[#f7f9fc] px-4 py-4 text-[16px] font-extrabold text-[#263142] sm:px-6 sm:text-[17px]">
                두께 선택 *
              </div>

              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
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

              <div className="border-y border-[#e9edf4] bg-[#f7f9fc] px-4 py-4 sm:px-6">
                <div className="text-[16px] font-extrabold text-[#263142] sm:text-[17px]">
                  지그 제작 여부 *
                </div>
                <div className="mt-2 text-[13px] font-bold text-red-500">
                  상악 또는 하악 1악당 {formatMoney(JIG_PRICE)} 추가 비용 발생
                </div>
              </div>

              <div className="p-4 sm:p-6">
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

              <div className="border-y border-[#e9edf4] bg-[#f7f9fc] px-4 py-4 text-[16px] font-extrabold text-[#263142] sm:px-6 sm:text-[17px]">
                파일 업로드
              </div>

              <div className="p-4 sm:p-6">
                <label
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={classNames(
                    'flex min-h-[150px] cursor-pointer items-center justify-center rounded-[18px] border border-dashed text-center transition sm:min-h-[164px]',
                    dragActive
                      ? 'border-[#2563eb] bg-[#eaf2ff] text-[#1d4ed8]'
                      : 'border-[#d5dde8] bg-[#fbfcfe] text-[#8b95a5]'
                  )}
                >
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

                  <div className="w-full px-4 py-6 sm:px-6 sm:py-8">
                    <div className="mb-2 text-[15px] font-semibold text-[#667085] sm:text-[16px]">
                      업로드할 파일을 선택해주세요.
                    </div>
                    <div className="text-[12px] text-[#98a2b3]">
                      파일당 최대 500MB / 최대 {MAX_FILE_COUNT}개
                    </div>

                    {files.length > 0 && (
                      <div className="mt-5 space-y-2 text-left">
                        {files.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-[12px] border border-[#e4e8ef] bg-white px-4 py-3"
                          >
                            <div className="min-w-0 truncate text-[13px] font-semibold text-[#475467]">
                              {file.name}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleRemoveFile(index)
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

              <div className="border-t border-[#e9edf4] bg-[#f7f9fc] px-4 py-4 text-[16px] font-extrabold text-[#263142] sm:px-6 sm:text-[17px]">
                환자 고지 및 개인정보 처리 위탁 확인 <span className="text-red-500">*</span>
              </div>

              <div className="p-4 sm:p-6">
                <div className="mb-4 h-[170px] overflow-y-auto rounded-[12px] border border-[#d6dde8] bg-[#fbfcfe] p-4 text-[13px] leading-relaxed text-[#4b5565]">
                  <strong>1. 처리 목적</strong>
                  <br />
                  본 주문은 치과용 맞춤형 장치 제작을 위한 것으로, 주문 처리, 제작, 납품, 품질관리 및 고객 응대 범위에서만
                  환자 정보와 구강 스캔 파일을 처리합니다.
                  <br />
                  <br />

                  <strong>2. 처리 정보</strong>
                  <br />
                  환자명, 생년월일, 성별, 치아 정보, 요청사항, 구강 스캔 파일 등은 개인을 식별하거나 건강 관련 정보를 포함할
                  수 있어 관련 법령상 보호가 필요한 정보에 해당할 수 있습니다.
                  <br />
                  <br />

                  <strong>3. 환자 고지 및 동의 확인</strong>
                  <br />
                  주문을 등록하는 치과는 환자에게 맞춤형 장치 제작을 위해 스마일캐드가 관련 정보를 처리한다는 사실을
                  사전에 고지하고, 필요한 동의 또는 내부 절차를 적법하게 완료한 후 주문해야 합니다.
                  <br />
                  <br />

                  <strong>4. 처리 위탁 및 보관</strong>
                  <br />
                  스마일캐드는 주문 처리와 제작 수행을 위해 필요한 범위에서만 정보를 처리하며, 서비스 운영 과정에서
                  네이버클라우드플랫폼(NCP) 국내 인프라를 사용할 수 있습니다. 스마일캐드는 목적 외 이용을 금지하고
                  접근통제, 전송보호, 보관관리 등 안전조치를 적용합니다.
                  <br />
                  <br />

                  <strong>5. 보존 및 삭제</strong>
                  <br />
                  관련 정보는 계약 이행, 품질관리, 분쟁 대응 및 관계 법령상 보관 필요 범위 내에서만 보관하며,
                  보관 필요성이 종료되면 지체 없이 삭제 또는 파기합니다.
                  <br />
                  <br />

                  <strong>6. 책임</strong>
                  <br />
                  치과가 환자에 대한 고지·동의 또는 내부 승인 절차를 완료하지 않은 상태에서 주문을 등록한 경우,
                  그에 따른 책임은 주문을 등록한 치과에 있습니다. 스마일캐드는 수탁 범위 내에서만 정보를 처리합니다.
                </div>

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isAgreed}
                    onChange={(e) => setIsAgreed(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-[#d6dde8] text-[#3b82f6]"
                  />
                  <span className="text-[13px] font-bold leading-6 text-[#344054] sm:text-[14px]">
                    본인은 환자에 대한 사전 고지 및 필요한 동의·내부 절차를 완료한 후 주문을 등록하며,
                    스마일캐드의 개인정보 처리 위탁 및 국내 클라우드 인프라 이용 내용을 확인하였습니다.
                  </span>
                </label>
              </div>

              {error && <div className="px-4 pb-6 text-sm font-semibold text-red-600 sm:px-6">{error}</div>}
            </div>

            <div className="min-w-0 overflow-hidden rounded-[22px] border border-[#e1e7ef] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <SectionTitle title="요약 / 예상 금액" />

              <div className="p-4 sm:p-5">
                <div className="grid gap-3 rounded-[18px] border border-dashed border-[#d8dfe8] bg-[#fbfcfe] p-4 sm:p-5">
                  <div className="rounded-[14px] bg-white p-4 text-center shadow-sm">
                    <div className="mb-2 text-[13px] font-bold text-[#97a0ae]">총 예상 금액</div>
                    <div className="text-[26px] font-black text-[#2563eb]">{formatMoney(priceInfo.totalPrice)}</div>
                  </div>

                  <div className="rounded-[14px] bg-[#f5f7fb] p-4">
                    <div className="mb-3 text-[13px] font-black text-[#475467]">금액 상세</div>

                    <div className="space-y-2 text-[13px] font-bold text-[#667085]">
                      <div className="flex items-center justify-between gap-3">
                        <span>제품 기본 금액</span>
                        <span className="text-[#1f2937]">{formatMoney(priceInfo.productBasePrice)}</span>
                      </div>

                      {productType === 'NT-tainer' && (
                        <div className="flex items-center justify-between gap-3">
                          <span>청구 치아 수 조정</span>
                          <span
                            className={classNames(
                              priceInfo.toothAdjustmentPrice > 0 && 'text-red-500',
                              priceInfo.toothAdjustmentPrice < 0 && 'text-blue-500',
                              priceInfo.toothAdjustmentPrice === 0 && 'text-[#1f2937]'
                            )}
                          >
                            {priceInfo.toothAdjustmentPrice >= 0 ? '+' : '-'}
                            {formatMoney(Math.abs(priceInfo.toothAdjustmentPrice))}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3">
                        <span>
                          지그 제작
                          {jigRequired === 'Yes' && priceInfo.jigPrice > 0
                            ? ` (${getJigUnitCount(getBillableTeeth(selectedTeeth, missingTeeth))}악)`
                            : ''}
                        </span>
                        <span className="text-[#1f2937]">+{formatMoney(priceInfo.jigPrice)}</span>
                      </div>

                      <div className="border-t border-[#e5e9f0] pt-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[#1f2937]">합계</span>
                          <span className="text-[18px] font-black text-[#2563eb]">
                            {formatMoney(priceInfo.totalPrice)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-[12px] bg-white p-3 text-[12px] font-semibold leading-5 text-[#98a2b3]">
                      {priceInfo.priceDescription}
                    </div>
                  </div>

                  <div className="rounded-[14px] bg-[#f5f7fb] p-4 text-center">
                    <div className="mb-2 text-[13px] font-bold text-[#97a0ae]">유형</div>
                    <div className="text-[15px] font-bold text-[#475467]">{productType || '선택 전'}</div>
                  </div>

                  <div className="rounded-[14px] bg-[#f5f7fb] p-4 text-center">
                    <div className="mb-2 text-[13px] font-bold text-[#97a0ae]">제작 범위 치아</div>
                    <div className="break-words text-[15px] font-bold text-[#475467]">{selectedTeethSummary}</div>
                    <div className="mt-2 text-[13px] font-black text-[#475467]">
                      범위 총 {priceInfo.selectedToothCount}개
                    </div>
                  </div>

                  <div className="rounded-[14px] bg-[#fff1f2] p-4 text-center">
                    <div className="mb-2 text-[13px] font-bold text-red-400">없는 치아 / 발치 치아</div>
                    <div className="break-words text-[15px] font-bold text-red-500">{missingTeethSummary}</div>
                    <div className="mt-2 text-[13px] font-black text-red-500">
                      제외 {priceInfo.missingToothCount}개
                    </div>
                  </div>

                  <div className="rounded-[14px] bg-[#eaf2ff] p-4 text-center">
                    <div className="mb-2 text-[13px] font-bold text-[#2563eb]">실제 청구 치아</div>
                    <div className="break-words text-[15px] font-bold text-[#1d4ed8]">{billableTeethSummary}</div>
                    <div className="mt-2 text-[13px] font-black text-[#2563eb]">
                      총 {priceInfo.toothCount}개
                    </div>
                  </div>

                  <div className="rounded-[14px] bg-[#f5f7fb] p-4 text-center">
                    <div className="mb-2 text-[13px] font-bold text-[#97a0ae]">두께</div>
                    <div className="text-[15px] font-bold text-[#475467]">{thickness || '선택 전'}</div>
                  </div>

                  <div className="rounded-[14px] bg-[#f5f7fb] p-4 text-center">
                    <div className="mb-2 text-[13px] font-bold text-[#97a0ae]">지그 제작 여부</div>
                    <div className="text-[15px] font-bold text-[#475467]">{jigRequired || '선택 전'}</div>
                  </div>

                  <div className="rounded-[14px] bg-[#f5f7fb] p-4 text-center">
                    <div className="mb-2 text-[13px] font-bold text-[#97a0ae]">remake 여부</div>
                    <div className="text-[15px] font-bold text-[#475467]">{isRemake ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
            <div className="max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-[26px] border border-[#d9e0ea] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
              <div className="border-b border-[#e9edf4] bg-[#fbfcfe] px-5 py-5 sm:px-7">
                <div className="text-[22px] font-black tracking-tight text-[#111827]">
                  주문 내용을 최종 확인해주세요
                </div>
                <div className="mt-2 text-[13px] font-semibold leading-5 text-[#667085]">
                  아래 내용이 맞는지 확인한 뒤 주문을 접수해주세요. 취소를 누르면 다시 수정할 수 있습니다.
                </div>
              </div>

              <div className="space-y-4 p-5 sm:p-7">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] bg-[#f8fafc] p-4">
                    <div className="text-[12px] font-bold text-[#98a2b3]">환자명</div>
                    <div className="mt-1 text-[16px] font-black text-[#111827]">
                      {patientName.trim() || '-'}
                    </div>
                  </div>

                  <div className="rounded-[18px] bg-[#f8fafc] p-4">
                    <div className="text-[12px] font-bold text-[#98a2b3]">제품 유형</div>
                    <div className="mt-1 text-[16px] font-black text-[#111827]">
                      {productType || '-'}
                    </div>
                  </div>

                  <div className="rounded-[18px] bg-[#f8fafc] p-4">
                    <div className="text-[12px] font-bold text-[#98a2b3]">두께</div>
                    <div className="mt-1 text-[15px] font-black text-[#111827]">
                      {thickness || '-'}
                    </div>
                  </div>

                  <div className="rounded-[18px] bg-[#f8fafc] p-4">
                    <div className="text-[12px] font-bold text-[#98a2b3]">희망 완료일</div>
                    <div className="mt-1 text-[15px] font-black text-[#111827]">
                      {deliveryDate || '-'}
                    </div>
                  </div>
                </div>

                <div className="rounded-[18px] border border-[#dbeafe] bg-[#eff6ff] p-4">
                  <div className="text-[13px] font-black text-[#2563eb]">제작 범위 치아</div>
                  <div className="mt-2 break-words text-[15px] font-bold leading-6 text-[#1e3a8a]">
                    {selectedTeethSummary}
                  </div>
                  <div className="mt-2 text-[13px] font-black text-[#2563eb]">
                    총 {priceInfo.selectedToothCount}개
                  </div>
                </div>

                <div className="rounded-[18px] border border-red-100 bg-[#fff1f2] p-4">
                  <div className="text-[13px] font-black text-red-500">없는 치아 / 발치 치아</div>
                  <div className="mt-2 break-words text-[15px] font-bold leading-6 text-red-500">
                    {missingTeethSummary}
                  </div>
                  <div className="mt-2 text-[13px] font-black text-red-500">
                    제외 {priceInfo.missingToothCount}개
                  </div>
                </div>

                <div className="rounded-[18px] border border-emerald-100 bg-[#ecfdf5] p-4">
                  <div className="text-[13px] font-black text-emerald-600">실제 청구 치아</div>
                  <div className="mt-2 break-words text-[15px] font-bold leading-6 text-emerald-700">
                    {billableTeethSummary}
                  </div>
                  <div className="mt-2 text-[13px] font-black text-emerald-600">
                    총 {priceInfo.toothCount}개
                  </div>
                </div>

                <div className="rounded-[18px] border border-[#e5e7eb] bg-white p-4">
                  <div className="mb-3 text-[14px] font-black text-[#111827]">금액 확인</div>

                  <div className="space-y-2 text-[13px] font-bold text-[#667085]">
                    <div className="flex items-center justify-between gap-3">
                      <span>제품 기본 금액</span>
                      <span className="text-[#111827]">{formatMoney(priceInfo.productBasePrice)}</span>
                    </div>

                    {productType === 'NT-tainer' && (
                      <div className="flex items-center justify-between gap-3">
                        <span>청구 치아 수 조정</span>
                        <span
                          className={classNames(
                            priceInfo.toothAdjustmentPrice > 0 && 'text-red-500',
                            priceInfo.toothAdjustmentPrice < 0 && 'text-blue-500',
                            priceInfo.toothAdjustmentPrice === 0 && 'text-[#111827]'
                          )}
                        >
                          {priceInfo.toothAdjustmentPrice >= 0 ? '+' : '-'}
                          {formatMoney(Math.abs(priceInfo.toothAdjustmentPrice))}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <span>
                        지그 제작 {jigRequired === 'Yes' ? `(${getJigUnitCount(getBillableTeeth(selectedTeeth, missingTeeth))}악)` : ''}
                      </span>
                      <span className="text-[#111827]">+{formatMoney(priceInfo.jigPrice)}</span>
                    </div>

                    <div className="border-t border-[#e5e7eb] pt-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[15px] font-black text-[#111827]">총 예상 금액</span>
                        <span className="text-[24px] font-black text-[#2563eb]">
                          {formatMoney(priceInfo.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-[12px] bg-[#f8fafc] p-3 text-[12px] font-semibold leading-5 text-[#667085]">
                    {priceInfo.priceDescription}
                    {jigRequired === 'Yes' && priceInfo.jigPrice > 0
                      ? `, 지그 제작 ${getJigUnitCount(getBillableTeeth(selectedTeeth, missingTeeth))}악 ${formatMoney(priceInfo.jigPrice)} 추가`
                      : ', 지그 제작 없음'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-[#e9edf4] bg-[#fbfcfe] px-5 py-5 sm:px-7">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={submitting}
                  className="rounded-[14px] border border-[#cfd7e3] bg-white px-4 py-3 text-[14px] font-black text-[#475467] transition hover:bg-[#f8fafc] disabled:opacity-60"
                >
                  다시 수정하기
                </button>

                <button
                  type="button"
                  onClick={submitConfirmedOrder}
                  disabled={submitting}
                  className="rounded-[14px] bg-[#2563eb] px-4 py-3 text-[14px] font-black text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)] transition hover:bg-[#1d4ed8] disabled:opacity-60"
                >
                  {submitting ? '접수 중...' : '확인 후 주문 접수'}
                </button>
              </div>
            </div>
          </div>
        )}

    </main>
  )
}