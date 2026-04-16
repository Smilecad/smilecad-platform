// app/api/auth/signup/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, loginId, password, clinicName, clinicAddress, clinicPhone } = body;

    // 1. 아이디 중복 확인 로직
    if (action === 'check') {
      const existing = await prisma.profile.findUnique({ where: { email: loginId } });
      if (existing) {
        return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    // 2. 실제 회원가입 로직
    if (action === 'signup') {
      const existing = await prisma.profile.findUnique({ where: { email: loginId } });
      if (existing) {
        return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 400 });
      }

      // 비밀번호 암호화 (해킹 방지)
      const hashedPassword = await bcrypt.hash(password, 10);

      // Prisma 기사님을 통해 DB에 저장
      await prisma.profile.create({
        data: {
          email: loginId, // 아이디를 email 칸에 그대로 저장합니다
          password: hashedPassword,
          role: 'user',
          clinic_name: clinicName,
          clinic_address: clinicAddress,
          clinic_phone: clinicPhone,
        }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}