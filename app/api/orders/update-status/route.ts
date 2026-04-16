// app/api/orders/update-status/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: '데이터가 부족합니다.' }, { status: 400 });
    }

    // 🚀 주문 상태를 변경하면서 OrderHistory에도 기록을 남깁니다.
    const updatedOrder = await prisma.order.update({
      where: { id: id },
      data: { 
        status: status,
        history: {
          create: { status: status }
        }
      }
    });

    return NextResponse.json({ success: true, status: updatedOrder.status });
  } catch (error) {
    console.error('상태 변경 에러:', error);
    return NextResponse.json({ error: '상태를 변경하지 못했습니다.' }, { status: 500 });
  }
}