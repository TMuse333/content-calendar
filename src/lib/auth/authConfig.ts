/**
 * Auth Configuration
 *
 * Dev mode: Auto-login with credentials (no real auth needed)
 * Prod mode: Email magic link (to be configured)
 */

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const isDev = process.env.NODE_ENV === "development";

// Dev config: Auto-login with JWT
const devConfig = {
  secret: process.env.AUTH_SECRET || "dev-secret-change-in-production",
  trustHost: true,
  providers: [
    CredentialsProvider({
      id: "dev-bypass",
      name: "Dev Bypass",
      credentials: {},
      async authorize() {
        const adminEmail = process.env.ADMIN_EMAIL || "admin@localhost";
        return {
          id: "dev-admin",
          email: adminEmail,
          name: "Dev Admin",
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }: { session: any; token: any }) {
      if (session.user && token) {
        session.user.id = token.sub || "dev-admin";
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

// Production config placeholder (email provider)
// TODO: Add email provider with SMTP config for production
const prodConfig = {
  ...devConfig,
  secret: process.env.AUTH_SECRET,
  // In production, replace CredentialsProvider with EmailProvider
  // and add proper user validation
};

export const { handlers, auth, signIn, signOut } = NextAuth(
  isDev ? devConfig : prodConfig
);
