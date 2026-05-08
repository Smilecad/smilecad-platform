// lib/auth-server.ts

export type ServerProfile = {
  id: string | number
  role: 'admin' | 'clinic'
  clinic_name: string | null
}

export type AuthenticatedServerUser = {
  user: {
    id: string | number
    loginId?: string | null
    email?: string | null
  }
  profile: ServerProfile
}

/**
 * Supabase Auth 제거 후 임시 호환용 함수입니다.
 *
 * 현재 인증은 다음 구조로 이전되었습니다.
 * - 클라이언트: localStorage의 smilecad_token 사용
 * - 백엔드: NCP Cloud Functions에서 JWT 검증
 * - DB 접근: NCP Cloud Functions에서 PostgreSQL 직접 접근
 *
 * Next.js 서버 라우트에서 이 함수를 계속 사용하는 코드는
 * NCP Cloud Functions API 호출 방식으로 교체해야 합니다.
 */
export async function getAuthenticatedServerUser(
  _request: Request
): Promise<AuthenticatedServerUser> {
  throw new Error('getAuthenticatedServerUser는 NCP JWT 구조로 이전 중입니다.')
}