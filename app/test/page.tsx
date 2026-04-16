// app/test/page.tsx
import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

export default async function TestPage() {
  // DB 저장 함수
  async function createProfile(formData: FormData) {
    'use server';
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;

    await prisma.profile.create({
      data: {
        email: email,
        clinic_name: name,
        password: 'test_password_123' // 테스트용 임시 비번
      },
    });
    revalidatePath('/test');
  }

  // DB에 저장된 프로필 가져오기
  const profiles = await prisma.profile.findMany();

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h2>로컬 DB 연결 테스트 (Profile 테이블) 🚀</h2>
      <form action={createProfile} style={{ marginBottom: '20px' }}>
        <input name="name" placeholder="치과 이름 입력" style={{ marginRight: '10px', padding: '5px' }} />
        <input name="email" placeholder="이메일(아이디) 입력" style={{ marginRight: '10px', padding: '5px' }} />
        <button type="submit">DB에 저장하기</button>
      </form>

      <hr />
      <h3>현재 DB에 저장된 명단:</h3>
      {profiles.length === 0 ? (
        <p>아직 아무도 없습니다.</p>
      ) : (
        <ul>
          {profiles.map((p) => (
            <li key={p.id}>{p.clinic_name} ({p.email})</li>
          ))}
        </ul>
      )}
    </div>
  );
}