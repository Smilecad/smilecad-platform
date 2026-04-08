import { NextResponse } from 'next/server'
import { getAuthenticatedServerUser } from '@/lib/auth-server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createOrderHistory } from '@/lib/orders/history'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const { user, profile } = await getAuthenticatedServerUser(request)

    const body = await request.json().catch(() => ({}))
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

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
        { error: '주문을 취소할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    if (order.is_canceled) {
      return NextResponse.json(
        { error: '이미 취소된 주문입니다.' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        is_canceled: true,
        canceled_at: new Date().toISOString(),
        canceled_by: user.id,
        cancel_reason: reason,
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
      status: '주문 취소',
      title: '주문 취소',
      description: reason || '주문이 취소되었습니다.',
      createdBy: user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '주문 취소 중 오류가 발생했습니다.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}