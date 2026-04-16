// app/api/inquiries/reply/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request) {
  try {
    const { inquiryId, adminReply } = await req.json();

    if (!inquiryId || !adminReply) {
      return NextResponse.json({ error: '데이터가 부족합니다.' }, { status: 400 });
    }

    // 해당 문의글을 찾아 답변 내용과 상태, 시간을 업데이트합니다.
    const updatedInquiry = await prisma.inquiry.update({
      where: { id: inquiryId },
      data: {
        admin_reply: adminReply,
        status: '답변 완료',
        replied_at: new Date()
      }
    });

    return NextResponse.json({ success: true, inquiry: updatedInquiry });
  } catch (error) {
    console.error('답변 등록 에러:', error);
    return NextResponse.json({ error: '답변 등록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}