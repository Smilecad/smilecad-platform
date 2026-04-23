import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "이메일", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const password = credentials?.password;

        const adminEmail = process.env.ADMIN_LOGIN_EMAIL;
        const adminPassword = process.env.ADMIN_LOGIN_PASSWORD;

        if (!email || !password) {
          throw new Error("이메일과 비밀번호를 입력해주세요.");
        }

        if (!adminEmail || !adminPassword) {
          throw new Error("로그인 환경변수가 설정되지 않았습니다.");
        }

        if (email !== adminEmail || password !== adminPassword) {
          throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        return {
          id: "admin-user",
          email: adminEmail,
          name: "admin",
          role: "admin",
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };