// app/api/inquiry/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, title, category, content } = body;

    // 1. 필수 항목 확인
    if (!email || !title || !category || !content) {
      return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 });
    }

    // 2. 글을 작성하는 유저의 상세 정보 가져오기 (치과명, 연락처 등)
    const user = await prisma.profile.findUnique({
      where: { email: email }
    });

    if (!user) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 3. Inquiry 테이블에 새로운 문의 데이터 저장
    const newInquiry = await prisma.inquiry.create({
      data: {
        user_id: user.id,
        user_role: user.role,
        clinic_name: user.clinic_name,
        clinic_address: user.clinic_address,
        clinic_phone: user.clinic_phone,
        title: title,
        category: category,
        content: content,
        status: '접수 대기' // 기본 상태
      }
    });

    return NextResponse.json({ success: true, inquiry: newInquiry });
  } catch (error) {
    console.error('문의 등록 에러:', error);
    return NextResponse.json({ error: '문의 등록 중 서버 오류가 발생했습니다.' }, { status: 500 });
  }
}