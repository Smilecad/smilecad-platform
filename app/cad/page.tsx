import Link from 'next/link'

export default function CadPage() {
  return (
    <main style={{ padding: 40 }}>
      <h1>CAD 디자인 업로드</h1>
      <p>여기에 CAD 파일 업로드 및 디자인 관리 화면이 들어갑니다.</p>

      <div style={{ marginTop: 20 }}>
        <Link href="/" style={{ color: '#0f5db8' }}>
          ← 대시보드로 돌아가기
        </Link>
      </div>
    </main>
  )
}