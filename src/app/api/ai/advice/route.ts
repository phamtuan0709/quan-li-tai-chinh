import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSavingsAdvice } from '@/lib/gemini'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = new Date()
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)

        // Get current month transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                userId: session.user.id,
                transactionTime: {
                    gte: monthStart,
                    lte: monthEnd,
                },
            },
        })

        if (transactions.length === 0) {
            return NextResponse.json({
                advice: 'Chưa có dữ liệu chi tiêu tháng này. Hãy upload email giao dịch để bắt đầu!',
            })
        }

        let totalSpending = 0
        for (const t of transactions) {
            totalSpending += t.amount
        }

        // Group by category
        const byCategory: Record<string, number> = {}
        for (const t of transactions) {
            const cat = t.category || 'Khác'
            byCategory[cat] = (byCategory[cat] || 0) + t.amount
        }

        const monthlyData = Object.entries(byCategory)
            .map(([category, total]) => ({ category, total }))
            .sort((a, b) => b.total - a.total)

        const advice = await generateSavingsAdvice(monthlyData, totalSpending)

        return NextResponse.json({ advice })
    } catch (error) {
        console.error('Advice error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
