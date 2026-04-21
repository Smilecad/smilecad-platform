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

    return NextResponse.json({ orders, role: profile.role });
  } catch (error) {
    console.error('주문 목록 조회 에러:', error);
    return NextResponse.json({ error: '목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}

// 2. 새 주문 저장하기 (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. 회원 정보 검증
    const profile = await prisma.profile.findUnique({
      where: { email: body.email }
    });

    if (!profile) {
      return NextResponse.json({ error: '회원 정보를 찾을 수 없습니다.' }, { status: 400 });
    }

    // 2. 주문 번호 생성 (예: ORD-1698765432100)
    const orderNumber = `ORD-${Date.now()}`;

    // 3. [안전장치] 치아 번호가 혹시라도 비어있을 때 앱이 뻗는 것을 방지
    const selectedTeethStr = Array.isArray(body.selectedTeeth) 
      ? body.selectedTeeth.join(',') 
      : '';

    // 4. [안전장치] 날짜 형식을 DB가 좋아하는 ISO 형식으로 안전하게 변환
    const formattedDeliveryDate = body.deliveryDate 
      ? new Date(body.deliveryDate).toISOString() 
      : null;

    // 5. DB에 데이터 쓰기
    const newOrder = await prisma.order.create({
      data: {
        order_number: orderNumber,
        clinic_name: body.clinicName,
        patient_name: body.patientName,
        gender: body.gender || '미상',
        birth_date: body.birthDate || null,
        product_type: body.productType,
        selected_teeth: selectedTeethStr,
        delivery_date: formattedDeliveryDate,
        thickness: body.thickness,
        jig_required: body.jigRequired,
        request_note: body.requestNote || null,
        status: '접수 대기',
        user_id: profile.id,
        user_role: profile.role,
        // is_remake: body.isRemake // DB에 is_remake 컬럼이 있다면 주석 풀기!
      }
    });

    // 6. 생성된 주문 ID를 프론트엔드로 전달 (이 ID가 파일 업로드 경로에 쓰입니다!)
    return NextResponse.json({ success: true, orderId: newOrder.id });

  } catch (error: any) {
    console.error('주문 저장 에러:', error);
    return NextResponse.json({ error: '주문 저장 중 오류 발생.' }, { status: 500 });
  }
}