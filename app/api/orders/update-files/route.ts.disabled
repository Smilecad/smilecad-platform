// app/api/orders/update-files/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { orderId, scanFileNames, scanFilePaths } = await req.json();

    // 주문 테이블에 파일 이름과 주소를 쉼표(,)로 연결해서 저장합니다.
    await prisma.order.update({
      where: { id: orderId },
      data: {
        scan_file_names: scanFileNames.join(','),
        scan_file_paths: scanFilePaths.join(','),
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DB 업데이트 에러:', error);
    return NextResponse.json({ error: 'DB에 파일 정보를 업데이트하지 못했습니다.' }, { status: 500 });
  }
}