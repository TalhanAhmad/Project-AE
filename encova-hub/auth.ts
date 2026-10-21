import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateCredentials } from "./modules/auth/service.ts";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  callbacks: {
    // JWT sessions keep the provider subject in token.sub. Copy it into the
    // request session, then resolve current role/active state from PostgreSQL.
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Auth.js includes transport values alongside provider credentials in
        // some callback flows. Pass only this provider's allowlisted fields.
        const user = await authenticateCredentials({
          email: credentials?.email,
          password: credentials?.password,
        });
        return user ? { id: user.authSubject, email: user.email, name: user.name } : null;
      },
    }),
  ],
});
