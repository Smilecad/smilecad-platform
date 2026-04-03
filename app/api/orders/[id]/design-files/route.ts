import { NextResponse } from 'next/server';
import { getAuthenticatedServerUser } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase/admin';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, profile } = await getAuthenticatedServerUser(request);

    const body = await request.json().catch(() => ({}));
    const designFileNames = body.design_file_names;
    const designFilePaths = body.design_file_paths;

    if (!isStringArray(designFileNames) || !isStringArray(designFilePaths)) {
      return NextResponse.json(
        { error: '디자인 파일 정보 형식이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    if (designFileNames.length !== designFilePaths.length) {
      return NextResponse.json(
        { error: '디자인 파일명과 경로 개수가 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, order_number')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: '주문 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const isAdmin = profile.role === 'admin';
    const isOwnerClinic = order.user_id === user.id;

    if (!isAdmin && !isOwnerClinic) {
      return NextResponse.json(
        { error: '이 주문의 디자인 파일을 수정할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    const invalidPath = designFilePaths.find(
      (path) => !path.startsWith(`${order.order_number}/designed/`)
    );

    if (invalidPath) {
      return NextResponse.json(
        { error: '허용되지 않은 디자인 파일 경로가 포함되어 있습니다.' },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      design_file_names: designFileNames,
      design_file_paths: designFilePaths,
    };

    if (profile.role === 'clinic') {
      updatePayload.admin_revision_requested = false;
      updatePayload.admin_revision_requested_at = null;
      updatePayload.admin_revision_request_note = null;
      updatePayload.admin_revision_requested_by = null;
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
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
      error instanceof Error ? error.message : '디자인 파일 반영 중 오류가 발생했습니다.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}