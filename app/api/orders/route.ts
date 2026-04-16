// app/api/orders/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 1. 주문 목록 가져오기 (GET)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: '이메일 정보가 필요합니다.' }, { status: 400 });
    }

    // [핵심] 로그인한 유저의 권한(role) 확인하기
    const profile = await prisma.profile.findUnique({
      where: { email: email }
    });

    if (!profile) {
      return NextResponse.json({ error: '유저 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    let orders;

    // 관리자(admin)면 모든 주문을, 아니면 자기 주문만 가져오기
    if (profile.role === 'admin') {
      orders = await prisma.order.findMany({
        orderBy: { created_at: 'desc' }
      });
    } else {
      orders = await prisma.order.findMany({
        where: { user_id: profile.id },
        orderBy: { created_at: 'desc' }
      });
    }

    // 프론트엔드로 데이터와 함께 '이 사람의 권한'도 몰래 같이 보냅니다.
    return NextResponse.json({ orders, role: profile.role });
  } catch (error) {
    console.error('주문 목록 조회 에러:', error);
    return NextResponse.json({ error: '목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}

// 2. 새 주문 저장하기 (POST) - 기존과 동일
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profile = await prisma.profile.findUnique({
      where: { email: body.email }
    });

    if (!profile) return NextResponse.json({ error: '회원 정보를 찾을 수 없습니다.' }, { status: 400 });

    const orderNumber = `ORD-${Date.now()}`;

    const newOrder = await prisma.order.create({
      data: {
        order_number: orderNumber,
        clinic_name: body.clinicName,
        patient_name: body.patientName,
        gender: body.gender || '미상',
        birth_date: body.birthDate || null,
        product_type: body.productType,
        selected_teeth: body.selectedTeeth.join(','),
        delivery_date: body.deliveryDate || null,
        thickness: body.thickness,
        jig_required: body.jigRequired,
        request_note: body.requestNote || null,
        status: '접수 대기',
        user_id: profile.id,
        user_role: profile.role,
      }
    });

    return NextResponse.json({ success: true, orderId: newOrder.id });
  } catch (error: any) {
    console.error('주문 저장 에러:', error);
    return NextResponse.json({ error: '주문 저장 중 오류 발생.' }, { status: 500 });
  }
}