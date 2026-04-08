import { NextResponse } from 'next/server'
import { getAuthenticatedServerUser } from '@/lib/auth-server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createOrderHistory } from '@/lib/orders/history'

type RouteContext = {
  params: Promise<{ id: string }>
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const { user, profile } = await getAuthenticatedServerUser(request)

    const body = await request.json().catch(() => ({}))
    const resubmission_file_names = normalizeStringArray(body.resubmission_file_names)
    const resubmission_file_paths = normalizeStringArray(body.resubmission_file_paths)

    if (resubmission_file_names.length !== resubmission_file_paths.length) {
      return NextResponse.json(
        { error: '파일 이름과 파일 경로 수가 일치하지 않습니다.' },
        { status: 400 }
      )
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, is_canceled')
      .eq('id', id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: '주문 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const isAdmin = profile.role === 'admin'
    const isOwnerClinic = order.user_id === user.id

    if (!isAdmin && !isOwnerClinic) {
      return NextResponse.json(
        { error: '재접수 파일을 업로드할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    if (order.is_canceled) {
      return NextResponse.json(
        { error: '취소된 주문에는 파일을 업로드할 수 없습니다.' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        resubmission_file_names,
        resubmission_file_paths,
        admin_revision_requested: false,
        status: '주문 재접수',
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    await createOrderHistory({
      orderId: id,
      status: '주문 재접수',
      title: '재접수 파일 업로드',
      description: '치과에서 수정본을 업로드하고 주문을 재접수했습니다.',
      createdBy: user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '재접수 파일 저장 중 오류가 발생했습니다.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}