import { NextResponse } from 'next/server'
import { getAuthenticatedServerUser } from '@/lib/auth-server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const { user, profile } = await getAuthenticatedServerUser(request)

    if (profile.role !== 'admin') {
      return NextResponse.json(
        { error: '관리자만 수정 요청을 등록할 수 있습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const note = typeof body.note === 'string' ? body.note.trim() : ''

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
        { error: '취소된 주문에는 수정 요청을 등록할 수 없습니다.' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        admin_revision_requested: true,
        admin_revision_requested_at: new Date().toISOString(),
        admin_revision_request_note: note,
        admin_revision_requested_by: user.id,
        status: '수정 요청 중',
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '수정 요청 등록 중 오류가 발생했습니다.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}