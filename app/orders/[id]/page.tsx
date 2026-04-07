'use client'

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react'
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
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) {
      return []
    }

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

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [order, setOrder] = useState<OrderItem | null>(null)

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

  const selectedTeethText = useMemo(() => {
    if (!order) return '-'

    const teeth = normalizeStringArray(order.selected_teeth)
    return teeth.length > 0 ? teeth.join(', ') : '-'
  }, [order])

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

  const formatDate = (value: string | null) => {
    if (!value) return '-'

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'

    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  }

  const safeFileName = (name: string) => {
    return name.replace(/[^\w.\-]/g, '_').toLowerCase()
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

  const renderStatusBadge = () => {
    if (!order) return null

    if (order.is_canceled) {
      return (
        <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
          주문 취소
        </span>
      )
    }

    if (order.status === '접수 대기') {
      return (
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          접수 대기
        </span>
      )
    }

    if (order.status === '디자인 작업중') {
      return (
        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
          디자인 작업중
        </span>
      )
    }

    if (order.status === '수정 요청 중') {
      return (
        <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
          수정 요청 중
        </span>
      )
    }

    return (
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
        주문 재접수
      </span>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 md:px-6">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-slate-200 bg-white px-8 py-10 shadow-sm">
          <p className="text-base text-slate-500">주문 상세를 불러오는 중입니다...</p>
        </div>
      </main>
    )
  }

  if (error || !order || !profile) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 md:px-6">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-red-200 bg-red-50 px-8 py-10 shadow-sm">
          <p className="text-base font-medium text-red-600">
            {error || '주문 정보를 표시할 수 없습니다.'}
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 px-5 py-5 md:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold tracking-[0.2em] text-blue-600">
                SMILECAD PLATFORM
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                주문 상세
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-lg font-bold text-slate-900">{order.order_number}</span>
                {renderStatusBadge()}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/orders')}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                주문 목록
              </button>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              관리자 상태 변경
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              주문 상태를 빠르게 변경할 수 있습니다.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => handleStatusChange('접수 대기')}
                disabled={statusLoading || order.is_canceled}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                접수 대기
              </button>

              <button
                onClick={() => handleStatusChange('디자인 작업중')}
                disabled={statusLoading || order.is_canceled}
                className="rounded-xl border border-blue-300 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                디자인 작업중
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                주문 정보
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoCard label="주문 번호" value={order.order_number} />
                <InfoCard label="주문 상태" value={order.is_canceled ? '주문 취소' : order.status} />
                <InfoCard label="치과명" value={order.clinic_name || '-'} />
                <InfoCard label="등록일" value={formatDateTime(order.created_at)} />
                <InfoCard label="환자명" value={order.patient_name || '-'} />
                <InfoCard label="성별" value={order.gender || '-'} />
                <InfoCard label="생년월일" value={formatDate(order.birth_date)} />
                <InfoCard label="제품명" value={order.product_type || '-'} />
                <InfoCard label="납기일" value={order.delivery_date || '-'} />
                <InfoCard label="두께" value={order.thickness || '-'} />
                <InfoCard label="지그 제작 여부" value={order.jig_required || '-'} />
                <InfoCard label="선택 치아" value={selectedTeethText} />
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-800">요청사항</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {order.request_note || '입력된 요청사항이 없습니다.'}
                </p>
              </div>

              {order.is_canceled && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-bold text-red-700">취소 정보</p>
                  <p className="mt-2 text-sm text-red-600">
                    취소 사유: {order.cancel_reason || '-'}
                  </p>
                  <p className="mt-1 text-sm text-red-600">
                    취소 일시: {formatDateTime(order.canceled_at)}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                스캔 파일
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                스캔 원본 파일은 관리자만 다운로드할 수 있습니다.
              </p>

              <div className="mt-5 space-y-3">
                {scanFiles.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                    업로드된 스캔 파일이 없습니다.
                  </div>
                ) : (
                  scanFiles.map((file, index) => (
                    <div
                      key={`${file.path}-${index}`}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{file.path}</p>
                      </div>

                      {canDownloadScan && (
                        <button
                          onClick={() => handleDownload(file.path, 'scan')}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          다운로드
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                    디자인 파일
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    관리자와 치과 모두 STL 또는 ZIP 파일을 업로드하고 다운로드할 수 있습니다.
                  </p>
                </div>

                {canUploadDesign && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      파일 선택
                    </button>
                    <span className="text-sm text-slate-500">
                      {selectedFiles.length > 0
                        ? `${selectedFiles.length}개 파일 선택됨`
                        : '선택된 파일 없음'}
                    </span>
                  </div>
                )}
              </div>

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
                    className={`mt-5 rounded-2xl border-2 border-dashed p-6 transition ${
                      dragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-800">
                      여기에 디자인 파일을 드래그해서 놓거나, 파일 선택 버튼을 눌러 업로드하세요.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      허용 파일 형식: STL, ZIP
                    </p>

                    {selectedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          >
                            <span>{file.name}</span>
                            <button
                              type="button"
                              onClick={() => handleFileRemove(index)}
                              className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-200"
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-5">
                      <button
                        onClick={handleDesignUpload}
                        disabled={uploadingDesign || selectedFiles.length === 0}
                        className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {uploadingDesign ? '업로드 중...' : '수정본 업로드 / 재접수'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="mt-5 space-y-3">
                {designFiles.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                    아직 업로드된 디자인 파일이 없습니다.
                  </div>
                ) : (
                  designFiles.map((file, index) => (
                    <div
                      key={`${file.path}-${index}`}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{file.path}</p>
                      </div>

                      {canDownloadDesign && (
                        <button
                          onClick={() => handleDownload(file.path, 'design')}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          다운로드
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {order.status === '수정 요청 중' && (
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                      재접수 파일 업로드
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      수정 요청이 들어온 주문에 대해 재접수 파일을 업로드할 수 있습니다.
                    </p>
                  </div>

                  {canUploadDesign && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => resubmissionFileInputRef.current?.click()}
                        className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                      >
                        파일 선택
                      </button>
                      <span className="text-sm text-slate-500">
                        {selectedResubmissionFiles.length > 0
                          ? `${selectedResubmissionFiles.length}개 파일 선택됨`
                          : '선택된 파일 없음'}
                      </span>
                    </div>
                  )}
                </div>

                {canUploadDesign && (
                  <>
                    <input
                      ref={resubmissionFileInputRef}
                      type="file"
                      multiple
                      accept=".stl,.zip,.STL,.ZIP"
                      onChange={handleResubmissionFileInputChange}
                      className="hidden"
                    />

                    <div
                      onDragOver={handleResubmissionDragOver}
                      onDragLeave={handleResubmissionDragLeave}
                      onDrop={handleResubmissionDrop}
                      className={`mt-5 rounded-2xl border-2 border-dashed p-6 transition ${
                        resubmissionDragActive
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-slate-300 bg-slate-50'
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-800">
                        여기에 재접수 파일을 드래그해서 놓거나, 파일 선택 버튼을 눌러 업로드하세요.
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        허용 파일 형식: STL, ZIP
                      </p>

                      {selectedResubmissionFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {selectedResubmissionFiles.map((file, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                            >
                              <span>{file.name}</span>
                              <button
                                type="button"
                                onClick={() => handleResubmissionFileRemove(index)}
                                className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-200"
                              >
                                삭제
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-5">
                        <button
                          onClick={handleResubmissionUpload}
                          disabled={uploadingResubmission || selectedResubmissionFiles.length === 0}
                          className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {uploadingResubmission ? '업로드 중...' : '재접수 파일 업로드'}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="mt-5 space-y-3">
                  {resubmissionFiles.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                      아직 업로드된 재접수 파일이 없습니다.
                    </div>
                  ) : (
                    resubmissionFiles.map((file, index) => (
                      <div
                        key={`${file.path}-${index}`}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{file.path}</p>
                        </div>

                        {canDownloadDesign && (
                          <button
                            onClick={() => handleDownload(file.path, 'resubmission')}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            다운로드
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {isAdmin && (
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  수정 요청
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  치과에 수정 요청을 보낼 수 있습니다.
                </p>

                <textarea
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  rows={5}
                  className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  placeholder="수정 요청 내용을 입력해주세요."
                />

                <button
                  onClick={handleRevisionRequest}
                  disabled={revisionLoading || order.is_canceled}
                  className="mt-4 w-full rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {revisionLoading ? '처리 중...' : '수정 요청 등록'}
                </button>
              </div>
            )}

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                주문 취소
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                관리자 또는 권한 있는 치과가 주문 취소를 요청할 수 있습니다.
              </p>

              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                placeholder="취소 사유를 입력해주세요."
              />

              <button
                onClick={handleCancelOrder}
                disabled={cancelLoading || order.is_canceled}
                className="mt-4 w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelLoading ? '처리 중...' : '주문 취소'}
              </button>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                진행 정보
              </h2>

              <div className="mt-5 space-y-3">
                <InfoCard label="현재 상태" value={order.is_canceled ? '주문 취소' : order.status} />
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
        </div>
      </div>
    </main>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value || '-'}</p>
    </div>
  )
}