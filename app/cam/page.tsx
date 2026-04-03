import Link from 'next/link'

export default function CamPage() {
  return (
    <main style={{ padding: 40 }}>
      <h1>CAM / 레이저 커팅 큐</h1>
      <p>여기에 레이저 커팅 작업 목록이 표시됩니다.</p>

      <div style={{ marginTop: 20 }}>
        <Link href="/" style={{ color: '#0f5db8' }}>
          ← 대시보드로 돌아가기
        </Link>
      </div>
    </main>
  )
}