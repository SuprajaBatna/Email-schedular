import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'mock_google_client_id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock_google_client_secret',
    }),
    CredentialsProvider({
      name: 'Demo Test Account',
      credentials: {
        email: { label: 'Email', type: 'text', value: 'test@example.com' },
      },
      async authorize() {
        return {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TestUser',
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub || '00000000-0000-0000-0000-000000000001';
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id || '00000000-0000-0000-0000-000000000001';
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'reachinbox_nextauth_secret_phase_b_2026',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
