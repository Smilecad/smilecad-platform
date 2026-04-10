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

export async function GET(req: NextRequest) {
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
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: '프로필 정보를 불러오지 못했습니다.' }, { status: 400 })
    }

    let query = supabase
      .from('inquiries')
      .select(`
        id,
        user_id,
        user_role,
        clinic_name,
        clinic_address,
        clinic_phone,
        title,
        category,
        content,
        status,
        admin_reply,
        replied_at,
        replied_by,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (profile.role !== 'admin') {
      query = query.eq('user_id', user.id)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      items: data ?? [],
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '문의 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const category = String(body.category || '').trim()
    const title = String(body.title || '').trim()
    const content = String(body.content || '').trim()

    if (!title) {
      return NextResponse.json({ error: '문의 제목을 입력해주세요.' }, { status: 400 })
    }

    if (!content) {
      return NextResponse.json({ error: '문의 내용을 입력해주세요.' }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, clinic_name, clinic_address, clinic_phone')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: '프로필 정보를 불러오지 못했습니다.' }, { status: 400 })
    }

    const { error: insertError } = await supabase.from('inquiries').insert({
      user_id: user.id,
      user_role: profile.role || 'clinic',
      clinic_name: profile.clinic_name || '',
      clinic_address: profile.clinic_address || '',
      clinic_phone: profile.clinic_phone || '',
      category: category || '일반 문의',
      title,
      content,
      status: '접수',
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '문의 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}