// lib/orders/history.ts

type CreateOrderHistoryParams = {
  orderId: string
  status: string
  title: string
  description?: string | null
  createdBy?: string | null
}

/**
 * 기존 Supabase 기반 주문 히스토리 저장 함수는 NCP Cloud Functions 구조로 이전 중입니다.
 *
 * 새 구조에서는 주문 상태 변경 시:
 * - 프론트 → update-order-status Cloud Function 호출
 * - Cloud Function → orders 상태 업데이트
 * - Cloud Function → order_status_history insert
 *
 * 흐름으로 처리해야 합니다.
 *
 * 이 함수는 기존 import 호환을 위해 임시로 남겨둡니다.
 */
export async function createOrderHistory(
  _params: CreateOrderHistoryParams
): Promise<void> {
  return
}