import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAccessToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return null
  return authHeader.replace('Bearer ', '').trim()
}

function getServerSupabase(accessToken?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  })
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const accessToken = getAccessToken(req)

    if (!accessToken) {
      return NextResponse.json({ error: '인증 토큰이 없습니다.' }, { status: 401 })
    }

    const supabase = getServerSupabase(accessToken)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: '로그인 정보를 확인할 수 없습니다.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: '프로필 정보를 불러오지 못했습니다.' }, { status: 400 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: '관리자만 답변할 수 있습니다.' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await req.json()

    const adminReply = String(body.admin_reply || '').trim()

    if (!adminReply) {
      return NextResponse.json({ error: '답변 내용을 입력해주세요.' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('inquiries')
      .update({
        admin_reply: adminReply,
        status: '답변 완료',
        replied_at: new Date().toISOString(),
        replied_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '답변 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}