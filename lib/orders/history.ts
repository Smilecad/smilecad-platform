import { supabaseAdmin } from '@/lib/supabase/admin'

type CreateOrderHistoryParams = {
  orderId: string
  status: string
  title: string
  description?: string | null
  createdBy?: string | null
}

export async function createOrderHistory(params: CreateOrderHistoryParams) {
  const { orderId, status, title, description, createdBy } = params

  const { error } = await supabaseAdmin.from('order_status_history').insert({
    order_id: orderId,
    status,
    title,
    description: description || null,
    created_by: createdBy || null,
  })

  if (error) {
    throw new Error(`주문 히스토리 저장 실패: ${error.message}`)
  }
}