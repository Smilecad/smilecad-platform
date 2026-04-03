import { NextResponse } from 'next/server';
import { getAuthenticatedServerUser } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase/admin';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, profile } = await getAuthenticatedServerUser(request);

    const body = await request.json().catch(() => ({}));
    const cancelReason =
      typeof body.cancel_reason === 'string' ? body.cancel_reason.trim() : '';

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, status, is_canceled')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: '주문 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (order.is_canceled) {
      return NextResponse.json(
        { error: '이미 취소된 주문입니다.' },
        { status: 400 }
      );
    }

    const isAdmin = profile.role === 'admin';
    const isOwnerClinic = profile.role === 'clinic' && order.user_id === user.id;

    if (!isAdmin && !isOwnerClinic) {
      return NextResponse.json(
        { error: '이 주문을 취소할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    if (!isAdmin && order.status !== '접수 대기') {
      return NextResponse.json(
        { error: '치과 계정은 접수 대기 상태 주문만 취소할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        is_canceled: true,
        canceled_at: new Date().toISOString(),
        canceled_by: profile.role,
        cancel_reason: cancelReason || (isAdmin ? '관리자 취소' : '치과 취소'),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '주문 취소 처리 중 오류가 발생했습니다.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}