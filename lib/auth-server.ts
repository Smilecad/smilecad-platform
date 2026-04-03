import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type ServerProfile = {
  id: string;
  role: 'admin' | 'clinic';
  clinic_name: string | null;
};

export type AuthenticatedServerUser = {
  user: {
    id: string;
    email?: string | null;
  };
  profile: ServerProfile;
};

function getAccessTokenFromRequest(request: Request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

  if (!authHeader) return null;

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) return null;

  return token;
}

export async function getAuthenticatedServerUser(
  request: Request
): Promise<AuthenticatedServerUser> {
  const accessToken = getAccessTokenFromRequest(request);

  if (!accessToken) {
    throw new Error('인증 토큰이 없습니다.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase public environment variables are not set.');
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    throw new Error('로그인 사용자 확인에 실패했습니다.');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, clinic_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('프로필 정보를 확인할 수 없습니다.');
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile: profile as ServerProfile,
  };
}