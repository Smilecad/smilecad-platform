// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  endpoint: process.env.NCP_ENDPOINT || 'https://kr.object.ncloudstorage.com',
  region: process.env.NCP_REGION || 'kr-standard',
  credentials: {
    accessKeyId: process.env.NCP_ACCESS_KEY || '',
    secretAccessKey: process.env.NCP_SECRET_KEY || '',
  },
});

export async function POST(req: Request) {
  try {
    const { filename, fileType, orderId } = await req.json();

    // NCP 창고 안에서의 파일 저장 경로 (예: orders/주문번호/스캔파일.stl)
    const filePath = `orders/${orderId}/${Date.now()}_${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.NCP_BUCKET_NAME,
      Key: filePath,
      ContentType: fileType,
    });

    // 5분(300초) 동안만 유효한 '임시 통행증(URL)' 발급
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return NextResponse.json({ presignedUrl, filePath });
  } catch (error) {
    console.error('NCP 통행증 발급 에러:', error);
    return NextResponse.json({ error: '업로드 준비 중 오류가 발생했습니다.' }, { status: 500 });
  }
}