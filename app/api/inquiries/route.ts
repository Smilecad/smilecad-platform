// app/api/inquiries/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: '이메일 정보가 필요합니다.' }, { status: 400 });
    }

    // 1. 요청한 유저의 권한(role)과 고유 ID 확인
    const profile = await prisma.profile.findUnique({
      where: { email: email }
    });

    if (!profile) {
      return NextResponse.json({ error: '유저 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    let inquiries;

    // 2. 권한에 따라 데이터 다르게 가져오기
    if (profile.role === 'admin') {
      // 관리자는 모든 치과의 문의 내역을 가져옴
      inquiries = await prisma.inquiry.findMany();
    } else {
      // 일반 치과는 본인이 작성한(user_id가 일치하는) 내역만 가져옴
      inquiries = await prisma.inquiry.findMany({
        where: { user_id: profile.id }
      });
    }

    // 배열을 뒤집어서 최신 글이 위로 오게 만듭니다.
    inquiries.reverse();

    return NextResponse.json({ inquiries, role: profile.role });
  } catch (error) {
    console.error('문의 내역 조회 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}