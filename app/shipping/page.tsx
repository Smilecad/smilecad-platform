import Link from 'next/link'

export default function ShippingPage() {
  return (
    <main style={{ padding: 40 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>
        발송중 관리
      </h1>

      <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 30 }}>
        현재 발송 진행 중인 주문들을 확인하고 관리하는 페이지입니다.
      </p>

      <div style={{ 
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: 30,
        textAlign: 'center'
      }}>
        <h3 style={{ marginBottom: 10 }}>현재 발송중인 주문이 없습니다</h3>
        <p style={{ color: '#9ca3af' }}>
          주문이 발송 상태로 변경되면 이곳에 표시됩니다.
        </p>
      </div>

      <div style={{ marginTop: 30 }}>
        <Link href="/" style={{ color: '#0f5db8', fontWeight: 600 }}>
          ← 대시보드로 돌아가기
        </Link>
      </div>
    </main>
  )
}