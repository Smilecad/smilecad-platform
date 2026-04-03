import Link from 'next/link'

export default function ClinicsPage() {
  return (
    <main style={{ padding: 40 }}>
      <h1>치과 계정 승인</h1>
      <p>여기에 신규 치과 계정 승인 목록이 표시됩니다.</p>

      <div style={{ marginTop: 20 }}>
        <Link href="/" style={{ color: '#0f5db8' }}>
          ← 대시보드로 돌아가기
        </Link>
      </div>
    </main>
  )
}