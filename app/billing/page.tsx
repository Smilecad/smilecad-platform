import Link from 'next/link'

export default function BillingPage() {
  return (
    <main style={{ padding: 40 }}>
      <h1>월별 정산 / 세금계산서</h1>
      <p>여기에 정산 내역과 세금계산서 목록이 표시됩니다.</p>

      <div style={{ marginTop: 20 }}>
        <Link href="/" style={{ color: '#0f5db8' }}>
          ← 대시보드로 돌아가기
        </Link>
      </div>
    </main>
  )
}