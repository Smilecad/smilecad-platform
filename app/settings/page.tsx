import Link from 'next/link'

export default function SettingsPage() {
  return (
    <main style={{ padding: 40 }}>
      <h1>시스템 설정</h1>
      <p>여기에 시스템 설정 화면이 들어갑니다.</p>

      <div style={{ marginTop: 20 }}>
        <Link href="/" style={{ color: '#0f5db8' }}>
          ← 대시보드로 돌아가기
        </Link>
      </div>
    </main>
  )
}