import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const inter = Inter({ subsets: ['latin', 'vietnamese'] })

export const metadata: Metadata = {
    title: 'Quản Lý Chi Tiêu | Personal Expense Tracker',
    description: 'Ứng dụng quản lý chi tiêu cá nhân với AI phân tích thông minh',
    icons: {
        icon: '/favicon.ico',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="vi" className="dark">
            <body className={inter.className}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    )
}
