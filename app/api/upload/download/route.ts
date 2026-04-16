// app/api/upload/download/route.ts
import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
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
    const { filePath } = await req.json();

    const command = new GetObjectCommand({
      Bucket: process.env.NCP_BUCKET_NAME,
      Key: filePath,
    });

    // 1분 동안만 유효한 다운로드 링크 생성
    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    return NextResponse.json({ downloadUrl });
  } catch (error) {
    return NextResponse.json({ error: '다운로드 링크 생성 실패' }, { status: 500 });
  }
}