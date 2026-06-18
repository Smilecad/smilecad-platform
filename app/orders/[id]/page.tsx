// app/orders/[id]/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppTopNav from '@/app/components/AppTopNav'

const PERMANENT_TOP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const PERMANENT_BOTTOM = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

const PRIMARY_TOP = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65]
const PRIMARY_BOTTOM = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]

const PERMANENT_SET = new Set([...PERMANENT_TOP, ...PERMANENT_BOTTOM].map(String))
const PRIMARY_SET = new Set([...PRIMARY_TOP, ...PRIMARY_BOTTOM].map(String))

const GET_ORDER_DETAIL_API_URL =
  process.env.NEXT_PUBLIC_NCP_GET_ORDER_DETAIL_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/get-order-detail'

const UPDATE_ORDER_STATUS_API_URL =
  process.env.NEXT_PUBLIC_NCP_UPDATE_ORDER_STATUS_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/update-order-status'

const GET_DOWNLOAD_URL_API_URL =
  process.env.NEXT_PUBLIC_NCP_GET_DOWNLOAD_URL_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/get-download-url'

const LIST_CONFIRMATIONS_API_URL =
  process.env.NEXT_PUBLIC_NCP_LIST_CONFIRMATIONS_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/list-confirmations'

const GET_DESIGN_CARD_UPLOAD_URL_API_URL =
  process.env.NEXT_PUBLIC_NCP_GET_DESIGN_CARD_UPLOAD_URL_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/get-design-card-upload-url'

const CREATE_CONFIRMATION_API_URL =
  process.env.NEXT_PUBLIC_NCP_CREATE_CONFIRMATION_API_URL ||
  'https://e2s4lswlw8.apigw.ntruss.com/smilecad-main-api/v1/create-confirmation'

const DESIGN_CARD_INTERNAL_API_KEY =
  process.env.NEXT_PUBLIC_DESIGN_CARD_INTERNAL_API_KEY || ''

const DEFAULT_DETAIL_ERROR =
  '주문 상세 정보를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요. 문제가 반복되면 스마일캐드에 문의해주세요.'

const DEFAULT_STATUS_ERROR =
  '주문 상태 변경 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요. 문제가 반복되면 스마일캐드에 문의해주세요.'

const DEFAULT_DOWNLOAD_ERROR =
  '파일 다운로드 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요. 문제가 반복되면 스마일캐드에 문의해주세요.'

const DEFAULT_CONFIRMATION_SEND_ERROR =
  '디자인 확인서 등록/발송 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요. 문제가 반복되면 스마일캐드에 문의해주세요.'

type DesignConfirmation = {
  confirmation_id?: number
  confirmationId?: number
  order_id?: number
  orderId?: number
  image_object_key?: string | null
  imageObjectKey?: string | null
  image_bucket?: string | null
  imageBucket?: string | null
  clinic_name?: string | null
  clinicName?: string | null
  patient_name?: string | null
  patientName?: string | null
  status?: string | null
  status_label?: string | null
  statusLabel?: string | null
  revision_note?: string | null
  revisionNote?: string | null
  created_at?: string | null
  createdAt?: string | null
  responded_at?: string | null
  respondedAt?: string | null
  expires_at?: string | null
  expiresAt?: string | null
  confirm_url?: string | null
  confirmUrl?: string | null
  is_expired?: boolean
  isExpired?: boolean
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
    '토큰 서명',
  ]

  return technicalKeywords.some((keyword) => value.includes(keyword))
}

function toSafeUserMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error || '')

  if (!message) return fallback

  const safeMessages = [
    '다운로드할 파일 경로가 없습니다.',
    '주문을 찾을 수 없습니다.',
    '주문을 찾을 수 없거나 접근 권한이 없습니다.',
    '해당 파일에 접근할 권한이 없습니다.',
    '관리자만 주문 상태를 변경할 수 있습니다.',
    '로그인 정보가 없습니다. 다시 로그인해주세요.',
    '인증 토큰이 필요합니다.',
    '토큰이 만료되었습니다.',
  ]

  if (safeMessages.some((safeMessage) => message.includes(safeMessage))) {
    return message
  }

  if (isTechnicalErrorMessage(message)) {
    return fallback
  }

  return fallback
}

function IconUser() {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none">
      <circle cx="24" cy="17" r="8" stroke="currentColor" strokeWidth="3" />
      <path
        d="M10 40C12.8 31.5 18 28 24 28C30 28 35.2 31.5 38 40"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7V12L15.5 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconDocument() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <path
        d="M7 3H14L19 8V21H7V3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 3V8H19" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 13H16M10 17H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconTooth() {
  return (
    <svg viewBox="0 0 36 48" className="h-7 w-7" fill="none">
      <path
        d="M9 5C6 10 6 17 8 23C9 27 9 33 9 39C9 44 12 45 14 40L16.5 29C17 26.5 19 26.5 19.5 29L22 40C24 45 27 44 27 39C27 33 27 27 28 23C30 17 30 10 27 5C24 1 12 1 9 5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path
        d="M12 4V14M12 14L8 10M12 14L16 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 19H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ToothIcon({
  selected,
  missing = false,
  flipped = false,
}: {
  selected: boolean
  missing?: boolean
  flipped?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex h-[48px] w-[34px] items-center justify-center rounded-[13px] transition-all duration-300 ${
          missing
            ? 'bg-red-500 shadow-lg shadow-red-100'
            : selected
              ? 'bg-blue-500 shadow-lg shadow-blue-100'
              : 'bg-white'
        }`}
      >
        <svg
          viewBox="0 0 36 58"
          className={`h-[42px] w-[27px] ${flipped ? 'rotate-180' : ''}`}
          fill={missing ? '#ef4444' : selected ? '#2563eb' : 'none'}
          stroke={missing || selected ? '#ffffff' : '#b6c2d2'}
          strokeWidth="1.8"
        >
          <path
            d="M9 6 C7 12, 7 19, 9 26 C10 31, 10 37, 10 45 C10 50, 12 51, 14 46 L16.5 34 C17 31, 19 31, 19.5 34 L22 46 C24 51, 26 50, 26 45 C26 37, 26 31, 27 26 C29 19, 29 12, 27 6 M9 6 C12 2, 24 2, 27 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {missing && (
            <>
              <path d="M11 18 L25 40" stroke="white" strokeWidth="3" strokeLinecap="round" />
              <path d="M25 18 L11 40" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </>
          )}
        </svg>
      </div>
    </div>
  )
}

function sanitizeDownloadFileName(fileName?: string | null) {
  const raw = String(fileName || '').trim()

  if (!raw) return 'scan-file.stl'

  return raw
    .replace(/[\r\n]/g, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim() || 'scan-file.stl'
}

function normalizeGender(value?: string | null) {
  const raw = String(value || '').trim().toLowerCase()

  if (!raw) return ''
  if (raw === 'male' || raw === 'm' || raw === '남') return '남'
  if (raw === 'female' || raw === 'f' || raw === '여') return '여'

  return String(value)
}

function extractDateKey(value?: string | null) {
  if (!value) return ''

  const text = String(value).trim()

  const directMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (directMatch) {
    return `${directMatch[1]}-${directMatch[2]}-${directMatch[3]}`
  }

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

function extractTimeKey(value?: string | null) {
  if (!value) return ''

  const text = String(value).trim()

  const directMatch = text.match(/^\d{4}-\d{2}-\d{2}[ T](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (directMatch) {
    return `${directMatch[1]}:${directMatch[2]}:${directMatch[3] || '00'}`
  }

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return ''

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return formatter.format(date)
}

function formatDate(value?: string | null) {
  const dateKey = extractDateKey(value)

  if (!dateKey) return '-'

  const [year, month, day] = dateKey.split('-')

  return `${Number(year)}. ${Number(month)}. ${Number(day)}.`
}

function formatDateTime(value?: string | null) {
  const dateKey = extractDateKey(value)
  const timeKey = extractTimeKey(value)

  if (!dateKey) return '-'

  const [year, month, day] = dateKey.split('-')

  if (!timeKey) {
    return `${Number(year)}. ${Number(month)}. ${Number(day)}.`
  }

  return `${Number(year)}. ${Number(month)}. ${Number(day)}. ${timeKey}`
}

function getOrderCreatedDateTime(order: any) {
  return formatDateTime(
    order?.created_at_kst ||
      order?.created_at
  )
}

function getOrderUpdatedDateTime(order: any) {
  return formatDateTime(
    order?.updated_at_kst ||
      order?.updated_at
  )
}

function getHistoryChangedDateTime(item: any) {
  return formatDateTime(
    item?.changed_at_kst ||
      item?.created_at_kst ||
      item?.changed_at ||
      item?.created_at ||
      item?.updated_at
  )
}

function getAgeFromBirth(value?: string | null) {
  const dateKey = extractDateKey(value)
  if (!dateKey) return ''

  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return ''

  const today = new Date()
  let age = today.getFullYear() - year
  const monthDiff = today.getMonth() + 1 - month

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age -= 1
  }

  return age > 0 ? `${age}세` : ''
}

function statusStyle(status?: string | null) {
  const value = status || '접수 대기'

  if (value.includes('완료')) {
    return 'border-emerald-100 bg-emerald-50 text-emerald-700'
  }

  if (value.includes('작업') || value.includes('제작') || value.includes('디자인')) {
    return 'border-amber-100 bg-amber-50 text-amber-700'
  }

  if (value.includes('수정') || value.includes('재접수')) {
    return 'border-orange-100 bg-orange-50 text-orange-700'
  }

  return 'border-blue-100 bg-blue-50 text-blue-700'
}

function confirmationStatusStyle(status?: string | null) {
  const value = String(status || '').trim()

  if (value === 'confirmed') {
    return 'border-emerald-100 bg-emerald-50 text-emerald-700'
  }

  if (value === 'revision_requested') {
    return 'border-orange-100 bg-orange-50 text-orange-700'
  }

  if (value === 'pending') {
    return 'border-blue-100 bg-blue-50 text-blue-700'
  }

  return 'border-slate-100 bg-slate-50 text-slate-600'
}

function getConfirmationStatusLabel(item: DesignConfirmation) {
  return item.status_label || item.statusLabel || item.status || '-'
}

function getConfirmationId(item: DesignConfirmation) {
  return item.confirmation_id || item.confirmationId || 0
}

function getConfirmationCreatedAt(item: DesignConfirmation) {
  return item.created_at || item.createdAt || null
}

function getConfirmationRespondedAt(item: DesignConfirmation) {
  return item.responded_at || item.respondedAt || null
}

function getConfirmationExpiresAt(item: DesignConfirmation) {
  return item.expires_at || item.expiresAt || null
}

function getConfirmationRevisionNote(item: DesignConfirmation) {
  return item.revision_note || item.revisionNote || ''
}

function getConfirmationUrl(item: DesignConfirmation) {
  return item.confirm_url || item.confirmUrl || ''
}

function isConfirmationExpired(item: DesignConfirmation) {
  return Boolean(item.is_expired ?? item.isExpired)
}

function formatMoney(value?: number | string | null) {
  const numeric = Number(value || 0)

  if (!Number.isFinite(numeric)) return '0원'

  return `${numeric.toLocaleString('ko-KR')}원`
}

function parseTextArray(value: any): string[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean)
  }

  return String(value)
    .replace(/[{}"]/g, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function numberOrZero(value: any) {
  const numeric = Number(value || 0)
  return Number.isFinite(numeric) ? numeric : 0
}


function normalizePhoneNumber(value?: string | null) {
  const raw = String(value || '').trim()

  if (!raw) return ''

  let digits = raw.replace(/[^0-9]/g, '')

  if (digits.startsWith('8210')) {
    digits = `0${digits.slice(2)}`
  }

  return digits
}

function getDefaultDesignCardPhone(order: any) {
  const candidates = [
    order?.clinic_phone,
    order?.clinicPhone,
    order?.clinic_mobile,
    order?.clinicMobile,
    order?.phone_number,
    order?.phoneNumber,
    order?.mobile_phone,
    order?.mobilePhone,
    order?.user_phone,
    order?.userPhone,
    order?.user_mobile,
    order?.userMobile,
    order?.contact_phone,
    order?.contactPhone,
    order?.manager_phone,
    order?.managerPhone,
    order?.representative_phone,
    order?.representativePhone,
  ]

  for (const candidate of candidates) {
    const phone = normalizePhoneNumber(candidate)

    if (phone) return phone
  }

  return ''
}

function isRemakeOrder(order: any) {
  const value =
    order?.is_remake ??
    order?.isRemake ??
    order?.remake ??
    order?.is_remake_order ??
    order?.isRemakeOrder

  if (value === true) return true

  const text = String(value || '').trim().toLowerCase()

  return text === 'true' || text === 'yes' || text === 'y' || text === '1'
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [confirmations, setConfirmations] = useState<DesignConfirmation[]>([])
  const [confirmationLoading, setConfirmationLoading] = useState(false)
  const [confirmationError, setConfirmationError] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [designCardFile, setDesignCardFile] = useState<File | null>(null)
  const [designCardPhone, setDesignCardPhone] = useState('')
  const [sendingConfirmation, setSendingConfirmation] = useState(false)
  const [sendConfirmationMessage, setSendConfirmationMessage] = useState('')
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState('clinic')

  const getTokenOrRedirect = useCallback(() => {
    const token = window.localStorage.getItem('smilecad_token')

    if (!token) {
      router.replace('/login')
      return null
    }

    return token
  }, [router])

  const parseJsonResponse = async (res: Response) => {
    const text = await res.text()

    try {
      return text ? JSON.parse(text) : null
    } catch {
      throw new Error('API 응답을 처리할 수 없습니다.')
    }
  }

  const handleAuthError = useCallback(
    (status: number) => {
      if (status === 401 || status === 403) {
        window.localStorage.removeItem('smilecad_token')
        window.localStorage.removeItem('smilecad_user')
        router.replace('/login')
        return true
      }

      return false
    },
    [router]
  )

  const fetchConfirmations = useCallback(
    async (token: string) => {
      if (!id || !LIST_CONFIRMATIONS_API_URL) return

      try {
        setConfirmationLoading(true)
        setConfirmationError('')

        const res = await fetch(LIST_CONFIRMATIONS_API_URL, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            order_id: Number(id),
          }),
        })

        if (handleAuthError(res.status)) return

        const data = await parseJsonResponse(res)

        if (!res.ok || !data?.success) {
          console.error('list-confirmations 응답 오류:', data)
          throw new Error(data?.error || '디자인 확인서 목록을 불러오지 못했습니다.')
        }

        setConfirmations(Array.isArray(data.confirmations) ? data.confirmations : [])
      } catch (err) {
        console.error('디자인 확인서 목록 조회 실패:', err)
        setConfirmationError(
          toSafeUserMessage(err, '디자인 확인서 목록을 불러오지 못했습니다.')
        )
      } finally {
        setConfirmationLoading(false)
      }
    },
    [id, handleAuthError]
  )

  const fetchOrderDetail = useCallback(async () => {
    if (!id) return

    const token = getTokenOrRedirect()
    if (!token) return

    try {
      setLoading(true)
      setError('')

      const res = await fetch(`${GET_ORDER_DETAIL_API_URL}?id=${encodeURIComponent(id)}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (handleAuthError(res.status)) return

      const data = await parseJsonResponse(res)

      if (!res.ok || !data?.success) {
        console.error('get-order-detail 응답 오류:', data)
        throw new Error(data?.error || DEFAULT_DETAIL_ERROR)
      }

      setOrder(data.order || null)
      setUserRole(data.role || 'clinic')
      await fetchConfirmations(token)
    } catch (err) {
      console.error('주문 상세 조회 실패:', err)
      setError(toSafeUserMessage(err, DEFAULT_DETAIL_ERROR))
    } finally {
      setLoading(false)
    }
  }, [id, getTokenOrRedirect, handleAuthError, fetchConfirmations])

  useEffect(() => {
    fetchOrderDetail()
  }, [fetchOrderDetail])

  useEffect(() => {
    if (!order) return
    if (designCardPhone.trim()) return

    const defaultPhone = getDefaultDesignCardPhone(order)

    if (defaultPhone) {
      setDesignCardPhone(defaultPhone)
    }
  }, [order, designCardPhone])

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return
    if (!confirm(`주문 상태를 '${newStatus}'(으)로 변경하시겠습니까?`)) return

    const token = getTokenOrRedirect()
    if (!token) return

    try {
      setUpdating(true)
      setError('')

      const res = await fetch(UPDATE_ORDER_STATUS_API_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          status: newStatus,
        }),
      })

      if (handleAuthError(res.status)) return

      const data = await parseJsonResponse(res)

      if (!res.ok || !data?.success) {
        console.error('update-order-status 응답 오류:', data)
        throw new Error(data?.error || DEFAULT_STATUS_ERROR)
      }

      alert('상태가 변경되었습니다.')
      await fetchOrderDetail()
    } catch (err) {
      console.error('상태 변경 실패:', err)
      alert(toSafeUserMessage(err, DEFAULT_STATUS_ERROR))
    } finally {
      setUpdating(false)
    }
  }

  const handleDownload = async (path: string, fileName: string) => {
    const token = getTokenOrRedirect()
    if (!token) return

    const cleanPath = String(path || '').trim()
    const cleanFileName = sanitizeDownloadFileName(fileName)

    if (!cleanPath) {
      alert('다운로드할 파일 경로가 없습니다.')
      return
    }

    try {
      setDownloading(true)

      const res = await fetch(GET_DOWNLOAD_URL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          authToken: token,
          token,
          orderId: id,
          filePath: cleanPath,
          objectKey: cleanPath,
          key: cleanPath,
          path: cleanPath,
          fileName: cleanFileName,
          filename: cleanFileName,
          name: cleanFileName,
        }),
      })

      if (handleAuthError(res.status)) return

      const data = await parseJsonResponse(res)

      if (!res.ok || !data?.success || !data?.downloadUrl) {
        console.error('get-download-url 응답 오류:', data)
        throw new Error(data?.error || DEFAULT_DOWNLOAD_ERROR)
      }

      const fileRes = await fetch(data.downloadUrl)

      if (!fileRes.ok) {
        console.error('Object Storage 파일 다운로드 실패:', fileRes.status)
        throw new Error(DEFAULT_DOWNLOAD_ERROR)
      }

      const blob = await fileRes.blob()
      const blobUrl = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = cleanFileName || data.fileName || 'scan-file.stl'
      document.body.appendChild(link)
      link.click()
      link.remove()

      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('파일 다운로드 실패:', err)
      alert(toSafeUserMessage(err, DEFAULT_DOWNLOAD_ERROR))
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadAll = async () => {
    if (!order?.scan_file_paths) return

    const paths = parseTextArray(order.scan_file_paths)
    const names = parseTextArray(order.scan_file_names)

    for (let i = 0; i < paths.length; i += 1) {
      const originalName = names[i] || `scan-file-${i + 1}.stl`
      await handleDownload(paths[i], originalName)
      await new Promise((resolve) => setTimeout(resolve, 700))
    }
  }

  const handleDesignCardFileChange = (event: any) => {
    const file = event.target.files?.[0] || null
    setDesignCardFile(file)
    setSendConfirmationMessage('')
  }

  const handleSendDesignConfirmation = async () => {
    if (userRole !== 'admin') {
      alert('관리자만 디자인 확인서를 등록/발송할 수 있습니다.')
      return
    }

    const token = getTokenOrRedirect()
    if (!token) return

    if (!designCardFile) {
      alert('디자인 확인서 이미지 파일을 선택해주세요.')
      return
    }

    const cleanPhone = designCardPhone.replace(/[^0-9]/g, '')

    if (!cleanPhone) {
      alert('문자를 받을 휴대폰 번호를 입력해주세요.')
      return
    }

    if (!GET_DESIGN_CARD_UPLOAD_URL_API_URL || !CREATE_CONFIRMATION_API_URL) {
      alert('디자인 확인서 API 주소가 설정되지 않았습니다.')
      return
    }

    if (!confirm('선택한 디자인 확인서 이미지를 업로드하고 치과에 확인 링크를 발송하시겠습니까?')) {
      return
    }

    try {
      setSendingConfirmation(true)
      setConfirmationError('')
      setSendConfirmationMessage('')

      const uploadRes = await fetch(GET_DESIGN_CARD_UPLOAD_URL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(DESIGN_CARD_INTERNAL_API_KEY
            ? { 'x-internal-api-key': DESIGN_CARD_INTERNAL_API_KEY }
            : {}),
        },
        body: JSON.stringify({
          authToken: token,
          token,
          internal_api_key: DESIGN_CARD_INTERNAL_API_KEY || undefined,
          order_id: Number(id),
          orderId: Number(id),
          file_name: designCardFile.name,
          fileName: designCardFile.name,
          content_type: designCardFile.type || 'image/png',
          contentType: designCardFile.type || 'image/png',
        }),
      })

      if (handleAuthError(uploadRes.status)) return

      const uploadData = await parseJsonResponse(uploadRes)

      if (!uploadRes.ok || !uploadData?.success) {
        console.error('get-design-card-upload-url 응답 오류:', uploadData)
        throw new Error(uploadData?.error || DEFAULT_CONFIRMATION_SEND_ERROR)
      }

      const uploadUrl = uploadData.upload_url || uploadData.uploadUrl || uploadData.url
      const imageObjectKey =
        uploadData.image_object_key ||
        uploadData.imageObjectKey ||
        uploadData.object_key ||
        uploadData.objectKey
      const imageBucket =
        uploadData.image_bucket ||
        uploadData.imageBucket ||
        uploadData.bucket ||
        'smilecad-design-cards'

      if (!uploadUrl || !imageObjectKey) {
        throw new Error('디자인 확인서 업로드 URL 또는 파일 키를 확인할 수 없습니다.')
      }

      const requiredHeaders = uploadData.required_headers || uploadData.requiredHeaders || {}
      const putHeaders: Record<string, string> = {
        'Content-Type': designCardFile.type || 'image/png',
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      }

      Object.entries(requiredHeaders).forEach(([key, value]) => {
        if (typeof value === 'string' && value) {
          putHeaders[key] = value
        }
      })

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: putHeaders,
        body: designCardFile,
      })

      if (!putRes.ok) {
        console.error('디자인 확인서 이미지 업로드 실패:', putRes.status)
        throw new Error('디자인 확인서 이미지 업로드에 실패했습니다.')
      }

      const createRes = await fetch(CREATE_CONFIRMATION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          authToken: token,
          token,
          order_id: Number(id),
          orderId: Number(id),
          image_object_key: imageObjectKey,
          imageObjectKey,
          image_bucket: imageBucket,
          imageBucket,
          clinic_name: order?.clinic_name || '',
          clinicName: order?.clinic_name || '',
          patient_name: order?.patient_name || '',
          patientName: order?.patient_name || '',
          phone_number: cleanPhone,
          phoneNumber: cleanPhone,
        }),
      })

      if (handleAuthError(createRes.status)) return

      const createData = await parseJsonResponse(createRes)

      if (!createRes.ok || !createData?.success) {
        console.error('create-confirmation 응답 오류:', createData)
        throw new Error(createData?.error || DEFAULT_CONFIRMATION_SEND_ERROR)
      }

      setDesignCardFile(null)
      setDesignCardPhone('')
      setSendConfirmationMessage('디자인 확인서가 등록되고 확인 링크가 발송되었습니다.')

      const input = document.getElementById('design-card-file-input') as HTMLInputElement | null
      if (input) input.value = ''

      await fetchConfirmations(token)
    } catch (err) {
      console.error('디자인 확인서 등록/발송 실패:', err)
      alert(toSafeUserMessage(err, DEFAULT_CONFIRMATION_SEND_ERROR))
    } finally {
      setSendingConfirmation(false)
    }
  }

  const handleCopyConfirmationUrl = async (url: string) => {
    if (!url) return

    try {
      await navigator.clipboard?.writeText(url)
      setCopyMessage('확인 링크를 복사했습니다.')
      window.setTimeout(() => setCopyMessage(''), 1800)
    } catch (_) {
      alert('링크 복사에 실패했습니다.')
    }
  }

  const selectedTeethList = useMemo<string[]>(() => {
    return parseTextArray(order?.selected_teeth)
  }, [order])

  const missingTeethList = useMemo<string[]>(() => {
    return parseTextArray(order?.missing_teeth)
  }, [order])

  const billableTeethList = useMemo<string[]>(() => {
    const storedBillableTeeth = parseTextArray(order?.billable_teeth)

    if (storedBillableTeeth.length > 0) {
      return storedBillableTeeth
    }

    return selectedTeethList.filter((tooth) => !missingTeethList.includes(tooth))
  }, [order, selectedTeethList, missingTeethList])

  const selectedToothCount =
    numberOrZero(order?.selected_tooth_count) || selectedTeethList.length

  const missingToothCount =
    numberOrZero(order?.missing_tooth_count) || missingTeethList.length

  const billableToothCount =
    numberOrZero(order?.billable_tooth_count) ||
    numberOrZero(order?.tooth_count) ||
    billableTeethList.length

  const selectedToothType = useMemo<'permanent' | 'primary' | 'mixed'>(() => {
    const hasPrimary = selectedTeethList.some((tooth) => PRIMARY_SET.has(tooth))
    const hasPermanent = selectedTeethList.some((tooth) => PERMANENT_SET.has(tooth))

    if (hasPrimary && !hasPermanent) return 'primary'
    if (hasPermanent && !hasPrimary) return 'permanent'

    return 'mixed'
  }, [selectedTeethList])

  const toothChartRows = useMemo<
    {
      label: string
      teeth: number[]
      flipped: boolean
    }[]
  >(() => {
    if (selectedToothType === 'primary') {
      return [
        { label: '유치 상악', teeth: PRIMARY_TOP, flipped: true },
        { label: '유치 하악', teeth: PRIMARY_BOTTOM, flipped: false },
      ]
    }

    if (selectedToothType === 'permanent') {
      return [
        { label: '영구치 상악', teeth: PERMANENT_TOP, flipped: true },
        { label: '영구치 하악', teeth: PERMANENT_BOTTOM, flipped: false },
      ]
    }

    return [
      { label: '영구치 상악', teeth: PERMANENT_TOP, flipped: true },
      { label: '영구치 하악', teeth: PERMANENT_BOTTOM, flipped: false },
      { label: '유치 상악', teeth: PRIMARY_TOP, flipped: true },
      { label: '유치 하악', teeth: PRIMARY_BOTTOM, flipped: false },
    ]
  }, [selectedToothType])

  const scanFiles = useMemo<{ path: string; name: string }[]>(() => {
    const paths = parseTextArray(order?.scan_file_paths)
    const names = parseTextArray(order?.scan_file_names)

    return paths.map((path, index) => ({
      path,
      name: names[index] || `scan-file-${index + 1}.stl`,
    }))
  }, [order])

  const priceDetailItems = useMemo(() => {
    const productBasePrice = numberOrZero(order?.product_base_price || order?.base_price)
    const toothAdjustmentPrice = numberOrZero(
      order?.tooth_adjustment_price || order?.tooth_extra_price
    )
    const jigPrice = numberOrZero(order?.jig_price)
    const totalPrice = numberOrZero(order?.total_price)

    return {
      productBasePrice,
      toothAdjustmentPrice,
      jigPrice,
      totalPrice,
      hasPrice: productBasePrice > 0 || jigPrice > 0 || totalPrice > 0,
    }
  }, [order])

  const gender = normalizeGender(order?.patient_gender)
  const age = getAgeFromBirth(order?.patient_birth)
  const patientMeta = [gender, age].filter(Boolean).join(' / ')

  const historySteps = useMemo(() => {
    const rawHistory = Array.isArray(order?.history)
      ? order.history
      : Array.isArray(order?.status_history)
        ? order.status_history
        : []

    const baseStep = {
      label: '주문 접수',
      time: getOrderCreatedDateTime(order),
      active: rawHistory.length === 0,
      done: true,
      memo: '주문이 접수되었습니다.',
      changedBy: '',
    }

    const normalizedHistory = rawHistory
      .map((item: any) => {
        const status = item.new_status || item.status || item.order_status || ''
        const previousStatus = item.old_status || ''
        const changedBy = item.changed_by || ''

        return {
          label: String(status || '').trim(),
          time: getHistoryChangedDateTime(item),
          active: String(status || '').trim() === String(order?.status || '').trim(),
          done: true,
          memo: previousStatus ? `${previousStatus} → ${status}` : '',
          changedBy,
        }
      })
      .filter((item: any) => item.label)

    if (normalizedHistory.length === 0) {
      const currentStatus = order?.status || '접수 대기'

      if (currentStatus && currentStatus !== '접수 대기') {
        return [
          baseStep,
          {
            label: currentStatus,
            time: getOrderUpdatedDateTime(order) || getOrderCreatedDateTime(order),
            active: true,
            done: true,
            memo: '현재 주문 상태입니다.',
            changedBy: '',
          },
        ]
      }

      return [
        baseStep,
        {
          label: '접수 대기',
          time: '대기 중',
          active: false,
          done: false,
          memo: '',
          changedBy: '',
        },
        {
          label: '디자인 작업중',
          time: '대기 중',
          active: false,
          done: false,
          memo: '',
          changedBy: '',
        },
        {
          label: '제작 완료',
          time: '대기 중',
          active: false,
          done: false,
          memo: '',
          changedBy: '',
        },
      ]
    }

    return [baseStep, ...normalizedHistory]
  }, [order])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-5 text-[15px] font-extrabold text-slate-500 shadow-sm">
          로딩 중...
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f8fafc]">
        <AppTopNav current="orders" />
        <div className="mx-auto w-full max-w-[1480px] px-6 pb-12">
          <div className="rounded-[26px] border border-red-100 bg-red-50 p-8 text-center font-bold text-red-600">
            {error}
          </div>
        </div>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-[#f8fafc]">
        <AppTopNav current="orders" />
        <div className="mx-auto w-full max-w-[1480px] px-6 pb-12">
          <div className="rounded-[26px] border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
            주문을 찾을 수 없습니다.
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <AppTopNav current="orders" />

      <div className="mx-auto w-full max-w-[1480px] px-6 pb-12">
        <section className="mb-7 rounded-[30px] border border-slate-200 bg-white p-7 shadow-[0_14px_45px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-slate-100 text-blue-700">
                <IconUser />
              </div>

              <div>
                <p className="text-[13px] font-black text-blue-600">환자명</p>
                <div className="mt-1 flex flex-wrap items-end gap-3">
                  <h1 className="text-[36px] font-black leading-none tracking-[-0.04em] text-slate-950">
                    {order.patient_name || '-'}
                  </h1>

                  {isRemakeOrder(order) && (
                    <span className="mb-1 inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[13px] font-black tracking-[0.12em] text-red-600">
                      REMAKE
                    </span>
                  )}

                  {patientMeta && (
                    <span className="mb-1 text-[15px] font-bold text-slate-500">
                      ({patientMeta})
                    </span>
                  )}
                </div>

                <span
                  className={`mt-4 inline-flex rounded-lg border px-3 py-1 text-[13px] font-black ${statusStyle(
                    order.status
                  )}`}
                >
                  {order.status || '접수 대기'}
                </span>
              </div>
            </div>

            <div className="hidden h-24 w-px bg-slate-200 lg:block" />

            <div className="min-w-0 lg:min-w-[370px]">
              <p className="text-[13px] font-bold text-slate-500">주문번호</p>
              <div className="mt-2 flex items-center gap-3">
                <p className="truncate text-[24px] font-black tracking-[-0.02em] text-slate-950">
                  {order.order_number || `ORD-${order.id}`}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard?.writeText(order.order_number || `ORD-${order.id}`)
                  }
                  className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  title="주문번호 복사"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                    <path
                      d="M9 9H19V19H9V9Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 15H4V5H14V6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <p className="mt-5 text-[14px] font-bold text-slate-500">
                주문 생성일{' '}
                <span className="ml-2 text-slate-700">{getOrderCreatedDateTime(order)}</span>
              </p>
            </div>
          </div>
        </section>

        <section className="mb-7 grid grid-cols-1 gap-7 lg:grid-cols-[360px_1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-8 flex items-center gap-3">
              <div className="text-blue-600">
                <IconClock />
              </div>
              <h2 className="text-[22px] font-black tracking-[-0.03em] text-slate-950">
                주문 이력
              </h2>
            </div>

            <div className="relative space-y-8 pl-10 before:absolute before:left-[10px] before:top-3 before:h-[calc(100%-30px)] before:w-[2px] before:bg-slate-200">
              {historySteps.map((step) => (
                <div key={`${step.label}-${step.time}`} className="relative">
                  <div
                    className={`absolute -left-[39px] top-1 h-5 w-5 rounded-full border-[3px] ring-4 ring-white ${
                      step.active
                        ? 'border-emerald-500 bg-emerald-500 shadow-lg shadow-emerald-100'
                        : step.done
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-slate-300 bg-white'
                    }`}
                  />

                  <p
                    className={`text-[16px] font-black ${
                      step.active ? 'text-emerald-700' : 'text-slate-800'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="mt-1 text-[14px] font-semibold text-slate-500">{step.time}</p>

                  {step.memo && (
                    <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-[13px] font-semibold text-slate-500">
                      {step.memo}
                    </p>
                  )}

                  {step.changedBy && (
                    <p className="mt-2 text-[12px] font-bold text-slate-400">
                      처리자: {step.changedBy}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {userRole === 'admin' && (
              <div className="mt-9 border-t border-slate-100 pt-6">
                <h3 className="mb-4 text-[15px] font-black text-slate-800">관리자 상태 변경</h3>
                <div className="grid grid-cols-1 gap-2">
                  {['접수 대기', '디자인 작업중', '수정 요청 중', '주문 재접수'].map((s) => (
                    <button
                      key={s}
                      disabled={updating || order.status === s}
                      onClick={() => handleStatusUpdate(s)}
                      className={`rounded-2xl px-4 py-3 text-[14px] font-black transition-all ${
                        order.status === s
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-7 flex items-center gap-3">
              <div className="text-blue-600">
                <IconDocument />
              </div>
              <h2 className="text-[22px] font-black tracking-[-0.03em] text-slate-950">
                주문 상세 정보
              </h2>
            </div>

            <div className="border-t border-slate-200">
              <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-4 md:divide-x md:divide-y-0">
                {[
                  { label: '환자명', value: order.patient_name },
                  { label: '희망 완료일', value: formatDate(order.delivery_date) },
                  { label: '치과명', value: order.clinic_name },
                  { label: '주문 생성일', value: getOrderCreatedDateTime(order) },
                ].map((item) => (
                  <div key={item.label} className="px-0 py-5 md:px-7">
                    <p className="text-[13px] font-bold text-slate-500">{item.label}</p>
                    <p className="mt-3 text-[16px] font-black text-slate-950">
                      {item.value || '-'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 py-5">
                <p className="text-[13px] font-bold text-slate-500">치과 주소</p>
                <p className="mt-3 text-[16px] font-black leading-relaxed text-slate-950">
                  {order.clinic_address || '-'}
                </p>
              </div>

              <div className="grid grid-cols-1 border-t border-slate-100 md:grid-cols-3 md:divide-x md:divide-slate-100">
                <div className="px-0 py-5 md:px-7">
                  <p className="text-[13px] font-bold text-slate-500">지그 제작</p>
                  <span className="mt-3 inline-flex rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-1.5 text-[14px] font-black text-emerald-700">
                    {order.jig_required || '-'}
                  </span>
                </div>

                <div className="px-0 py-5 md:px-7">
                  <p className="text-[13px] font-bold text-slate-500">와이어 두께</p>
                  <span className="mt-3 inline-flex rounded-lg border border-blue-100 bg-blue-50 px-4 py-1.5 text-[14px] font-black text-blue-700">
                    {order.thickness || '-'}
                  </span>
                </div>

                <div className="px-0 py-5 md:px-7">
                  <p className="text-[13px] font-bold text-slate-500">요청사항</p>
                  <p className="mt-3 whitespace-pre-wrap text-[16px] font-black leading-relaxed text-slate-950">
                    {order.request_note || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-7 grid grid-cols-1 gap-7 lg:grid-cols-[1fr_420px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-7 flex items-center gap-3">
              <div className="text-blue-600">
                <IconTooth />
              </div>
              <h2 className="text-[22px] font-black tracking-[-0.03em] text-slate-950">
                치식 정보
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <div className="rounded-[22px] border border-blue-100 bg-blue-50 p-5">
                <p className="text-[13px] font-black text-blue-600">제작 범위 치아</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedTeethList.length > 0 ? (
                    selectedTeethList.map((tooth) => (
                      <span
                        key={`selected-${tooth}`}
                        className="rounded-xl bg-white px-3 py-2 text-[14px] font-black text-blue-700 shadow-sm"
                      >
                        {tooth}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-xl bg-white px-3 py-2 text-[14px] font-bold text-slate-500">
                      없음
                    </span>
                  )}
                </div>
                <p className="mt-4 text-[14px] font-black text-blue-700">
                  범위 총 {selectedToothCount}개
                </p>
              </div>

              <div className="rounded-[22px] border border-red-100 bg-red-50 p-5">
                <p className="text-[13px] font-black text-red-500">없는 치아 / 발치 치아</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {missingTeethList.length > 0 ? (
                    missingTeethList.map((tooth) => (
                      <span
                        key={`missing-${tooth}`}
                        className="rounded-xl bg-white px-3 py-2 text-[14px] font-black text-red-500 shadow-sm"
                      >
                        {tooth}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-xl bg-white px-3 py-2 text-[14px] font-bold text-slate-500">
                      없음
                    </span>
                  )}
                </div>
                <p className="mt-4 text-[14px] font-black text-red-500">
                  제외 {missingToothCount}개
                </p>
              </div>

              <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-[13px] font-black text-emerald-600">실제 청구 치아</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {billableTeethList.length > 0 ? (
                    billableTeethList.map((tooth) => (
                      <span
                        key={`billable-${tooth}`}
                        className="rounded-xl bg-white px-3 py-2 text-[14px] font-black text-emerald-700 shadow-sm"
                      >
                        {tooth}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-xl bg-white px-3 py-2 text-[14px] font-bold text-slate-500">
                      없음
                    </span>
                  )}
                </div>
                <p className="mt-4 text-[14px] font-black text-emerald-700">
                  총 {billableToothCount}개
                </p>
              </div>
            </div>

            <div className="mt-8 overflow-x-auto pb-2">
              <div className={selectedToothType === 'primary' ? 'min-w-[620px]' : 'min-w-[900px]'}>
                {toothChartRows.map((row, rowIndex) => (
                  <div key={row.label}>
                    {rowIndex > 0 && <div className="my-6 h-px w-full bg-slate-200" />}

                    <div className="grid grid-cols-[90px_1fr] items-center gap-4">
                      <p className="text-[15px] font-black text-slate-500">{row.label}</p>

                      <div className="flex items-center justify-between gap-4">
                        {row.teeth.map((n) => {
                          const tooth = String(n)
                          const selected = selectedTeethList.includes(tooth)
                          const missing = missingTeethList.includes(tooth)

                          return (
                            <div key={n} className="flex flex-col items-center gap-2">
                              <ToothIcon selected={selected} missing={missing} flipped={row.flipped} />
                              <span
                                className={`text-[13px] font-black ${
                                  missing
                                    ? 'text-red-500'
                                    : selected
                                      ? 'text-blue-700'
                                      : 'text-slate-600'
                                }`}
                              >
                                {n}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-4 rounded-[20px] bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-[13px] font-bold text-blue-700">
                <span className="h-3 w-3 rounded-full bg-blue-600" />
                제작 범위
              </div>
              <div className="flex items-center gap-2 text-[13px] font-bold text-red-500">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                없는 치아 / 발치 치아
              </div>
              <div className="flex items-center gap-2 text-[13px] font-bold text-slate-500">
                <span className="h-3 w-3 rounded-full bg-slate-300" />
                선택되지 않은 치아
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
            <h2 className="mb-6 text-[22px] font-black tracking-[-0.03em] text-slate-950">
              주문 금액
            </h2>

            <div className="rounded-[24px] bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-lg shadow-blue-100">
              <p className="text-[13px] font-black text-blue-100">총 주문 금액</p>
              <p className="mt-3 text-[34px] font-black tracking-[-0.04em]">
                {formatMoney(priceDetailItems.totalPrice)}
              </p>
            </div>

            <div className="mt-5 space-y-3 rounded-[22px] border border-slate-100 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4 text-[14px] font-black">
                <span className="text-slate-500">제품 기본 금액</span>
                <span className="text-slate-950">
                  {formatMoney(priceDetailItems.productBasePrice)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 text-[14px] font-black">
                <span className="text-slate-500">청구 치아 수 조정</span>
                <span
                  className={
                    priceDetailItems.toothAdjustmentPrice > 0
                      ? 'text-red-500'
                      : priceDetailItems.toothAdjustmentPrice < 0
                        ? 'text-blue-500'
                        : 'text-slate-950'
                  }
                >
                  {priceDetailItems.toothAdjustmentPrice >= 0 ? '+' : '-'}
                  {formatMoney(Math.abs(priceDetailItems.toothAdjustmentPrice))}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 text-[14px] font-black">
                <span className="text-slate-500">지그 제작</span>
                <span className="text-slate-950">+{formatMoney(priceDetailItems.jigPrice)}</span>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between gap-4 text-[16px] font-black">
                  <span className="text-slate-950">합계</span>
                  <span className="text-blue-700">{formatMoney(priceDetailItems.totalPrice)}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[18px] bg-slate-50 p-5">
              <p className="text-[13px] font-black text-slate-500">가격 산정 기준</p>
              <p className="mt-2 text-[13px] font-semibold leading-6 text-slate-600">
                {order.price_description || '가격 산정 정보가 없습니다.'}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-7 lg:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-black tracking-[-0.03em] text-slate-950">
                  디자인 확인서
                </h2>
                <p className="mt-2 text-[13px] font-semibold leading-5 text-slate-400">
                  치과에 발송한 디자인 확인서와 응답 상태를 확인할 수 있습니다.
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-[12px] font-black text-blue-600">
                {confirmations.length}건
              </span>
            </div>

            {userRole === 'admin' && (
              <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[15px] font-black text-slate-900">
                      디자인 확인서 등록/발송
                    </p>
                    <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-500">
                      이미지 파일을 업로드하면 치과에 확인 링크가 문자로 발송됩니다.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <label className="block">
                      <span className="mb-2 block text-[12px] font-black text-slate-500">
                        확인서 이미지
                      </span>
                      <input
                        id="design-card-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleDesignCardFileChange}
                        disabled={sendingConfirmation}
                        className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-bold text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-[13px] file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[12px] font-black text-slate-500">
                        문자 수신 휴대폰 번호
                      </span>
                      <input
                        type="tel"
                        value={designCardPhone}
                        onChange={(event) => setDesignCardPhone(event.target.value)}
                        placeholder="01012345678"
                        disabled={sendingConfirmation}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <span className="mt-2 block text-[12px] font-semibold leading-5 text-slate-400">
                        {getDefaultDesignCardPhone(order)
                          ? '치과 계정 가입 번호가 자동 입력됩니다. 필요하면 직접 수정할 수 있습니다.'
                          : '치과 계정 가입 번호가 없으면 직접 입력해 주세요.'}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={handleSendDesignConfirmation}
                      disabled={sendingConfirmation}
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-[14px] font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sendingConfirmation ? '등록/발송 중...' : '디자인 확인서 등록/발송'}
                    </button>
                  </div>

                  {designCardFile && (
                    <p className="text-[12px] font-bold text-slate-500">
                      선택 파일: {designCardFile.name}
                    </p>
                  )}

                  {sendConfirmationMessage && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-black text-emerald-700">
                      {sendConfirmationMessage}
                    </div>
                  )}
                </div>
              </div>
            )}

            {confirmationLoading ? (
              <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-6 text-center">
                <p className="text-[14px] font-bold text-slate-400">
                  디자인 확인서 목록을 불러오는 중입니다.
                </p>
              </div>
            ) : confirmationError ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-[14px] font-bold text-red-600">
                {confirmationError}
              </div>
            ) : confirmations.length > 0 ? (
              <div className="space-y-3">
                {copyMessage && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-black text-emerald-700">
                    {copyMessage}
                  </div>
                )}

                {confirmations.map((confirmation) => {
                  const confirmationId = getConfirmationId(confirmation)
                  const confirmUrl = getConfirmationUrl(confirmation)
                  const revisionNote = getConfirmationRevisionNote(confirmation)

                  return (
                    <div
                      key={confirmationId || confirmUrl}
                      className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:bg-blue-50/20"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-black ${confirmationStatusStyle(
                                confirmation.status
                              )}`}
                            >
                              {getConfirmationStatusLabel(confirmation)}
                            </span>

                            {isConfirmationExpired(confirmation) && (
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[12px] font-black text-slate-500">
                                링크 만료
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-[15px] font-black text-slate-900">
                            디자인 확인서 #{confirmationId || '-'}
                          </p>
                        </div>

                        {confirmUrl && (
                          <button
                            type="button"
                            onClick={() => handleCopyConfirmationUrl(confirmUrl)}
                            className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-black text-blue-600 transition hover:border-blue-200 hover:bg-blue-50"
                          >
                            확인 링크 복사
                          </button>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 text-[13px] font-bold md:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-slate-400">등록일</p>
                          <p className="mt-1 text-slate-700">
                            {formatDateTime(getConfirmationCreatedAt(confirmation))}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-slate-400">응답일</p>
                          <p className="mt-1 text-slate-700">
                            {formatDateTime(getConfirmationRespondedAt(confirmation))}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-slate-400">만료일</p>
                          <p className="mt-1 text-slate-700">
                            {formatDateTime(getConfirmationExpiresAt(confirmation))}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-slate-400">환자명</p>
                          <p className="mt-1 text-slate-700">
                            {confirmation.patient_name || confirmation.patientName || '-'}
                          </p>
                        </div>
                      </div>

                      {revisionNote && (
                        <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                          <p className="text-[13px] font-black text-orange-700">수정 요청 내용</p>
                          <p className="mt-2 whitespace-pre-wrap text-[14px] font-bold leading-6 text-orange-900">
                            {revisionNote}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <div>
                  <p className="text-[15px] font-black text-slate-600">
                    아직 등록된 디자인 확인서가 없습니다.
                  </p>
                  <p className="mt-2 text-[13px] font-semibold leading-5 text-slate-400">
                    디자인 확인서 발송 후 이 영역에 상태가 표시됩니다.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-[22px] font-black tracking-[-0.03em] text-slate-950">
                스캔 파일
              </h2>

              {scanFiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {downloading ? '다운로드 중...' : '전체 다운로드'}
                  <IconDownload />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {scanFiles.length > 0 ? (
                scanFiles.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-black text-slate-900">{file.name}</p>
                      <p className="mt-1 text-[12px] font-bold text-slate-400">STL Scan File</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownload(file.path, file.name)}
                      disabled={downloading}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-black text-blue-600 transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      다운로드
                      <IconDownload />
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-center text-[14px] font-bold text-slate-400">
                  파일 없음
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}