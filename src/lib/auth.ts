import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ user }) {
            // Only allow the whitelisted email
            const allowedEmail = process.env.ALLOWED_EMAIL
            if (!allowedEmail) {
                console.error('ALLOWED_EMAIL environment variable is not set')
                return false
            }

            if (user.email !== allowedEmail) {
                console.log(`Unauthorized login attempt: ${user.email}`)
                return false
            }

            // Create or update user in database
            try {
                await prisma.user.upsert({
                    where: { email: user.email },
                    update: {
                        name: user.name,
                        image: user.image,
                    },
                    create: {
                        email: user.email,
                        name: user.name,
                        image: user.image,
                    },
                })
            } catch (error) {
                console.error('Error saving user to database:', error)
            }

            return true
        },
        async session({ session }) {
            if (session.user?.email) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: session.user.email },
                })
                if (dbUser) {
                    session.user.id = dbUser.id
                }
            }
            return session
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: 'jwt',
    },
}

// Extend the session type to include user id
declare module 'next-auth' {
    interface Session {
        user: {
            id?: string
            name?: string | null
            email?: string | null
            image?: string | null
        }
    }
}
