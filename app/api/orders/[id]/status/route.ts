import { NextResponse } from 'next/server'
import { getAuthenticatedServerUser } from '@/lib/auth-server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type RouteContext = {
  params: Promise<{ id: string }>
}

const ALLOWED_STATUSES = ['접수 대기', '디자인 작업중', '수정 요청 중', '주문 재접수'] as const

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const { profile } = await getAuthenticatedServerUser(request)

    if (profile.role !== 'admin') {
      return NextResponse.json(
        { error: '관리자만 주문 상태를 변경할 수 있습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const status = typeof body.status === 'string' ? body.status : ''

    if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
      return NextResponse.json(
        { error: '유효하지 않은 주문 상태입니다.' },
        { status: 400 }
      )
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, is_canceled')
      .eq('id', id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: '주문 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (order.is_canceled) {
      return NextResponse.json(
        { error: '취소된 주문은 상태를 변경할 수 없습니다.' },
        { status: 400 }
      )
    }

    const updatePayload: Record<string, unknown> = {
      status,
    }

    if (status !== '수정 요청 중') {
      updatePayload.admin_revision_requested = false
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
      .eq('id', id)
      .select('id, status')
      .single()

    if (updateError || !updatedOrder) {
      return NextResponse.json(
        { error: updateError?.message || '주문 상태 변경에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '주문 상태 변경 중 오류가 발생했습니다.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}