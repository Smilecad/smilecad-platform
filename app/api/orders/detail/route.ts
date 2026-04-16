// app/api/orders/detail/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    if (!id || !email) {
      return NextResponse.json({ error: '정보가 누락되었습니다.' }, { status: 400 });
    }

    const profile = await prisma.profile.findUnique({
      where: { email: email }
    });

    if (!profile) {
      return NextResponse.json({ error: '유저 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 🚀 history(시간순 정렬)를 포함해서 주문 정보를 가져옵니다.
    const order = await prisma.order.findUnique({
      where: { id: id },
      include: {
        history: {
          orderBy: { created_at: 'asc' } // 옛날 기록부터 순서대로
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ order, role: profile.role });
  } catch (error) {
    console.error('상세 조회 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}