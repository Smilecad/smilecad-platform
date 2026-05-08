// app/api/files/download/route.ts
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        '파일 다운로드 API는 NCP Object Storage 기반 get-download-url Cloud Function으로 이전 중입니다.',
    },
    { status: 410 }
  )
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error:
        '파일 다운로드 API는 NCP Object Storage 기반 get-download-url Cloud Function으로 이전 중입니다.',
    },
    { status: 410 }
  )
}