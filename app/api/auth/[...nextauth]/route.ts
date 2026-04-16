// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "이메일", type: "text" },
        password: { label: "비밀번호", type: "password" }
      },
      // 🚀 실제 로그인 버튼을 눌렀을 때 실행되는 검사 로직
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("이메일과 비밀번호를 입력해주세요.");
        }

        // 1. DB에서 이메일로 유저 찾기
        const user = await prisma.profile.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          throw new Error("가입되지 않은 이메일입니다.");
        }

        // 2. 비밀번호 맞는지 확인하기 (암호화 풀어서 비교)
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("비밀번호가 일치하지 않습니다.");
        }

        // 3. 통과! 세션(방문증)에 담을 정보 리턴
        return {
          id: user.id,
          email: user.email,
          role: user.role, // 관리자(admin)인지 일반유저(user)인지 저장
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // 세션에 role(권한)과 id 정보를 찰떡같이 붙여주는 설정
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login', // 로그인이 안 되어있으면 튕겨낼 우리가 만든 로그인 페이지 주소
  }
});

export { handler as GET, handler as POST };