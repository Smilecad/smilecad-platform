import { NextResponse } from 'next/server'
import { getAuthenticatedServerUser } from '@/lib/auth-server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const { user, profile } = await getAuthenticatedServerUser(request)

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        user_id,
        status,
        created_at,
        is_canceled,
        canceled_at,
        cancel_reason,
        admin_revision_requested,
        admin_revision_requested_at,
        admin_revision_request_note
      `)
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
        { error: '해당 주문 히스토리를 볼 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { data: historyRows, error: historyError } = await supabaseAdmin
      .from('order_status_history')
      .select('id, status, title, description, created_by, created_at')
      .eq('order_id', id)
      .order('created_at', { ascending: false })

    if (historyError) {
      return NextResponse.json(
        { error: historyError.message },
        { status: 500 }
      )
    }

    const fallbackEvents: Array<{
      id: string
      status: string
      title: string
      description: string | null
      created_at: string
    }> = []

    if (order.created_at) {
      fallbackEvents.push({
        id: 'fallback-created',
        status: '접수 대기',
        title: '주문 접수',
        description: '주문이 생성되었습니다.',
        created_at: order.created_at,
      })
    }

    if (order.admin_revision_requested_at) {
      fallbackEvents.push({
        id: 'fallback-revision',
        status: '수정 요청 중',
        title: '수정 요청 등록',
        description: order.admin_revision_request_note || '치과에 수정 요청이 등록되었습니다.',
        created_at: order.admin_revision_requested_at,
      })
    }

    if (order.canceled_at) {
      fallbackEvents.push({
        id: 'fallback-cancel',
        status: '주문 취소',
        title: '주문 취소',
        description: order.cancel_reason || '주문이 취소되었습니다.',
        created_at: order.canceled_at,
      })
    }

    const normalizedHistory = (historyRows || []).map((item) => ({
      id: item.id,
      status: item.status,
      title: item.title,
      description: item.description,
      created_at: item.created_at,
    }))

    const merged = [...normalizedHistory]

    for (const fallback of fallbackEvents) {
      const hasSimilar = merged.some(
        (item) =>
          item.title === fallback.title &&
          item.created_at === fallback.created_at
      )

      if (!hasSimilar) {
        merged.push(fallback)
      }
    }

    merged.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return NextResponse.json({
      success: true,
      history: merged,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '주문 히스토리 조회 중 오류가 발생했습니다.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}