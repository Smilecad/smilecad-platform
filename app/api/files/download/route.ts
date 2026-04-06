import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type ProfileRow = {
  id: string
  role: string
  clinic_name: string | null
}

type OrderRow = {
  id: string
  user_id: string
  order_number: string
  scan_file_paths: string[] | string | null
  design_file_paths: string[] | string | null
}

function getAccessTokenFromRequest(request: Request) {
  const authHeader =
    request.headers.get('authorization') || request.headers.get('Authorization')

  if (!authHeader) return null

  const [type, token] = authHeader.split(' ')

  if (type !== 'Bearer' || !token) return null

  return token
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
      // JSON 배열 문자열이 아니면 일반 문자열 하나로 처리
    }

    return [trimmed]
  }

  return []
}

function safeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '_')
}

async function getUserFromToken(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase public env가 설정되지 않았습니다.')
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(accessToken)

  if (error || !user) {
    throw new Error(error?.message || '로그인 사용자 확인에 실패했습니다.')
  }

  return user
}

async function getProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role, clinic_name')
    .eq('id', userId)

  if (error) {
    throw new Error(`프로필 조회 실패: ${error.message}`)
  }

  const profile = (data as ProfileRow[] | null)?.[0]

  if (!profile) {
    throw new Error('profiles 테이블에 해당 사용자 프로필이 없습니다.')
  }

  if (profile.role !== 'admin' && profile.role !== 'clinic') {
    throw new Error(`유효하지 않은 role 값입니다: ${profile.role}`)
  }

  return profile as {
    id: string
    role: 'admin' | 'clinic'
    clinic_name: string | null
  }
}

async function getOrder(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, user_id, order_number, scan_file_paths, design_file_paths')
    .eq('id', orderId)
    .single()

  if (error || !data) {
    throw new Error(error?.message || '주문 정보를 찾을 수 없습니다.')
  }

  return data as OrderRow
}

function validateFileAccess(params: {
  type: 'scan' | 'design'
  filePath?: string | null
  mode: 'single' | 'all'
  isAdmin: boolean
  isOwnerClinic: boolean
  scanPaths: string[]
  designPaths: string[]
}) {
  const { type, filePath, mode, isAdmin, isOwnerClinic, scanPaths, designPaths } = params

  if (type === 'scan') {
    if (!isAdmin) {
      return {
        ok: false,
        status: 403,
        error: '스캔 파일은 관리자만 다운로드할 수 있습니다.',
      }
    }

    if (mode === 'single' && (!filePath || !scanPaths.includes(filePath))) {
      return {
        ok: false,
        status: 404,
        error: `해당 스캔 파일 경로를 찾을 수 없습니다. 요청값: ${filePath}`,
      }
    }

    return { ok: true as const }
  }

  if (!isAdmin && !isOwnerClinic) {
    return {
      ok: false,
      status: 403,
      error: '디자인 파일을 다운로드할 권한이 없습니다.',
    }
  }

  if (mode === 'single' && (!filePath || !designPaths.includes(filePath))) {
    return {
      ok: false,
      status: 404,
      error: `해당 디자인 파일 경로를 찾을 수 없습니다. 요청값: ${filePath}`,
    }
  }

  return { ok: true as const }
}

async function handleSingleDownload(filePath: string) {
  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from('order-files')
    .createSignedUrl(filePath, 60)

  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json(
      { error: signedError?.message || '다운로드 URL 생성에 실패했습니다.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    url: signedData.signedUrl,
  })
}

async function handleAllDownload(params: {
  order: OrderRow
  type: 'scan' | 'design'
  scanPaths: string[]
  designPaths: string[]
}) {
  const { order, type, scanPaths, designPaths } = params
  const targetPaths = type === 'scan' ? scanPaths : designPaths

  if (!targetPaths.length) {
    return NextResponse.json(
      { error: '다운로드할 파일이 없습니다.' },
      { status: 404 }
    )
  }

  const zip = new JSZip()

  for (const filePath of targetPaths) {
    if (!filePath || typeof filePath !== 'string') continue

    if (
      typeof order.order_number === 'string' &&
      !filePath.startsWith(order.order_number)
    ) {
      continue
    }

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('order-files')
      .download(filePath)

    if (downloadError || !fileData) {
      continue
    }

    const buffer = await fileData.arrayBuffer()
    const fileName = safeFileName(filePath.split('/').pop() || 'file')
    zip.file(fileName, buffer)
  }

  const fileEntries = Object.keys(zip.files)

  if (!fileEntries.length) {
    return NextResponse.json(
      { error: '압축할 파일을 준비하지 못했습니다.' },
      { status: 500 }
    )
  }

  const zipBuffer = await zip.generateAsync({ type: 'uint8array' })
  const zipFileName = `${order.order_number}-${type}-files.zip`

  return new NextResponse(Buffer.from(zipBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="{encodeURIComponent(zipFileName)}"`,
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = getAccessTokenFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: '인증 토큰이 없습니다.' },
        { status: 401 }
      )
    }

    const user = await getUserFromToken(accessToken)
    const profile = await getProfile(user.id)

    const searchParams = request.nextUrl.searchParams
    const orderId = searchParams.get('orderId')
    const filePath = searchParams.get('filePath')
    const type = searchParams.get('type')
    const modeParam = searchParams.get('mode')
    const mode: 'single' | 'all' = modeParam === 'all' ? 'all' : 'single'

    if (!orderId || !type) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    if (type !== 'scan' && type !== 'design') {
      return NextResponse.json(
        { error: '허용되지 않은 파일 타입입니다.' },
        { status: 400 }
      )
    }

    if (mode === 'single' && !filePath) {
      return NextResponse.json(
        { error: '개별 다운로드에는 filePath가 필요합니다.' },
        { status: 400 }
      )
    }

    const order = await getOrder(orderId)

    const isAdmin = profile.role === 'admin'
    const isOwnerClinic = order.user_id === user.id

    const scanPaths = normalizeStringArray(order.scan_file_paths)
    const designPaths = normalizeStringArray(order.design_file_paths)

    const validation = validateFileAccess({
      type,
      filePath,
      mode,
      isAdmin,
      isOwnerClinic,
      scanPaths,
      designPaths,
    })

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      )
    }

    if (mode === 'all') {
      return await handleAllDownload({
        order,
        type,
        scanPaths,
        designPaths,
      })
    }

    return await handleSingleDownload(filePath!)
  } catch (error) {
    console.error('DOWNLOAD_ROUTE_ERROR:', error)

    const message =
      error instanceof Error ? error.message : '다운로드 처리 중 오류가 발생했습니다.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}